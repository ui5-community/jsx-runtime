# Gotchas — the pitfalls, one page

The pitfalls that trip up humans and LLMs alike. Each entry is a self-contained "if you're seeing X, it's because Y." Cross-linked from source JSDoc and from [cookbook.md](cookbook.md).

---

## `withScope` is synchronous only

`withScope(scope, fn)` saves the previous scope on entry and restores it on `fn`'s **synchronous** return. An `await` inside the callback silently leaks the scope across an async boundary on runtimes without `AsyncLocalStorage`.

```tsx
// ❌ Wrong — scope leaks after the await
withScope({ childrenProcessors: [p] }, async () => {
    await somethingAsync();
    return <VBox>…</VBox>;
});

// ✅ Right — do the async work first, then wrap the sync build
const data = await somethingAsync();
return withScope({ childrenProcessors: [p] }, () =>
    <VBox>… uses {data} …</VBox>
);
```

If you genuinely need async-aware scoping, wrap `withScope` in a plugin-local `withAsyncScope` helper that opts into `AsyncLocalStorage`. Do not change `withScope` itself.

Documented at [src/runtime/scope.ts](../packages/jsx-runtime/src/runtime/scope.ts).

---

## HTML intrinsic tags are typed but not runtime-supported (yet)

`JSX.IntrinsicElements` permissively types `<div>`, `<svg>`, `<my-tag>`, etc. The **default** renderer throws on lowercase tags — it constructs UI5 controls, and a literal `div` cannot become a control.

```tsx
// ❌ Typechecks, throws at runtime
<div class="wrap"><span>hi</span></div>
```

An HTML-aware renderer plugin is planned that installs an `htmlIntrinsic` in the scope; until then, treat lowercase tags as unusable in JSX. The error message from `jsx()` names the missing `htmlIntrinsic` explicitly.

---

## `defineSentinel<P>` needs its generic

`defineSentinel` uses a phantom call signature `(props: P) => never` so the JSX type-checker knows which props your sentinel accepts. Drop the generic and TS falls back to `any` — your directive stops catching prop typos.

```tsx
// ❌ Loses per-prop typing
export const Lazy = defineSentinel("Lazy");
<Lazy whn={x}>…</Lazy>;   // no error, typo passes silently

// ✅ Keeps typing
export const Lazy = defineSentinel<{ when: unknown }>("Lazy");
<Lazy whn={x}>…</Lazy>;   // error: 'whn' does not exist on 'LazyProps'
```

---

## Binding-info objects need `as never`

Object-form binding literals (`{ path, type, formatOptions }`) don't satisfy the concrete `value?: string` on `$InputSettings`. The convention is a deliberate `as never` cast at the JSX site.

```tsx
<Input value={{
    path: "form>/count",
    type: new Integer({}, { minimum: 0, maximum: 999 })
} as never} />
```

Do not widen `$InputSettings.value` to swallow the binding-info shape — that would erase the per-control typing for the string form. The `as never` is the *smaller* concession.

Reference: [binding-object sample](../packages/jsx-runtime-showcase/webapp/view/showcases/BindingObject.tsx).

---

## Two senses of "fragment"

The word means two different things in UI5, both legitimate. They do **not** interoperate.

| Sense | Syntax | Purpose |
| --- | --- | --- |
| **JSX fragment** | `<>…</>` | Group siblings, no wrapper control, no lifecycle. |
| **UI5 fragment** | `*.fragment.tsx` factory | Reusable UI chunk (typically a dialog), mounted via `addDependent`. |

Do not conflate them in prose or in generated code. A JSX fragment cannot be `addDependent`-ed; a UI5 fragment factory cannot be inlined as `<>…</>`.

Reference: [fragments sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Fragments.tsx), [fragment-dialog sample](../packages/jsx-runtime-showcase/webapp/view/showcases/FragmentDialogDemo.tsx).

---

## `getController(): this` is sample-only

Every showcase view overrides `getController(): Controller { return this as unknown as Controller; }` so a standalone `.tsx` can resolve `.dotHandlers` and function refs without a separate controller file.

**Do not ship this in production code.** Real apps keep a separate `*.controller.ts` file so the view stays declarative. The override merges view and controller responsibilities on purpose only to keep a sample readable in one file.

---

## Helpers are called as values, not as tags

The JSX `type` must be a UI5 class (or a sentinel). A plain function is neither.

```tsx
function labelledValue(label: string, value: string): Control { … }

// ❌ Wrong — the runtime rejects this
<labelledValue label="Name" value="Ada" />

// ✅ Right — call it and interpolate the returned Control
{labelledValue("Name", "Ada")}
```

Reference: [fragment-fn sample](../packages/jsx-runtime-showcase/webapp/view/showcases/FragmentFn.tsx).

---

## `import "…/jsx-runtime"` has a load-bearing side effect

Importing the barrel executes `installViewScopeBridge()`, which patches `View.prototype.createContent` to wrap every subclass call in `withScope({ view: this }, …)`. Removing the patch breaks auto-prefix ID resolution.

Do not tree-shake the barrel import, and do not conditionally import it. Any code path that constructs JSX must have executed that import at least once.

Reference: [src/runtime/installViewScopeBridge.ts](../packages/jsx-runtime/src/runtime/installViewScopeBridge.ts).

---

## The runtime is control-agnostic — there is no allow-list

`jsx(type, props)` calls `new type(settings)` on whatever class you pass. Consumers `import Button from "sap/m/Button"; <Button …/>`. The tag namespace is exactly the set of UI5 modules the app imports.

Do not propose a control registry, tag-to-class mapping table, or class-name allow-list. The design explicitly rejects them.

---

## No dependencies from the core on `sap.m` / `sap.f` / `sap.tnt`

The runtime imports from `sap.ui.core` and `sap.ui.base` only. Sample plugins must not add such dependencies either. This is enforced by convention (check imports before merging), not by tooling.

---

## `JSX.Element` is `any` on purpose

The type is aliased to `any` so JSX can satisfy any named-aggregation slot without per-slot casting. An AI author relying on element-type discrimination for slot validation will be surprised — per-prop typing catches errors at the **call site**, not the **slot boundary**. Documented at length inline in [src/runtime/runtime.ts](../packages/jsx-runtime/src/runtime/runtime.ts).

---

## Documentation lives in three places, on purpose

- Root [docs/](.) — the spec, concept overview, cookbook, gotchas (this file). Canonical.
- Package READMEs under [packages/*/README.md](../packages/) — package-scoped install and usage.
- Showcase [webapp/docs/](../packages/jsx-runtime-showcase/webapp/docs/) — end-user Learn pages shipped inside the running app.

When you add documentation, place it where the consumers of that layer look. Cross-link; don't copy.
