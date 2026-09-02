---
"@ui5-community/jsx-runtime": patch
---

Fix `key` prop being silently dropped for controls that declare it as a property (e.g. `sap.ui.core.CustomData`).

Babel's automatic JSX transform always extracts `key` from the element's attributes and passes it as the third argument to `jsx(type, props, key)` — it is never present in the `props` object. The runtime now detects this case and forwards the value to the control's `key` property when the control metadata declares one. For controls without a `key` property the behaviour is unchanged.

Fixes #3.
