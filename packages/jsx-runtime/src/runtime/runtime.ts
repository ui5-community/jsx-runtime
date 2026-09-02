import ManagedObject from "sap/ui/base/ManagedObject";
import DataType from "sap/ui/base/DataType";
import BindingParser from "sap/ui/base/BindingParser";
import View from "sap/ui/core/mvc/View";
import type Element from "sap/ui/core/Element";
import type Event from "sap/ui/base/Event";
import type {
	ChildrenProcessor,
	ControlClass,
	ControlMetadata,
	IntrinsicHandler,
	PostConstructHook
} from "./plugin";
import { defaultRenderer } from "./plugin";
import {
	_defaultScopeForRuntimeInit,
	currentChildrenProcessors,
	currentHtmlIntrinsic,
	currentIntrinsics,
	currentPropertyAppliers,
	currentRenderer,
	currentScope
} from "./scope";

/**
 * Minimal JSX runtime for UI5 controls, the actual `jsx`/`jsxs`/`Fragment`
 * implementation. The package's *entry point* (`webapp/jsx-runtime.ts`) is a
 * thin barrel that re-exports from this file; Babel's automatic JSX transform
 * imports from the barrel and never reaches in here directly.
 *
 * ## How Babel wires this up
 *
 * `babel.config.json` configures `@babel/plugin-transform-react-jsx` with
 * `runtime: "automatic"` and `importSource: "ui5/community/jsx/runtime"`. So
 *
 *   ```tsx
 *   <Page>
 *     <Button press=".onPress" />
 *   </Page>
 *   ```
 *
 * compiles to
 *
 *   ```js
 *   import { jsx as _jsx, jsxs as _jsxs } from "ui5/community/jsx/runtime/jsx-runtime";
 *   _jsx(Page, { children: _jsx(Button, { press: ".onPress" }) });
 *   ```
 *
 * The `tsconfig.json` `paths` mapping resolves `ui5/community/jsx/runtime/jsx-runtime` →
 * `webapp/jsx-runtime.ts` (the barrel) for the type-checker. At runtime, UI5's
 * AMD loader resolves the same path under the `ui5/community/jsx/runtime` namespace.
 *
 * ## How the plugin SPI is wired
 *
 * `jsx()` is a thin shell. It dispatches sentinel directives to
 * registered `ChildrenProcessor`s, runs the prop loop through registered
 * `IntrinsicHandler`s, hands the resolved settings to the active
 * `Renderer.construct(...)`, and lets registered `PropertyApplier`s
 * post-process. Every "what to do with X" decision lives in a plugin,
 * including the core's own `<Fragment>`, `<For>`, `<If>`, `class=`,
 * and `binding="{/...}"`. See [plugin.ts](./plugin.ts) for the
 * extension-point types and [scope.ts](./scope.ts) for `withScope`.
 *
 * Apps that don't import any plugin pay zero ergonomic cost: this
 * file initialises the default scope at module load with the core
 * processors and intrinsics, and `currentRenderer()` returns the
 * default control-instance renderer.
 *
 * ## Children → default aggregation
 *
 * JSX children land on `props.children` (single child or array). They are
 * appended to the control's *default aggregation*, looked up via
 * `ControlMetadata.getDefaultAggregationName()`. Named aggregations are
 * expressed as regular props (e.g. `additionalContent={[...]}`).
 *
 * ## Bound aggregations + JSX template
 *
 * If a prop already populated the default aggregation with a BindingInfo
 * (typically `items={listRef}` from the OData/JSON helpers), we don't clobber
 * the binding with the JSX child. Instead, the child becomes the binding's
 * `template` (the row factory). UI5's `GrowingEnablement` then clones it for
 * each row.
 *
 * @namespace ui5.community.jsx.runtime.jsx-runtime
 */

// --- Type plumbing -----------------------------------------------------------

/** Anything that exposes `getController()`, i.e. an `sap.ui.core.mvc.View`. */
/**
 * The shape the runtime uses when it resolves a dot-handler string
 * or wires a function-typed event handler: a bag of named handler
 * methods. Typically a UI5 `Controller`, but we don't constrain it:
 * a JSXView returning `this` from `getController()` fits, and so
 * does any object with named methods installed via `withScope`.
 */
type ControllerLike = Record<string, unknown>;

// --- Controller / event-handler resolution ----------------------------------

/**
 * Resolve the pinned controller from the active scope, if any. Set via
 * `withScope({ controller }, fn)`, see `scope.ts` for the intended use
 * (fragment factories, tests, and any JSX built off-tree that needs
 * event handlers to resolve to a specific controller instance).
 */
function pinnedController(): ControllerLike | undefined {
	const c = currentScope().controller;
	return (c && typeof c === "object") ? (c as ControllerLike) : undefined;
}

/**
 * Walk up the element ancestry from `start`, returning the first
 * `sap.ui.core.mvc.View`'s controller. Used to resolve `".onPress"`-style
 * handler strings against the surrounding view, matching XMLView's
 * `EventHandlerResolver` behaviour (which always resolves against
 * `oView._oContainingView.oController`).
 *
 * We stop at the first `View` ancestor, earlier iterations of this
 * function stopped at any object exposing `getController()`, which
 * worked in practice but was less predictable. Narrowing to `View`
 * matches what XMLView does and eliminates the (theoretical) case
 * where a non-View control happens to expose the same method.
 *
 * Returns `undefined` if the control hasn't been added to a view yet
 * (e.g. during the initial `createContent()` synchronous
 * construction). In that case `makeHandler` will have already returned
 * a function that performs the same walk on event-fire, by which
 * point the tree is wired up. Callers should consult
 * `pinnedController()` first if they want the XMLView-parity
 * "captured-at-construction" behaviour.
 */
function findController(start: Element): ControllerLike | undefined {
	let current: Element | null = start;
	while (current) {
		if (current instanceof View) {
			const controller = current.getController() as unknown as ControllerLike | null | undefined;
			if (controller) {
				return controller;
			}
		}
		current = (current.getParent?.() as Element | null) ?? null;
	}
	return undefined;
}

/**
 * Build the actual event-handler function we hand to UI5 for a
 * `".dotHandler"` string.
 *
 * Resolution order at fire time:
 *
 *   1. `currentScope().controller` (captured at *JSX-construction*
 *      time via `withScope({ controller }, …)`) if any, the
 *      XMLView-parity path for fragment factories and off-tree
 *      constructions.
 *   2. Otherwise, walk the parent ancestry to find the surrounding
 *      view's controller. This is the default path and handles the
 *      99% case: JSX built inside `createContent()` is added to the
 *      view before any event fires, so the walk always finds the
 *      view's controller.
 *
 * We can't just capture the controller at JSX-construction time in
 * the default case because there *is* no parent chain yet, the
 * control isn't in any tree. The pin escape hatch exists for authors
 * who need "capture now" semantics anyway (e.g. dialogs opened from
 * a shared controller that mount under different views).
 */
function makeHandler(handlerName: string): (this: Element, event: Event) => void {
	// Capture any pinned controller at JSX-construction time, this
	// is the F2 improvement: authors can pin a specific controller
	// via `withScope({ controller }, …)` and the handler resolves
	// against it regardless of where the control ultimately mounts.
	const pinned = pinnedController();
	return function (this: Element, event: Event): void {
		const controller = pinned ?? findController(this);
		const fn = controller?.[handlerName];
		if (typeof fn !== "function") {
			throw new Error(`Event handler '${handlerName}' not found on controller`);
		}
		(fn as (event: Event) => void).call(controller, event);
	};
}

// --- jsx / jsxs --------------------------------------------------------------

/**
 * The runtime entry called for every JSX element.
 *
 * `type` is the control class (e.g. `Button`); `props` is the merged set of
 * attributes plus a `children` field for nested JSX. We translate this into
 * a `currentRenderer().construct(type, settings)` call. UI5 takes care of
 * the rest (binding extraction, aggregation wiring, applying defaults) under
 * the default control-instance renderer.
 *
 * Babel may pass an extra `key` argument for keyed lists. When the target
 * control declares a property named `key` (e.g. `sap.ui.core.CustomData`),
 * the value is forwarded to that property. Otherwise it is ignored — UI5 has
 * no concept of React-style list reconciliation keys.
 *
 * @example
 * // Consumers never call jsx() directly; Babel's automatic runtime
 * // rewrites <Button text="Hi" /> into _jsx(Button, { text: "Hi" }),
 * // which the runtime turns into `new Button({ text: "Hi" })`.
 * import Button from "sap/m/Button";
 * const btn = <Button text="Hi" press={() => console.log("pressed")} />;
 */
export function jsx<T extends ManagedObject>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type: ControlClass<T> | typeof Fragment | typeof For | typeof If | SentinelTag<any> | string,
	props: (Record<string, unknown> & { children?: unknown }) | null,
	_key?: string
): T {
	// String-typed JSX (`<div>`, `<svg>`, `<my-tag>`) routes to the
	// active scope's HTML intrinsic. The default scope deliberately
	// registers none, the live control-instance runtime cannot
	// construct a `div` (it would have no UI5 metadata). This dispatch
	// is the hook for a future HTML-aware RenderManager plugin, which
	// installs an `htmlIntrinsic` that emits
	// `rm.openStart(tag) / .attr / .openEnd / .close` calls.
	if (typeof type === "string") {
		const handler = currentHtmlIntrinsic();
		if (!handler) {
			throw new Error(
				`ui5/community/jsx/runtime jsx-runtime: <${type}> is an HTML / SVG / custom-element ` +
				`tag, but no scope currently registers an htmlIntrinsic. The default ` +
				`(control-instance) renderer constructs UI5 controls from class ` +
				`references; a string-typed JSX expression has no UI5 metadata to ` +
				`construct from. Use a control class (e.g. <VBox>...</VBox>) or wrap ` +
				`this JSX in a renderer that supports HTML elements (e.g. the ` +
				`renderToRenderManager plugin).`
			);
		}
		return handler(type, props ?? {}) as T;
	}

	// Sentinel directives, produce a marker node that the *parent* `jsx()`
	// call's children processing will pick up via the `ChildrenProcessor`
	// registry. Like Fragment, these never reach a UI5 constructor.
	if (type === Fragment) {
		return makeFragmentNode(props) as unknown as T;
	}
	if (type === For) {
		return makeForNode(props) as unknown as T;
	}
	if (type === If) {
		return makeIfNode(props) as unknown as T;
	}
	if (isSentinelTag(type)) {
		// Plugin sentinels (e.g. `<Switch>`) carry their own brand, set by
		// the plugin's `defineSentinel()` helper. The corresponding
		// `ChildrenProcessor` in the active scope will consume them by
		// matching on that brand.
		return makeSentinelNode(type, props) as unknown as T;
	}

	const controlClass = type as ControlClass<T>;
	const metadata = controlClass.getMetadata();
	const settings: Record<string, unknown> = {};
	const allProps = props ?? {};
	let children: unknown;

	// Post-construction side effects scheduled by intrinsics (e.g. `class`
	// → `addStyleClass(...)`, `ref={cb}` → `cb(instance)`). Lazy, most
	// elements have no post-construct work, and this hook runs once per
	// JSX element.
	let postCallbacks: ((instance: ManagedObject) => void)[] | undefined;
	const post: PostConstructHook = (cb) => {
		if (!postCallbacks) postCallbacks = [];
		postCallbacks.push(cb);
	};

	const intrinsics = currentIntrinsics();

	// `Object.entries` allocates a fresh tuple array; the same list is
	// walked once by the intrinsic loop below and (rarely) once more
	// by the applier loop after construction. Cache it so hot views
	// pay the allocation once per element rather than twice.
	const propEntries = Object.entries(allProps);
	// Babel's automatic JSX transform always extracts the `key` prop from the
	// element's attributes and passes it as the third argument to `jsx()`, never
	// inside the props object. For controls that own a real `key` property (e.g.
	// `sap.ui.core.CustomData`), inject it back into the entries so it travels
	// through the normal intrinsic + applier pipeline and lands in settings.
	if (_key !== undefined && metadata.hasProperty("key")) {
		propEntries.push(["key", _key]);
	}

	for (const [key, value] of propEntries) {
		if (key === "children") {
			children = value;
			continue;
		}

		// Intrinsic handlers run first. First match wins, the registration
		// order in the active scope determines precedence (a plugin pushing
		// to the front of the list outranks the core defaults).
		const handler = matchIntrinsic(intrinsics, key, value, metadata);
		if (handler) {
			const out = handler.apply(key, value, settings, post, metadata);
			if (out !== undefined) {
				settings[key] = out;
			}
			continue;
		}

		// Default branch: forward the prop unchanged. UI5's `applySettings`
		// extracts BindingInfos, matches event names, etc.
		settings[key] = value;
	}

	if (children !== undefined) {
		const defaultAggregation = metadata.getDefaultAggregationName();
		if (defaultAggregation) {
			// Run children through the registered `ChildrenProcessor`s.
			// `<For>` installs an aggregation binding + template;
			// `<If>` (bound) binds each child's `visible`; literal `<If>`
			// and `<Fragment>` inline. Plugins can add `<Switch>`, etc.
			const processed = processChildren(children, settings, defaultAggregation);
			const arr = flattenChildren(processed);
			const existing = settings[defaultAggregation] as
				| { path?: unknown; template?: unknown }
				| undefined;

			// If a prop already populated the default aggregation with a
			// BindingInfo (typically `items={someListRef}`), treat the JSX
			// child as that binding's `template` instead of clobbering the
			// binding. UI5's `extractBindingInfo` recognises an object with
			// `path` as a binding; the child becomes the row factory.
			if (isBindingLike(existing)) {
				if (existing.template === undefined && arr.length > 0) {
					existing.template = arr.length === 1 ? arr[0] : arr;
				}
			} else if (arr.length > 0) {
				settings[defaultAggregation] = arr.length === 1 ? arr[0] : arr;
			}
		}
	}

	// Auto-prefix `id` against the surrounding view, when the view
	// has opted in via `getAutoPrefixId() === true`. XMLView does
	// this itself inside its XML parser; the JSX runtime needs an
	// explicit bridge because it constructs controls directly. The
	// view is installed on the ambient scope by
	// `installViewScopeBridge.ts` (a one-time prototype patch on
	// `View.prototype.createContent`), so this is transparent to
	// sample authors, every view whose subclass returns JSX from
	// `createContent()` sees the effect.
	//
	// Guards, in order:
	//   - a view must be on the scope (skips fragment factories and
	//     tests where the JSX runs off-tree);
	//   - the view must opt in (`getAutoPrefixId() === true`);
	//   - `settings.id` must be a non-empty string (already-prefixed
	//     ids, and controls constructed without an `id` at all, both
	//     pass through untouched);
	//   - the id must not already carry the view's prefix (guards
	//     against double-prefixing when a caller opted to compute the
	//     prefixed id manually, the same guard `View.byId` uses).
	const activeView = currentScope().view;
	if (
		activeView &&
		typeof (activeView as { getAutoPrefixId?: () => boolean }).getAutoPrefixId === "function" &&
		(activeView as { getAutoPrefixId: () => boolean }).getAutoPrefixId() === true &&
		typeof settings.id === "string" &&
		settings.id.length > 0
	) {
		const rawId = settings.id;
		const viewId = (activeView as { getId: () => string }).getId();
		if (!rawId.startsWith(`${viewId}--`)) {
			settings.id = (activeView as { createId: (id: string) => string }).createId(rawId);
		}
	}

	// Hand off to the active renderer. The default renderer returns
	// `new controlClass(settings)`; an XML or RM adapter would do something
	// else without touching this file.
	const instance = currentRenderer().construct(controlClass, settings);

	// Run post-construction side effects (intrinsic-scheduled) and then
	// post-construction property appliers (plugin-supplied, e.g. promise
	// resolution in the FE adapter).
	if (postCallbacks) {
		for (const cb of postCallbacks) {
			cb(instance);
		}
	}
	const appliers = currentPropertyAppliers();
	if (appliers.length > 0) {
		for (const [key, value] of propEntries) {
			if (key === "children") {
				continue;
			}
			for (const applier of appliers) {
				if (applier.matches(key, value)) {
					applier.apply(instance, key, value);
					break;
				}
			}
		}
	}

	return instance;
}

/**
 * Walk the registered intrinsics and return the first one that claims
 * `(propName, value)`. The match decision can depend on the target
 * metadata (e.g. the dot-handler matcher only fires on event props).
 */
function matchIntrinsic(
	intrinsics: readonly IntrinsicHandler[],
	propName: string,
	value: unknown,
	metadata: ControlMetadata
): IntrinsicHandler | undefined {
	for (const handler of intrinsics) {
		if (handler.matches(propName, { value, metadata })) {
			return handler;
		}
	}
	return undefined;
}

/**
 * Babel uses `jsxs` for elements with multiple static children. Our
 * implementation handles single and multiple children identically, so this is
 * just an alias.
 */
export const jsxs = jsx;

// --- Sentinel infrastructure ------------------------------------------------

/**
 * The brand symbol every plugin sentinel carries. The runtime checks
 * `tag[SENTINEL_TAG] === true` (strict-true) to decide whether to
 * route a `jsx(tag, props)` call through the sentinel/processor path.
 *
 * Exported for plugin authors via `defineSentinel`. Apps don't import
 * the symbol directly.
 */
export const SENTINEL_TAG = Symbol.for("ui5.community.jsx.runtime.SentinelTag");

/**
 * The shape every plugin sentinel must satisfy: a function-type "type"
 * (so JSX accepts it) carrying the `SENTINEL_TAG` brand.
 *
 * The phantom call signature `(props: P) => never` is what TypeScript's
 * JSX checker reads when it builds `LibraryManagedAttributes` for the
 * sentinel, the `SettingsOf` helper picks up the call's parameter
 * type and uses it as the prop schema. So a plugin author who writes
 * `defineSentinel<{ on: unknown; children?: unknown }>("Switch")` gets
 * `<Switch on={...}>...</Switch>` typed correctly. The body never runs;
 * `jsx()` short-circuits on the brand.
 */
export type SentinelTag<P = Record<string, unknown>> = ((props: P) => never) & {
	[SENTINEL_TAG]: true;
	/** Display name for error messages. */
	displayName: string;
};

function isSentinelTag(value: unknown): value is SentinelTag {
	return (
		typeof value === "function" &&
		(value as { [SENTINEL_TAG]?: unknown })[SENTINEL_TAG] === true
	);
}

/**
 * Helper for plugin authors. Builds a `SentinelTag<P>` whose call body
 * throws (sentinels are never invoked, `jsx()` short-circuits on the
 * brand) and whose `displayName` is used in errors. The generic `P`
 * propagates through `LibraryManagedAttributes` for typed JSX usage.
 *
 * The `<P>` generic is load-bearing. Dropping it makes TS fall back to
 * `any` and prop typos stop being caught, see the "defineSentinel<P>
 * needs its generic" entry in [docs/gotchas.md](../../../../docs/gotchas.md).
 *
 * @example
 * export const Switch = defineSentinel<{
 *   on: unknown;
 *   children?: unknown;
 * }>("Switch");
 * // now <Switch on={...}>...</Switch> typechecks and rejects prop typos
 */
export function defineSentinel<P = Record<string, unknown>>(name: string): SentinelTag<P> {
	const fn = function (_props: P): never {
		void _props;
		throw new Error(
			`<${name}> is a JSX sentinel; it must appear inside a parent JSX ` +
			`element whose active scope registers a matching ChildrenProcessor.`
		);
	} as SentinelTag<P>;
	(fn as { displayName: string }).displayName = name;
	(fn as { [SENTINEL_TAG]: true })[SENTINEL_TAG] = true;
	return fn;
}

/**
 * The marker node a plugin sentinel produces when invoked via
 * `jsx(tag, props)`. The plugin's `ChildrenProcessor` recognises it
 * by `tag` identity (`node.tag === Switch`) and processes it.
 *
 * Exposed in this file so `processChildren` can build it generically.
 */
export interface SentinelNode {
	__ui5JsxSentinel: true;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tag: SentinelTag<any>;
	props: Record<string, unknown>;
}

function makeSentinelNode(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	tag: SentinelTag<any>,
	props: (Record<string, unknown> & { children?: unknown }) | null
): SentinelNode {
	return { __ui5JsxSentinel: true, tag, props: props ?? {} };
}

export function isSentinelNode(value: unknown): value is SentinelNode {
	return hasBrand(value, "__ui5JsxSentinel");
}

/**
 * Check whether `value` is an object carrying the well-known
 * marker `brand: true`. Shared by every sentinel-node predicate
 * (`isSentinelNode`, `isFragmentNode`, `isForNode`, `isIfNode`)
 * so the null-check + type-cast dance lives in one place.
 */
function hasBrand<K extends string>(value: unknown, brand: K): value is Record<K, true> & Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as Record<K, unknown>)[brand] === true
	);
}

// --- Fragment ---------------------------------------------------------------

/**
 * Sentinel value used as the `type` argument when Babel compiles `<>...</>`.
 *
 * Babel's automatic runtime emits roughly
 *
 *   _jsx(Fragment, { children: [<A/>, <B/>] })
 *
 * for a fragment. We detect that call shape inside `jsx()` and short-circuit
 * to a `FragmentNode` marker that the `FragmentProcessor` (registered in the
 * default scope) inlines into the surrounding parent's aggregation.
 *
 * It is exported as a plain object (not a Symbol) so the runtime check
 * `type === Fragment` works after module re-export and JSON-style copy paths.
 */
export const Fragment = { __ui5JsxFragment: true } as const;

/**
 * The intermediate node returned by `jsx(Fragment, ...)`. It is *not* a UI5
 * control, it never reaches a UI5 aggregation. The FragmentProcessor
 * recognises it and inlines its children into the parent.
 */
type FragmentNode = { __ui5JsxFragment: true; children: unknown };

function makeFragmentNode(props: (Record<string, unknown> & { children?: unknown }) | null): FragmentNode {
	const children = props?.children;
	return { __ui5JsxFragment: true, children };
}

function isFragmentNode(value: unknown): value is FragmentNode {
	return hasBrand(value, "__ui5JsxFragment");
}

// --- <For> / <If> structural directives -------------------------------------

/**
 * `<For each={listRef}>{() => <Row/>}</For>`, sugar over the
 * "bound-aggregation child becomes binding template" mechanism (FR-CON-04).
 *
 * The runtime detects `For` by identity inside `jsx()` and produces a
 * `ForNode` marker. The core's `ForProcessor` then installs `each` (a
 * `ListBindingRef` / `BindingInfo`) into the targeted aggregation and
 * uses the render-prop's return value as the row template.
 *
 * The render-prop receives a placeholder argument by convention; UI5
 * binding contexts already drive per-row property resolution at runtime
 * (via relative paths / `o.rel(...)`), so the argument is unused.
 *
 *   <Table columns={[<Column><Label text="Name"/></Column>]}>
 *     <For each={o.list("/Products")}>{() =>
 *       <ColumnListItem><Text text={o.rel("ProductName")}/></ColumnListItem>
 *     }</For>
 *   </Table>
 *
 * By default the binding is installed into the parent's *default*
 * aggregation (e.g. `Table.items`). Pass `aggregation="cells"` to target
 * a different one.
 *
 * @example
 * // Explicit form, render-prop returns the row template.
 * <List>
 *   <For each={{ path: "/items" }}>{() =>
 *     <StandardListItem title="{label}" description="ID: {id}" />
 *   }</For>
 * </List>
 */
export function For(_props: {
	each: unknown;
	aggregation?: string;
	children: (item: unknown) => unknown;
}): never {
	void _props;
	throw new Error("For is a JSX-only directive; call as <For each={...}>{...}</For>");
}

type ForNode = {
	__ui5JsxFor: true;
	each: unknown;
	aggregation: string | undefined;
	children: unknown;
};

function makeForNode(props: (Record<string, unknown> & { children?: unknown }) | null): ForNode {
	const p = (props ?? {}) as { each?: unknown; aggregation?: unknown; children?: unknown };
	return {
		__ui5JsxFor: true,
		each: p.each,
		aggregation: typeof p.aggregation === "string" ? p.aggregation : undefined,
		children: p.children
	};
}

function isForNode(value: unknown): value is ForNode {
	return hasBrand(value, "__ui5JsxFor");
}

/**
 * `<If condition={cond}>...</If>`. JSX-native conditional rendering.
 *
 * Two cases handled by the core's `IfProcessor`:
 *
 *  - **Literal condition** (a plain `true`/`false`): include the children
 *    in the parent's aggregation, or omit them, at construction time.
 *
 *  - **Bound condition** (a `BindingValue` or BindingInfo-shaped object):
 *    bind `visible` on each child directly via the `Control.bindProperty`
 *    primitive every UI5 control inherits from `ManagedObject`. UI5's
 *    standard binding-driven rerender handles show/hide.
 *
 * If a child already binds (or hard-pins) its own `visible`, `<If>`
 * throws rather than silently overriding the inner intent. Combine the
 * conditions in an expression binding instead, or wrap the group in
 * your own layout.
 *
 * @example
 * // Literal — decided at construction time, no wrapper control.
 * <If condition={featureFlag}>
 *   <Title text="Behind a flag" level="H4" />
 * </If>
 *
 * // Bound — visible flips as the model changes.
 * <If condition={{ path: "/showDetails" }}>
 *   <Text text="Reactive detail block." />
 * </If>
 */
export function If(_props: {
	condition: unknown;
	children?: unknown;
}): never {
	void _props;
	throw new Error("If is a JSX-only directive; call as <If condition={...}>...</If>");
}

type IfNode = {
	__ui5JsxIf: true;
	condition: unknown;
	children: unknown;
};

function makeIfNode(props: (Record<string, unknown> & { children?: unknown }) | null): IfNode {
	const p = (props ?? {}) as { condition?: unknown; children?: unknown };
	return {
		__ui5JsxIf: true,
		condition: p.condition,
		children: p.children
	};
}

function isIfNode(value: unknown): value is IfNode {
	return hasBrand(value, "__ui5JsxIf");
}

// --- Children processing pipeline -------------------------------------------

/**
 * A `BindingInfo`-shaped value carries a `path` field. Both UI5 and our
 * own `BindingValue` proxy use this signal. Typed as a type-guard so
 * callers get `path: unknown` narrowing (and the sibling `template`
 * slot the runtime's default-aggregation logic touches) without a
 * second cast.
 */
function isBindingLike(value: unknown): value is Record<string, unknown> & { path: unknown; template?: unknown } {
	return (
		typeof value === "object" &&
		value !== null &&
		"path" in (value as Record<string, unknown>)
	);
}

/**
 * Walk `children` once, dispatching each child to the registered
 * `ChildrenProcessor` whose `matches` claims it. Any child that no
 * processor claims is forwarded to the leftover-list, where the default
 * aggregation logic will pick it up.
 *
 * The processors operate on a *flat* view of the children, fragments
 * are recursively unwrapped by `flattenSentinelLevel` first so a
 * processor sees `<For>` even if it was the lone child of a `<Fragment>`.
 */
function processChildren(
	children: unknown,
	settings: Record<string, unknown>,
	defaultAggregation: string
): unknown {
	const list = flattenSentinelLevel(children);
	const processors = currentChildrenProcessors();
	const out: unknown[] = [];
	const emit = (child: unknown): void => {
		out.push(child);
	};
	for (const node of list) {
		let claimed = false;
		for (const processor of processors) {
			if (processor.matches(node)) {
				processor.process(node, settings, defaultAggregation, emit);
				claimed = true;
				break;
			}
		}
		if (!claimed) {
			out.push(node);
		}
	}
	return out;
}

/**
 * Return the child list a node should be *expanded into*, or
 * `undefined` if it should be kept as-is. Shared by
 * `flattenSentinelLevel` and `flattenChildren` for the two universal
 * expansions (arrays produced by Babel from JSX map/spread; fragment
 * marker nodes). `flattenChildren` layers its `<If>` inlining on top
 * of this after checking here first.
 */
function expandChild(node: unknown): unknown[] | undefined {
	if (Array.isArray(node)) {
		return node as unknown[];
	}
	if (isFragmentNode(node)) {
		const inner = node.children;
		return Array.isArray(inner) ? (inner as unknown[]) : [inner];
	}
	return undefined;
}

/**
 * Flatten one level of fragments / arrays so structural-directive sentinels
 * (e.g. a `<For>` wrapped in `<>`) reach `processChildren` directly. Falsy
 * filtering happens later in `flattenChildren`, keeping the two passes
 * separate means a `null` produced by `{flag && <X/>}` doesn't accidentally
 * eat the surrounding `<For>`.
 */
function flattenSentinelLevel(children: unknown): unknown[] {
	const out: unknown[] = [];
	const stack: unknown[] = Array.isArray(children) ? [...(children as unknown[])] : [children];
	while (stack.length > 0) {
		const node = stack.shift();
		const expanded = expandChild(node);
		if (expanded) {
			stack.unshift(...expanded);
			continue;
		}
		out.push(node);
	}
	return out;
}

/**
 * Walk a children value (single child, array, or fragment) and return a flat
 * array of real UI5 controls. Filters out falsy entries (`null`, `undefined`,
 * `false`, `""`) so `{flag && <X/>}` works the way every JSX-trained
 * developer expects, and recursively unwraps `<>...</>` fragments so they
 * never escape into a real aggregation.
 */
function flattenChildren(children: unknown): unknown[] {
	const out: unknown[] = [];
	const initial: unknown[] = Array.isArray(children) ? (children as unknown[]) : [children];
	const stack: unknown[] = [...initial];
	while (stack.length > 0) {
		const node = stack.shift();
		if (node === null || node === undefined || node === false || node === "") {
			continue;
		}
		// Whitespace-only string children come from JSX-source indentation
		// around child elements (Babel emits e.g. `["  ", <X/>, " "]`).
		// They aren't real children, drop them. Non-whitespace strings are
		// kept; UI5 controls reject them at validateAggregation, which is
		// the right error for `<VBox>hello</VBox>` (a real authoring bug).
		if (typeof node === "string" && node.trim() === "") {
			continue;
		}
		const expanded = expandChild(node);
		if (expanded) {
			stack.unshift(...expanded);
			continue;
		}
		if (isIfNode(node)) {
			// Resolved at this point: literal `<If>` (boolean condition)
			// has been collapsed into either its children or nothing;
			// bound-condition <If>s have already been turned into
			// per-child `visible` bindings by `IfProcessor`.
			// `processChildren` runs first, so any IfNode that reaches
			// here is a literal whose payload should still be inlined.
			const inner = resolveLiteralIf(node);
			stack.unshift(...(Array.isArray(inner) ? (inner as unknown[]) : [inner]));
			continue;
		}
		out.push(node);
	}
	return out;
}

/**
 * For literal `<If condition={true|false}>...</If>` reached during
 * `flattenChildren`. A `true` condition inlines the children; `false`
 * (and any other falsy literal) drops them.
 */
function resolveLiteralIf(node: IfNode): unknown {
	if (node.condition && !isBindingLike(node.condition)) {
		return node.children;
	}
	if (!node.condition) {
		return null;
	}
	// Defensive: a binding-like that slipped through processChildren
	// (e.g. nested fragment unwrap order). Treat as truthy and inline.
	return node.children;
}

// --- Built-in core IntrinsicHandlers ----------------------------------------

/**
 * `class="..."` → `addStyleClass(...)` post-construction.
 *
 * UI5's `applySettings` doesn't itself recognise `class` (it's not on
 * `$ControlSettings`), but the framework's settings parser routes it
 * through `addStyleClass` historically, and apps depend on it. We
 * codify that as the first explicit intrinsic of the core SPI.
 *
 * Returning `undefined` removes the prop from `settings` so UI5 doesn't
 * see an unknown key.
 */
const classIntrinsic: IntrinsicHandler = {
	matches(propName) {
		return propName === "class";
	},
	apply(_propName, value, _settings, post) {
		const cls = typeof value === "string" ? value : "";
		if (cls.length > 0) {
			post((instance) => {
				const styled = instance as ManagedObject & { addStyleClass?: (s: string) => void };
				styled.addStyleClass?.(cls);
			});
		}
		return undefined; // drop from settings
	}
};

/**
 * Dot-handler intrinsic: resolve `".onTap"`-style event strings
 * against the surrounding view's controller.
 *
 * Only strings that **start with a dot** are claimed. Bare
 * (`"onTap"`) and dotted (`"some.path.fn"`) forms flow through to
 * UI5 untouched. UI5 will either treat them as literal values or
 * reject them, which is what we want. XMLView-parity for global /
 * bare-name handlers was reverted after the concept-review meeting
 * (July 2026); TSX imports handle module-level function references
 * at the JSX call site, so the runtime doesn't need a `window`
 * lookup.
 *
 * The matcher's identifier-path shape check also guards against
 * odd text-shaped event props (`press="Push button"` etc.), the
 * leading-dot requirement plus valid identifier characters means a
 * non-handler string can't accidentally claim.
 */
const HANDLER_STRING_RE = /^\.[A-Za-z_$][\w$]*$/;

const dotHandlerIntrinsic: IntrinsicHandler = {
	matches(propName, ctx) {
		return (
			typeof ctx.value === "string" &&
			ctx.metadata.hasEvent(propName) &&
			HANDLER_STRING_RE.test(ctx.value)
		);
	},
	apply(_propName, value) {
		// Drop the leading `.` and look the method up on the
		// surrounding view's controller at fire time.
		return makeHandler((value as string).slice(1));
	}
};

/**
 * `binding="{/Foo}"` → `bindElement("/Foo")` (FR-INT-02).
 *
 * UI5 itself parses `{ ... }` strings inside settings, so we accept both
 * the binding-string form and a pre-built BindingInfo object. The
 * applicable `bindElement` method exists on every `Element` (i.e. every
 * Control); using it here keeps the runtime library-agnostic.
 */
const bindingIntrinsic: IntrinsicHandler = {
	matches(propName) {
		return propName === "binding";
	},
	apply(_propName, value, _settings, post) {
		post((instance) => {
			const bindable = instance as ManagedObject & {
				bindElement?: (path: string | object, parameters?: object) => unknown;
			};
			if (!bindable.bindElement) {
				return;
			}
			if (typeof value === "string" || (typeof value === "object" && value !== null)) {
				bindable.bindElement(value);
			}
		});
		return undefined; // drop from settings
	}
};

/**
 * `ref={cb}` (FR-INT-03): a function prop that gets called with the
 * constructed instance. Mirrors React's callback-ref pattern. Useful
 * when an app needs a typed handle without a `byId` lookup.
 */
const refIntrinsic: IntrinsicHandler = {
	matches(propName, ctx) {
		return propName === "ref" && typeof ctx.value === "function";
	},
	apply(_propName, value, _settings, post) {
		post((instance) => {
			(value as (instance: ManagedObject) => void)(instance);
		});
		return undefined;
	}
};

/**
 * Function-typed event handler intrinsic: `press={this.onTap}` without
 * the redundant `.bind(this)`.
 *
 * UI5's own event attach signature is `attachPress(fn, listener?)`, and
 * `applySettings` accepts `{ press: [fn, listener] }`, this is exactly
 * how XMLView's `EventHandlerResolver` passes the controller as the
 * listener context. We rewrite `press={fn}` into the same array shape
 * at JSX-time so `this` inside the handler resolves to the controller
 * without any authorial ceremony.
 *
 * Two resolution paths for the listener:
 *
 *   1. If `currentScope().controller` was pinned via
 *      `withScope({ controller }, …)`, emit `[fn, controller]`
 *      directly, no wrapper closure, no runtime cost on the hot path.
 *   2. Otherwise, emit a small wrapper closure that resolves the
 *      controller via the ancestor walk at fire time. Adds one
 *      function frame per event, but keeps `press={this.onTap}` working
 *      inside a plain `View.createContent()` with no `withScope`.
 *
 * Does **not** clobber a user's own `.bind(this)`: a bound function
 * inside `[fn, listener]` ignores the listener at fire time (bound
 * `this` wins over UI5's listener argument). So
 * `press={this.onTap.bind(this)}` and `press={this.onTap}` produce
 * identical behaviour under this intrinsic, one is just less noisy.
 *
 * Registered *after* `refIntrinsic` so `ref={cb}` (also a function
 * prop) claims first, but the two never collide because `ref` isn't
 * an event on any UI5 metadata.
 */
const fnHandlerIntrinsic: IntrinsicHandler = {
	matches(propName, ctx) {
		return typeof ctx.value === "function" && ctx.metadata.hasEvent(propName);
	},
	apply(_propName, value) {
		const fn = value as (this: unknown, event: Event) => unknown;
		const pinned = pinnedController();
		if (pinned) {
			// Fast path: hand UI5 the same `[fn, listener]` shape XMLView
			// uses. UI5's attach path treats the array as
			// `attachPress(fn, listener)` and sets `this === listener`.
			return [fn, pinned];
		}
		// Fallback: no pinned controller, wrap the function so `this`
		// inside the handler is resolved via the ancestor walk at fire
		// time. Bound functions ignore the reassigned receiver, so
		// `press={this.onTap.bind(this)}` still works transparently.
		return function (this: Element, event: Event): unknown {
			const owner = findController(this);
			return fn.call(owner ?? this, event);
		};
	}
};

/**
 * Property-type intrinsic: JSX-site error attribution.
 *
 * **Primary value: error message quality.** UI5's `ManagedObject.applySettings`
 * already coerces string prop values to their declared `DataType` (so
 * `"10"` → `10` for an `int`-typed property, `"false"` → `false` for a
 * `boolean`, and enum names are validated against their union). What UI5
 * does *not* do is name the *JSX site* when coercion or validation fails.
 * A typo like `<Button type="Empahsized" />` throws deep inside
 * `applySettings`, with a framework stack the app author has to unpack
 * to find their own file.
 *
 * This intrinsic runs the same `DataType.parseValue` / `DataType.isValid`
 * pipeline UI5 would run, but on the *JSX side of the boundary*, so the
 * `TypeError` it throws names the control class, the prop, the expected
 * type, and the offending value in one line. Example:
 *
 *   <Button type="Empahsized" />
 *   //  → TypeError: <sap.m.Button type={…}>: expected sap.m.ButtonType,
 *   //    got "Empahsized"
 *
 * **Secondary: eager coercion for post-hooks and other intrinsics.**
 * Because coercion happens *before* `applySettings`, any post-construct
 * hook or downstream intrinsic that reads `settings[propName]` sees the
 * coerced value (e.g. `10`, not `"10"`). Without this intrinsic, they'd
 * see the raw string and would have to re-coerce themselves.
 *
 * Where the type-checker is the *first* line of defence:
 * `@openui5/types` already narrows enum-shaped settings to the union
 * (e.g. `$ButtonSettings.type?: ButtonType | keyof typeof ButtonType`),
 * so a literal typo on a control class typed against the standard
 * settings interface fails at `tsc`. But three real cases slip past
 * the type-checker and land here:
 *
 *   - Values that originate as `any` (JSON config, untyped fetches).
 *   - Spread props (`<Button {...props} />`) that wash type info out.
 *   - The escape hatch where someone authored a prop value as a string
 *     literal because the type was wide and `@openui5/types` couldn't
 *     narrow further.
 *
 * **Scope: strings only.** The intrinsic only intervenes on plain
 * string values that don't look like binding expressions. Every other
 * shape, `BindingValue` objects, simple `{path}` and composite
 * `{parts, formatter}` BindingInfos, constant `{value, formatter}`
 * bindings, numbers, booleans, arrays, functions, flows through to
 * UI5's `applySettings`, which already validates them. Trying to
 * enumerate every UI5 BindingInfo shape here would be a long-running
 * footgun (composite bindings have no `.path`; constant bindings have
 * no `.path` either; an `extractBindingInfo` adapter could legitimately
 * accept new shapes in the future). The string-narrow contract avoids
 * that maintenance burden entirely.
 *
 * Strings that look like UI5 binding expressions are skipped too,
 * anything `BindingParser.complexParser(str)` recognises as a
 * binding-shaped result (an object) is left alone; only strings the
 * parser resolves to a plain literal (or that contain no `{` at all)
 * are considered candidates for coercion. That covers the obvious
 * cases (`"{path}"`, `"{= ${a} > 5 }"`, `"{i18n>key}"`) **and** the
 * composite forms with leading literal text (`"Hello {/firstname}"`,
 * `"Total: {= ${count} * 2 } EUR"`). An author who needs a *literal*
 * `{` in a non-binding string escapes it as `\{`, same convention
 * UI5 itself uses, and the parser handles it as a plain string, so
 * we agree with `applySettings` by construction.
 *
 * Delegating to `BindingParser` (the same primitive
 * `ManagedObject.extractBindingInfo` uses internally) removes the
 * last regex-vs-parser mismatch surface. A cheap `.includes("{")`
 * prescreen keeps the hot path free: 99% of prop strings contain no
 * `{` at all and never reach the parser. When there *is* a `{`, the
 * parser was going to run anyway inside `applySettings`, so we're
 * not adding measurable cost.
 *
 * Registered at the **end** of the default-scope intrinsic list, so
 * `class` / dot-handler / `binding` / `ref` claim their props first. A
 * plugin that wants a different validation policy can register a
 * handler at the front of the scope's intrinsic list and outrank this
 * one, first-match-wins precedence is the override mechanism.
 */
/**
 * Format an about-to-be-reported offending value for the `TypeError`
 * message thrown by `propertyTypeIntrinsic`. UI5 metadata types include
 * `object` and array types, so a naive `String(value)` would produce the
 * useless `[object Object]` for those. We branch per JS type so the
 * receiver of `String(...)` is always a safe primitive; `JSON.stringify`
 * covers objects and arrays; `Object.prototype.toString.call` is the
 * fallback for values that stringify would reject (cycles etc.).
 */
function formatOffending(value: unknown): string {
	if (typeof value === "string") {
		return `"${value}"`;
	}
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return String(value);
	}
	if (typeof value === "symbol") {
		return value.toString();
	}
	if (value === null) {
		return "null";
	}
	if (value === undefined) {
		return "undefined";
	}
	try {
		return JSON.stringify(value) ?? Object.prototype.toString.call(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
}

const propertyTypeIntrinsic: IntrinsicHandler = {
	matches(propName, ctx) {
		if (!ctx.metadata.hasProperty(propName)) return false;
		// Strings only, see the scope note in the file-level comment.
		// Every non-string value (BindingValues, composite BindingInfos,
		// constant bindings, numbers, booleans, arrays, functions) flows
		// through to UI5's applySettings, which already validates them.
		if (typeof ctx.value !== "string") return false;
		// Cheap prescreen, 99% of prop strings never contain a `{` and
		// never need the parser. Only strings that *might* be a binding
		// pay for the full parse.
		if (!ctx.value.includes("{")) return true;
		// Delegate to the same primitive `ManagedObject.extractBindingInfo`
		// uses: `complexParser` returns an object when the string parses
		// as a binding (with `.parts` or `.path`), and a plain string
		// (the unescaped literal) when it doesn't. We claim only the
		// literal case; binding-shaped objects flow through untouched
		// for UI5's own applySettings pass.
		//
		// The parser *throws* on malformed binding syntax, e.g. a
		// string containing `{this.onTap}` reaches JSTokenizer, which
		// rejects the identifier because it's not a valid path
		// expression. A thrown error is UI5's way of saying "this
		// isn't a binding-shaped string I can parse", which for our
		// purpose is the same signal as "return me a plain string":
		// treat it as a literal and let coercion proceed. If UI5 later
		// re-parses the same string inside applySettings, it'll surface
		// the same error there, at the site UI5 already documents.
		let parsed: unknown;
		try {
			parsed = BindingParser.complexParser(ctx.value);
		} catch {
			return true;
		}
		return !(parsed && typeof parsed === "object");
	},
	apply(propName, value, _settings, _post, metadata) {
		const descriptor = metadata.getProperty(propName);
		if (!descriptor) {
			// matches() guarantees this is set, but the descriptor could
			// be `undefined` if metadata races with a control redefinition
			// (extremely rare). Pass through; UI5 will tell us.
			return value;
		}
		// `any`-typed properties opt out of validation by convention.
		if (descriptor.type === "any") return value;

		const type = DataType.getType(descriptor.type);
		if (!type) {
			// Unknown type name, let UI5 produce the canonical error.
			return value;
		}

		// `matches()` above narrows `value` to a non-binding string.
		// TypeScript can't see that across the function boundary, so
		// we cast once here to make the intent explicit.
		const stringValue = value as string;

		// For string-declared properties (e.g. CSSSize, URI) the value
		// passes through, parseValue would just return the same string.
		// For everything else, parseValue does the coercion UI5 itself
		// would do inside applySettings, just earlier and with our error
		// site instead of the framework's.
		const coerced: unknown = type.getName() === "string"
			? stringValue
			: (type.parseValue(stringValue) as unknown);

		if (!type.isValid(coerced)) {
			throw new TypeError(
				`<${metadata.getName()} ${propName}={…}>: expected ${type.getName()}, ` +
				`got ${formatOffending(coerced)}`
			);
		}

		return coerced;
	}
};

// --- Built-in core ChildrenProcessors --------------------------------------

/**
 * `<Fragment>`, recursively inlines its children into the parent.
 * `flattenSentinelLevel` already handled the surface unwrap; this
 * processor catches a fragment that arrived nested inside another
 * structural directive.
 */
const fragmentProcessor: ChildrenProcessor = {
	matches(child) {
		return isFragmentNode(child);
	},
	process(child, _settings, _defaultAggregation, emit) {
		const inner = (child as FragmentNode).children;
		const list = Array.isArray(inner) ? (inner as unknown[]) : [inner];
		for (const c of list) {
			emit(c);
		}
	}
};

/**
 * `<For>`, installs `each` (a binding info / list ref) onto the parent's
 * targeted aggregation, with the render-prop's return value as the row
 * template. Defers to a user-provided template if the aggregation is
 * already bound and only the template is missing, same parity rule as
 * the original `processForChildren` logic (FR-CON-04).
 */
const forProcessor: ChildrenProcessor = {
	matches(child) {
		return isForNode(child);
	},
	process(child, settings, defaultAggregation, _emit) {
		void _emit;
		const node = child as ForNode;
		const target = node.aggregation ?? defaultAggregation;
		const each = node.each as Record<string, unknown> | undefined;
		if (!each || !isBindingLike(each)) {
			throw new Error(
				"<For each={...}> requires a binding info / ListBindingRef as `each`"
			);
		}
		// Render the template now. The render-prop is passed an undefined
		// `item` because UI5's binding context, not a JS value, drives
		// per-row resolution at render time.
		const template = typeof node.children === "function"
			? (node.children as (item: unknown) => unknown)(undefined)
			: node.children;
		const existing = settings[target] as { path?: unknown; template?: unknown } | undefined;
		if (existing && isBindingLike(existing)) {
			if (existing.template === undefined) {
				existing.template = template;
			}
		} else {
			settings[target] = { ...each, template };
		}
		// `<For>` consumes the binding slot entirely, no children survive
		// to the parent's leftover list.
	}
};

/**
 * `<If>`, two modes:
 *
 *   - literal (`condition` is `true`/`false` and not a binding): emit
 *     the children verbatim or drop them.
 *   - bound (`condition` is a BindingInfo): bind each child's `visible`
 *     property to the condition, then emit the children. No wrapper
 *     control, keeps the runtime library-agnostic.
 *
 * The throw-on-conflict rule (a child that already binds its own
 * `visible` is a hard error) is preserved verbatim from the previous
 * implementation; combining intentions silently is worse than failing
 * loud.
 */
const ifProcessor: ChildrenProcessor = {
	matches(child) {
		return isIfNode(child);
	},
	process(child, _settings, _defaultAggregation, emit) {
		const node = child as IfNode;
		if (!isBindingLike(node.condition)) {
			// Literal, leave the IfNode in place; `flattenChildren` will
			// inline (or drop) it depending on truthiness. This preserves
			// the previous semantics where `<If condition={false}>` truly
			// erases its children rather than emitting any wrapper.
			emit(node);
			return;
		}
		const inner = flattenChildren(node.children);
		for (const childCtl of inner) {
			if (childCtl instanceof ManagedObject && childCtl.getMetadata().hasProperty("visible")) {
				if (
					childCtl.getBindingInfo("visible") !== undefined ||
					(childCtl as ManagedObject & { getVisible?: () => boolean }).getVisible?.() === false
				) {
					throw new Error(
						"<If condition={...}> cannot wrap a child that already controls its own `visible`. " +
						"Combine the conditions in an expression binding " +
						"(e.g. visible=`{= ${" +
						"yourCond} && ${innerCond} }`) or write a wrapper layout yourself."
					);
				}
				// Pass each child a *fresh shallow copy* of the binding info.
				// UI5's binding machinery may mutate the info during
				// installation (filling in `parts`, `formatter`, resolved
				// model, etc.); sharing one object across N children corrupts
				// every binding after the first. Same class of bug as the
				// FR-CON-04 list-template issue fixed in commit 2e12ecd.
				childCtl.bindProperty("visible", { ...(node.condition as object) });
			}
			emit(childCtl);
		}
	}
};

// --- Default scope bootstrap -----------------------------------------------

/**
 * Install the core SPI defaults into the bottom-of-stack scope at module
 * load. Anything an app does later via `withScope` layers on top of this.
 *
 * Order matters: intrinsics are matched first-match-wins, so the
 * dot-handler claim has to come before any plugin that wants to
 * inspect strings starting with `"."`. Children processors are also
 * first-match-wins. Fragment / For / If have to be claimable
 * regardless of what plugins register.
 */
{
	const defaults = _defaultScopeForRuntimeInit();
	defaults.renderer = defaultRenderer;
	defaults.intrinsics = [
		classIntrinsic,
		dotHandlerIntrinsic,
		bindingIntrinsic,
		refIntrinsic,
		// fnHandlerIntrinsic sits between the ref intrinsic (which claims
		// `ref={cb}`, also a function prop, but not an event) and the
		// property-type intrinsic. It rewrites function-typed event
		// props into UI5's `[fn, listener]` settings array or a wrapper
		// closure so `press={this.onTap}` resolves `this` correctly
		// without an authorial `.bind(this)`.
		fnHandlerIntrinsic,
		// propertyTypeIntrinsic is registered last so the specific
		// handlers above claim their props first. Plugins that want a
		// different validation policy push their handler to the *front*
		// of the scope's intrinsic list (first-match-wins precedence).
		propertyTypeIntrinsic
	];
	defaults.childrenProcessors = [fragmentProcessor, forProcessor, ifProcessor];
	defaults.propertyAppliers = [];
}

// --- TypeScript JSX namespace ------------------------------------------------

/**
 * The `JSX` namespace tells TypeScript what every JSX expression evaluates to
 * and how prop types are inferred.
 *
 * - `Element = Control`, `<Page>...</Page>` types as `Control`, which
 *   satisfies `createContent(): Control` without casts.
 *
 * - `LibraryManagedAttributes` is the per-element prop schema. UI5 control
 *   constructors are `(id?: string, settings?: $XSettings)`, we pull the
 *   `$XSettings` interface out of the constructor signature with
 *   `ConstructorParameters` and use it directly. The `$XSettings` interfaces
 *   are already shipped as part of `@openui5/types`, generated from each
 *   control's metadata, so we get per-control typing for properties, named
 *   aggregations, associations, and event payloads "for free", no codegen
 *   step in this repo.
 *
 *   Two JSX-specific extras are layered on top of the raw settings shape:
 *
 *     - Every event-shaped prop also accepts a `".dotHandler"`
 *       string, a leading-dot-prefixed identifier that the runtime
 *       resolves against the surrounding view's controller at
 *       fire-time. See `dotHandlerIntrinsic` for the resolution
 *       (FR-EVT-01). Bare-name and dotted-path lookups against
 *       `window` (XMLView's `EventHandlerResolver` also supports
 *       those) are intentionally out of scope. TSX imports handle
 *       module-level references at the JSX call site.
 *     - `class` (the standard HTML/JSX styling prop) is allowed as a
 *       string. UI5 itself doesn't expose it on `$ControlSettings`, but the
 *       framework's settings parser routes a `class` setting through
 *       `addStyleClass`, so it works at runtime and is widely used.
 *
 *   `id`, `key`, and `children` round out the JSX-mandatory set.
 */
/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
export namespace JSX {
	/**
	 * Every JSX expression in this runtime is `any`.
	 *
	 * This may look surprising, we *do* want strong typing, and the
	 * per-control `LibraryManagedAttributes` below is exactly that. The
	 * narrow-element type is wrong for a different reason: a JSX expression
	 * has to be assignable to *whatever named-aggregation slot it lands in*.
	 * `<Card header={<Header/>}>` requires `<Header/>` to satisfy
	 * `$CardSettings.header?: IHeader`; `<Table columns={[<Column/>]}>`
	 * requires `<Column/>` to satisfy `Column[]`. A single concrete element
	 * type (e.g. `Control`) cannot be a subtype of every aggregation slot
	 * type at once.
	 *
	 * React solves this by typing `JSX.Element` as the opaque
	 * `React.ReactElement` and never letting it touch a real DOM element
	 * type, the boundary is between the JSX world and the React world.
	 * UI5's "JSX" world *is* the control world (by design, every JSX call
	 * is a `new Control(...)`), so we don't have a separate boundary to
	 * exploit. `any` is the deliberate escape valve: prop validation
	 * happens at the call site (against `$XSettings`), not at the slot
	 * boundary. The runtime still produces real `Control` instances; the
	 * implementation file declares its return types concretely; only the
	 * JSX *expression* type is widened.
	 *
	 * This is the same trade-off `solid-js`'s JSX namespace makes
	 * (`type Element = ... | JSX.HTMLElement`), a single broad type so
	 * named-slot inference works.
	 */
	export type Element = any;
	export interface ElementClass extends ManagedObject {}
	export interface ElementAttributesProperty {}
	export interface ElementChildrenAttribute { children: object }

	/**
	 * Common HTML / SVG attribute bag, deliberately permissive.
	 *
	 * String-typed JSX (`<div>`, `<svg>`, `<polyline>`) is the hook
	 * point for a future HTML-aware RenderManager plugin. Outside that
	 * plugin, the runtime throws a clear error at construction time,
	 * see the `htmlIntrinsic` dispatch in `jsx()`.
	 *
	 * The typing here is intentionally minimal:
	 *
	 *  - The standard HTML attributes that *every* tag accepts
	 *    (`id`, `class`, `style`, `title`, `data-*`, etc.) are typed.
	 *  - `[attr: string]: unknown` covers the long tail (SVG-specific
	 *    attributes, ARIA, custom-element props) without forcing us
	 *    to mirror `lib.dom.d.ts`.
	 *  - Event handlers are typed loosely as `(e: Event) => void`;
	 *    the RM plugin's typed renderer can narrow them per-element
	 *    via a more specific `IntrinsicElements` map if it wants.
	 *
	 * A future iteration can replace this with per-tag types pulled from
	 * `lib.dom.d.ts` (the same approach `solid-js` and `preact` use).
	 * For the sketch the permissive bag is enough to make
	 * `<div class="x"><polyline points="..."/></div>` typecheck cleanly
	 * without any cast.
	 */
	export interface HTMLAttributes {
		id?: string;
		class?: string;
		style?: string | Record<string, string | number>;
		title?: string;
		role?: string;
		tabIndex?: number;
		hidden?: boolean;
		children?: unknown;
		[attr: string]: any;
	}

	/**
	 * `IntrinsicElements` is the type-checker's table of "what props
	 * does each string-typed tag accept". A non-empty map makes
	 * `<div>` legal in TSX; the value type defines the prop schema.
	 *
	 * The string-indexer entry is what actually matters here, it
	 * makes *every* HTML/SVG/custom-element tag legal with the
	 * permissive `HTMLAttributes` shape. The named entries are listed
	 * for IDE-completion friendliness on the most common tags; they
	 * resolve to the same shape.
	 */
	export interface IntrinsicElements {
		[tag: string]: HTMLAttributes;
		// Common HTML
		div: HTMLAttributes;
		span: HTMLAttributes;
		p: HTMLAttributes;
		a: HTMLAttributes;
		button: HTMLAttributes;
		input: HTMLAttributes;
		label: HTMLAttributes;
		ul: HTMLAttributes;
		ol: HTMLAttributes;
		li: HTMLAttributes;
		table: HTMLAttributes;
		tr: HTMLAttributes;
		td: HTMLAttributes;
		th: HTMLAttributes;
		// Common SVG
		svg: HTMLAttributes;
		g: HTMLAttributes;
		path: HTMLAttributes;
		rect: HTMLAttributes;
		circle: HTMLAttributes;
		line: HTMLAttributes;
		polyline: HTMLAttributes;
		polygon: HTMLAttributes;
		text: HTMLAttributes;
	}
	export interface IntrinsicAttributes { id?: string; key?: string | number }

	/**
	 * Pull the `$XSettings` interface out of any UI5 control constructor.
	 * UI5 declares two overloads, `(settings?)` and `(id?, settings?)`,
	 * so we probe both. Plain function "directives" (`For`, `If`) declare
	 * their props as the first parameter of an ordinary call signature; we
	 * pick those up too. Unknown shapes fall back to an open record, which
	 * preserves the pre-typing behaviour for non-UI5 components.
	 */
	type SettingsOf<C> =
		C extends new (id: string | undefined, settings?: infer S) => unknown ? Exclude<S, undefined> :
		C extends new (settings?: infer S) => unknown ? Exclude<S, undefined> :
		C extends (props: infer P) => unknown ? P :
		Record<string, unknown>;

	/**
	 * Widen each prop in `S`:
	 *
	 * - event-shaped props additionally accept a `".dotHandler"`
	 *   string, a leading-dot-prefixed identifier that the runtime
	 *   resolves against the surrounding view's controller at
	 *   fire-time. See `dotHandlerIntrinsic` in
	 *   [runtime.ts](../jsx-runtime/runtime.ts).
	 *
	 * The mapping preserves all other prop types, bindings, enums,
	 * aggregations, associations, exactly as `$XSettings` declares them.
	 */
	type WithJsxExtras<S> = {
		[K in keyof S]: S[K] extends ((...args: never[]) => unknown) | undefined
			? S[K] | `.${string}`
			: S[K];
	};

	export type LibraryManagedAttributes<C, _P> = WithJsxExtras<SettingsOf<C>> & {
		id?: string;
		key?: string | number;
		children?: unknown;
		class?: string;
		/**
		 * Callback ref. Receives the constructed instance after the runtime
		 * builds it. Mirrors React's callback-ref pattern; useful for
		 * imperative one-shot setup (`ta.setValue(s)` for content that UI5's
		 * settings parser would otherwise misread, focus management,
		 * binding-info-bypassing string assignment).
		 *
		 * Implemented by the core `refIntrinsic` in this same module,
		 * see `refIntrinsic` for the exact post-construct hook.
		 */
		ref?: (instance: C extends new (...a: never[]) => infer I ? I : unknown) => void;
	};
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */

// --- Re-exports of the SPI surface for plugin authors ---------------------

export type {
	Renderer,
	IntrinsicHandler,
	IntrinsicMatchContext,
	ChildrenProcessor,
	PropertyApplier,
	ControlClass,
	ControlMetadata,
	PostConstructHook
} from "./plugin";
export { defaultRenderer } from "./plugin";
export type { Scope } from "./scope";
export {
	withScope,
	currentScope,
	currentRenderer,
	currentIntrinsics,
	currentPropertyAppliers,
	currentChildrenProcessors,
	currentHtmlIntrinsic
} from "./scope";
