# Your first TSX view

Extend `sap.ui.core.mvc.View`, return JSX from `createContent()`,
you're done.

```tsx
import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";

/**
 * @namespace my.app.view
 */
export default class HelloJSX extends View {
    getAutoPrefixId(): boolean {
        return true;
    }

    createContent(): Control {
        return (
            <VBox class="sapUiSmallMargin">
                <Title text="Hello, JSX" level="H3" />
                <Text text="Your first TSX view." />
                <Button
                    text="Say hi"
                    press={(): void => MessageToast.show("Hello from JSX!")}
                    class="sapUiSmallMarginTop"
                />
            </VBox>
        );
    }
}
```

The `@namespace` annotation is required: `babel-preset-transform-ui5`
reads it to register the generated module under the right UI5
namespace (here `my.app.view.HelloJSX`). Set it to match your file's
location under the app namespace — the same value you'd give an XML
view's controller. Omit it and the transpiled module lands in the
wrong (or no) namespace, so `View.create({ viewName: "module:…" })`
can't resolve it.

No controller. No model. No `manifest` entry. `<VBox/>` becomes
`new VBox(…)`, `press={fn}` gets wired via UI5's
`[fn, listener]` shape (see [Events](/#/learn/events)), and
`class="…"` routes through `addStyleClass` (see
[Controls](/#/learn/controls)).

## Loading it

Register in your router or instantiate directly:

```ts
const view = await View.create({
    viewName: "module:my/app/view/HelloJSX"
});
```

The `module:` prefix is UI5's target for programmatic views.
Routing, embedding, `NavContainer` mounting: same as XML.

Now wire the build: [Setup →](/#/learn/setup).

## About `getAutoPrefixId`

Every sample view in the showcase includes a three-line override:

```ts
getAutoPrefixId(): boolean {
    return true;
}
```

You'll see this method on-disk in every `.tsx` sample, but the
Explore panel intentionally hides it from the displayed source.
Important to know **once**, useless in every sample.

`getAutoPrefixId` is UI5's built-in view-level opt-in: when it
returns `true`, UI5 prefixes control ids created inside this view
with the view's own id (via `View#createId(id)`), so two views
mounting the same nested sample can safely name a control
`"myButton"` without id collisions.

XMLView invokes this automatically for every control the parser
constructs. With the JSX runtime, the same behaviour is wired in
transparently at runtime: see
[Auto id prefix →](/#/learn/auto-prefix) for the how, and
[JSX vs XMLView →](/#/learn/jsx-vs-xmlview) for the wider concept
map.

Keep the method on every JSX view unless you have a strong reason
not to (e.g. a view that programmatically forwards its ids to a
parent). The runtime cost is a single `view.createId(id)` call per
child control at construction time.
