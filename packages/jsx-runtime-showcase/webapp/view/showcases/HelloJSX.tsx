import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";

/**
 * # Chapter 1. Hello, JSX
 *
 * The minimum-viable TSX view. No model, no controller, no bindings,
 * a Button whose press handler is a plain inline function. If you
 * only read one file in this showcase, read this one.
 *
 * Babel's automatic JSX transform turns
 *
 * ```tsx
 * <Button text="Hi" press={() => MessageToast.show("hi")} />
 * ```
 *
 * into `_jsx(Button, { text: "Hi", press: () => ... })`, which the
 * runtime translates into `new Button({ text: "Hi", press: () => ... })`.
 * That's it, no virtual DOM, no reconciler, no re-render. A JSX
 * expression is a constructor call, not a render description.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class HelloJSX extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Title text="Hello, JSX" level="H3" />
				<Text text="The simplest possible TSX view: no model, no bindings, no controller." />
				<Button
					text="Say hi"
					press={(): void => MessageToast.show("Hello from JSX!")}
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}
}
