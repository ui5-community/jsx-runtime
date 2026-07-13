/**
 * QUnit tests for the auto-id-prefix bridge.
 *
 * The runtime patches `View.prototype.createContent` so a subclass's
 * own `createContent()` runs inside a `withScope({ view: this }, …)`.
 * Inside that scope, `jsx()` reads the view off the scope and, when
 * the view's `getAutoPrefixId()` returns `true`, replaces plain
 * string `id`s with the view-prefixed form (`view.createId(id)`),
 * matching XMLView's built-in behaviour.
 *
 * Tests here don't rely on JSX syntax, they call the runtime's
 * exported `jsx()` directly inside a fresh `View` subclass's
 * `createContent()`.
 */
import Button from "sap/m/Button";
import View from "sap/ui/core/mvc/View";
import Element from "sap/ui/core/Element";
import { jsx, withScope } from "ui5/community/jsx/runtime/jsx-runtime";

QUnit.module("runtime/auto-prefix-id");

/**
 * Build a fresh anonymous JSX view. The consumer controls what the
 * `createContent()` returns via the `factory` callback (called with
 * the view instance so it can compute view-relative ids), and
 * whether the view opts into id-prefixing via `autoPrefix`.
 */
function makeJsxView(autoPrefix: boolean, factory: (view: View) => unknown): View {
	const ViewSub = View.extend("qunit.jsx.AutoPrefix" + Math.floor(Math.random() * 1e9), {
		getAutoPrefixId(): boolean {
			return autoPrefix;
		},
		createContent(this: View): unknown {
			return factory(this);
		}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any) as unknown as { new (): View };
	return new ViewSub();
}

QUnit.test("id is prefixed when getAutoPrefixId() returns true", async (assert) => {
	const view = makeJsxView(true, () => jsx(Button, { id: "myButton", text: "hi" }));
	// `View.loaded()` completes createContent synchronously for TypedViews;
	// awaiting it here also survives the async loader path.
	await view.loaded();
	const viewId = view.getId();
	const expected = `${viewId}--myButton`;
	const btn = Element.getElementById(expected) as Button | undefined;
	assert.ok(btn, "control resolves under the view-prefixed id");
	assert.strictEqual(btn?.getText(), "hi", "settings applied through the prefix rewrite");
	assert.strictEqual(Element.getElementById("myButton"), undefined, "raw id not resolvable");
	view.destroy();
});

QUnit.test("id stays plain when getAutoPrefixId() returns false", async (assert) => {
	// Use a random raw id so this test doesn't collide with a stray
	// leftover from another test's view.
	const rawId = "plain_" + Math.floor(Math.random() * 1e9);
	const view = makeJsxView(false, () => jsx(Button, { id: rawId, text: "hi" }));
	await view.loaded();
	const btn = Element.getElementById(rawId) as Button | undefined;
	assert.ok(btn, "control resolves under the plain id");
	assert.strictEqual(btn?.getText(), "hi", "settings applied");
	view.destroy();
});

QUnit.test("jsx() outside a View leaves ids plain", (assert) => {
	// No View on the ambient scope, the withScope only carries the
	// controller pin. The bridge should be a no-op.
	const rawId = "outside_" + Math.floor(Math.random() * 1e9);
	withScope({ controller: null }, () => {
		const btn = jsx(Button, { id: rawId, text: "hi" }) as Button;
		assert.strictEqual(btn.getId(), rawId, "raw id used verbatim");
		btn.destroy();
	});
});

QUnit.test("already-prefixed ids are not double-wrapped", async (assert) => {
	// Caller passed an id that already carries the view prefix, the
	// bridge should leave it alone (same guard `View.byId` uses).
	const inner = "preprefixed_" + Math.floor(Math.random() * 1e9);
	const view = makeJsxView(true, (v) => {
		const alreadyPrefixed = `${v.getId()}--${inner}`;
		return jsx(Button, { id: alreadyPrefixed, text: "hi" });
	});
	await view.loaded();
	const expected = `${view.getId()}--${inner}`;
	const btn = Element.getElementById(expected) as Button | undefined;
	assert.ok(btn, "control resolves under the caller's already-prefixed id");
	// If double-wrapping had occurred the id would be `${view.getId()}--${view.getId()}--${inner}`.
	assert.notOk(
		Element.getElementById(`${view.getId()}--${expected}`),
		"no double-prefixed variant exists"
	);
	view.destroy();
});

QUnit.test("controls constructed without an id pass through", async (assert) => {
	const view = makeJsxView(true, () => jsx(Button, { text: "hi" }));
	await view.loaded();
	// Getting the first item out of the view without knowing the auto-id.
	const content = view.getContent();
	assert.strictEqual(content.length, 1, "one content control");
	assert.ok(content[0] instanceof Button, "the child is the Button");
	view.destroy();
});
