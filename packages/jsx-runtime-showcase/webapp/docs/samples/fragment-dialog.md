The **other** sense of "fragment" in UI5: a reusable chunk of UI
without its own controller. The TSX equivalent of
`*.fragment.xml`. Ships as a factory function that returns a
control tree; the calling view mounts it via
`view.addDependent(factory())` and opens it.

How the close event resolves back here:

1. Import the factory: `import FragmentDialog from "./FragmentDialog.fragment"`.
2. Call it lazily on the first click.
3. `view.addDependent(dialog)` splices the Dialog into this
   view's dependents aggregation. The parent chain now leads
   back to this view.
4. When the Close button fires, the runtime's dot-handler walk
   finds this view, asks it for a controller, and invokes
   `.onCloseDialog` on it.

Because this view overrides `getController(): this`, the handler
dispatches to a method on the view class itself.

**Same fragment, different views:** a different view can import
the same factory and mount its own copy. The handler routing
changes automatically: `.onCloseDialog` resolves against
whichever view mounted the fragment, not against a captured
original.

Concept reference: [Fragments](/#/learn/fragments).

See also: [fragments](/#/explore/fragments) — the JSX-fragment sense,
which does **not** interoperate with `*.fragment.tsx` factories;
[events-dot](/#/explore/events-dot) — the parent-chain handler walk
that resolves `.onCloseDialog` back to the mounting view;
[embed-six](/#/explore/embed-six) — pattern #3 in the six embedding
options.
