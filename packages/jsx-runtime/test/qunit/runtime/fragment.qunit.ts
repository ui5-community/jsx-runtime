/**
 * QUnit tests for `<Fragment>`, inlining and falsy filtering.
 */
import { jsx, Fragment } from "ui5/community/jsx/runtime/jsx-runtime";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";

QUnit.module("runtime/fragment");

QUnit.test("Fragment inlines its children into the parent aggregation", (assert) => {
	const t1 = jsx(Text, { text: "a" }) as Text;
	const t2 = jsx(Text, { text: "b" }) as Text;
	const t3 = jsx(Text, { text: "c" }) as Text;
	const frag = jsx(Fragment as never, { children: [t1, t2] });
	const outer = jsx(VBox, { children: [frag, t3] }) as VBox;
	assert.deepEqual(outer.getItems(), [t1, t2, t3], "fragment inlined between siblings");
	outer.destroy();
});

QUnit.test("falsy children are dropped", (assert) => {
	const t = jsx(Text, { text: "kept" }) as Text;
	const outer = jsx(VBox, { children: [null, undefined, false, "", t] }) as VBox;
	assert.deepEqual(outer.getItems(), [t], "only the truthy child remains");
	outer.destroy();
});

QUnit.test("whitespace-only strings are dropped (Babel indentation artefacts)", (assert) => {
	const t = jsx(Text, { text: "kept" }) as Text;
	const outer = jsx(VBox, { children: ["  ", t, "\n\t"] }) as VBox;
	assert.deepEqual(outer.getItems(), [t], "whitespace strings removed");
	outer.destroy();
});

QUnit.test("nested Fragments unwrap recursively", (assert) => {
	const t1 = jsx(Text, { text: "a" }) as Text;
	const t2 = jsx(Text, { text: "b" }) as Text;
	const inner = jsx(Fragment as never, { children: [t1, t2] });
	const outer = jsx(Fragment as never, { children: inner });
	const parent = jsx(VBox, { children: outer }) as VBox;
	assert.deepEqual(parent.getItems(), [t1, t2], "nested fragments fully inlined");
	parent.destroy();
});
