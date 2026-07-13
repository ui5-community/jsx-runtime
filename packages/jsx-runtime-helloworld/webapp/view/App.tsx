import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import App from "sap/m/App";

/**
 * Root view (converted from `App.view.xml`).
 *
 * Returns a single `sap.m.App`, UI5's top-level container. The router
 * (see [manifest.json](../manifest.json)) targets this control's
 * `pages` aggregation via `controlId: "app"`.
 *
 * The paired `App.controller.ts` is loaded via
 * `getControllerModuleName()`; its `onInit` applies the component's
 * content-density class to this view, exactly as the XML view did
 * through `controllerName`.
 *
 * @namespace ui5.community.jsx.helloworld.view
 */
export default class AppView extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	getControllerModuleName(): string {
		return "ui5/community/jsx/helloworld/controller/App";
	}

	createContent(): Control {
		return <App id="app" />;
	}
}
