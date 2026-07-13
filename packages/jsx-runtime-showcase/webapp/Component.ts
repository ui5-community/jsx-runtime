import UIComponent from "sap/ui/core/UIComponent";

import { getMode, setMode } from "./util/theme";

/**
 * Root component of the showcase.
 *
 * The manifest declares `ui5.community.jsx.runtime` as a `libs`
 * dependency, so UI5 auto-loads the library before `init()` runs.
 *
 * @namespace ui5.community.jsx.showcase
 */
export default class Component extends UIComponent {
	public static metadata = {
		manifest: "json"
	};

	public init(): void {
		super.init();
		// Reconcile UI5's runtime theme with the persisted (or
		// OS-derived) mode. The pre-paint resolver in
		// `webapp/index.html` sets the initial theme before UI5
		// boots; re-applying here fires `themeChanged` so Prism +
		// Mermaid + the CodeBlock have a consistent view of "the
		// theme has arrived" on first render.
		setMode(getMode());
		this.getRouter().initialize();
	}
}
