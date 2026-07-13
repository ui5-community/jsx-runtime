# Requirements: Complete JSX Runtime for UI5

> **Goal.** Evolve `ui5.app.tsx`'s clean, side-effect-free JSX runtime into a
> framework-grade runtime that can serve **both** application views *and*
> templating frameworks like SAP Fiori elements, **without** giving up the
> properties that make it cleaner than the current
> `sap.fe.base/jsx-runtime`: single-purpose functions, no module-level mode
> flags, recursive Fragment handling, accurate per-control TS typing.

---

## 0. Document metadata

| Field | Value |
|---|---|
| Document version | 0.1 (draft) |
| Status | Proposal |
| Owner | TBD |
| Audience | Runtime authors, Fiori elements core team, app TSX adopters |
| Related | Side-by-side analysis report (`jsx-runtime-comparison.pdf`) |

---

## 1. Goals & non-goals

### 1.1 Goals

- **G-1.** A single JSX runtime module that supports every output target the
  UI5 ecosystem needs today: live control instantiation, XML serialization,
  and direct RenderManager calls.
- **G-2.** Preserve the sample's architectural invariants, see §3.
- **G-3.** Cover the load-bearing features Fiori elements relies on:
  BindingToolkit-compatible expressions, late (async) properties, controller-
  extension context, command intrinsic, custom-data intrinsics, view loader.
- **G-4.** Per-control TypeScript prop typing derived from `$XSettings`,
  with a typed JSX namespace that needs no codegen step.
- **G-5.** Drop-in replacement: an existing `sap.fe`-style consumer compiles
  and runs against the new runtime with no functional regression.

### 1.2 Non-goals

- **NG-1.** Not a React-compatibility layer. Hooks, reconcilers, virtual DOM
  diffing, and `ReactElement` semantics are explicitly out of scope.
- **NG-2.** Not a replacement for the UI5 binding parser; expression
  compilation produces the same string form UI5 already understands.
- **NG-3.** Not a build-time transformer. The runtime is purely runtime;
  the only build dependency is `@babel/plugin-transform-react-jsx`.
- **NG-4.** Not opinionated about state management beyond the BindingValue /
  reactive-proxy primitives that already exist.

---

## 2. Definitions

| Term | Meaning |
|---|---|
| **Runtime** | The `jsx-runtime` module Babel imports `jsx` / `jsxs` / `Fragment` from. |
| **Output mode** | One of: control instance, XML string, RenderManager-call thunk. |
| **Sentinel** | A unique object detected by identity inside `jsx()` (e.g. `Fragment`, `For`, `If`). |
| **Late property** | A property whose value is a `Promise`; applied after construction via `setProperty`. |
| **BindingToolkitExpression** | A typed expression tree (used in Fiori elements) that compiles to a UI5 binding string. |
| **JSX context** | Per-tree contextual data (owner control, view, app component, formatter context). |

---

## 3. Architectural principles (invariants)

These are the properties that distinguish the sample from the current Fiori
elements runtime. Every requirement below MUST preserve them.

- **AP-1. No module-level mutable mode flags.** Output mode, namespace map,
  context object, and formatter context MUST be passed through arguments or
  a stack-saved/AsyncLocalStorage-style scope. A nested call MUST never
  corrupt an outer call's state. An `await` inside a scoped block MUST NOT
  leak the scope to a concurrently-running render.
- **AP-2. Single-purpose functions.** `jsx()` produces one kind of result
  per output mode; the implementation of each mode lives in its own module.
  No multi-mode dispatch via a giant `if/else` chain.
- **AP-3. Recursive flattening of structural sentinels.** Fragment, `<For>`,
  `<If>`, and any future sentinel MUST be unwrapped before any UI5
  aggregation receives the children. Falsy children (`null`, `undefined`,
  `false`, `""`) MUST be filtered explicitly, not implicitly.
- **AP-4. Type accuracy from constructor signatures.** Per-control props
  MUST be derived from each control's `$XSettings` interface, not from a
  generic walk over the instance type.
- **AP-5. Documented decisions.** Every non-obvious behaviour (e.g. why
  each binding access returns a fresh `BindingInfo` instance) MUST be
  commented with the *why*, not just the *what*.
- **AP-6. Composable, not configurable.** Prefer adding small, focused
  helpers over adding flags to existing functions. New behaviour SHOULD
  arrive as a new sentinel/intrinsic/helper rather than a new branch.

---

## 4. Functional requirements

Each requirement carries an ID (`FR-<area>-<n>`), a single-sentence
statement, the rationale, and an acceptance criterion.

### 4.1 Output modes (`FR-RUN`)

#### FR-RUN-01. Control-instance mode (default)

**Requirement.** `jsx(type, props, key)` MUST return a `new type(settings)`
instance when `type` is a UI5 control class, with children routed to the
default aggregation.

**Rationale.** This is the existing app-view behaviour and the most common
case.

**Acceptance.** `<Page><Button text="x"/></Page>` produces a `Page` with
the `Button` in its `content` aggregation.

#### FR-RUN-02. XML-serialization mode

**Requirement.** A `renderToXML(jsxFactory, options)` helper MUST exist that
runs `jsxFactory` in a scoped XML mode and returns the resulting XML string.
The scope MUST be stack-saved, not reset (AP-1). The helper MUST accept a
namespace alias map and an optional override root tag.

**Rationale.** Required for Fiori elements' XML-preprocessor pipeline.
Replaces the current `jsx.renderAsXML` + `jsx.defineXMLNamespaceMap`
mechanism, which is async-unsafe.

**Acceptance.** Concurrent calls to `renderToXML` with different namespace
maps MUST NOT interfere; the returned XML reflects the map active at the
top of each call.

#### FR-RUN-03. RenderManager mode

**Requirement.** A `renderToRenderManager(rm, jsxFactory)` helper MUST exist
that maps JSX tags to `rm.openStart`/`rm.attr`/`rm.openEnd`/`rm.close` calls
and routes children through `rm.renderControl` / `rm.text`. The helper MUST
NOT mutate module-level state.

**Rationale.** Required for control renderers that want to use JSX directly.

**Acceptance.** `<div class="x"><span>{label}</span></div>` produces the
same DOM as the equivalent `rm.openStart(...)` calls.

#### FR-RUN-04. Mode isolation guarantee

**Requirement.** Output mode MUST be a property of an explicit scope, never
a module-level flag. A `Promise.all([renderToXML(a), renderToXML(b)])` MUST
produce two correct, independent XML strings.

**Rationale.** AP-1. The current FE runtime fails this with
`defineXMLNamespaceMap`.

**Acceptance.** Unit test: 50 concurrent `renderToXML` calls each declaring
a distinct namespace map all produce the expected output.

---

### 4.2 Fragment & control flow (`FR-FRG`)

#### FR-FRG-01, `Fragment` exported from entry barrel

**Requirement.** The runtime entry MUST re-export `Fragment` so Babel's
`<></>` lowering resolves.

**Acceptance.** A `.tsx` source containing `<>foo</>` compiles and renders.

#### FR-FRG-02. Recursive child flattening

**Requirement.** A single `flattenChildren` helper MUST recursively unwrap
arrays, fragments, `<If>` literal-true nodes, and any future structural
sentinel into a flat list of UI5 controls. Falsy children
(`null`/`undefined`/`false`/`""`) MUST be dropped explicitly.

**Acceptance.** `[<A/>, [<B/>, <></>], false, null, <><C/></>]` flattens to
`[A, B, C]` regardless of nesting depth.

#### FR-FRG-03, `<For>` structural directive

**Requirement.** `<For each={ref}>{() => <Row/>}</For>` MUST install `ref`
(a BindingInfo or `ListBindingRef`) on the parent's targeted aggregation
and use the rendered render-prop result as `template`. Default target is
the parent's default aggregation; `aggregation="cells"` overrides.

**Acceptance.** `<Table><For each={list}>{() => <ColumnListItem/>}</For></Table>`
produces a Table with `items` bound and one ColumnListItem template.

#### FR-FRG-04, `<If>` structural directive

**Requirement.** `<If condition={…}>` MUST behave as follows:
- **Literal `true`:** inline children into the parent.
- **Literal `false`:** drop children.
- **Bound condition (BindingInfo or BindingValue):** call
  `child.bindProperty("visible", { ...condition })` on each child.
- **Conflict:** if a child already binds or pins `visible`, throw with a
  message instructing the developer to combine the conditions in an
  expression binding.

**Rationale.** No wrapper control ⇒ runtime stays library-agnostic; existing
control trees stay intact for OPA/a11y tools.

**Acceptance.** `<If condition={pathInModel("isVip")}><Text/></If>`
produces a single `Text` whose `visible` is bound to `isVip`.

#### FR-FRG-05. Fragment in XML mode

**Requirement.** `Fragment` MUST also be unwrapped in XML mode, producing
no extra wrapping tag. `<For>` and `<If>` MUST emit the appropriate
attribute / nested-tag form for the XML preprocessor.

**Acceptance.** `<></>` does not appear as a tag in the rendered XML;
`<If condition="{cond}"><Text/></If>` becomes `<Text visible="{cond}"/>`.

---

### 4.3 Event handling (`FR-EVT`)

#### FR-EVT-01. Dot-handler strings

**Requirement.** An event-shaped prop with a string value starting with `"."`
(e.g. `press=".onTap"`) MUST be resolved at fire-time against the nearest
ancestor exposing `getController()`, exactly like XML views.

**Acceptance.** `<Button press=".onPress"/>` inside a view fires
`controller.onPress(event)` regardless of where it sits in the tree.

#### FR-EVT-02. Function-reference handlers

**Requirement.** An event prop with a function value MUST be passed through
unchanged. Type narrowing in TS MUST surface the typed event (`Input$LiveChangeEvent`,
etc.) at the call site.

**Acceptance.** `<Input liveChange={(e) => …}/>` typechecks and fires
correctly.

#### FR-EVT-03. UI5 commanding intrinsic

**Requirement.** A `command` prop (or `jsx:command` for parity) of the form
`"cmd:Foo|press"` MUST resolve to the UI5 commanding framework's resolved
event handler when the parent control supports the targeted event.

**Rationale.** Fiori elements relies on this for the command framework.

**Acceptance.** `<Button command="cmd:Save|press"/>` fires the Save command
on press.

---

### 4.4 Binding integration (`FR-BND`)

#### FR-BND-01. Plain BindingInfo objects

**Requirement.** Any prop value with a `path` field (and optionally `model`,
`mode`, `parts`, `formatter`) MUST be passed through as-is to UI5's
constructor; UI5's `extractBindingInfo` does the rest. Each consumer MUST
receive a *fresh shallow copy*, the runtime MUST NOT share BindingInfo
objects across multiple controls.

**Rationale.** UI5's binding installation may mutate the BindingInfo;
sharing one object across N consumers corrupts every binding after the
first. (Real bug, fixed in the sample's commit `2e12ecd`.)

**Acceptance.** `<For each={list}>{() => <Item/>}</For>` produces N rows
without binding-info aliasing across rows.

#### FR-BND-02, `BindingValue` dual-purpose values

**Requirement.** `BindingValue` instances MUST be recognised both as
BindingInfo (because they carry `path`/`model`/`mode`) and as live values
(via `toString()` / `valueOf()`). Each `BindingValue` access from a reactive
proxy MUST yield a fresh instance.

**Acceptance.** `String(model.name) === "x"` reads the current value;
`<Input value={model.name}/>` produces a TwoWay PropertyBinding.

#### FR-BND-03. Binding template via populated default aggregation

**Requirement.** If the JSX child of a control whose default aggregation
already carries a BindingInfo (`items={listRef}`), that child MUST be
attached as the BindingInfo's `template`, not appended as another child.
An explicit `template` set by the user MUST NOT be overwritten.

**Acceptance.** `<Table items={list}><ColumnListItem/></Table>` produces
a list-bound Table with the ColumnListItem as the row template.

---

### 4.5 Expression toolkit (`FR-EXP`)

#### FR-EXP-01. BindingToolkit compatibility

**Requirement.** A `BindingToolkitExpression<T>` value passed as a prop MUST
be processed as follows:
- Constant expression → `compileConstant(...)` (resolves to plain value).
- Path-in-model expression in an aggregation slot → `{ path, model }`
  BindingInfo.
- Anything else → `compileExpression(...)` to produce the binding string.

**Rationale.** Required for Fiori elements' converters; preserves the
expression-tree advantage over hand-written binding strings.

**Acceptance.** `<Text visible={ifElse(equal(pathInModel("type"), "VIP"),
true, false)}/>` produces `visible="{= ${type} === 'VIP' }"`.

#### FR-EXP-02. XML mode escapes BindingToolkit output

**Requirement.** When emitting XML, expression strings produced by
`compileExpression` MUST be passed through XML-attribute escaping
(`&`, `<`, `"`, `'`).

**Acceptance.** An expression containing `&&` or quotes serialises into
valid XML.

---

### 4.6 Late (async) properties (`FR-LATE`)

#### FR-LATE-01. Promise-valued props

**Requirement.** A property value that is a `Promise` MUST be removed from
the constructor settings, the control MUST construct without it, and the
runtime MUST call `setProperty(name, value)` once the promise resolves.
Errors MUST be logged, not thrown.

**Rationale.** Fiori elements converters can hand back unresolved metadata
lookups. The control should not block on them.

**Acceptance.** `<Text text={Promise.resolve("hi")}/>` constructs a Text
with no text, and updates to "hi" once the promise resolves.

#### FR-LATE-02. Late properties never become aggregations

**Requirement.** Promise values that target an aggregation slot MUST be
flagged as a developer error.

**Rationale.** Aggregations have no `setProperty` equivalent and the
async semantics are confusing.

**Acceptance.** `<Page content={Promise.resolve(<Button/>)}/>` throws a
clear runtime error.

---

### 4.7 Context propagation (`FR-CTX`)

#### FR-CTX-01. Scoped JSX context

**Requirement.** A `withContext({ ownerControl?, view?, appComponent?,
formatterContext? }, fn)` helper MUST run `fn` with that context visible to
inner `jsx` calls and restore the previous context (stack-saved, not reset)
on exit. `await` inside `fn` MUST NOT leak the scope.

**Acceptance.** Concurrent `withContext(a, fa)` and `withContext(b, fb)`
calls each see their own context; nested `withContext(c, fc)` inside `fa`
restores `a` on exit.

#### FR-CTX-02. Owner-control reference plumbing

**Requirement.** The runtime MUST be able to associate created controls
with a designated "owner" control so the `@controllerExtensionHandler`
decorator system can find its target. The mechanism MUST be opt-in (no
overhead when not used).

**Acceptance.** A control created inside `withContext({ ownerControl: x },
…)` is reachable from `x.controlReferences[id]`.

#### FR-CTX-03. Formatter context

**Requirement.** A `formatterContext` object MUST be passed as the second
argument to control constructors that accept one (UI5's "formatter
context"). It MUST be scoped via `withContext`, not via a separate setter
with no restore.

**Acceptance.** `withContext({ formatterContext: ctx }, () => <X/>)`
constructs `X` with `ctx` available to its formatters.

---

### 4.8 View / Component integration (`FR-VIEW`)

#### FR-VIEW-01. TSX View base class

**Requirement.** A `View`-derived class MUST exist that runs
`createContent()` returning JSX, with `getControllerModuleName()` and
`getAutoPrefixId()` overridable. Construction MUST go through
`Component.runAsOwner` so the surrounding component owns the new controls.

**Acceptance.** A class extending it returns a control tree from
`createContent()` and integrates with UI5 routing exactly like
`XMLView`.

#### FR-VIEW-02. Async view loader

**Requirement.** A `ViewLoader`-equivalent MUST exist that lazy-loads a
TSX view module by name (`viewName: "ui5/app/foo/MyView"`), bridges the
preprocessor data, and routes the controller correctly. It MUST NOT depend
on global state.

**Acceptance.** `View.create({ viewName: "…", type: "TSX" })` resolves and
creates the view.

#### FR-VIEW-03. UI5 Fragment (controllerless dialog) factories

**Requirement.** A factory pattern (e.g. `defineFragment(id, () => <Dialog/>)`)
MUST exist for fragment-style reusable controls that aren't full views.
`createContent`-style consumers call `addDependent(factory(this))` to mount
them.

**Acceptance.** `HelloDialog.fragment.tsx` exporting a factory works
identically to the XML fragment it replaces.

---

### 4.9 Intrinsics (`FR-INT`)

#### FR-INT-01, `class` → `addStyleClass`

**Requirement.** A `class` prop with a string value MUST be split on
whitespace and applied via `addStyleClass`. In XML mode, it MUST emit as a
`class="..."` attribute that UI5's settings parser routes through the same
path.

**Acceptance.** `<Button class="x y"/>` results in `addStyleClass("x")`
and `addStyleClass("y")` calls.

#### FR-INT-02, `binding` → `bindElement`

**Requirement.** A `binding` prop accepting a string or
`Record<modelName, path>` MUST call `bindElement` correctly.

**Acceptance.** `<VBox binding="{/Foo}"/>` and
`<VBox binding={{ "model": "/Foo" }}/>` both produce the expected element
binding.

#### FR-INT-03, `ref` → controller reference

**Requirement.** A `ref` prop with a `Ref<T>` value MUST call
`ref.setCurrent(instance)` after construction. In XML mode, `ref` MUST be
ignored (no instance exists yet).

**Acceptance.** `const myButton: Ref<Button> = …; <Button ref={myButton}/>`
populates `myButton.current` after construction.

#### FR-INT-04. Custom-data intrinsics

**Requirement.** The following props MUST be lifted into the control's
`sap-ui-custom-settings` data slot, not passed to the constructor:
- `dt:designtime` → `customSettings["sap.ui.dt"].designtime`
- `fl:delegate` → `customSettings["sap.ui.fl"].delegate`
- `customData:entityType` → adds the proper xmlns in XML mode.
- `log:sourcePath` → adds the proper xmlns in XML mode.

**Acceptance.** Round-trip parity with the equivalent XML notation.

#### FR-INT-05, `core:require` (XML mode)

**Requirement.** A `core:require` prop MUST emit
`xmlns:core="sap.ui.core"` and the `core:require` attribute in XML mode,
but MUST be silently dropped in control-instance mode (not useful at
runtime).

**Acceptance.** Mirrors the current FE behaviour.

---

### 4.10 TypeScript typing (`FR-TYPE`)

#### FR-TYPE-01. Per-control prop typing from `$XSettings`

**Requirement.** `LibraryManagedAttributes<C, P>` MUST resolve to the
control's `$XSettings` interface using `ConstructorParameters` inference
on both `(settings?)` and `(id?, settings?)` constructor overloads. Function
components fall back to their first parameter; unknown shapes fall back to
`Record<string, unknown>`.

**Rationale.** AP-4. `@openui5/types` already ships these interfaces.

**Acceptance.** `<Button text={42}/>` produces a TS error; `<Table
items={...}><ColumnListItem/></Table>` typechecks.

#### FR-TYPE-02. Event-prop dot-handler widening

**Requirement.** Each event-shaped prop in `$XSettings` MUST additionally
accept a `` `.${string}` `` literal type so dot-handler strings typecheck.

**Acceptance.** `<Button press=".onPress"/>` typechecks; `<Button press="onPress"/>`
(missing dot) does not.

#### FR-TYPE-03. Standard JSX extras

**Requirement.** Every element MUST additionally accept `id?: string`,
`key?: string | number`, `class?: string`, and `children?: unknown`
regardless of what the underlying `$XSettings` declares.

**Acceptance.** All four are valid props on every JSX element.

#### FR-TYPE-04, `JSX.Element = any` (deliberate)

**Requirement.** The `JSX.Element` type MUST be `any` so a JSX expression
satisfies arbitrary named-aggregation slot types
(`$CardSettings.header?: IHeader`, `Column[]`, etc.). Prop validation
happens at the call site against `$XSettings`, not at the slot boundary.

**Rationale.** UI5's "JSX world" *is* the control world; there is no
separate boundary like React's `ReactElement` to exploit.

**Acceptance.** `<Card header={<Header/>}/>` typechecks.

---

## 5. Non-functional requirements

### NFR-PERF. Performance

- **NFR-PERF-1.** A `<Page><VBox><Button/></VBox></Page>` JSX render in
  control-instance mode MUST complete in ≤ 1.2× the wall-clock time of the
  equivalent imperative `new Page({content: new VBox({items: new Button()})})`.
- **NFR-PERF-2.** Concurrent `renderToXML` calls MUST scale linearly with
  CPU count up to the JS event-loop limit (no shared mutable state means
  no false serialisation).

### NFR-SIZE. Bundle size

- **NFR-SIZE-1.** The control-instance-mode core (without XML or
  RenderManager helpers) MUST gzip to ≤ 4 KB.
- **NFR-SIZE-2.** XML and RenderManager helpers MUST be tree-shakeable,
  apps that don't use them pay nothing.

### NFR-DOC. Documentation

- **NFR-DOC-1.** Every public function MUST carry a JSDoc block with at
  least one usage example.
- **NFR-DOC-2.** Every non-obvious decision in the source MUST be commented
  with the *why*, in the style of the current sample (AP-5).
- **NFR-DOC-3.** A migration guide from the legacy `sap.fe.base/jsx-runtime`
  MUST exist, listing every affected API and the replacement.

### NFR-COMP. Compatibility

- **NFR-COMP-1.** UI5 compatibility: 1.130 LTS and newer.
- **NFR-COMP-2.** TypeScript compatibility: 5.0 and newer.
- **NFR-COMP-3.** Babel compatibility: `@babel/plugin-transform-react-jsx`
  ≥ 7.20 with `runtime: "automatic"`.

### NFR-TEST. Testing

- **NFR-TEST-1.** Unit-test coverage ≥ 90 % branch coverage on the runtime
  core.
- **NFR-TEST-2.** A regression suite MUST cover at minimum: Fragment
  flatten, falsy filtering, `<For>`/`<If>` semantics, BindingInfo aliasing,
  late-property settling, mode-isolation under concurrency, dot-handler
  resolution.
- **NFR-TEST-3.** A golden-file test suite MUST verify XML-mode output
  byte-for-byte against the current FE serialiser for a representative
  sample of building blocks.

---

## 6. Out of scope (explicit)

| Item | Why excluded |
|---|---|
| React hooks (`useState`, `useEffect`, …) | NG-1; UI5's binding system already provides reactive state. |
| Virtual DOM diffing / reconciliation | NG-1; UI5 controls are stateful and reused, not torn down per render. |
| JSX-level CSS-in-JS | Use UI5 themes and `addStyleClass`. |
| Routing | Owned by `Router`/`Targets` from `sap.ui.core.routing`. |
| Server-side rendering | UI5 doesn't ship an SSR pipeline; XML-mode covers the "stringify a tree" use case. |
| Code generation | NG-3; per-control typing comes from `@openui5/types`, no extra step. |

---

## 7. Migration & adoption strategy

1. **Phase 1. Parity layer.** Implement FR-RUN-01, FR-FRG-*, FR-EVT-*,
   FR-BND-*, FR-TYPE-*. The result is a clean control-instance runtime
   suitable for app views.
2. **Phase 2. Framework features.** Add FR-EXP-*, FR-LATE-*, FR-CTX-*,
   FR-INT-* one by one, each behind a stable API. Fiori elements keeps
   running on the legacy runtime until everything it needs is in.
3. **Phase 3. Output modes.** Add FR-RUN-02 (XML) and FR-RUN-03
   (RenderManager). Verify byte-parity with NFR-TEST-3.
4. **Phase 4. View loader & components.** Implement FR-VIEW-*. Migrate
   one Fiori elements page (e.g. ListReport) end-to-end as a smoke test.
5. **Phase 5. Cutover.** Switch `sap.fe.base/jsx-runtime` to delegate
   into the new runtime. Remove the legacy module after one LTS cycle.

At each phase boundary, the AP-* invariants MUST be re-verified by the
test suite. Any regression on cleanliness blocks promotion.

---

## 8. Open questions

- **OQ-1.** Should the runtime expose a public hook for *additional*
  intrinsics (analogous to React's `JSX.IntrinsicElements`), so apps can
  register their own, or are the SAP intrinsics enough?
- **OQ-2.** Should `<For>` / `<If>` live in the runtime core or in a
  separate "directives" module that apps opt into?
- **OQ-3.** AsyncLocalStorage vs. an explicit context-passing argument:
  cleanest API for FR-CTX-01? AsyncLocalStorage is invisible (great for
  ergonomics) but couples to the JS runtime; explicit-pass keeps the
  function pure but every consumer has to thread it.
- **OQ-4.** How aggressive should the typing in FR-TYPE-04 be? Could a
  more accurate `Element` type (e.g. `Control | FragmentNode | ForNode |
  IfNode`) work for some named-slot cases?
- **OQ-5.** Should BindingToolkit move out of `sap.fe` and become a
  general UI5 expression-toolkit, available to any TSX consumer?
- **OQ-6.** Naming: is `ui5/jsx-runtime` (or `@ui5/jsx-runtime`) a
  reasonable home for the consolidated runtime, or should it stay under
  the application namespace and be reused via `paths` mapping?

---

## 9. Acceptance summary

The runtime MUST be considered "complete" when:

- All FR-* requirements are implemented and covered by the regression
  suite.
- All NFR-* targets are met.
- A representative Fiori elements page (ListReport + ObjectPage) renders
  end-to-end on the new runtime with no functional regression.
- The legacy `sap.fe.base/jsx-runtime` module can be removed.
- The architectural-principles regression test (a programmatic check that
  no module-level mutable mode flag exists, no instance-type prop walk
  exists, no shared BindingInfo across consumers) passes on every PR.
