import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import type Dialog from "sap/m/Dialog";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Button from "sap/m/Button";

import FragmentDialog from "./FragmentDialog.fragment";

/**
 * # Chapter 10. Fragment factory as separate file (dialog)
 *
 * The **other** sense of "fragment" in UI5: a reusable chunk of UI
 * without its own controller. This chapter loads
 * `FragmentDialog.fragment.tsx`, a factory function that returns a
 * `Dialog`, and mounts it here.
 *
 * ## How it works
 *
 * 1. Import the factory: `import FragmentDialog from "./FragmentDialog.fragment"`.
 * 2. On the first "Open dialog" click, call `FragmentDialog()` to
 *    build the Dialog tree.
 * 3. `view.addDependent(dialog)` splices the Dialog into this view's
 *    dependents aggregation, the parent chain now leads back to this
 *    view.
 * 4. When the Dialog's Close button fires, the runtime's dot-handler
 *    walk finds this view (because it is the closest ancestor View
 *    up the parent chain from the Dialog), asks it for a controller,
 *    and invokes `.onCloseDialog` on it.
 *
 * Because this view overrides `getController(): this`, the handler
 * dispatches to a method on the view class itself.
 *
 * ## Same fragment, different views
 *
 * A different view can import the same factory and mount its own
 * copy of the dialog. The handler routing changes automatically,
 * the `.onCloseDialog` walk resolves against whichever view mounted
 * the fragment, not against a captured original.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class FragmentDialogDemo extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	getController(): Controller {
		return this as unknown as Controller;
	}

	private _dialog?: Dialog;

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="The Dialog tree lives in FragmentDialog.fragment.tsx, this view just mounts it and reacts to its close event."
					class="sapUiSmallMarginBottom"
				/>
				<Button text="Open dialog" press={this.onOpenDialog.bind(this)} />
			</VBox>
		);
	}

	onOpenDialog(): void {
		if (!this._dialog) {
			this._dialog = FragmentDialog();
			this.addDependent(this._dialog);
		}
		this._dialog.open();
	}

	onCloseDialog(): void {
		this._dialog?.close();
	}
}
