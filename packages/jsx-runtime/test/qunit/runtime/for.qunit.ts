/**
 * QUnit tests for `<For each={binding}>`.
 *
 * The literal-children case (a `<For>` with no `each`) is a structural
 * error, the runtime throws. The bound case installs a binding info
 * + template into the parent's default aggregation.
 */
import { jsx, For } from "ui5/community/jsx/runtime/jsx-runtime";
import List from "sap/m/List";
import StandardListItem from "sap/m/StandardListItem";

QUnit.module("runtime/for");

QUnit.test("<For each={binding}> installs an aggregation binding with template", (assert) => {
	const forNode = jsx(For as never, {
		each: { path: "/items" },
		children: () => jsx(StandardListItem, { title: "{name}" })
	});
	const list = jsx(List, { children: forNode }) as List;
	const info = list.getBindingInfo("items") as { path?: string; template?: unknown } | undefined;
	assert.ok(info, "binding info installed on `items`");
	assert.strictEqual(info?.path, "/items", "path preserved from each");
	assert.ok(info?.template instanceof StandardListItem, "template is the rendered child");
	list.destroy();
});

QUnit.test("<For each> throws when each is missing", (assert) => {
	assert.throws(
		() => {
			const forNode = jsx(For as never, {
				each: undefined,
				children: () => jsx(StandardListItem, {})
			});
			jsx(List, { children: forNode });
		},
		/binding info|ListBindingRef|each/i,
		"error names the missing binding"
	);
});

QUnit.test("<For aggregation=...> targets a named aggregation", (assert) => {
	const forNode = jsx(For as never, {
		each: { path: "/rows" },
		aggregation: "items",
		children: () => jsx(StandardListItem, { title: "{name}" })
	});
	const list = jsx(List, { children: forNode }) as List;
	const info = list.getBindingInfo("items") as { path?: string } | undefined;
	assert.strictEqual(info?.path, "/rows", "explicit aggregation used");
	list.destroy();
});
