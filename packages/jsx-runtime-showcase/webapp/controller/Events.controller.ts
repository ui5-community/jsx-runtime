import Controller from "sap/ui/core/mvc/Controller";
import type JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Controller for the EventsShowcase view. The `.onDotPress` method
 * below is what the runtime's dot-handler intrinsic resolves against
 * for `press=".onDotPress"` on the .dotHandler button.
 *
 * @namespace ui5.community.jsx.showcase.controller
 */
export default class Events extends Controller {
	public onDotPress(): void {
		const model = this.getView()?.getModel() as JSONModel;
		model.setProperty("/status", "Dot handler clicked");
	}
}
