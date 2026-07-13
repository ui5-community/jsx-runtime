# `<Switch>` plugin, sample plugin

A non-trivial `ChildrenProcessor` that adds `<Switch>` / `<Case>` / `<Default>` directives to the JSX runtime without touching the core. This is the **contract-under-test** for the plugin SPI: the existence proof that useful directives can grow from the outside.

## Layout

```
src/plugins/switch/
├── README.md            ← you are here
└── index.tsx            ← sentinels + ChildrenProcessor
```

Single-file plugin. If it grows (per-mode helpers, expression builders, separate tests), split along the seams already inside [index.tsx](./index.tsx).

## What it contains

The plugin exports four symbols and imports nothing from `sap.m` / `sap.f` / `sap.tnt`, only the SPI types from [../../runtime/runtime](../../runtime/runtime.ts):

| Export | Kind | Purpose |
| --- | --- | --- |
| `Switch` | `SentinelTag` | `<Switch on={...}>...</Switch>` |
| `Case` | `SentinelTag` | `<Case when="info">...</Case>` |
| `Default` | `SentinelTag` | `<Default>...</Default>` (at most one per Switch) |
| `switchProcessor` | `ChildrenProcessor` | Recognises `<Switch>` and unfolds branches |

## Usage

Apps opt in by wrapping the JSX construction in `withScope`:

```tsx
import { withScope } from "ui5/community/jsx/runtime";
import { Switch, Case, Default, switchProcessor } from "ui5/community/jsx/runtime/plugins/switch";

createContent() {
  return withScope({ childrenProcessors: [switchProcessor] }, () => (
    <VBox>
      <Switch on={kind}>
        <Case when="info">    <Title text="Info"    /> </Case>
        <Case when="warning"> <Title text="Warning" /> </Case>
        <Default>             <Title text="—"       /> </Default>
      </Switch>
    </VBox>
  ));
}
```

Outside that scope, `<Switch>` raises a clear error from the sentinel's call body, the active scope simply has no processor that claims it.

## Two modes

Picked by the type of `on`:

- **Literal `on`** (string / number / boolean), pick the first `<Case when={...}>` whose `when` is `===`-equal to `on`. If none match, emit the `<Default>` children if a `<Default>` exists, otherwise emit nothing. No wrapper, no extra bindings.
- **Bound `on`** (any value with a `path` field, a `BindingInfo` object like `{ path: "/kind" }`), bind each branch's `visible` to a UI5 expression-binding `{= ${path} === '...' }` derived from the case's `when`. `Default.visible` becomes `{= ${path} !== 'caseA' && ${path} !== 'caseB' && ... }`. UI5's normal binding-driven visibility flips the branches as the model changes. **No `sap.m` import**, `bindProperty("visible", ...)` is on `ManagedObject`.

## Why this plugin matters

It's the **contract under test** for the SPI:

1. Sentinels declared via `defineSentinel(name)` reach the parent `jsx()` call as `SentinelNode`s with a brand the runtime recognises generically, no plugin-specific code in the core.
2. The plugin hands its `ChildrenProcessor` to consumers through `withScope({ childrenProcessors: [...] }, fn)`, the only registration path.
3. The plugin imports four SPI symbols total. No `sap.m` / `sap.f` / `sap.tnt`. No back-door into the core.
4. Deleting this folder leaves the runtime unchanged; no view that doesn't import it notices.
