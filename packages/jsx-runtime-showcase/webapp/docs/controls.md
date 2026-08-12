# Controls & JSX elements

Every JSX tag is a UI5 control class. `<Button/>` **is** the
`Button` you imported; the runtime translates it to
`new Button({...})`. That's the whole model.

```tsx
import Button from "sap/m/Button";
import Panel from "sap/m/Panel";

<Panel>
    <Button text="Press me" />
</Panel>
```

Rename the import, rename the tag. No per-tag registry, no
naming conventions.

## Elements are constructor calls, not function calls

A JSX element is a **constructor invocation**. This runtime
doesn't allow `<Field/>` against a plain function; it would try
to `new Field(...)` and fail. To compose from a function, call
it at the value level:

```tsx
{myHelper("Name", "Ada")}    // ✅ a value expression
<myHelper/>                   // ❌ new myHelper(...)
```

To group siblings without adding a wrapper control, use JSX
[fragments](#/learn/fragments) (`<>…</>`).

## `getAutoPrefixId()`

Override to `true` on every view. Each inner control's `id`
gets prefixed with the view's own. `<Input id="name"/>` inside
view `myView` becomes `myView--name` at runtime. Mount the same
view more than once and ids stay unique.

## `class="…"`

Standard JSX styling prop. UI5 controls don't declare `class` on
their `$XSettings`, but the runtime intercepts it and routes it
through `addStyleClass(...)` after construction:

```tsx
<VBox class="sapUiSmallMargin sapMPageBgSolid">
```

behaves the same as
`.addStyleClass("sapUiSmallMargin").addStyleClass("sapMPageBgSolid")`.

## Every other prop

Flows through to UI5's `applySettings`. Properties get validated
and coerced by the runtime's [type coercion](#/learn/type-coercion);
aggregations receive children (see
[Aggregations](#/learn/aggregations)); events get wired (see
[Events](#/learn/events)). See it running in
[hello-jsx](#/explore/hello-jsx).
