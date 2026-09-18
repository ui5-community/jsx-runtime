---
"@ui5-community/jsx-runtime": minor
---

Add `plugins/html` opt-in plugin for native HTML tags via `sap.html` (OpenUI5 ≥ 1.154.0).

Lowercase HTML tags (`<div>`, `<span>`, `<input>`, …) now map to the corresponding `sap.html.*` UI5 control classes when wrapped in `withScope(htmlScope, () => …)`. Because these are real `ManagedObject` controls, the full UI5 programming model applies: data binding, events, dot-handler strings, `class=`, `ref=`, and auto-prefix-id all work identically to any other control — no per-tag imports needed.

New exports from `ui5/community/jsx/runtime/plugins/html`:

- `htmlScope` — partial scope to pass to `withScope`
- `preloadSapHtml()` — async bootstrap call that loads `sap.html` and all its controls via library metadata discovery
- `sapHtmlIntrinsic`, `tagToModulePath`, `resolveHtmlControl`, `normaliseHtmlProps` — lower-level exports for testing and custom composition

Also replaces the permissive `HTMLAttributes` fallback in `JSX.IntrinsicElements` with per-tag TypeScript interfaces (`AnchorAttributes`, `InputAttributes`, `ButtonHtmlAttributes`, `FormAttributes`, and more).
