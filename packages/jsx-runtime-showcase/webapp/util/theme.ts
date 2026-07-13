import Core from "sap/ui/core/Core";

/**
 * # theme, light / dark toggle for the showcase
 *
 * Two modes only: `"light"` or `"dark"`. On the very first visit
 * (no persisted value yet) we consult
 * `matchMedia("(prefers-color-scheme: dark)")` and pick the matching
 * mode as the default. Every subsequent click on the toolbar toggle
 * flips between the two and persists the choice to `localStorage`
 * under `jsx-showcase-theme`.
 *
 * ## Pre-paint synchronisation
 *
 * `webapp/index.html` runs a small inline script *before* the
 * `sap-ui-bootstrap` `<script>` executes. It resolves the same mode
 * (stored value if any, OS preference otherwise) and pins UI5's
 * theme via `data-sap-ui-theme` on the bootstrap tag, so the first
 * paint lands on the right theme without a "flash of light theme"
 * as it swaps to dark. This module owns the same logic for the
 * user's toggle clicks during the session.
 *
 * ## Downstream reactions
 *
 * `Core.applyTheme(name)` fires `attachThemeChanged`, which three
 * modules already listen for:
 *
 *  - Prism theme swap (webapp/control/install-prism-global.ts).
 *  - Mermaid palette recompute (webapp/control/Mermaid.tsx).
 *  - LearnDoc mermaid hydrator (webapp/view/LearnDoc.tsx).
 *
 * No explicit notification is needed, the UI5 event bus does it.
 */

/** The persisted / runtime mode. */
export type ThemeMode = "light" | "dark";

/** Concrete UI5 theme name applied at runtime. */
type Ui5Theme = "sap_horizon" | "sap_horizon_dark";

const STORAGE_KEY = "jsx-showcase-theme";
const LIGHT: Ui5Theme = "sap_horizon";
const DARK: Ui5Theme = "sap_horizon_dark";

/**
 * Read the effective mode. If nothing is persisted yet, fall back
 * to the OS-level `prefers-color-scheme` so a first-time visitor
 * on a dark desktop sees a dark app.
 */
export function getMode(): ThemeMode {
	if (typeof localStorage !== "undefined") {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === "light" || raw === "dark") return raw;
	}
	return prefersDark() ? "dark" : "light";
}

/**
 * Persist the mode and apply it. Fires UI5's `themeChanged` event
 * so downstream listeners pick up the switch.
 */
export function setMode(mode: ThemeMode): void {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, mode);
	}
	applyMode(mode);
}

/** Flip between light and dark. Returns the mode we landed on. */
export function toggleMode(): ThemeMode {
	const next: ThemeMode = getMode() === "light" ? "dark" : "light";
	setMode(next);
	return next;
}

/**
 * Resolve `mode` to a concrete UI5 theme name and apply it.
 *
 * Two side effects:
 *   1. `Core.applyTheme(target)` (only when the theme actually
 *      changes, to avoid firing `themeChanged` unnecessarily).
 *   2. `<html data-jsx-theme="light|dark">` so the small set of
 *      hand-authored HTML in the Welcome view (which UI5's CSS
 *      variables don't fully cover) has a stable, theme-agnostic
 *      hook to select against. Same attribute the pre-paint
 *      resolver in `index.html` writes.
 */
function applyMode(mode: ThemeMode): void {
	const target: Ui5Theme = mode === "dark" ? DARK : LIGHT;
	if (typeof document !== "undefined" && document.documentElement) {
		document.documentElement.setAttribute("data-jsx-theme", mode);
	}
	const current = Core.getConfiguration().getTheme();
	if (current === target) return;
	Core.applyTheme(target);
}

/** True if the OS-level dark-mode media query currently matches. */
export function prefersDark(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Warm the browser cache with the *other* theme's per-library CSS so
 * the first toggle is a cache hit (~instant) instead of a cold network
 * fetch of one stylesheet per loaded library.
 *
 * UI5 injects a `<link>` for every library under the *current* theme
 * only, e.g. `sap/m/themes/sap_horizon_dark/library.css`. Switching
 * rewrites each `href` to the opposite theme, and the browser must
 * fetch all of them — that's the multi-hundred-ms (cold: multi-second)
 * stall the theme-switch reveal would otherwise sit through. We derive
 * the opposite-theme URLs from the live `<link>`s and prefetch them.
 *
 * Best-effort and idempotent: call once after first paint (e.g. from a
 * `requestIdleCallback`). Missing/blocked prefetches just mean the
 * first switch pays the original cost — no correctness impact.
 */
export function preloadOtherTheme(): void {
	if (typeof document === "undefined") return;
	const currentUi5: Ui5Theme = getMode() === "dark" ? DARK : LIGHT;
	const other: Ui5Theme = currentUi5 === DARK ? LIGHT : DARK;
	const seen = new Set<string>();
	const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
	links.forEach((link) => {
		const href = link.href;
		if (!href.includes(`/themes/${currentUi5}/`)) return;
		const otherHref = href.replace(`/themes/${currentUi5}/`, `/themes/${other}/`);
		if (seen.has(otherHref)) return;
		seen.add(otherHref);
		const prefetch = document.createElement("link");
		// `prefetch` (not `preload`) — low priority, no console warning
		// if it isn't used within a few seconds, and it lands in the
		// HTTP cache so UI5's later `<link href>` swap is a cache hit.
		prefetch.rel = "prefetch";
		prefetch.as = "style";
		prefetch.href = otherHref;
		document.head.appendChild(prefetch);
	});
}

