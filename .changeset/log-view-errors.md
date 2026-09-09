---
"@ui5-community/jsx-runtime": patch
---

JSX view-construction errors are now logged via `sap/base/Log` in addition
to propagating. Previously, when `createContent()` threw (sync or async),
the error was only visible as a rejected Promise and, in the showcase, as
a text message rendered into the DOM. It was never written to the UI5 Log,
making it invisible to log-scraping tooling and `sap-ui-log-level` debugging.

`installViewScopeBridge` now wraps the `createContent()` call with a
try/catch (sync) and a `.catch` on the returned Promise (async). On failure
it calls `Log.error` with the full error message, the stack trace, and the
component id `"ui5.community.jsx.runtime"`, then re-throws / re-rejects so
existing propagation behaviour is unchanged.

The showcase's `ExploreSample` view also adds `Log.error` calls in both its
demo-view and docs-load catch handlers so the exact user-facing message
appears in the log as well.
