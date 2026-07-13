# Performance

**TL;DR — JSX is not a performance cost. It instantiates *faster* than an
equivalent XMLView (roughly 2.5–4× on the trees measured), and adds zero
steady-state overhead.**

## Why (architecture)

A JSX expression is a **constructor call, not a render description**. Babel's
automatic JSX transform compiles `<Button text="Hi" />` at *build time* into
`_jsx(Button, { text: "Hi" })`, and this runtime turns that into a plain
`new Button({ text: "Hi" })`. There is no virtual DOM, no reconciler, and no
re-render loop — reactivity comes from UI5 bindings, exactly as in an XMLView.

The contrast with XMLView is where the structural work happens:

- **XMLView** parses an XML string **at runtime** on every view creation: walk
  the DOM, resolve class names, build controls. That cost scales with the
  number of elements in the view.
- **JSX** did that structural work **at build time**, so `View.create` just
  runs the emitted constructor calls — there is no markup to parse.

Everything *downstream* — control construction, binding setup, and rendering
through `RenderManager` — is **identical** for both, because both produce the
same UI5 control instances driven by the same engine. JSX's advantage is
confined to the parse/instantiation step; there is no ongoing per-update
penalty.

## Measured numbers

Micro-benchmark: instantiate the same control tree N times via
`View.create` (JSX/TSX) vs `XMLView.create` (XML twin), `destroy()` each,
discard warm-up iterations. Both sides were verified to build an identical
control tree (same aggregated-object count). Milliseconds per `create()`.

**Small view** — `VBox` › `Text`, `Input`, `Text`, `Button` (one binding):

| | Cold (first) | Warm median | Warm p95 |
| --- | --- | --- | --- |
| JSX | 0.3–0.6 | 0.2–0.3 | 0.4–0.7 |
| XMLView | 1.0–1.3 | ~0.8 | ~1.0 |

**Table view** — `sap.m.Table`, 4 columns, `ColumnListItem` template, bound rows (~31 objects):

| | Cold (first) | Warm median | Warm p95 |
| --- | --- | --- | --- |
| JSX | ~0.8 | ~0.5 | ~0.9 |
| XMLView | ~2.4 | ~2.0 | ~3.2 |

The gap widens with tree size — more elements means more runtime XML parsing
for XMLView, while JSX pays none.

### Method & caveats

- Run in-browser against the dev server (self-hosted, **unminified** UI5),
  Chrome, single machine.
- Measures `View.create()` wall-clock only — not first paint, network, or
  data loading, which dominate real app startup and are identical for both
  approaches.
- Absolute times are sub-millisecond and dwarfed by real app work; treat these
  as **directional**, not a spec-grade benchmark. The *direction* (JSX ≤ XML at
  instantiation, equivalent at steady state) follows directly from the
  architecture above and was stable across repeated runs.

## Bottom line

Choose JSX/TSX for the authoring experience — per-control TypeScript typing,
IDE support, no runtime XML parsing. Performance is a point in its favor, not a
trade-off: at worst equivalent to XMLView, measurably faster at view
instantiation, and with no steady-state cost versus hand-written
`new Control(settings)`.
