# Property type coercion

The runtime reads UI5 metadata for every literal prop and either
coerces the value to the declared type, or throws a JSX-site
`TypeError` when it can't. Both happen **before** UI5's
`applySettings` runs.

## String → declared type

```tsx
<Input maxLength="10" />      // → 10 (int)
<Button enabled="false" />     // → false (boolean)
<Button type="Emphasized" />   // → sap.m.ButtonType.Emphasized (enum)
```

The runtime looks up each property in metadata, resolves its
`DataType`, and calls `parseValue(...)`.

## Uncoercible → JSX-site TypeError

```tsx
<Button type="Empahsized" />   // typo — not a ButtonType member
```

throws:

```
sap.m.Button.type: expected sap.m.ButtonType, got string ("Empahsized")
```

Short message, points at the prop. Without this you'd get a
deep-stack error from inside `applySettings` that doesn't mention
which prop was wrong.

## Two lines of defence

1. **TypeScript** ([`$XSettings` typing](#/learn/props-typing))
   catches typos at compile time.
2. **This intrinsic** catches values that slip past the type
   checker: JSON config, spread props, `as never` escape
   hatches.

## What the intrinsic skips

- **Binding info objects** (anything with `.path`). UI5 handles
  them in `applySettings`; coercing now would corrupt them.
- **Binding strings**: `"{path}"`, `"{= 1 + 2 }"`,
  `"Total: {= ${count} } EUR"`. Same reason.
- **Functions** (event handlers). See [Events](#/learn/events).
- **Props declared `type: "any"`**: explicit metadata opt-out.

## Escaping a literal `{`

Same convention UI5's settings parser follows, `\{`:

```tsx
<Text text="Price: \{net\}" />
```

The parser treats the escaped brace as literal; the value
reaches coercion, not the binding path.

Uncomment a case in [type-coercion](#/explore/type-coercion)
to see the error message live.
