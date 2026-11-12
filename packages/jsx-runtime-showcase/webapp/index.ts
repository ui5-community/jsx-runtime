import ComponentContainer from "sap/ui/core/ComponentContainer";
import type { ComponentContainer$ComponentFailedEvent } from "sap/ui/core/ComponentContainer";
import Log from "sap/base/Log";
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
 *     immediately. The component initializes its router normally; the
 *     asynchronous container waits for the component's async content
 *     creation, including HTML preload, before mounting its content.
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
	componentCreated: onComponentReady,
	componentFailed: onComponentFailed
});
container.placeAt("content");

/**
 * Remove the splash once async component content creation (including HTML
 * preload) has completed. This callback does not initialize routing or perform
 * an additional preload wait.
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

/** HTML preload/content failures reject component creation; its content is not mounted. */
function onComponentFailed(event: ComponentContainer$ComponentFailedEvent): void {
	const reason = event.getParameter("reason");
	Log.error(
		"Showcase component creation failed.",
		reason instanceof Error ? reason.message : String(reason),
		"ui5.community.jsx.showcase.index"
	);
	event.preventDefault(); // This handler reports the failure; avoid duplicate framework logging.
	const hint = document.querySelector(".jsx-splash-hint");
	if (hint) hint.textContent = "Unable to start the showcase. Check the connection and reload.";
	const spinner = document.querySelector<HTMLElement>(".jsx-splash-spinner");
	if (spinner) spinner.hidden = true;
}
