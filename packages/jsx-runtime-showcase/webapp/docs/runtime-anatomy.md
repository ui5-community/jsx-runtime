# Runtime anatomy

What happens between `_jsx(Button, {...})` and
`new Button({...})`. Five phases, in order.

## The five phases

```mermaid
flowchart TB
    In["<b>jsx(Button, { text: 'Hi', press: '.onTap' })</b>"]

    subgraph P1 ["Phase 1 — Dispatch"]
        D1{"type is<br/><b>string</b>?"}
        DH["→ <code>currentHtmlIntrinsic()</code>"]
        D2{"type is<br/><b>Fragment</b>?"}
        DF["→ <code>makeFragmentNode</code>"]
        D3{"type is<br/><b>&lt;For&gt;</b> / <b>&lt;If&gt;</b>?"}
        DFI["→ <code>makeForNode</code> / <code>makeIfNode</code>"]
        D4{"type is<br/><b>plugin sentinel</b>?"}
        DS["→ <code>makeSentinelNode</code>"]
        D5["type is a <b>control class</b><br/>continue ↓"]
    end

    subgraph P2 ["Phase 2 — Prop loop"]
        Loop["for each (key, value) in props"]
        IH{"<code>IntrinsicHandler</code><br/>claims it?"}
        IY["yes: transform<br/>+ maybe schedule hook"]
        IN["no: forward as-is"]
    end

    subgraph P3 ["Phase 3 — Children"]
        Kids["children present →<br/>ChildrenProcessors + flatten"]
    end

    subgraph P4 ["Phase 4 — Construct"]
        Render["<code>currentRenderer().construct(Button, settings)</code>"]
    end

    subgraph P5 ["Phase 5 — Post-construct"]
        Hooks["scheduled hooks run<br/>(<code>addStyleClass</code>, <code>ref</code>, <code>bindElement</code>)"]
        AppL{"<code>PropertyApplier</code><br/>claims a prop?"}
        AY["applier runs against instance"]
    end

    Out["<b>Button instance</b>"]

    In --> D1
    D1 -->|yes| DH
    D1 -->|no| D2
    D2 -->|yes| DF
    D2 -->|no| D3
    D3 -->|yes| DFI
    D3 -->|no| D4
    D4 -->|yes| DS
    D4 -->|no| D5
    D5 --> Loop
    Loop --> IH
    IH -->|yes| IY
    IH -->|no| IN
    IY --> Loop
    IN --> Loop
    Loop --> Kids
    Kids --> Render
    Render --> Hooks
    Hooks --> AppL
    AppL -->|yes| AY
    AY --> Out
    AppL -->|no| Out

    DH -.->|"return early"| Out
    DF -.->|"return early"| Out
    DFI -.->|"return early"| Out
    DS -.->|"return early"| Out

    style IH fill:#fff4e1,stroke:#f57c00,color:#131e29
    style AppL fill:#fff4e1,stroke:#f57c00,color:#131e29
    style Render fill:#fff4e1,stroke:#f57c00,color:#131e29
    style DH fill:#fff4e1,stroke:#f57c00,color:#131e29
```

## Phase 1: Dispatch

Figure out what `type` is:

- **string** (`"div"`) → hand off to `currentHtmlIntrinsic()`.
- **Fragment sentinel** (`<>…</>`) → marker node for the
  children pipeline.
- **`<For>`, `<If>`** → directive nodes for the children pipeline.
- **Plugin sentinel** (created by `defineSentinel<P>()`) →
  marker for a plugin's `ChildrenProcessor`.
- **Control class** → continue.

## Phase 2: Prop loop

For every `(key, value)` in props, ask each registered
`IntrinsicHandler` whether it claims it. First match wins. A
claimed handler transforms the entry (removing it from
settings, scheduling a post-construct hook, or both). Unclaimed
props flow to UI5's `applySettings`.

Core handlers: `class`, `ref`, `binding`/`bindElement`,
dot-handler event strings, and property type coercion.

## Phase 3: Children

Three passes:

1. `flattenSentinelLevel`: unwrap one layer of `<Fragment>`
   and arrays so directives surface.
2. `processChildren`: each child gets offered to the
   registered `ChildrenProcessor`s. First match wins.
3. `flattenChildren`: final cleanup. Drop `null`/`undefined`/
   `false`/`""`; resolve literal `<If>`; recursively unwrap.

Result: a clean list of UI5 controls ready for an aggregation.

## Phase 4: Construct

Hand `type` and `settings` to the active `Renderer`:

```
currentRenderer().construct(type, settings)
```

Default renderer: `new type(settings)`. A plugin renderer might
emit an XML string, a `RenderManager` thunk, or a captured
factory.

## Phase 5: Post-construct

With the instance in hand:

- Run scheduled hooks: `addStyleClass()` (from `class=`),
  `ref(instance)` (from `ref=`), `bindElement()` (from `binding=`).
- Offer each remaining prop to registered `PropertyApplier`s,
  useful when the prop needs the live instance (Promise-valued
  props, late-binding).

## Why this shape

Every phase reads from the active `Scope`. A [plugin](#/learn/plugin-spi)
adds its handler / processor / renderer / applier at
scope-open time, and the phase machinery consults the merged
registry. Bindings still route through `applySettings` in phase
4. The runtime never invents its own binding path.
