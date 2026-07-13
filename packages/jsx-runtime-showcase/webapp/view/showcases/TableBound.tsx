import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import ColumnListItem from "sap/m/ColumnListItem";
import Label from "sap/m/Label";
import ObjectStatus from "sap/m/ObjectStatus";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Chapter 17. Bound `sap.m.Table` with column layout
 *
 * A `sap.m.Table` is a bound-aggregation control just like `List`
 * from Chapter 11, but its rows are `ColumnListItem`s whose cells
 * map 1:1 to `<Column>`s declared as siblings. This sample shows
 * the JSX shape of that pairing plus a couple of the small
 * production-y touches (`ObjectStatus` for state, add/remove
 * handlers mutating the model).
 *
 * ## Shape
 *
 *  - `columns={[<Column …/>, <Column …/>, …]}` declares the header
 *    row. Number and order of `<Column>`s must match the number and
 *    order of `<cells>` in the row template.
 *  - `items={{ path: "/rows" }}` binds the row aggregation.
 *  - The JSX child of `<Table>` becomes the row **template**. The
 *    template's `<cells>` slot receives one JSX child per column.
 *
 * ## What this deliberately doesn't show
 *
 * OData, growing/pagination, `updateFinished`, `sap.ui.table.Table`,
 * `sap.ui.mdc.Table`, custom cell renderers, personalization,
 * export. Those are out of scope for the current showcase; see
 * [docs/deferred-samples.md](../../../../../../docs/deferred-samples.md).
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
// `state` feeds `<ObjectStatus state="{state}">`, whose `state`
// property is a `sap.ui.core.ValueState`. Its only valid values are
// `None | Information | Success | Warning | Error` — the model must
// carry those exact strings, not friendly aliases like "info" /
// "positive", or UI5 throws at construction while validating the enum.
type Row = { id: number; name: string; role: string; state: "Information" | "Success" | "Error" };

interface ViewState {
	rows: Row[];
	nextId: number;
}

export default class TableBound extends View {
	private readonly _state: JSONModel = new JSONModel({
		rows: [
			{ id: 1, name: "Ada Lovelace",      role: "Mathematician",  state: "Information" },
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
				<Title text="Bound Table with columns" level="H4" class="sapUiSmallMarginBottom" />
				<Text
					text="columns=[…] declares the header row; the JSX child of Table is the row template; its <cells> slot maps 1:1 to <Column>s."
					class="sapUiSmallMarginBottom"
				/>

				<HBox class="sapUiSmallMarginBottom">
					<Button text="Add row"     press={this.onAdd.bind(this)}    class="sapUiTinyMarginEnd" />
					<Button text="Remove last" press={this.onRemove.bind(this)} />
				</HBox>

				<Table
					items={{ path: "/rows" }}
					columns={[
						<Column><Label text="ID"    /></Column>,
						<Column><Label text="Name"  /></Column>,
						<Column><Label text="Role"  /></Column>,
						<Column><Label text="State" /></Column>
					]}
				>
					<ColumnListItem
						cells={[
							<Text text="{id}" />,
							<Text text="{name}" />,
							<Text text="{role}" />,
							<ObjectStatus text="{state}" state="{state}" />
						]}
					/>
				</Table>
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
