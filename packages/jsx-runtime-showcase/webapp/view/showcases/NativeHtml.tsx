import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type UI5Event from "sap/ui/base/Event";
import VBox from "sap/m/VBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { htmlScope } from "ui5/community/jsx/runtime/plugins/html/index";

/**
 * # Chapter 19. Native HTML via `sap.html` (opt-in plugin)
 *
 * The `ui5.community.jsx.runtime/plugins/html` plugin maps every
 * lowercase HTML tag to its corresponding `sap.html.*` control class
 * (available from OpenUI5 1.154.0). Because these are real UI5
 * `ManagedObject` controls, the full runtime pipeline applies:
 * data binding, events, dot-handler strings, `class=`, and `ref=`
 * all work identically to any other control.
 *
 * ## Opt-in
 *
 * Wrap `createContent()` (or any subtree) in `withScope(htmlScope, fn)`.
 * Outside that scope, lowercase tags still throw the "no htmlIntrinsic"
 * error — the scope boundary is explicit and reversible.
 *
 * ## Text children
 *
 * `sap.html` controls handle text content in two ways:
 *
 * - **Sole text child** — a single string/number child (no sibling
 *   controls) is forwarded as the control's `text` property.
 * - **Mixed content** — text interleaved with child controls; the
 *   plugin wraps each text segment in a `sap.ui.core.html.TextContent`
 *   placed at the correct position in the `children` aggregation.
 *
 * ## Try it
 *
 * Type in the input below; the `<output>` and `<p>` elements reflect
 * the model value via string binding. Toggle the details panel.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
interface ViewState {
	name: string;
	lastKey: string;
}

export default class NativeHtml extends View {
	private readonly state: JSONModel = new JSONModel({
		name: "World",
		lastKey: "(none)"
	} satisfies ViewState);

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.setModel(this.state);

		return withScope(htmlScope, () => (
			<VBox class="sapUiSmallMargin">

				{/* ------ Plain HTML with text children ---------------------- */}
				<Title text="Native HTML in TSX" level="H3" />
				<Text text="These elements are real sap.html controls — not raw DOM strings." />

				{/* Sole text child → forwarded as `text` property */}
				<p class="sapUiSmallMarginTop">
					Hello from a native <strong>paragraph</strong> with mixed text and a bold element.
				</p>

				{/* Heading tags */}
				<h4 class="sapUiSmallMarginTop">Data binding</h4>

				{/* ------ Bound <input> --------------------------------------- */}
				<p>
					Enter your name:
					<input
						id="nameInput"
						type="text"
						value="{/name}"
						class="sapUiSmallMarginBegin"
						input={(): void => {
							// The `input` event on sap.html.Input fires like any UI5 event.
							// We just read the updated binding value for the toast.
							const name = this.state.getProperty("/name") as string;
							this.state.setProperty("/lastKey", name.slice(-1) || "(backspace)");
						}}
					/>
				</p>

				{/* Bound <output> and <p> reflect the model value */}
				<p class="sapUiTinyMarginTop">
					Bound output:
					<output class="sapUiSmallMarginBegin">{/* children rendered by binding */}</output>
				</p>
				<p>
					Hello, <strong text="{/name}" />! (last key: <em text="{/lastKey}" />)
				</p>

				{/* ------ Mixed text + controls ------------------------------- */}
				<h4 class="sapUiSmallMarginTop">Mixed content</h4>
				<p>
					This paragraph mixes plain text with a UI5{" "}
					<Text text="Text control" class="sapThemeHighlightText sapUiSmallMarginBegin sapUiSmallMarginEnd" />
					{" "}embedded inline.
				</p>

				{/* ------ Semantic structure ---------------------------------- */}
				<h4 class="sapUiSmallMarginTop">Semantic structure</h4>
				<section class="sapUiSmallMarginTop">
					<header>
						<h5>Feature list</h5>
					</header>
					<ul>
						<li>Data binding on any attribute</li>
						<li>Dot-handler events (<code>click=".onSomething"</code>)</li>
						<li>Inline function events</li>
						<li>
							<code>class=</code> → <code>addStyleClass</code>
						</li>
						<li>Mixed text + child controls (TextContent)</li>
					</ul>
				</section>

				{/* ------ <details> / <summary> ------------------------------- */}
				<h4 class="sapUiSmallMarginTop">Disclosure widget</h4>
				<details class="sapUiSmallMarginTop">
					<summary>Click to expand</summary>
					<p>
						The <code>sap.html.Details</code> control is a real UI5 control
						with a native browser disclosure mechanism.
					</p>
				</details>

				{/* ------ Event: click on a native <button> ------------------- */}
				<h4 class="sapUiSmallMarginTop">Native events</h4>
				<p class="sapUiTinyMarginTop">
					<button
						class="sapUiSmallMarginEnd"
						click={(): void => {
							const name = this.state.getProperty("/name") as string;
							MessageToast.show(`Hello, ${name}!`);
						}}
					>
						Say hello (native button)
					</button>
					<a href="#" click={(_e: UI5Event): void => { MessageToast.show("Link clicked"); }}>
						Native link
					</a>
				</p>

			</VBox>
		));
	}
}
