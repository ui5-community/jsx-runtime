When the binding needs more than a `path`, pass a **binding
info object** instead of a string:

```tsx
value={{
    path: "form>/count",
    type: new Integer({}, { minimum: 0, maximum: 999 }),
    formatOptions: { groupingEnabled: false }
}}
```

The `type` field attaches a UI5 `SimpleType` that handles the
string ↔ model-value conversion:

- User types "42" → `Integer.parseValue` → the model gets the
  number `42`.
- User types "abc" or a value out of range → the type throws →
  the `<Input>`'s `valueState` flips to `Error` automatically.

The read-only `<Text>` on the same path uses the default
`Integer` formatter, so what you see is the raw `number` in the
model, not the user's string.

Concept reference: [Data binding](#/learn/data-binding).

See also: [binding-string](#/explore/binding-string) — the simpler
string form when a `path` is all you need;
[prop-typing](#/explore/prop-typing) — background for the `as never`
cast at the JSX site.
