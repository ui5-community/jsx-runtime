JSX-native loop and conditional that don't bypass UI5's binding
system; they compile **into** it. `<For>` becomes a bound
aggregation with a row template; bound `<If>` binds each child's
`visible` property directly.

**Three equivalent spellings of `<For>`.** All three Lists below
render the same rows from the same `/items` model path and stay
in lockstep on add/remove:

- **Explicit.** `<For each={binding}>{() => <Row/>}</For>`.
- **Implicit.** `<List items={binding}><Row/></List>`; the JSX
  child slots in as the aggregation's `template`.
- **Raw.** Pass the `template` inside the binding info object.
  This is what the two spellings above desugar to before UI5
  sees them.

**`<If>` two modes:**

- **Literal** (`condition={true}` / `{false}`): children are
  inlined or dropped at construction. No wrapper control.
- **Bound** (`condition={{ path: "/flag" }}`): the runtime
  calls `bindProperty("visible", …)` on each child directly.
  No wrapper, no `sap.m` dependency.

Concept reference: [Structural directives](#/learn/directives)
and [Aggregations](#/learn/aggregations#bound-aggregations).

See also: [switch-plugin](#/explore/switch-plugin) — a `<Switch>`
directive added by a plugin (same shape, opt-in via `withScope`);
[binding-string](#/explore/binding-string) — the binding syntax
`<For>` and bound `<If>` compile into.
