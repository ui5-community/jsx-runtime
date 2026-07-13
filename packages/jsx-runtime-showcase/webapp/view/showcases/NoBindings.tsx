import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Input, { type Input$LiveChangeEvent } from "sap/m/Input";
import MessageBox from "sap/m/MessageBox";

/**
 * # Chapter 5. Wiring without bindings (the foil)
 *
 * Deliberately **not** using bindings. The `<Input>`'s `liveChange`
 * writes into the mirror `<Text>` via `byId`; the press handler reads
 * the `<Input>` back via `byId`. This is the "before bindings"
 * picture, included so Chapters 6 and 7 can show how much code
 * disappears when a `JSONModel` and binding strings replace the
 * manual plumbing.
 *
 * Compare to Chapter 6 (`{form>/name}`), where two `byId(...)`
 * round-trips collapse into one binding-string pair, with no event
 * handler at all.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class NoBindings extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	// View doubles as its own controller so `.onLiveChange` / `.onShow`
	// resolve locally.
	getController(): Controller {
		return this as unknown as Controller;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="No JSONModel, no bindings, every change goes through byId + setText."
					class="sapUiSmallMarginBottom"
				/>
				<Input id="nameInput" placeholder="Type something…" liveChange=".onLiveChange" />
				<Text id="nameMirror" />
				<Button
					text="Show input"
					press=".onShow"
					type="Attention"
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}

	onLiveChange(event: Input$LiveChangeEvent): void {
		// Manual plumbing: read the event value, look up the target,
		// call setText. Compare with Chapter 6, which drops all of this.
		const value = event.getParameter("value") ?? "";
		(this.byId("nameMirror") as Text)?.setText(value);
	}

	onShow(): void {
		const input = this.byId("nameInput") as Input;
		const value = input?.getValue() ?? "";
		MessageBox.show(value === "" ? "(empty)" : value);
	}
}
