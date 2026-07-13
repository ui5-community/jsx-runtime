#!/usr/bin/env node
/**
 * auto-changeset — generate a changeset from conventional commits.
 *
 * Scans the commits between a base ref and HEAD, decides whether the
 * publishable library (`@ui5-community/jsx-runtime`) changed and at what
 * bump level, and writes a `.changeset/auto-<shortsha>.md` file so a PR
 * that forgot to run `pnpm changeset` still gets a release entry.
 *
 * This repo has exactly one publishable package. The showcase
 * (`@ui5-community/jsx-runtime-showcase`) is private + ignored by
 * changesets, so changes that touch ONLY the showcase (or only
 * docs/CI/root tooling) produce no changeset — matching what a human
 * would do.
 *
 * Bump level from the highest-ranked conventional commit touching the
 * library:
 *   - breaking (`type!:` or `BREAKING CHANGE:` in body) → major
 *   - `feat`                                            → minor
 *   - anything else (`fix`, `perf`, `refactor`, …)      → patch
 *
 * Usage:
 *   node scripts/auto-changeset.mjs [--since=<ref>] [--dry-run] [--verbose]
 *
 * Defaults to `--since=origin/main`. Exits 0 without writing when no
 * library-affecting commits are found (a no-op is not an error).
 *
 * No dependencies — plain Node + git.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LIB = "@ui5-community/jsx-runtime";
const LIB_PATH = "packages/jsx-runtime/";
const SHOWCASE_PATH = "packages/jsx-runtime-showcase/";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const changesetDir = join(repoRoot, ".changeset");

// --- args -------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const sinceArg = args.find((a) => a.startsWith("--since="));
const since = sinceArg ? sinceArg.slice("--since=".length) : "origin/main";

const log = (...m) => verbose && console.log(...m);

// --- git helpers ------------------------------------------------------------
function git(...gitArgs) {
	return execFileSync("git", gitArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
}

/** Resolve the merge-base so we only look at commits unique to this branch. */
function resolveBase(ref) {
	try {
		return git("merge-base", ref, "HEAD");
	} catch {
		// ref not available (e.g. shallow clone without origin/main); fall
		// back to the ref itself and let the range be best-effort.
		return ref;
	}
}

// --- bump ranking -----------------------------------------------------------
const RANK = { patch: 0, minor: 1, major: 2 };
const CONVENTIONAL = /^(\w+)(\([^)]*\))?(!)?:\s/;

/** Highest bump implied by a single commit's subject + body, or null. */
function bumpForCommit(subject, body) {
	const m = CONVENTIONAL.exec(subject);
	if (!m) return null;
	const type = m[1];
	const bang = Boolean(m[3]);
	if (bang || /(^|\n)BREAKING CHANGE:/.test(body)) return "major";
	if (type === "feat") return "minor";
	// fix, perf, refactor, revert, and anything else that reached here as a
	// library change is a patch. docs/ci/chore/test are filtered by path
	// before this is consulted (see main loop).
	return "patch";
}

// --- collect commits --------------------------------------------------------
const base = resolveBase(since);
log(`Base: ${base} (from --since=${since})`);

// One line per commit: <sha>\x1f<subject>. Body fetched separately per sha.
let rawLog;
try {
	rawLog = git("log", `${base}..HEAD`, "--no-merges", "--format=%H%x1f%s");
} catch (err) {
	console.error(`auto-changeset: git log failed: ${err.message}`);
	process.exit(1);
}

const commits = rawLog
	.split("\n")
	.filter(Boolean)
	.map((line) => {
		const [sha, subject] = line.split("\x1f");
		return { sha, subject };
	});

if (commits.length === 0) {
	log("No commits in range; nothing to do.");
	process.exit(0);
}

// --- decide bump ------------------------------------------------------------
let bump = null;
const reasons = [];

for (const { sha, subject } of commits) {
	const files = git("show", "--name-only", "--format=", sha)
		.split("\n")
		.filter(Boolean);
	const touchesLib = files.some(
		(f) => f.startsWith(LIB_PATH) && !f.startsWith(SHOWCASE_PATH)
	);
	if (!touchesLib) {
		log(`skip ${sha.slice(0, 7)} (${subject}) — no library files`);
		continue;
	}
	const body = git("show", "-s", "--format=%b", sha);
	const commitBump = bumpForCommit(subject, body);
	if (!commitBump) {
		log(`skip ${sha.slice(0, 7)} (${subject}) — not conventional`);
		continue;
	}
	reasons.push(`${subject}`);
	if (bump === null || RANK[commitBump] > RANK[bump]) bump = commitBump;
	log(`take ${sha.slice(0, 7)} → ${commitBump} (${subject})`);
}

if (bump === null) {
	console.log("auto-changeset: no library-affecting conventional commits — no changeset needed.");
	process.exit(0);
}

// --- already covered? -------------------------------------------------------
// If any existing changeset already bumps the library, don't add another.
function existingChangesetCoversLib() {
	if (!existsSync(changesetDir)) return false;
	for (const file of readdirSync(changesetDir)) {
		if (!file.endsWith(".md") || file.toLowerCase() === "readme.md") continue;
		const content = readFileSync(join(changesetDir, file), "utf8");
		// Frontmatter lists `"@ui5-community/jsx-runtime": <bump>`.
		if (content.includes(`"${LIB}"`) || content.includes(`'${LIB}'`)) return true;
	}
	return false;
}

if (existingChangesetCoversLib()) {
	console.log("auto-changeset: an existing changeset already covers the library — nothing to add.");
	process.exit(0);
}

// --- write ------------------------------------------------------------------
const headSha = git("rev-parse", "--short", "HEAD");
const fileName = `auto-${headSha}.md`;
const summary = reasons.length === 1 ? reasons[0] : `${reasons.length} changes:\n${reasons.map((r) => `- ${r}`).join("\n")}`;
const content = `---\n"${LIB}": ${bump}\n---\n\n${summary}\n`;

if (dryRun) {
	console.log(`auto-changeset (dry-run): would write .changeset/${fileName}\n`);
	console.log(content);
	process.exit(0);
}

if (!existsSync(changesetDir)) mkdirSync(changesetDir, { recursive: true });
writeFileSync(join(changesetDir, fileName), content);
console.log(`auto-changeset: wrote .changeset/${fileName} (${bump})`);
