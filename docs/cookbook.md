# Cookbook — canonical recipes

A working recipe per common task. Every snippet is minimal-viable and matches an existing showcase sample, so you can copy, paste, and adapt. When a recipe has trade-offs, they're called out on the last line.

Related reading: [gotchas.md](gotchas.md) (pitfalls to avoid), [requirements.md](requirements.md) (the contract), [jsx-runtime.md](jsx-runtime.md) (concept overview).

---

## 1. Minimal view

The smallest thing that runs. No model, no controller, no bindings.

```tsx
import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";

export default class Main extends View {
    getAutoPrefixId(): boolean { return true; }

    createContent(): Control {
        return (
            <VBox class="sapUiSmallMargin">
                <Button
                    text="Say hi"
                    press={(): void => MessageToast.show("Hello from JSX!")}
                />
            </VBox>
        );
    }
}
```

Reference: [hello-jsx sample](../packages/jsx-runtime-showcase/webapp/view/showcases/HelloJSX.tsx).

Trade-off: inline arrow handlers are fine for one-liners; move them to methods once they get real.

---

## 2. Event handler — dot notation (XML-view style)

`press=".onPress"` is a **string** starting with a dot. At fire time, the runtime walks the parent chain to the closest `View`, asks it for a controller, and invokes the named method. Matches XMLView's `EventHandlerResolver`.

```tsx
<Button text="Press me" press=".onPress" />
```

The method lives on the controller (or on `this` if the view overrides `getController(): this`; see recipe 12).

Reference: [events-dot sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EventsDot.tsx).

---

## 3. Event handler — function reference

Function reference bound to the view instance. No parent-chain walk, no ambiguity.

```tsx
<Button text="Press me" press={this.onPress.bind(this)} />
```

The `[fn, listener]` two-tuple form is also accepted:

```tsx
<Button text="Press me" press={[this.onPress, this]} />
```

Reference: [events-fn sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EventsFn.tsx).

Trade-off: dot-form re-resolves each fire (survives controller swaps and hot-reload); function-form is faster and stack-visible in devtools.

---

## 4. Data binding — string form

Same syntax UI5 uses everywhere. The prefix (`form>`) selects the named model; drop it to hit the default model.

```tsx
this.setModel(new JSONModel({ name: "" }), "form");

return (
    <VBox class="sapUiSmallMargin">
        <Input value="{form>/name}" placeholder="Type…" />
        <Text  text="{form>/name}" />
    </VBox>
);
```

Both controls auto-sync as the user types. No `liveChange`, no manual round-trip.

Reference: [binding-string sample](../packages/jsx-runtime-showcase/webapp/view/showcases/BindingString.tsx).

---

## 5. Data binding — binding-info object with a `SimpleType`

When the binding needs more than a `path` (a type, formatter, or filter), pass the info object. The `as never` cast is deliberate — see [gotchas.md](gotchas.md#binding-info-objects-need-as-never).

```tsx
this.setModel(new JSONModel({ count: 1 }), "form");

<Input
    value={{
        path: "form>/count",
        type: new Integer({}, { minimum: 0, maximum: 999 }),
        formatOptions: { groupingEnabled: false }
    } as never}
/>
```

Parse and validate errors flip `valueState` to `Error` automatically through UI5's normal type-handling messages.

Reference: [binding-object sample](../packages/jsx-runtime-showcase/webapp/view/showcases/BindingObject.tsx).

---

## 6. Bound aggregation with a row template — three spellings

All three render the same rows from `/items` and stay in lockstep on add/remove. Pick by taste.

**Explicit `<For>`:**

```tsx
<List>
    <For each={{ path: "/items" }}>{() =>
        <StandardListItem title="{label}" description="ID: {id}" />
    }</For>
</List>
```

**Implicit — child slots in as the aggregation `template`:**

```tsx
<List items={{ path: "/items" }}>
    <StandardListItem title="{label}" description="ID: {id}" />
</List>
```

**Raw — `template` lives on the binding-info:**

```tsx
<List
    items={{
        path: "/items",
        template: <StandardListItem title="{label}" description="ID: {id}" />
    }}
/>
```

Reference: [structural sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Structural.tsx).

---

## 7. Conditional rendering with `<If>`

**Literal** — decided at construction time. No wrapper control, non-matching children never enter the tree.

```tsx
<If condition={true}>
    <Title text="Only rendered because the literal is true" level="H4" />
</If>
```

**Bound** — each child's `visible` is bound directly. No wrapper, no `sap.m` dependency.

```tsx
<If condition={{ path: "/showDetails" }}>
    <Title text="Toggles as /showDetails flips" level="H4" />
    <Text  text="Same reactivity as UI5's normal visible-binding." />
</If>
```

Reference: [structural sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Structural.tsx).

---

## 8. Named-aggregation prop (single-value slot)

Named single-value aggregations (like `sap.m.Dialog`'s `beginButton` / `endButton`) accept a JSX subtree as a prop value.

```tsx
<Dialog
    title="Confirm"
    endButton={<Button text="Close" press=".onClose" />}
>
    <Text text="Are you sure?" />
</Dialog>
```

Content children still go inside the tags (they map to the `content` default aggregation).

---

## 9. JSX fragment `<>…</>`

Grouping siblings with no wrapper control. The runtime's `flattenChildren` inlines them into the parent aggregation.

```tsx
function labelledValue(label: string, value: string): Control {
    return (
        <>
            <Label text={label} design="Bold" />
            <Text  text={value} />
        </>
    );
}

<VBox class="sapUiSmallMargin">
    {labelledValue("Name", "Ada Lovelace")}
    {labelledValue("Role", "Mathematician")}
</VBox>
```

Call helpers as values (`{labelledValue(...)}`), **not** as tags. The runtime rejects `<labelledValue/>` because the JSX type must be a UI5 class, not a function.

Reference: [fragments sample](../packages/jsx-runtime-showcase/webapp/view/showcases/Fragments.tsx), [embed-six sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EmbedSix.tsx).

---

## 10. UI5 fragment factory (dialog from a separate file)

The **other** sense of "fragment" in UI5: a reusable UI chunk with no controller. Author it as a `*.fragment.tsx` factory function.

```tsx
// FragmentDialog.fragment.tsx
export default function FragmentDialog(): Dialog {
    return (
        <Dialog title="Confirm">
            <Text text="Are you sure?" />
            <endButton>
                <Button text="Close" press=".onCloseDialog" />
            </endButton>
        </Dialog>
    ) as unknown as Dialog;
}
```

Mount in the parent view; `addDependent` splices it into the parent chain so `.onCloseDialog` resolves back to the mounting view's controller.

```tsx
private _dialog?: Dialog;

onOpenDialog(): void {
    if (!this._dialog) {
        this._dialog = FragmentDialog();
        this.addDependent(this._dialog);
    }
    this._dialog.open();
}
```

Reference: [fragment-dialog sample](../packages/jsx-runtime-showcase/webapp/view/showcases/FragmentDialogDemo.tsx).

Trade-off: a different view can mount the same factory and its handlers auto-resolve there. No captured `this`.

---

## 11. Embedding another view / XML view

Six patterns in ascending weight — pick the lightest that works.

| Pattern | Reach for it when |
| --- | --- |
| `<>…</>` fragment | You just need "no wrapper." |
| Helper function `{stat(...)}` | Pieces are local to this view. |
| `*.fragment.tsx` factory | A controller-callable dialog fits. |
| Nested `<View/>` | The piece deserves its own lifecycle & id namespace. |
| `XMLView.create({ definition })` | The XML is generated at runtime. |
| `XMLView.create({ viewName })` | The piece is an on-disk `.view.xml` file. |

Nested TSX view (async):

```tsx
import HelloJSXView from "./HelloJSX";

<HelloJSXView async={true} />
```

XMLView from a definition:

```tsx
createContent(): Promise<Control> {
    return XMLView.create({ definition: this.xml }).then(xv => (
        <VBox>{xv}</VBox>
    ));
}
```

Reference: [embed-six sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EmbedSix.tsx).

---

## 12. Standalone sample (view doubles as its own controller)

Convenient for single-file demos. Real apps keep a separate controller file.

```tsx
getController(): Controller {
    return this as unknown as Controller;
}
```

Now `press=".onPress"` and `press={this.onPress}` both resolve to methods on the view class itself.

Reference: [events-dot sample](../packages/jsx-runtime-showcase/webapp/view/showcases/EventsDot.tsx), and every other showcase view.

**Don't** ship this pattern in production code — it merges view and controller responsibilities on purpose only to keep a sample readable in one file.

---

## 13. Auto-prefix IDs

Set once per view so `id="submit"` on a nested control becomes `myView--submit` and stays unique across mounts.

```tsx
getAutoPrefixId(): boolean { return true; }
```

Documented in [webapp/docs/auto-prefix.md](../packages/jsx-runtime-showcase/webapp/docs/auto-prefix.md).

---

## 14. Opting into a plugin (`<Switch>` etc.)

Plugins register via `withScope`. Outside the scope, plugin sentinels throw with a clear error — no silent no-op.

```tsx
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { Switch, Case, Default, switchProcessor }
    from "ui5/community/jsx/runtime/plugins/switch/index";

createContent(): Control {
    return withScope({ childrenProcessors: [switchProcessor] }, () => (
        <Switch on={{ path: "/kind" }}>
            <Case when="info">    <Text text="ℹ️ info"    /> </Case>
            <Case when="warning"> <Text text="⚠️ warning" /> </Case>
            <Default>             <Text text="(none)"    /> </Default>
        </Switch>
    ));
}
```

`withScope` is synchronous only — do not `await` inside the callback. See [gotchas.md](gotchas.md#withscope-is-synchronous-only).

Reference: [switch-plugin sample](../packages/jsx-runtime-showcase/webapp/view/showcases/SwitchPlugin.tsx).

---

## 15. Writing a plugin (structural directive)

A plugin is a `ChildrenProcessor` plus (optionally) one or more sentinel tags declared via `defineSentinel`.

```tsx
import { defineSentinel, isSentinelNode, type ChildrenProcessor }
    from "ui5/community/jsx/runtime/jsx-runtime";

export interface LazyProps { when: unknown; children?: unknown }

export const Lazy = defineSentinel<LazyProps>("Lazy");

export const lazyProcessor: ChildrenProcessor = {
    matches: (child) => isSentinelNode(child) && child.tag === Lazy,
    process: (children, ctx) => { /* transform children here */ return children; }
};
```

Consumers opt in via `withScope({ childrenProcessors: [lazyProcessor] }, …)`.

Reference: the sample plugin at [packages/jsx-runtime/src/plugins/switch/index.tsx](../packages/jsx-runtime/src/plugins/switch/index.tsx) and the SPI at [packages/jsx-runtime/src/runtime/plugin.ts](../packages/jsx-runtime/src/runtime/plugin.ts).

The generic parameter on `defineSentinel<P>` is load-bearing — see [gotchas.md](gotchas.md#definesentinelp-needs-its-generic).
