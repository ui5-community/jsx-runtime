Deliberately **not** using bindings. The `<Input>`'s `liveChange`
writes into the mirror `<Text>` via `byId`; the press handler
reads the `<Input>` back via `byId`. Every state change goes
through manual plumbing.

This is the **foil**, included so the next two samples
(String data binding, Binding object) can show how much code
disappears when a `JSONModel` and binding strings replace the
byId round-trips. Compare against `binding-string` to feel the
difference.

Concept reference: [Data binding](/#/learn/data-binding).

See also: [binding-string](/#/explore/binding-string) — the same
value-mirroring, done with a `JSONModel` and two binding strings.
This sample is the deliberate foil for that one.
