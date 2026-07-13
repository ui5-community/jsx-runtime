import Control from "sap/ui/core/Control";
import Core from "sap/ui/core/Core";

/**
 * # `<Mermaid>`, a UI5 control wrapper around mermaid.js (lazy-loaded)
 *
 * Renders a mermaid diagram definition (flowchart, sequence, state, …)
 * as SVG inside a `<pre class="mermaid">` element. The `mermaid`
 * library is only fetched when the *first* instance actually needs to
 * render. Landing and Explore samples that never mount a `<Mermaid>`
 * don't pay the ~1-2 MB cost.
 *
 * ## Lazy-load strategy
 *
 * The reference app at `.../ui5.app.tsx/webapp/control/Mermaid.tsx`
 * imports `mermaid` at the top of the file. `ui5-tooling-modules`
 * then wraps the whole npm bundle into an AMD module that loads
 * eagerly whenever anything reaches this file. Two changes here move
 * the fetch to first-use:
 *
 *  1. The mermaid import lives inside a `loadMermaid()` helper that
 *     resolves via `sap.ui.require(["mermaid"], …)` and caches the
 *     module object. Nothing outside the helper references `mermaid`
 *     at module load.
 *  2. `initMermaid`, the `attachThemeChanged` handler, and
 *     `onAfterRendering` all await `loadMermaid()` before calling
 *     `initialize` / `run`. The synchronous renderer (which just
 *     emits `<pre class="mermaid">definition</pre>`) still runs
 *     without mermaid, the SVG hydration is what defers.
 *
 * Views compose this with `util/lazyMermaid.ts::createMermaid()`, a
 * dynamic import of *this module*, so both the control class and its
 * transitive `mermaid` npm dep stay unloaded until the first diagram
 * mounts.
 *
 * ## Theming
 *
 * Mermaid's `theme: "base"` accepts a `themeVariables` object that
 * overrides its individual palette entries. We resolve UI5's own
 * Horizon CSS variables (`--sapButton_Emphasized_Background`,
 * `--sapTextColor`, etc.) via `getComputedStyle(document.body)` and
 * feed them into that map, so the diagram picks up the same accent /
 * border / text colours the rest of the app uses. A
 * `Core.attachThemeChanged` listener re-runs the initialisation on
 * theme switch and repaints every mounted instance.
 *
 * Ported from `webapp/control/Mermaid.tsx` in the reference app.
 *
 * @namespace ui5.community.jsx.showcase.control
 */

// The mermaid module's shape narrowed to what we use. Kept structural
// so this file doesn't need `@types/mermaid`, it looks up the module
// via `sap.ui.require` at runtime.
type MermaidLike = {
	initialize(config: unknown): void;
	run(opts: { nodes: HTMLElement[] }): Promise<void>;
};

/**
 * Cached module handle. `null` until the first `loadMermaid()` call
 * resolves; then the resolved object stays for the rest of the page.
 */
let mermaidModule: MermaidLike | null = null;
let mermaidLoading: Promise<MermaidLike> | null = null;

/**
 * Asynchronously fetch and cache the `mermaid` module via UI5's AMD
 * loader. The first call kicks off the fetch; concurrent callers
 * share the same in-flight promise; every subsequent call returns
 * the cached module synchronously (wrapped in a resolved promise).
 */
function loadMermaid(): Promise<MermaidLike> {
	if (mermaidModule) return Promise.resolve(mermaidModule);
	if (mermaidLoading) return mermaidLoading;
	mermaidLoading = new Promise<MermaidLike>((resolve, reject) => {
		// `ui5-tooling-modules` bundles `mermaid` under the app's own
		// namespace via `addToNamespace: true` (see ui5.yaml), so the
		// AMD id is the ns-prefixed path, not the raw npm package
		// name (that path only resolves in dev mode).
		sap.ui.require(
			["ui5/community/jsx/showcase/thirdparty/mermaid"],
			(mod: unknown) => {
				const m = mod as { default?: MermaidLike } & MermaidLike;
				mermaidModule = m.default ?? m;
				resolve(mermaidModule);
			},
			(err: unknown) => reject(err instanceof Error ? err : new Error(String(err)))
		);
	});
	return mermaidLoading;
}

/**
 * Fixed palette used for every mermaid render. Mermaid diagrams
 * previously read UI5's CSS variables so they matched the app's
 * theme; that produced dark-on-dark rendering (the node fills use
 * the accent tone, and dark-mode accent + dark background compete
 * for contrast) and made the diagrams jump every time the user
 * toggled the theme. Pinning a light palette here keeps every
 * diagram legible against the solid white surface behind it (see
 * the `mermaid-frame` wrap in `renderer` below), independent of
 * the surrounding UI theme.
 *
 * Deliberately not derived from `getComputedStyle(document.body)`
 * so the palette can't drift between renders. The colours below
 * are the Horizon "light" values UI5 itself uses.
 */
function fixedLightPalette(): Record<string, string> {
	return {
		background: "#ffffff",
		primaryColor: "#0070f2",
		primaryTextColor: "#ffffff",
		primaryBorderColor: "#0854a0",
		secondaryColor: "#eff1f2",
		secondaryTextColor: "#131e29",
		secondaryBorderColor: "#cccccc",
		tertiaryColor: "#eff1f2",
		tertiaryTextColor: "#131e29",
		tertiaryBorderColor: "#cccccc",
		lineColor: "#131e29",
		textColor: "#131e29",
		nodeBorder: "#cccccc",
		nodeTextColor: "#131e29",
		clusterBkg: "#f5f6f7",
		clusterBorder: "#cccccc",
		titleColor: "#131e29",
		edgeLabelBackground: "#ffffff"
	};
}

/**
 * (Re)initialise mermaid with the fixed light palette. Idempotent,
 * safe to call multiple times. Called from `onAfterRendering` and
 * from the `themeChanged` handler (the latter is only kept so mermaid
 * can re-emit any recomputed edge-label backgrounds; the palette
 * itself never varies).
 */
async function initMermaid(): Promise<void> {
	const m = await loadMermaid();
	m.initialize({
		startOnLoad: false,
		theme: "base",
		themeVariables: fixedLightPalette(),
		securityLevel: "loose",
		flowchart: { htmlLabels: true, curve: "basis" }
	});
}

/**
 * Registry of live Mermaid control instances so we can find them all
 * on a theme change and force a redraw.
 */
const liveInstances = new Set<Mermaid>();

/**
 * True after the first call to `initMermaid()` has completed and the
 * theme-change listener has been attached. Guards against duplicate
 * listener installation across the (rare) case where multiple views
 * are constructed before the first `onAfterRendering` fires.
 */
let themeListenerAttached = false;

function attachThemeListenerOnce(): void {
	if (themeListenerAttached) return;
	themeListenerAttached = true;
	Core.attachThemeChanged(() => {
		void (async () => {
			await initMermaid();
			const m = mermaidModule;
			if (!m) return;
			for (const inst of liveInstances) {
				const outer = inst.getDomRef();
				const el = outer?.querySelector<HTMLElement>("pre.mermaid");
				if (!el) continue;
				el.removeAttribute("data-processed");
				el.textContent = inst.getDefinition() ?? "";
				m.run({ nodes: [el] }).catch((error: unknown) => {
					console.error("Mermaid.run (theme change) failed:", error);
				});
			}
		})();
	});
}

export interface $MermaidSettings {
	definition?: string;
}

/**
 * @namespace ui5.community.jsx.showcase.control
 */
export default class Mermaid extends Control {
	static readonly metadata = {
		properties: {
			definition: { type: "string", defaultValue: "" }
		}
	};

	constructor(settings?: $MermaidSettings) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		super(settings as any);
	}

	getDefinition!: () => string;
	setDefinition!: (value: string) => this;

	static readonly renderer = {
		apiVersion: 2,
		render(rm: RenderManagerLike, control: Mermaid): void {
			// Strip common leading whitespace from every non-empty line
			// so authors can indent inline in JSX without breaking
			// mermaid's parser.
			const raw = control.getDefinition() ?? "";
			const lines = raw.replace(/\r\n/g, "\n").split("\n");
			const nonEmpty = lines.filter((l) => l.trim().length > 0);
			const minIndent = nonEmpty.length === 0
				? 0
				: Math.min(...nonEmpty.map((l) => {
					const m = l.match(/^(\s*)/);
					return m ? m[1].length : 0;
				}));
			const dedented = lines
				.map((l) => l.slice(minIndent))
				.join("\n")
				.trim();

			// Outer frame: a solid white surface that the diagram
			// paints on regardless of the surrounding theme. This
			// keeps diagrams legible in both light and dark mode
			// (mermaid's palette is pinned to light values above),
			// and stops the diagram from "disappearing" briefly
			// during the theme-swap transition when the page's
			// background flips underneath.
			rm.openStart("div", control);
			rm.class("jsx-showcase-mermaid-frame");
			rm.style("background", "#ffffff");
			rm.style("border", "1px solid #e5e7eb");
			rm.style("border-radius", "0.4rem");
			rm.style("padding", "0.75rem");
			rm.style("margin", "0.75rem 0");
			rm.style("overflow", "auto");
			rm.openEnd();

			rm.openStart("pre");
			rm.class("mermaid");
			rm.style("background", "transparent");
			rm.style("border", "none");
			rm.style("padding", "0");
			rm.style("margin", "0");
			rm.style("font-family", "inherit");
			rm.openEnd();
			rm.text(dedented);
			rm.close("pre");

			rm.close("div");
		}
	};

	init(): void {
		liveInstances.add(this);
	}

	exit(): void {
		liveInstances.delete(this);
	}

	onAfterRendering(): void {
		const outer = this.getDomRef();
		if (!outer) return;
		// The renderer wraps the diagram in a `.jsx-showcase-mermaid-frame`
		// div carrying the solid white surface. Mermaid renders into the
		// inner `<pre class="mermaid">`, so pick that up here.
		const el = outer.querySelector<HTMLElement>("pre.mermaid");
		if (!el) return;
		if (!(el.textContent ?? "").trim()) return;
		if (el.getAttribute("data-processed") === "true") {
			el.removeAttribute("data-processed");
		}
		void (async () => {
			const m = await loadMermaid();
			// First initialisation happens on the first render across
			// the whole app; the flag inside `initMermaid` is not
			// needed because mermaid's own `initialize` is idempotent.
			// We do gate the theme listener behind a boolean so we
			// only install one.
			await initMermaid();
			attachThemeListenerOnce();
			m.run({ nodes: [el] }).catch((error: unknown) => {
				console.error("Mermaid.run failed:", error);
			});
		})();
	}
}

type RenderManagerLike = {
	openStart(tag: string, control?: Control): RenderManagerLike;
	class(name: string): RenderManagerLike;
	style(name: string, value: string): RenderManagerLike;
	openEnd(): RenderManagerLike;
	text(text: string): RenderManagerLike;
	close(tag: string): RenderManagerLike;
};
