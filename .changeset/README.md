# Changesets

This repo uses [changesets](https://github.com/changesets/changesets) to
version and publish **`@ui5-community/jsx-runtime`** to npm. The showcase
(`@ui5-community/jsx-runtime-showcase`) is `private` and listed in the
`ignore` array of `config.json`, so it is never versioned or published —
it is deployed to GitHub Pages by `.github/workflows/deploy.yml` instead.

## Adding a changeset

Every PR that changes the library should include a changeset. Create one
with:

```sh
pnpm changeset
```

Pick the bump level (patch / minor / major) and write a short,
user-facing summary. This writes a markdown file into `.changeset/`;
commit it with your change.

Shortcuts:

- `pnpm changeset:auto` — generate a changeset automatically from your
  conventional commits since `origin/main` (run before opening the PR).
- `pnpm changeset:empty` — add an empty changeset for PRs that need no
  release entry (docs-only, CI, showcase-only). The CI "changeset
  present" gate accepts this.

## How a release happens

1. PRs merge to `main`, each carrying a changeset.
2. The **Release** workflow opens (or updates) a `chore(release): publish`
   PR that consumes the changesets, bumps the version, and updates
   `packages/jsx-runtime/CHANGELOG.md`.
3. Merging that PR publishes the new version to npm.

See `CONTRIBUTING.md` for the full flow.
