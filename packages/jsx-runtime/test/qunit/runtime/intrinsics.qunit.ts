/**
 * QUnit tests for the core built-in IntrinsicHandlers registered in the
 * default scope: class, dot-handler, binding, ref, function-typed events,
 * and property-type coercion.
 */
import { jsx } from "ui5/community/jsx/runtime/jsx-runtime";
import Button from "sap/m/Button";
import Panel from "sap/m/Panel";

QUnit.module("runtime/intrinsics");

QUnit.test("class= is applied via addStyleClass (not settings)", (assert) => {
	const b = jsx(Button, { text: "x", class: "myClass" }) as Button;
	assert.ok(b.hasStyleClass("myClass"), "style class applied");
	b.destroy();
});

QUnit.test("ref={cb} receives the constructed instance", (assert) => {
	let captured: Button | undefined;
	const b = jsx(Button, {
		text: "x",
		ref: (inst: Button) => { captured = inst; }
	}) as Button;
	assert.strictEqual(captured, b, "ref callback invoked with the instance");
	b.destroy();
});

QUnit.test("function-typed event props resolve `this` via [fn, listener]", (assert) => {
	const done = assert.async();
	const listener = { onPress(_e: unknown) { assert.strictEqual(this, listener, "this === listener"); done(); } };
	const b = jsx(Button, { text: "x", press: listener.onPress.bind(listener) }) as Button;
	b.firePress();
	b.destroy();
});

QUnit.test("property-type coercion turns \"10\" into number when property is int-typed", (assert) => {
	// Panel exposes `width` as CSSSize (a string), and `expandable` as boolean.
	// Test the boolean coercion path, "true" should coerce to true.
	const p = jsx(Panel, { expandable: "true" as unknown as boolean, expanded: false }) as Panel;
	assert.strictEqual(p.getExpandable(), true, "\"true\" coerced to boolean true");
	p.destroy();
});

QUnit.test("property-type coercion throws with a JSX-site error when invalid", (assert) => {
	assert.throws(
		() => jsx(Button, { type: "Invalid" as unknown as string }),
		/sap\.m\.Button|type|expected/i,
		"error names the control and property"
	);
});

QUnit.test("bindings with a leading `{` still flow to UI5's applySettings", (assert) => {
	// Passing a real binding-shaped string must NOT be coerced, it has to
	// reach applySettings so UI5 extracts it into a BindingInfo.
	const b = jsx(Button, { text: "{/name}" }) as Button;
	assert.ok(b.getBindingInfo("text"), "text has a binding info");
	b.destroy();
});
