import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Button from "sap/m/Button";
import Text from "sap/m/Text";
import Title from "sap/m/Title";
import List from "sap/m/List";
import StandardListItem from "sap/m/StandardListItem";
import JSONModel from "sap/ui/model/json/JSONModel";
import { For, If } from "ui5/community/jsx/runtime/jsx-runtime";

/**
 * # Chapter 11. Structural directives `<For>` and `<If>`
 *
 * JSX-native loops and conditionals that don't bypass UI5's binding
 * system, they compile into it. `<For>` becomes a bound aggregation
 * with a row template; bound `<If>` binds each child's `visible`
 * property directly. Same reactivity, idiomatic JSX syntax.
 *
 * ## `<For>`, three equivalent spellings
 *
 * All three Lists below render the same rows from the same
 * `/items` model path and stay in lockstep on add / remove.
 *
 * 1. **Explicit**, `<For each={binding}>{() => <Row/>}</For>`.
 * 2. **Implicit**, `<List items={binding}><Row/></List>`; the JSX
 *    child slots in as the aggregation's `template`.
 * 3. **Raw**, pass the `template` inside the binding info object.
 *    This is what the two spellings above desugar to before UI5
 *    sees them.
 *
 * ## `<If>`, two modes
 *
 *  - **Literal** (`condition={true}` / `condition={false}`), children
 *    are inlined or dropped at construction. No wrapper control.
 *  - **Bound** (`condition={{ path: "/flag" }}`), the runtime calls
 *    `bindProperty("visible", …)` on every child directly. No wrapper,
 *    no `sap.m` dependency; UI5's normal visible-binding drives
 *    show/hide as the model flips.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
type Row = { id: number; label: string };
interface ViewState {
	items: Row[];
	showDetails: boolean;
	nextId: number;
}

export default class Structural extends View {
	private readonly state: JSONModel = new JSONModel({
		items: [
			{ id: 1, label: "Ada Lovelace" },
			{ id: 2, label: "Grace Hopper" },
			{ id: 3, label: "Margaret Hamilton" }
		],
		showDetails: true,
		nextId: 4
	} satisfies ViewState);

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.setModel(this.state);

		return (
			<VBox class="sapUiSmallMargin">
				<HBox class="sapUiSmallMarginBottom">
					<Button text="Add row" press={this.onAdd.bind(this)} class="sapUiTinyMarginEnd" />
					<Button text="Remove last" press={this.onRemove.bind(this)} class="sapUiTinyMarginEnd" />
					<Button text="Toggle details" press={this.onToggle.bind(this)} />
				</HBox>

				{/* Explicit: pass the binding via `each` + render prop. */}
				<List headerText="People (explicit <For>)">
					<For each={{ path: "/items" }}>{() =>
						<StandardListItem title="{label}" description="ID: {id}" />
					}</For>
				</List>

				{/* Implicit: the parent's `items` prop carries the
				    binding directly; the JSX child slots in as its
				    `template`. */}
				<List
					headerText="People (implicit items={…} + template child)"
					items={{ path: "/items" }}
				>
					<StandardListItem title="{label}" description="ID: {id}" />
				</List>

				{/* Raw: the binding info object itself carries the
				    `template`. This is what both spellings above
				    desugar to before UI5 sees them. */}
				<List
					headerText="People (raw items={{ path, template }})"
					items={{
						path: "/items",
						template: <StandardListItem title="{label}" description="ID: {id}" />
					}}
				/>

				{/* Literal <If>: condition is `true` at construction time. */}
				<If condition={true}>
					<Title text="Static info (literal If)" level="H4" class="sapUiSmallMarginTop" />
					<Text text="This block is inlined verbatim because the condition is the literal `true`." />
				</If>

				{/* Bound <If>: each child's `visible` is bound to /showDetails. */}
				<If condition={{ path: "/showDetails" }}>
					<Title text="Reactive details (bound If)" level="H4" class="sapUiSmallMarginTop" />
					<Text text="This block's visibility is bound. Press 'Toggle details' to flip it." />
				</If>
			</VBox>
		);
	}

	onAdd(): void {
		const items = this.state.getProperty("/items") as Row[];
		const id = this.state.getProperty("/nextId") as number;
		this.state.setProperty("/items", [...items, { id, label: `Person ${id}` }]);
		this.state.setProperty("/nextId", id + 1);
	}

	onRemove(): void {
		const items = this.state.getProperty("/items") as Row[];
		if (items.length === 0) return;
		this.state.setProperty("/items", items.slice(0, -1));
	}

	onToggle(): void {
		const current = this.state.getProperty("/showDetails") as boolean;
		this.state.setProperty("/showDetails", !current);
	}
}
