/**
 * QUnit regression tests for forwarded default aggregations (issue #9).
 *
 * Controls like `sap.m.Menu` declare their default aggregation (`items`)
 * with **aggregation forwarding**: the real target is an internal
 * `MenuWrapper` created in `Menu.prototype.init()` and resolved by id at
 * add-time. Passing `items` in the single-shot `new Menu({ items })` call
 * (our default construct path) makes `applySettings` attempt to resolve
 * the wrapper before it is registered, causing a `TypeError`.
 *
 * The fix detects a forwarded default aggregation via
 * `metadata.getAggregation(name)?.forwarding` and defers concrete children
 * to a post-construction `addAggregation` call, matching how XMLView fills
 * such aggregations.
 *
 * These tests deliberately create `Menu` instances **without** an explicit
 * `id` so the broken code path is exercised (an explicit id was the
 * reporter's workaround that masked the bug).
 */
import { jsx } from "ui5/community/jsx/runtime/jsx-runtime";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";

QUnit.module("runtime/forwarded-aggregation");

QUnit.test("Menu with multiple children (no id) — items populated correctly", (assert) => {
	const menu = jsx(Menu, {
		children: [
			jsx(MenuItem, { text: "One" }),
			jsx(MenuItem, { text: "Two" }),
		]
	}) as Menu;

	const items = menu.getItems();
	assert.strictEqual(items.length, 2, "two items forwarded into the Menu");
	assert.strictEqual((items[0] as MenuItem).getText(), "One", "first item text correct");
	assert.strictEqual((items[1] as MenuItem).getText(), "Two", "second item text correct");
	menu.destroy();
});

QUnit.test("Menu with a single child (no id) — item populated correctly", (assert) => {
	const menu = jsx(Menu, {
		children: jsx(MenuItem, { text: "Only" }),
	}) as Menu;

	const items = menu.getItems();
	assert.strictEqual(items.length, 1, "one item forwarded into the Menu");
	assert.strictEqual((items[0] as MenuItem).getText(), "Only", "item text correct");
	menu.destroy();
});
