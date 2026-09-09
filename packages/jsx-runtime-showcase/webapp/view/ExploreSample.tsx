import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type UIComponent from "sap/ui/core/UIComponent";
import type Event from "sap/ui/base/Event";
import Icon from "sap/ui/core/Icon";
import HTML from "sap/ui/core/HTML";
import Page from "sap/m/Page";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import MessageStrip from "sap/m/MessageStrip";
import Log from "sap/base/Log";
import * as Prism from "prismjs";

import CodeBlock from "../control/CodeBlock";
import { loadSource } from "../util/loadSource";
import { markdownStyles } from "../util/markdownStyles";
import { renderMarkdown } from "../util/markdown";
import { grammarsReady } from "../control/install-prism-global";

/**
 * Registry describing every sample the Explorer's "Explore" section
 * can render. `sampleId` (the router argument) is the key. Values:
 *
 *  - `title` / `icon`, header strip.
 *  - `viewName`, module-form UI5 view name that gets instantiated
 *    via `View.create` for the live-demo slot.
 *  - `sourcePath`, where the `.tsx` file lives under `webapp/`.
 *    `<CodeBlock sourcePath={...}>` fetches it lazily via loadSource.
 *
 * The **description** shown above the demo+code split lives in a
 * companion markdown file at `docs/samples/{sampleId}.md`, loaded
 * on route match through the same `renderMarkdown` pipeline
 * [LearnDoc.tsx](./LearnDoc.tsx) uses. Descriptions may include H2/H3
 * headings, fenced code, and inline cross-links to the Learn concept
 * pages.
 */
const REGISTRY: Record<string, {
	title: string;
	icon: string;
	viewName: string;
	sourcePath: string;
}> = {
	"hello-jsx": {
		title: "Hello, JSX",
		icon: "sap-icon://hello-world",
		viewName: "ui5.community.jsx.showcase.view.showcases.HelloJSX",
		sourcePath: "view/showcases/HelloJSX.tsx"
	},
	"prop-typing": {
		title: "Per-control prop typing",
		icon: "sap-icon://validate",
		viewName: "ui5.community.jsx.showcase.view.showcases.PropTyping",
		sourcePath: "view/showcases/PropTyping.tsx"
	},
	"events-dot": {
		title: "Events, dot notation",
		icon: "sap-icon://action",
		viewName: "ui5.community.jsx.showcase.view.showcases.EventsDot",
		sourcePath: "view/showcases/EventsDot.tsx"
	},
	"events-fn": {
		title: "Events, function reference",
		icon: "sap-icon://developer-settings",
		viewName: "ui5.community.jsx.showcase.view.showcases.EventsFn",
		sourcePath: "view/showcases/EventsFn.tsx"
	},
	"no-bindings": {
		title: "Wiring without bindings (the foil)",
		icon: "sap-icon://disconnected",
		viewName: "ui5.community.jsx.showcase.view.showcases.NoBindings",
		sourcePath: "view/showcases/NoBindings.tsx"
	},
	"binding-string": {
		title: "String data binding (JSONModel)",
		icon: "sap-icon://database",
		viewName: "ui5.community.jsx.showcase.view.showcases.BindingString",
		sourcePath: "view/showcases/BindingString.tsx"
	},
	"binding-object": {
		title: "Binding object + DataType",
		icon: "sap-icon://synchronize",
		viewName: "ui5.community.jsx.showcase.view.showcases.BindingObject",
		sourcePath: "view/showcases/BindingObject.tsx"
	},
	fragments: {
		title: "JSX fragments <>…</>",
		icon: "sap-icon://collapse-group",
		viewName: "ui5.community.jsx.showcase.view.showcases.Fragments",
		sourcePath: "view/showcases/Fragments.tsx"
	},
	"fragment-fn": {
		title: "Fragment as helper function",
		icon: "sap-icon://source-code",
		viewName: "ui5.community.jsx.showcase.view.showcases.FragmentFn",
		sourcePath: "view/showcases/FragmentFn.tsx"
	},
	"fragment-dialog": {
		title: "Fragment factory (dialog from separate file)",
		icon: "sap-icon://sap-ui5",
		viewName: "ui5.community.jsx.showcase.view.showcases.FragmentDialogDemo",
		sourcePath: "view/showcases/FragmentDialogDemo.tsx"
	},
	structural: {
		title: "Structural directives <For>, <If>",
		icon: "sap-icon://tree",
		viewName: "ui5.community.jsx.showcase.view.showcases.Structural",
		sourcePath: "view/showcases/Structural.tsx"
	},
	"switch-plugin": {
		title: "Plugin <Switch>/<Case>/<Default>",
		icon: "sap-icon://switch-classes",
		viewName: "ui5.community.jsx.showcase.view.showcases.SwitchPlugin",
		sourcePath: "view/showcases/SwitchPlugin.tsx"
	},
	"type-coercion": {
		title: "Property type coercion",
		icon: "sap-icon://alert",
		viewName: "ui5.community.jsx.showcase.view.showcases.TypeCoercion",
		sourcePath: "view/showcases/TypeCoercion.tsx"
	},
	"embed-six": {
		title: "Six ways to embed reusable UIs",
		icon: "sap-icon://combine",
		viewName: "ui5.community.jsx.showcase.view.showcases.EmbedSix",
		sourcePath: "view/showcases/EmbedSix.tsx"
	},
	"controller-as-file": {
		title: "Controller in a separate file (recommended)",
		icon: "sap-icon://source-code",
		viewName: "ui5.community.jsx.showcase.view.showcases.ControllerAsFile",
		sourcePath: "view/showcases/ControllerAsFile.tsx"
	},
	i18n: {
		title: "Internationalization via {i18n>…}",
		icon: "sap-icon://world",
		viewName: "ui5.community.jsx.showcase.view.showcases.I18n",
		sourcePath: "view/showcases/I18n.tsx"
	},
	"table-bound": {
		title: "Bound sap.m.Table with columns",
		icon: "sap-icon://table-view",
		viewName: "ui5.community.jsx.showcase.view.showcases.TableBound",
		sourcePath: "view/showcases/TableBound.tsx"
	},
	"table-grid": {
		title: "Bound sap.ui.table.Table (grid)",
		icon: "sap-icon://grid",
		viewName: "ui5.community.jsx.showcase.view.showcases.TableGrid",
		sourcePath: "view/showcases/TableGrid.tsx"
	},
	"custom-data-key": {
		title: "CustomData & the key prop",
		icon: "sap-icon://key-user-settings",
		viewName: "ui5.community.jsx.showcase.view.showcases.CustomDataKey",
		sourcePath: "view/showcases/CustomDataKey.tsx"
	},
	"forwarded-menu": {
		title: "Forwarded aggregation (Menu)",
		icon: "sap-icon://menu2",
		viewName: "ui5.community.jsx.showcase.view.showcases.ForwardedMenu",
		sourcePath: "view/showcases/ForwardedMenu.tsx"
	}
};

/**
 * # ExploreSample, chapter shell for one live sample
 *
 * Route pattern: `explore/{sampleId}`. On every route match the view
 * looks up the sampleId in `REGISTRY`, rebuilds the header, loads
 * the companion description from `docs/samples/{sampleId}.md`,
 * updates the source path on the code block, then instantiates the
 * concrete showcase view via `View.create` and mounts it into the
 * left "demo" column. The right column shows the source code
 * side-by-side (grid layout, see `.jsx-showcase-explore-row` in
 * `webapp/css/style.css`).
 *
 * The description is markdown rendered through the same pipeline
 * `LearnDoc.tsx` uses (`renderMarkdown` from `../util/markdown`),
 * so H2 anchors, fenced code, and cross-links to the Learn topics
 * all work. Post-render Prism highlighting runs on fenced code
 * blocks in the description just like on Learn pages.
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export default class ExploreSample extends View {
	private headerIcon!: Icon;
	private headerTitle!: Title;
	private description!: HTML;
	private demoSlot!: VBox;
	private demoFrame!: VBox;
	private codeBlock!: CodeBlock;
	private currentSampleId: string = "";
	private routerAttached = false;

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.headerIcon = new Icon({ src: "sap-icon://palette", size: "1.5rem" });
		this.headerIcon.addStyleClass("sapUiSmallMarginEnd");
		this.headerTitle = new Title({ text: "Explore", level: "H2" });
		// `sap.ui.core.HTML` requires a single root DOM node in its
		// content, the outer `<div>` wrapper is deliberate. Same
		// invariant `LearnDoc.tsx` establishes; without it, re-renders
		// on navigation append instead of replace.
		this.description = new HTML({
			content: `<div class="jsx-showcase-explore-description"><p><i>Pick a sample from the sidebar.</i></p></div>`
		});
		this.demoSlot = new VBox();
		this.codeBlock = new CodeBlock({
			language: "tsx",
			stripLeadingJsdoc: true,
			stripAutoPrefixIdMethod: true
		});

		// Left column: live demo. Right column: source code. Same
		// `HBox renderType="Bare"` bare-div trick that LearnDoc uses
		// so CSS Grid controls the columns, see the
		// `.jsx-showcase-explore-row` rule in `webapp/css/style.css`.
		//
		// The demo wrap also carries `.jsx-showcase-browser-frame`
		// (the shared "browser-chrome" box, traffic-light dots +
		// fake URL bar). Its `data-url` is set from the current
		// sampleId in `renderSample` below.
		const demoWrap = new VBox({});
		demoWrap.addStyleClass("jsx-showcase-explore-demo");
		demoWrap.addStyleClass("jsx-showcase-browser-frame");
		demoWrap.addItem(this.demoSlot);
		this.demoFrame = demoWrap;

		const codeWrap = new VBox({});
		codeWrap.addStyleClass("jsx-showcase-explore-code");
		codeWrap.addItem(this.codeBlock);

		const row = new HBox({ renderType: "Bare" });
		row.addStyleClass("jsx-showcase-explore-row");
		row.addItem(demoWrap);
		row.addItem(codeWrap);

		return (
			<Page showHeader={false} enableScrolling={true} class="jsx-showcase-fullheight">
				<VBox class="sapUiLargeMargin">

					<HBox alignItems="Center" class="sapUiSmallMarginBottom">
						{this.headerIcon}
						{this.headerTitle}
					</HBox>

					<VBox class="sapUiSmallMarginBottom">
						{this.description}
					</VBox>

					{row}

				</VBox>
			</Page>
		);
	}

	onAfterRendering(): void {
		if (this.routerAttached) return;
		this.routerAttached = true;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const Component = sap.ui.require("sap/ui/core/Component") as any;
		const comp = Component?.getOwnerComponentFor(this) as UIComponent | undefined;
		const router = comp?.getRouter();
		if (!router) return;
		const route = router.getRoute("exploreSample");
		route?.attachPatternMatched((event: Event) => this.onPatternMatched(event));

		// Read the initial route from the hash so we render whatever
		// the router was matching when it constructed us.
		this.reloadFromHash();
	}

	private reloadFromHash(): void {
		const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
		const m = /explore\/([^/?#]+)/.exec(hash);
		if (m) this.renderSample(m[1]);
	}

	private onPatternMatched(event: Event): void {
		const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
		const args = (eventWithGeneric.getParameter("arguments") as Record<string, string> | undefined) ?? {};
		this.renderSample(args.sampleId ?? "");
	}

	private renderSample(sampleId: string): void {
		if (!sampleId || sampleId === this.currentSampleId) return;
		const reg = REGISTRY[sampleId];
		if (!reg) {
			this.headerTitle.setText(`Unknown sample: ${sampleId}`);
			this.description.setContent(
				`<div class="jsx-showcase-explore-description"><p><i>No entry for '${escapeHtml(sampleId)}' in the sample registry.</i></p></div>`
			);
			this.demoSlot.removeAllItems();
			return;
		}
		this.currentSampleId = sampleId;

		this.headerIcon.setSrc(reg.icon);
		this.headerTitle.setText(reg.title);
		// Update the fake URL bar on the browser-chrome frame around
		// the demo cell. `Control#data("url", value)` renders as a
		// plain `data-url` attribute the CSS `attr()` function reads.
		this.demoFrame.data("url", sampleId);
		this.description.setContent(
			`<div class="jsx-showcase-explore-description"><p><i>Loading description…</i></p></div>`
		);
		this.codeBlock.setSourcePath(reg.sourcePath);
		this.codeBlock.setFilename(`webapp/${reg.sourcePath}`);

		// Load the companion description in parallel with the demo.
		void loadSource(`docs/samples/${sampleId}.md`)
			.then((md) => {
				if (this.currentSampleId !== sampleId) return; // navigated away
				const { html } = renderMarkdown(md, reg.title);
				this.description.setContent(
					`<div class="jsx-showcase-explore-description">` +
					`<style>${markdownStyles()}</style>` +
					`<div class="jsx-showcase-markdown">${html}</div>` +
					`</div>`
				);
				void grammarsReady.then(() => {
					setTimeout(() => this.highlightDescriptionCode(), 0);
				});
			})
			.catch((error: unknown) => {
				if (this.currentSampleId !== sampleId) return;
				Log.error(
					`Could not load docs/samples/${sampleId}.md: ${String(error)}`,
					error instanceof Error ? (error.stack ?? "") : "",
					"ui5.community.jsx.showcase.view.ExploreSample"
				);
				this.description.setContent(
					`<div class="jsx-showcase-explore-description">` +
					`<p><i>Could not load docs/samples/${escapeHtml(sampleId)}.md: ${escapeHtml(String(error))}</i></p>` +
					`</div>`
				);
			});

		this.demoSlot.removeAllItems();
		this.demoSlot.addItem(new MessageStrip({ text: "Loading demo…", type: "Information", showIcon: false }));

		// `View.create` returns a promise resolving to the constructed
		// view. The `module:` prefix on the view name is UI5's
		// module-form target for TSX views.
		void View.create({
			viewName: `module:${reg.viewName.replace(/\./g, "/")}`
		}).then((demoView: View) => {
			// Race guard: if the user navigated away during load,
			// destroy the just-built view instead of mounting a stale
			// demo.
			if (this.currentSampleId !== sampleId) {
				demoView.destroy();
				return;
			}
			this.demoSlot.removeAllItems();
			this.demoSlot.addItem(demoView);
		}).catch((error: unknown) => {
			Log.error(
				`Failed to load ${reg.viewName}: ${String(error)}`,
				error instanceof Error ? (error.stack ?? "") : "",
				"ui5.community.jsx.showcase.view.ExploreSample"
			);
			this.demoSlot.removeAllItems();
			this.demoSlot.addItem(new Text({
				text: `Failed to load ${reg.viewName}: ${String(error)}`
			}));
		});
	}

	/** Syntax-highlight fenced code blocks inside the description. */
	private highlightDescriptionCode(): void {
		const root = this.getDomRef();
		if (!root) return;
		const codeBlocks = root.querySelectorAll(".jsx-showcase-explore-description pre > code[class*='language-']");
		codeBlocks.forEach((el) => {
			if (el instanceof HTMLElement) {
				Prism.highlightElement(el);
			}
		});
	}

	exit(): void {
		// UI5 destroys the child view along with the demoSlot's
		// items; no manual cleanup needed. This override exists
		// only for symmetry / future extension.
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
