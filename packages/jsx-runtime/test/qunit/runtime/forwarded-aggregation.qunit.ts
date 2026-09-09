/**
 * QUnit regression tests for issue #9: the auto-prefix-id feature must not
 * prefix UI5-generated ids.
 */
import View from "sap/ui/core/mvc/View";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import { jsx, withScope } from "ui5/community/jsx/runtime/jsx-runtime";

QUnit.module("runtime/forwarded-aggregation");

/**
 * Build a fresh anonymous JSX view with getAutoPrefixId() === true.
 */
function makeAutoPrefixView(factory: (view: View) => unknown): View {
	const ViewSub = View.extend("qunit.jsx.MenuAutoPfx" + Math.floor(Math.random() * 1e9), {
		getAutoPrefixId(): boolean {
			return true;
		},
		createContent(this: View): unknown {
			return factory(this);
		}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any) as unknown as { new (): View };
	return new ViewSub();
}

QUnit.test(
	"Menu with children inside explicit withScope(view) — no TypeError",
	async (assert) => {
		const dummyView = makeAutoPrefixView(() => null);
		await dummyView.loaded();

		let caught: unknown;
		let menu: Menu | undefined;
		try {
			withScope({ view: dummyView }, () => {
				menu = jsx(Menu, {
					children: [
						jsx(MenuItem, { text: "X" }),
						jsx(MenuItem, { text: "Y" }),
					]
				}) as Menu;
			});
		} catch (err) {
			caught = err;
		}

		assert.ok(caught == null, `no error thrown: ${String(caught)}`);
		if (menu) {
			const items = menu.getItems();
			assert.strictEqual(items.length, 2, "two items in Menu");
			assert.strictEqual((items[0] as MenuItem).getText(), "X", "first item text");
			assert.strictEqual((items[1] as MenuItem).getText(), "Y", "second item text");
			menu.destroy();
		}
		dummyView.destroy();
	}
);

QUnit.test(
	"Menu with children (no explicit id) in autoPrefixId view — no TypeError",
	async (assert) => {
		let view: View | undefined;
		let caught: unknown;
		try {
			view = makeAutoPrefixView(() =>
				jsx(Menu, {
					children: [
						jsx(MenuItem, { text: "One" }),
						jsx(MenuItem, { text: "Two" }),
					]
				})
			);
			await view.loaded();
		} catch (err) {
			caught = err;
		}

		assert.ok(caught == null, `no error thrown: ${String(caught)}`);
		if (view) {
			const content = view.getContent();
			assert.strictEqual(content.length, 1, "view has one root control (Menu)");
			const menu = content[0] as Menu;
			const items = menu.getItems();
			assert.strictEqual(items.length, 2, "two items in the Menu");
			assert.strictEqual((items[0] as MenuItem).getText(), "One", "first item text");
			assert.strictEqual((items[1] as MenuItem).getText(), "Two", "second item text");
			view.destroy();
		}
	}
);

QUnit.test(
	"Menu with children outside a view — still works (smoke test)",
	(assert) => {
		const menu = jsx(Menu, {
			children: [
				jsx(MenuItem, { text: "A" }),
				jsx(MenuItem, { text: "B" }),
			]
		}) as Menu;

		const items = menu.getItems();
		assert.strictEqual(items.length, 2, "two items in Menu");
		assert.strictEqual((items[0] as MenuItem).getText(), "A", "first item text");
		assert.strictEqual((items[1] as MenuItem).getText(), "B", "second item text");
		menu.destroy();
	}
);
