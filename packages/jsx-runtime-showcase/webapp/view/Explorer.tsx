import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import Page from "sap/m/Page";
import NavContainer from "sap/m/NavContainer";
import ToolPage from "sap/tnt/ToolPage";
import SideNavigation from "sap/tnt/SideNavigation";
import NavigationList from "sap/tnt/NavigationList";
import NavigationListItem from "sap/tnt/NavigationListItem";
import type UIComponent from "sap/ui/core/UIComponent";
import type Router from "sap/ui/core/routing/Router";
import type Explorer_Controller from "../controller/Explorer.controller";
import AppHeader from "./AppHeader";

/**
 * # Explorer, the app shell
 *
 * Two-level navigation, modelled after the SAP UI5
 * [Card Explorer](https://ui5.sap.com/test-resources/sap/ui/integration/demokit/cardExplorer/):
 *
 *   * **Top nav** (`sap.m.IconTabHeader`), the three sections
 *     Overview · Learn · Explore. Clicking a section switches the
 *     left-side SideNavigation content.
 *   * **Left nav** (`sap.tnt.SideNavigation`), topic list for the
 *     active section (empty for Overview, doc list for Learn, sample
 *     list for Explore). Each item's key names a route + argument.
 *
 * The `mainContents` aggregation holds a `NavContainer` id
 * `"explorerContent"`, the router feeds section views into it.
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export default class Explorer extends View {
	getControllerModuleName(): string {
		return "ui5/community/jsx/showcase/controller/Explorer";
	}

	getAutoPrefixId(): boolean {
		return true;
	}

	/**
	 * Convenience: typed access to our controller. `View#getController()`
	 * returns `Controller | undefined`; we know ours resolves to the
	 * Explorer controller because `getControllerModuleName()` above
	 * pins the class.
	 */
	private ctrl(): Explorer_Controller {
		return this.getController() as unknown as Explorer_Controller;
	}

	createContent(): Control {
		// ── Top brand + section tabs (Overview | Learn | Explore) ──
		//
		// Shared with the Welcome view via the AppHeader factory so
		// the top bar stays visually fixed as the user navigates
		// between `/`, `#/learn/…`, and `#/explore/…`. The
		// `activeSection` binding uses the JSON model the controller
		// maintains so the highlight tracks routeMatched.
		const topHeader = AppHeader({
			activeSection: "{explorerNav>/activeSection}",
			onSectionSelect: (key: string): void => {
				// Bridge to the controller's existing dispatch. We
				// hand-craft a stub event object so we don't have to
				// duplicate the routing table here.
				const stub = { getParameter: (name: string) => (name === "key" ? key : undefined) };
				this.ctrl().onSectionSelect(stub as unknown as Event);
			}
		});

		// Two-level `NavigationListItem` template. Built via the
		// constructor form (not JSX) for one reason: the JSX runtime
		// treats a `key` prop as a React-list key and strips it from
		// the settings before construction (see the same note on
		// `IconTabFilter` in [AppHeader.tsx](./AppHeader.tsx)). If
		// we authored the template as `<NavigationListItem key="…"/>`
		// the UI5 `key` property would never land on the control,
		// `NavigationListItem.getKey()` would return the empty string
		// for every item, and the `SideNavigation.selectedKey`
		// binding could never resolve. Constructing via
		// `new NavigationListItem({ key: "{explorerNav>key}", … })`
		// passes `key` through as a normal UI5 setting, and the
		// bound `selectedKey` on the parent SideNavigation then
		// works as documented.
		const childItemTemplate = new NavigationListItem({
			text: "{explorerNav>title}",
			icon: "{explorerNav>icon}",
			key: "{explorerNav>key}"
		});
		const groupItemTemplate = new NavigationListItem({
			text: "{explorerNav>title}",
			icon: "{explorerNav>icon}",
			key: "{explorerNav>key}",
			expanded: true,
			// Nested factory binding. A leaf carries no `children`,
			// so the nested list resolves to an empty aggregation and
			// the group affordance stays collapsed. A group has
			// `children[]` and renders each child through the same
			// template.
			items: {
				path: "explorerNav>children",
				templateShareable: false,
				template: childItemTemplate
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any
		});

		const sideNav = (
			<SideNavigation
				id="explorerSideNav"
				selectedKey="{explorerNav>/selectedKey}"
				itemSelect={(evt: Event) => this.ctrl().onSideNavSelect(evt)}
			>
				<NavigationList
					id="explorerNavList"
					items={{
						path: "explorerNav>/sideItems",
						templateShareable: false,
						template: groupItemTemplate
					}}
				/>
			</SideNavigation>
		);

		return (
			<Page showHeader={false} enableScrolling={false} class="jsx-showcase-fullheight">
				<ToolPage
					id="explorerToolPage"
					header={topHeader}
					sideContent={sideNav}
					mainContents={[
						// `defaultTransitionName="show"` disables the
						// default `slide` transition on section swaps.
						// Combined with the single-shell routing (the
						// ToolPage + AppHeader stay mounted, only the
						// NavContainer's page swaps), that turns
						// top-tab clicks into a near-instant content
						// change instead of a full-viewport slide.
						<NavContainer id="explorerContent" defaultTransitionName="show" />
					]}
				/>
			</Page>
		);
	}
}

// Suppress unused-import warnings for the imports kept for future use
// or to demonstrate the type surface. UIComponent + Router types are
// referenced from the Explorer controller signature.
export type _KeepsTypes = UIComponent | Router;

