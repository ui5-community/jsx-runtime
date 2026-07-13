/**
 * QUnit tests for the sample <Switch>/<Case>/<Default> plugin.
 *
 * Exercises both modes (literal and bound) plus the structural error
 * cases (unknown child, duplicate default).
 */
import { jsx, withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { Switch, Case, Default, switchProcessor } from "ui5/community/jsx/runtime/plugins/switch/index";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import JSONModel from "sap/ui/model/json/JSONModel";

QUnit.module("plugins/switch");

QUnit.test("literal mode: emits the matching case's children", (assert) => {
	withScope({ childrenProcessors: [switchProcessor] }, () => {
		const info = jsx(Text, { text: "INFO" }) as Text;
		const warn = jsx(Text, { text: "WARN" }) as Text;
		const fallback = jsx(Text, { text: "??" }) as Text;
		const outer = jsx(VBox, {
			children: jsx(Switch as never, {
				on: "info",
				children: [
					jsx(Case as never, { when: "info", children: info }),
					jsx(Case as never, { when: "warning", children: warn }),
					jsx(Default as never, { children: fallback })
				]
			})
		}) as VBox;
		assert.deepEqual(outer.getItems(), [info], "only the matching case is emitted");
		outer.destroy();
	});
});

QUnit.test("literal mode: emits the default when no case matches", (assert) => {
	withScope({ childrenProcessors: [switchProcessor] }, () => {
		const fallback = jsx(Text, { text: "??" }) as Text;
		const outer = jsx(VBox, {
			children: jsx(Switch as never, {
				on: "unknown",
				children: [
					jsx(Case as never, { when: "info", children: jsx(Text, { text: "INFO" }) }),
					jsx(Default as never, { children: fallback })
				]
			})
		}) as VBox;
		assert.deepEqual(outer.getItems(), [fallback], "default emitted");
		outer.destroy();
	});
});

QUnit.test("bound mode: each branch gets a visible expression binding", (assert) => {
	withScope({ childrenProcessors: [switchProcessor] }, () => {
		const info = jsx(Text, { text: "INFO" }) as Text;
		const fallback = jsx(Text, { text: "??" }) as Text;
		const outer = jsx(VBox, {
			children: jsx(Switch as never, {
				on: { path: "/kind" },
				children: [
					jsx(Case as never, { when: "info", children: info }),
					jsx(Default as never, { children: fallback })
				]
			})
		}) as VBox;
		outer.setModel(new JSONModel({ kind: "info" }));
		assert.ok(info.getBindingInfo("visible"), "info child has visible binding");
		assert.ok(fallback.getBindingInfo("visible"), "default child has visible binding");
		outer.destroy();
	});
});

QUnit.test("throws for a non-<Case>/<Default> child", (assert) => {
	withScope({ childrenProcessors: [switchProcessor] }, () => {
		assert.throws(
			() => jsx(VBox, {
				children: jsx(Switch as never, {
					on: "info",
					children: jsx(Text, { text: "orphan" })
				})
			}),
			/Case|Default|sentinel/i,
			"error names the structural mistake"
		);
	});
});

QUnit.test("throws for duplicate <Default>", (assert) => {
	withScope({ childrenProcessors: [switchProcessor] }, () => {
		assert.throws(
			() => jsx(VBox, {
				children: jsx(Switch as never, {
					on: "info",
					children: [
						jsx(Default as never, { children: jsx(Text, {}) }),
						jsx(Default as never, { children: jsx(Text, {}) })
					]
				})
			}),
			/Default/,
			"error mentions Default"
		);
	});
});
