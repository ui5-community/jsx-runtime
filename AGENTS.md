# AGENTS.md

Orientation for coding agents (Claude Code, Cursor, Copilot, aider, and friends) landing on this repo. Human contributors, see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repo is

A pnpm monorepo with three packages:

- **`@ui5-community/jsx-runtime`** — [packages/jsx-runtime/](packages/jsx-runtime/) — the publishable library. Core JSX runtime + one sample plugin (`<Switch>`).
- **`@ui5-community/jsx-runtime-showcase`** — [packages/jsx-runtime-showcase/](packages/jsx-runtime-showcase/) — a runnable UI5 app that doubles as living documentation. Not published.
- **`@ui5-community/jsx-runtime-helloworld`** — [packages/jsx-runtime-helloworld/](packages/jsx-runtime-helloworld/) — a minimal, plain-scaffolded UI5 TypeScript app that consumes the runtime the way an external project would (`workspace:^` dependency, `jsxImportSource` + `ui5.yaml` `transformJSX` wiring only). The reference for "how do I adopt this from scratch?" Not published.

The runtime is small on purpose: ~2600 LoC of source, 12 runtime exports, ~12 types, one plugin SPI with five extension points. Read the whole barrel in one sitting: [packages/jsx-runtime/src/jsx-runtime.ts](packages/jsx-runtime/src/jsx-runtime.ts).

## If you need to know X, read Y

| You want to answer… | Read |
| --- | --- |
| What does the runtime do at all? | [docs/jsx-runtime.md](docs/jsx-runtime.md) |
| Is behaviour X a requirement or an accident? | [docs/requirements.md](docs/requirements.md) — search for `FR-…` / `NFR-…` IDs, they're cited from source JSDoc |
| How do I write recipe X? (events, bindings, tables, plugin, embedding) | [docs/cookbook.md](docs/cookbook.md) — 15 canonical recipes |
| Which known pitfall is this? | [docs/gotchas.md](docs/gotchas.md) — 12 entries, cross-linked from source |
| How do I migrate an XMLView? | [docs/MIGRATION.md](docs/MIGRATION.md) — translation table + prerequisites; [docs/xmlview-to-tsx.md](docs/xmlview-to-tsx.md) — full step-by-step conversion guide |
| Why is there no sample for X (routing, OData, custom control)? | [docs/deferred-samples.md](docs/deferred-samples.md) |
| What changed in the current release? | [packages/jsx-runtime/CHANGELOG.md](packages/jsx-runtime/CHANGELOG.md) (changesets-generated) |
| How do I import / configure this from a UI5 app? | [packages/jsx-runtime/README.md](packages/jsx-runtime/README.md) + [webapp/docs/setup.md](packages/jsx-runtime-showcase/webapp/docs/setup.md), [webapp/docs/tsconfig.md](packages/jsx-runtime-showcase/webapp/docs/tsconfig.md), [webapp/docs/ui5-yaml.md](packages/jsx-runtime-showcase/webapp/docs/ui5-yaml.md) |
| How does `<Foo prop=…/>` become `new Foo({prop: …})`? | [src/runtime/runtime.ts](packages/jsx-runtime/src/runtime/runtime.ts) — start at `export function jsx`, which now carries an `@example` block |
| How do I write a plugin? | [src/runtime/plugin.ts](packages/jsx-runtime/src/runtime/plugin.ts) (SPI) + [src/plugins/switch/index.tsx](packages/jsx-runtime/src/plugins/switch/index.tsx) (worked example) + [webapp/docs/plugin-spi.md](packages/jsx-runtime-showcase/webapp/docs/plugin-spi.md) + [docs/cookbook.md](docs/cookbook.md) recipe 15 |
| What are `Scope` / `withScope` for? | [src/runtime/scope.ts](packages/jsx-runtime/src/runtime/scope.ts) — file header explains the design; see caveat below |
| What does a real sample look like? | Enumerate via [packages/jsx-runtime-showcase/samples.json](packages/jsx-runtime-showcase/samples.json), then read the paired `.tsx` under [webapp/view/showcases/](packages/jsx-runtime-showcase/webapp/view/showcases/) + `.md` under [webapp/docs/samples/](packages/jsx-runtime-showcase/webapp/docs/samples/) |
| How is behaviour X tested? | [test/qunit/runtime/](packages/jsx-runtime/test/qunit/runtime/) — one file per concern |
| Which controls work as JSX tags? | Any UI5 class you `import` — see the "no registry" note below |

## Non-obvious things to know before you edit

### 1. There is no control registry

`jsx(type, props)` calls `new type(settings)` on whatever class you pass. Consumers `import Button from "sap/m/Button"; <Button …/>`. The tag namespace is exactly the set of UI5 modules the app imports. Per-control prop typing comes for free from `@openui5/types` (`$XSettings` interfaces). Do **not** add a control allow-list, mapping table, or tag-name-to-class bridge; the design explicitly rejects it.

### 2. HTML intrinsic tags are typed but not runtime-supported

`JSX.IntrinsicElements` permissively types `<div>`, `<svg>`, etc. The **default** renderer throws on lowercase tags because a `<div>` cannot become a UI5 control. An HTML-aware renderer plugin (planned) will install an `htmlIntrinsic` in the scope. Type-clean code can still fail at runtime — surface this in error messages if a user reports "TypeScript accepted it but it throws."

### 3. `withScope` is synchronous only

`withScope(scope, fn)` saves the previous scope on entry and restores it on `fn`'s synchronous return. `await` inside the callback silently leaks scope on runtimes without `AsyncLocalStorage`. Do not "helpfully" wrap `fn` in an async handler. Documented in [src/runtime/scope.ts](packages/jsx-runtime/src/runtime/scope.ts) and [docs/gotchas.md](docs/gotchas.md#withscope-is-synchronous-only). A future async-aware variant would be a separate `withAsyncScope` opting-in per plugin, not a change to `withScope`.

### 4. `import "…/jsx-runtime"` has a load-bearing side effect

Importing the barrel executes `installViewScopeBridge()`, which patches `View.prototype.createContent` to wrap subclass calls in `withScope({ view: this }, …)`. Removing the patch breaks auto-prefix ID resolution. See [src/runtime/installViewScopeBridge.ts](packages/jsx-runtime/src/runtime/installViewScopeBridge.ts).

### 5. "Fragment" is overloaded

Two different senses in this codebase, both legitimate UI5 terms:

- **JSX fragment** — `<>…</>`, a flat list of siblings, no wrapper control. See [webapp/docs/fragments.md](packages/jsx-runtime-showcase/webapp/docs/fragments.md).
- **UI5 fragment** — a reusable subtree with its own controller/factory (dialogs, popovers). See [webapp/docs/samples/fragment-dialog.md](packages/jsx-runtime-showcase/webapp/docs/samples/fragment-dialog.md).

Do not conflate them in generated code or docs.

### 6. `getController(): this` in most samples is a sample-only pattern

Most showcase views override `getController(): Controller { return this as unknown as Controller; }` so a standalone `.tsx` can resolve `.dotHandlers` without a separate controller file. This is explicitly *not* the recommended pattern for real apps — real apps keep a separate controller file (see [controller-as-file sample](packages/jsx-runtime-showcase/webapp/view/showcases/ControllerAsFile.tsx) and the [MIGRATION guide](docs/MIGRATION.md)). If you generate a new sample, keep the override; if you generate real app code, don't.

### 7. `defineSentinel<P>(name)` needs its generic

`defineSentinel` uses a phantom call signature `(props: P) => never` so the JSX type-checker knows what props your sentinel accepts. If you drop the generic, TS falls back to `any` and your directive stops catching prop typos. Always spell out `<P>`. See [docs/gotchas.md](docs/gotchas.md#definesentinelp-needs-its-generic).

### 8. Binding-info objects often need `as never`

Object-form binding literals (`{path, type, formatOptions}`) don't satisfy the concrete `value?: string` on `$InputSettings`. The convention is a deliberate `as never` cast at the JSX site. See [webapp/view/showcases/BindingObject.tsx](packages/jsx-runtime-showcase/webapp/view/showcases/BindingObject.tsx). This is not a bug, do not add a widened type.

### 9. Do not depend on `sap.m` / `sap.f` / `sap.tnt` from the runtime

The runtime is control-agnostic. The core imports from `sap.ui.core` and `sap.ui.base` only. Sample plugins must not add such dependencies either. This is enforced by convention (check imports before merging), not by tooling.

### 10. Docs live in three places, on purpose

- Root [docs/](docs/) — the spec, concept overview, cookbook, gotchas, migration guide, changelog. Canonical.
- [packages/jsx-runtime/](packages/jsx-runtime/) READMEs — package-scoped install/usage.
- [packages/jsx-runtime-showcase/webapp/docs/](packages/jsx-runtime-showcase/webapp/docs/) — end-user Learn pages, shipped in the running app.

When you add documentation, place it where consumers of that layer look. Cross-link; don't copy.

### 11. Deferred sample coverage is a documented gap

The showcase does not (yet) demonstrate routing from user code, `ODataModel` (v2 or v4), custom control authoring, forms, `sap.ui.table.Table`, `sap.ui.mdc.Table`, or a testing walkthrough. Their absence is deliberate and documented at [docs/deferred-samples.md](docs/deferred-samples.md). When a user asks "how do I X?" and X is on that list, cite the deferred-samples page and point at mainstream UI5 docs; do **not** synthesize a fake sample.

### 12. Sample registry is duplicated on purpose

[webapp/view/ExploreSample.tsx](packages/jsx-runtime-showcase/webapp/view/ExploreSample.tsx) holds the runtime source of truth; [samples.json](packages/jsx-runtime-showcase/samples.json) mirrors it for tool consumption. When you add or remove a sample, update **both**.

## Do not index

[packages/jsx-runtime-showcase/webapp/docs/_archive/](packages/jsx-runtime-showcase/webapp/docs/_archive/) is historical drafts kept for provenance. Superseded by the active docs. See the folder's [README.md](packages/jsx-runtime-showcase/webapp/docs/_archive/README.md).

## Running the app / tests / building API docs

```bash
pnpm install
pnpm dev                                              # showcase on http://localhost:8080
pnpm build                                            # both packages; also generates API docs into showcase/webapp/api/
pnpm build:api                                        # only the TypeDoc pass (useful before pnpm dev the first time)
pnpm test                                             # ts-typecheck + lint + QUnit + OPA5
```

The showcase's `build` script chains `build:api` before `ui5 build`, so the generated API reference is folded into the showcase's `dist/` and shipped as part of the same GitHub Pages artifact. In the running app, the "API" button in the header opens `./api/` in a new tab.

**Dev-mode caveat:** `pnpm dev` does not regenerate API docs. Run `pnpm build:api` once after a fresh clone (or whenever runtime JSDoc changes and you want to see the docs update) — `ui5 serve` will serve the resulting `webapp/api/` folder alongside the rest of the app.

## When in doubt

The prose in `src/runtime/*.ts` file headers is generally more up-to-date and specific than the top-level docs. If two sources disagree, the source-level JSDoc wins for **implementation semantics**; [docs/requirements.md](docs/requirements.md) wins for **whether a behaviour is contractual**.
