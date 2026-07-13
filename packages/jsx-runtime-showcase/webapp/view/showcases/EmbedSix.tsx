import View from "sap/ui/core/mvc/View";
import XMLView from "sap/ui/core/mvc/XMLView";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import type Dialog from "sap/m/Dialog";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Panel from "sap/m/Panel";
import Text from "sap/m/Text";
import Title from "sap/m/Title";
import Label from "sap/m/Label";
import Button from "sap/m/Button";

import HelloJSXView from "./HelloJSX";
import FragmentDialog from "./FragmentDialog.fragment";

/**
 * # Chapter 14. Six ways to embed reusable UI
 *
 * A single view that puts six distinct "how do I compose reusable
 * pieces?" patterns side-by-side, so a reader can see, in one place,
 * which one to reach for and why.
 *
 * The six patterns, in order from lightest to heaviest:
 *
 *  1. **JSX fragment `<>…</>`**, grouping siblings, no wrapper.
 *  2. **Plain helper function returning a control tree**, local
 *     composition; call it with `{helper(...)}`, never `<Helper/>`.
 *  3. **UI5 fragment factory (`*.fragment.tsx`)**, controller-callable
 *     dialog. Mounts via `addDependent(factory())`.
 *  4. **Nested TSX `<View/>`**, full sub-view with its own lifecycle
 *     and id namespace.
 *  5. **Embedded `XMLView` via `definition`**. XML built at runtime.
 *  6. **Embedded `XMLView` by name**, `.view.xml` file loaded from
 *     disk via `XMLView.create({ viewName })`.
 *
 * ## Rule of thumb
 *
 *   fragment (<>…</>)         →  when you just need "no wrapper"
 *   helper function           →  when the pieces are local to this view
 *   *.fragment.tsx factory    →  when a controller-callable dialog fits
 *   nested <View/>            →  when the piece deserves its own lifecycle
 *   XMLView({ definition })   →  when the XML is generated at runtime
 *   XMLView({ viewName })     →  when the piece is an on-disk .view.xml file
 *
 * Every step up buys reusability at the cost of ceremony.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */

/** Pattern 1, a JSX fragment. Returns two siblings, no wrapper. */
function labelledValue(label: string, value: string): Control {
	return (
		<>
			<Label text={label} design="Bold" />
			<Text text={value} />
		</>
	);
}

/** Pattern 2, a helper function returning a single wrapped subtree. */
function statCard(label: string, value: string, tone: "info" | "positive" | "negative"): Control {
	return (
		<Panel class="sapUiTinyMargin">
			<VBox class="sapUiSmallMargin">
				<Text text={label} class="sapUiTinyMarginBottom" />
				<Title text={value} level="H4" wrapping={true} />
				<HBox alignItems="Center" class="sapUiTinyMarginTop">
					<Text text={`● ${tone}`} wrapping={false} />
				</HBox>
			</VBox>
		</Panel>
	);
}

export default class EmbedSix extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	// View doubles as its own controller so `.onCloseDialog` from the
	// mounted FragmentDialog resolves here (pattern #3).
	getController(): Controller {
		return this as unknown as Controller;
	}

	private _dialog?: Dialog;

	/**
	 * Small XML view definition, inlined here for pattern #5. In a
	 * real app this would live at `webapp/view/.../Foo.view.xml` and
	 * load via `XMLView.create({ viewName })`, pattern #6 shows that.
	 */
	private readonly embeddedXml =
		'<mvc:View xmlns="sap.m" xmlns:mvc="sap.ui.core.mvc">' +
		'<VBox class="sapUiSmallMargin">' +
			'<Title text="Inline XMLView" level="H4"/>' +
			'<Text text="Built from a definition string via XMLView.create. The instance is a sap.ui.core.mvc.View, it drops into JSX like any other Control."/>' +
		'</VBox>' +
		'</mvc:View>';

	createContent(): Promise<Control> {
		// Both XMLView.create calls are async. Promise.all pays the
		// cost in parallel and mounts both once they resolve.
		return Promise.all([
			XMLView.create({ definition: this.embeddedXml }),
			XMLView.create({ viewName: "ui5.community.jsx.showcase.view.showcases.EmbeddedByName" })
		]).then(([xmlViewFromDefinition, xmlViewByName]) => (
			<VBox class="sapUiSmallMargin">

				{/* ── (1) JSX fragment ────────────────────────────── */}
				<Panel headerText="1. JSX fragment (<>…</>), grouping siblings, no wrapper" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="labelledValue(label, value) returns two siblings, a Label and a Text, with no wrapper. The runtime's flattenChildren inlines them into the parent VBox. Zero DOM footprint, no lifecycle, no id namespace."
							class="sapUiSmallMarginBottom"
						/>
						{labelledValue("Name", "Ada Lovelace")}
						{labelledValue("Role", "Mathematician")}
						{labelledValue("Born", "1815")}
					</VBox>
				</Panel>

				{/* ── (2) Plain helper function ──────────────────── */}
				<Panel headerText="2. Helper function returning a control tree, local composition" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="statCard(label, value, tone) returns a Panel subtree. Composed at the value level ({statCard(...)}, never <statCard/>). Local to this view, no cross-view lifecycle."
							class="sapUiSmallMarginBottom"
						/>
						<HBox wrap="Wrap">
							{statCard("Rows loaded", "1,284", "info")}
							{statCard("Errors last hour", "0", "positive")}
							{statCard("Retries", "3", "negative")}
						</HBox>
					</VBox>
				</Panel>

				{/* ── (3) UI5 fragment factory (.fragment.tsx) ─── */}
				<Panel headerText="3. UI5 fragment factory (*.fragment.tsx), controller-callable dialog" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="FragmentDialog is a factory function exported from FragmentDialog.fragment.tsx. This view calls it lazily, adds it as a dependent (so the dialog inherits this view's controller), then opens it. Handlers like .onCloseDialog resolve back here via the parent-chain walk."
							class="sapUiSmallMarginBottom"
						/>
						<Button text="Open dialog" press={this.onOpenDialog.bind(this)} />
					</VBox>
				</Panel>

				{/* ── (4) Nested TSX View ─────────────────────────── */}
				<Panel headerText="4. Nested TSX View, full sub-view with its own lifecycle" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="<HelloJSXView async={true} /> mounts Chapter 1's view as a child of this one. Its own id namespace (via getAutoPrefixId), its own byId scope, its own controller if defined. Heaviest TSX option, pay for it when the piece deserves standalone lifecycle."
							class="sapUiSmallMarginBottom"
						/>
						<HelloJSXView async={true} />
					</VBox>
				</Panel>

				{/* ── (5) Embedded XMLView (inline definition) ─── */}
				<Panel headerText="5. Embedded XMLView (inline definition). XML built at runtime" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="XMLView.create({ definition }) builds a real sap.ui.core.mvc.View from an inline XML string. Best when XML is generated at runtime, or when the piece must survive UI5's flexibility (sap.ui.fl) pipeline."
							class="sapUiSmallMarginBottom"
						/>
						{xmlViewFromDefinition}
					</VBox>
				</Panel>

				{/* ── (6) Embedded XMLView by name ────────────────── */}
				<Panel headerText="6. Embedded XMLView by name, .view.xml file on disk" class="sapUiSmallMarginBottom">
					<VBox class="sapUiSmallMargin">
						<Text
							text="XMLView.create({ viewName: 'ui5.community.jsx.showcase.view.showcases.EmbeddedByName' }) loads a webapp/view/showcases/EmbeddedByName.view.xml file from disk. Best for coexisting with an existing XML-view codebase."
							class="sapUiSmallMarginBottom"
						/>
						{xmlViewByName}
					</VBox>
				</Panel>

				{/* ── Rule of thumb ──────────────────────────────── */}
				<Panel headerText="Rule of thumb" expandable={true} expanded={true}>
					<VBox class="sapUiSmallMargin">
						<Text text="Reach for the LIGHTEST pattern that works:" class="sapUiSmallMarginBottom" />
						<Text text="• fragment ( <>…</> )        , when you just need 'no wrapper'." />
						<Text text="• helper function            , when the pieces are local to this view." />
						<Text text="• *.fragment.tsx factory     , when a controller-callable dialog fits." />
						<Text text="• nested TSX <View/>         , when the piece deserves its own lifecycle." />
						<Text text="• XMLView({ definition })    , when the XML is generated at runtime." />
						<Text text="• XMLView({ viewName })      , when the piece is an on-disk .view.xml file." />
					</VBox>
				</Panel>
			</VBox>
		));
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
