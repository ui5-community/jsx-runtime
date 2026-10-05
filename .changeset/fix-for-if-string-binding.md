---
"@ui5-community/jsx-runtime": patch
---

Fix string-syntax data binding for `<For each>` and `<If condition>`.

Previously, using a binding string like `each="{/items}"` on `<For>` threw `"requires a binding info"`, and `condition="{/flag}"` on `<If>` was silently treated as a literal truthy value instead of binding `visible`. Both now accept the idiomatic UI5 string form alongside the existing object form (`each={{ path: "/items" }}`), using the same `BindingParser.complexParser` pattern introduced in the aggregation-binding fix (commit 28f2e36).
