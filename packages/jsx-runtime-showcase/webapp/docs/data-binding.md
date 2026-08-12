# Data binding

UI5's binding system is the reactivity layer. JSX consumes it,
same syntax you'd write in an XML view, no new API.

## String form

```tsx
this.setModel(new JSONModel({ name: "" }), "form");

<Input value="{form>/name}" />
<Text  text="{form>/name}" />
```

Type into the `<Input>`, the `<Text>` updates. No `liveChange`
handler, no manual `setText`. Named model scope (`form>`) keeps
this view's model isolated from any default model a parent view
might attach.

## Object form

When you need more than a path (a type converter, formatter,
mode override), pass a binding info object:

```tsx
import Integer from "sap/ui/model/type/Integer";

<Input value={{
    path: "form>/count",
    type: new Integer({}, { minimum: 0, maximum: 999 }),
    formatOptions: { groupingEnabled: false }
}} />
```

The `type` field runs UI5's string ↔ model-value conversion:

- User types "42" → `Integer.parseValue` → model gets number `42`.
- User types "abc" → `parseValue` throws → `valueState` flips
  to `Error` automatically.
- Value out of range → `validateValue` throws → same visual.

Common types: `sap/ui/model/type/Integer`,
`sap/ui/model/type/Float`, `sap/ui/model/type/Date`,
`sap/ui/model/odata/type/DateTime`.

## Expression bindings

Work verbatim. The runtime doesn't touch them:

```tsx
<Text    text="{= ${form>/count} > 0 ? 'has value' : 'empty' }" />
<Button  visible="{= !!${form>/isAdmin} }" />
```

## When TypeScript rejects the binding

Some `$XSettings` props declare a concrete type (`enabled?: boolean`)
that doesn't accept a binding object. Runtime accepts it,
TypeScript doesn't. Cast:

```tsx
<Button enabled={{ path: "/flag" } as never} />
```

Same escape hatch you'd use in imperative
`new Button({ enabled: {…} })`.

See it in [binding-string](#/explore/binding-string) and
[binding-object](#/explore/binding-object), plus the
[no-bindings](#/explore/no-bindings) foil for what disappears.
