import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Input from "sap/m/Input";
import JSONModel from "sap/ui/model/json/JSONModel";
import Integer from "sap/ui/model/type/Integer";

/**
 * # Chapter 7. Binding object + DataType
 *
 * When the binding needs more than a `path`, pass a **binding info
 * object** instead of a string. The `type` property attaches a UI5
 * `SimpleType` that handles the string ↔ model-value conversion:
 *
 *   ```tsx
 *   value={{
 *       path: "form>/count",
 *       type: new Integer({}, { minimum: 0, maximum: 999 }),
 *       formatOptions: { groupingEnabled: false }
 *   }}
 *   ```
 *
 * The `<Input>` accepts a string as the user types; the `Integer`
 * type parses it and writes a `number` into the model. If parsing
 * fails (`"abc"`) or the value is out of range, the `Input`'s
 * `valueState` flips to `Error` automatically. UI5 wires the type's
 * `ParseException` / `ValidateException` through the standard
 * type-handling messages.
 *
 * The read-only `<Text>` reads the same model path through the
 * default `Integer` formatter, so what you see below is the raw
 * `number` in the model, not the user's string.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class BindingObject extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.setModel(new JSONModel({ count: 1 }), "form");

		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="Bound Integer with min/max, try typing 'abc' or a value > 999. The Input flips its valueState."
					class="sapUiSmallMarginBottom"
				/>
				<Input
					placeholder="Type an integer 0–999…"
					value={{
						path: "form>/count",
						type: new Integer({}, { minimum: 0, maximum: 999 }),
						formatOptions: { groupingEnabled: false }
					} as never}
				/>
				<Text
					text={{
						path: "form>/count",
						type: new Integer({}, {}),
						formatOptions: { groupingEnabled: false }
					} as never}
				/>
			</VBox>
		);
	}
}
