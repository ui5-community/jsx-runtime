---
"@ui5-community/jsx-runtime": patch
---

Fix string-syntax aggregation bindings clobbering their row template. Binding an
aggregation with the classic string form plus a JSX child, e.g.
`<VBox items="{view>/rows}"><FlexBox/></VBox>`, now installs an aggregation
binding whose `template` is the child — parity with the object form
`items={{ path: "view>/rows" }}`. Childless string aggregation bindings are
unaffected (UI5 already handled those). Fixes #6.
