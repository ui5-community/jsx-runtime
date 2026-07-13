# Props & TypeScript typing

Every JSX prop is checked against the target control's
`$XSettings` interface from `@openui5/types`, the same interface
you'd use for `new Button({...})`. Typos are compile errors.

```tsx
<Button textt="hi" />  // TS2769: does not match $ButtonSettings
<Button icon={42} />    // TS2322: icon is URI, not number
```

## How it works

The runtime's JSX namespace declares:

```ts
type LibraryManagedAttributes<C, _P> =
    SettingsOf<C> & { class?, children?, id?, key?, ref? };
```

`SettingsOf<C>` extracts the settings interface from the
constructor via `ConstructorParameters` inference. No codegen;
UI5 already ships the types, we just consume them.

## Extra props on every element

Five props that `$XSettings` doesn't declare, layered on by the
runtime:

- `class`: routes through `addStyleClass`. See
  [Controls](/#/learn/controls).
- `children`: JSX-mandated. Processed as
  [aggregations](/#/learn/aggregations).
- `id`: UI5's constructor id.
- `key`: JSX-mandated. Stripped; not forwarded to UI5.
- `ref`: a callback receiving the constructed instance.
  Useful for imperative one-shot setup (`t => t.focus()`).

## Event props also accept dot-handler literals

Every event-shaped prop accepts a `".methodName"` string in
addition to a function. See [Events](/#/learn/events).

Uncomment a TS-ERROR line in
[prop-typing](/#/explore/prop-typing) to see the compiler in
action.
