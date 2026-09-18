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

The `sap.html` library is not part of the default UI5 preload. Load it
once at bootstrap before any HTML-tag view renders:

```ts
// Component.ts
import { preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

public async init(): Promise<void> {
  super.init();
  await preloadSapHtml();   // ← before router.initialize()
  this.getRouter().initialize();
}
```

`preloadSapHtml()` is idempotent — safe to call multiple times.

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
