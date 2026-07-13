import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import { withScope } from "./scope";

/**
 * # `installViewScopeBridge`, transparent JSX / View integration
 *
 * When a JSX view is constructed, UI5 calls its `createContent()`
 * method. That method returns JSX, which in turn calls our
 * `jsx()` factory for every control it constructs. For features
 * like automatic id-prefixing (`view.getAutoPrefixId() === true`
 * → wrap every child id in `view.createId(id)`), the runtime
 * needs to know **which view is currently being constructed**
 * during those `jsx()` calls.
 *
 * The clean way to expose that context is to wrap the
 * subclass's `createContent()` in a `withScope({ view: this },
 * …)`. Doing that at every JSX-view call site is noise every
 * consumer would repeat. Instead this module installs a
 * one-time prototype patch on `sap.ui.core.mvc.View.prototype.createContent`
 * that transparently opens the scope for the duration of the
 * subclass's own `createContent()` call.
 *
 * ## Why patch the base prototype
 *
 * `sap.ui.core.mvc.View`'s design invites subclasses to override
 * `createContent()`. XMLView, JSONView, TypedView, JSView all
 * do exactly that, none of them calls `super.createContent()`,
 * and the base method is a no-op that returns `null`. Patching
 * the *base* prototype's `createContent` catches every subclass
 * override transparently: when a JSX view's own
 * `createContent()` runs, it does so with `this === theView`
 * *and* under an active JSX scope that carries the view. XMLView
 * / JSONView still work, they don't call `jsx()`, so the added
 * scope is a no-op for them.
 *
 * ## The idempotence guard
 *
 * `installed` prevents double-wrapping if this module is loaded
 * twice (e.g. via two different resource-root mappings, or from
 * a test harness that reloads the runtime). Double-wrapping
 * wouldn't be catastrophic (the inner `withScope` merges its
 * partial on top of the parent scope), but it would obscure the
 * ambient-state chain and every retry would pay a stack frame.
 *
 * @namespace ui5.community.jsx.runtime.jsx-runtime
 */
let installed = false;

/**
 * Install the prototype patch. Call once from the runtime's entry
 * module top level so the bridge lands before any view
 * instantiates. Safe to call multiple times, subsequent calls
 * are no-ops.
 */
export function installViewScopeBridge(): void {
	if (installed) return;
	installed = true;
	const original = View.prototype.createContent as (
		this: View
	) => Control | Control[] | Promise<Control | Control[]>;
	View.prototype.createContent = function patchedCreateContent(
		this: View
	): Control | Control[] | Promise<Control | Control[]> {
		// The `view: this` slot on `Scope` is what `jsx()` reads
		// when deciding whether to auto-prefix a child control's
		// `id`. The scope is popped on the callback's synchronous
		// return; async `createContent()` overrides (those that
		// return a Promise) also get the view in scope only for
		// the synchronous body preceding the first `await`, the
		// hot path for auto-prefixing (control construction inside
		// a JSX expression before an `await`) is fully covered.
		//
		// XMLView / JSONView / TypedView override `createContent()`
		// without ever calling `jsx()`, so the ambient scope is
		// unused for them. Zero cost.
		return withScope({ view: this }, () => original.apply(this, []));
	} as typeof View.prototype.createContent;
}
