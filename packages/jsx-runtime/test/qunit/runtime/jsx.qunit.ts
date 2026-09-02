/**
 * QUnit tests for the core `jsx` / `jsxs` entry point.
 *
 * Uses the runtime's `jsx()` function directly rather than JSX syntax
 * so the test file needs no separate Babel step, the runtime is the
 * thing under test, not Babel's transform.
 */
import { jsx, jsxs } from "ui5/community/jsx/runtime/jsx-runtime";
import Button from "sap/m/Button";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import CustomData from "sap/ui/core/CustomData";

QUnit.module("runtime/jsx");

QUnit.test("jsx() constructs a UI5 control with the passed settings", (assert) => {
	const b = jsx(Button, { text: "Hello" }) as Button;
	assert.ok(b instanceof Button, "returned instance is a Button");
	assert.strictEqual(b.getText(), "Hello", "text setting applied");
	b.destroy();
});

QUnit.test("jsxs is an alias for jsx", (assert) => {
	assert.strictEqual(jsxs, jsx, "jsxs === jsx");
});

QUnit.test("single child is placed into the default aggregation", (assert) => {
	const inner = jsx(Text, { text: "child" }) as Text;
	const outer = jsx(VBox, { children: inner }) as VBox;
	const items = outer.getItems();
	assert.strictEqual(items.length, 1, "one child in default aggregation");
	assert.strictEqual(items[0], inner, "same instance placed into aggregation");
	outer.destroy();
});

QUnit.test("multiple children flatten into the default aggregation", (assert) => {
	const a = jsx(Text, { text: "a" }) as Text;
	const b = jsx(Text, { text: "b" }) as Text;
	const outer = jsx(VBox, { children: [a, b] }) as VBox;
	assert.deepEqual(outer.getItems(), [a, b], "both children in order");
	outer.destroy();
});

QUnit.test("string type throws when no htmlIntrinsic is registered", (assert) => {
	assert.throws(
		() => jsx("div", { children: "hi" }),
		/htmlIntrinsic|renderer/i,
		"clear error naming the missing HTML intrinsic"
	);
});

// Babel's automatic JSX transform extracts `key` from the element's attributes
// and passes it as the third argument to jsx(). Controls that declare a real
// `key` property (like sap.ui.core.CustomData) must receive that value.
QUnit.test("jsx() forwards the third 'key' arg to a control that has a key property", (assert) => {
	const cd = jsx(CustomData, { value: "123test" }, "testkey") as CustomData;
	assert.strictEqual(cd.getKey(), "testkey", "key property set from third argument");
	cd.destroy();
});

QUnit.test("jsx() ignores the third 'key' arg for controls without a key property", (assert) => {
	// Button has no `key` property — the third arg must be silently dropped.
	assert.ok(() => {
		const b = jsx(Button, { text: "ok" }, "some-key") as Button;
		b.destroy();
		return true;
	}, "no throw when key arg passed to a control without a key property");
});
