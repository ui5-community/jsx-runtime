import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import SapMApp from "sap/m/App";

/**
 * Root view. Replaces the former `App.view.xml`. Returns a single
 * `sap.m.App` control. UI5's canonical top-level container which
 * sets `height: 100%` on its wrapper and the placed-at content
 * element so nested `sap.m.Page` instances (and `sap.tnt.ToolPage`)
 * can occupy the full viewport.
 *
 * The router (see [manifest.json](../manifest.json)) targets this
 * control's `pages` aggregation via `controlId: "app"`. Two peer
 * targets exist:
 *
 *   * `landing` , the hero page (route `""`), no tnt chrome.
 *   * `explorer`, the `sap.tnt.ToolPage` shell (route `explorer/*`),
 *                  which itself hosts a nested `NavContainer` for
 *                  section content.
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export default class App extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		return <SapMApp id="app" />;
	}
}
