# Routing to TSX views

The UI5 router works exactly as it does with XML views — one thing differs: TSX
views are referenced by a **`module:` prefix + slash path**, not a dotted
`viewName` + `type: "XML"`.

## rootView

```jsonc
// manifest.json  →  sap.ui5
"rootView": {
    "viewName": "module:my/app/view/App",
    "id": "app",
    "async": true
}
```

Drop `"type": "XML"`. The `module:` prefix tells UI5 to load the view as a
programmatic module rather than by dotted XML-namespace.

## Routes and targets

```jsonc
// manifest.json  →  sap.ui5.routing
"config": {
    "routerClass": "sap.m.routing.Router",
    "controlId": "app",
    "controlAggregation": "pages",
    "async": true
},
"routes": [
    { "pattern": "",        "name": "home",    "target": "home" },
    { "pattern": "detail",  "name": "detail",  "target": "detail" }
],
"targets": {
    "home": {
        "id": "home",
        "name": "module:my/app/view/Home",
        "type": "View"
    },
    "detail": {
        "id": "detail",
        "name": "module:my/app/view/Detail",
        "type": "View"
    }
}
```

Two patterns for `"type": "View"`:

- **Per-target** (shown above) — set it on every target individually, as the
  showcase does.
- **Once in `config`** — add `"type": "View"` to the `config` block and omit it
  from every target. The hello-world app uses this shorter form.

Both are equivalent; choose whichever your team prefers.

## `getAutoPrefixId`

Every TSX view used as a route target must return `true` from `getAutoPrefixId`:

```ts
getAutoPrefixId(): boolean {
    return true;
}
```

Without it the route's `controlId` (here `"app"`) cannot find the container
control, because UI5 looks up `<view-id>--<controlId>` when `getAutoPrefixId` is
true, but falls back to the raw id when it is not. XMLView does this automatically;
the JSX runtime requires the explicit override. See
[Auto id prefix →](#/learn/auto-prefix) for the full explanation.

## The `Router` API is unchanged

`this.getOwnerComponent().getRouter().navTo("detail")`, `attachRouteMatched`,
`getRoute`, hash navigation — everything works identically. The `module:` naming
is only a manifest concern; at runtime the view is a standard
`sap.ui.core.mvc.View` instance.

## OPA5 note

When writing integration tests, OPA view-name matchers must use the module path,
not the dotted namespace:

```ts
// ✓ correct
Opa5.waitFor({ viewName: "module:my/app/view/Home", ... });

// ✗ wrong — resolves to undefined for a `module:`-loaded view
Opa5.waitFor({ viewName: "my.app.view.Home", ... });
```

This is because `View#getViewName()` returns whatever was passed to `View.create`
— for `module:`-loaded views that is the slash path with the prefix, not the
dotted namespace.

---

Next: [Nested views & embedding →](#/learn/nested-views) · [Auto id prefix →](#/learn/auto-prefix)
