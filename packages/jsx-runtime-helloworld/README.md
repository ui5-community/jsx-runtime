# @ui5-community/jsx-runtime-helloworld

A minimal UI5 TypeScript application that consumes **[`@ui5-community/jsx-runtime`](../jsx-runtime/)** and authors its views as `.tsx`.

Unlike the [showcase](../jsx-runtime-showcase/) — which carries a lot of documentation machinery — this package is a plain, `@ui5/generator`-scaffolded app with the smallest possible set of changes needed to adopt the runtime. It is the reference answer to *"how do I use the JSX runtime in my own project from scratch?"* and doubles as an end-to-end integration check that the published package works as a normal dependency.

It is `private` and never published.

## What adopting the runtime takes

All of it is configuration; there is no runtime glue code to write.

1. **Depend on the package** — `package.json`:

   ```jsonc
   "dependencies": {
     "@ui5-community/jsx-runtime": "workspace:^"   // a normal version range when consumed from npm
   }
   ```

2. **Type-check the JSX** — [tsconfig.json](tsconfig.json):

   ```jsonc
   // tsconfig.json
   "jsx": "react-jsx",
   "jsxImportSource": "ui5/community/jsx/runtime",
   "types": ["@openui5/types", "@types/qunit", "@ui5-community/jsx-runtime"]
   ```

3. **Transpile `.tsx`, transform the JSX, and bundle the runtime** — [ui5.yaml](ui5.yaml): the `transformJSX` option enables `@babel/plugin-transform-react-jsx` (`runtime: automatic`, `importSource: "ui5/community/jsx/runtime"`) — no `.babelrc.json` needed; `ui5-tooling-transpile` assembles the rest of the Babel pipeline. `transpileDependencies: true` lets dev mode transpile the workspace-linked runtime sources on the fly, and `includeDependency: ui5.community.jsx.runtime` bundles the runtime's AMD modules into the build output.

Then views are just TSX — see [webapp/view/Main.tsx](webapp/view/Main.tsx), converted from a classic `Main.view.xml`. The full conversion walkthrough is in [docs/xmlview-to-tsx.md](../../docs/xmlview-to-tsx.md).

## Scripts

Run these from this package directory, or from the repo root via the `:helloworld` aliases (`pnpm dev:helloworld`, `pnpm test:helloworld`, …).

| Script | What it does |
| --- | --- |
| `npm run dev` | Serve on `http://localhost:8080` with live reload, transpiling `.tsx` (and the linked runtime) on the fly. No prior build needed. |
| `npm run dev-cdn` | Same, but bootstraps UI5 from the CDN (`index-cdn.html`). |
| `npm start` | Serve the app against a built (`ui5-dist.yaml`) configuration. |
| `npm run build` | Build the app into `dist/`. |
| `npm run build:opt` | Self-contained build (bundles the UI5 framework resources too). |
| `npm run ts-typecheck` | `tsc --noEmit` type check. |
| `npm run lint` | ESLint over `webapp`. |
| `npm test` | Lint + unit + OPA5 integration tests via `ui5-test-runner`. |

## License

[Apache License 2.0](LICENSE).
