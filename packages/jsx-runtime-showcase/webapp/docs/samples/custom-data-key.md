# CustomData & the reserved `key` prop

`sap.ui.core.CustomData` lets you attach arbitrary key/value pairs to any UI5 control.
When `writeToDom` is `true`, UI5 renders those pairs directly as `data-<key>` HTML
attributes — useful for CSS selectors, automated tests, and accessibility tooling.

The natural JSX for this looks exactly right:

```tsx
<Button text="Inspect me">
  <customData>
    <CustomData key="product-id" value="4711" writeToDom={true} />
  </customData>
</Button>
```

Or, using the aggregation-as-prop shorthand:

```tsx
<Button
  text="Inspect me"
  customData={<CustomData key="product-id" value="4711" writeToDom={true} />}
/>
```

## Why `key` was silently dropped before the fix

Babel's *automatic* JSX transform (enabled with `importSource`) **always** extracts the
`key` attribute from an element and passes it as the third argument to the runtime's
`jsx()` function — it is **never** present inside the `props` object:

```ts
// what Babel emits for <CustomData key="product-id" value="4711" />
jsx(CustomData, { value: "4711" }, "product-id");
//                                  ^^^^^^^^^^^^ third arg, NOT in props
```

React uses this third argument for reconciliation ("which list item am I?"). It has
nothing to do with UI5 properties. So the naive JSX runtime just ignored it — and
`CustomData.setKey()` was never called, leaving the key empty and producing no DOM
attribute.

This was [GitHub issue #3](https://github.com/ui5-community/jsx-runtime/issues/3).

## The fix (PR #4)

The runtime now inspects the control's UI5 metadata after processing the normal `props`:

```ts
if (_key !== undefined && metadata.hasProperty("key")) {
    propEntries.push(["key", _key]);
}
```

This re-injects the Babel-extracted `key` argument into the settings object, but *only*
for controls that actually declare a `key` property in their metadata.
`sap.ui.core.CustomData` is the canonical example; `sap.m.Button` (which has no `key`
property) is completely unaffected — the extra third argument is still silently ignored
for it.

## Live sample

The sample in this page attaches `<CustomData key="product-id" value="4711"
writeToDom={true} />` to a button using the aggregation-as-prop syntax. After the button
renders, `onAfterRendering()` reads `dom.getAttribute("data-product-id")` and displays
the value — proving the key reached the control and the DOM attribute was written.

Concept reference: [runtime anatomy](#/learn/runtime-anatomy).

See also: [prop-typing](#/explore/prop-typing) — per-control TypeScript prop types that
catch wrong property names at compile time.
