# Converting XMLViews to TSX views

A practical, checklist-driven guide for migrating a UI5 app's
`*.view.xml` files to `.tsx` views backed by
[`@ui5-community/jsx-runtime`](../packages/jsx-runtime/). It reflects a
real conversion of the `jsx-runtime-helloworld` app (App + Main views).

> One view at a time. XML and TSX views coexist in the same app — the
> runtime produces the same `sap.ui.core.mvc.View` instances — so you
> can migrate incrementally and keep the app runnable throughout.

## 0. Wire the toolchain once (per app)

Before the first `.tsx` view compiles, the app needs three things. Skip
any you already have.

### `tsconfig.json` (compilerOptions)
```jsonc
"jsx": "react-jsx",
"jsxImportSource": "ui5/community/jsx/runtime",
"types": ["@openui5/types", "@ui5-community/jsx-runtime"]
```
`jsxImportSource` is the runtime's **UI5 module namespace** (`ui5/community/jsx/runtime`), not the npm package name.

### `ui5.yaml` — transform the JSX, transpile `.tsx`, bundle the runtime
`ui5-tooling-transpile` (≥ 3.12) enables the JSX transform from the
`transformJSX` option — no hand-written `.babelrc.json`. It assembles
the rest of the Babel pipeline (`@babel/preset-typescript`,
`transform-ui5`, `@babel/preset-env`) from `tsconfig.json` +
browserslist, and pulls in `@babel/plugin-transform-react-jsx` (an
optional peer dep — `npm i -D @babel/plugin-transform-react-jsx@^7`;
v8+ breaks the transform).
```yaml
customConfiguration:
  config-ui5-tooling-transpile: &cfgTranspile
    transformJSX:                  # enables @babel/plugin-transform-react-jsx
      runtime: automatic
      importSource: "ui5/community/jsx/runtime"
    transpileDependencies: true    # dev: transpile the workspace-linked runtime
builder:
  settings:
    includeDependency:
      - ui5.community.jsx.runtime   # bundle the lib into the build output
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

### `manifest.json` + bootstrap — resource roots (important)

The runtime's AMD modules load under the id `ui5/community/jsx/runtime/…`.
UI5 must be told where to find them:

1. Declare the library dependency in `manifest.json`:
   ```json
   "sap.ui5": { "dependencies": { "libs": { "ui5.community.jsx.runtime": {} } } }
   ```
2. Map the namespace to the served resources in your bootstrap
   (`index.html`, and any CDN/dist variant). The library ships under the
   app's `resources/` after build (`includeDependency` above), so:
   ```html
   data-sap-ui-resource-roots='{
     "your.app.namespace": "./",
     "ui5.community.jsx.runtime": "./resources/ui5/community/jsx/runtime/"
   }'
   ```
   Without this resource root the transpiled `import … from
   "ui5/community/jsx/runtime/jsx-runtime"` resolves against the CDN /
   default root and 404s. (When UI5 core itself is loaded from a CDN, this
   is doubly required — the community runtime is never on the CDN.) See
   also [the showcase's ui5-yaml Learn page](../packages/jsx-runtime-showcase/webapp/docs/ui5-yaml.md#bootstrap-resource-roots).

## 1. Convert the view file

Rename `Foo.view.xml` → `Foo.tsx` (module id `…/view/Foo`), and write a
`View` subclass returning the control tree from `createContent()`:

```tsx
import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import Page from "sap/m/Page";
import Button from "sap/m/Button";

/** @namespace your.app.namespace.view */
export default class Foo extends View {
  getAutoPrefixId(): boolean { return true; }              // see §4
  getControllerModuleName(): string {                       // see §3
    return "your/app/namespace/controller/Foo";
  }
  createContent(): Control {
    return (
      <Page id="page" title="{i18n>title}">
        <Button id="go" text="Go" press=".onGo" />
      </Page>
    );
  }
}
```

### Element → JSX mapping
| XML | TSX |
| --- | --- |
| `<Button text="Hi" />` | `<Button text="Hi" />` |
| namespaced control `<f:Card>` | `import Card from "sap/f/Card"` → `<Card/>` |
| **default aggregation** (e.g. `<Page>`'s content) | JSX children |
| **named aggregation** (e.g. `additionalContent`, `header`) | a prop: `additionalContent={<Button/>}` |
| enum attr `type="Emphasized"` | import the enum or pass the string; e.g. `illustrationType={IllustratedMessageType.SuccessHighFive}` (enums are their own module: `sap/m/IllustratedMessageType`, default export) |
| `press=".onGo"` (controller handler) | same `.onGo` string, or `press={this.onGo}` |
| binding `text="{i18n>x}"` | same string |
| aggregation binding `items="{/rows}"` with a row template | same string; put the row template as the JSX child: `<List items="{/rows}"><StandardListItem .../></List>` |

### Bindings with a formatter
XML `core:require` + `"{formatter: 'formatter.fmt', path: 'i18n>x'}"`
becomes a normal import and a binding-info object:
```tsx
import formatter from "../model/formatter";
// …
text={{ path: "i18n>btnText", formatter: formatter.formatValue }}
```

## 2. Update the manifest to load the TSX views

Typed views load via the **`module:` prefix + slash path** (not the dotted
`viewName` + `type: "XML"`):

- `rootView`: `{ "viewName": "module:your/app/namespace/view/App", "id": "app", "async": true }` (drop `type`).
- routing `config`: drop `viewType: "XML"` and `path`; keep `controlId` /
  `controlAggregation`.
- routing `targets`: `{ "name": "module:your/app/namespace/view/Main" }`.

## 3. Keep the controller as a separate file

The `.tsx` view keeps its existing `*.controller.ts`. Wire it with
`getControllerModuleName()` (returns the controller's slash-path module
id) — UI5 loads and instantiates it, `onInit` fires, and `.dotHandler`
event strings resolve against it, exactly like `controllerName` did in
XML. No controller code changes.

## 4. Two things that bite (learned the hard way)

- **`getAutoPrefixId(): true`** — return it from every view so control
  `id`s get the view prefix, matching XMLView behavior. Without it,
  `byId`/OPA `id:` lookups and route `controlId` resolution break.
- **OPA `viewName` matchers** — a `module:`-loaded TSX view reports its
  **module path** from `getViewName()`, not the dotted namespace. Update
  page objects: `viewName: "module:your/app/namespace/view/Main"` (not
  `"your.app.namespace.view.Main"`). Symptom: OPA logs *"Found 0 views
  with viewName '…'"* and times out. Assertions on fetched content (e.g.
  a markdown doc loaded relative to `document.baseURI`) can also fail
  under the OPA harness — prefer asserting synchronously-set controls.

## 5. Verify

1. `tsc --noEmit` — clean.
2. `eslint` — if the app's config enables `recommendedTypeChecked`, the
   `no-unsafe-return` / `no-unsafe-assignment` rules fire on JSX (every
   JSX expression is typed `any` by design). Relax them for `**/*.tsx`
   in the eslint config rather than sprinkling disables.
3. `ui5 serve` and open the app — confirm the views render, bindings and
   the i18n/formatter resolve, and event handlers fire (no console
   errors, especially resource-root / view-name resolution).
4. Run OPA/unit tests; fix `viewName` matchers per §4.
5. `ui5 build` — confirm the transpiled `.tsx` builds.
6. Delete the old `*.view.xml` once the TSX equivalent is verified.

## Reference

- Working example: [`jsx-runtime-helloworld`](../packages/jsx-runtime-helloworld/webapp/view/) (App + Main).
- Concept: [docs/jsx-runtime.md](jsx-runtime.md) · Setup: [showcase Learn docs](../packages/jsx-runtime-showcase/webapp/docs/setup.md).
