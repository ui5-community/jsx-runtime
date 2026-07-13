import IconPool from "sap/ui/core/IconPool";

/**
 * # sapIcon, embed SAP icons inside authored HTML
 *
 * The Welcome view's feature cards live inside a `sap.ui.core.HTML`
 * control (see [WelcomeBody.tsx](../view/WelcomeBody.tsx)). Native
 * `sap.ui.core.Icon` controls can't sit inside authored HTML, so we
 * emit the icon as a `<span>` carrying the SAP-icons font glyph
 * directly.
 *
 * `IconPool.getIconInfo(name)` returns a
 * `{ content, fontFamily }` bag with the unicode code point + the
 * font family the browser needs to render it. The SAP icon font
 * itself is loaded by UI5's core at boot, so calling this helper
 * from `onAfterRendering` always returns a resolved icon.
 *
 * @namespace ui5.community.jsx.showcase.util
 */

/**
 * Return the HTML snippet for an SAP icon. `name` is the bare icon
 * name (e.g. `"sap-ui5"`, `"puzzle"`, `"source-code"`) as it appears
 * on
 * [Icon Explorer](https://ui5.sap.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html).
 * Wraps the glyph in a `<span>` carrying the `sapUiIcon` class (so
 * UI5's stylesheet contributes baseline sizing / anti-aliasing) plus
 * a caller-controlled `className` for size + colour.
 *
 * Returns an empty string if the icon can't be resolved (defensive:
 * every icon named in the showcase ships with the SAP-icons font
 * bundled by UI5 core, so this path shouldn't fire in practice).
 */
export function iconHtml(name: string, className: string = ""): string {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const info = (IconPool as any).getIconInfo(name) as
		| { content?: string; fontFamily?: string }
		| undefined;
	const content = info?.content;
	const fontFamily = info?.fontFamily ?? "SAP-icons";
	if (typeof content !== "string" || content.length === 0) {
		return "";
	}
	const escaped = escapeHtml(content);
	const cls = className ? ` ${className}` : "";
	// `aria-hidden` because the icon is decorative; the surrounding
	// card carries the accessible label.
	return `<span class="sapUiIcon${cls}" style="font-family: '${fontFamily}';" aria-hidden="true">${escaped}</span>`;
}

/**
 * HTML-escape any special characters in the icon glyph. UI5's font
 * places every icon on a private-use codepoint, so the raw character
 * is safe HTML in practice, but escaping is cheap insurance and
 * keeps this helper resilient if callers ever pass user input.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
