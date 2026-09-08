import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type UIComponent from "sap/ui/core/UIComponent";
import type Event from "sap/ui/base/Event";
import Icon from "sap/ui/core/Icon";
import HTML from "sap/ui/core/HTML";
import Page from "sap/m/Page";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import * as Prism from "prismjs";

import { loadSource } from "../util/loadSource";
import { markdownStyles } from "../util/markdownStyles";
import { renderMarkdown } from "../util/markdown";
import { grammarsReady } from "../control/install-prism-global";

/**
 * # LearnDoc, markdown viewer with a right-side TOC
 *
 * Layout mirrors the SAP UI5 Card Explorer's Learn pages: main
 * markdown content on the left (~75%), a sticky **Table of Contents**
 * on the right (~25%) with clickable links to every heading in the
 * rendered document.
 *
 * On every route match the view:
 *   1. fetches `docs/${topic}.md` via `loadSource` (cached),
 *   2. renders it with `marked`, injecting a stable `id` for every
 *      heading via a `marked` renderer extension so the TOC links
 *      can target them,
 *   3. builds the TOC HTML from the same heading list and mounts it
 *      in the right panel,
 *   4. runs Prism on every fenced `code[class*=language-]` block for
 *      syntax highlighting,
 *   5. finds every ```` ```mermaid ```` code block in the mounted
 *      HTML and swaps it for a rendered SVG via the lazy-loaded
 *      mermaid module.
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export default class LearnDoc extends View {
	private titleControl!: Title;
	private iconControl!: Icon;
	private body!: HTML;
	private toc!: HTML;
	private currentTopic: string = "";
	private routerAttached = false;

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.iconControl = new Icon({ src: "sap-icon://education", size: "1.5rem" });
		this.iconControl.addStyleClass("sapUiSmallMarginEnd");
		this.titleControl = new Title({ text: "Learn", level: "H2" });
		this.body = new HTML({ content: `<div class="jsx-showcase-doc-body"><p><i>Loading…</i></p></div>` });
		this.toc = new HTML({ content: `<div class="jsx-showcase-toc-outer"></div>` });

		const main = new VBox({});
		main.addStyleClass("sapUiLargeMargin");
		main.addStyleClass("jsx-showcase-doc-main");

		const header = new HBox({});
		header.addStyleClass("sapUiSmallMarginBottom");
		header.addItem(this.iconControl);
		header.addItem(this.titleControl);
		main.addItem(header);
		main.addItem(this.body);

		const tocWrap = new VBox({});
		tocWrap.addStyleClass("jsx-showcase-doc-toc");
		tocWrap.addItem(this.toc);

		const row = new HBox({ renderType: "Bare" });
		row.addStyleClass("jsx-showcase-doc-row");
		row.addItem(main);
		row.addItem(tocWrap);

		return (
			<Page showHeader={false} enableScrolling={true} class="jsx-showcase-fullheight">
				{row}
			</Page>
		);
	}

	public onAfterRendering(): void {
		if (this.routerAttached) return;
		this.routerAttached = true;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const Component = sap.ui.require("sap/ui/core/Component") as any;
		const comp = Component?.getOwnerComponentFor(this) as UIComponent | undefined;
		const router = comp?.getRouter();
		if (!router) return;
		// LearnDoc is targeted only by the `learnDoc` route
		// (`learn/{topic}`). The empty pattern is owned by the
		// separate `welcome` route/target now.
		router.getRoute("learnDoc")?.attachPatternMatched((event: Event) => this.onPatternMatched(event));
		this.reloadFromHash();
	}

	private onPatternMatched(event: Event): void {
		const eventWithGeneric = event as unknown as { getParameter(name: string): unknown };
		const args = (eventWithGeneric.getParameter("arguments") as Record<string, string> | undefined) ?? {};
		this.renderTopic(args.topic ?? "");
	}

	private reloadFromHash(): void {
		const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
		const m = /learn\/([^/?#]+)/.exec(hash);
		if (m) this.renderTopic(m[1]);
	}

	private renderTopic(topic: string): void {
		if (!topic || topic === this.currentTopic) return;
		this.currentTopic = topic;
		this.body.setContent(`<div class="jsx-showcase-doc-body"><p><i>Loading…</i></p></div>`);
		this.toc.setContent(`<div class="jsx-showcase-toc-outer"></div>`);
		loadSource(`docs/${topic}.md`)
			.then((md) => {
				const { html, headings, title } = renderMarkdown(md, "Learn");
				this.titleControl.setText(title);
				this.iconControl.setSrc(iconForTopic(topic));
				// `sap.ui.core.HTML` requires a single root DOM node in
				// its content, passing `<style>` + `<div>` side by side
				// yields two roots, and the control's re-render then
				// leaks the previous topic's content into the DOM.
				// Wrap both in one outer `<div>` so `setContent` has a
				// single root to replace.
				this.body.setContent(
					`<div class="jsx-showcase-doc-body">` +
					`<style>${markdownStyles()}</style>` +
					`<div class="jsx-showcase-markdown">${html}</div>` +
					`</div>`
				);
				this.toc.setContent(renderToc(headings));
				void grammarsReady.then(() => {
					setTimeout(() => {
						this.highlightCodeBlocks();
						void this.hydrateMermaidBlocks();
					}, 0);
				});
			})
			.catch((error: unknown) => {
				this.body.setContent(
					`<div class="jsx-showcase-doc-body"><p><i>Could not load docs/${escapeHtml(topic)}.md: ${escapeHtml(String(error))}</i></p></div>`
				);
				this.toc.setContent(`<div class="jsx-showcase-toc-outer"></div>`);
			});
	}

	private highlightCodeBlocks(): void {
		const root = this.getDomRef();
		if (!root) return;
		const codeBlocks = root.querySelectorAll("pre > code[class*='language-']");
		codeBlocks.forEach((el) => {
			if (el instanceof HTMLElement) {
				// Mermaid blocks are handled by `hydrateMermaidBlocks`
				// leave the raw text in place until it swaps in the
				// SVG.
				if (el.className.includes("language-mermaid")) return;
				Prism.highlightElement(el);
			}
		});
	}

	/**
	 * Find every fenced ```` ```mermaid ```` block in the mounted
	 * markdown HTML and replace it with a rendered SVG. Uses the
	 * lazy-loaded mermaid module so pages without diagrams pay no
	 * bundle cost, and mermaid's global config picks up the current
	 * UI5 theme via `readUi5Palette` inside the wrapping control.
	 *
	 * Runs after `setContent` has produced a `<pre><code class="language-mermaid">…</code></pre>`
	 * shape. We grab the raw text, generate a unique `id`, ask
	 * mermaid for the SVG, and swap the entire `<pre>` for the
	 * result. On failure the block stays as source with an error
	 * comment inline so authors can spot the issue during editing.
	 */
	private async hydrateMermaidBlocks(): Promise<void> {
		const root = this.getDomRef();
		if (!root) return;
		const blocks = root.querySelectorAll("pre > code.language-mermaid");
		if (blocks.length === 0) return;

		// Dynamically require mermaid via the app's ns-prefixed AMD
		// id, same path the lazy `<Mermaid>` control uses (see
		// `webapp/util/lazyMermaid.ts`). Keeps mermaid out of the
		// module graph for topics that don't need it.
		const mermaid = await loadMermaid();
		if (!mermaid) return;

		// Theme-agnostic initialise. Both this hydrator and the
		// `<Mermaid>` control pin a fixed light palette so diagrams
		// stay legible against the solid white frame we wrap them in
		// below, regardless of the app's current theme.
		mermaid.initialize({
			startOnLoad: false,
			theme: "base",
			themeVariables: fixedLightPalette(),
			securityLevel: "loose",
			flowchart: { htmlLabels: true, curve: "basis" }
		});

		let i = 0;
		for (const code of Array.from(blocks)) {
			const codeEl = code as HTMLElement;
			const pre = codeEl.parentElement;
			if (!pre) continue;
			const source = (codeEl.textContent ?? "").trim();
			if (!source) continue;
			const id = `jsx-showcase-mmd-${Date.now()}-${i++}`;
			try {
				const { svg } = await mermaid.render(id, source);
				// Wrap in a solid white surface, same shape the
				// `<Mermaid>` control's renderer produces (see
				// `webapp/control/Mermaid.tsx`), so a diagram embedded
				// in Learn markdown reads on both light and dark.
				const wrap = document.createElement("div");
				wrap.className = "jsx-showcase-mermaid jsx-showcase-mermaid-frame";
				wrap.setAttribute(
					"style",
					"background:#ffffff;border:1px solid #e5e7eb;border-radius:0.4rem;padding:0.75rem;margin:0.75rem 0;overflow:auto;"
				);
				wrap.innerHTML = svg;
				pre.replaceWith(wrap);
			} catch (err: unknown) {
				const comment = document.createElement("div");
				comment.className = "jsx-showcase-mermaid-error";
				comment.textContent = `Mermaid render failed: ${String(err)}`;
				pre.insertAdjacentElement("beforebegin", comment);
			}
		}
	}
}

/**
 * Build the right-side Table of Contents. Includes H2s and H3s only
 * (H1 is the page title, already shown above). H3s indent one level.
 */
function renderToc(headings: Array<{ level: number; text: string; id: string }>): string {
	const items = headings.filter((h) => h.level === 2 || h.level === 3);
	if (items.length === 0) return `<div class="jsx-showcase-toc-outer"></div>`;
	const rows = items.map((h) => {
		const cls = h.level === 3 ? "jsx-showcase-toc-item jsx-showcase-toc-sub" : "jsx-showcase-toc-item";
		return `<li class="${cls}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`;
	}).join("");
	// Wrap in a single outer <div>, sap.ui.core.HTML requires a
	// single root DOM node in its content. See the matching wrap
	// on `this.body` in renderTopic.
	return `<div class="jsx-showcase-toc-outer">` +
		`<style>${tocStyles()}</style>` +
		`<div class="jsx-showcase-toc-inner">` +
			`<div class="jsx-showcase-toc-title">Table of Contents</div>` +
			`<ul class="jsx-showcase-toc-list">${rows}</ul>` +
		`</div>` +
	`</div>`;
}

/**
 * Scoped stylesheet for the TOC card. Uses UI5 CSS variables so it
 * blends into both Horizon light and dark.
 */
function tocStyles(): string {
	return `
		.jsx-showcase-toc-inner {
			position: sticky;
			top: 1rem;
			padding: 1rem 1.25rem;
			background: var(--sapNeutralBackground, #f5f6f7);
			border: 1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.12));
			border-radius: 0.25rem;
			font-size: 0.875rem;
			line-height: 1.6;
		}
		.jsx-showcase-toc-title {
			font-weight: 700;
			font-size: 1rem;
			margin-bottom: 0.5rem;
			color: var(--sapTextColor, #131e29);
		}
		.jsx-showcase-toc-list {
			list-style: none;
			margin: 0;
			padding: 0;
		}
		.jsx-showcase-toc-item a {
			display: block;
			padding: 0.15rem 0;
			color: var(--sapLinkColor, #0070f2);
			text-decoration: none;
		}
		.jsx-showcase-toc-item a:hover {
			text-decoration: underline;
		}
		.jsx-showcase-toc-sub a {
			padding-left: 1rem;
			font-size: 0.83rem;
			color: var(--sapLinkColor, #0064d9);
		}
	`;
}

function iconForTopic(topic: string): string {
	switch (topic) {
		// Getting Started
		case "overview": return "sap-icon://hint";
		case "first-view": return "sap-icon://hello-world";
		case "auto-prefix": return "sap-icon://text";
		case "jsx-vs-xmlview": return "sap-icon://compare";
		// Setup
		case "setup": return "sap-icon://download";
		case "tsconfig": return "sap-icon://validate";
		case "ui5-yaml": return "sap-icon://shipping-status";
		// JSX Concepts
		case "controls": return "sap-icon://sap-ui5";
		case "props-typing": return "sap-icon://validate";
		case "aggregations": return "sap-icon://list";
		case "events": return "sap-icon://action";
		case "data-binding": return "sap-icon://database";
		case "fragments": return "sap-icon://collapse-group";
		case "nested-views": return "sap-icon://combine";
		case "routing": return "sap-icon://chain-link";
		case "directives": return "sap-icon://tree";
		case "type-coercion": return "sap-icon://alert";
		// Expert Corner
		case "runtime-anatomy": return "sap-icon://process";
		case "plugin-spi": return "sap-icon://puzzle";
		case "switch-plugin": return "sap-icon://switch-classes";
		default: return "sap-icon://education";
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// ── Mermaid support ─────────────────────────────────────────────
//
// Loading `mermaid` on demand keeps the ~1-2 MB library out of the
// initial bundle for pages that don't need it. The cached-module
// pattern mirrors what `control/Mermaid.tsx` does, we duplicate a
// slim version here rather than reusing the control because the
// control renders through UI5's `RenderManager` and produces a
// wrapping element we don't want inside plain-HTML markdown.

/** Structural subset of the mermaid module we actually call. */
type MermaidLike = {
	initialize(config: unknown): void;
	render(id: string, source: string): Promise<{ svg: string }>;
};

let mermaidModuleCache: MermaidLike | null = null;
let mermaidLoadInFlight: Promise<MermaidLike | null> | null = null;

/**
 * Fetch mermaid once, cache the module handle, hand the same handle
 * to every subsequent caller. Resolves to `null` on failure so the
 * caller can degrade gracefully instead of throwing inside a
 * setTimeout callback.
 */
function loadMermaid(): Promise<MermaidLike | null> {
	if (mermaidModuleCache) return Promise.resolve(mermaidModuleCache);
	if (mermaidLoadInFlight) return mermaidLoadInFlight;
	mermaidLoadInFlight = new Promise((resolve) => {
		sap.ui.require(
			["ui5/community/jsx/showcase/thirdparty/mermaid"],
			(mod: unknown) => {
				const m = mod as { default?: MermaidLike } & MermaidLike;
				mermaidModuleCache = m.default ?? m;
				resolve(mermaidModuleCache);
			},
			(err: unknown) => {
				console.error("Failed to load mermaid:", err);
				resolve(null);
			}
		);
	});
	return mermaidLoadInFlight;
}

/**
 * Fixed light palette for mermaid diagrams embedded in Learn
 * markdown. Mirrors the palette in [control/Mermaid.tsx](../control/Mermaid.tsx),
 * see that file for the rationale (diagrams sit on a solid white
 * surface regardless of the app's theme, so a fixed light palette
 * keeps their line / node / cluster colours legible without
 * chasing UI5's CSS variables).
 */
function fixedLightPalette(): Record<string, string> {
	return {
		background: "#ffffff",
		primaryColor: "#0070f2",
		primaryTextColor: "#ffffff",
		primaryBorderColor: "#0854a0",
		secondaryColor: "#eff1f2",
		secondaryTextColor: "#131e29",
		secondaryBorderColor: "#cccccc",
		tertiaryColor: "#eff1f2",
		tertiaryTextColor: "#131e29",
		tertiaryBorderColor: "#cccccc",
		lineColor: "#131e29",
		textColor: "#131e29",
		nodeBorder: "#cccccc",
		nodeTextColor: "#131e29",
		clusterBkg: "#f5f6f7",
		clusterBorder: "#cccccc",
		titleColor: "#131e29",
		edgeLabelBackground: "#ffffff"
	};
}
