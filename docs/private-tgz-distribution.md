# Private `.tgz` distribution

How to build a `.tgz` of **`@ui5-community/jsx-runtime`** locally and hand it to an
audience via a **private GitHub Release** — without publishing to public npm and without
touching the changesets/CI release pipeline.

## When to use this

Use this for an internal or pre-release handout: a workshop, a pilot team, or an early
adopter who should consume the library as a normal dependency but must not (yet) pull it
from the public registry.

- Nothing is published to npmjs.org.
- The changeset/CI release flow is untouched — no version bump is committed, no git tag is
  created by the release tooling.
- The library has **no runtime, peer, or `workspace:*` dependencies**, so the tarball
  installs standalone. Consumers only need to supply the surrounding UI5 environment
  themselves (see [What the consumer still needs](#what-the-consumer-still-needs)).

## 1. Build & pack locally

`npm pack` runs the `prepack`/`postpack` hooks but **not** `prepublishOnly`, so it does
**not** build the library. Build first, then pack:

```bash
# from the repo root — build the library (dist/ is gitignored, so this is required)
pnpm --filter @ui5-community/jsx-runtime build

cd packages/jsx-runtime

# optional but recommended: stamp an internal prerelease version so each handout is
# distinguishable and consumer lockfiles update cleanly. --no-git-tag-version means
# no commit and no tag are created.
npm version 0.1.0-internal.1 --no-git-tag-version

# pack — prepack swaps in the distribution ui5.yaml, postpack restores the dev one
npm pack        # -> ui5-community-jsx-runtime-0.1.0-internal.1.tgz

# restore the working-tree version so the internal stamp is never committed
npm version 0.1.0 --no-git-tag-version --allow-same-version
```

What the `prepack` hook does (via `scripts/swap-ui5-config.mjs`): the working-tree
`ui5.yaml` is the dev/build config that reads TypeScript from `src/`. A consumer installs
the prebuilt `dist/` and needs a `ui5.yaml` whose resource paths point at `dist/resources`
so UI5 tooling registers the library from `node_modules`. `prepack` backs up the dev
`ui5.yaml` and swaps in `ui5-dist.yaml`; `postpack` restores the dev one. The swap is
transparent — after packing, your working tree is unchanged.

The tarball ships exactly: `dist/resources/**`, `dist/index.d.ts`, `src/**`, `ui5.yaml`
(the distribution variant), `README.md`, `LICENSE`, and `package.json`. The QUnit
`dist/test-resources/**` is deliberately excluded.

## 2. Push as a private GitHub Release

Attach the `.tgz` to a release on a **private** repository. `gh` uses your existing
GitHub authentication.

```bash
gh release create v0.1.0-internal.1 \
  packages/jsx-runtime/ui5-community-jsx-runtime-0.1.0-internal.1.tgz \
  --repo ORG/PRIVATE-REPO --prerelease --notes "Internal build"
```

Notes:

- The repo (`ORG/PRIVATE-REPO`) must be private so the release asset is not publicly
  downloadable. It can be a dedicated distribution repo — it does not have to be this repo.
- To attach a new build to an existing release later, use `gh release upload` instead.

## 3. How consumers install it

Consumers reference the release-download URL as a remote-tarball dependency in their
`package.json`:

```jsonc
"dependencies": {
  "@ui5-community/jsx-runtime": "https://github.com/ORG/PRIVATE-REPO/releases/download/v0.1.0-internal.1/ui5-community-jsx-runtime-0.1.0-internal.1.tgz"
}
```

Then `npm install` / `pnpm install` as usual. The prebuilt tarball is installed as-is —
no build runs on the consumer's machine.

### Authenticating to a private release

A private repo's release asset is not anonymously downloadable, so the fetch needs a
GitHub token with `repo` read scope. Two options:

- **Tokenized URL** — append the token as a query parameter (simple, but the token ends up
  in `package.json`/lockfiles, so prefer this only for throwaway/CI use):

  ```
  https://github.com/ORG/PRIVATE-REPO/releases/download/v0.1.0-internal.1/ui5-community-jsx-runtime-0.1.0-internal.1.tgz?token=GHSAT...
  ```

- **`.npmrc` credential** — keep the clean URL in `package.json` and supply auth out of
  band via the consumer's `.npmrc` (token sourced from an env var, not committed):

  ```
  //github.com/:_authToken=${GITHUB_TOKEN}
  ```

### What the consumer still needs

The tarball is just the library. A consuming UI5 app must also wire up the JSX transform —
this is unchanged from any other install method and is documented in the library's
[README](../packages/jsx-runtime/README.md):

- `@openui5/types` installed (it is a devDependency here, **not** a declared peer).
- The JSX transform enabled via `ui5-tooling-transpile`'s `transformJSX` option in
  `ui5.yaml` (`runtime: automatic`, `importSource: "ui5/community/jsx/runtime"`), and tsconfig
  `jsx: "react-jsx"` / `jsxImportSource: "ui5/community/jsx/runtime"`. `transformJSX` pulls in
  `@babel/plugin-transform-react-jsx` — install it as an optional peer,
  `npm i -D @babel/plugin-transform-react-jsx@^7`; a newer (v8+) major changes the plugin API
  and the transform fails.
- The `ui5.community.jsx.runtime` library declared in the app's `manifest.json`.

The [`jsx-runtime-helloworld`](../packages/jsx-runtime-helloworld/) package is a complete
worked example of that wiring.

## 4. Sanity-check the tarball

Before handing it out, confirm the contents:

```bash
tar -tzf ui5-community-jsx-runtime-*.tgz | grep -E 'ui5.yaml|index.d.ts|test-resources'
```

Expect `package/ui5.yaml` and `package/dist/index.d.ts` to be present, and **no**
`test-resources` entries. To confirm the packed `ui5.yaml` is the distribution variant:

```bash
tar -xzOf ui5-community-jsx-runtime-*.tgz package/ui5.yaml | grep 'dist/resources'
```

That should print the `src: dist/resources` path line. You can also preview the full
contents without packing via `npm pack --dry-run` from `packages/jsx-runtime/`.

## 5. Using it

Install the library from its release URL, then add the Babel JSX transform (v7 — a v8+
major breaks the transform):

```bash
npm i @ui5-community/jsx-runtime@https://github.com/petermuessig/incubation/releases/download/v0.1.0-internal.1/ui5-community-jsx-runtime-0.1.0-internal.1.tgz

npm i -D @babel/plugin-transform-react-jsx@^7
```
