/**
 * Prism bootstrap module: (a) assigns the imported Prism namespace to
 * `globalThis.Prism`, (b) injects Prism's stylesheet chosen by the
 * active UI5 theme, (c) asynchronously loads the grammar files for
 * the languages the app uses, and (d) reacts to `Core.attachThemeChanged`
 * by swapping the stylesheet href, no re-highlight needed, the CSS
 * engine repaints tokens automatically.
 *
 * ## Why this file exists
 *
 * Prism's language files are legacy UMD scripts that reference `Prism`
 * as a free identifier at their top level (`Prism.languages.tsx = {…}`).
 * `ui5-tooling-modules` wraps each module for the AMD loader. AMD
 * resolves all of a module's declared dependencies in parallel, so
 * simply putting a "set the global first" import above the grammar
 * imports doesn't help: they all evaluate together, and the grammar
 * files find `Prism` undefined.
 *
 * The two-step here breaks that parallelism:
 *
 *   1. **Synchronous** (this module's top level): install the global,
 *      inject the stylesheet.
 *   2. **Asynchronous** (`grammarsReady`): use `sap.ui.require` to
 *      load the grammar files *after* the global is definitely set.
 *      The returned promise is what `CodeBlock` awaits before it
 *      calls `Prism.highlightElement` for the first time.
 *
 * `CodeBlock` doesn't import the grammar files directly; it awaits
 * `grammarsReady` in its first-render path.
 *
 * Ported from `webapp/control/install-prism-global.ts` in the
 * reference app at `/Users/d039071/SAPDevelop/_work/tsx/ui5.app.tsx/`.
 */
import * as Prism from "prismjs";
import Core from "sap/ui/core/Core";
import type Event from "sap/ui/base/Event";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Prism = Prism;

/**
 * Base path under which `ui5-tooling-modules` copies bundled npm
 * sub-modules, the `addToNamespace: true` + `includeAssets` combo
 * lands the prism grammars at
 * `ui5.community.jsx.showcase/thirdparty/prismjs/components/prism-*.js`
 * (see [ui5.yaml](../../ui5.yaml)). Building the AMD id from that
 * root at runtime keeps this file's grammar list co-located with
 * the eventual `sap.ui.require` call and avoids hard-coding the
 * ns-prefixed strings.
 */
const PRISM_NS = "ui5/community/jsx/showcase/thirdparty/prismjs";

function themeStylesheetFor(uiTheme: string): string {
	// Horizon dark, high-contrast dark → Prism Tomorrow (dark, muted).
	// Horizon light, everything else → Prism default (light).
	const isDark = /dark|hcb/i.test(uiTheme);
	return isDark ? `${PRISM_NS}/themes/prism-tomorrow.css` : `${PRISM_NS}/themes/prism.css`;
}

/**
 * Inject or update the stylesheet `<link>` tag. Called once
 * synchronously at module load and again on every
 * `attachThemeChanged` event. Idempotent: guards against duplicate
 * injection by keying on a well-known id.
 */
function applyStylesheet(uiTheme: string): void {
	if (typeof document === "undefined") return;
	// `sap.ui.require.toUrl` resolves the module path to the actual
	// dev-server / dist URL. Using this instead of a hard-coded
	// `/resources/…` path survives base-URL changes (subdirectory
	// hosting, self-contained builds, CDNs).
	const href = sap.ui.require.toUrl(themeStylesheetFor(uiTheme));
	let link = document.getElementById(linkId) as HTMLLinkElement | null;
	if (link) {
		if (link.href !== href) {
			link.href = href;
		}
		return;
	}
	link = document.createElement("link");
	link.id = linkId;
	link.rel = "stylesheet";
	link.href = href;
	document.head.appendChild(link);
}

const linkId = "prismjs-default-theme";

// First application, read whatever theme is active right now.
applyStylesheet(Core.getConfiguration().getTheme());

// React to future theme switches. The event.parameter carries the
// new theme name; refresh the stylesheet if it maps to a different
// prism file.
Core.attachThemeChanged((event: Event) => {
	const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
	const nextTheme = (eventWithGeneric.getParameter("theme") as string) || Core.getConfiguration().getTheme();
	applyStylesheet(nextTheme);
});

/**
 * Resolves when the grammar files for markup / TS / JSX / TSX / bash
 * have been loaded and registered on `Prism.languages`. `CodeBlock`
 * awaits this once (per instance) before calling
 * `Prism.highlightElement`; the promise is cached across all
 * instances so we only pay for the fetches once.
 *
 * Loaded serially, not in parallel, because Prism grammars have
 * ordering dependencies at evaluation time, `prism-tsx.js`
 * extends `Prism.languages.jsx` at its top level, so `prism-jsx`
 * must be registered first. A single `sap.ui.require([...], cb)`
 * with a long array can resolve the modules in any order, so we
 * chain them one at a time.
 */
export const grammarsReady: Promise<void> = (async () => {
	await requireOne(`${PRISM_NS}/components/prism-markup`);
	await requireOne(`${PRISM_NS}/components/prism-clike`);
	await requireOne(`${PRISM_NS}/components/prism-javascript`);
	await requireOne(`${PRISM_NS}/components/prism-typescript`);
	await requireOne(`${PRISM_NS}/components/prism-jsx`);
	await requireOne(`${PRISM_NS}/components/prism-tsx`);
	await requireOne(`${PRISM_NS}/components/prism-bash`);
	await requireOne(`${PRISM_NS}/components/prism-markdown`);
})();

/** Promise wrapper around `sap.ui.require` for a single module. */
function requireOne(name: string): Promise<void> {
	return new Promise((resolve, reject) => {
		sap.ui.require(
			[name],
			() => resolve(),
			(err: unknown) => reject(err instanceof Error ? err : new Error(String(err)))
		);
	});
}
