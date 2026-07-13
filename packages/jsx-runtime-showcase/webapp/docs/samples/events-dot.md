XML-view style event wiring: `press=".onPress"`, a string
starting with a dot. At fire time, the runtime walks the button's
parent chain until it hits the surrounding `sap.ui.core.mvc.View`,
asks for its controller, and invokes `.onPress` on it.

This view has no separate controller file; it doubles as its own
controller by overriding `getController(): this`. In real apps,
handlers live on a `*.controller.ts` file so the view stays
declarative; folding view + controller into one class is
convenient for a standalone sample, not a recommended pattern.

Concept reference: [Events](/#/learn/events).

See also: [events-fn](/#/explore/events-fn) — function-reference
alternative with typed event payload;
[fragment-dialog](/#/explore/fragment-dialog) — the same dot-handler
walk resolving across a mounted fragment.
