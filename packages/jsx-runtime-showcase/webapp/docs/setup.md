# Setup

Install the runtime, add one transpile option, set two `tsconfig`
fields. No hand-authored Babel config. Total time: a minute or two.

## Prerequisites

- **Node.js ≥ 22.13** (the Node 22 LTS line).
- **A UI5 tooling project** on `@ui5/cli` ≥ 4 (a `ui5.yaml`), the
  standard setup for UI5 TypeScript apps.
- Targets **OpenUI5/SAPUI5 1.148+**; keep `@openui5/types` matched to
  your UI5 version (this showcase pins 1.148).

## Install

```sh
npm install @ui5-community/jsx-runtime
npm install -D @openui5/types @babel/plugin-transform-react-jsx@^7
```

Or with pnpm:

```sh
pnpm add @ui5-community/jsx-runtime
pnpm add -D @openui5/types @babel/plugin-transform-react-jsx@^7
```

`@openui5/types` drives [per-control prop typing](/#/learn/props-typing).
Match the version to your OpenUI5 target (`@openui5/types@1.148`
for OpenUI5 1.148). `@babel/plugin-transform-react-jsx` is what turns
your JSX into runtime calls — pin it to **v7** (`@^7`); the v8 major
changed the plugin API and the transform fails against it. It's an
optional peer dependency that `ui5-tooling-transpile` loads for you;
you never invoke it directly.

## JSX transform

You don't write a `.babelrc.json`. `ui5-tooling-transpile` (≥ 3.12)
assembles the whole Babel pipeline for you — `@babel/preset-typescript`
and `transform-ui5` (because a `tsconfig.json` is present),
`@babel/preset-env` (from your browserslist), and the JSX plugin — from
a single `transformJSX` option in [ui5.yaml](/#/learn/ui5-yaml):

```yaml
customConfiguration:
  config-ui5-tooling-transpile: &cfgTranspile
    transformJSX:
      runtime: automatic
      importSource: "ui5/community/jsx/runtime"
```

`runtime: "automatic"` tells Babel to inject
`import { jsx, jsxs } from "ui5/community/jsx/runtime/jsx-runtime"`
at the top of every `.tsx` file — you never write that import
yourself. `importSource` points at this runtime; the same string
lands in [tsconfig](/#/learn/tsconfig) so the type checker agrees.
Setting `transformJSX` also auto-extends the transpile `filePattern`
to pick up `.tsx`/`.jsx`. The full wiring (task + middleware) is on the
[ui5.yaml](/#/learn/ui5-yaml) page.

> **Using plain `.jsx` (no TypeScript)?** The `transformJSX` option
> above is the *only* required step. You can skip `@openui5/types` and
> the [tsconfig](/#/learn/tsconfig) page entirely — those exist solely
> for author-time type checking. The runtime consumes the `_jsx()`
> calls the transform emits, which are identical for `.jsx` and `.tsx`.

## Next

- [tsconfig](/#/learn/tsconfig): the two `compilerOptions` you
  need for JSX to type-check against `$XSettings`.
- [ui5.yaml](/#/learn/ui5-yaml): wire `ui5-tooling-transpile`
  so the UI5 build and dev server pick up your `.tsx` files.
