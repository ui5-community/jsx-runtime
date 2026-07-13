import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type UIComponent from "sap/ui/core/UIComponent";
import HTML from "sap/ui/core/HTML";
import Page from "sap/m/Page";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Title from "sap/m/Title";
import MessageStrip from "sap/m/MessageStrip";

import CodeBlock from "../control/CodeBlock";
import { iconHtml } from "../util/sapIcon";

/**
 * # WelcomeBody, landing-page content pane
 *
 * Body-only view mounted inside the shell's inner
 * `NavContainer#explorerContent` (see [Explorer.tsx](./Explorer.tsx)).
 * The `sap.tnt.ToolPage` and shared `AppHeader` chrome live on the
 * shell view and stay mounted across every top-nav click; only the
 * page inside the NavContainer swaps. That's what makes the top-tab
 * navigation feel smooth, the header, tabs, Feedback button, and
 * GitHub icon never re-render.
 *
 * The body is a stack of three siblings inside a bounded VBox
 * (`jsx-welcome-main-wrap`):
 *
 *   1. **Hero + feature-cards**, one `sap.ui.core.HTML` control
 *      whose `content` is hand-authored HTML (hero with a
 *      decorative SVG blob, three-column feature-card grid).
 *   2. **"See it live" demo strip**, a native UI5 `VBox` mounting
 *      the real `HelloJSX` sample view alongside a syntax-highlighted
 *      snippet of its source. The visitor sees UI5-produced JSX in
 *      the same viewport where the concept is introduced.
 *   3. **Numbered steps + footer**, a second `sap.ui.core.HTML`
 *      control carrying the "Add it to your app" install /
 *      configure blocks and the footer link groups.
 *
 * Navigation happens through delegated click handling: every CTA
 * is an `<a data-nav="learnDoc" data-nav-arg="overview">` anchor.
 * A single click listener attached in `onAfterRendering` intercepts
 * clicks anywhere in either HTML body, reads the `data-nav*`
 * attributes, and dispatches through `router.navTo(…)`. SPA-style,
 * no page reload.
 *
 * Route: `""` (empty). The manifest's `welcomeContent` target
 * mounts this view into the same NavContainer as
 * [LearnDoc.tsx](./LearnDoc.tsx) and
 * [ExploreSample.tsx](./ExploreSample.tsx).
 *
 * @namespace ui5.community.jsx.showcase.view
 */
export default class WelcomeBody extends View {
	private topBody!: HTML;
	private bottomBody!: HTML;
	private demoSlot!: VBox;
	private page!: Page;
	private bodyPopulated = false;
	private navBound = false;
	private demoMounted = false;
	private scrollReset = false;

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		// `sap.ui.core.HTML` uses DOM-preservation semantics, the
		// initial `content` set at construction time may not land in
		// the wrapper before `onAfterRendering` fires. Construct with
		// an empty root and call `setContent` in `onAfterRendering`
		// so the update runs after the placeholder mounts.
		this.topBody = new HTML({ content: `<div class="jsx-welcome-html"></div>` });
		this.bottomBody = new HTML({ content: `<div class="jsx-welcome-html"></div>` });

		// Native-UI5 "See it live" strip. Two side-by-side cells in a
		// CSS Grid (see `.jsx-welcome-demo-grid` in `webapp/css/style.css`):
		// snippet on the left, live view (wrapped in the shared
		// `.jsx-showcase-browser-frame`) on the right.
		this.demoSlot = new VBox({});
		this.demoSlot.addStyleClass("jsx-welcome-demo-slot");
		this.demoSlot.addItem(new MessageStrip({
			text: "Loading demo…",
			type: "Information",
			showIcon: false
		}));

		const demoCodeCell = new VBox({});
		demoCodeCell.addStyleClass("jsx-welcome-demo-code");
		demoCodeCell.addItem(new CodeBlock({
			sourcePath: "view/showcases/HelloJSX.tsx",
			language: "tsx",
			filename: "HelloJSX.tsx",
			stripLeadingJsdoc: true,
			stripAutoPrefixIdMethod: true
		}));

		const demoLiveCell = new VBox({});
		demoLiveCell.addStyleClass("jsx-welcome-demo-live");
		demoLiveCell.addStyleClass("jsx-showcase-browser-frame");
		// The URL bar text mirrors the sampleId a visitor would land
		// on if they clicked the "Open the first sample →" link
		// further down the page.
		demoLiveCell.data("url", "hello-jsx");
		demoLiveCell.addItem(this.demoSlot);

		const demoStrip = new VBox({});
		demoStrip.addStyleClass("jsx-welcome-demo-strip");

		const demoStripHeader = new HTML({
			content:
				`<div class="jsx-welcome-demo-header">` +
					`<h2 class="jsx-welcome-demo-heading">See it live</h2>` +
					`<p class="jsx-welcome-demo-note">The snippet on the left is the entire source of the sample on the right. That's the whole model: a JSX expression is a UI5 constructor call, no reconciler, no re-render.</p>` +
				`</div>`
		});
		demoStrip.addItem(demoStripHeader);

		const demoGrid = new VBox({});
		demoGrid.addStyleClass("jsx-welcome-demo-grid");
		demoGrid.addItem(demoCodeCell);
		demoGrid.addItem(demoLiveCell);
		demoStrip.addItem(demoGrid);

		const mainWrap = new VBox({});
		mainWrap.addStyleClass("jsx-welcome-main-wrap");
		mainWrap.addItem(this.topBody);
		mainWrap.addItem(demoStrip);
		mainWrap.addItem(this.bottomBody);

		// `Page` with `enableScrolling={true}` so the body can
		// scroll on short viewports. Same "no header" pattern
		// LearnDoc / ExploreSample use, the shell's ToolPage owns
		// the visible chrome; this view only fills the content pane.
		this.page = new Page({
			showHeader: false,
			enableScrolling: true,
			content: [mainWrap]
		});
		this.page.addStyleClass("jsx-showcase-fullheight");
		return this.page;
	}

	onAfterRendering(): void {
		// Populate both HTML controls after their placeholders are in
		// the DOM. Calling `setContent` at this point causes UI5 to
		// swap each placeholder for the parsed root element.
		if (!this.bodyPopulated) {
			this.bodyPopulated = true;
			this.topBody.setContent(buildTopBodyHtml());
			this.bottomBody.setContent(buildBottomBodyHtml());
			// Attach the delegated click listener on the next tick
			// so the new content is in the DOM. Once bound, the
			// listener stays live across all future re-renders (the
			// same DOM element is preserved by `sap.ui.core.HTML`).
			setTimeout(() => this.bindNavHandlers(), 0);
		}
		if (!this.demoMounted) {
			this.demoMounted = true;
			this.mountLiveDemo();
		}
		// Reset the page scroll to the top on first render. The async
		// HTML-body population above and the live-demo mount below shift
		// the layout after the Page's scroll container is measured, which
		// otherwise leaves it a few pixels scrolled down on a cold load.
		// `scrollTo(0, 0)` (offset, duration) pins it back to the top.
		if (!this.scrollReset) {
			this.scrollReset = true;
			this.page.scrollTo(0, 0);
			// Run again on the next frame, after the demo view has mounted
			// and its layout has settled, so a late reflow can't re-nudge it.
			setTimeout(() => this.page.scrollTo(0, 0), 0);
		}
	}

	private mountLiveDemo(): void {
		// `View.create` returns a promise resolving to the constructed
		// view. The `module:` prefix on the view name is UI5's
		// module-form target for TSX views, same code path
		// [ExploreSample.tsx](./ExploreSample.tsx) uses when it mounts
		// the sample the user picked from the sidebar.
		void View.create({
			viewName: "module:ui5/community/jsx/showcase/view/showcases/HelloJSX"
		}).then((demoView: View) => {
			this.demoSlot.removeAllItems();
			this.demoSlot.addItem(demoView);
		}).catch((error: unknown) => {
			this.demoSlot.removeAllItems();
			this.demoSlot.addItem(new Text({
				text: `Failed to load the demo: ${String(error)}`
			}));
			// Keep a visible title so the frame doesn't collapse.
			this.demoSlot.insertItem(new Title({ text: "Demo unavailable", level: "H4" }), 0);
		});
	}

	private bindNavHandlers(): void {
		if (this.navBound) return;
		const roots: (HTMLElement | null)[] = [
			this.topBody.getDomRef() as HTMLElement | null,
			this.bottomBody.getDomRef() as HTMLElement | null
		];
		if (roots.every((r) => r === null)) return;
		this.navBound = true;
		const listener = (evt: MouseEvent): void => {
			const target = (evt.target as HTMLElement | null)?.closest<HTMLElement>("[data-nav]");
			if (!target) return;
			evt.preventDefault();
			const route = target.dataset.nav;
			const arg = target.dataset.navArg;
			if (!route) return;
			const argKey = route === "learnDoc" ? "topic" : "sampleId";
			const args = arg ? { [argKey]: arg } : undefined;
			this.getRouter()?.navTo(route, args);
			window.scrollTo({ top: 0, behavior: "auto" });
		};
		for (const root of roots) {
			root?.addEventListener("click", listener);
		}
	}

	private getRouter() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const Component = sap.ui.require("sap/ui/core/Component") as any;
		const comp = Component?.getOwnerComponentFor(this) as UIComponent | undefined;
		return comp?.getRouter();
	}
}

// ── HTML body ───────────────────────────────────────────────────

/**
 * Top segment: hero + three feature cards. The outer
 * `<div class="jsx-welcome-html">` is the single root DOM node
 * `sap.ui.core.HTML` requires; every `setContent` call would
 * otherwise re-render into a leaking DOM (same invariant that
 * fixed the LearnDoc content-append bug).
 */
function buildTopBodyHtml(): string {
	return `<div class="jsx-welcome-html">

	<section class="jsx-welcome-hero">
		<svg class="jsx-welcome-blob" viewBox="0 0 600 600" aria-hidden="true">
			<path fill="#e6f2ff" d="M480,320 C520,410 420,510 320,500 C220,490 100,470 90,360 C80,250 160,120 280,110 C400,100 440,230 480,320 Z" />
		</svg>
		<div class="jsx-welcome-hero-inner">
			<h1 class="jsx-welcome-headline">JSX Runtime for UI5.</h1>
			<p class="jsx-welcome-tagline">
				A modern, declarative syntax for your UI5 application.
				Write <code>.tsx</code> for full TypeScript typing, or plain
				<code>.jsx</code> if you don't use TypeScript, and get plain
				<code>new Control(settings)</code> calls either way.
				No virtual DOM, no reconciler, no fork of UI5. Per-control
				prop typing from <code>$XSettings</code>, a plugin SPI you
				can extend without touching the core.
			</p>
			<div class="jsx-welcome-cta-row">
				<a class="jsx-welcome-cta jsx-welcome-cta-primary" href="#" data-nav="learnDoc" data-nav-arg="overview">Get started →</a>
				<a class="jsx-welcome-cta" href="#" data-nav="exploreSample" data-nav-arg="hello-jsx">Browse samples</a>
				<a class="jsx-welcome-cta" href="#" data-nav="learnDoc" data-nav-arg="setup">Setup guide</a>
			</div>
		</div>
	</section>

	<section class="jsx-welcome-features">
		<article class="jsx-welcome-card">
			<div class="jsx-welcome-card-icon" aria-hidden="true">
				${iconHtml("source-code", "jsx-welcome-card-icon-glyph")}
			</div>
			<h3 class="jsx-welcome-card-title">TypeScript-recommended</h3>
			<p class="jsx-welcome-card-body">
				Author views as <code>.tsx</code> for per-prop typing from
				each control's <code>$XSettings</code>, checked against UI5's
				own metadata. Plain <code>.jsx</code> works too, when you
				don't want TypeScript.
			</p>
			<a class="jsx-welcome-card-more" href="#" data-nav="learnDoc" data-nav-arg="props-typing">Read: Props &amp; TypeScript typing →</a>
		</article>

		<article class="jsx-welcome-card">
			<div class="jsx-welcome-card-icon" aria-hidden="true">
				${iconHtml("sap-ui5", "jsx-welcome-card-icon-glyph")}
			</div>
			<h3 class="jsx-welcome-card-title">UI5-native</h3>
			<p class="jsx-welcome-card-body">
				Bindings, models, controllers, routing, manifest: all
				unchanged. Existing XML views coexist. Standard build chain
				(<code>ui5-tooling-transpile</code> + livereload).
			</p>
			<a class="jsx-welcome-card-more" href="#" data-nav="learnDoc" data-nav-arg="overview">Read: What is JSX Runtime for UI5? →</a>
		</article>

		<article class="jsx-welcome-card">
			<div class="jsx-welcome-card-icon" aria-hidden="true">
				${iconHtml("puzzle", "jsx-welcome-card-icon-glyph")}
			</div>
			<h3 class="jsx-welcome-card-title">Plugin SPI</h3>
			<p class="jsx-welcome-card-body">
				Five sealed extension points, scoped via <code>withScope</code>.
				The core's own <code>&lt;Fragment&gt;</code>, <code>&lt;For&gt;</code>,
				<code>&lt;If&gt;</code> are themselves plugins registered into
				the default scope.
			</p>
			<a class="jsx-welcome-card-more" href="#" data-nav="learnDoc" data-nav-arg="plugin-spi">Read: The Plugin SPI →</a>
		</article>
	</section>

</div>`;
}

/**
 * Bottom segment: numbered getting-started steps + footer. Same
 * single-root-div invariant as `buildTopBodyHtml`.
 */
function buildBottomBodyHtml(): string {
	return `<div class="jsx-welcome-html">

	<section class="jsx-welcome-steps">
		<h2 class="jsx-welcome-steps-heading">Add it to your app</h2>

		<div class="jsx-welcome-step">
			<div class="jsx-welcome-step-num" aria-hidden="true">1</div>
			<div class="jsx-welcome-step-body">
				<h3 class="jsx-welcome-step-title">Install</h3>
				<pre class="jsx-welcome-code"><code>npm install @ui5-community/jsx-runtime
npm install -D @openui5/types @babel/plugin-transform-react-jsx@^7</code></pre>
				<p class="jsx-welcome-step-note">Or with pnpm: <code>pnpm add @ui5-community/jsx-runtime</code>.</p>
			</div>
		</div>

		<div class="jsx-welcome-step">
			<div class="jsx-welcome-step-num" aria-hidden="true">2</div>
			<div class="jsx-welcome-step-body">
				<h3 class="jsx-welcome-step-title">Configure</h3>
				<pre class="jsx-welcome-code"><code>{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "ui5/community/jsx/runtime",
    "types": ["@openui5/types", "@ui5-community/jsx-runtime"]
  }
}</code></pre>
				<p class="jsx-welcome-step-note">
					<a href="#" data-nav="learnDoc" data-nav-arg="setup">Full setup guide (install · Babel · tsconfig · ui5.yaml) →</a>
				</p>
			</div>
		</div>

		<div class="jsx-welcome-step jsx-welcome-step-done">
			<div class="jsx-welcome-step-num jsx-welcome-step-num-done" aria-hidden="true">✓</div>
			<div class="jsx-welcome-step-body">
				<h3 class="jsx-welcome-step-title">See it running</h3>
				<p class="jsx-welcome-step-note">
					<a class="jsx-welcome-cta" href="#" data-nav="exploreSample" data-nav-arg="hello-jsx">Open the first sample →</a>
				</p>
			</div>
		</div>
	</section>

	<footer class="jsx-welcome-footer">
		<div class="jsx-welcome-footer-cols">
			<div class="jsx-welcome-footer-col">
				<h4>Learn</h4>
				<ul>
					<li><a href="#" data-nav="learnDoc" data-nav-arg="overview">Overview</a></li>
					<li><a href="#" data-nav="learnDoc" data-nav-arg="setup">Setup guide</a></li>
					<li><a href="#" data-nav="learnDoc" data-nav-arg="jsx-vs-xmlview">JSX vs XMLView</a></li>
					<li><a href="#" data-nav="learnDoc" data-nav-arg="controls">JSX concepts</a></li>
					<li><a href="#" data-nav="learnDoc" data-nav-arg="plugin-spi">Plugin SPI</a></li>
				</ul>
			</div>
			<div class="jsx-welcome-footer-col">
				<h4>Explore</h4>
				<ul>
					<li><a href="#" data-nav="exploreSample" data-nav-arg="hello-jsx">Hello, JSX</a></li>
					<li><a href="#" data-nav="exploreSample" data-nav-arg="binding-string">Data binding</a></li>
					<li><a href="#" data-nav="exploreSample" data-nav-arg="structural">Structural directives</a></li>
					<li><a href="#" data-nav="exploreSample" data-nav-arg="embed-six">Six ways to embed UIs</a></li>
				</ul>
			</div>
			<div class="jsx-welcome-footer-col">
				<h4>Community</h4>
				<ul>
					<li><a href="https://github.com/ui5-community/jsx-runtime" target="_blank" rel="noopener noreferrer">GitHub</a></li>
					<li><a href="https://github.com/ui5-community/jsx-runtime/issues" target="_blank" rel="noopener noreferrer">Issues</a></li>
					<li><a href="https://github.com/ui5-community/jsx-runtime#readme" target="_blank" rel="noopener noreferrer">README</a></li>
				</ul>
			</div>
		</div>
		<div class="jsx-welcome-footer-legal">
			Apache-2.0 · UI5 Community · Incubation project
		</div>
	</footer>

</div>`;
}
