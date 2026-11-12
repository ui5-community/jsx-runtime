---
---

Document async component `createContent()` with `IAsyncContentCreation` as the default HTML preload pattern. Await `preloadSapHtml()` before root-view creation and restore component ownership with `runAsOwner()`, preserving synchronous view content and normal router initialization. Correct preload error guidance and explain why library preloading alone does not resolve control constructors.
