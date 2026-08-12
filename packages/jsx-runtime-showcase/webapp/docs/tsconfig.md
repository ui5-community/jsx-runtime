# tsconfig

Add these to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "ui5/community/jsx/runtime",
    "types": [
      "@openui5/types",
      "@ui5-community/jsx-runtime"
    ]
  }
}
```

- `"jsx": "react-jsx"`: automatic-runtime JSX transform.
  Matches Babel's `runtime: "automatic"` from [Setup](#/learn/setup).
- `"jsxImportSource"`: same string as Babel's `importSource`.
  Type checker and runtime have to agree.
- `"types"`: pulls in the `$XSettings` interfaces
  (`@openui5/types`) and the JSX namespace augmentation
  (`@ui5-community/jsx-runtime`) that makes `children`, `class`,
  `id`, `key`, and `ref` legal on every UI5 control.

That's it. No `paths` shim. To see it fail on a typo, write
`<Button textt="hi"/>`. TS flags it against `$ButtonSettings`.
