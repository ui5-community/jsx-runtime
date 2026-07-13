# JSX runtime for UI5, concept overview

> This document describes the concept behind `@ui5-community/jsx-runtime`. For the requirements spec see [requirements.md](./requirements.md). For a hands-on demo, run `pnpm dev` at the repo root and browse the showcase.

The `@ui5-community/jsx-runtime` package is a small, purpose-built JSX runtime that lets you write UI5 views as `.tsx` files:

```tsx
import View from "sap/ui/core/mvc/View";
import Button from "sap/m/Button";

export default class Hello extends View {
    createContent() {
        return <Button text="Hi" press=".onTap" />;
    }
}
```

There is no React, no virtual DOM, and no reconciler. JSX expressions compile to plain `new Control(settings)` calls. The runtime exists to glue Babel's automatic-runtime output into UI5's existing settings/binding/event model, and to expose a stable plugin contract on top.

## Babel wiring

With `ui5-tooling-transpile` (≥ 3.12) you don't hand-author a Babel config — enable the JSX transform (`@babel/plugin-transform-react-jsx`, **v7**; the v8 major breaks the transform) with a `transformJSX` option in `ui5.yaml` and point `importSource` at the library:

```yaml
customConfiguration:
  config-ui5-tooling-transpile: &cfgTranspile
    transformJSX:
      runtime: automatic
      importSource: "ui5/community/jsx/runtime"
```

The tooling then runs Babel, which emits, at the top of every `.tsx` file:

```js
import { jsx as _jsx, jsxs as _jsxs } from "ui5/community/jsx/runtime/jsx-runtime";
```

The `/jsx-runtime` suffix is hard-coded by the transform, the library exposes exactly this path.

## Three layers of API surface

| Layer | What it is | Who uses it |
| --- | --- | --- |
| **Core**: `jsx`, `jsxs`, `Fragment`, `<For>`, `<If>` | The directives that ship with every TSX app. Always available, no setup. | Every view author. |
| **Plugin SPI**: `withScope`, `defineSentinel`, the four extension-point types | The contract for adding directives, intrinsics, output adapters, etc. without touching the core. | Plugin authors. |
| **Sample plugin**: `<Switch>`/`<Case>`/`<Default>` from `@ui5-community/jsx-runtime/plugins/switch` | The M3-style non-trivial example. | Anyone who wants a template for their own plugin. |

If you only write views, **skip to the *Core directives* section below.** The plugin SPI exists so the runtime can grow without growing the core; you do not need to learn it to write apps.

## How `<Foo />` becomes `new Foo({...})`

Walk through what happens when Babel transforms

```tsx
<Page>
    <Button press=".onTap" text="Hello" />
</Page>
```

1. Babel emits

    ```js
    _jsx(Page, { children: _jsx(Button, { press: ".onTap", text: "Hello" }) });
    ```

2. The inner `_jsx(Button, props)` calls the library's [`jsx`](../packages/jsx-runtime/src/runtime/runtime.ts) function:
    - Looks up `Button.getMetadata()`. UI5's standard metadata API.
    - Walks `props`. The `press` value is the string `".onTap"`, and a core *intrinsic handler* (the dot-handler) claims it because `metadata.hasEvent("press")` returns true. The handler installs a real function that, at fire-time, walks up the element tree, finds the surrounding view's controller, and calls `controller.onTap(event)`.
    - `text` is just forwarded as-is.
    - The active `Renderer` is asked to construct the result. The default control-instance renderer returns `new Button({ press: realHandler, text: "Hello" })`.

3. The outer `_jsx(Page, ...)` calls `jsx(Page, props)`:
    - `props.children` is the Button instance. It's stripped and the runtime looks up `Page`'s default aggregation (`content`).
    - Settings become `{ content: button }`.
    - Result: `new Page({ content: button })`.

UI5 does the rest, `applySettings` wires up bindings, `ManagedObject` takes care of aggregations, the renderer walks the tree.

## Bindings

Any prop value that is a plain object with a `path` field is treated by UI5 as a `BindingInfo`, literal `{ path: "/X", model: "m" }` works fine. Both the runtime's own intrinsic parsing and UI5's `applySettings` will treat it identically.

## Bound aggregations + the JSX child

`<Table items={listRef}>` sets `items` to a `BindingInfo`. The JSX child, typically a `<ColumnListItem>`, is normally appended to the default aggregation, but when the default aggregation already holds a `BindingInfo` the runtime installs the child as that binding's `template` instead. UI5's `GrowingEnablement` then clones the template per row. The `<For>` directive below is sugar over this pattern.

## Core directives

The directives in this section are *always* available, with no setup. They are core `ChildrenProcessor`s registered into the default scope at module load.

### Fragments and falsy children

`<>...</>` compiles to `_jsx(Fragment, { children: [...] })`. The runtime recognises the `Fragment` sentinel and inlines its children into the parent aggregation. The same helper drops `null`, `undefined`, `false`, and `""` so JSX patterns like `{flag && <X/>}` Just Work, no aggregation crashes.

### `<For each={listRef}>{() => <Row/>}</For>`

Sugar over the "bound `items` + JSX child = template" pattern. The `each` prop carries a binding info, a literal `{ path: "/items" }`. The render-prop's return value becomes the row template. Compiles to:

```tsx
<List>
    <For each={{ path: "/items" }}>{() => (
        <StandardListItem title="{label}" description="ID: {id}" />
    )}</For>
</List>
// → new List({ items: { path: "/items", template: new StandardListItem({...}) } })
```

Templates use **relative paths** (`"{label}"`, no leading slash) because UI5 resolves per-row properties via the row's binding context. Default target is the parent's default aggregation; pass `aggregation="cells"` to override.

### `<If condition={...}>...</If>`

Two modes, picked by the type of `condition`:

- **Literal** (`true` / `false`): children are inlined or omitted at construction, no wrapper.
- **Bound** (any object with a `path` field): the runtime calls `child.bindProperty("visible", cond)` on every child directly. No wrapper control, no extra DOM node, **no `sap.m` (or any other library) dependency**, `bindProperty` is on `ManagedObject`.

If a child already binds its own `visible` (or pins it to `false`), `<If>` throws. Combine the conditions in an expression binding (`visible={`{= ${outer} && ${inner} }`}`) or write a wrapper layout for that case.

## Event handlers

Two ways to wire a handler:

```tsx
<Button press=".onTap" />               // string starting with "."
<Button press={(ev) => /* ... */} />    // direct function
```

The string form mirrors XML-view notation. The runtime resolves the method on the surrounding view's controller at fire-time via a parent-walk (or against a pinned controller if one was set via `withScope({ controller }, fn)`).

## Plugin SPI

> **You only need this section if you are writing a plugin.**

Five extension points, each with a single responsibility, none mandatory:

| Extension point | Purpose |
| --- | --- |
| `Renderer` | What `jsx()` *produces* from `(type, settings)`. Default = `new type(settings)`. |
| `IntrinsicHandler` | *Pre-construction* attribute pre-processing (`class=`, `binding=`, `ref=`, dot-handler events). |
| `PropertyApplier` | *Post-construction* property semantics (e.g. promise-valued props). |
| `ChildrenProcessor` | Structural-directive extension (`<For>`, `<If>`, `<Fragment>`, plus plugin sentinels). |
| `Scope` + `withScope` | Stack-saved context that holds the four registries. |

The core's own `class=`, dot-handler events, `binding="{/X}"`, `ref={cb}`, `<Fragment>`, `<For>`, and `<If>` are *all implemented as defaults registered into the default scope at module load*, which means a plugin that wants to override one of them does so the same way it adds a new one. Nothing in the core is privileged.

### `withScope`, opt a plugin in

```ts
import { withScope } from "@ui5-community/jsx-runtime";
import { switchProcessor, Switch, Case, Default } from "@ui5-community/jsx-runtime/plugins/switch";

createContent() {
    return withScope({ childrenProcessors: [switchProcessor] }, () => (
        <VBox>
            <Switch on={kind}>
                <Case when="info"><Title text="Info" /></Case>
                <Default>         <Title text="—"    /></Default>
            </Switch>
        </VBox>
    ));
}
```

`withScope` is **synchronous**: it pushes a merged scope on entry and restores the parent on `fn`'s synchronous return *and on exception*. An `await` inside the callback would leak the scope across the boundary, plugins that need scope-with-await must wrap their own `withAsyncScope` around an `AsyncLocalStorage`.

### The smallest plugin imaginable

```tsx
import {
    defineSentinel,
    isSentinelNode,
    type ChildrenProcessor
} from "@ui5-community/jsx-runtime";

export const Comment = defineSentinel<{ children?: unknown }>("Comment");

export const commentProcessor: ChildrenProcessor = {
    matches: (child) => isSentinelNode(child) && child.tag === Comment,
    process: () => { /* drop everything inside */ }
};
```

The plugin imports four symbols from the runtime SPI. That is the entire surface a plugin author has to learn.

### Plugin contract, guarantees

1. **The core never imports `sap.m` / `sap.f` / `sap.tnt` / `sap.fe`.** Every library- or framework-specific feature is a plugin.
2. **Every plugin is independently retirable.** Deleting the folder leaves the runtime unchanged.
3. **`withScope` restores on synchronous return and on exception.** Concurrent JSX calls are safe because each opens its own scope.
4. **Sentinel directives are JSX-typed.** `defineSentinel<P>(name)` propagates `P` through `LibraryManagedAttributes`, so `<Switch on={...}>...</Switch>` is checked at compile time the same way `<Button text={...}/>` is.

## Type story

- `JSX.Element = any`. JSX expressions are typed as `any` so they can satisfy any concrete named-aggregation slot. Per-prop validation is unaffected; it flows through `LibraryManagedAttributes` (below), which keeps the strong per-control typing. This is the same trade-off React makes via the opaque `React.ReactElement`.
- `LibraryManagedAttributes<C, _P>` extracts the `$XSettings` interface from each control's constructor via `ConstructorParameters` inference. `@openui5/types` already publishes those interfaces, generated from each control's metadata, so the runtime gets per-control typing for properties, named aggregations, associations, and event payloads with **no codegen step in this repo**.

## Caveats

- **Async `createContent`**. If you read a class field inside `createContent`, defer JSX construction with `Promise.resolve().then(...)`. `super()` runs `createContent()` before class field initializers.
- **`withScope` is synchronous.** Don't `await` inside the callback.
- **Plugin sentinels need their scope.** A `<Switch>` outside a `withScope({ childrenProcessors: [switchProcessor] }, …)` call will throw from the sentinel's call body.
