import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Input from "sap/m/Input";
import MessageBox from "sap/m/MessageBox";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Chapter 6. String data binding (JSONModel)
 *
 * A view-local `JSONModel` registered under the named scope `"form"`.
 * The `<Input>`'s `value` and a sibling `<Text>`'s `text` both bind
 * to `"{form>/name}"`. UI5's binding system keeps them in sync as
 * the user types. No `liveChange` handler, no `byId(...).setText(...)`
 * round-trips.
 *
 * Compare to Chapter 5 (the foil): the entire mirroring infrastructure
 * collapses into two binding strings. That is the whole pitch.
 * UI5 already has the reactivity layer; JSX consumes it.
 *
 * ## Why the named scope `"form"`?
 *
 * Putting the model under a named scope (instead of the default
 * unnamed slot) keeps it isolated. If a parent view later attaches a
 * default model, the form bindings stay unambiguous: `"{form>/name}"`
 * always reads from **this** view's model.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class BindingString extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		// Local view-model. Bindings reference it via the `form>` prefix
		// so it stays isolated from any default model a parent view might
		// attach later.
		this.setModel(new JSONModel({ name: "" }), "form");

		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="value='{form>/name}', same string form UI5 uses everywhere."
					class="sapUiSmallMarginBottom"
				/>
				<Input placeholder="Type something…" value="{form>/name}" />
				<Text text="{form>/name}" />
				<Button
					text="Show input (model)"
					press={this.onShow.bind(this)}
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}

	onShow(): void {
		const model = this.getModel("form") as JSONModel;
		const value = (model.getProperty("/name") as string) ?? "";
		MessageBox.show(value === "" ? "(empty)" : value);
	}
}
