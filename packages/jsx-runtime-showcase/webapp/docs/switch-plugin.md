# Case study: the &lt;Switch&gt; plugin

The runtime ships one reference plugin at
`ui5/community/jsx/runtime/plugins/switch`. A worked example
of the [SPI](/#/learn/plugin-spi) end to end.

## What it looks like

```tsx
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { Switch, Case, Default, switchProcessor }
    from "ui5/community/jsx/runtime/plugins/switch/index";

return withScope({ childrenProcessors: [switchProcessor] }, () => (
    <VBox>
        <Switch on={{ path: "/kind" }}>
            <Case when="info">    <Text text="ℹ️ Info"/> </Case>
            <Case when="warning"> <Text text="⚠️ Warning"/> </Case>
            <Case when="error">   <Text text="🛑 Error"/> </Case>
            <Default>             <Text text="(no match)"/> </Default>
        </Switch>
    </VBox>
));
```

Two modes fall out of the same code:

- **Literal.** `on="warning"` picks the matching `<Case>` at
  construction time. Non-matching branches never enter the tree.
- **Bound.** `on={{ path: "/kind" }}` emits every branch and
  binds each child's `visible` to a UI5 expression binding
  derived from the `<Case>`'s `when`.

## Four pieces

### 1. Sentinel tags

```ts
export const Switch = defineSentinel<{
    on: string | number | boolean | { path: string };
    children?: unknown;
}>("Switch");
```

`defineSentinel<P>(name)` returns a JSX-compatible symbol. The
type parameter `P` locks the prop shape so `<Case whenn="info"/>`
is a compile error. At runtime `<Switch>` produces a sentinel
node. The runtime doesn't know what to do with it; the plugin's
processor does. See [Plugin SPI: Sentinels](/#/learn/plugin-spi#sentinels).

### 2. `matches`

```ts
matches(node): boolean {
    return isSentinelNode(node) && node.tag === Switch;
}
```

Called for every child by the phase-3 pipeline. First processor
whose `matches` returns `true` claims the node.

### 3. `process`

```ts
process(node, settings, defaultAggregation, emit) {
    const on = node.props.on;
    if (isBindingLike(on)) {
        // Bound: emit every branch, bind visible on each child
        for (const branch of node.props.children) {
            const cond = buildExpressionBinding(on, branch.props.when);
            branch.children.forEach(child => {
                child.bindProperty("visible", cond);
                emit(child);
            });
        }
    } else {
        // Literal: emit only the matching branch's children
        const match = findMatchingCase(node.props.children, on);
        match?.forEach(child => emit(child));
    }
}
```

Emitted children flow back into the outer pipeline;
`flattenChildren` cleans them up, then the parent's aggregation
receives them.

### 4. Opt-in

`withScope({ childrenProcessors: [switchProcessor] }, () => …)`
merges the plugin into the active scope for the duration of the
callback. Without it, `<Switch>` throws a clear
"unknown sentinel" error at construction, not a silent no-op.

## The split, one more time

- **Sentinels**: the vocabulary an author writes.
- **Processor**: the semantics when the runtime meets the
  vocabulary.
- **`withScope`**: the opt-in so consumers only pay for what
  they use.

That split is what makes plugins **library-agnostic**.
`switchProcessor` doesn't import from `sap.m`; it just binds
`visible` on whichever child the author supplied.

## Your own plugin, in four steps

1. Define your sentinel(s) with `defineSentinel<Props>(name)`.
2. Author a `ChildrenProcessor` with `matches` + `process`.
3. Export both from your module.
4. Consumers wrap the JSX in
   `withScope({ childrenProcessors: [yourProcessor] }, () => …)`.

To target a **non-default aggregation** from your processor,
mutate the `settings` object directly instead of `emit(child)`.
That's how `<For aggregation="columns">` works.

See it running in [switch-plugin](/#/explore/switch-plugin).
