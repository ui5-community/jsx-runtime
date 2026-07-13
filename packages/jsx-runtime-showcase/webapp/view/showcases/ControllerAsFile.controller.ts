import Controller from "sap/ui/core/mvc/Controller";
import type { Input$LiveChangeEvent } from "sap/m/Input";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Chapter 15 (controller). ControllerAsFile.controller.ts
 *
 * The **recommended** production pattern: the view is a declarative TSX
 * file that returns a control tree; the controller is a separate
 * `*.controller.ts` file that holds state, handlers, and lifecycle. The
 * pair mirrors the XMLView convention exactly, only the view syntax
 * changed.
 *
 * ## What lives here (and not in the view)
 *
 *  - **Model wiring.** `onInit` creates a `JSONModel` and sets it on the
 *    view, so all `{path>...}` bindings in the view resolve against it.
 *  - **Event handlers.** `.onLiveChange` and `.onGreet` are the
 *    "declaratively named" targets of the view's `press=".onGreet"` /
 *    `liveChange=".onLiveChange"` dot-handler strings.
 *  - **Business logic.** Anything else that isn't view-shape.
 *
 * ## Contrast with the sample-only pattern
 *
 * Most showcase samples override `getController(): this` on the view
 * class itself to keep the demo in one file. That is deliberate for
 * readability and explicitly **not** the recommended pattern for real
 * apps, [gotchas.md](../../../../../../docs/gotchas.md) calls it out.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class ControllerAsFileController extends Controller {
	onInit(): void {
		// Attach a view-local JSONModel under the named scope "form"
		// so bindings can address it as `{form>/…}`.
		const view = this.getView();
		if (view) {
			view.setModel(new JSONModel({ name: "" }), "form");
		}
	}

	onLiveChange(e: Input$LiveChangeEvent): void {
		// Typed event payload from `@openui5/types`, works because the
		// view wires `liveChange={this.onLiveChange}` at authoring time.
		const value = e.getParameter("value") ?? "";
		void value;
	}

	onGreet(): void {
		const model = this.getView()?.getModel("form") as JSONModel | undefined;
		const name = ((model?.getProperty("/name") as string) ?? "").trim();
		MessageToast.show(name === "" ? "Please enter a name first." : `Hello, ${name}!`);
	}
}
