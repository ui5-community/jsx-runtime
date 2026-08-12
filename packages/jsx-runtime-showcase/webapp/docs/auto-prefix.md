# Auto id prefix

Every JSX view in this runtime gets automatic id-prefixing for the
child controls it constructs. XMLView has had the same behaviour
built-in since day one, but wired transparently for JSX.

## How you opt in

Override `getAutoPrefixId()` on your view and return `true`:

```tsx
import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import Button from "sap/m/Button";

export default class HelloJSX extends View {
    getAutoPrefixId(): boolean {
        return true;
    }

    createContent(): Control {
        return <Button id="helloBtn" text="Hello" />;
    }
}
```

The Button lands under `${view.getId()}--helloBtn`, so
`view.byId("helloBtn")` resolves the control regardless of how many
copies of this view are mounted. Without the prefix, two mounted
copies of the same view would collide on `"helloBtn"`.

## Why the flag exists at all

UI5 view classes name their child controls in a *view-scoped*
namespace. When a view is mounted inside another view (routing,
`View.create`, or as a nested `<View/>`), the same "raw" id would
otherwise clash. XMLView's parser wraps every declared id in
`view.createId(id)` automatically. `sap.ui.core.mvc.View`'s
`getAutoPrefixId()` is the public opt-in the parser reads.

## Why this runtime has to bridge it

The JSX runtime constructs controls via `new Control(settings)`
directly. No XML parser sits between your `.tsx` file and the
constructor call. Without a bridge, `id="helloBtn"` lands verbatim
on the control and the flag has no effect.

The bridge is a one-time patch on `sap.ui.core.mvc.View.prototype.createContent`
installed when you first import the runtime. It wraps every
subclass's own `createContent()` call in a scope that carries the
view; the runtime's `jsx()` reads that scope and applies
`view.createId(id)` to any plain-string `id` on a child control,
but only if the view opted in.

Effect: your JSX views work exactly like XMLViews do, without you
having to write a single `withScope` call.

## When to disable it

Keep it on by default. Turn it off only when:

- You're building a view whose ids must survive verbatim across
  mounts (rare, and usually indicates a data-binding job that would
  fit a model better).
- You're staging a partial JSX view inside an XMLView parent and
  need to see the raw ids the parser assigned.

If you disable it, `view.byId("helloBtn")` still works, because UI5's
`View#byId` handles both prefixed and unprefixed lookups. The
collision risk is yours to manage.

## Bypassing per-control

Passing an id that already starts with the view's own prefix
(`${view.getId()}--foo`) skips the rewrite, using the same guard `View.byId`
uses. If you need to compute an id yourself,
`this.createId("myThing")` inside the view is the canonical path.

## See also

- [Your first TSX view](#/learn/first-view): the section
  "About `getAutoPrefixId`" that points here from every sample.
- [JSX vs XMLView](#/learn/jsx-vs-xmlview): where the two view
  worlds line up on this and every other concept.
