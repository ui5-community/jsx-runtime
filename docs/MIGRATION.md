# Migration guide: XMLView → JSXView

If you have an existing UI5 app built with `.view.xml` files, this guide shows the mechanical translation to `.tsx` under this runtime. Nothing about UI5's control model, data binding, routing, or i18n changes — only the view syntax.

The two view kinds interoperate. You can adopt JSX view-by-view; nothing in your existing XML views needs to change.

**Read first:** [docs/jsx-runtime.md](jsx-runtime.md) (concepts), [cookbook.md](cookbook.md) (canonical recipes), [gotchas.md](gotchas.md) (pitfalls).

---

## Prerequisites

Enable the JSX transform via `ui5-tooling-transpile`'s `transformJSX` option and set a TS `jsxImportSource` pointing at the runtime. Full snippets in [packages/jsx-runtime/README.md](../packages/jsx-runtime/README.md) and in the showcase's [ui5.yaml doc](../packages/jsx-runtime-showcase/webapp/docs/ui5-yaml.md) / [tsconfig doc](../packages/jsx-runtime-showcase/webapp/docs/tsconfig.md).

```jsonc
// tsconfig.json
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "ui5/community/jsx/runtime",
		"types": ["@openui5/types", "@ui5-community/jsx-runtime"]
	}
}
```

Add `ui5.community.jsx.runtime` to `sap.ui5.dependencies.libs` in [manifest.json](../packages/jsx-runtime-showcase/webapp/manifest.json).

---

## The translation table

Each row is a mechanical rewrite. Cross-linked to a runnable sample where one exists.

| XML | JSX (`.tsx`) | Notes |
| --- | --- | --- |
| `<mvc:View controllerName="app.MainView">` | `class MainView extends View { createContent(): Control { return <VBox>…</VBox>; } }` and a separate `MainView.controller.ts` | See [controller-as-file sample](../packages/jsx-runtime-showcase/webapp/view/showcases/ControllerAsFile.tsx). |
| `xmlns="sap.m"` | `import Button from "sap/m/Button";` at file top | No default namespace; every UI5 class is `import`ed explicitly. |
| `<Button text="Hi" press=".onPress" />` | `<Button text="Hi" press=".onPress" />` | Dot-handler string is preserved verbatim. See [events-dot sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EventsDot.tsx). |
| `<Button text="Hi" press="onPress" />` (no dot) | `<Button text="Hi" press={this.onPress.bind(this)} />` | JSX form is a function reference. See [events-fn sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EventsFn.tsx). |
| `<Input value="{/name}" />` | `<Input value="{/name}" />` | Binding strings are byte-identical. See [binding-string sample](../packages/jsx-runtime-showcase/webapp/view/showcases/BindingString.tsx). |
| `<Input value="{path: '/count', type: 'sap.ui.model.type.Integer'}" />` | `<Input value={{ path: "/count", type: new Integer({}, {}) } as never} />` | Object-form binding-info at the JSX site; `as never` is deliberate (see [gotchas.md](gotchas.md#binding-info-objects-need-as-never)). |
| `<Text text="{i18n>foo}" />` | `<Text text="{i18n>foo}" />` | i18n binding is unchanged. See [i18n sample](../packages/jsx-runtime-showcase/webapp/view/showcases/I18n.tsx). |
| `<List items="{/rows}"><StandardListItem …/></List>` | `<List items={{ path: "/rows" }}><StandardListItem … /></List>` | Implicit template. Two other spellings work too; see [structural sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Structural.tsx). |
| `<Panel><headerToolbar><Toolbar/></headerToolbar>…</Panel>` (named single-value slot) | `<Panel headerToolbar={<Toolbar/>}>…</Panel>` | Named single-value aggregations become JSX props. |
| `<template:if test="{cond}">…</template:if>` | `<If condition={{ path: "/cond" }}>…</If>` | Bound `<If>` binds each child's `visible`. See [structural sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Structural.tsx). |
| `<mvc:Fragment fragmentName="app.Dialog" type="XML"/>` | `import Dialog from "./Dialog.fragment"; …; this.addDependent(Dialog());` | JSX runtime uses a factory function returning a control tree instead of an XML fragment file. See [fragment-dialog sample](../packages/jsx-runtime-showcase/webapp/view/showcases/FragmentDialogDemo.tsx). |
| `<mvc:XMLView viewName="app.SubView"/>` | `<SubView/>` after `import SubView from "./SubView";` **or** `{await XMLView.create({ viewName: "app.SubView" })}` if `SubView` stays XML | JSX and XML views embed both ways. See [embed-six sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EmbedSix.tsx). |

---

## What stays the same

- Manifest, routing, models, controllers, i18n resource bundles, custom controls, OData services, `sap.ui.fl` variants, unit tests via QUnit, integration tests via OPA5.
- Binding strings, expression bindings (`{= expr}`), formatter functions, filters, sorters, aggregation `startingWith` / `endingWith`.
- The controller lifecycle (`onInit`, `onExit`, event handler methods).
- `sap.ui.core.mvc.Controller` — a JSX view uses a separate controller file exactly like an XML view does. See [controller-as-file sample](../packages/jsx-runtime-showcase/webapp/view/showcases/ControllerAsFile.tsx).

---

## Interop

- **JSX view embedding an XML view:** import as a class (`import SubXml from "./Sub.view.xml"` if your toolchain supports it) or use `XMLView.create({ viewName })` inside the JSX view's `createContent`.
- **XML view embedding a JSX view:** register the JSX view's viewName in `manifest.json` under `sap.ui5.routing.targets` (or instantiate via `View.create`) and reference it in XML with `<mvc:View viewName="…" />`.

Both directions are exercised in the [embed-six sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EmbedSix.tsx).

---

## What's still missing from the showcase

The showcase does **not** yet demonstrate: routing from a sample, an `ODataModel` (v2 or v4), `sap.ui.mdc` controls, custom control authoring in TSX. These are documented at [docs/deferred-samples.md](deferred-samples.md). For the moment, use your existing XMLView patterns for these areas and translate view-by-view as coverage grows.

---

## Sanity checklist

1. `pnpm add -D @babel/plugin-transform-react-jsx@^7 @ui5-community/jsx-runtime` (or the equivalent in your package manager). Pin the Babel plugin to **v7**; v8+ breaks the transform. It's an optional peer dep `ui5-tooling-transpile` loads for you.
2. Update [tsconfig.json](../packages/jsx-runtime-showcase/webapp/docs/tsconfig.md) as above.
3. Add the `transformJSX` option to [ui5.yaml](../packages/jsx-runtime-showcase/webapp/docs/ui5-yaml.md) as per the showcase docs (no `.babelrc.json` needed).
4. Add `ui5.community.jsx.runtime` to `manifest.json` libs.
5. Rename `Foo.view.xml` → `Foo.tsx`, translate mechanically per the table above.
6. Run the app. XML and JSX views coexist route-by-route until you finish.
