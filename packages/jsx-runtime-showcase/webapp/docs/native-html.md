# Native HTML via `sap.html` (plugin)

The runtime ships a `plugins/html` package that maps lowercase HTML
tags in TSX views to real `sap.html.*` UI5 control classes, available
from **OpenUI5 1.154.0**. No per-tag imports needed.

## What it looks like

```tsx
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { htmlScope } from "ui5/community/jsx/runtime/plugins/html/index";

return withScope(htmlScope, () => (
  <div class="myCard">
    <h3>Hello, JSX!</h3>
    <p>Mix <strong>HTML</strong> and UI5 controls freely.</p>
    <input type="text" value="{/name}" input={this.onNameChanged} />
    <button click={(): void => MessageToast.show("Hi!")}>
      Click me
    </button>
  </div>
));
```

Because `<div>`, `<input>`, etc. are mapped to real `sap.html.Div` /
`sap.html.Input` controls, the full UI5 programming model works:

- **Data binding** — `value="{/name}"`, `text="{/title}"`, object-form
  `{ path, formatter }` — all work as on any UI5 control.
- **Dot-handler events** — `click=".onSave"` resolves at fire time.
- **Inline function events** — `click={() => …}` is a normal UI5 listener.
- **`class=`** → `addStyleClass(...)`.
- **`ref=`** callback ref, receives the `sap.html.*` instance.
- **Auto-prefix-id** — `id="foo"` is expanded by the view bridge.

## Preloading

### The async helper

`preloadSapHtml(): Promise<void>` first awaits `Lib.load({ name: "sap.html" })`,
then async-requires every control listed in the library metadata and
`sap/ui/core/html/TextContent`. A library preload caches definitions without
executing every control factory; the async require step makes the constructors
available for synchronous JSX calls, often without additional requests.
The helper rejects on failure and is safe to call repeatedly through UI5's cache.

### Default: preload in component content creation

Use the public `IAsyncContentCreation` lifecycle instead of a component service:

```ts
// webapp/Component.ts
import UIComponent from "sap/ui/core/UIComponent";
import type Control from "sap/ui/core/Control";
import { preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

export default class Component extends UIComponent {
  public static metadata = {
    manifest: "json",
    interfaces: ["sap.ui.core.IAsyncContentCreation"]
  };

  public init(): void {
    super.init();
    this.getRouter().initialize();
  }

  public async createContent(): Promise<Control | null> {
    await preloadSapHtml();
    return this.runAsOwner(() => super.createContent());
  }
}
```

The base `createContent()` uses the root view from `manifest.json`.
`runAsOwner()` restores component ownership after the await. Use asynchronous
component creation (`Component.create()` or an async `ComponentContainer`);
UI5 waits for content creation, and asynchronous routing waits for root content.
The router can initialize normally in synchronous `init()`.

No service declaration, factory registration or `getService()` wait is needed.
HTML modules are ready before the root view is created, so individual TSX views
keep synchronous `createContent()` and `withScope(htmlScope, …)`. The automatic
view-scope bridge does not need to span an await.

Do not make component `init()` or `onBeforeRendering()` async, and do not build
HTML JSX in those hooks before preload is ready. A preload failure rejects
content and component creation; handle it through `Component.create()`'s catch
handler or `ComponentContainer.componentFailed`. If the component can be
destroyed during loading, check `this.isDestroyed()` after the await before
creating content.

Standalone code may instead await `preloadSapHtml()` at an async application
entry before HTML JSX construction. Do not put an await inside `withScope`.

## Opt-in: `withScope(htmlScope, fn)`

HTML support is not global. Wrap the subtree where you want it:

```tsx
// ✅ HTML works inside the scope
return withScope(htmlScope, () => <div><VBox /></div>);

// ❌ HTML outside the scope — throws "no htmlIntrinsic"
return <div />;
```

The boundary is explicit so a typo like `<vbox>` in a non-HTML
context produces a clear error rather than a silent rendering quirk.

## Tag resolution

| JSX tag | UI5 module |
|---|---|
| `<div>` | `sap/html/Div` |
| `<span>` | `sap/html/Span` |
| `<h1>` – `<h6>` | `sap/html/H1` – `sap/html/H6` |
| `<input>` | `sap/html/Input` |
| `<button>` | `sap/html/Button` |
| `<a>` | `sap/html/A` |
| …all HTML elements… | `sap/html/<Capitalised>` |

First character capitalised, everything else as-is. The only
exception is `<selectedcontent>` → `sap/html/Selectedcontent`.

## Text children

### Sole text child

A single string (no sibling controls) becomes the `text` property:

```tsx
<span>Hello, world</span>
// → new sap.html.Span({ text: "Hello, world" })
```

### Mixed content

Text interleaved with child controls is wrapped in
`sap.ui.core.html.TextContent` controls, preserving source order:

```tsx
<p>Visit <a href="…">OpenUI5</a> for docs.</p>
// → children: [TextContent("Visit "), Anchor, TextContent(" for docs.")]
```

### Void elements

`<br>`, `<hr>`, `<img>`, `<input>`, etc. cannot have children.
Providing any throws at construction time.

## Events

`sap.html` declares UI5 events for native DOM events. Use the **UI5
event name** (not the `onclick` DOM attribute style):

```tsx
<button click=".onSave">Save</button>      // dot-handler
<input  input={() => …} />                 // inline arrow
<form   submit={this.onSubmit.bind(this)}> // method reference
```

## Two-way binding: write-back is explicit

`sap.html` property bindings are **read-only**: they sync the model
value into the control, but user edits are **not** automatically
written back. To keep the model up to date you must call
`model.setProperty()` inside the `input` or `change` event handler:

```tsx
<input
    value="{/name}"
    input={(event: UI5Event): void => {
        // getValue() returns the stale model value — the binding pushes
        // the model into the property, but DOM changes don't flow back.
        // Read the current text from the DOM directly.
        const inputEl = (event.getSource() as unknown as {
            getDomRef(): HTMLInputElement | null;
        }).getDomRef();
        model.setProperty("/name", inputEl?.value ?? "");
    }}
/>
```

### `input` vs `change`

| Event | Fires | Typical use |
|---|---|---|
| `input` | every keystroke | live filter, live preview |
| `change` | blur or Enter | commit-on-leave, server call |

Use `input` when the bound output (another `sap.html` element, a
`<Text>`, an aggregation) needs to reflect every keypress.
Use `change` when you only need to react once the user is done.

> **Contrast with `sap.m.Input`:** `sap.m.Input` with a `JSONModel`
> binding and default `TwoWay` mode writes back automatically on
> `change`. That implicit write-back does not apply to `sap.html`
> controls.

## `enabled` vs `disabled`

Interactive controls use `enabled` (default `true`); the framework
maps it to the native `disabled` attribute:

```tsx
<input enabled={false} />  // renders: <input disabled>
```

## TypeScript types

Per-tag prop types are in `JSX.IntrinsicElements` (part of the runtime
typings, no separate package needed). Common attributes are on
`JSX.HtmlBaseAttributes`; element-specific ones have their own
interfaces (`JSX.AnchorAttributes`, `JSX.InputAttributes`, …).

See the running demo in [native-html](#/explore/native-html).
