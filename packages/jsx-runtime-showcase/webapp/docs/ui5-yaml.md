# ui5.yaml

`ui5-tooling-transpile` (≥ 3.12) transpiles every `.tsx`/`.ts` file
and transforms the JSX for you: at build time as a customTask, at dev
time as a customMiddleware. One `transformJSX` option replaces a
hand-written `.babelrc.json` — the tooling assembles the rest of the
Babel pipeline (TypeScript, `transform-ui5`, `preset-env`) from your
`tsconfig.json` and browserslist. Add both:

```yaml
customConfiguration:
  config-ui5-tooling-transpile: &cfgTranspile
    transformJSX:
      runtime: automatic
      importSource: "ui5/community/jsx/runtime"

builder:
  settings:
    includeDependency:
      - ui5.community.jsx.runtime
  customTasks:
    - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
      configuration: *cfgTranspile

server:
  customMiddleware:
    - name: ui5-tooling-transpile-middleware
      afterMiddleware: compression
      configuration: *cfgTranspile
```

- `transformJSX`: enables `@babel/plugin-transform-react-jsx` (an
  optional peer dependency the tooling loads) with the given options,
  and auto-extends the file pattern to pick up `.tsx`/`.jsx`. Pass an
  explicit `filePattern: ".+(ts|tsx)"` if you need to override it.
- `includeDependency: ui5.community.jsx.runtime`: packages the
  runtime as a peer library. UI5's loader resolves it via
  `sap-ui-resource-roots` in your `index.html` (see below).
- **Collecting coverage?** Add `coverage: true` (or an options object)
  to the same configuration to instrument the transpiled code with
  `babel-plugin-istanbul` — no separate Babel config needed.

> **Good to know — what `transformJSX` generates.** The tooling builds
> the Babel config for you. If you ever need to reproduce it outside
> UI5 tooling (e.g. a standalone Jest run), the equivalent
> `.babelrc.json` is:
>
> ```json
> {
>   "presets": [
>     ["@babel/preset-env", { "targets": "defaults", "modules": false }],
>     "transform-ui5",
>     ["@babel/preset-typescript", { "allExtensions": true, "isTSX": true, "onlyRemoveTypeImports": true }]
>   ],
>   "plugins": [
>     ["@babel/plugin-transform-react-jsx", { "runtime": "automatic", "importSource": "ui5/community/jsx/runtime" }]
>   ],
>   "sourceMaps": true
> }
> ```
>
> `preset-env` down-levels modern JS, `transform-ui5` rewrites ES
> classes/imports into UI5's AMD + `Control.extend` form,
> `preset-typescript` strips the types, and
> `plugin-transform-react-jsx` is the JSX step `transformJSX` adds. With
> the tooling you maintain none of this — it's derived from your
> `tsconfig.json`, browserslist, and the `transformJSX` option. (An
> external Babel config, if present, takes precedence and disables the
> `transformJSX`/`transformTypeScript` auto-assembly.)

## Bootstrap: resource roots

UI5's AMD loader resolves the module namespace `ui5/community/jsx/runtime/…`
(the AMD id the transpiled JSX imports) from a **resource root**
mapped to the dotted library name `ui5.community.jsx.runtime`.

When the UI5 **tooling serves your app** (`ui5 serve`, or a build
where `sap-ui-core.js` and the runtime both live under the app's own
`/resources/`), the default resource root already resolves the
namespace by convention — no extra config needed.

When you load **UI5 core from a CDN**, the default `/resources/` root
points at the CDN, which does **not** host the community runtime. You
must add an explicit resource root pointing that namespace at wherever
you serve the package's `dist/resources`:

```html
<script
  id="sap-ui-bootstrap"
  src="https://sdk.openui5.org/resources/sap-ui-core.js"
  data-sap-ui-libs="sap.m,ui5.community.jsx.runtime"
  data-sap-ui-resource-roots='{
    "your.app": "./",
    "ui5.community.jsx.runtime": "./resources/ui5/community/jsx/runtime/"
  }'
  data-sap-ui-compat-version="edge"
></script>
```

- The path is where **your** server exposes the package's built
  output — e.g. copy `node_modules/@ui5-community/jsx-runtime/dist/resources/ui5/community/jsx/runtime/`
  under your app's `resources/`, or point at any static host that
  serves it.
- List `ui5.community.jsx.runtime` in `data-sap-ui-libs` too, so the
  loader preloads the library (`library-preload.js`).

Install the tooling if you don't already have it:

```sh
npm install -D ui5-tooling-transpile
```

Or with pnpm:

```sh
pnpm add -D ui5-tooling-transpile
```

**Optional:** if your `.tsx` code pulls in npm modules
(e.g. `marked`, `prismjs`), add `ui5-tooling-modules` after
transpile to bundle them under the app namespace.
