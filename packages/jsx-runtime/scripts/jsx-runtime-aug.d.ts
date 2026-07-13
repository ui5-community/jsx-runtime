/**
 * # JSX namespace augmentation for `ui5/community/jsx/runtime/jsx-runtime`
 *
 * ## What this file fixes
 *
 * The runtime's own [runtime/runtime.ts](../src/runtime/runtime.ts)
 * declares `export namespace JSX { … }`, the type table the
 * TypeScript JSX checker consults for
 * `jsxImportSource: "ui5/community/jsx/runtime"` (which points at the
 * [jsx-runtime.ts](../src/jsx-runtime.ts) Babel entry).
 *
 * That declaration lives at module path
 * `"ui5/community/jsx/runtime/runtime/runtime"`. The outer barrel
 * `"ui5/community/jsx/runtime/jsx-runtime"` re-exports it as a
 * type-only alias via `export type { JSX } from "./runtime/runtime"`.
 *
 * That re-export works in **source form**, a monorepo consumer with
 * `paths` pointing `jsxImportSource` at source reads real ES modules
 * and picks the namespace up normally. When the runtime is consumed
 * as a **packaged library**, however, the shipped `.d.ts` files are
 * ambient modules (`declare module "…" { … }`), and TS's JSX checker
 * does **not** traverse `export type { JSX }` across an
 * ambient-module boundary to reach the deep `namespace JSX`.
 *
 * The result: every JSX element in a consumer view type-checks
 * against the raw `$XSettings` interface *without* the runtime's
 * `LibraryManagedAttributes` intersection, so `children` and
 * `class` become "does not exist" errors on every VBox / HBox /
 * Panel / Button / … in a TSX view.
 *
 * ## What this file does
 *
 * Re-declares the JSX namespace directly at the outer `jsx-runtime`
 * module path, aliasing each member to its equivalent inside the
 * deep runtime module. TS's JSX checker reaches these aliases in
 * one step, without crossing another ambient module boundary, so
 * per-control prop typing arrives intact.
 *
 * Same pattern preact/compat and solid-js use for their packaged
 * jsx-runtime bundles.
 *
 * ## Build wiring
 *
 * A post-build step
 * ([scripts/build-index-dts.mjs](./build-index-dts.mjs)) copies this
 * file to
 * `dist/resources/ui5/community/jsx/runtime/jsx-runtime-aug.d.ts`
 * and adds a `/// <reference path="…">` line for it to
 * `dist/index.d.ts`. Consumers pick it up automatically via the
 * package's `"types": "dist/index.d.ts"` entry.
 *
 * ## Maintenance
 *
 * If the JSX namespace in [runtime/runtime.ts](../src/runtime/runtime.ts)
 * grows a new exported member (e.g. a future `ElementType` or
 * `IntrinsicClassAttributes`), add a matching `export type X =
 * DeepJSX.X;` line below. Internal helper types (`SettingsOf`,
 * `WithJsxExtras`) are unexported and don't need aliases.
 *
 * @namespace ui5.community.jsx.runtime
 */
declare module "ui5/community/jsx/runtime/jsx-runtime" {
	// Import the deep namespace as a type-only qualifier. The alias
	// binds `DeepJSX` to the `namespace JSX` in the deep module
	// without re-exporting it; the outer namespace below then
	// re-declares its members directly.
	import type { JSX as DeepJSX } from "ui5/community/jsx/runtime/runtime/runtime";

	// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type
	export namespace JSX {
		export type Element = DeepJSX.Element;
		export type ElementClass = DeepJSX.ElementClass;
		export type ElementAttributesProperty = DeepJSX.ElementAttributesProperty;
		export type ElementChildrenAttribute = DeepJSX.ElementChildrenAttribute;
		export type HTMLAttributes = DeepJSX.HTMLAttributes;
		export type IntrinsicElements = DeepJSX.IntrinsicElements;
		export type IntrinsicAttributes = DeepJSX.IntrinsicAttributes;
		export type LibraryManagedAttributes<C, P> = DeepJSX.LibraryManagedAttributes<C, P>;
	}
}
