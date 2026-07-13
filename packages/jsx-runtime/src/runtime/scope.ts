import type ManagedObject from "sap/ui/base/ManagedObject";
import type View from "sap/ui/core/mvc/View";
import type {
	Renderer,
	IntrinsicHandler,
	ChildrenProcessor,
	PropertyApplier
} from "./plugin";

/**
 * `Scope`, the explicit, stack-saved context described in
 * [docs/jsx-runtime.md](../../../../docs/jsx-runtime.md) and
 * [docs/requirements.md §3](../../../../docs/requirements.md) (architectural
 * invariants, in particular the "no invisible ambient state" rule).
 *
 * It groups together every cross-cut a plugin might want to inject:
 * the active output `renderer`, intrinsic-attribute handlers, special
 * property appliers, structural directive processors, plus any
 * extension slot a future plugin defines.
 *
 * Two non-obvious choices, both deliberate:
 *
 *  - **No invisible defaults.** A `Scope` value with `renderer === undefined`
 *    means "use the default control-instance renderer registered at module
 *    load time." Plugins that want a different renderer have to pass it in
 *    explicitly via `withScope`. The "no invisible ambient state"
 *    invariant wins over a tidier inheritance chain.
 *
 *  - **Synchronous-only.** `withScope` saves the previous scope on entry
 *    and restores it on `fn`'s synchronous return. An `await` inside the
 *    callback would silently leak a scope across an async boundary on
 *    runtimes without `AsyncLocalStorage`. The chosen resolution is to
 *    keep the core synchronous and let plugins that need
 *    `AsyncLocalStorage` (e.g. an XML output adapter) wrap the `Scope`
 *    in their own `withAsyncScope` helper, opting *in* to the runtime
 *    cost rather than imposing it on every consumer.
 *
 * @namespace ui5.community.jsx.runtime.jsx-runtime
 */
export interface Scope {
	/** Output adapter: turn `(type, settings)` into "something". */
	renderer?: Renderer;
	/** Pre-construction handlers for declarative attributes (e.g. `class`,
	 *  `binding`, `command`, `dt:`/`fl:`/`customData:`). */
	intrinsics?: readonly IntrinsicHandler[];
	/** Post-construction property appliers for late or special semantics
	 *  (e.g. promise-valued props in the FE adapter). */
	propertyAppliers?: readonly PropertyApplier[];
	/** Structural directive processors (e.g. `<For>`, `<If>`, `<Switch>`). */
	childrenProcessors?: readonly ChildrenProcessor[];
	/**
	 * Handler for HTML / SVG / custom-element tags, anything where Babel
	 * emits a `string` as the JSX `type` (e.g. `<div>`, `<svg>`, `<my-tag>`).
	 *
	 * The default scope does *not* register one. A `<div>` outside an
	 * HTML-aware renderer is a structural mistake (the live runtime
	 * constructs UI5 controls; a literal `div` cannot become a control),
	 * and `jsx()` produces a clear error pointing at the missing renderer.
	 *
	 * The expected consumer is a future HTML-aware renderer plugin: when
	 * its `renderToRenderManager(rm, ctrl, jsxFn)` opens a scope, it
	 * installs an `htmlIntrinsic` that turns `<div class="x"><span/></div>`
	 * into `rm.openStart("div") / rm.class(...) / .openEnd() / .renderControl(...)`.
	 *
	 * Sketch deliberately under-typed for now (`unknown` props rather than
	 * the eventual `HTMLAttributes`); an HTML-aware renderer will widen the
	 * signature when it lands.
	 */
	htmlIntrinsic?: (
		tag: string,
		props: Record<string, unknown> & { children?: unknown }
	) => unknown;
	/**
	 * Optional pin for JSX-time event-handler resolution. When set, the
	 * runtime's `.dotHandler` strings and function-typed event props
	 * resolve against this controller instead of walking the parent
	 * ancestry at fire time.
	 *
	 * Not needed inside `View.createContent()`, the ancestor walk
	 * finds the view's controller once the tree is wired. Reach for it
	 * in fragment factories called from a controller method, or in
	 * off-tree tests, where the JSX runs before any parent chain
	 * exists:
	 *
	 *   ```ts
	 *   import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
	 *
	 *   openHelloDialog(): void {
	 *     withScope({ controller: this }, () => {
	 *       const dialog = <Dialog title="Hello">…</Dialog>;
	 *       this.getView().addDependent(dialog);
	 *       (dialog as Dialog).open();
	 *     });
	 *   }
	 *   ```
	 *
	 * Typed as `unknown` because the runtime treats it as an opaque
	 * object with an index-signature, it only looks up handler names.
	 * Any object with named handler methods works (View controller,
	 * a JSXView, or the view class itself).
	 */
	controller?: unknown;
	/**
	 * The owning `sap.ui.core.mvc.View` currently constructing its
	 * content. Set transparently by
	 * [installViewScopeBridge.ts](./installViewScopeBridge.ts), a
	 * one-time prototype patch on `View.prototype.createContent`
	 * that wraps every subclass's own `createContent()` call in a
	 * `withScope({ view: this }, …)`. The runtime's `jsx()` reads
	 * this slot when it needs to know which view a control is
	 * being constructed under (e.g. for automatic id prefixing via
	 * `view.createId(id)` when the view opted in with
	 * `getAutoPrefixId() === true`). `undefined` outside a
	 * `View.createContent` call, a plain `withScope({ …plugin
	 * extras… }, …)` at fragment-factory or test level leaves this
	 * slot unset.
	 */
	view?: View;
	/** Plugin-specific scope extensions (e.g. `formatterContext`,
	 *  `ownerControl` for a sap.fe adapter). The runtime never reads
	 *  these; plugins do. */
	[key: string]: unknown;
}

/**
 * The owner-control slot is a frequent enough plugin extension that we
 * type it explicitly even though the runtime itself doesn't read it.
 * Plugins that need it should narrow `Scope` like
 * `(currentScope() as Scope & ScopeWithOwner)`.
 */
export interface ScopeWithOwner {
	ownerControl?: ManagedObject;
}

// --- Stack -----------------------------------------------------------------

/**
 * The active scope stack. The bottom of the stack is the *default scope*,
 * populated by the runtime at module load with the default renderer
 * and the core's built-in intrinsics / processors. Calls to `withScope`
 * push a merged copy on top; `fn`'s synchronous return pops it back off.
 *
 * Module-scoped mutable state is the one AP-1 carve-out. The roadmap
 * (§3.2) acknowledges this: the alternative, threading scope through
 * every nested `jsx()` call, is the explicit-context approach the
 * personas rejected as ergonomically worse than a careful stack.
 *
 * The stack itself is never exposed; only `currentScope` (read) and
 * `withScope` (push/pop) are public.
 */
const stack: Scope[] = [{}];

/**
 * The default scope's writable handle, used by the runtime's module
 * loader to install the built-in `Renderer`, the `class` and `binding`
 * intrinsic handlers, and the `<Fragment>` / `<For>` / `<If>` children
 * processors. Plugins MUST NOT touch this; they go through `withScope`
 * instead so the user can see (and reverse) the change at the call site.
 */
export function _defaultScopeForRuntimeInit(): Scope {
	return stack[0];
}

/**
 * The active scope, merged from the bottom up.
 *
 * Returns the topmost frame. `withScope` already merged it on entry;
 * we don't re-merge here, both for speed and so a plugin that *unsets*
 * a slot (`renderer: undefined`) wins over the default.
 */
export function currentScope(): Scope {
	return stack[stack.length - 1];
}

/**
 * Resolve the active renderer. The default scope always carries one,
 * so this is non-null in practice; the `??` keeps TypeScript happy
 * and gives us a clear error if a plugin ever installs an empty default.
 */
export function currentRenderer(): Renderer {
	const scope = currentScope();
	if (!scope.renderer) {
		throw new Error(
			"ui5/community/jsx/runtime jsx-runtime: no active Renderer. Did the default scope " +
			"fail to initialise? Re-import 'jsx-runtime/runtime' to bootstrap."
		);
	}
	return scope.renderer;
}

/**
 * Resolve the active HTML intrinsic handler, or `undefined` if none is
 * registered. The default scope deliberately registers none, `<div>` /
 * `<svg>` / `<my-tag>` are not valid in the live control-instance mode.
 * The runtime's `jsx()` calls this and produces a clear error when a
 * string-typed JSX expression is encountered without a handler.
 */
export function currentHtmlIntrinsic(): Scope["htmlIntrinsic"] {
	return currentScope().htmlIntrinsic;
}

/**
 * The intrinsic handlers visible at this point in the construction.
 * Returns the *registered* list, order matches registration order.
 *
 * Plugins layer on top of the core handlers by spreading them in the
 * scope: `withScope({ intrinsics: [...currentScope().intrinsics ?? [], myHandler] }, fn)`.
 * The matcher loop in `runtime.ts` walks first-match-wins, so a plugin
 * that pushes onto the *front* claims a prop ahead of the core; a
 * plugin that appends defers to the core when both match.
 */
export function currentIntrinsics(): readonly IntrinsicHandler[] {
	return currentScope().intrinsics ?? [];
}

/**
 * The post-construction property appliers visible at this point.
 * Same first-match-wins ordering as `currentIntrinsics`.
 */
export function currentPropertyAppliers(): readonly PropertyApplier[] {
	return currentScope().propertyAppliers ?? [];
}

/**
 * The structural-directive processors visible at this point.
 * Identity-matched against sentinel nodes inside `processChildren`.
 */
export function currentChildrenProcessors(): readonly ChildrenProcessor[] {
	return currentScope().childrenProcessors ?? [];
}

/**
 * Run `fn` with `partial` merged on top of the current scope. Restores
 * the previous scope on `fn`'s synchronous return *and on exception*
 * (the `try/finally`).
 *
 * Why merge rather than overwrite: a plugin commonly wants to add an
 * intrinsic handler without throwing away the core's `class` /
 * `binding` defaults. We merge slot-by-slot, list-typed slots
 * concatenate (caller-provided handlers come *first*, so they get
 * first dibs at matching), object-typed slots `{...}`-merge (plugin
 * extensions land alongside `formatterContext`/`ownerControl`).
 *
 * The legacy `withContext` in `sap.fe.base/jsx-runtime` reset the
 * scope to `{}` on exit instead of restoring the previous frame.
 * The function name change to `withScope` is deliberate: old call
 * sites cannot accidentally call this with the old expectations.
 *
 * `withScope` is **synchronous only** — see the "withScope is
 * synchronous only" entry in [docs/gotchas.md](../../../../docs/gotchas.md).
 * An `await` inside `fn` silently leaks scope on runtimes without
 * `AsyncLocalStorage`.
 *
 * @example
 * import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
 * import { switchProcessor } from "ui5/community/jsx/runtime/plugins/switch/index";
 *
 * return withScope({ childrenProcessors: [switchProcessor] }, () => (
 *   <Switch on={{ path: "/kind" }}>
 *     <Case when="info">    <Text text="ℹ️ info" />    </Case>
 *     <Case when="warning"> <Text text="⚠️ warning" /> </Case>
 *     <Default>             <Text text="(none)" />     </Default>
 *   </Switch>
 * ));
 */
export function withScope<T>(partial: Partial<Scope>, fn: () => T): T {
	const parent = currentScope();
	const merged: Scope = mergeScopes(parent, partial);
	stack.push(merged);
	try {
		return fn();
	} finally {
		stack.pop();
	}
}

/**
 * Slots merged by list-concatenation (caller's entries first, so a
 * plugin outranks the core defaults at match time). Every other
 * slot on `Scope` uses the default `{...}`-merge behaviour from
 * `Object.assign` above.
 *
 * Kept as a top-level constant so `mergeScopes` reads as a table of
 * behaviours rather than a chain of if-branches; also makes adding a
 * new list-typed slot to `Scope` a one-line change.
 */
const LIST_SLOTS: readonly (keyof Scope)[] = [
	"intrinsics",
	"propertyAppliers",
	"childrenProcessors"
];

/**
 * Merge `partial` on top of `parent`. List-typed slots
 * (see `LIST_SLOTS`) concatenate with the caller's entries first;
 * everything else takes the shallow `{...}` merge.
 */
function mergeScopes(parent: Scope, partial: Partial<Scope>): Scope {
	const merged: Scope = { ...parent, ...partial };
	for (const slot of LIST_SLOTS) {
		const p = partial[slot] as readonly unknown[] | undefined;
		if (p !== undefined) {
			const inherited = (parent[slot] as readonly unknown[] | undefined) ?? [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(merged as Record<string, unknown>)[slot as string] = [...p, ...inherited] as any;
		}
	}
	return merged;
}
