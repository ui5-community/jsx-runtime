A view-local `JSONModel` registered under the named scope
`"form"`. The `<Input>`'s `value` and a sibling `<Text>`'s
`text` both bind to `"{form>/name}"`. UI5's binding system
keeps them in sync as the user types. No `liveChange` handler,
no `byId(...).setText(...)` round-trips.

Compare to the `no-bindings` foil: the entire mirroring
infrastructure collapses into two binding strings. That's the
whole pitch. UI5 already has the reactivity layer; JSX just
consumes it.

Named model scope (`form>`) keeps this view's model isolated
from any default model a parent view might attach later.

Concept reference: [Data binding](/#/learn/data-binding).

See also: [no-bindings](/#/explore/no-bindings) — the foil, same
mirroring done imperatively via `byId` + `setText`;
[binding-object](/#/explore/binding-object) — when the binding needs
more than a `path`; [structural](/#/explore/structural) — the same
binding syntax powering bound aggregations.
