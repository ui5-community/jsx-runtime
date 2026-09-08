import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Control from "sap/ui/core/Control";
import type UIComponent from "sap/ui/core/UIComponent";
import type Event from "sap/ui/base/Event";
import type Router from "sap/ui/core/routing/Router";

/**
 * # Explorer controller
 *
 * Two sections drive the Explorer's SideNavigation: **Learn** (doc
 * topics, flat list) and **Explore** (sample chapters, grouped under
 * collapsible headings — Foundations · Bindings · Composition ·
 * Advanced · Plugins / Extend). A third top-tab labelled
 * **Overview** is a hyperlink out of the SPA, clicking it navigates
 * back to the static landing page (`index.html`).
 *
 * State the model owns:
 *   - `activeSection` , currently active top tab (`learn` | `explore`)
 *   - `selectedKey`   , highlighted leaf item in the left SideNavigation
 *   - `sideItems`     , list of side-nav nodes for the active section.
 *                        Leaf shape: `{ key, title, icon, route, arg }`.
 *                        Group shape: `{ key, title, icon, children[] }`.
 *                        The `NavigationListItem` template binds its
 *                        `items` sub-aggregation to `children` so both
 *                        shapes render through one template.
 *
 * The router's `attachRouteMatched` is the single source of truth:
 * every URL change (deep-link, back/forward, top-tab click, side-nav
 * click) resolves through it, which keeps all three model fields in
 * sync. Handlers do nothing but call `navTo` and let the route match
 * push the state.
 *
 * @namespace ui5.community.jsx.showcase.controller
 */

/** Leaf item, navigates to a route when clicked. */
interface LeafItem {
	key: string;
	title: string;
	icon: string;
	route: string;
	arg: string;
}

/** Group item, collapsible heading with a `children` list of leaves. */
interface GroupItem {
	key: string;
	title: string;
	icon: string;
	children: LeafItem[];
}

type SideNavItem = LeafItem | GroupItem;

function isGroup(item: SideNavItem): item is GroupItem {
	return "children" in item && Array.isArray((item as GroupItem).children);
}

export default class Explorer extends Controller {
	private static readonly LEARN_GROUPS: GroupItem[] = [
		{ key: "learn.g.getting-started", title: "Getting Started", icon: "sap-icon://learning-assistant", children: [
			{ key: "learn.overview",       title: "What is JSX Runtime for UI5?", icon: "sap-icon://hint",           route: "learnDoc", arg: "overview" },
			{ key: "learn.jsx-vs-xmlview", title: "JSX vs XMLView",           icon: "sap-icon://compare",        route: "learnDoc", arg: "jsx-vs-xmlview" },
			{ key: "learn.first-view",     title: "Your first TSX view",      icon: "sap-icon://hello-world",    route: "learnDoc", arg: "first-view" }
		]},
		{ key: "learn.g.setup", title: "Setup", icon: "sap-icon://action-settings", children: [
			{ key: "learn.setup",        title: "Setup",                icon: "sap-icon://download",        route: "learnDoc", arg: "setup" },
			{ key: "learn.tsconfig",     title: "tsconfig",             icon: "sap-icon://validate",        route: "learnDoc", arg: "tsconfig" },
			{ key: "learn.ui5-yaml",     title: "ui5.yaml",             icon: "sap-icon://shipping-status", route: "learnDoc", arg: "ui5-yaml" }
		]},
		{ key: "learn.g.concepts", title: "JSX Concepts", icon: "sap-icon://education", children: [
			{ key: "learn.controls",      title: "Controls & JSX elements",       icon: "sap-icon://sap-ui5",        route: "learnDoc", arg: "controls" },
			{ key: "learn.props-typing",  title: "Props & TypeScript",            icon: "sap-icon://validate",       route: "learnDoc", arg: "props-typing" },
			{ key: "learn.aggregations",  title: "Aggregations & associations",   icon: "sap-icon://list",           route: "learnDoc", arg: "aggregations" },
			{ key: "learn.events",        title: "Events",                        icon: "sap-icon://action",         route: "learnDoc", arg: "events" },
			{ key: "learn.data-binding",  title: "Data binding",                  icon: "sap-icon://database",       route: "learnDoc", arg: "data-binding" },
			{ key: "learn.fragments",     title: "Fragments",                     icon: "sap-icon://collapse-group", route: "learnDoc", arg: "fragments" },
			{ key: "learn.nested-views",  title: "Nested views & embedding",      icon: "sap-icon://combine",        route: "learnDoc", arg: "nested-views" },
			{ key: "learn.routing",       title: "Routing to TSX views",          icon: "sap-icon://chain-link",     route: "learnDoc", arg: "routing" },
			{ key: "learn.directives",    title: "Structural directives",         icon: "sap-icon://tree",           route: "learnDoc", arg: "directives" },
			{ key: "learn.type-coercion", title: "Property type coercion",        icon: "sap-icon://alert",          route: "learnDoc", arg: "type-coercion" }
		]},
		{ key: "learn.g.expert", title: "Expert Corner", icon: "sap-icon://sys-help", children: [
			{ key: "learn.runtime-anatomy", title: "Runtime anatomy",       icon: "sap-icon://process",        route: "learnDoc", arg: "runtime-anatomy" },
			{ key: "learn.auto-prefix",     title: "Auto id prefix",        icon: "sap-icon://text",           route: "learnDoc", arg: "auto-prefix" },
			{ key: "learn.plugin-spi",      title: "The Plugin SPI",        icon: "sap-icon://puzzle",         route: "learnDoc", arg: "plugin-spi" },
			{ key: "learn.switch-plugin",   title: "Case study: <Switch>", icon: "sap-icon://switch-classes", route: "learnDoc", arg: "switch-plugin" }
		]}
	];

	private static readonly EXPLORE_GROUPS: GroupItem[] = [
		{ key: "explore.g.foundations", title: "Foundations", icon: "sap-icon://education", children: [
			{ key: "explore.hello-jsx",          title: "Hello, JSX",                    icon: "sap-icon://hello-world",         route: "exploreSample", arg: "hello-jsx" },
			{ key: "explore.prop-typing",        title: "Per-control prop typing",       icon: "sap-icon://validate",            route: "exploreSample", arg: "prop-typing" },
			{ key: "explore.events-dot",         title: "Events: dot notation",         icon: "sap-icon://action",              route: "exploreSample", arg: "events-dot" },
			{ key: "explore.events-fn",          title: "Events: function reference",   icon: "sap-icon://developer-settings",  route: "exploreSample", arg: "events-fn" }
		]},
		{ key: "explore.g.bindings", title: "Bindings", icon: "sap-icon://chain-link", children: [
			{ key: "explore.no-bindings",    title: "Wiring without bindings",   icon: "sap-icon://disconnected",  route: "exploreSample", arg: "no-bindings" },
			{ key: "explore.binding-string", title: "String data binding",       icon: "sap-icon://database",      route: "exploreSample", arg: "binding-string" },
			{ key: "explore.binding-object", title: "Binding object + DataType", icon: "sap-icon://synchronize",   route: "exploreSample", arg: "binding-object" },
			{ key: "explore.i18n",           title: "i18n via {i18n>…}",         icon: "sap-icon://world",         route: "exploreSample", arg: "i18n" },
			{ key: "explore.table-bound",    title: "Bound sap.m.Table",         icon: "sap-icon://table-view",    route: "exploreSample", arg: "table-bound" },
			{ key: "explore.table-grid",     title: "Bound sap.ui.table.Table",  icon: "sap-icon://grid",          route: "exploreSample", arg: "table-grid" }
		]},
		{ key: "explore.g.composition", title: "Composition", icon: "sap-icon://collections-management", children: [
			{ key: "explore.fragments",       title: "JSX fragments <>…</>",      icon: "sap-icon://collapse-group", route: "exploreSample", arg: "fragments" },
			{ key: "explore.fragment-fn",     title: "Fragment as helper fn",     icon: "sap-icon://source-code",    route: "exploreSample", arg: "fragment-fn" },
			{ key: "explore.fragment-dialog", title: "Fragment factory (dialog)", icon: "sap-icon://sap-ui5",        route: "exploreSample", arg: "fragment-dialog" },
			{ key: "explore.embed-six",       title: "Six ways to embed UIs",     icon: "sap-icon://combine",        route: "exploreSample", arg: "embed-six" }
		]},
		{ key: "explore.g.advanced", title: "Advanced", icon: "sap-icon://sys-help", children: [
			{ key: "explore.controller-as-file", title: "Controller as separate file", icon: "sap-icon://source-code", route: "exploreSample", arg: "controller-as-file" },
			{ key: "explore.structural",      title: "Structural <For>, <If>",    icon: "sap-icon://tree",           route: "exploreSample", arg: "structural" },
			{ key: "explore.type-coercion", title: "Property type coercion", icon: "sap-icon://alert",         route: "exploreSample", arg: "type-coercion" },
			{ key: "explore.custom-data-key", title: "CustomData & the key prop", icon: "sap-icon://key-user-settings", route: "exploreSample", arg: "custom-data-key" }
		]},
		{ key: "explore.g.plugins", title: "Plugins / Extend", icon: "sap-icon://puzzle", children: [
			{ key: "explore.switch-plugin", title: "Plugin <Switch>", icon: "sap-icon://switch-classes", route: "exploreSample", arg: "switch-plugin" }
		]}
	];

	private static readonly SECTIONS: Record<string, {
		defaultRoute: { name: string; args?: Record<string, string> };
		items: SideNavItem[];
	}> = {
		learn: {
			defaultRoute: { name: "learnDoc", args: { topic: "overview" } },
			items: Explorer.LEARN_GROUPS
		},
		explore: {
			defaultRoute: { name: "exploreSample", args: { sampleId: "hello-jsx" } },
			items: Explorer.EXPLORE_GROUPS
		}
	};

	public onInit(): void {
		const view = this.getView();
		if (!view) return;

		// Seed the initial state from the URL hash so the tab
		// highlight and side-rail visibility are already correct at
		// first paint. Without this, a cold start on `#/` briefly
		// shows the "learn" side rail + "Learn" tab highlight before
		// `attachRouteMatched` fires and reconciles.
		const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
		const initial = deriveSectionFromHash(hash);

		const model = new JSONModel({
			activeSection: initial.section,
			selectedKey: initial.selectedKey,
			// Welcome has no side pane at all, so seed sideItems from
			// Learn as a placeholder, the pane is hidden on welcome
			// via `SideNavigation.setVisible(false)` and the binding
			// never renders. Learn / Explore each hand the model
			// their own item tree.
			sideItems: initial.section === "welcome"
				? Explorer.SECTIONS.learn.items
				: Explorer.SECTIONS[initial.section].items
		});
		view.setModel(model, "explorerNav");

		this.getRouter().attachRouteMatched((event: Event) => this.syncFromRoute(event));
	}

	/**
	 * Top-tab click. Two special cases:
	 *   * `welcome`, navigate to the `welcome` route. The router
	 *     swaps the shell view for the Welcome view; no shell chrome
	 *     bleeds through. The shared `AppHeader` factory publishes
	 *     the key `"welcome"` (the tab is *labelled* "Overview" for
	 *     the user, but its key stays semantic).
	 *   * `learn` / `explore`, navigate to the section's default
	 *     route; the ensuing `routeMatched` rewrites the SideNav.
	 */
	public onSectionSelect(event: Event): void {
		const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
		const key = eventWithGeneric.getParameter("key") as string;
		if (key === "welcome") {
			this.getRouter().navTo("welcome");
			return;
		}
		const section = Explorer.SECTIONS[key];
		if (!section) return;
		const { name, args } = section.defaultRoute;
		this.getRouter().navTo(name, args);
	}

	/**
	 * SideNav click. Reads the target route from the item's binding
	 * context. Clicks on group nodes (no `route` field) are ignored.
	 * UI5 already toggles their expand/collapse state itself.
	 */
	public onSideNavSelect(event: Event): void {
		const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const item = eventWithGeneric.getParameter("item") as any;
		if (!item) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const ctx = item.getBindingContext?.("explorerNav") as any;
		const data = ctx?.getObject?.() as Partial<LeafItem> | undefined;
		if (!data?.route || !data.arg) return; // group heading, ignore
		const argKey = data.route === "learnDoc" ? "topic" : "sampleId";
		this.getRouter().navTo(data.route, { [argKey]: data.arg });
	}

	/**
	 * Single source of truth for the model state. Called on every
	 * route match; derives the active section + selected key from
	 * the route name plus arguments and writes them into the model.
	 * Also toggles the `jsx-welcome-no-sidenav` style class on the
	 * ToolPage so the side rail collapses on the welcome route and
	 * reappears for Learn / Explore.
	 */
	private syncFromRoute(event: Event): void {
		const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
		const name = eventWithGeneric.getParameter("name") as string;
		const args = (eventWithGeneric.getParameter("arguments") as Record<string, string> | undefined) ?? {};

		// Assigned in every branch below (or the method returns), so no
		// initializer — ESLint 10's `no-useless-assignment` flags a dead
		// initial value here otherwise.
		let section: string;
		let selectedKey: string;
		if (name === "learnDoc") {
			section = "learn";
			selectedKey = args.topic ? `learn.${args.topic}` : "learn.overview";
		} else if (name === "exploreSample") {
			section = "explore";
			selectedKey = `explore.${args.sampleId ?? ""}`;
		} else if (name === "welcome") {
			// The shell (ToolPage + AppHeader + SideNavigation)
			// stays mounted across every route now. The IconTabHeader's
			// `selectedKey` binding on `{explorerNav>/activeSection}`
			// tracks the tab highlight; we just need to write the
			// value here so the highlight matches `#/`.
			section = "welcome";
			selectedKey = "";
		} else {
			// Any other future route, nothing to update.
			return;
		}
		const model = this.getView()?.getModel("explorerNav") as JSONModel | undefined;
		if (!model) return;

		// Swap the top-tab highlight, the side-nav item tree, and
		// the highlighted key. The `selectedKey` write comes last so
		// the SideNavigation resolves it against the freshly-built
		// `NavigationListItem` tree, not the previous section's
		// items. (The templated items carry their key as a UI5
		// setting because the JSX template in Explorer.tsx is built
		// via `new NavigationListItem({ key: "…" })`; a `key="…"`
		// JSX prop would be stripped by the runtime, see the same
		// note in Explorer.tsx.)
		model.setProperty("/activeSection", section);
		if (section !== "welcome") {
			model.setProperty("/sideItems", Explorer.SECTIONS[section].items);
		}
		model.setProperty("/selectedKey", selectedKey);

		// Hide the side pane entirely on welcome so the hero + demo
		// strip + steps use the full width; show it (and expand it)
		// for Learn / Explore where the deep-nested item titles need
		// the space. Hiding via `Control.setVisible(false)` on the
		// SideNavigation removes it from the DOM cleanly; a companion
		// CSS class on the ToolPage collapses the reserved aside gutter
		// so the main content isn't offset by the empty side slot.
		const toolPage = this.getView()?.byId("explorerToolPage") as
			(Control & {
				addStyleClass: (c: string) => Control;
				removeStyleClass: (c: string) => Control;
				setSideExpanded?: (expanded: boolean) => Control;
			})
			| undefined;
		const sideNav = this.getView()?.byId("explorerSideNav") as
			(Control & { setVisible: (v: boolean) => Control })
			| undefined;
		if (section === "welcome") {
			toolPage?.addStyleClass("jsx-welcome-no-sidenav");
			sideNav?.setVisible(false);
		} else {
			toolPage?.removeStyleClass("jsx-welcome-no-sidenav");
			sideNav?.setVisible(true);
			toolPage?.setSideExpanded?.(true);
		}
	}

	private getRouter(): Router {
		return (this.getOwnerComponent() as UIComponent).getRouter();
	}

	/**
	 * Hide the SideNavigation and apply the `jsx-welcome-no-sidenav`
	 * class before the view's first paint if we're landing on the
	 * welcome route. Without this pre-seed the pane would flash into
	 * view for one frame before `syncFromRoute` fires and hides it.
	 * Runs once per view instance.
	 */
	public onBeforeRendering(): void {
		if (this._preRenderSeeded) return;
		this._preRenderSeeded = true;
		const model = this.getView()?.getModel("explorerNav") as JSONModel | undefined;
		const activeSection = model?.getProperty("/activeSection") as string | undefined;
		if (activeSection !== "welcome") return;
		const toolPage = this.getView()?.byId("explorerToolPage") as
			(Control & { addStyleClass: (c: string) => Control })
			| undefined;
		const sideNav = this.getView()?.byId("explorerSideNav") as
			(Control & { setVisible: (v: boolean) => Control })
			| undefined;
		toolPage?.addStyleClass("jsx-welcome-no-sidenav");
		sideNav?.setVisible(false);
	}

	private _preRenderSeeded = false;
}

/**
 * Cheap hash inspection used by `onInit` to seed the section /
 * selectedKey state before the router matches. Mirrors the same
 * logic `syncFromRoute` runs on each `routeMatched` event.
 */
function deriveSectionFromHash(hash: string): { section: string; selectedKey: string } {
	const learn = /^#?\/?learn\/([^/?#]+)/.exec(hash);
	if (learn) {
		return { section: "learn", selectedKey: `learn.${learn[1]}` };
	}
	const explore = /^#?\/?explore\/([^/?#]+)/.exec(hash);
	if (explore) {
		return { section: "explore", selectedKey: `explore.${explore[1]}` };
	}
	// Empty hash or anything else (`#/`, `#`, `""`), the welcome route.
	return { section: "welcome", selectedKey: "" };
}

// Silence "unused import" for the type-guard helper (kept for docs).
export type _SideNavItem = SideNavItem;
export const _isGroup = isGroup;
