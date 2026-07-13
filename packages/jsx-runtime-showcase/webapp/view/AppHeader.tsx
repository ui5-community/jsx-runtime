import type Event from "sap/ui/base/Event";
import Button from "sap/m/Button";
import Title from "sap/m/Title";
import Image from "sap/m/Image";
import ObjectStatus from "sap/m/ObjectStatus";
import ToolbarSpacer from "sap/m/ToolbarSpacer";
import IconTabHeader from "sap/m/IconTabHeader";
import IconTabFilter from "sap/m/IconTabFilter";
import HTML from "sap/ui/core/HTML";
import { IconTabHeaderMode, ButtonType } from "sap/m/library";
import { ValueState } from "sap/ui/core/library";
import ToolHeader from "sap/tnt/ToolHeader";

import { openFeedback } from "../util/feedbackUrl";
import { toggleMode, getMode, type ThemeMode } from "../util/theme";
import { playThemeTransition } from "../util/themeTransition";

/**
 * # AppHeader, shared ToolHeader factory
 *
 * Returns the top bar used by both the Welcome view and the
 * Explorer shell so the chrome stays visually fixed when the
 * user switches between `#/`, `#/learn/…`, and `#/explore/…`.
 *
 * Contents (left-to-right):
 *
 *   * Logo image + "JSX Runtime for UI5" title
 *   * `Incubation` ObjectStatus pill (Warning tone)
 *   * IconTabHeader with three keys: `welcome`, `learn`, `explore`
 *   * API-reference button (opens `./api/index.html` in a new tab;
 *     the folder is populated by the runtime's TypeDoc build and
 *     copied into the showcase's `dist/` at build time. The path
 *     is spelled out to `index.html` because UI5's `ui5 serve`
 *     Express layer has no welcome-file concept — bare directory
 *     requests 404.)
 *   * Feedback button (opens a pre-filled GitHub issue via
 *     [util/feedbackUrl.ts](../util/feedbackUrl.ts))
 *   * Theme toggle
 *   * GitHub icon-only button
 *
 * The caller passes the `activeSection` to highlight, and a
 * `onSectionSelect` callback that receives the clicked tab's key.
 * The Welcome view maps the key to `router.navTo(…)`; the
 * Explorer view routes the same key through its controller.
 *
 * Same "factory function returning a control tree" pattern the
 * `*.fragment.tsx` files use. No JSX view subclass, no
 * controller, just a plain function.
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export interface AppHeaderOptions {
	/**
	 * Which top tab to highlight. Pass a literal key
	 * (`"welcome"` | `"learn"` | `"explore"`) for the static case,
	 * or a UI5 binding string like `"{explorerNav>/activeSection}"`
	 * so the highlight updates as the router matches new routes.
	 */
	activeSection: string;
	/**
	 * Called with the clicked tab's key (`welcome` | `learn` | `explore`).
	 * The caller is expected to dispatch to `router.navTo(…)` (or
	 * whatever section-select logic it needs).
	 */
	onSectionSelect: (key: string) => void;
}

export default function AppHeader(opts: AppHeaderOptions): ToolHeader {
	const { activeSection, onSectionSelect } = opts;

	// Theme toggle button. Flips between light and dark. The icon
	// mirrors the current mode (moon for dark, sun for light) and
	// the tooltip hints at the *next* click's effect. A radial
	// "ink-drop" transition emanates from the button on every
	// switch, see `webapp/util/themeTransition.ts` for the mechanic.
	const themeButton = new Button({
		icon: iconForMode(getMode()),
		tooltip: tooltipForMode(getMode()),
		type: ButtonType.Transparent,
		press: (): void => {
			// Fire the transition first so the animation's origin
			// travels with the button's centre in the current DOM,
			// then flip the theme. The transition wrapper installs a
			// CSS view-transition-like overlay that expands to cover
			// the viewport while the underlying CSS variables swap.
			playThemeTransition(themeButton.getDomRef(), () => {
				const next: ThemeMode = toggleMode();
				themeButton.setIcon(iconForMode(next));
				themeButton.setTooltip(tooltipForMode(next));
			});
		}
	});

	// GitHub icon-only link. The SVG is embedded inline (rather
	// than fetched via `<img src>`) so `fill="currentColor"`
	// resolves against the surrounding CSS `color` cascade. The
	// `.jsx-showcase-github-btn` styles set `color:` from the
	// ToolHeader's text tone, so the mark's fill flips with the
	// theme automatically, no JS involved on switch.
	//
	// Kept as a plain anchor rather than a `sap.m.Button` because
	// UI5's `Button.icon` accepts only a URI (which triggers the
	// `<img src>` path that broke `currentColor` in the first
	// place). An `<a>` is the honest semantic anyway, this is a
	// navigation to an external page, not a UI action.
	const githubLink = new HTML({
		content:
			`<a href="https://github.com/ui5-community/jsx-runtime" ` +
			`target="_blank" rel="noopener noreferrer" ` +
			`class="jsx-showcase-github-btn" title="GitHub" aria-label="GitHub">` +
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">` +
			`<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.31-.54-1.54.12-3.2 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.89.12 3.2.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.28 0 .32.22.7.83.58C20.56 22.3 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z"/>` +
			`</svg>` +
			`</a>`
	});

	return (
		<ToolHeader>
			<Image src="./logo.svg" width="1.75rem" height="1.75rem" densityAware={false} decorative={false} alt="JSX Runtime for UI5" />
			<Title text="JSX Runtime for UI5" level="H4" />
			<ObjectStatus text="Incubation" state={ValueState.Warning} class="jsx-showcase-incubation-pill" />
			<ToolbarSpacer width="1.5rem" />
			<IconTabHeader
				mode={IconTabHeaderMode.Inline}
				selectedKey={activeSection}
				select={(evt: Event): void => {
					const key = (evt.getParameter as (name: string) => unknown)("key") as string;
					onSectionSelect(key);
				}}
				items={[
					// The JSX-runtime treats `key` as a React-list key
					// (third arg to `_jsx`) and strips it from props, so
					// the UI5 `key` property never lands on the control.
					// Set it via constructor settings instead, same
					// shape UI5 uses.
					new IconTabFilter({ key: "welcome", text: "Overview" }),
					new IconTabFilter({ key: "learn",   text: "Learn" }),
					new IconTabFilter({ key: "explore", text: "Explore" })
				]}
			/>
			<ToolbarSpacer />
			<Button
				icon="sap-icon://learning-assistant"
				text="API"
				tooltip="Open the generated API reference (TypeDoc)"
				press={(): void => {
					// Relative href so this works on both local dev
					// (`ui5 serve` at :8080) and the deployed Pages
					// site. Spelled out to `index.html` because some
					// static hosts (and older `ui5 serve` versions)
					// don't resolve a bare directory request to
					// `index.html` — `./api/` may 404 in that case.
					// `noopener,noreferrer` matches the GitHub
					// link's rel attrs for security parity.
					window.open("./api/index.html", "_blank", "noopener,noreferrer");
				}}
			/>
			<Button
				icon="sap-icon://sys-help"
				text="Feedback"
				tooltip="Report an issue or share feedback"
				press={openFeedback}
			/>
			{themeButton}
			{githubLink}
		</ToolHeader>
	);
}

/** UI5 icon URI reflecting the *current* mode. */
function iconForMode(mode: ThemeMode): string {
	return mode === "dark" ? "sap-icon://dark-mode" : "sap-icon://light-mode";
}

/** Tooltip copy hinting the *next* click's effect. */
function tooltipForMode(mode: ThemeMode): string {
	return mode === "dark"
		? "Theme: dark. Click for light."
		: "Theme: light. Click for dark.";
}
