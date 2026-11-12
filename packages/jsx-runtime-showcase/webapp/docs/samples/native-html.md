An **opt-in plugin** that maps every lowercase HTML tag to its
corresponding `sap.html.*` control class (available from OpenUI5 1.154.0).
Because these are ordinary `ManagedObject` controls, the full UI5
programming model applies — data binding, events, `class=`, `ref=`,
and dot-handler strings all work exactly as on any other control.

Opt in by wrapping the JSX subtree in
`withScope(htmlScope, () => …)`.
Outside that scope, lowercase tags still throw a clear
"no htmlIntrinsic" error — the boundary is explicit and reversible.

**Tag resolution** — first character uppercased, rest as-is:
`<div>` → `sap/html/Div`, `<h1>` → `sap/html/H1`,
`<blockquote>` → `sap/html/Blockquote`.

**Text children** — two modes:

- **Sole text child.** A single string/number (no sibling controls)
  becomes the control's `text` property.
- **Mixed content.** Text interleaved with child controls is wrapped in
  `sap.ui.core.html.TextContent` controls placed at the correct
  position in the `children` aggregation.

**Void elements** (`<br>`, `<input>`, `<img>`, …) reject children or a
`text` property — providing either throws a clear error at construction time.

The component implements **`IAsyncContentCreation`** and preloads HTML modules
before delegating to the manifest's root-view creation:

```ts
public async createContent(): Promise<Control | null> {
  await preloadSapHtml();
  return this.runAsOwner(() => super.createContent());
}
```

UI5 waits for this Promise during asynchronous component creation. Router
initialization stays in synchronous `init()`; no service or explicit router
wait is needed. `runAsOwner()` preserves component ownership after the await,
and the HTML sample's `createContent()` remains synchronous.

A preload failure rejects content/component creation and prevents mounting
its content. See the concept reference below for imports, metadata and the
complete component example.

Concept reference: [Native HTML via sap.html](#/learn/native-html).
