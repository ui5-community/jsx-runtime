import UIComponent from "sap/ui/core/UIComponent";
import type Control from "sap/ui/core/Control";
import { preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

import { getMode, setMode } from "./util/theme";

/**
 * Root component of the showcase.
 *
 * `IAsyncContentCreation` makes asynchronous component creation await the
 * `createContent()` Promise. HTML modules are resolved before the manifest's
 * root view is created, with component ownership restored after the await.
 * Router initialization stays in synchronous `init()`, and TSX views keep
 * synchronous content creation so their automatic JSX view scopes are intact.
 *
 * @namespace ui5.community.jsx.showcase
 */
export default class Component extends UIComponent {
	public static metadata = {
		manifest: "json",
		interfaces: ["sap.ui.core.IAsyncContentCreation"]
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

	public async createContent(): Promise<Control | null> {
		await preloadSapHtml();
		if (this.isDestroyed()) {
			throw new Error("Showcase component was destroyed during HTML preload.");
		}
		return this.runAsOwner(() => super.createContent());
	}
}
