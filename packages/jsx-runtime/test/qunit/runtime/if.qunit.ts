/**
 * QUnit tests for `<If condition={...}>`.
 *
 * Literal mode, children are inlined for truthy conditions, dropped for
 * falsy. Bound mode, each child gets `visible` bound to the condition.
 */
import { jsx, If } from "ui5/community/jsx/runtime/jsx-runtime";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import JSONModel from "sap/ui/model/json/JSONModel";

QUnit.module("runtime/if");

QUnit.test("<If condition={true}> inlines children", (assert) => {
	const t = jsx(Text, { text: "yes" }) as Text;
	const ifNode = jsx(If as never, { condition: true, children: t });
	const outer = jsx(VBox, { children: ifNode }) as VBox;
	assert.deepEqual(outer.getItems(), [t], "child inlined for truthy condition");
	outer.destroy();
});

QUnit.test("<If condition={false}> drops children", (assert) => {
	const t = jsx(Text, { text: "hidden" }) as Text;
	const ifNode = jsx(If as never, { condition: false, children: t });
	const outer = jsx(VBox, { children: ifNode }) as VBox;
	assert.strictEqual(outer.getItems().length, 0, "no children rendered");
	outer.destroy();
});

QUnit.test("<If condition={bindingInfo}> binds visible on each child", (assert) => {
	const t1 = jsx(Text, { text: "a" }) as Text;
	const t2 = jsx(Text, { text: "b" }) as Text;
	const ifNode = jsx(If as never, { condition: { path: "/flag" }, children: [t1, t2] });
	const outer = jsx(VBox, { children: ifNode }) as VBox;
	// Attach the tree to a model so bindings materialise
	outer.setModel(new JSONModel({ flag: true }));
	assert.ok(t1.getBindingInfo("visible"), "child A has visible binding");
	assert.ok(t2.getBindingInfo("visible"), "child B has visible binding");
	outer.destroy();
});

QUnit.test("<If> throws when a child already binds visible", (assert) => {
	const t = new Text({ text: "conflict" });
	t.bindProperty("visible", { path: "/other" });
	assert.throws(
		() => {
			const ifNode = jsx(If as never, { condition: { path: "/flag" }, children: t });
			jsx(VBox, { children: ifNode });
		},
		/visible/i,
		"error mentions visible-conflict"
	);
	t.destroy();
});
