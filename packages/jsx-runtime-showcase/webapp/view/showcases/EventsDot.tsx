import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";

/**
 * # Chapter 3. Event handlers with dot notation
 *
 * XML-view style handler wiring: `press=".onPress"` is a string
 * starting with a dot. At fire time the runtime walks the button's
 * parent chain looking for the surrounding View, asks it for a
 * controller, and invokes the named method on that controller.
 *
 * This view has no separate controller file, it doubles as its own
 * controller by overriding `getController(): this`. Real apps put
 * handlers on a `*.controller.ts` file so the view stays declarative;
 * folding view + controller into one class is convenient for a
 * standalone sample, not a recommended pattern.
 *
 * ## How the walk works
 *
 * The runtime ships a core `IntrinsicHandler` that claims any prop
 * whose value is a `string` starting with `"."` **and** whose name
 * matches an event on the target control's metadata. It returns a
 * thunk that, on each event, walks `this.getParent()` until it finds
 * a `sap.ui.core.mvc.View` and invokes the method on that view's
 * controller. Matches XMLView's `EventHandlerResolver` behaviour.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class EventsDot extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	// The view doubles as its own controller, the runtime's ancestor
	// walk accepts any object whose handler keys are functions.
	getController(): Controller {
		return this as unknown as Controller;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Text text="press='.onPress' resolves at fire time against the surrounding view's controller." class="sapUiSmallMarginBottom" />
				<Button text="Press me (dot handler)" press=".onPress" />
			</VBox>
		);
	}

	onPress(): void {
		MessageToast.show("Dot-handler .onPress resolved on the view's controller.");
	}
}
