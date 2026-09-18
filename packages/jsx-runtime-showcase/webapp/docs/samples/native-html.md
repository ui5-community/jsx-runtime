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

**Preload once** at bootstrap before any HTML-tag view renders:

```ts
// Component.ts
await preloadSapHtml();   // loads sap.html + all sap/html/* controls
this.getRouter().initialize();
```

Concept reference: [Native HTML via sap.html](#/learn/native-html).
