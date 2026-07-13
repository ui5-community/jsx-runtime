import { marked } from "marked";

/**
 * # Markdown → HTML with heading anchors
 *
 * Shared between [LearnDoc.tsx](../view/LearnDoc.tsx) (the Learn
 * section's markdown viewer) and
 * [ExploreSample.tsx](../view/ExploreSample.tsx) (which renders a
 * per-sample description above the demo+code split).
 *
 * `renderMarkdown` uses a `marked` renderer extension to inject a
 * stable `id="…"` attribute on every heading (via `slugify`). Two
 * headings with the same slug get a `-N` suffix so links stay unique.
 * We do this by hooking into `marked`'s tokenisation rather than
 * post-processing the emitted HTML, `marked` already gives us the
 * raw heading text without inline-markup noise, so slugging is
 * cheaper and more reliable there than in the DOM.
 *
 * @namespace ui5.community.jsx.showcase.util
 */

/**
 * Slugify a heading text. Lowercased, non-alphanumerics collapsed to
 * `-`, trimmed. Duplicate-slug disambiguation happens in the caller
 * because it needs cross-heading state.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Parse a markdown document and return:
 *   - HTML with `id` attributes on every heading,
 *   - a flat list of `{level, text, id}` for building a table of
 *     contents,
 *   - the H1 title (or a caller-provided fallback if the doc has no
 *     H1).
 */
export function renderMarkdown(md: string, fallbackTitle: string = ""): {
	html: string;
	headings: Array<{ level: number; text: string; id: string }>;
	title: string;
} {
	const headings: Array<{ level: number; text: string; id: string }> = [];
	const seen = new Map<string, number>();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const renderer = new (marked as any).Renderer();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderer.heading = (arg: any, maybeLevel?: number) => {
		// marked v18 passes a token object `{ text, tokens, depth, raw }`
		// as the single argument (a change from earlier versions where
		// `(text, level)` were separate). Handle both to stay resilient
		// against a minor bump.
		let text: string;
		let level: number;
		if (typeof arg === "string") {
			text = arg;
			level = maybeLevel ?? 1;
		} else {
			text = (arg?.text as string) ?? "";
			level = (arg?.depth as number) ?? 1;
		}
		// Strip any residual HTML tags marked left in `text` (from
		// inline code, emphasis, etc.) for the slug and the TOC label.
		const plain = text.replace(/<[^>]+>/g, "").trim();
		const base = slugify(plain);
		const n = (seen.get(base) ?? 0) + 1;
		seen.set(base, n);
		const id = n === 1 ? base : `${base}-${n}`;
		headings.push({ level, text: plain, id });
		return `<h${level} id="${id}">${text}</h${level}>\n`;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const html = (marked as any).parse(md, { async: false, renderer }) as string;

	// H1 title, first `# X` line. Falls back to the caller's default
	// when the doc has no H1 (e.g. sample descriptions that go
	// straight into paragraphs).
	const titleMatch = /^#\s+(.+)$/m.exec(md);
	const title = titleMatch?.[1]?.trim() ?? fallbackTitle;
	return { html, headings, title };
}
