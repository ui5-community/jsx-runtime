Demonstrates `sap.m.Menu` rendered via JSX — both as a standalone
button menu and as a `List`'s `contextMenu` — **without** an explicit
`id` on the `Menu`.

## Why no explicit id?

`sap.m.Menu` declares its default `items` aggregation as **forwarded**:
the real backing store is an internal `MenuWrapper` control that
`Menu.prototype.init()` creates and registers under the id
`<Menu-id>-menuWrapper`. When `Menu` items ride along in the single-shot
`new Menu({ items })` constructor call, UI5's `applySettings` tries to
resolve the wrapper by id *before* it is registered — crashing with:

```
TypeError: Cannot read properties of undefined (reading 'addItem')
```

The reporter's workaround (giving the `Menu` an explicit `id`) happened
to make the wrapper's auto-generated id stable enough that the lookup
succeeded. The proper fix is to defer the items to a post-construction
`addAggregation` call, matching how `XMLView` populates forwarded
aggregations.

## What the fix does

The runtime detects a forwarded default aggregation via
`metadata.getAggregation(name)?.forwarding` and, when the aggregation is
forwarded, skips the `settings` route and uses a post-construction loop:

```tsx
// After construction, the MenuWrapper is already registered
menu.addAggregation("items", child);
```

Normal (non-forwarded) aggregations are not affected.

## Two patterns in this sample

```tsx
// Pattern 1 — standalone Menu (forwarded default-aggregation children)
const menu = (
    <Menu title="Actions">
        <MenuItem text="Refresh" icon="sap-icon://refresh" />
        <MenuItem text="Download" icon="sap-icon://download" />
    </Menu>
) as Menu;
// ...later
menu.openBy(button);

// Pattern 2 — List contextMenu (aggregation prop, items also forwarded)
<List
    contextMenu={
        <Menu>
            <MenuItem text="Edit" icon="sap-icon://edit" />
            <MenuItem text="Delete" icon="sap-icon://delete" />
        </Menu>
    }
    items={{ path: "/fruits" }}
>
    <StandardListItem title="{name}" />
</List>
```

Neither `Menu` carries an explicit `id`.

See also: [aggregations](#/learn/aggregations) — how the runtime
maps JSX children to UI5 aggregations.
