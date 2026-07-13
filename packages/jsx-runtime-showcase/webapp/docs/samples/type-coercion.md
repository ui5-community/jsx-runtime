The runtime reads UI5 metadata for every literal prop and either
**coerces** the value to the declared type, or throws a
**JSX-site error** when it can't. Both happen before UI5's
`applySettings` runs.

```tsx
<Input maxLength="10" />       // → 10 (int)
<Button enabled="false" />      // → false (boolean)
<Button type="Empahsized" />    // → TypeError: expected sap.m.ButtonType
```

Two lines of defence:

1. **TypeScript** (`$XSettings` typing) catches typos at compile
   time.
2. **The runtime intrinsic** catches values that slip past the
   type checker: JSON config, spread props, `as never` escape
   hatches.

Binding values (`{ path: … }`), binding strings (`"{= 1 + 2 }"`),
and functions are deliberately skipped; those have their own
paths through the runtime.

Concept reference: [Property type coercion](/#/learn/type-coercion).

See also: [prop-typing](/#/explore/prop-typing) — the compile-time
side of the same story (TypeScript catching prop errors at the JSX
site); [binding-object](/#/explore/binding-object) — where UI5's
type system handles conversion at runtime.
