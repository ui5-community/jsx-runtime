import Control from "sap/ui/core/Control";
import * as Prism from "prismjs";
// Bootstrap: sets `globalThis.Prism`, injects the default stylesheet,
// and exposes `grammarsReady`, a Promise that resolves after the
// TS/JSX/TSX/markup/bash/markdown grammar modules have loaded.
import { grammarsReady } from "./install-prism-global";

import { loadSource } from "../util/loadSource";

/**
 * # `<CodeBlock>`, a UI5 control that renders syntax-highlighted source
 *
 * Two consumption modes:
 *
 *  1. **Inline source**, pass `source` directly (a string literal or
 *     a value the caller already has in hand).
 *  2. **Lazy-fetch**, pass `sourcePath` (project-relative, e.g.
 *     `"view/HelloShowcase.tsx"`). The control loads the file the
 *     first time it's rendered and caches via `util/loadSource.ts`.
 *
 * Language is inferred from the file extension when `sourcePath` is
 * provided (`.tsx` / `.jsx` → `"tsx"`, `.ts` → `"typescript"`, `.xml`
 * → `"markup"`, `.md` → `"markdown"`, `.sh` → `"bash"`, everything
 * else → whatever `language` prop was set, defaulting to `"tsx"`).
 * Passing an explicit `language` overrides inference.
 *
 * `Prism.highlightElement` runs in `onAfterRendering`, replacing the
 * code text with tokenised spans.
 *
 * ## Theming
 *
 * The base `prism.css` theme ships with the library; a matching dark
 * theme (`prism-tomorrow.css`) is swapped in when the active UI5
 * theme is a dark one. See
 * [install-prism-global.ts](./install-prism-global.ts) for the
 * theme-swap listener.
 *
 * Ported from `webapp/control/CodeBlock.tsx` in the reference app at
 * `/Users/d039071/SAPDevelop/_work/tsx/ui5.app.tsx/`.
 *
 * @namespace ui5.community.jsx.showcase.control
 */
export interface $CodeBlockSettings {
	source?: string;
	sourcePath?: string;
	language?: string;
	/** Optional caption shown above the code, typically the file path. */
	filename?: string;
	/**
	 * Strip the file-level `/** … *\/` JSDoc block from the source
	 * before display. The disk file is untouched, the strip runs on
	 * the in-memory copy after `loadSource` resolves. Method-level or
	 * inline `/** *\/` blocks further down the file stay visible.
	 *
	 * The block's `@namespace` annotation is preserved (collapsed to a
	 * minimal one-line JSDoc) — it's required for the UI5 transpile
	 * step, so the displayed snippet stays a faithful, copy-able source.
	 * Default `false`.
	 */
	stripLeadingJsdoc?: boolean;
	/**
	 * Strip the `getAutoPrefixId(): boolean { return true; }` override
	 * from the displayed source. Every sample view keeps the method on
	 * disk, the runtime reads it to enable per-view id prefixing,
	 * but showing the same three-line boilerplate in every displayed
	 * sample is noise. See `webapp/docs/first-view.md` for the
	 * "About getAutoPrefixId" write-up we point readers at instead.
	 * Default `false`.
	 */
	stripAutoPrefixIdMethod?: boolean;
}

/**
 * @namespace ui5.community.jsx.showcase.control
 */
export default class CodeBlock extends Control {
	static readonly metadata = {
		properties: {
			source: { type: "string", defaultValue: "" },
			sourcePath: { type: "string", defaultValue: "" },
			language: { type: "string", defaultValue: "tsx" },
			filename: { type: "string", defaultValue: "" },
			stripLeadingJsdoc: { type: "boolean", defaultValue: false },
			stripAutoPrefixIdMethod: { type: "boolean", defaultValue: false }
		}
	};

	constructor(settings?: $CodeBlockSettings) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		super(settings as any);
	}

	// UI5's metadata mixin generates these at runtime.
	getSource!: () => string;
	getSourcePath!: () => string;
	getLanguage!: () => string;
	getFilename!: () => string;
	getStripLeadingJsdoc!: () => boolean;
	getStripAutoPrefixIdMethod!: () => boolean;
	setSource!: (v: string) => this;
	setSourcePath!: (v: string) => this;
	setLanguage!: (v: string) => this;
	setFilename!: (v: string) => this;
	setStripLeadingJsdoc!: (v: boolean) => this;
	setStripAutoPrefixIdMethod!: (v: boolean) => this;

	/**
	 * Which sourcePath we've already served content from. Used both
	 * to skip a duplicate fetch (when a re-render fires for the same
	 * path) and to force a re-fetch when the caller flips the path
	 * to a different file, in which case the previous `source`
	 * value is stale and must be replaced.
	 */
	private _fetchInFlightFor: string = "";
	private _lastServedPath: string = "";

	static readonly renderer = {
		apiVersion: 2,
		render(rm: RenderManagerLike, control: CodeBlock): void {
			const language = inferLanguage(control);
			const source = control.getSource();
			const filename = control.getFilename();

			rm.openStart("div", control);
			rm.class("jsx-showcase-CodeBlock");
			rm.style("border", "1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.12))");
			rm.style("border-radius", "0.25rem");
			rm.style("overflow", "hidden");
			rm.style("margin", "0.25rem 0");
			rm.openEnd();

			if (filename) {
				rm.openStart("div");
				rm.class("jsx-showcase-CodeBlock-filename");
				rm.style("font-family", "var(--sapFontMonospaceFamily, 'Consolas','Monaco',monospace)");
				rm.style("font-size", "0.75rem");
				rm.style("padding", "0.25rem 0.5rem");
				rm.style("background", "var(--sapObjectHeader_Background, rgba(0,0,0,0.04))");
				rm.style("border-bottom", "1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.08))");
				rm.style("color", "var(--sapTextColor, rgba(0,0,0,0.65))");
				rm.openEnd();
				rm.text(filename);
				rm.close("div");
			}

			rm.openStart("pre");
			rm.class(`language-${language}`);
			rm.style("margin", "0");
			rm.style("padding", "0.75rem 1rem");
			rm.style("background", "var(--sapNeutralBackground, #fafafa)");
			rm.style("color", "var(--sapTextColor, #333)");
			rm.style("font-family", "var(--sapFontMonospaceFamily, 'Consolas','Monaco',monospace)");
			rm.style("font-size", "0.8125rem");
			rm.style("line-height", "1.4");
			rm.openEnd();

			rm.openStart("code");
			rm.class(`language-${language}`);
			rm.openEnd();
			rm.text(source || (control.getSourcePath() ? "Loading…" : ""));
			rm.close("code");

			rm.close("pre");
			rm.close("div");
		}
	};

	onAfterRendering(): void {
		const path = this.getSourcePath();

		// Fire a fetch when: (a) the path is set and we haven't
		// fetched it yet, or (b) the path changed since we last
		// served content (caller flipped to a different file). The
		// `_fetchInFlightFor` guard suppresses the duplicate fetch
		// that `setSource`'s own re-render would otherwise trigger.
		const pathChanged = path && path !== this._lastServedPath;
		if (path && this._fetchInFlightFor !== path && (pathChanged || !this.getSource())) {
			this._fetchInFlightFor = path;
			// Clear stale content immediately so the panel doesn't
			// keep showing the previous file's source until the new
			// fetch resolves.
			if (this.getSource()) this.setSource("");
			loadSource(path)
				.then((text) => {
					if (this.getSourcePath() !== path) return; // navigated away
					let cleaned = text;
					if (this.getStripLeadingJsdoc()) {
						cleaned = stripLeadingJsdoc(cleaned);
					}
					if (this.getStripAutoPrefixIdMethod()) {
						cleaned = stripAutoPrefixIdMethod(cleaned);
					}
					this._lastServedPath = path;
					this.setSource(cleaned);
				})
				.catch((error: unknown) => {
					console.error(`CodeBlock: loadSource("${path}") failed:`, error);
					this._lastServedPath = path;
					this.setSource(`// Failed to load ${path}\n// ${String(error)}`);
				});
			return;
		}

		// Second (and every later) render: source is present. Wait
		// for the grammars to be registered, then ask Prism to
		// tokenise the code element in place.
		void grammarsReady.then(() => {
			const codeEl = this.getDomRef()?.querySelector("code");
			if (codeEl instanceof HTMLElement) {
				Prism.highlightElement(codeEl);
			}
		});
	}
}

/**
 * Infer the Prism language name from `sourcePath`'s extension. Falls
 * back to the `language` prop (default `"tsx"`) when the extension
 * can't be mapped.
 */
function inferLanguage(control: CodeBlock): string {
	const path = control.getSourcePath();
	if (path) {
		const ext = path.split(".").pop()?.toLowerCase() ?? "";
		if (ext === "tsx" || ext === "jsx") return "tsx";
		if (ext === "ts") return "typescript";
		if (ext === "js" || ext === "mjs" || ext === "cjs") return "javascript";
		if (ext === "xml" || ext === "html" || ext === "htm") return "markup";
		if (ext === "md" || ext === "markdown") return "markdown";
		if (ext === "sh" || ext === "bash") return "bash";
	}
	return control.getLanguage() || "tsx";
}

/**
 * Remove the file-level `/** … *\/` JSDoc block from a source
 * string, if it appears before the first non-comment declaration
 * (`export`, `function`, `class`, `const`, `let`, `var`, or a
 * decorator `@`). Preserves any leading imports and blank lines.
 *
 * Only the first matching block is removed, method-level or
 * inline JSDocs inside the class body stay untouched. The blank
 * line that typically follows the JSDoc is also consumed so the
 * remaining source starts clean.
 */
function stripLeadingJsdoc(src: string): string {
	return src.replace(
		/^([\s\S]*?)(\/\*\*[\s\S]*?\*\/\r?\n\r?\n?)(?=\s*(export|function|class|const|let|var|@))/,
		(_match: string, before: string, jsdoc: string): string => {
			// Keep the `@namespace` annotation even though the prose goes.
			// It's load-bearing: `babel-preset-transform-ui5` reads it to
			// place the generated module under the right UI5 namespace, so
			// a displayed sample that dropped it would no longer be a
			// faithful, copy-able source. Collapse the block to a minimal
			// one-line-annotation JSDoc when a namespace is present.
			const ns = /@namespace\s+([^\s*]+)/.exec(jsdoc);
			return ns ? `${before}/**\n * @namespace ${ns[1]}\n */\n` : before;
		}
	);
}

/**
 * Remove the `getAutoPrefixId(): boolean { return true; }` override
 * from a source string. Applied to sample views so the same three-line
 * boilerplate doesn't crowd every displayed sample. The on-disk file
 * keeps the method (the runtime reads it for auto-id-prefixing), this
 * only touches the in-memory copy the code panel shows.
 *
 * The regex is anchored to a line boundary (`m` flag + leading `^`)
 * and only ever consumes:
 *   1. line-internal whitespace before `getAutoPrefixId`
 *   2. the method body (permissively, accepts the multi-line form the
 *      samples use *and* a single-line form some editors auto-format to)
 *   3. line-internal whitespace after the closing `}` and its newline
 *   4. optionally one following blank line
 *
 * The indentation of the *next* member is not part of the match, so
 * `createContent()` keeps its leading tab. An earlier version used a
 * greedy `\s*` for step 3, which swallowed the tab in front of the
 * next member and produced mis-indented output.
 */
function stripAutoPrefixIdMethod(src: string): string {
	return src.replace(
		/^[ \t]*getAutoPrefixId\s*\(\s*\)\s*:\s*boolean\s*\{[\s\S]*?return\s+true\s*;?[ \t\r\n]*\}[ \t]*\r?\n([ \t]*\r?\n)?/m,
		""
	);
}

/** Structural subset of `RenderManager` we use here. */
type RenderManagerLike = {
	openStart(tag: string, control?: Control): RenderManagerLike;
	class(name: string): RenderManagerLike;
	style(name: string, value: string): RenderManagerLike;
	openEnd(): RenderManagerLike;
	text(text: string): RenderManagerLike;
	close(tag: string): RenderManagerLike;
};
