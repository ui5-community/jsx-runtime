// Used by the root `prepare` script: `node ./.husky/skip.mjs || husky`.
// Exit 0 (success) when HUSKY_SKIP is set so the `|| husky` short-circuits
// and git hooks are NOT installed — this is how CI (which sets
// HUSKY_SKIP=true) avoids installing hooks. Locally HUSKY_SKIP is unset,
// so this exits 1 and `husky` runs to install the hooks.
process.exit(process.env.HUSKY_SKIP ? 0 : 1);
