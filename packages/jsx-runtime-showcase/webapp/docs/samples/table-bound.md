A `sap.m.Table` is a bound-aggregation control just like `List`
from the structural sample, but its rows are `ColumnListItem`s
whose cells map 1:1 to `<Column>`s declared as siblings. The JSX
shape:

```tsx
<Table
    items={{ path: "/rows" }}
    columns={[
        <Column><Label text="ID"    /></Column>,
        <Column><Label text="Name"  /></Column>,
        <Column><Label text="State" /></Column>
    ]}
>
    <ColumnListItem
        cells={[
            <Text text="{id}"   />,
            <Text text="{name}" />,
            <ObjectStatus text="{state}" state="{state}" />
        ]}
    />
</Table>
```

- `columns={[…]}` is the header row. Order matters.
- `items={{ path: … }}` binds the row aggregation.
- The JSX child of `<Table>` is the row **template**; its
  `<cells>` slot receives one JSX child per column.
- Any UI5 property binding syntax works inside cells. Note the
  `state="{state}"` binding feeds `sap.ui.core.ValueState`, so the
  model must carry one of its enum values (`Information`, `Success`,
  `Warning`, `Error`, `None`) — a friendly alias like `"info"` throws
  at construction when UI5 validates the enum.

Not covered here (see [deferred-samples.md](../../../../../../docs/deferred-samples.md)):
OData, `growing`/`updateFinished`, `sap.ui.table.Table`,
`sap.ui.mdc.Table`, cell personalization, export.

Concept reference: [Aggregations](#/learn/aggregations#bound-aggregations)
and [Data binding](#/learn/data-binding).

See also: [structural](#/explore/structural) — the same
bound-aggregation mechanism on `List` with all three `<For>`
spellings; [binding-string](#/explore/binding-string) — the
underlying binding syntax.
