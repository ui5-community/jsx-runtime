import type ManagedObject from "sap/ui/base/ManagedObject";

/**
 * The five-extension-point plugin contract described in
 * [docs/requirements.md §3](../../../../docs/requirements.md) (architectural
 * invariants) and [docs/jsx-runtime.md](../../../../docs/jsx-runtime.md).
 *
 * Each extension point has a single, well-defined responsibility. None
 * are mandatory, the runtime ships a default implementation for the
 * control-instance case for every one. Plugins layer on top by passing
 * fresh instances into `withScope` (see [scope.ts](./scope.ts)).
 *
 *  - `Renderer`        , what `jsx()` *produces* from `(type, settings)`.
 *  - `IntrinsicHandler`, *pre-construction* attribute pre-processing.
 *  - `PropertyApplier` , *post-construction* property semantics.
 *  - `ChildrenProcessor`, structural-directive (`<For>`/`<If>`) extension.
 *  - `Scope`            , explicit, stack-saved context (in `scope.ts`).
 *
 * Each extension point is intentionally *sealed* against the others:
 * an `IntrinsicHandler` cannot, for example, mutate the scope mid-flight,
 * and a `Renderer` does not learn about appliers. That sealing is what
 * lets a plugin author reason locally about their hook without holding
 * the whole runtime in their head. The "smallness ceiling" invariant
 * applied to the SPI surface as well as to the core implementation.
 *
 * @namespace ui5.community.jsx.runtime.jsx-runtime
 */

/**
 * Subset of `ManagedObjectMetadata` we use here. Declared structurally so
 * we don't import the runtime metadata class just for its type.
 */
export type ControlMetadata = {
	getDefaultAggregationName(): string | undefined;
	hasEvent(name: string): boolean;
	hasProperty(name: string): boolean;
	/**
	 * Returns true if the control declares a public aggregation of this
	 * name. Used by the runtime to confirm a default-aggregation prop that
	 * arrived as a *string* binding (`items="{/x}"`) really is an
	 * aggregation before normalizing it into a binding info (so the JSX
	 * child can become the row `template`). Backed by
	 * `ManagedObjectMetadata.hasAggregation`.
	 */
	hasAggregation(name: string): boolean;
	/**
	 * Returns the aggregation descriptor for `name`, or `undefined` when no
	 * such aggregation is declared. The returned object's public `forwarding`
	 * field is set when the aggregation is forwarded to an internal child
	 * control (e.g. `sap.m.Menu#items` → its `-menuWrapper`). The runtime
	 * uses this to detect a forwarded *default* aggregation and defer its
	 * concrete children to a post-construction `addAggregation` call, since
	 * the forwarding target isn't resolvable during the single-shot
	 * `new type(settings)`. Backed by `ManagedObjectMetadata.getAggregation`.
	 */
	getAggregation(name: string): { forwarding?: unknown } | undefined;
	/**
	 * Returns the property descriptor (containing `type: string`, the UI5
	 * type name like `"int"`, `"boolean"`, `"sap.m.ButtonType"`) or
	 * `undefined` when the property doesn't exist on this control.
	 *
	 * Used by the runtime's `propertyTypeIntrinsic` to coerce literal
	 * values via `DataType.getType(...).parseValue(...)` and to produce
	 * JSX-site error messages that name the expected type.
	 */
	getProperty(name: string): { type: string } | undefined;
	/** Fully-qualified class name, e.g. `"sap.m.Button"`. Used in error
	 *  messages so the JSX site is identifiable. */
	getName(): string;
};

/** Constructor signature shared by every UI5 control class. */
export type ControlClass<T extends ManagedObject = ManagedObject> = (new (settings?: object) => T) & {
	getMetadata(): ControlMetadata;
};

// --- Renderer --------------------------------------------------------------

/**
 * `Renderer`, turn a `(controlClass, settings)` pair into "something".
 *
 * The default control-instance renderer returns `new controlClass(settings)`.
 * An XML output adapter would build an XML string; a `RenderManager`
 * adapter would emit `rm.openStart/.attr/.openEnd/.close` calls.
 *
 * Each variant lives in its own *package* (the roadmap's Layer 2 in §2),
 * imports nothing from `sap.m`/`sap.fe`, and is opt-in via `withScope`.
 * Apps that don't import an alternative renderer pay zero bytes for it.
 */
export interface Renderer {
	/** Construct (or render) `type` with the resolved `settings`. */
	construct<T extends ManagedObject>(
		type: ControlClass<T>,
		settings: Record<string, unknown>
	): T;
}

// --- IntrinsicHandler ------------------------------------------------------

/**
 * Hook that fires *before* the control is constructed. It receives the
 * raw `(propName, value)` from JSX and the in-progress `settings` object,
 * and decides what to do:
 *
 *  - return `undefined` to drop the prop from settings entirely
 *    (sufficient for FE-style `dt:`/`fl:`/`customData:` attributes
 *    that side-effect a separate registry);
 *  - return any other value to use it as the settings value
 *    (typical for transformations like `binding="{/Foo}"` →
 *    `{ path: "/Foo" }`);
 *  - register a `post` callback to run after the control is built
 *    (used by the core's `class` handler, which calls
 *    `instance.addStyleClass(...)`).
 *
 * The `post` parameter is the same callback the runtime exposes to
 * `PropertyApplier`s, the boundary between the two extension points
 * is not the *what* (both can mutate post-construction state) but
 * the *when* (intrinsics see the raw prop value first; appliers see
 * the resolved settings entry).
 */
export interface IntrinsicHandler {
	/** Return `true` if this handler claims `propName`. First match wins. */
	matches(propName: string, ctx: IntrinsicMatchContext): boolean;

	/**
	 * Transform `value` and/or schedule a post-construction side effect.
	 *
	 * `metadata` is the target control's metadata, handlers that need to
	 * resolve the property's `DataType` (e.g. the core
	 * `propertyTypeIntrinsic`) or name the control class in an error
	 * message read it here. Existing implementations can ignore the
	 * parameter; it is strictly additive.
	 */
	apply(
		propName: string,
		value: unknown,
		settings: Record<string, unknown>,
		post: PostConstructHook,
		metadata: ControlMetadata
	): unknown;
}

/**
 * Information passed to `IntrinsicHandler.matches` so the matcher can
 * make decisions that depend on the target control's metadata. The
 * dot-handler intrinsic, for example, only claims a string starting
 * with `"."` *if* the target metadata declares it as an event.
 */
export interface IntrinsicMatchContext {
	value: unknown;
	metadata: ControlMetadata;
}

/**
 * `(instance) => void` callback registered by an intrinsic to run
 * *after* the control is constructed. Used by `class` →
 * `addStyleClass`, by `ref={...}` → `cb(instance)`, and (in plugin
 * land) by command intrinsics that need to wire dependencies post-hoc.
 */
export type PostConstructHook = (cb: (instance: ManagedObject) => void) => void;

// --- PropertyApplier -------------------------------------------------------

/**
 * `PropertyApplier`, late or special property semantics.
 *
 * The core's default applier is identity (`settings[propName] = value`,
 * let UI5 do the rest). Plugins use this hook when a prop value
 * fundamentally overloads settings semantics. Promise-valued props
 * (the FE adapter's FR-LATE-01) being the canonical example.
 *
 * Distinguishing this from `IntrinsicHandler`: appliers run *after*
 * the intrinsic pass and operate on the resolved settings entry.
 * They are the right hook for "this value needs to wait for `await`
 * before going onto the instance"; intrinsics are the right hook for
 * "this attribute name is not a real UI5 setting at all and needs
 * translating before settings is built".
 */
export interface PropertyApplier {
	/** Return `true` if this applier wants to handle `(propName, value)`. */
	matches(propName: string, value: unknown): boolean;

	/** Apply the property. May call `setProperty` later (e.g. for promises). */
	apply(
		instance: ManagedObject,
		propName: string,
		value: unknown
	): void;
}

// --- ChildrenProcessor -----------------------------------------------------

/**
 * `ChildrenProcessor`, structural-directive extension point.
 *
 * `<Fragment>`, `<For>`, and `<If>` are all implemented as core
 * `ChildrenProcessor`s registered into the default scope. Plugins
 * register additional sentinels the same way: the `<Switch>` sample
 * plugin, a `<Lazy>` plugin, a typed `<For each, key, fallback>`, etc.
 *
 * The processor decides whether each child is its sentinel, and if so:
 *
 *  - either *installs settings on the parent* (`<For>`-style aggregation
 *    binding, where the directive becomes the parent's `items` binding
 *    info plus a row template),
 *  - or *transforms the child list itself* (`<If>`-style: bind each
 *    child's `visible` property to the condition and emit them
 *    in-place).
 *
 * The processor's `process` method calls `emit` for every child it
 * wants to keep in the parent's aggregation, OR mutates `settings`
 * and calls `emit` for nothing if the directive consumes the binding
 * slot entirely.
 */
export interface ChildrenProcessor {
	/** Match a sentinel child by identity / shape. */
	matches(child: unknown): boolean;

	/** Either install settings on the parent (For-style) or transform
	 *  the child list (If/Switch-style). */
	process(
		child: unknown,
		settings: Record<string, unknown>,
		defaultAggregation: string,
		emit: (child: unknown) => void
	): void;
}

// --- Built-in default Renderer ---------------------------------------------

/**
 * The core's default renderer. Constructs a regular UI5 control instance,
 * which is what 100 % of the views in this repository need.
 *
 * Lives in `plugin.ts` rather than `runtime.ts` so the SPI types and
 * the SPI default sit side-by-side. `runtime.ts`'s job is to *wire it
 * in* (by calling `_defaultScopeForRuntimeInit().renderer = ...`),
 * not to define what "default" means.
 */
export const defaultRenderer: Renderer = {
	construct<T extends ManagedObject>(type: ControlClass<T>, settings: Record<string, unknown>): T {
		return new type(settings);
	}
};
