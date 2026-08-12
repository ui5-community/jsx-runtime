# Events

Two ways to wire a handler.

## Dot-handler strings

```tsx
<Button text="Save" press=".onSave" />
```

At **fire time**, the runtime walks the button's parent chain
until it hits the surrounding `sap.ui.core.mvc.View`, asks for
its controller, and invokes `.onSave` on it. Same resolution
XMLView uses. The leading `.` matters: `press="onSave"` (no
dot) is a literal string, not a handler.

Reach for this when:

- The handler lives on a separate `*.controller.ts` file.
- The JSX subtree might be re-parented under a different view, and
  handlers rebind automatically.
- You're mounting a [fragment factory](#/learn/fragments) whose
  events should route back to the mounting view.

## Function references

```tsx
<Button text="Save" press={this.onSave} />
```

The runtime hands UI5 the `[fn, listener]` settings-array shape,
so `this` inside `onSave` resolves to the controller, no
`.bind(this)` needed.

Reach for this when:

- The handler is local to this view (view doubles as controller).
- You want the typed event payload:

```tsx
import Input, { type Input$LiveChangeEvent } from "sap/m/Input";

<Input liveChange={(e: Input$LiveChangeEvent): void => {
    const value = e.getParameter("value") ?? "";
}} />
```

Dot-handler strings lose that compile-time payload check.

## `.bind(this)`?

Redundant but harmless. A bound function's own `this` wins over
UI5's listener argument.

See both in [events-dot](#/explore/events-dot) and
[events-fn](#/explore/events-fn).
