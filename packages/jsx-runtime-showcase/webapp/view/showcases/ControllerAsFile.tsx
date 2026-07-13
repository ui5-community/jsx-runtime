import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Title from "sap/m/Title";
import Input from "sap/m/Input";
import Button from "sap/m/Button";

import ControllerAsFileController from "./ControllerAsFile.controller";

/**
 * # Chapter 15. Controller as a separate file (recommended pattern)
 *
 * Every other sample folds view + controller into one class by
 * overriding `getController(): this`, which is convenient in a
 * single-file demo but not what a real app should do. This chapter
 * shows the **recommended** layout: the view is a declarative TSX
 * file returning a control tree, the controller lives beside it as
 * `ControllerAsFile.controller.ts`, and the view holds no logic.
 *
 * ## Wiring
 *
 * 1. Import the controller class: `import Ctrl from "./…controller"`.
 * 2. Instantiate it once and override `getController()` to return it.
 * 3. In the view, use dot-handler strings (`press=".onGreet"`) and
 *    plain binding strings (`value="{form>/name}"`). At fire time the
 *    runtime walks the parent chain to this view, asks
 *    `getController()`, and dispatches.
 *
 * `onInit` on the controller runs once the view is instantiated.
 * That's where the model gets attached; the view stays declarative.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class ControllerAsFile extends View {
	private readonly _controller = new ControllerAsFileController(
		"ui5.community.jsx.showcase.view.showcases.ControllerAsFile"
	);

	getAutoPrefixId(): boolean {
		return true;
	}

	// Real apps return a Controller instance from `getController()`, not
	// the view itself. The runtime's dot-handler walk resolves
	// `.onGreet` against this instance.
	getController(): Controller {
		return this._controller;
	}

	createContent(): Control {
		// Kick off `onInit` explicitly so the model is attached before
		// createContent's bindings resolve. In a routed app, UI5's own
		// view lifecycle would fire onInit for you.
		this._controller.onInit();

		return (
			<VBox class="sapUiSmallMargin">
				<Title text="View is declarative. Controller has the logic." level="H4" class="sapUiSmallMarginBottom" />
				<Text
					text="Same view+controller pattern as an XMLView, only the view syntax changed."
					class="sapUiSmallMarginBottom"
				/>
				<Input
					placeholder="Type a name…"
					value="{form>/name}"
					liveChange=".onLiveChange"
				/>
				<Button
					text="Greet"
					press=".onGreet"
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}
}
