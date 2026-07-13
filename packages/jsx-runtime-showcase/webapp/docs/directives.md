# Structural directives

Two directives ship with the runtime: `<For>` for loops, `<If>`
for conditionals. Both compile **into** UI5's binding system,
not around it.

## The For directive

`<For>` populates a bound aggregation with a repeated template.
It has three equivalent spellings and an `aggregation="…"`
override for non-default targets. Full story in
[Aggregations: `<For>`](/#/learn/aggregations#bound-aggregations).

## The If directive

Two modes, decided by the type of `condition`.

### Literal mode

```tsx
<If condition={true}>
    <Title text="Static block" />
    <Text text="Always visible." />
</If>
```

At construction time, children are inlined verbatim (`true`) or
dropped entirely (`false`). No wrapper control, no binding.
Self-documenting alternative to `{cond && <X/>}` when the
condition is a compile-time value.

### Bound mode

```tsx
<If condition={{ path: "/showDetails" }}>
    <Title text="Reactive block" />
    <Text text="Visibility bound to the flag." />
</If>
```

Runtime calls `bindProperty("visible", …)` on **each child
directly**. No wrapper control, just UI5's normal visible
binding on the inner controls. Library-agnostic; no `sap.m`
dependency.

If a child already binds or pins its own `visible`, `<If>` throws
at construction. Combining conditions silently is worse than
failing loud. Combine with an expression binding instead:

```tsx
<Text visible="{= ${/a} && ${/b} }" />
```

See both directives in [structural](/#/explore/structural).
