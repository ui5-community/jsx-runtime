Side-by-side comparison of the six patterns for composing
reusable UI, ordered from lightest to heaviest. **Reach for the
lightest one that works.**

1. **JSX fragment `<>…</>`**: grouping siblings, no wrapper.
2. **Plain helper function** returning a control tree, for local
   composition. Call it with `{helper(...)}`, never `<Helper/>`.
3. **UI5 fragment factory (`*.fragment.tsx`)**: a
   controller-callable dialog. Mounts via
   `view.addDependent(factory())`.
4. **Nested TSX `<View/>`**: a full sub-view with its own
   lifecycle, id namespace, and (optional) controller.
5. **Embedded `XMLView` via `definition`**: an XML string built
   at runtime; useful for `sap.ui.fl` output or generated XML.
6. **Embedded `XMLView` by name**: a `.view.xml` file on disk,
   loaded via `XMLView.create({ viewName })`.

Every step up the ladder buys reusability at the cost of
ceremony. Most reusable pieces are fine as helper functions;
reach for the heavier options only when you actually need what
they add.

Concept reference: [Nested views & embedding](#/learn/nested-views).

See also: [fragments](#/explore/fragments) — the lightest option
(pattern #1); [fragment-fn](#/explore/fragment-fn) — helper function
(pattern #2); [fragment-dialog](#/explore/fragment-dialog) — factory
file (pattern #3).
