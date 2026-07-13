`sap.ui.table.Table` (the grid table) is the sibling of the
[table-bound](/#/explore/table-bound) `sap.m.Table` sample — same
job, different control, different aggregation shape.

`sap.m.Table` pairs `<Column>` headers with one `<ColumnListItem>`
row template whose `<cells>` map 1:1 to the columns.
`sap.ui.table.Table` inverts that: each `<Column>` owns **both** its
header (`label=`) **and** its per-row cell (`template=`). There is no
separate row-item control.

```tsx
<Table
    rows={{ path: "/rows" }}
    selectionMode="None"
    visibleRowCount={5}
    columns={[
        <Column label={<Label text="ID"   />} template={<Text text="{id}"   />} width="4rem" />,
        <Column label={<Label text="Name" />} template={<Text text="{name}" />} />,
        <Column label={<Label text="State"/>} template={<ObjectStatus text="{state}" state="{state}" />} />
    ]}
/>
```

- `rows={{ path: … }}` binds the row aggregation — note it's `rows`,
  not `items`.
- Each `<Column>` carries `label=` (the header control) and
  `template=` (the per-row cell). `template` is a **named**
  aggregation on `sap.ui.table.Column`, so it's passed as a prop; a
  bare JSX child wouldn't land anywhere (the control has no default
  aggregation to receive it).
- `state="{state}"` binds `sap.ui.core.ValueState`, so the model must
  carry an enum value (`Information`, `Success`, `Warning`, `Error`,
  `None`) — not a friendly alias.

When to reach for this over `sap.m.Table`: the grid table renders a
fixed viewport of rows with virtual scrolling, column resizing, and
freezing — dense, spreadsheet-like data. `sap.m.Table` is
list-oriented and responsive. The JSX runtime treats them
identically; only the control's aggregation contract differs.

Not covered here (see [deferred-samples.md](../../../../../../docs/deferred-samples.md)):
OData, selection handling, sorting/filtering menus, column freezing,
`sap.ui.mdc.Table`.

Concept reference: [Aggregations](/#/learn/aggregations#bound-aggregations)
and [Data binding](/#/learn/data-binding).

See also: [table-bound](/#/explore/table-bound) — the same data on
`sap.m.Table`; [structural](/#/explore/structural) — the same
bound-aggregation mechanism on `List`.
