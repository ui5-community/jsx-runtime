Handler as a direct function reference (`press={this.onShow}`),
not a dot-handler string. The runtime hands UI5 the
`[fn, listener]` settings-array shape, so `this` inside the
handler resolves to the surrounding view's controller. **No
`.bind(this)` at the call site.**

Function references also carry a **typed event payload**:

```tsx
liveChange={(e: Input$LiveChangeEvent): void => {
    const value = e.getParameter("value") ?? "";
}}
```

`Input$LiveChangeEvent`, `Button$PressEvent`, etc. ship from
`@openui5/types`. Dot-handler strings work too, but lose the
compile-time payload check.

Concept reference: [Events](/#/learn/events).

See also: [events-dot](/#/explore/events-dot) — dot-notation
alternative that survives controller swaps;
[prop-typing](/#/explore/prop-typing) — how the typed event payloads
compose with the rest of the `$XSettings` surface.
