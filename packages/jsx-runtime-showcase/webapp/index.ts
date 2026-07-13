import ComponentContainer from "sap/ui/core/ComponentContainer";
import { preloadOtherTheme } from "./util/theme";

/**
 * Application bootstrap.
 *
 * Called from `index.html` via
 * `data-sap-ui-oninit="module:ui5/community/jsx/showcase/index"`,
 * meaning this module loads as soon as UI5 has finished its own
 * initialisation.
 *
 * Two things happen at module load:
 *
 *  1. Inject the app's global stylesheet through
 *     `sap.ui.require.toUrl` so the URL resolves correctly in dev,
 *     dist-preview, and any hosted-with-a-prefix deployment.
 *  2. Mount the Component's `ComponentContainer` into `#content`
 *     immediately. The router (see `manifest.json`) decides which
 *     view is shown, `""` → Welcome, `#/learn/*` / `#/explore/*` →
 *     Explorer shell.
 *
 * The static `#jsx-splash` element in `index.html` stays visible
 * until the Component's `componentCreated` event fires, at that
 * point we fade the splash out and remove it from the DOM.
 */
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = sap.ui.require.toUrl("ui5/community/jsx/showcase/css/style.css");
document.head.appendChild(link);

const container = new ComponentContainer({
	name: "ui5.community.jsx.showcase",
	settings: { id: "showcase" },
	async: true,
	manifest: true,
	componentCreated: onComponentReady
});
container.placeAt("content");

/**
 * Fade out and remove the splash once the Component is ready.
 * `componentCreated` fires after the async component finishes
 * initialising, which means the router has been created and the
 * first view is (or is about to be) mounted. The 200 ms opacity
 * transition is driven by CSS in `index.html`.
 */
function onComponentReady(): void {
	// Warm the browser cache with the opposite theme's library CSS at
	// idle, so the first theme toggle swaps to already-cached
	// stylesheets (~instant) instead of a cold multi-file fetch. Kept
	// off the critical path via requestIdleCallback (falls back to a
	// short timeout where unsupported).
	const warm = (): void => preloadOtherTheme();
	const ric = (window as typeof window & {
		requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
	}).requestIdleCallback;
	if (typeof ric === "function") {
		ric(warm, { timeout: 2000 });
	} else {
		setTimeout(warm, 600);
	}

	const splash = document.getElementById("jsx-splash");
	if (!splash) return;
	splash.hidden = true;
	// After the transition ends, remove the element entirely so it
	// no longer occupies stacking context / accessibility tree.
	setTimeout(() => {
		splash.parentNode?.removeChild(splash);
	}, 300);
}
