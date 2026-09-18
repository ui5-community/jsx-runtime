/**
 * `ui5.community.jsx.runtime/plugins/html` — opt-in `sap.html` integration.
 *
 * Makes lowercase HTML tags (`<div>`, `<span>`, `<input>`, …) work in TSX
 * views by mapping them to the real `sap.html.*` control classes introduced
 * in OpenUI5 1.154.0. Because these are ordinary UI5 `ManagedObject` controls
 * the full runtime pipeline is reused without change: data binding, events,
 * associations, dot-handler strings, `class=`, `ref=`, and auto-prefix-id
 * all work exactly as they do for any other control.
 *
 * ## Usage
 *
 * ```tsx
 * import { withScope }   from "ui5/community/jsx/runtime/jsx-runtime";
 * import { htmlScope, preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";
 *
 * // Once, at component init (async OK here):
 * await preloadSapHtml();
 *
 * // In a view's createContent():
 * createContent() {
 *   return withScope(htmlScope, () => (
 *     <div class="myCard">
 *       <h3>Hello</h3>
 *       <input value="{/name}" input={this.onNameChanged} />
 *     </div>
 *   ));
 * }
 * ```
 *
 * ## Tag resolution
 *
 * A lowercase tag `"div"` becomes module path `"sap/html/Div"` by
 * capitalising the first character. The only exception is `"selectedcontent"`
 * which maps to `"sap/html/Selectedcontent"` (the class name that mirrors
 * the HTML spec's lowercase `<selectedcontent>` element). All other elements
 * follow the simple capitalisation rule (e.g. `"h1"` → `"sap/html/H1"` …
 * wait — `"h1"` → `"H1"`: only the *first* character is uppercased, the rest
 * stay as-is so `"h1"` → `"H1"`, `"blockquote"` → `"Blockquote"`).
 *
 * The runtime is **synchronous** by design, so resolution uses
 * `sap.ui.require(modulePath)` which returns the already-loaded module
 * synchronously. Call `preloadSapHtml()` first to ensure the library (and
 * therefore every `sap/html/*` module) is loaded before any HTML-tag JSX
 * runs. A clear error is thrown if the module is not yet loaded.
 *
 * ## Text children
 *
 * HTML elements can hold text. `sap.html` exposes two mechanisms:
 *
 * - **Sole text child** — one string child with no sibling controls →
 *   the string is forwarded as the `text` property of the control.
 * - **Mixed content** — text interleaved with child controls → each text
 *   segment is wrapped in `sap.ui.core.html.TextContent` (a private core
 *   control), preserving source order in the `children` aggregation.
 *
 * ## Void elements
 *
 * Void elements (`br`, `hr`, `img`, `input`, `area`, `col`, `wbr`) cannot
 * have children or a `text` property. Providing either throws a clear error
 * at JSX construction time.
 *
 * @namespace ui5.community.jsx.runtime.plugins.html
 */

import Lib from "sap/ui/core/Lib";
import type ManagedObject from "sap/ui/base/ManagedObject";
import { jsx } from "../../runtime/runtime";
import type { ControlClass } from "../../runtime/runtime";
import type { Scope } from "../../runtime/scope";

// ---------------------------------------------------------------------------
// Ambient shims for sap.html + sap/ui/core/html types not in @openui5/types
// ---------------------------------------------------------------------------

/**
 * Minimal surface of the `sap.html.*` control constructors we need: every
 * sap/html/* class is constructable with a settings object, and has the
 * standard ManagedObject API. The actual settings shapes are typed via the
 * JSX.IntrinsicElements augmentation in runtime.ts; here we only need to
 * construct them.
 */
type SapHtmlControlClass = ControlClass<ManagedObject>;

// ---------------------------------------------------------------------------
// Void elements
// ---------------------------------------------------------------------------

/**
 * HTML void elements — they render no closing tag, must have no children, and
 * the `sap.html` controls for these elements reject `text` / `children`.
 */
const VOID_ELEMENTS = new Set([
	"area", "base", "br", "col", "embed", "hr", "img", "input",
	"link", "meta", "param", "source", "track", "wbr"
]);

// ---------------------------------------------------------------------------
// Tag → sap/html/* module path
// ---------------------------------------------------------------------------

/**
 * Map a lowercase HTML tag name to its `sap/html/*` AMD module path.
 * Rule: capitalise the first character only.
 * e.g. `"div"` → `"sap/html/Div"`, `"h1"` → `"sap/html/H1"`,
 *      `"blockquote"` → `"sap/html/Blockquote"`.
 *
 * The only special case is `"selectedcontent"` → `"sap/html/Selectedcontent"`,
 * which matches the actual class name in the library.
 */
export function tagToModulePath(tag: string): string {
	// Capitalise first letter only; everything else stays as-is.
	// "selectedcontent" → "Selectedcontent" (handled naturally by this rule).
	const className = tag.charAt(0).toUpperCase() + tag.slice(1);
	return `sap/html/${className}`;
}

/**
 * Synchronously resolve the `sap/html/*` control class for `tag`.
 *
 * Requires that `preloadSapHtml()` has been called and awaited beforehand
 * so the AMD module is already in the require cache. Throws a descriptive
 * error when the module is not loaded (typically because `preloadSapHtml()`
 * was skipped or awaited after JSX began constructing the tree).
 *
 * @throws {Error} when the tag is not a known sap.html element or the
 *   library was not preloaded before this JSX call.
 */
export function resolveHtmlControl(tag: string): SapHtmlControlClass {
	const modulePath = tagToModulePath(tag);
	// sap.ui.require with a single string argument (no callback) returns the
	// already-loaded module synchronously, or undefined if not yet loaded.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ctor = (globalThis as Record<string, any>)["sap"]?.["ui"]?.require(modulePath) as
		| SapHtmlControlClass
		| undefined;

	if (typeof ctor !== "function") {
		throw new Error(
			`ui5/community/jsx/runtime/plugins/html: <${tag}> maps to module ` +
			`"${modulePath}", but the module is not loaded. ` +
			`Did you call and await preloadSapHtml() before this JSX view rendered? ` +
			`Add \`await preloadSapHtml()\` to your Component.init() (or equivalent ` +
			`bootstrap point) before initialising the router / creating the first view.`
		);
	}
	return ctor;
}

// ---------------------------------------------------------------------------
// Text-child normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise the `children` and `text` fields in the props bag for an
 * `sap.html` control *before* delegating to the main `jsx()` factory.
 *
 * Rules (matching `XMLTemplateProcessor.handleChild` / sap.html semantics):
 *
 * 1. Void element with any `text` or `children` → throw.
 * 2. Sole text child (string or number, no other siblings) → forward as the
 *    `text` property; remove from `children`.
 * 3. Mixed content (text interleaved with control children) → wrap each
 *    text segment in a `sap/ui/core/html/TextContent` control inserted at
 *    the right position in `children`.
 * 4. All-control children → `children` unchanged; no `text` property added.
 *
 * Returns a new props object (shallow clone) with `children` and `text`
 * adjusted. The original props object is not mutated.
 */
export function normaliseHtmlProps(
	tag: string,
	props: Record<string, unknown> & { children?: unknown }
): Record<string, unknown> & { children?: unknown } {
	const isVoid = VOID_ELEMENTS.has(tag);
	const rawChildren = props.children;

	// For void elements: reject any children (or text property).
	if (isVoid) {
		const hasText = "text" in props && props.text !== undefined && props.text !== null;
		const hasChildren = rawChildren !== null && rawChildren !== undefined;
		if (hasText || hasChildren) {
			throw new Error(
				`ui5/community/jsx/runtime/plugins/html: <${tag}> is a void element ` +
				`and cannot have children or a text property. ` +
				`Found: ${hasChildren ? "children" : "text property"}.`
			);
		}
		return props;
	}

	if (rawChildren === undefined || rawChildren === null) {
		return props;
	}

	// Flatten children into a simple array for analysis. We do a shallow
	// flatten here (no fragment expansion) because the core's jsx() will
	// run flattenChildren on the final children value — we only need to
	// inspect the top-level children to distinguish "sole text" vs "mixed".
	const childArray: unknown[] = Array.isArray(rawChildren)
		? (rawChildren as unknown[])
		: [rawChildren];

	// Filter out whitespace-only strings (Babel indentation artifacts) so
	// they don't count as "content" when deciding sole-text vs mixed.
	const meaningful = childArray.filter(
		(c) => !(typeof c === "string" && c.trim() === "")
	);

	if (meaningful.length === 0) {
		// Only whitespace children — treat as no content, let core drop them.
		const { children: _children, ...rest } = props;
		return rest as Record<string, unknown> & { children?: unknown };
	}

	const allStrings = meaningful.every((c) => typeof c === "string" || typeof c === "number");
	const anyString = meaningful.some((c) => typeof c === "string" || typeof c === "number");

	if (allStrings) {
		// Sole text child path: combine all text segments (there may be more
		// than one if JSX emitted ["Hello ", " world"] from interpolation),
		// forward as `text` property. Removing `children` prevents the core
		// from trying to place them into the default aggregation.
		const textValue = meaningful.map(String).join("");
		const { children: _children, ...rest } = props;
		return { ...rest, text: textValue };
	}

	if (anyString) {
		// Mixed content: wrap each string in TextContent, keep controls as-is.
		const TextContent = resolveTextContent();
		const normalized = meaningful.map((c) => {
			if (typeof c === "string" || typeof c === "number") {
				return new TextContent({ text: String(c) });
			}
			return c;
		});
		const { children: _children, ...rest } = props;
		return { ...rest, children: normalized };
	}

	// All-control children — no normalisation needed.
	return props;
}

/**
 * Synchronously resolve `sap/ui/core/html/TextContent` — the private core
 * control used to carry inline text in mixed-content sap.html aggregations.
 * Same preload requirement as the sap/html/* controls (it is in sap.ui.core
 * which must be loaded; it is loaded by preloadSapHtml() via the core
 * library dependency chain).
 */
function resolveTextContent(): new (settings?: { text?: string }) => ManagedObject {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ctor = (globalThis as Record<string, any>)["sap"]?.["ui"]?.require(
		"sap/ui/core/html/TextContent"
	) as (new (settings?: { text?: string }) => ManagedObject) | undefined;
	if (typeof ctor !== "function") {
		throw new Error(
			`ui5/community/jsx/runtime/plugins/html: mixed text+control content ` +
			`requires "sap/ui/core/html/TextContent" (part of sap.ui.core), ` +
			`but the module is not loaded. ` +
			`Ensure preloadSapHtml() was awaited before this view rendered.`
		);
	}
	return ctor;
}

// ---------------------------------------------------------------------------
// The htmlIntrinsic handler
// ---------------------------------------------------------------------------

/**
 * The `htmlIntrinsic` implementation for the `sap.html` library.
 *
 * Installed via `withScope(htmlScope, fn)`. When `jsx()` encounters a
 * string-typed element (e.g. `<div>`) it delegates here. This handler:
 *
 * 1. Validates the tag and resolves it to the `sap/html/*` control class.
 * 2. Normalises text children to `text`/`TextContent` per sap.html semantics.
 * 3. Re-enters the normal `jsx(Class, props)` path so all core intrinsics
 *    (`class=`, dot-handlers, `ref=`, binding, prop-type coercion) apply.
 */
export const sapHtmlIntrinsic: NonNullable<Scope["htmlIntrinsic"]> = (
	tag: string,
	props: Record<string, unknown> & { children?: unknown }
): unknown => {
	const controlClass = resolveHtmlControl(tag);
	const normalised = normaliseHtmlProps(tag, props);
	// Re-enter the normal control-instance pipeline. The cast to
	// SapHtmlControlClass is safe: every sap/html/* class is a
	// ManagedObject subclass with standard metadata.
	return jsx(controlClass as SapHtmlControlClass, normalised);
};

// ---------------------------------------------------------------------------
// Scope entry point — spread into withScope
// ---------------------------------------------------------------------------

/**
 * Partial scope that installs the `sap.html` HTML intrinsic handler.
 *
 * Spread into `withScope` to enable HTML tags within that scope:
 *
 * ```tsx
 * import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
 * import { htmlScope } from "ui5/community/jsx/runtime/plugins/html/index";
 *
 * return withScope(htmlScope, () => (
 *   <div class="wrapper">…</div>
 * ));
 * ```
 */
export const htmlScope: Partial<Scope> = {
	htmlIntrinsic: sapHtmlIntrinsic
};

// ---------------------------------------------------------------------------
// Library preload
// ---------------------------------------------------------------------------

/**
 * Load the `sap.html` library and async-require every control it declares
 * (discovered from the library metadata's `controls` list) plus
 * `sap/ui/core/html/TextContent`, so that all `sap/html/*` modules are in
 * the synchronous require cache before any HTML-tag JSX view renders.
 *
 * Call **once** at application bootstrap — e.g. from `Component.init()` or
 * from the root view's `onBeforeRendering`. Await the returned promise before
 * initialising the router or opening any view that uses HTML tags.
 *
 * ```ts
 * // In Component.init():
 * super.init();
 * await preloadSapHtml();
 * this.getRouter().initialize();
 * ```
 *
 * Safe to call multiple times — UI5's `Lib.load` is idempotent.
 */
export async function preloadSapHtml(): Promise<void> {
	// Load the library and discover all its controls/elements from the
	// library metadata, then async-require all of them in one batch so
	// resolveHtmlControl() can use the sync single-arg sap.ui.require form.
	const lib = await Lib.load({ name: "sap.html" });

	// The Lib instance exposes the "controls" array declared in library.js.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const libAny = lib as unknown as Record<string, any>;
	const controls: string[] = Array.isArray(libAny["controls"]) ? libAny["controls"] : [];

	// Convert "sap.html.Div" → "sap/html/Div" (dot → slash).
	const modulePaths = controls.map((fqn: string) => fqn.replace(/\./g, "/"));

	// Ensure sap/ui/core/html/TextContent is also fetched — it is needed for
	// mixed text+control children but lives in sap.ui.core, not sap.html.
	modulePaths.push("sap/ui/core/html/TextContent");

	await new Promise<void>((resolve, reject) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(globalThis as Record<string, any>)["sap"]?.["ui"]?.require(
			modulePaths,
			() => resolve(),
			reject
		);
	});
}
