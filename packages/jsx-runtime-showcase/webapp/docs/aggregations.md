# Aggregations, children & associations

UI5's `ManagedObject` has two ways to relate to other controls:
**aggregations** (ownership: parent constructs and destroys the
child) and **associations** (reference: parent just remembers
an id). JSX maps both directly.

## Default aggregation

Every UI5 control declares one aggregation as its **default**.
JSX children slot into that one:

| Container | Default aggregation |
|---|---|
| `sap.m.VBox`, `sap.m.HBox` | `items` |
| `sap.m.Panel`, `sap.m.Page` | `content` |
| `sap.m.List`, `sap.m.Table` | `items` |

```tsx
<Panel headerText="Users">
    <Button text="Add" />
    <List>
        <StandardListItem title="Ada" />
    </List>
</Panel>
```

The `<Panel>` gets `content: [button, list]`; the `<List>` gets
`items: [item]`. Metadata drives the target; nothing tells JSX
which slot to use.

Falsy children (`null`, `undefined`, `false`, `""`) are
silently dropped. So `{flag && <X/>}` doesn't crash when `flag`
is false.

## Named aggregations

Pass a JSX subtree as a prop, targeting that aggregation by name:

```tsx
<Table columns={[<Column/>, <Column/>]}>
    <ColumnListItem>
        <Text text="{name}"/>
    </ColumnListItem>
</Table>
```

`columns={…}` fills the `columns` aggregation. The JSX child
still fills the default `items`. Some controls take a single
child on a named slot (`sap.f.Card`'s `header`); some take an
array. `$XSettings` typing catches the difference at compile time.

## Bound aggregations

For repeated content driven by a binding, `<For>`:

```tsx
<List>
    <For each={{ path: "/items" }}>{() =>
        <StandardListItem title="{label}" description="ID: {id}" />
    }</For>
</List>
```

The render prop's return value becomes the row template UI5
clones per row. Three equivalent spellings all produce the same
`new List({ items: { path, template } })` shape:

**Explicit.** `<For>` wraps the render prop:

```tsx
<List>
    <For each={{ path: "/items" }}>{() =>
        <StandardListItem title="{label}" />
    }</For>
</List>
```

**Implicit.** Parent's bound aggregation plus child as template:

```tsx
<List items={{ path: "/items" }}>
    <StandardListItem title="{label}" />
</List>
```

**Raw.** Binding info carries the `template` itself:

```tsx
<List
    items={{
        path: "/items",
        template: <StandardListItem title="{label}" />
    }}
/>
```

Reach for `<For>` when the loop intent should be visible; the
implicit form when the binding is already there; raw when the
binding is built programmatically.

## Non-default target

To loop into a **different** aggregation than the default:

```tsx
<Table>
    <For each={{ path: "/columns" }} aggregation="columns">
        {() => <Column><Text text="{label}"/></Column>}
    </For>
    <For each={{ path: "/rows" }}>
        {() => <ColumnListItem>...</ColumnListItem>}
    </For>
</Table>
```

First `<For>` populates `columns`; second fills the default
`items`.

## Associations

The other side of ManagedObject's relational surface. An
association is a **reference**: the parent remembers an id;
someone else owns the control.

```tsx
<Input id="name" />
<Label labelFor="name" text="Name" />

<Input ariaLabelledBy={["nameLabel", "hint"]} />
```

Pass an id string (single-cardinality) or an array of ids
(multi). No lifecycle transfer: `destroy()` on the referenced
control doesn't affect the referrer, it just leaves a dangling
id.

See it running in [structural](#/explore/structural) (the three
`<For>` spellings side-by-side) and
[hello-jsx](#/explore/hello-jsx) (default aggregation).
