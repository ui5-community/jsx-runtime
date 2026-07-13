A regular function that returns a JSX fragment. Composed at the
value level: call it with `{field(...)}`, never with `<field/>`.

```tsx
function field(label: string, value: string): Control {
    return (
        <>
            <Label text={label} design="Bold" />
            <Text text={value} />
        </>
    );
}
```

The surrounding `jsx()` call's `flattenChildren` recognises the
returned `FragmentNode` and inlines the two children directly
into the parent aggregation, with no wrapper control and no per-row
constructor.

**Why not `<field/>`?** React lets you write `<Field/>` against
a plain function. This runtime explicitly does not: `<X/>` is
always `new X(settings)`. To compose from a function, invoke it
as a value expression.

Concept reference: [Fragments](/#/learn/fragments).

See also: [fragments](/#/explore/fragments) — the raw `<>…</>` form
without a helper wrapper; [embed-six](/#/explore/embed-six) — the
helper-function pattern in context with five other embedding options.
