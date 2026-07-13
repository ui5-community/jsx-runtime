import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Label from "sap/m/Label";
import ObjectStatus from "sap/m/ObjectStatus";
import Table from "sap/ui/table/Table";
import Column from "sap/ui/table/Column";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Chapter 18. Bound `sap.ui.table.Table` (grid table)
 *
 * The sibling of Chapter 17's `sap.m.Table`, but a different control
 * with a different aggregation shape. Where `sap.m.Table` pairs
 * `<Column>` headers with a single `<ColumnListItem>` row template
 * whose `<cells>` map 1:1 to the columns, `sap.ui.table.Table`
 * (the grid / "analytical-style" table) inverts that: each
 * `<Column>` carries **both** its own header (`label=`) **and** its
 * own cell **`template=`**. There is no separate row-item control.
 *
 * ## Shape
 *
 *  - `rows={{ path: "/rows" }}` binds the row aggregation (note:
 *    `rows`, not `items`).
 *  - `columns={[<Column …/>, …]}` declares the columns.
 *  - Each `<Column label={<Label/>} template={<Text/>}/>` owns its
 *    header control and its per-row cell template. `template` is a
 *    named aggregation, not the default one, so it is passed as a
 *    prop (a bare JSX child would have no default aggregation on
 *    `sap.ui.table.Column` to land in).
 *
 * ## When to reach for this over `sap.m.Table`
 *
 * `sap.ui.table.Table` renders a fixed viewport of rows with virtual
 * scrolling, column resizing, and freezing — suited to dense,
 * spreadsheet-like data. `sap.m.Table` is list-oriented, responsive,
 * and grows on demand. The JSX runtime treats them identically; only
 * the control's own aggregation contract differs.
 *
 * ## What this deliberately doesn't show
 *
 * OData, selection handling, sorting/filtering menus, column
 * freezing, `sap.ui.mdc.Table`. Those are out of scope for the
 * current showcase; see
 * [docs/deferred-samples.md](../../../../../../docs/deferred-samples.md).
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */

// `state` feeds `<ObjectStatus state="{state}">`, whose `state`
// property is a `sap.ui.core.ValueState`. Its only valid values are
// `None | Information | Success | Warning | Error` — the model must
// carry those exact strings (see the same note in TableBound.tsx).
type Row = { id: number; name: string; role: string; state: "Information" | "Success" | "Error" };

interface ViewState {
	rows: Row[];
	nextId: number;
}

export default class TableGrid extends View {
	private readonly _state: JSONModel = new JSONModel({
		rows: [
			{ id: 1, name: "Ada Lovelace",      role: "Mathematician",      state: "Information" },
			{ id: 2, name: "Grace Hopper",      role: "Computer Scientist", state: "Success" },
			{ id: 3, name: "Margaret Hamilton", role: "Software Engineer",  state: "Error"   }
		],
		nextId: 4
	} satisfies ViewState);

	getAutoPrefixId(): boolean {
		return true;
	}

	getController(): Controller {
		return this as unknown as Controller;
	}

	createContent(): Control {
		this.setModel(this._state);

		return (
			<VBox class="sapUiSmallMargin">
				<Title text="Bound grid Table (sap.ui.table)" level="H4" class="sapUiSmallMarginBottom" />
				<Text
					text="rows={…} binds the row aggregation; each <Column> owns both its header (label=) and its per-row cell (template=). No separate row-item control."
					class="sapUiSmallMarginBottom"
				/>

				<HBox class="sapUiSmallMarginBottom">
					<Button text="Add row"     press={this.onAdd.bind(this)}    class="sapUiTinyMarginEnd" />
					<Button text="Remove last" press={this.onRemove.bind(this)} />
				</HBox>

				<Table
					rows={{ path: "/rows" }}
					selectionMode="None"
					visibleRowCount={5}
					columns={[
						<Column label={<Label text="ID" />}    template={<Text text="{id}" />}   width="4rem" />,
						<Column label={<Label text="Name" />}  template={<Text text="{name}" />} />,
						<Column label={<Label text="Role" />}  template={<Text text="{role}" />} />,
						<Column label={<Label text="State" />} template={<ObjectStatus text="{state}" state="{state}" />} />
					]}
				/>
			</VBox>
		);
	}

	onAdd(): void {
		const rows = this._state.getProperty("/rows") as Row[];
		const id   = this._state.getProperty("/nextId") as number;
		const states: Row["state"][] = ["Information", "Success", "Error"];
		this._state.setProperty("/rows", [
			...rows,
			{ id, name: `Person ${id}`, role: "TBD", state: states[id % states.length]! }
		]);
		this._state.setProperty("/nextId", id + 1);
	}

	onRemove(): void {
		const rows = this._state.getProperty("/rows") as Row[];
		if (rows.length === 0) return;
		this._state.setProperty("/rows", rows.slice(0, -1));
	}
}
