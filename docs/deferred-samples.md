# Deferred samples

The showcase covers the JSX runtime's own API surface thoroughly: elements, aggregations, events, bindings, fragments (both senses), structural directives, plugin SPI, type coercion, embedding, i18n, and both a responsive (`sap.m.Table`) and a grid (`sap.ui.table.Table`) table. It does **not** yet demonstrate the following mainstream UI5 patterns. Their absence is deliberate — each one requires infrastructure (a mock backend, a manifest routing configuration, a control extension pattern) that would double the size of the showcase without teaching anything new about JSX-vs-XML.

This page exists so LLMs and human readers know **where the showcase currently stops** and don't infer these areas from the samples that are present. When you add one of these, remove it from this list, add a companion `.md` and a registry entry, and update this page.

## Routing (deep-link and back-nav)

The shell app uses `sap.m.routing.Router` (see [manifest.json](../packages/jsx-runtime-showcase/webapp/manifest.json) and [Explorer.controller.ts](../packages/jsx-runtime-showcase/webapp/controller/Explorer.controller.ts)), but no **sample** exercises `attachRouteMatched`, `navTo` with arguments, or `getRouteMatchedFor` from user code. Nothing about routing changes under JSX — the same `Router` API works identically — but a sample that shows a two-view flow (list → detail, with URL arguments) would close the gap.

## OData v2 / v4

The samples use `JSONModel` exclusively. A `sap.ui.model.odata.v4.ODataModel` (or v2) sample would need either a running mock backend or a service definition file; neither exists in the showcase. Binding syntax is unchanged (`items="{/Products}"` works either way), but list rendering, `$expand`, `$filter`, and CUD via `.create/.update/.remove` are worth demonstrating.

## `sap.ui.mdc.Table`

The `table-bound` sample covers `sap.m.Table` (responsive, list-oriented) and `table-grid` covers `sap.ui.table.Table` (grid, virtual scrolling). The metadata-driven `sap.ui.mdc.Table` (personalization, export, `p13n`) has a distinct binding shape and lifecycle that deserves its own sample and a supporting delegate.

## Forms — `sap.ui.layout.form.SimpleForm`, `Form`, smart forms

No sample uses `SimpleForm` or the layout package. Forms in JSX behave exactly like forms in XML — every property and aggregation is available — but a canonical labelled-fields sample would answer the "how do I lay out a form?" question directly.

## Custom control authoring in TSX

No sample walks through `Control.extend(...)` from a `.tsx` file. The two custom controls in the showcase ([CodeBlock.tsx](../packages/jsx-runtime-showcase/webapp/control/CodeBlock.tsx), [Mermaid.tsx](../packages/jsx-runtime-showcase/webapp/control/Mermaid.tsx)) exist but are showcase plumbing, not teaching examples. A `Rating.tsx` or similar simple control extending `Control` with metadata, a renderer, and a couple of properties would be canonical.

## Aggregation lifecycle events

`updateFinished`, `growing`, `selectionChange`, `beforeRebindTable` — none are exercised in a sample. The wiring is the same as in XML views (dot-handler string or function reference), but a "loading spinner while items are refreshing" sample would surface the async ergonomics of JSX views.

## Two-way binding modes and formatters

`data-binding.md` mentions formatters but no sample uses one. `sap.ui.model.BindingMode.OneTime` and explicit two-way flags are similarly absent. The bindings syntax is unchanged from XML, but a sample that combines them would be useful.

## `sap.f.DynamicPage`, `sap.f.ShellBar`, `sap.f.Card`

No `sap.f`-family sample. The shell app uses `sap.tnt.ToolPage` for its own chrome, but a sample that composes a `DynamicPage` with header/content/footer would demonstrate the more common enterprise app skeleton.

## Testing patterns for TSX views

OPA5 tests exist under [webapp/test/integration/](../packages/jsx-runtime-showcase/webapp/test/integration/) and drive shell navigation, but there is no sample-scoped "how to test a TSX view" walkthrough. QUnit-testing a TSX view differs from an XML view only in how the view is instantiated (`View.create({ viewName })` works identically); a documented example would prevent the question from coming up.

---

## What TO do until these land

For all of the above: **use your existing UI5 patterns** — the JSX runtime does not interact with the router, model layer, control extension mechanism, or test frameworks. Migrate views to JSX one at a time following [MIGRATION.md](MIGRATION.md), and keep the rest of your app unchanged.
