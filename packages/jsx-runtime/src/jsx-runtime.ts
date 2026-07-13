/**
 * `ui5.community.jsx.runtime/jsx-runtime`. Babel automatic-runtime entry point.
 *
 * Babel emits
 *
 *   import { jsx as _jsx, jsxs as _jsxs } from "ui5/community/jsx/runtime/jsx-runtime";
 *
 * for every `.tsx` file in a consuming app whose Babel config sets
 * `importSource: "ui5/community/jsx/runtime"`. This module therefore *must*
 * exist at exactly this path; it is not a free choice.
 *
 * The actual implementation lives in the [runtime/](./runtime/) sub-namespace.
 * This barrel re-exports:
 *
 *  - {@link jsx}, {@link jsxs}, {@link Fragment}, used by the Babel transform
 *  - `<For>`, `<If>`, core structural directives (always available)
 *  - `withScope`, `defineSentinel`, plugin-SPI types, the plugin contract
 *  - `JSX` namespace, used by the TypeScript JSX checker
 *
 * ## Top-level side effects
 *
 * Importing this module installs the JSX/View prototype bridge (see
 * [installViewScopeBridge.ts](./runtime/installViewScopeBridge.ts))
 * so `view.getAutoPrefixId()` behaves transparently, every view
 * whose `createContent()` returns JSX gets automatic id-prefixing
 * for the child controls, without wrapping every return in
 * `withScope({ view: this }, …)` at the call site.
 *
 * @namespace ui5.community.jsx.runtime
 */
import { installViewScopeBridge } from "./runtime/installViewScopeBridge";

// One-time side effect. Runs on first import, before any JSX view
// can construct its content, because the JSX runtime is imported
// transitively by the consumer's own `.tsx` files (and directly by
// this barrel).
installViewScopeBridge();

export {
	jsx,
	jsxs,
	Fragment,
	For,
	If,
	// Plugin SPI:
	withScope,
	currentScope,
	currentRenderer,
	currentIntrinsics,
	currentPropertyAppliers,
	currentChildrenProcessors,
	currentHtmlIntrinsic,
	defineSentinel,
	isSentinelNode,
	defaultRenderer
} from "./runtime/runtime";
// Type-only re-exports for plugin authors. Babel's transform strips these,
// so they cost nothing at runtime.
export type {
	JSX,
	Scope,
	Renderer,
	IntrinsicHandler,
	IntrinsicMatchContext,
	ChildrenProcessor,
	PropertyApplier,
	ControlClass,
	ControlMetadata,
	PostConstructHook,
	SentinelTag,
	SentinelNode
} from "./runtime/runtime";
