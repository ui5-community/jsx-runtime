# jsx-runtime

A **plugin-based JSX runtime for UI5**, write UI5 views as `.tsx` files with per-control TypeScript typing, no React, no VDOM, no reconciler. JSX expressions compile to plain `new Control(settings)` calls; a stable five-extension-point plugin SPI lets frameworks and libraries layer features on top of the core without touching it.

```tsx
import Button from "sap/m/Button";
import Page from "sap/m/Page";

export default class Main extends View {
    createContent() {
        return (
            <Page title="Hello">
                <Button text="Click me" press=".onPress" />
            </Page>
        );
    }
}
```

## Repository layout

This is a **pnpm-workspace monorepo** with three packages:

| Package | Path | Description |
| --- | --- | --- |
| `@ui5-community/jsx-runtime` | [`packages/jsx-runtime/`](packages/jsx-runtime/) | The library. Ships the core JSX runtime and the `<Switch>` sample plugin. Publishable to npm. |
| `@ui5-community/jsx-runtime-showcase` | [`packages/jsx-runtime-showcase/`](packages/jsx-runtime-showcase/) | The showcase app. Runs the library end-to-end and doubles as living documentation on GitHub Pages. Not published. |
| `@ui5-community/jsx-runtime-helloworld` | [`packages/jsx-runtime-helloworld/`](packages/jsx-runtime-helloworld/) | Minimal reference app — a plain scaffolded UI5 TypeScript project that consumes the runtime the way an external project would. Proves the from-scratch adoption path. Not published. |

Additional docs live in [`docs/`](docs/):

- [`docs/jsx-runtime.md`](docs/jsx-runtime.md), the concept overview (extended from the POC's `webapp/jsx-runtime/README.md`).
- [`docs/requirements.md`](docs/requirements.md), the full requirements spec for the runtime.
- [`docs/performance.md`](docs/performance.md), how JSX instantiation compares to XMLView (with measured numbers).
- [`docs/xmlview-to-tsx.md`](docs/xmlview-to-tsx.md), step-by-step guide for converting an app's `.view.xml` files to `.tsx` views.

## Getting started

Requires **Node.js ≥ 22.13** (the Node 22 LTS line) and **pnpm ≥ 11**. A `.nvmrc` pins the Node major — run `nvm use` if you use nvm.

```bash
# 1) install
pnpm install

# 2) run the showcase (also the dev harness for the library)
pnpm dev
# → http://localhost:8080

# 3) build all packages
pnpm build

# 4) run all tests (QUnit for the library, OPA5 for the showcase, via ui5-test-runner)
pnpm test

# optional: run the minimal reference app (see how an external project consumes the runtime)
pnpm dev:helloworld
# → http://localhost:8080
```

Editing a file in `packages/jsx-runtime/src/` while `pnpm dev` runs triggers `ui5-middleware-livereload` in the browser, no rebuild step needed. pnpm's workspace symlink and `ui5-tooling-transpile-middleware` do the rest.

## Concepts at a glance

The runtime provides three layers of API surface:

1. **Core directives**: `jsx`, `<Fragment>`, `<For>`, `<If>`. Always available, no setup.
2. **Plugin SPI**: five extension points (`Renderer`, `IntrinsicHandler`, `PropertyApplier`, `ChildrenProcessor`, `Scope`) let plugins add directives, intrinsics, and output adapters without touching the core.
3. **Sample plugin**: `<Switch>`/`<Case>`/`<Default>` in [`packages/jsx-runtime/src/plugins/switch/`](packages/jsx-runtime/src/plugins/switch/) proves the SPI on a non-trivial example.

Detailed rationale, walk-throughs, and API references are in [`docs/jsx-runtime.md`](docs/jsx-runtime.md).

## License

[Apache License 2.0](LICENSE).
