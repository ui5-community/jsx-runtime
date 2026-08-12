The minimum-viable TSX view. A `Button` whose press handler is a
plain inline function. No model, no controller, no bindings. If
you only read one file in this showcase, read this one.

Babel's automatic JSX transform turns

```tsx
<Button text="Hi" press={() => MessageToast.show("hi")} />
```

into `_jsx(Button, { text: "Hi", press: () => ... })`, which the
runtime hands to UI5 as `new Button({ text: "Hi", press: () => ... })`.
A JSX expression is a **constructor call**, not a render description.
No virtual DOM, no reconciler, no re-render.

Concept reference: [Controls & JSX elements](#/learn/controls).

See also: [events-fn](#/explore/events-fn) — same button, typed event
payload; [binding-string](#/explore/binding-string) — introduce a
`JSONModel` and let UI5's reactivity replace the imperative handler.
