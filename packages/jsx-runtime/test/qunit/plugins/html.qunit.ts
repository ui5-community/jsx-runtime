/**
 * QUnit tests for the `plugins/html` (sap.html) opt-in plugin.
 *
 * Strategy: since `sap.html` ships in OpenUI5 1.154.0 and the test
 * environment runs on 1.148.2, the tests fake the `sap/html/*` and
 * `sap/ui/core/html/TextContent` modules by wrapping `sap.ui.require`
 * with a function that returns stub `ManagedObject.extend` subclasses
 * for the known fake paths, and falls through to the real require for
 * everything else.
 *
 * Tests cover:
 *   - tag-to-module-path resolution (pure function)
 *   - `resolveHtmlControl` sync require + error case
 *   - `normaliseHtmlProps`: void-element guard, sole text child,
 *     mixed content (TextContent wrappers), all-control children
 *   - `sapHtmlIntrinsic` end-to-end via `withScope(htmlScope, …)`
 *   - control children inside an HTML control
 *   - `class=` and `ref=` forwarding
 *   - string tag inside `withScope(htmlScope)` dispatches to the handler
 */
import { jsx, withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import {
	tagToModulePath,
	resolveHtmlControl,
	normaliseHtmlProps,
	sapHtmlIntrinsic,
	htmlScope
} from "ui5/community/jsx/runtime/plugins/html/index";
import ManagedObject from "sap/ui/base/ManagedObject";
import Control from "sap/ui/core/Control";
import Text from "sap/m/Text";
import VBox from "sap/m/VBox";

// ---------------------------------------------------------------------------
// Fake sap.html.* and TextContent classes
// ---------------------------------------------------------------------------

// Minimal fake that mimics a sap.html element control.
// Extends Control (not ManagedObject) so that `addStyleClass`/`hasStyleClass`
// work, and so the control can be placed in sap.m.VBox.items which is typed
// for sap.ui.core.Control.
const FakeBase = Control.extend("ui5.community.jsx.runtime.test.html.FakeBase", {
	metadata: {
		defaultAggregation: "children",
		properties: {
			text: { type: "string", defaultValue: "" }
		},
		aggregations: {
			children: { type: "sap.ui.core.Control", multiple: true }
		}
	},
	renderer: { apiVersion: 2, render: () => {/* no-op for tests */ } }
});

// FakeBase is inferred as `Function` by TS (Control.extend returns `Function`);
// cast to `typeof Control` so .extend() is available for subclassing.
const FakeBaseClass = FakeBase as unknown as typeof Control;
const FakeDiv = FakeBaseClass.extend("ui5.community.jsx.runtime.test.html.FakeDiv", {});
const FakeSpan = FakeBaseClass.extend("ui5.community.jsx.runtime.test.html.FakeSpan", {});
const FakeH1 = FakeBaseClass.extend("ui5.community.jsx.runtime.test.html.FakeH1", {});
const FakeInput = FakeBaseClass.extend("ui5.community.jsx.runtime.test.html.FakeInput", {});
const FakeSelectedcontent = FakeBaseClass.extend(
	"ui5.community.jsx.runtime.test.html.FakeSelectedcontent",
	{}
);

// Minimal fake for sap/ui/core/html/TextContent (text-only control used in
// mixed content). Extends Control so it can be placed in children aggregations
// typed as sap.ui.core.Control.
const FakeTextContent = Control.extend(
	"ui5.community.jsx.runtime.test.html.FakeTextContent",
	{
		metadata: {
			properties: {
				text: { type: "string", defaultValue: "" }
			}
		},
		renderer: { apiVersion: 2, render: () => {/* no-op for tests */ } }
	}
);

// ---------------------------------------------------------------------------
// Fake require registry
// ---------------------------------------------------------------------------

// Map of module path → fake constructor. This is the lookup table that the
// patched sap.ui.require will consult for the single-string (sync) form.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FAKE_MODULES: Record<string, unknown> = {
	"sap/html/Div": FakeDiv,
	"sap/html/Span": FakeSpan,
	"sap/html/H1": FakeH1,
	"sap/html/Input": FakeInput,
	"sap/html/Selectedcontent": FakeSelectedcontent,
	"sap/ui/core/html/TextContent": FakeTextContent
};

// Keep a reference to the original sap.ui.require for tear-down.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sapUI = (globalThis as Record<string, any>)["sap"]?.["ui"] as
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Record<string, any> | undefined;
const originalRequire = sapUI?.["require"] as ((...args: unknown[]) => unknown) | undefined;

/**
 * Install the patched sap.ui.require that returns fake sap.html classes
 * for the module paths listed in FAKE_MODULES. All other single-string
 * calls fall through to the real require; multi-arg (async) calls are
 * passed through unchanged.
 */
function installFakeRequire(): void {
	if (!sapUI || !originalRequire) return;

	const patched = function patchedRequire(...args: unknown[]): unknown {
		// Single-string synchronous form: check fake registry first.
		if (args.length === 1 && typeof args[0] === "string") {
			const path = args[0];
			if (Object.prototype.hasOwnProperty.call(FAKE_MODULES, path)) {
				return FAKE_MODULES[path];
			}
		}
		// Everything else: delegate to original.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return originalRequire.apply(sapUI, args as Parameters<any>);
	};
	// Copy over any own properties (e.g. sap.ui.require.toUrl).
	Object.assign(patched, originalRequire);
	sapUI["require"] = patched;
}

function uninstallFakeRequire(): void {
	if (sapUI && originalRequire) {
		sapUI["require"] = originalRequire;
	}
}

// Install once for the entire test file before any modules run.
installFakeRequire();

// ---------------------------------------------------------------------------
// tagToModulePath — pure function, no require involved
// ---------------------------------------------------------------------------

QUnit.module("plugins/html — tagToModulePath");

QUnit.test("div → sap/html/Div", (assert) => {
	assert.strictEqual(tagToModulePath("div"), "sap/html/Div");
});
QUnit.test("span → sap/html/Span", (assert) => {
	assert.strictEqual(tagToModulePath("span"), "sap/html/Span");
});
QUnit.test("h1 → sap/html/H1 (only first char uppercased)", (assert) => {
	assert.strictEqual(tagToModulePath("h1"), "sap/html/H1");
});
QUnit.test("h6 → sap/html/H6", (assert) => {
	assert.strictEqual(tagToModulePath("h6"), "sap/html/H6");
});
QUnit.test("blockquote → sap/html/Blockquote", (assert) => {
	assert.strictEqual(tagToModulePath("blockquote"), "sap/html/Blockquote");
});
QUnit.test("selectedcontent → sap/html/Selectedcontent", (assert) => {
	assert.strictEqual(tagToModulePath("selectedcontent"), "sap/html/Selectedcontent");
});

// ---------------------------------------------------------------------------
// resolveHtmlControl — sync require via patched sap.ui.require
// ---------------------------------------------------------------------------

QUnit.module("plugins/html — resolveHtmlControl");

QUnit.test("resolves 'div' to FakeDiv", (assert) => {
	assert.strictEqual(resolveHtmlControl("div"), FakeDiv);
});
QUnit.test("resolves 'h1' to FakeH1", (assert) => {
	assert.strictEqual(resolveHtmlControl("h1"), FakeH1);
});
QUnit.test("resolves 'selectedcontent' to FakeSelectedcontent", (assert) => {
	assert.strictEqual(resolveHtmlControl("selectedcontent"), FakeSelectedcontent);
});
QUnit.test("throws a clear error for an unknown / not-preloaded tag", (assert) => {
	assert.throws(
		() => resolveHtmlControl("thisdoesnotexist"),
		/preloadSapHtml|not loaded/i,
		"error mentions preloadSapHtml"
	);
});

// ---------------------------------------------------------------------------
// normaliseHtmlProps — text-child normalisation
// ---------------------------------------------------------------------------

QUnit.module("plugins/html — normaliseHtmlProps");

QUnit.test("sole text child → `text` property, children removed", (assert) => {
	const result = normaliseHtmlProps("span", { children: "Hello" });
	assert.strictEqual((result as Record<string, unknown>).text, "Hello", "text set");
	assert.notOk("children" in result, "children removed");
});

QUnit.test("sole number child → `text` property (stringified)", (assert) => {
	const result = normaliseHtmlProps("span", { children: 42 });
	assert.strictEqual((result as Record<string, unknown>).text, "42");
});

QUnit.test("whitespace-only children treated as empty (no text, no children)", (assert) => {
	const result = normaliseHtmlProps("span", { children: ["  ", "\n  "] });
	assert.notOk("children" in result, "no children");
	assert.notOk("text" in result, "no text property for whitespace-only content");
});

QUnit.test("multiple text segments concatenated into `text`", (assert) => {
	const result = normaliseHtmlProps("span", { children: ["Hello, ", "World"] });
	assert.strictEqual((result as Record<string, unknown>).text, "Hello, World");
});

QUnit.test("mixed text + control → TextContent wrappers in children", (assert) => {
	const inner = new Text({ text: "ctrl" });
	const result = normaliseHtmlProps("p", { children: ["Before ", inner, " after"] });
	const children = (result as Record<string, unknown>).children as unknown[];
	assert.strictEqual(children.length, 3, "three children: TextContent, control, TextContent");
	assert.ok(children[0] instanceof FakeTextContent, "first child is FakeTextContent");
	assert.strictEqual(
		(children[0] as ManagedObject).getProperty("text") as string,
		"Before ",
		"first text segment preserved"
	);
	assert.strictEqual(children[1], inner, "control preserved in position");
	assert.ok(children[2] instanceof FakeTextContent, "third child is FakeTextContent");
	assert.strictEqual(
		(children[2] as ManagedObject).getProperty("text") as string,
		" after",
		"last text segment preserved"
	);
	inner.destroy();
	(children[0] as ManagedObject).destroy();
	(children[2] as ManagedObject).destroy();
});

QUnit.test("all-control children unchanged, no text property added", (assert) => {
	const a = new Text({ text: "a" });
	const b = new Text({ text: "b" });
	const result = normaliseHtmlProps("div", { children: [a, b] });
	const children = (result as Record<string, unknown>).children as unknown[];
	assert.deepEqual(children, [a, b], "children passed through as-is");
	assert.notOk("text" in result, "no text property added");
	a.destroy();
	b.destroy();
});

QUnit.test("void element with text child throws with 'void element' in message", (assert) => {
	assert.throws(
		() => normaliseHtmlProps("br", { children: "oops" }),
		/void element/i
	);
});

QUnit.test("void element with text property throws", (assert) => {
	assert.throws(
		() => normaliseHtmlProps("input", { text: "oops" }),
		/void element/i
	);
});

QUnit.test("non-void element with no children returns props unchanged", (assert) => {
	const result = normaliseHtmlProps("div", { text: "hello" });
	assert.deepEqual(result, { text: "hello" });
});

// ---------------------------------------------------------------------------
// sapHtmlIntrinsic + withScope(htmlScope, …) — integration
// ---------------------------------------------------------------------------

QUnit.module("plugins/html — sapHtmlIntrinsic / withScope(htmlScope)");

QUnit.test("constructs the resolved control class via jsx()", (assert) => {
	const inst = withScope(htmlScope, () => sapHtmlIntrinsic("div", {}));
	assert.ok(inst instanceof FakeDiv, "instance of FakeDiv");
	(inst as ManagedObject).destroy();
});

QUnit.test("sole text child lands as `text` property on the control", (assert) => {
	const inst = withScope(htmlScope, () =>
		sapHtmlIntrinsic("span", { children: "Hello" })
	) as ManagedObject;
	assert.strictEqual(inst.getProperty("text") as string, "Hello");
	inst.destroy();
});

QUnit.test("UI5 control child lands in default aggregation 'children'", (assert) => {
	const textCtrl = jsx(Text, { text: "inner" }) as Text;
	const inst = withScope(htmlScope, () =>
		sapHtmlIntrinsic("div", { children: textCtrl })
	) as ManagedObject;
	const agg = inst.getAggregation("children") as unknown[];
	assert.ok(Array.isArray(agg) && agg.includes(textCtrl), "control in children aggregation");
	inst.destroy();
});

QUnit.test("class= is applied via addStyleClass", (assert) => {
	const inst = withScope(htmlScope, () =>
		sapHtmlIntrinsic("div", { class: "myClass" })
	) as ManagedObject;
	assert.ok(
		(inst as unknown as { hasStyleClass(c: string): boolean }).hasStyleClass("myClass"),
		"style class added"
	);
	inst.destroy();
});

QUnit.test("HTML control as child of sap.m.VBox works", (assert) => {
	const htmlChild = withScope(htmlScope, () =>
		sapHtmlIntrinsic("span", { children: "text" })
	) as ManagedObject;
	const vbox = jsx(VBox as unknown as Parameters<typeof jsx>[0], {
		children: htmlChild
	}) as VBox;
	const items = vbox.getItems();
	assert.ok(items.includes(htmlChild as never), "html control in VBox items");
	vbox.destroy();
});

QUnit.test("ref= callback receives the constructed instance", (assert) => {
	let received: unknown;
	const inst = withScope(htmlScope, () =>
		sapHtmlIntrinsic("div", { ref: (i: unknown) => { received = i; } })
	) as ManagedObject;
	assert.strictEqual(received, inst, "ref called with instance");
	inst.destroy();
});

QUnit.test("jsx('span') inside withScope(htmlScope) dispatches to htmlIntrinsic", (assert) => {
	const inst = withScope(htmlScope, () =>
		jsx("span" as never, { children: "ok" })
	) as ManagedObject;
	assert.ok(inst instanceof FakeSpan, "resolved to FakeSpan via htmlIntrinsic");
	inst.destroy();
});

// ---------------------------------------------------------------------------
// Tear-down: restore original sap.ui.require after all tests
// ---------------------------------------------------------------------------

QUnit.done(() => {
	uninstallFakeRequire();
});
