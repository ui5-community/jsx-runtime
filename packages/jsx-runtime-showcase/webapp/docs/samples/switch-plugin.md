A **plugin**: a `ChildrenProcessor` that adds new structural
directives without modifying the core runtime. The plugin ships
as a separate module
(`ui5.community.jsx.runtime.plugins.switch`); this view opts in
by wrapping the JSX construction in
`withScope({ childrenProcessors: [switchProcessor] }, () => …)`.

Outside that scope, `<Switch>` is just an unknown sentinel: the
runtime has no idea what it means, and throws a clear error at
JSX construction time (not a silent no-op).

**Two modes** (mirroring `<If>`):

- **Literal.** `on="warning"` picks the matching `<Case>` at
  construction time; non-matching branches never appear in the
  rendered tree.
- **Bound.** `on={{ path: "/kind" }}` emits every branch and
  binds each child's `visible` to a UI5 expression binding
  derived from the case's `when` value.

The plugin has **zero** imports from `sap.m` or any other UI
library: it binds `visible` on whichever child the author
supplied. Library-agnostic by construction.

Concept reference: [The Plugin SPI](/#/learn/plugin-spi) and
[Case study: <Switch>](/#/learn/switch-plugin).

See also: [structural](/#/explore/structural) — the built-in `<For>`
and `<If>` this plugin mirrors in shape; the SPI walkthrough at
`docs/cookbook.md` recipe 15.
