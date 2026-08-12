# JSX vs XMLView

Both are UI5 view types. Both return a control tree, both work
with controllers, routing, models, and the same `sap.ui.core.mvc.View`
lifecycle. Where they differ is **how you author them** and **what
the compiler can tell you at author-time**.

This page is a side-by-side concept map. It won't teach either
world from scratch; it lines up the vocabulary so you can move
between them.

## Concept table

| Concept | XMLView | JSXView (this runtime) |
|---|---|---|
| File format | `.view.xml` (XML) | `.tsx` (TypeScript with JSX) |
| Type safety on control props | None; free-form XML strings | Full; every prop checked against `$XSettings` |
| Controls declared as | XML tags with namespace prefixes | JSX elements (imported classes) |
| Static string bindings | `text="{path}"` | `text="{path}"` (same string) or `text={{ path: "…", formatter: fn }}` (object) |
| Aggregations | Nested XML children under a `<agg:name>` node | JSX children (default agg) or props for named aggs |
| Event handlers | `press="onXyz"` (string ref to controller method) | `press={this.onXyz}` (function), or `press=".onXyz"` for dot-notation |
| Loops | `<template:for>` (needs the XML preprocessor) | `<For each={items}>{item => …}</For>` (built-in) |
| Conditionals | `<template:if>` (same preprocessor) | `<If test={cond}>…</If>` or `{cond && …}` |
| Fragments / grouping | `<sap.ui.core:Fragment>` | `<Fragment>` / `<>…</>` |
| Auto id prefix | Handled by the XML parser automatically | Handled transparently once `getAutoPrefixId()` returns `true`; see [Auto id prefix →](#/learn/auto-prefix) |
| Interop with the other | JSX views embed via `<View viewName="module:…" />` | XML views embed via `XMLView.create({ viewName })` |
| Inline JS/TS logic in the view | Not allowed | Full: imports, helper functions, closures |
| Tooling | UI5 built-in XSD; XML editors | TypeScript compiler + ESLint + the entire TS ecosystem |
| Build story | Loaded verbatim; parsed at runtime | `ui5-tooling-transpile` runs `@babel/plugin-transform-react-jsx` |

## Worked snippets

Three side-by-side pairs (control with props, an aggregation,
and an event handler) so the "same idea in both worlds" reads
concretely.

### 1. Control with props

**XMLView**

```xml
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
    <Button text="Save" type="Emphasized" enabled="true" />
</mvc:View>
```

**JSXView**

```tsx
import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import Button from "sap/m/Button";
import { ButtonType } from "sap/m/library";

export default class SaveButton extends View {
    createContent(): Control {
        return <Button text="Save" type={ButtonType.Emphasized} enabled={true} />;
    }
}
```

`type` is checked against the `ButtonType` enum at author-time.
Typo `Empahsized` fails at `tsc`, not deep inside `applySettings`.

### 2. Aggregation

**XMLView**

```xml
<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">
    <VBox class="sapUiSmallMargin">
        <Title text="Details" level="H3" />
        <Text text="Some body copy." />
    </VBox>
</mvc:View>
```

**JSXView**

```tsx
return (
    <VBox class="sapUiSmallMargin">
        <Title text="Details" level="H3" />
        <Text text="Some body copy." />
    </VBox>
);
```

The JSX children land in `VBox.items` (the default aggregation).
Named aggregations use props instead of nested XML tags, e.g.
`<Page footer={<OverflowToolbar>…</OverflowToolbar>}>`.

### 3. Event handler

**XMLView.** The handler must live on the controller:

```xml
<Button text="Save" press="onSave" />
```

```ts
export default class MyController extends Controller {
    onSave(event: Event): void {
        // …
    }
}
```

**JSXView.** Either the same dot-notation form (resolved against
the surrounding view's controller), or a plain function
reference:

```tsx
// A) dot-notation: same shape XMLView uses
<Button text="Save" press=".onSave" />

// B) function reference: no controller required
<Button text="Save" press={(event) => { /* … */ }} />

// C) method reference: this-binding handled by the runtime
<Button text="Save" press={this.onSave} />
```

See [Events →](#/learn/events) for the full resolution order
and the `[fn, listener]` shape UI5 uses under the hood.

## When to pick which

- **Legacy alignment**: a codebase full of `.view.xml` files.
  Keep new views XML unless the migration is a stated goal.
- **Type safety & IDE support**: JSX wins outright. Every prop
  is a TypeScript expression, so refactors are safe and Go-to-Definition
  works.
- **Inline expressions**: JSX. XMLView expects you to route logic
  through the controller.
- **Design-time tooling (SAP Business Application Studio, Fiori
  tools)**: XML, because the tooling knows the XSD.
- **Runtime cost**: XML pays a one-off parse; JSX pays a single
  transpile step at build time. The runtime constructor calls are
  identical.

## Interop

They coexist on the same page. Two flavours:

1. **XMLView inside a JSX view**: reach for it when you're
   embedding an existing on-disk `.view.xml` file:
   ```tsx
   const xml = await XMLView.create({
       viewName: "my.app.view.LegacyPanel"
   });
   this.addDependent(xml);
   ```
2. **JSX view inside an XMLView**: declare a target that
   resolves to your `.tsx` file:
   ```xml
   <mvc:View viewName="module:my/app/view/HelloJSX" />
   ```

Both flavours are demoed live in
[Chapter 14 · Six ways to embed reusable UIs](#/explore/embed-six).

## See also

- [Your first TSX view](#/learn/first-view)
- [Auto id prefix](#/learn/auto-prefix)
- [Controls & JSX elements](#/learn/controls)
- [Props & TypeScript](#/learn/props-typing)
- [Events](#/learn/events)
