/**
 * QUnit tests for the Scope stack + withScope.
 *
 * Scope is the plugin registration mechanism, every extension point
 * (renderers, intrinsics, appliers, processors) is looked up through
 * the topmost scope. Tests here exercise the push/pop, merge, and
 * restore-on-exception behaviours.
 */
import {
	withScope,
	currentScope,
	currentIntrinsics,
	currentChildrenProcessors,
	currentPropertyAppliers,
	type IntrinsicHandler,
	type ChildrenProcessor,
	type PropertyApplier
} from "ui5/community/jsx/runtime/jsx-runtime";

QUnit.module("runtime/scope");

QUnit.test("withScope pushes and pops synchronously", (assert) => {
	const before = currentScope();
	const marker = {};
	withScope({ testMarker: marker as unknown } as never, () => {
		assert.strictEqual((currentScope() as never as { testMarker: unknown }).testMarker, marker, "marker visible inside");
	});
	assert.strictEqual((currentScope() as never as { testMarker?: unknown }).testMarker, undefined, "marker gone after");
	assert.strictEqual(currentScope() === before, true, "same scope frame restored");
});

QUnit.test("withScope restores on exception", (assert) => {
	const outer = currentIntrinsics().length;
	const bogus: IntrinsicHandler = { matches: () => false, apply: (_p: string, v: unknown) => v };
	assert.throws(() => {
		withScope({ intrinsics: [bogus] }, () => {
			assert.strictEqual(currentIntrinsics().length, outer + 1, "new intrinsic visible inside");
			throw new Error("boom");
		});
	}, /boom/, "exception propagates");
	assert.strictEqual(currentIntrinsics().length, outer, "scope popped after exception");
});

QUnit.test("withScope merges list slots (caller-first)", (assert) => {
	const marker: IntrinsicHandler = {
		matches: () => false,
		apply: (_p: string, v: unknown) => v
	};
	const outerLen = currentIntrinsics().length;
	withScope({ intrinsics: [marker] }, () => {
		const list = currentIntrinsics();
		assert.strictEqual(list.length, outerLen + 1, "list concatenated");
		assert.strictEqual(list[0], marker, "caller's handler comes first (outranks core)");
	});
});

QUnit.test("nested withScope stacks correctly", (assert) => {
	const a: ChildrenProcessor = { matches: () => false, process: (): void => undefined };
	const b: ChildrenProcessor = { matches: () => false, process: (): void => undefined };
	const baseLen = currentChildrenProcessors().length;
	withScope({ childrenProcessors: [a] }, () => {
		assert.strictEqual(currentChildrenProcessors().length, baseLen + 1);
		withScope({ childrenProcessors: [b] }, () => {
			const list = currentChildrenProcessors();
			assert.strictEqual(list.length, baseLen + 2, "both scopes merged");
			assert.strictEqual(list[0], b, "innermost scope entry outranks");
			assert.strictEqual(list[1], a, "next outer entry follows");
		});
	});
	assert.strictEqual(currentChildrenProcessors().length, baseLen, "all popped");
});

QUnit.test("propertyAppliers slot also list-merges", (assert) => {
	const a: PropertyApplier = { matches: () => false, apply: (): void => undefined };
	const baseLen = currentPropertyAppliers().length;
	withScope({ propertyAppliers: [a] }, () => {
		assert.strictEqual(currentPropertyAppliers().length, baseLen + 1);
		assert.strictEqual(currentPropertyAppliers()[0], a);
	});
	assert.strictEqual(currentPropertyAppliers().length, baseLen);
});
