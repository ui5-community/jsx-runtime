TypeScript checks every JSX prop against the target control's
`$XSettings` interface from `@openui5/types`. Typos, wrong enum
values, and mismatched types are compile-time errors, before
the runtime ever runs.

Two extras layer on top:

- Every event-shaped prop additionally accepts a `".dotHandler"`
  string literal.
- The standard HTML `class` attribute is legal on every UI5
  control; the runtime routes it through `addStyleClass`.

Uncomment any of the commented-out **TS-ERROR** lines in the
sample to see the compiler diagnostic in your IDE. No codegen
step: the types come straight from UI5's own control metadata.

Concept reference: [Props & TypeScript typing](/#/learn/props-typing).

See also: [type-coercion](/#/explore/type-coercion) — the runtime
side of typing (string-literal coercion to metadata types);
[binding-object](/#/explore/binding-object) — the `as never` cast for
binding-info objects.
