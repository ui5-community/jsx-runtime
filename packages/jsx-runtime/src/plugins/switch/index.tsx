import {
	defineSentinel,
	isSentinelNode,
	type ChildrenProcessor
} from "../../runtime/runtime";

/**
 * Sample plugin: `<Switch>` / `<Case>` / `<Default>` directives.
 *
 * A non-trivial `ChildrenProcessor` used to validate the plugin SPI on a
 * non-FE example. See [docs/jsx-runtime.md](../../../../../docs/jsx-runtime.md)
 * for the concept overview and [README.md](./README.md) for the plugin's
 * own documentation. The contract under test:
 *
 *   - Sentinels are declared via `defineSentinel(name)` and reach the
 *     parent `jsx()` call as `SentinelNode`s with a brand the runtime
 *     recognises generically.
 *   - The plugin hands its `ChildrenProcessor` to the consumer through
 *     `withScope({ childrenProcessors: [switchProcessor] }, fn)`.
 *   - The plugin imports nothing from `sap.m` / `sap.f` / `sap.tnt` and
 *     nothing from the core runtime beyond the SPI types.
 *
 * Apps opt in by wrapping the JSX construction:
 *
 *   ```tsx
 *   import { Switch, Case, Default, switchProcessor } from "ui5/community/jsx/runtime/plugins/switch";
 *   import { withScope } from "ui5/community/jsx/runtime";
 *
 *   createContent() {
 *     return withScope({ childrenProcessors: [switchProcessor] }, () => (
 *       <VBox>
 *         <Switch on={kind}>
 *           <Case when="info">    <Title text="Info"    /> </Case>
 *           <Case when="warning"> <Title text="Warning" /> </Case>
 *           <Default>             <Title text=""       /> </Default>
 *         </Switch>
 *       </VBox>
 *     ));
 *   }
 *   ```
 *
 * Outside that scope, `<Switch>` raises a clear error from the sentinel's
 * call body, the active scope simply has no processor that claims it.
 *
 * ## Semantics
 *
 * Two modes, picked by `Switch.on`:
 *
 *  - **Literal `on`** (string / number / boolean): pick the first
 *    `<Case when={...}>` whose `when` is `===`-equal to `on`. If none
 *    match, emit the `<Default>` children if a `<Default>` exists,
 *    otherwise emit nothing.
 *
 *  - **Bound `on`** (a value with a `path` field, a `BindingValue`,
 *    `{ path: "/kind" }`, or an OData ref): bind each branch's
 *    `visible` to a UI5 expression-binding `{= ${path} === '...' }`
 *    derived from the case's `when`. Default's `visible` becomes
 *    `{= ${path} !== '...' && ... }`. UI5's normal binding-driven
 *    visibility flips the branches as the model changes.
 *
 * Both modes preserve the core's library-agnostic stance: no `sap.m`
 * import, no wrapper layout, just `bindProperty("visible", ...)` on
 * the children directly (the same primitive `<If>` uses).
 *
 * @namespace ui5.community.jsx.runtime.plugins.switch
 */

import ManagedObject from "sap/ui/base/ManagedObject";

/** `<Switch on={kind}>...</Switch>`. The `on` value is matched
 *  literally (===) against each `<Case when={...}>`, or used as a
 *  binding-info path to drive expression bindings on the children's
 *  `visible` property in bound mode. */
export const Switch = defineSentinel<{
	on: unknown;
	children?: unknown;
}>("Switch");

/** `<Case when="info">...</Case>`. */
export const Case = defineSentinel<{
	when: string | number | boolean;
	children?: unknown;
}>("Case");

/** `<Default>...</Default>`, fallback branch. At most one per `<Switch>`. */
export const Default = defineSentinel<{
	children?: unknown;
}>("Default");

/**
 * The processor registered into the scope. Recognises a `<Switch>`
 * sentinel node and unfolds its `<Case>`/`<Default>` children into
 * the parent's aggregation.
 */
export const switchProcessor: ChildrenProcessor = {
	matches(child) {
		return isSentinelNode(child) && child.tag === Switch;
	},
	process(child, _settings, _defaultAggregation, emit) {
		if (!isSentinelNode(child)) return;
		const onValue = child.props.on;
		const branches = collectBranches(child.props.children);

		if (isBindingLike(onValue)) {
			emitBound(onValue as { path: string; model?: string }, branches, emit);
		} else {
			emitLiteral(onValue, branches, emit);
		}
	}
};

// --- Implementation --------------------------------------------------------

interface CaseBranch {
	when: unknown;
	children: unknown;
}

interface DefaultBranch {
	children: unknown;
}

interface Branches {
	cases: CaseBranch[];
	fallback: DefaultBranch | undefined;
}

/**
 * Walk the `<Switch>`'s direct children and partition them into Case /
 * Default lists. Anything that isn't one of those is a structural
 * mistake, we throw with a clear message rather than silently
 * dropping it, mirroring the `<If>`-on-pinned-visible rule from the
 * core runtime.
 */
function collectBranches(children: unknown): Branches {
	const list = Array.isArray(children) ? (children as unknown[]) : [children];
	const cases: CaseBranch[] = [];
	let fallback: DefaultBranch | undefined;
	for (const node of list) {
		if (node === null || node === undefined || node === false || node === "") {
			continue;
		}
		if (!isSentinelNode(node)) {
			throw new Error(
				"<Switch> children must be <Case>/<Default> sentinels; got " +
				JSON.stringify(node)
			);
		}
		if (node.tag === Case) {
			cases.push({ when: node.props.when, children: node.props.children });
			continue;
		}
		if (node.tag === Default) {
			if (fallback) {
				throw new Error("<Switch> may contain at most one <Default>.");
			}
			fallback = { children: node.props.children };
			continue;
		}
		throw new Error(
			`<Switch> children must be <Case>/<Default>; got <${(node.tag as { displayName?: string }).displayName ?? "?"}>.`
		);
	}
	return { cases, fallback };
}

function isBindingLike(value: unknown): boolean {
	return (
		typeof value === "object" &&
		value !== null &&
		"path" in (value as Record<string, unknown>)
	);
}

/**
 * Literal mode: pick the first matching case at construction time.
 * Falls back to `<Default>` when no case matches; emits nothing if
 * neither match nor fallback are present.
 */
function emitLiteral(on: unknown, branches: Branches, emit: (child: unknown) => void): void {
	for (const c of branches.cases) {
		if (c.when === on) {
			emitChildren(c.children, emit);
			return;
		}
	}
	if (branches.fallback) {
		emitChildren(branches.fallback.children, emit);
	}
}

/**
 * Bound mode: every branch's children are emitted with a `visible`
 * expression binding derived from the case's `when`. UI5's standard
 * binding-driven visibility toggles the branches.
 *
 * The expression-binding form `{= ${path} === '...' }` requires a
 * literal `when`. We refuse non-primitive `when` values, quoting
 * arbitrary objects in an expression binding is a footgun
 * (precedence, undefined coercion, JSON escapes). Combine the cases
 * differently if you need that.
 */
function emitBound(
	on: { path: string; model?: string },
	branches: Branches,
	emit: (child: unknown) => void
): void {
	const baseRef = formatPathRef(on);
	const visited: string[] = [];

	for (const c of branches.cases) {
		const literal = quoteLiteral(c.when);
		const expr = `{= ${baseRef} === ${literal} }`;
		visited.push(literal);
		emitWithVisible(c.children, expr, emit);
	}

	if (branches.fallback) {
		const expr = visited.length > 0
			? `{= ${visited.map((v) => `${baseRef} !== ${v}`).join(" && ")} }`
			: "true";
		emitWithVisible(branches.fallback.children, expr, emit);
	}
}

/**
 * Render `path: "/kind", model: "vm"` as `${vm>/kind}` (or `${/kind}`
 * when no model is set). The expression-binding parser uses
 * `${...}` to interpolate model values; the leading `>` marks a
 * named-model lookup.
 */
function formatPathRef(on: { path: string; model?: string }): string {
	if (on.model && on.model.length > 0) {
		return `\${${on.model}>${on.path}}`;
	}
	return `\${${on.path}}`;
}

/**
 * Quote a primitive `when` for embedding in an expression binding.
 * Strings get single-quoted with `'` inside escaped to `\\'`; numbers
 * and booleans pass through.
 */
function quoteLiteral(value: unknown): string {
	if (typeof value === "string") {
		return `'${value.replace(/'/g, "\\'")}'`;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	throw new Error(
		`<Case when={...}> requires a string / number / boolean literal in bound mode; got ${typeof value}.`
	);
}

/**
 * Bind `visibleExpr` onto every emitted child. Copies the expression
 * once per child (UI5's binding installer mutates the BindingInfo),
 * same precaution as the core `<If>` processor.
 */
function emitWithVisible(children: unknown, visibleExpr: string, emit: (child: unknown) => void): void {
	const list = flatten(children);
	for (const node of list) {
		if (node instanceof ManagedObject && node.getMetadata().hasProperty("visible")) {
			if (
				node.getBindingInfo("visible") !== undefined ||
				(node as ManagedObject & { getVisible?: () => boolean }).getVisible?.() === false
			) {
				throw new Error(
					"<Case>/<Default> cannot wrap a child that already controls its own `visible`. " +
					"Combine the conditions in your own expression binding."
				);
			}
			// `applySettings`, not `bindProperty`. The expression-binding form
			// `{= ${/kind} === 'info' }` requires UI5's binding-info extraction
			// (it has to parse `{= ... }` as an expression and produce a
			// `parts: [...]` + `formatter` BindingInfo). `bindProperty(name,
			// rawString)` skips that extraction and treats the whole string
			// as a single binding *path*, so the expression never evaluates
			// and `visible` ends up `true` for every branch. `applySettings`
			// runs the same extraction the regular settings parser uses.
			//
			// The cast through `Record<string, unknown>` is because
			// `applySettings` is typed against `$ManagedObjectSettings`
			// which doesn't include control-specific props like `visible`.
			// Every Control subclass *does* declare `visible`, so the
			// runtime accepts it.
			(node.applySettings as (s: Record<string, unknown>) => unknown)({ visible: visibleExpr });
		}
		emit(node);
	}
}

function emitChildren(children: unknown, emit: (child: unknown) => void): void {
	for (const node of flatten(children)) {
		emit(node);
	}
}

/**
 * Local flatten: drops falsy entries and unwraps arrays. We can't reach
 * the runtime's `flattenChildren` from here, it's intentionally
 * file-private, but the structural-directive contract guarantees
 * `<Case>` / `<Default>` only carry literal control children, so a
 * one-level walk is enough.
 */
function flatten(children: unknown): unknown[] {
	const out: unknown[] = [];
	const stack: unknown[] = Array.isArray(children) ? [...(children as unknown[])] : [children];
	while (stack.length > 0) {
		const node = stack.shift();
		if (node === null || node === undefined || node === false || node === "") {
			continue;
		}
		// Whitespace-only string children come from JSX source-level
		// indentation/newlines around child elements (e.g. `<Case>
		// <Text/> </Case>` produces `["  ", <Text/>, " "]` after
		// Babel's transform). They aren't real children, skip them.
		if (typeof node === "string" && node.trim() === "") {
			continue;
		}
		if (Array.isArray(node)) {
			stack.unshift(...(node as unknown[]));
			continue;
		}
		out.push(node);
	}
	return out;
}
