# How would you use this playground?

> **Internal artifact — not shipped in the playground.** This
> review lives at the repo root (alongside `docs/jsx-runtime.md`
> and `docs/requirements.md`) as a design note. It's honest
> feedback on the current state of the runtime + showcase, seen
> through three personas, and it's meant to drive the next
> iteration of the roadmap — not to be linked from the
> public-facing app.

Three personas keep coming up as we design this runtime. Below is
an honest walkthrough of the current state through each of their
eyes — what should delight them, where they'll hit friction, and
the concrete gaps that fall out. Consider this the review that
drives the next iteration; every "gap" is a candidate backlog
item.

## Maya — the React expert

**Background.** Maya writes React apps for a living. She reaches
for TypeScript, Vite, and Storybook by default. She's here to
help her team pick a UI framework for an enterprise dashboard,
and someone told her UI5 now has JSX.

### Expected delight

Opening the playground and seeing `.tsx` files, `jsxImportSource`,
`<VBox>{items.map(…)}</VBox>`, and an ESM-style build should feel
immediately familiar. No hidden `React.createElement`, no
"virtual DOM but different" reconciler she has to un-learn — just
"JSX expression becomes a constructor call, and UI5 handles the
rest". The **Nested TSX view** panel in
[Six ways to embed UIs](../packages/jsx-runtime-showcase/webapp/view/showcases/EmbedSix.tsx)
and the
[Structural directives](../packages/jsx-runtime-showcase/webapp/view/showcases/Structural.tsx)
sample together should land the model in a few minutes.

### Friction

She'll immediately ask three questions the docs don't yet
answer well:

- **"Where's HMR?"** Vite users expect edit-save-reload cycles
  under 200ms. The showcase runs `ui5 serve` with livereload,
  which is a full page reload — not React Fast Refresh. There's
  no HMR story documented.
- **"Where's `useState`, `useEffect`, `useMemo`?"** JSX views
  don't have hooks. State lives in a JSON model; effects live in
  controller lifecycle methods (`onInit`, `onExit`,
  `onBeforeRendering`, `onAfterRendering`); memoisation is
  handled by UI5's `applySettings` diff. Maya has to translate
  every reflex.
- **"Why is `press={this.onTap}` different from
  `onClick={this.onTap}`?"** Because the prop is looked up on the
  control's metadata, not against a DOM event map. Understandable
  once explained — but she wants a table.

### Gaps that fall out

- A **"Coming from React?"** primer. One page, one table:
  `useState → JSONModel`, `useEffect → onInit`,
  `useMemo → formatter bindings`, `useRef → View.byId`,
  `useContext → withScope`.
- A **hot-reload note** in the setup guide. If UI5's dev server
  doesn't do HMR, say so; document what "livereload" *does* do.
- **Storybook-style isolated component views** so she can review
  a single sample without the shell chrome around it.
- A **"React vs JSXView"** table alongside the existing
  "JSX vs XMLView" one shipped in the playground. Different
  concept map, same shape.

## Ben — the junior web developer

**Background.** Ben knows HTML and CSS solidly, has written some
plain JavaScript, and did a bootcamp exercise with React. His
company just decided to standardise on UI5. He landed here from a
Google search for "UI5 typescript getting started".

### Expected delight

The Welcome page's "See it live" strip is aimed straight at Ben —
he can *see* what a JSX view produces, side-by-side with its
source, before he installs anything. The three getting-started
steps (install → configure → open the sample) match the ceremony
he expects from any modern web tool.

### Friction

- **He needs a `create-ui5-jsx-app` scaffolder.** The setup guide
  is a five-file checklist. Reading it end-to-end, he'll open six
  browser tabs to hunt down `babel.config.json`, `tsconfig.json`,
  `ui5.yaml`, `package.json`, `index.html`, and the manifest.
- **The "why UI5" story is missing.** Every doc assumes UI5 is a
  given. Ben doesn't know why UI5 exists, so "here's the JSX
  runtime for UI5" answers a question he never asked.
- **Errors aren't friendly enough.** A typo in a
  `sap-icon://…` URL surfaces as "control renders with no icon" —
  no error in the console, no hint at the source.

### Gaps that fall out

- A **`npm create @ui5-community/jsx-app` scaffolder** that
  produces a hello-world skeleton in one command.
- A **"Your first component in 60 seconds"** doc that skips setup
  entirely — CodeSandbox / StackBlitz link, one file, one save.
- A **"Why UI5?"** paragraph at the top of the Welcome page or a
  short prose Learn topic — one paragraph, no jargon.
- **Screenshots in every Learn doc.** Ben scans; long code blocks
  are noise until he's seen the visual.
- **Better error messages** on the common footguns — icon URL
  typos, missing `manifest.json` "libs" entries, mis-cased
  aggregation names.

## Doris — the UI5 architect

**Background.** Doris has led UI5 apps at her company for eight
years. She's shipped Fiori Elements extensions, wrestled with
flexibility, and knows every corner of `ManagedObject`. She wants
to know whether this runtime is safe to add to a 200-view
codebase.

### Expected delight

The Overview headline — "no fork of UI5, plain
`new Control(settings)` calls, plugin SPI is sealed" — is aimed
at Doris. Reading the playground's "Runtime anatomy" and
"The Plugin SPI" she should see that this runtime is *additive*:
it composes with everything she already uses (bindings, models,
controllers, routing, manifest, flexibility) and doesn't intercept
UI5's own machinery.

### Friction

- **She wants numbers.** "How big is the runtime bundle? Is the
  Babel plugin a peer dep or bundled? What does the transpile
  add to app cold-start?" None of those numbers are stated.
- **She wants XML interop demos in production shape.** The
  Six-ways-to-embed sample shows the patterns — good — but she
  wants a *migration* doc: "step-by-step diff of converting one
  real XMLView to JSXView", including how `sap.ui.fl` (flexibility)
  and `sap.ui.core.CustomData` behave after the port.
- **She wants ESLint rules.** The runtime allows a lot of things
  the framework rejects at runtime (aggregations mis-cased,
  events not on the metadata, `class="…"` variants that don't
  exist). She wants an ESLint plugin that catches those at commit
  time.

### Gaps that fall out

- A **"Bundle & performance"** note in the Overview: runtime
  bundle size, Babel plugin ancillary cost, transpile time
  benchmark on a 100-view app.
- A **"Migrating an XMLView to JSXView"** Learn doc with a
  worked before/after diff. Cover: id prefixing, event handler
  parity, aggregations, `sap.ui.fl` container ids,
  `sap.ui.core.CustomData` survival.
- An **`@ui5-community/eslint-plugin-jsx-runtime`** scaffold
  (name TBD). At minimum: warn on aggregations without a
  matching metadata name; warn on event props not on the
  target's metadata; warn on `class="…"` that isn't a valid UI5
  or CSS class.
- A **CI integration note** — how to wire `ts-typecheck` +
  `eslint` + `ui5-linter` into a build so JSX views can't
  regress silently.

## What this document isn't

- It's not a promise to ship every gap in the next commit.
- It's not a critique of what the runtime does today — most of
  the delight items are already there, and the runtime's whole
  design ethos ("stay small, compose with UI5") is what makes
  the gaps small enough to work through one at a time.

## Next likely steps

If we picked the smallest, highest-value gap from each persona:

1. **Maya** — the "Coming from React?" primer. One page, one
   table.
2. **Ben** — a `npm create` scaffolder + a StackBlitz link on
   the Welcome page.
3. **Doris** — the "Migrating an XMLView to JSXView" Learn doc.

Any of those unlocks the next persona to onboard themselves.
