/**
 * QUnit tests for string-syntax aggregation binding with a JSX template child.
 *
 * Regression cover for issue #6: `<VBox items="{/rows}"><FlexBox/></VBox>` must
 * produce an aggregation binding whose `template` is the child — parity with
 * the object-syntax form `items={{ path: "/rows" }}`.
 *
 * The childless case (`<List items="{/rows}" />`) has always worked because
 * UI5's `applySettings` → `extractBindingInfo` parses the string itself; that
 * path is exercised here as a regression guard.
 */
import { jsx } from "ui5/community/jsx/runtime/jsx-runtime";
import List from "sap/m/List";
import VBox from "sap/m/VBox";
import StandardListItem from "sap/m/StandardListItem";
import FlexBox from "sap/m/FlexBox";

QUnit.module("runtime/string-aggregation-binding");

QUnit.test("string aggregation binding + child template installs a binding info", (assert) => {
	const item = jsx(StandardListItem, { title: "{name}" }) as StandardListItem;
	const list = jsx(List, { items: "{/rows}", children: item }) as List;
	const info = list.getBindingInfo("items") as
		| { path?: string; template?: unknown }
		| undefined;
	assert.ok(info, "binding info installed on `items` from the string form");
	assert.strictEqual(info?.path, "/rows", "path parsed from the binding string");
	assert.strictEqual(info?.template, item, "JSX child became the binding template");
	list.destroy();
});

QUnit.test("string aggregation binding with a named model prefix", (assert) => {
	const child = jsx(FlexBox, {}) as FlexBox;
	const box = jsx(VBox, { items: "{view>/standardShortcuts}", children: child }) as VBox;
	const info = box.getBindingInfo("items") as
		| { path?: string; model?: string; template?: unknown }
		| undefined;
	assert.ok(info, "binding info installed on `items` (default aggregation of VBox)");
	assert.strictEqual(info?.path, "/standardShortcuts", "path parsed from the prefixed string");
	assert.strictEqual(info?.model, "view", "named model prefix parsed into `model`");
	assert.strictEqual(info?.template, child, "JSX child became the binding template");
	box.destroy();
});

QUnit.test("childless string aggregation binding still binds — no template", (assert) => {
	const list = jsx(List, { items: "{/rows}" }) as List;
	const info = list.getBindingInfo("items") as
		| { path?: string; template?: unknown }
		| undefined;
	assert.ok(info, "binding info installed on `items`");
	assert.strictEqual(info?.path, "/rows", "path parsed");
	assert.strictEqual(info?.template, undefined, "no template when no children");
	list.destroy();
});

QUnit.test("multiple children with a string aggregation binding become the template array", (assert) => {
	const a = jsx(StandardListItem, { title: "a" }) as StandardListItem;
	const b = jsx(StandardListItem, { title: "b" }) as StandardListItem;
	const list = jsx(List, { items: "{/rows}", children: [a, b] }) as List;
	const info = list.getBindingInfo("items") as
		| { path?: string; template?: unknown }
		| undefined;
	assert.ok(info, "binding info installed on `items`");
	assert.deepEqual(info?.template, [a, b], "both children became the template array");
	list.destroy();
});
