---
"@ui5-community/jsx-runtime": minor
---

Initial release of the plugin-based JSX runtime for UI5. Author UI5 views as `.tsx` — JSX compiles to plain `new Control(settings)` calls, with no React, no virtual DOM, and no reconciler. Ships the core directives (`jsx`, `<Fragment>`, `<For>`, `<If>`), a five-extension-point plugin SPI (`Renderer`, `IntrinsicHandler`, `PropertyApplier`, `ChildrenProcessor`, `Scope`), and the `<Switch>` sample plugin. Requires Node.js `>=22.13.0` and, for the build, `ui5-tooling-transpile` `>=3.12.0` with its `transformJSX` option.
