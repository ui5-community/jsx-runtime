# What is JSX Runtime for UI5?

Write UI5 views as JSX — `.tsx` for the full TypeScript experience
(per-control prop typing, checked bindings and events), or plain
`.jsx` when you don't want TypeScript. Babel turns your JSX into
`_jsx(Control, settings)` calls, and this runtime turns those into
plain `new Control(settings)`, the same shape UI5's XMLView produces
at the end of its parse pipeline.

The runtime itself is identical either way — it operates on the
`_jsx()` calls Babel emits, which are the same for `.tsx` and `.jsx`.
TypeScript only adds author-time type checking on top; drop it and
everything below still works.

Everything downstream is UI5 exactly as before: metadata,
`applySettings`, bindings, aggregations, events. There is no
virtual DOM, no reconciler, no re-render loop. **A JSX
expression is a constructor call, not a render description.**
Reactivity comes from [UI5 bindings](#/learn/data-binding), same
as in an XML view.

## How it works

```mermaid
flowchart TB
    Author["<b>You write</b><br/><code>&lt;Page&gt;&lt;Button press='.onTap'/&gt;&lt;/Page&gt;</code>"]

    subgraph Build ["Build time"]
        TSC["<b>TypeScript checker</b><br/>reads <code>JSX</code> namespace<br/>+ <code>LibraryManagedAttributes</code><br/>→ per-control prop typing"]
        Babel["<b>Babel</b><br/>@babel/plugin-transform-react-jsx<br/>(<code>importSource: ui5/community/jsx/runtime</code>)<br/>emits <code>_jsx</code>/<code>_jsxs</code> calls"]
    end

    subgraph Run ["Runtime (in the browser)"]
        Jsx["<b>jsx() in the runtime</b><br/>type-discriminate, run handlers,<br/>construct via active Renderer"]
        Inst["<b>UI5 control instance</b><br/><code>new Page({content: new Button(…)})</code><br/>UI5's <code>applySettings</code> wires bindings + events"]
    end

    Author --> TSC
    TSC -->|"compiles<br/>(types are erased)"| Babel
    Babel -->|"<code>_jsx(Page, {children: _jsx(Button, {...})})</code>"| Jsx
    Jsx --> Inst

    style TSC fill:#e1f5ff,stroke:#0277bd,color:#131e29
    style Babel fill:#e1f5ff,stroke:#0277bd,color:#131e29
    style Jsx fill:#fff4e1,stroke:#f57c00,color:#131e29
    style Inst fill:#f1f8e9,stroke:#558b2f,color:#131e29
```

Three layers, each doing one job. Type checker keeps you honest
at author time. Babel emits calls. Runtime hands them to UI5.

## Ready?

[Your first TSX view](#/learn/first-view) shows the whole story
in ten lines of code. Then [Setup](#/learn/setup) wires the
build.
