# `@ui5-community/jsx-runtime/plugins/html`

> **Requires OpenUI5 ≥ 1.154.0** — the `sap.html` library was introduced in 1.154.0-SNAPSHOT.

An opt-in plugin that maps lowercase HTML tags in TSX views to the corresponding `sap.html.*` UI5 control classes, letting you write native HTML without importing each class individually.

```tsx
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { htmlScope, preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

// Once at bootstrap (Component.init / app entry):
await preloadSapHtml();

// In a view's createContent():
return withScope(htmlScope, () => (
  <div class="myCard">
    <h3>Hello, {name}!</h3>
    <input type="text" value="{/name}" input={this.onNameChanged} />
    <button click={(): void => MessageToast.show("Hi!")}>Click me</button>
  </div>
));
```

Because `sap.html` controls are ordinary UI5 `ManagedObject` subclasses, the full runtime pipeline applies:

- **Data binding** — `value="{/name}"`, `text="{/title}"`, object-form `{ path, formatter }` — all work as on any UI5 control.
- **Dot-handler events** — `click=".onSave"` resolves against the view's controller at fire time.
- **Inline function events** — `click={() => …}` wraps in a normal UI5 event listener.
- **`class=`** — forwarded through the `classIntrinsic` to `addStyleClass(...)`.
- **`ref=`** — callback ref, receives the constructed `sap.html.*` instance.
- **Auto-prefix-id** — `id="foo"` in a view with `getAutoPrefixId() === true` is expanded to `view.createId("foo")` automatically.

---

## Installation / opt-in

The plugin is bundled in `@ui5-community/jsx-runtime`. Import it from the subpath:

```ts
import { htmlScope, preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";
```

Wrap the JSX subtree you want HTML support in:

```tsx
return withScope(htmlScope, () => <div>…</div>);
```

`withScope` is synchronous, so you can scope individual subtrees rather than entire views.

---

## Preloading

`sap.html` is loaded lazily; the sync `sap.ui.require` call inside the plugin only works if the library is already in the require cache. Call `preloadSapHtml()` once at bootstrap:

```ts
// Component.ts
public async init(): Promise<void> {
  super.init();
  await preloadSapHtml();  // ← before router.initialize()
  this.getRouter().initialize();
}
```

`preloadSapHtml()` calls `Lib.load({ name: "sap.html" })`, reads the library metadata's `controls` list to discover every `sap/html/*` module, then async-requires them all in one batch — plus `sap/ui/core/html/TextContent` for mixed-content support. After the promise resolves, every `sap/html/*` control is in the synchronous require cache. Safe to call multiple times.

---

## Tag resolution

A lowercase JSX tag maps to `sap/html/<ClassName>` where `<ClassName>` is the tag with its first character uppercased:

| JSX tag | UI5 module | UI5 class |
|---|---|---|
| `<div>` | `sap/html/Div` | `sap.html.Div` |
| `<span>` | `sap/html/Span` | `sap.html.Span` |
| `<h1>` | `sap/html/H1` | `sap.html.H1` |
| `<blockquote>` | `sap/html/Blockquote` | `sap.html.Blockquote` |
| `<selectedcontent>` | `sap/html/Selectedcontent` | `sap.html.Selectedcontent` |

A tag not present in the `sap.html` library (e.g. `<script>`, `<video>`) or a tag whose module is not yet loaded throws a clear error at JSX construction time.

---

## Text children

HTML elements contain text. The plugin normalises JSX children before delegating to the core runtime:

### Sole text child → `text` property

```tsx
<span>Hello, world</span>
// ↓ normalised to:
// <sap.html.Span text="Hello, world" />
```

Whitespace-only children (Babel's JSX indentation) are ignored.

### Mixed content → `TextContent` controls

Text interleaved with child controls is wrapped in `sap.ui.core.html.TextContent` (a private core control) inserted at the correct position in the `children` aggregation, preserving source order:

```tsx
<p>
  Visit <a href="https://openui5.org">OpenUI5</a> for docs.
</p>
// ↓ normalised to children: [TextContent("Visit "), Anchor, TextContent(" for docs.")]
```

### All-control children → unchanged

Children that are all UI5 controls (no string segments) are forwarded to the `children` default aggregation as-is.

---

## Void elements

Void elements (`<br>`, `<hr>`, `<img>`, `<input>`, `<area>`, `<col>`, `<wbr>`, …) cannot have children or a `text` property. Providing either throws at construction time:

```tsx
<br>oops</br>  // ← Error: <br> is a void element and cannot have children
```

---

## Events

`sap.html` controls declare UI5 events for native DOM events — `click`, `input`, `change`, `keydown`, `focus`, `blur`, `submit`, `scroll`, and more. Use them the same way as any UI5 event:

```tsx
// Inline arrow:
<button click={(): void => MessageToast.show("Hi!")}>Click</button>

// Dot-handler (resolved against view controller at fire time):
<button click=".onSave">Save</button>

// Method reference (with bind):
<input input={this.onInput.bind(this)} />
```

Event names are the **UI5 event names** (`click`, `input`, `change`, …), not the DOM `onclick` / `oninput` attribute syntax.

---

## `enabled` vs `disabled`

Interactive controls (`<button>`, `<input>`, `<select>`, `<textarea>`) expose an `enabled` property (default `true`) that maps to the native `disabled` attribute:

```tsx
<input enabled={false} />  // renders: <input disabled>
```

---

## TypeScript types

Per-tag TypeScript prop types are shipped in the runtime's `JSX.IntrinsicElements` declaration. Common attributes are typed on `HtmlBaseAttributes` (available as `JSX.HtmlBaseAttributes`); element-specific attributes are on dedicated interfaces (e.g. `JSX.AnchorAttributes`, `JSX.InputAttributes`, `JSX.FormAttributes`, …).

No `@openui5/types` update is required — the interfaces are defined directly in the runtime.

---

## Scope isolation

`withScope(htmlScope, fn)` is the explicit opt-in. Any JSX outside the scope still throws a clear error if it encounters a lowercase tag. This is deliberate: HTML tags and UI5 control tags do not mix accidentally.

```tsx
// ✅ HTML inside the scope
return withScope(htmlScope, () => <div><VBox /></div>);

// ❌ HTML outside the scope — throws "no htmlIntrinsic"
return <div />;
```

---

## Exports

| Export | Type | Description |
|---|---|---|
| `htmlScope` | `Partial<Scope>` | Spread into `withScope(htmlScope, fn)` to enable HTML tags. |
| `sapHtmlIntrinsic` | `Scope["htmlIntrinsic"]` | The raw handler — spread manually if you need to compose scopes. |
| `preloadSapHtml` | `() => Promise<void>` | Load the `sap.html` library. Call once at bootstrap. |
| `tagToModulePath` | `(tag: string) => string` | Map `"div"` → `"sap/html/Div"`. Useful for testing. |
| `resolveHtmlControl` | `(tag: string) => ControlClass` | Sync-resolve the control class (requires preload). |
| `normaliseHtmlProps` | `(tag, props) => props` | Text-child normalisation (exported for testing). |
