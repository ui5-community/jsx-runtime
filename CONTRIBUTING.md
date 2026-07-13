# Contributing

Thanks for wanting to contribute! This is a **pnpm-workspace monorepo**; every command listed below assumes you've cloned the repo and run `pnpm install` at the root.

## Prerequisites

- Node.js ≥ 22.13 (the Node 22 LTS line — the repo's baseline; a `.nvmrc` pins the major, so `nvm use` picks a compatible version)
- pnpm ≥ 11 (`corepack enable && corepack prepare pnpm@11.12.0 --activate`)

## Development loop

```bash
pnpm install         # install once
pnpm dev             # start the showcase (also the dev harness for the library)
```

The showcase depends on the library via `workspace:^`, so pnpm symlinks `node_modules/@ui5-community/jsx-runtime` → `packages/jsx-runtime`. Edits to `packages/jsx-runtime/src/` are picked up live by `ui5-tooling-transpile-middleware` and refreshed in the browser via `ui5-middleware-livereload`.

## Before you push

```bash
pnpm ts-typecheck    # runs tsc --noEmit in every workspace
pnpm lint            # runs eslint in every workspace
pnpm test            # runs ui5-test-runner (QUnit for the library, OPA5 for the showcase)
pnpm build           # builds both packages
```

CI (`.github/workflows/ci.yml`) runs the same sequence. Please make sure it's green locally before opening a PR.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, …; `type!:` or a
`BREAKING CHANGE:` footer for breaking changes). This is enforced two ways:

- **Locally** — `pnpm install` sets up [husky](https://typicode.github.io/husky/)
  hooks: `pre-commit` runs `lint-staged` (eslint on staged `.ts`/`.tsx`/`.mjs`/`.js`),
  `pre-push` runs `commitlint` on your commit message.
- **In CI** — `.github/workflows/commitlint.yml` validates commit messages
  on every push and PR.

Config is `.commitlintrc.json` (extends `@commitlint/config-conventional`).
CI sets `HUSKY_SKIP=true` so hooks don't run in the runners.

## Changesets

Every PR that changes the **library** must include a changeset — a small
markdown file describing the change and its release bump. CI fails a PR
without one (the "Changeset present" job in `ci.yml`).

```bash
pnpm changeset          # interactive: pick bump (patch/minor/major) + summary
pnpm changeset:auto     # or: generate one from your conventional commits
pnpm changeset:empty    # or: an empty changeset for changes that need no release
```

Use `changeset:empty` for docs-only, CI, or **showcase-only** changes —
the showcase is not published, so it never needs a real release entry.
Commit the generated `.changeset/*.md` file with your change. See
[.changeset/README.md](.changeset/README.md).

## Releasing the library to npm

Only `@ui5-community/jsx-runtime` is published; the showcase
(`@ui5-community/jsx-runtime-showcase`) is `private` and ignored by
changesets — it deploys to GitHub Pages via `.github/workflows/deploy.yml`
and never goes to npm.

Releases are automated by [changesets](https://github.com/changesets/changesets)
via `.github/workflows/release.yml` (runs on push to `main`):

1. PRs merge to `main`, each carrying a changeset.
2. The Release workflow opens (or updates) a **`chore(release): publish`**
   PR that runs `changeset version`: it consumes the changesets, bumps
   `packages/jsx-runtime/package.json`, and updates
   [packages/jsx-runtime/CHANGELOG.md](packages/jsx-runtime/CHANGELOG.md).
3. Review and merge that PR. On merge, the workflow runs `changeset publish`,
   which publishes the new version to npm and pushes the git tag.

`changeset publish` runs `npm publish` per package, so the library's
lifecycle hooks still fire:

1. **`prepublishOnly`** → `npm run clean && npm run build` — fresh `dist/`.
2. **`prepack`** → swaps the working-tree dev `ui5.yaml` for `ui5-dist.yaml`
   (paths at `dist/resources`, so an installed consumer's UI5 tooling
   discovers the library from `node_modules`; the dev config is backed up
   to `ui5.dev.yaml.bak`).
3. **`postpack`** → restores the dev `ui5.yaml`.

`publishConfig.access: public` makes the scoped package public. pnpm
rewrites the showcase's `workspace:^` dependency to a real semver range at
pack time, so no manual edit is needed.

### Repository setup (one-time)

The release workflow authenticates to npm via **OIDC trusted publishing**
(preferred — provenance, no long-lived secret): configure
`@ui5-community/jsx-runtime` as a trusted publisher on npmjs.org for this
repo's `release.yml` workflow. As a fallback, set an `NPM_TOKEN` repository
secret (an automation token with publish rights); the workflow writes it to
`~/.npmrc` when present. `GITHUB_TOKEN` (provided automatically) is used to
open the version PR and generate changelog links.

### Manual sanity check

To inspect the tarball without publishing:

```bash
pnpm --filter @ui5-community/jsx-runtime build
cd packages/jsx-runtime && npm pack --dry-run     # runs prepack/postpack
```

Assert: `ui5.yaml` is present and contains `src: dist/resources`; `LICENSE`
is present; no `dist/test-resources/**`; and `dist/index.d.ts` has no
`test-resources` references. After the run, confirm the working-tree
`ui5.yaml` is back to the dev config and no `ui5.dev.yaml.bak` remains.

## Adding a new showcase page

1. Add a `packages/jsx-runtime-showcase/webapp/view/MyShowcase.view.tsx` file. Copy an existing showcase (e.g. `SwitchShowcase.view.tsx`) as a starting point.
2. Register it in `webapp/manifest.json` under `sap.ui5.routing.targets`.
3. Add a matching route in `sap.ui5.routing.routes`.
4. (Optional) Add an OPA5 journey under `webapp/test/integration/` and register it in `opaTests.qunit.ts`.

## Adding a plugin to the library

Plugins live under `packages/jsx-runtime/src/plugins/<name>/`. Each plugin is a stand-alone folder with its own `index.tsx` / `index.ts` and `README.md`. The plugin MUST NOT import from `sap.m`, `sap.f`, or any other UI5 library, only from the runtime's SPI (`../runtime/plugin`, `../runtime/scope`, `../runtime/sentinel`).

Add matching QUnit tests under `packages/jsx-runtime/test/qunit/plugins/`.
