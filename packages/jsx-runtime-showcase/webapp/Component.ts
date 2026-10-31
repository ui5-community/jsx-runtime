import UIComponent from "sap/ui/core/UIComponent";
import Log from "sap/base/Log";

import { getMode, setMode } from "./util/theme";
import { preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

/**
 * Root component of the showcase.
 *
 * The manifest declares `ui5.community.jsx.runtime` as a `libs`
 * dependency, so UI5 auto-loads the library before `init()` runs.
 *
 * `preloadSapHtml()` fetches the `sap.html` library and the
 * `sap/ui/core/html/TextContent` module (required for mixed
 * text+control children in native HTML JSX tags) before the
 * router opens any view.
 *
 * @namespace ui5.community.jsx.showcase
 */
export default class Component extends UIComponent {
	public static metadata = {
		manifest: "json"
	};

	public async init(): Promise<void> {
		super.init();
		// Reconcile UI5's runtime theme with the persisted (or
		// OS-derived) mode. The pre-paint resolver in
		// `webapp/index.html` sets the initial theme before UI5
		// boots; re-applying here fires `themeChanged` so Prism +
		// Mermaid + the CodeBlock have a consistent view of "the
		// theme has arrived" on first render.
		setMode(getMode());
		// Preload sap.html (and sap/ui/core/html/TextContent) so the
		// html plugin can resolve <div>/<span>/… synchronously at JSX
		// construction time in the NativeHtml sample view.
		// A failure (wrong framework version, network error) is non-fatal:
		// the app still works, but HTML-tag views will throw at construction
		// time with a clear "module not loaded" message instead of silently.
		try {
			await preloadSapHtml();
		} catch (err) {
			Log.error(
				"ui5/community/jsx/runtime/plugins/html: preloadSapHtml() failed — " +
				"native HTML tags (<div>, <span>, …) will not work in this session.",
				err instanceof Error ? err.message : String(err),
				"ui5.community.jsx.showcase.Component"
			);
		}
		this.getRouter().initialize();
	}
}
