import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import List from "sap/m/List";
import StandardListItem from "sap/m/StandardListItem";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Forwarded aggregation: `sap.m.Menu` via JSX (issue fix demo)
 *
 * `sap.m.Menu` declares its default `items` aggregation as
 * **forwarded** — the real backing store is an internal `MenuWrapper`
 * control created in `init()` and resolved by id at add-time. Without
 * the runtime fix, passing `<MenuItem>` children in JSX would crash with
 * a `TypeError` unless the `Menu` was given an explicit `id` (the
 * reporter's workaround). Both menus on this page are intentionally
 * created **without** an explicit `id` to exercise the fixed code path.
 *
 * Two patterns shown side-by-side:
 *
 * 1. **Standalone menu** — a Button whose `press` calls `menu.openBy()` on
 *    a `<Menu>` built from `<MenuItem>` JSX children (the default-
 *    aggregation / forwarded path that was previously broken).
 * 2. **List context menu** — a `<List>` with `contextMenu={<Menu>…</Menu>}`
 *    (aggregation-prop form). UI5 opens it automatically on right-click /
 *    long-press; the `items` forwarding still applies inside the `Menu`.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */

type Fruit = { name: string; emoji: string };

export default class ForwardedMenu extends View {
	private readonly model = new JSONModel({
		fruits: [
			{ name: "Apple",  emoji: "🍎" },
			{ name: "Banana", emoji: "🍌" },
			{ name: "Cherry", emoji: "🍒" }
		] satisfies Fruit[]
	});

	/** Opened by the "Open menu" button. Not placed in the layout tree. */
	private readonly actionMenu: Menu = (
		<Menu title="Actions">
			<MenuItem text="Refresh" icon="sap-icon://refresh" />
			<MenuItem text="Download" icon="sap-icon://download" />
			<MenuItem text="Share" icon="sap-icon://share" />
		</Menu>
	) as Menu;

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.setModel(this.model);
		// Tie the standalone Menu's lifecycle to this view so it is
		// destroyed with it (same as placing it in a view dependent).
		this.addDependent(this.actionMenu);

		// The context menu is set directly on the List via the `contextMenu`
		// aggregation prop. UI5 manages its lifecycle with the List.
		const contextMenu = (
			<Menu>
				<MenuItem text="Edit" icon="sap-icon://edit" />
				<MenuItem text="Delete" icon="sap-icon://delete" />
			</Menu>
		) as Menu;

		return (
			<VBox class="sapUiSmallMargin">
				{/* ── Section 1: standalone button menu ──────────────── */}
				<Title text="Standalone Menu (button)" level="H4" class="sapUiSmallMarginBottom" />
				<Text
					text="Press the button to open a Menu whose items are declared as JSX children. No explicit id on the Menu."
					class="sapUiSmallMarginBottom"
				/>
				<HBox>
					<Button
						text="Open menu"
						icon="sap-icon://menu2"
						press={this.onOpenMenu.bind(this)}
					/>
				</HBox>

				{/* ── Section 2: List context menu ───────────────────── */}
				<Title text="List with contextMenu" level="H4" class="sapUiSmallMarginTop sapUiSmallMarginBottom" />
				<Text
					text="Right-click (or long-press on mobile) a row to open the context Menu. The Menu's items are also JSX children — no explicit id."
					class="sapUiSmallMarginBottom"
				/>
				<List
					headerText="Fruits"
					contextMenu={contextMenu}
					items={{ path: "/fruits" }}
				>
					<StandardListItem title="{emoji}  {name}" />
				</List>
			</VBox>
		);
	}

	onOpenMenu(event: { getSource(): Button }): void {
		this.actionMenu.openBy(event.getSource());
	}
}
