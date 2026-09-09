import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import Log from "sap/base/Log";
import ManagedObjectMetadata from "sap/ui/base/ManagedObjectMetadata";
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
 * …)`. This module installs a one-time prototype patch on
 * `View.prototype.onControllerConnected` that does exactly that:
 * before delegating to the original `onControllerConnected`, it
 * installs a per-instance wrapper on `this.createContent` that
 * opens the scope and catches errors, then cleans up via `finally`.
 *
 * ## Why patch `onControllerConnected`, not `createContent`
 *
 * UI5's `onControllerConnected` calls `this.createContent(e)`,
 * which dynamically dispatches to the **subclass** prototype
 * (e.g. `MyJsxView.prototype.createContent`). Patching
 * `View.prototype.createContent` only intercepts code that
 * explicitly calls `super.createContent()` — no View subclass
 * ever does that (the base method is a no-op returning `null`).
 *
 * By patching `onControllerConnected` instead, we install a
 * per-instance own-property on `this.createContent` *before*
 * the original `onControllerConnected` body runs. Own-properties
 * shadow prototype properties, so `this.createContent(...)` in
 * `runWithPreprocessors` routes through our wrapper regardless
 * of which subclass is in play.
 *
 * XMLView / JSONView / TypedView override `createContent()` and
 * don't call `jsx()`, so the added `withScope` is a no-op for
 * them. Error-logging is equally transparent — only JSX views
 * are likely to throw novel errors, and the log entry will
 * clearly identify the view by id.
 *
 * ## The idempotence guard
 *
 * `installed` prevents double-wrapping if this module is loaded
 * twice (e.g. via two different resource-root mappings, or from
 * a test harness that reloads the runtime).
 *
 * @namespace ui5.community.jsx.runtime.jsx-runtime
 */
const COMPONENT = "ui5.community.jsx.runtime";

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

	// `onControllerConnected` is an internal UI5 method not exposed in the
	// public TypeScript typings — use `any` casts to access/patch it.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const viewProto = View.prototype as any;
	type CreateContentFn = (this: View) => Control | Control[] | Promise<Control | Control[]>;
	type OnControllerConnectedFn = (this: View, controller: unknown, settings?: unknown) => unknown;

	const originalOnControllerConnected = viewProto.onControllerConnected as OnControllerConnectedFn;

	viewProto.onControllerConnected = function patchedOnControllerConnected(
		this: View,
		controller: unknown,
		settings?: unknown
	): unknown {
		// Retrieve the subclass's (or base's) createContent *now*, before we
		// shadow it on the instance.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const subclassCreateContent = (this as any).createContent as CreateContentFn;

		const viewId = this.getId();

		const logAndRethrow = (error: unknown): never => {
			Log.error(
				`createContent() failed for view '${viewId}': ${String(error)}`,
				error instanceof Error ? (error.stack ?? "") : "",
				COMPONENT
			);
			throw error;
		};

		// Install the per-instance wrapper that the `onControllerConnected`
		// body will call via `this.createContent(...)`.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any).createContent = function wrappedCreateContent(
			this: View
		): Control | Control[] | Promise<Control | Control[]> {
			return withScope({ view: this }, () => {
				let result: Control | Control[] | Promise<Control | Control[]>;
				try {
					result = subclassCreateContent.call(this);
				} catch (error) {
					return logAndRethrow(error);
				}
				if (result instanceof Promise) {
					return result.catch(logAndRethrow);
				}
				return result;
			});
		};

		// Guard `View.createId` against generated ids for the duration of
		// `onControllerConnected`. UI5's `runWithPreprocessors` sets
		// `View.createId` as the id-preprocessor for ALL ManagedObjects
		// constructed inside `createContent()`, including internal controls
		// like Menu's `MenuWrapper` whose ids are derived from a generated
		// parent id. Without this guard, those generated-derived ids get
		// view-prefixed, making them unresolvable when the aggregation
		// forwarder later looks them up. The instance shadow is removed in
		// the `finally` block to restore the normal prototype chain.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const originalCreateId = (this as any).createId as (sId: string) => string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any).createId = function guardedCreateId(this: View, sId: string): string {
			if (ManagedObjectMetadata.isGeneratedId(sId)) {
				return sId;
			}
			return originalCreateId.call(this, sId);
		};

		try {
			return originalOnControllerConnected.call(this, controller, settings);
		} finally {
			// Always clean up the instance shadows so the prototype chain is
			// restored for any subsequent calls on this view instance.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (this as any).createContent;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (this as any).createId;
		}
	};
}
