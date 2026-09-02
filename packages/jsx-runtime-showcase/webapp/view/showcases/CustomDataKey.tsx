import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Button from "sap/m/Button";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import MessageStrip from "sap/m/MessageStrip";
import CustomData from "sap/ui/core/CustomData";

/**
 * # The reserved `key` prop and `sap.ui.core.CustomData`
 *
 * Babel's automatic JSX transform **always** extracts `key` from an
 * element's attribute list and passes it as the *third* argument to
 * `jsx(type, props, key)` — it never appears inside `props`. This is
 * how React tracks reconciliation keys, but it creates a problem for
 * `sap.ui.core.CustomData`, which declares `key` as a genuine UI5
 * *property*: the value was silently discarded before it could reach
 * `CustomData.setKey()`, so `writeToDom={true}` never produced the
 * expected `data-<key>` attribute in the DOM (GitHub issue #3).
 *
 * The runtime fix (PR #4) detects the reserved `key` argument and
 * re-injects it as a property **only** for controls whose UI5 metadata
 * declares a `key` property (`metadata.hasProperty("key")`). Controls
 * like `Button` that have no such property are unaffected — the third
 * argument is still silently ignored for them.
 *
 * This sample demonstrates the fixed behaviour end-to-end: the button
 * below carries a `CustomData` whose `key` was written using a plain
 * JSX `key="product-id"` attribute; after rendering the readout shows
 * the DOM attribute that proves the value reached the control.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class CustomDataKey extends View {
	private _button!: Button;
	private _readout!: Text;

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this._readout = <Text text="(renders after the button paints)" /> as Text;

		this._button = (
			<Button
				text="Inspect me in the DOM"
				customData={
					// `key` is the reserved JSX prop — Babel passes it as the
					// 3rd arg to jsx(). The fixed runtime forwards it to
					// CustomData.setKey() because CustomData.metadata declares
					// a `key` property.
					<CustomData key="product-id" value="4711" writeToDom={true} />
				}
			/>
		) as Button;

		return (
			<VBox class="sapUiSmallMargin">
				<MessageStrip
					text="Babel extracts `key` from JSX attributes and passes it as the 3rd argument to jsx() — never inside props. The runtime now forwards it to controls whose metadata declares a key property."
					type="Information"
					showIcon={true}
					class="sapUiSmallMarginBottom"
				/>

				<Title text="Button with CustomData key=&quot;product-id&quot;" level="H4" />
				<Text
					text='<CustomData key="product-id" value="4711" writeToDom={true} /> — the key prop reaches setKey() and produces data-product-id in the DOM.'
					class="sapUiTinyMarginBottom"
				/>
				{this._button}

				<Title text="DOM attribute readout (after render)" level="H4" class="sapUiSmallMarginTop" />
				{this._readout}
			</VBox>
		);
	}

	onAfterRendering(): void {
		const dom = this._button.getDomRef();
		const attr = dom?.getAttribute("data-product-id");
		if (attr !== null && attr !== undefined) {
			this._readout.setText(
				`DOM attribute: data-product-id="${attr}"   ·   button.data("product-id") = ${String(this._button.data("product-id"))}`
			);
		} else {
			this._readout.setText(
				"No data-product-id attribute found — the key prop was not forwarded (pre-fix behaviour)."
			);
		}
	}
}
