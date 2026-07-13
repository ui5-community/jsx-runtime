/**
 * Minimal scoped stylesheet applied to marked-produced HTML inside the
 * Overview and LearnDoc views. Colours resolve from UI5's Horizon CSS
 * variables with sensible fallbacks so both `sap_horizon` and
 * `sap_horizon_dark` render the injected HTML correctly.
 *
 * Consumers wrap their marked output in a `<div class="jsx-showcase-markdown">`
 * and inject the returned string inside a leading `<style>` block. See
 * `view/LearnDoc.tsx` for a full example.
 *
 * Extracted from the reference app's `view/Overview.tsx::markdownStyles`
 * helper so LearnDoc and Overview can share it verbatim.
 *
 * @namespace ui5.community.jsx.showcase.util
 */
export function markdownStyles(): string {
	return `
		.jsx-showcase-markdown a {
			color: var(--sapLinkColor, #0070f2);
		}
		.jsx-showcase-markdown a:hover {
			color: var(--sapLink_Hover_Color, #0064d9);
		}
		.jsx-showcase-markdown code {
			background: var(--sapNeutralBackground, rgba(0,0,0,0.04));
			color: var(--sapTextColor, #333);
			padding: 0.05rem 0.3rem;
			border-radius: 0.2rem;
			font-family: var(--sapFontMonospaceFamily, 'Consolas','Monaco',monospace);
			font-size: 0.875em;
		}
		.jsx-showcase-markdown pre {
			background: var(--sapNeutralBackground, #fafafa);
			color: var(--sapTextColor, #333);
			padding: 0.75rem 1rem;
			border: 1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.12));
			border-radius: 0.25rem;
			overflow-x: auto;
			font-family: var(--sapFontMonospaceFamily, 'Consolas','Monaco',monospace);
			font-size: 0.8125rem;
			line-height: 1.4;
		}
		.jsx-showcase-markdown pre code {
			background: transparent;
			padding: 0;
		}
		.jsx-showcase-markdown blockquote {
			border-left: 3px solid var(--sapInformativeElementColor, var(--sapInformationColor, #0070f2));
			background: var(--sapNeutralBackground, rgba(0,0,0,0.04));
			margin: 0.5rem 0;
			padding: 0.5rem 0.75rem;
			color: var(--sapTextColor, #333);
		}
		.jsx-showcase-markdown table {
			border-collapse: collapse;
			margin: 0.5rem 0;
		}
		.jsx-showcase-markdown th,
		.jsx-showcase-markdown td {
			border: 1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.12));
			padding: 0.25rem 0.5rem;
			text-align: left;
			vertical-align: top;
		}
		.jsx-showcase-markdown th {
			background: var(--sapObjectHeader_Background, rgba(0,0,0,0.04));
		}
		.jsx-showcase-markdown hr {
			border: none;
			border-top: 1px solid var(--sapGroup_ContentBorderColor, rgba(0,0,0,0.12));
			margin: 1rem 0;
		}
		.jsx-showcase-markdown h1,
		.jsx-showcase-markdown h2,
		.jsx-showcase-markdown h3,
		.jsx-showcase-markdown h4 {
			color: var(--sapTextColor, #131e29);
			margin-top: 1.25rem;
			margin-bottom: 0.5rem;
		}
		.jsx-showcase-markdown p {
			margin: 0.5rem 0;
			line-height: 1.5;
		}
		.jsx-showcase-markdown ul,
		.jsx-showcase-markdown ol {
			margin: 0.5rem 0;
			padding-left: 1.5rem;
		}
	`;
}
