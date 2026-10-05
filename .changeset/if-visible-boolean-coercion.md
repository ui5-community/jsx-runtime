---
"@ui5-community/jsx-runtime": patch
---

Fix `<If condition={binding}>` throwing "expected boolean" when the bound model path resolves to a non-boolean value (e.g. a string). The `ifProcessor` now injects `formatter: Boolean` into the binding info so any truthy/falsy model value is coerced to `boolean` before UI5 sets `visible` on child controls.
