---
"@ui5-community/jsx-runtime": patch
---

Fix: forwarded default aggregations (e.g. `sap.m.Menu#items`) now work in
JSX without an explicit `id` on the control.

Controls that forward their default aggregation to an internal child
(resolved by id in `init()`) previously crashed with a `TypeError` when
JSX children were passed in the single-shot `new Type(settings)` call.
The runtime now detects a forwarded default aggregation via
`metadata.getAggregation(name)?.forwarding` and defers concrete children
to a post-construction `addAggregation` call, matching how XMLView fills
such aggregations. Closes #9.
