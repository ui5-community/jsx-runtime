`<>...</>` groups siblings without adding a wrapper control.
The runtime's `flattenChildren` helper inlines fragment children
into the parent's aggregation; falsy entries (`null`, `undefined`,
`false`, `""`) are filtered so `{flag && <X/>}` works without
crashing UI5's aggregation validation.

Fragments solve the JSX "single root" rule: a helper function
that wants to return multiple sibling controls no longer needs a
wrapper VBox/HBox/FlexBox to satisfy the type checker.

Note the **two senses** of "fragment" in UI5:

- **JSX fragment** (this sample): `<>...</>`. A syntactic device.
- **UI5 fragment** (`fragment-dialog` sample): a reusable chunk
  of UI without its own controller.

The two share a name and nothing else.

Concept reference: [Fragments](/#/learn/fragments).

See also: [fragment-fn](/#/explore/fragment-fn) — same JSX-fragment
sense, wrapped in a helper function; [fragment-dialog](/#/explore/fragment-dialog)
— the **other** sense of "fragment" (a reusable UI chunk with no
controller); [embed-six](/#/explore/embed-six) — all six embedding
patterns side by side.
