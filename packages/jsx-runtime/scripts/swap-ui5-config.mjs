/**
 * Pack-time UI5 config swap.
 *
 * The working-tree `ui5.yaml` is the DEV/BUILD config: it reads
 * TypeScript from `src/` and runs the transpile + modules tasks, and
 * the monorepo showcase live-transpiles those same sources through UI5
 * workspace resolution. A CONSUMER, however, installs the prebuilt
 * `dist/` and needs a `ui5.yaml` whose resource paths point at
 * `dist/resources` (see `ui5-dist.yaml`).
 *
 * `@ui5/project` only supports one `ui5.yaml` per package and its
 * workspace resolution takes a `path`, not an alternate config file,
 * so we cannot express both roles at once. Instead we swap at pack
 * time:
 *
 *   - `prepack`  (`--mode swap`):    ui5.yaml → ui5.dev.yaml.bak,
 *                                    ui5-dist.yaml → ui5.yaml
 *   - `postpack` (`--mode restore`): ui5.dev.yaml.bak → ui5.yaml
 *
 * npm runs `prepack` before building the tarball and `postpack` after,
 * for both `npm pack` and `npm publish`, so the published package
 * always carries the distribution config while the working tree keeps
 * the dev one. The swap is idempotent and self-healing: `restore` is a
 * no-op if the backup is absent, and `swap` refuses to clobber an
 * existing backup.
 */
import { existsSync, renameSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const devConfig = join(packageRoot, "ui5.yaml");
const distConfig = join(packageRoot, "ui5-dist.yaml");
const backup = join(packageRoot, "ui5.dev.yaml.bak");

// Accept `--mode swap`, `--mode=swap`, or a bare `swap`/`restore`.
const args = process.argv.slice(2);
let mode;
for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--mode") {
		mode = args[i + 1];
		break;
	}
	if (arg.startsWith("--mode=")) {
		mode = arg.slice("--mode=".length);
		break;
	}
	if (!arg.startsWith("-")) {
		mode = arg;
		break;
	}
}

function swap() {
	if (!existsSync(distConfig)) {
		throw new Error(`swap-ui5-config: missing ${distConfig}`);
	}
	if (existsSync(backup)) {
		// A previous pack didn't restore (e.g. crash). Leave the backup
		// as the source of truth and just re-assert the distribution config.
		copyFileSync(distConfig, devConfig);
		// eslint-disable-next-line no-console
		console.log("swap-ui5-config: backup already present; re-applied distribution ui5.yaml");
		return;
	}
	renameSync(devConfig, backup);
	copyFileSync(distConfig, devConfig);
	// eslint-disable-next-line no-console
	console.log("swap-ui5-config: swapped in distribution ui5.yaml (dev config → ui5.dev.yaml.bak)");
}

function restore() {
	if (!existsSync(backup)) {
		// eslint-disable-next-line no-console
		console.log("swap-ui5-config: no backup to restore; nothing to do");
		return;
	}
	renameSync(backup, devConfig);
	// eslint-disable-next-line no-console
	console.log("swap-ui5-config: restored dev ui5.yaml");
}

if (mode === "swap") {
	swap();
} else if (mode === "restore") {
	restore();
} else {
	throw new Error(`swap-ui5-config: unknown mode '${mode ?? ""}' (expected --mode swap|restore)`);
}
