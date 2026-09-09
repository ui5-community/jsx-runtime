/**
 * QUnit regression tests: JSX view-construction errors are written to the
 * UI5 Log (not just propagated as a rejected Promise).
 *
 * `installViewScopeBridge` patches `View.prototype.createContent` so that
 * any thrown error — whether synchronous or from an async `createContent`
 * that returns a rejected Promise — is:
 *   1. Logged via `Log.error` with a message that includes the view id and
 *      the original error text.
 *   2. Re-thrown / re-rejected, so callers (e.g. `View.create`) still
 *      receive the rejection unchanged.
 *
 * The tests trigger the two error paths by registering tiny inline View
 * modules and loading them via `View.create`. `Log.error` is swapped out
 * for a recorder for the duration of each test. UI5's View lifecycle
 * produces a secondary unhandled rejection after the first one propagates;
 * we intercept it with a window-level `unhandledrejection` handler so
 * QUnit doesn't count it as a test failure.
 */
import View from "sap/ui/core/mvc/View";
import Log from "sap/base/Log";
import { installViewScopeBridge } from "ui5/community/jsx/runtime/runtime/installViewScopeBridge";

// Ensure the bridge patch is applied before the first test runs.
installViewScopeBridge();

/** Replace `Log.error` with a call recorder for one test. */
function stubLogError(): {
	calls: Array<[string, string, string]>;
	restore: () => void;
} {
	const calls: Array<[string, string, string]> = [];
	const original = Log.error.bind(Log);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(Log as any).error = (msg: string, detail: string, component: string) => {
		calls.push([msg, detail, component]);
	};
	return {
		calls,
		restore() {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(Log as any).error = original;
		}
	};
}

/** Suppress unhandled rejections for the duration of a callback. */
function withRejectionSuppression(fn: () => Promise<void>): Promise<void> {
	const handler = (e: PromiseRejectionEvent) => e.preventDefault();
	window.addEventListener("unhandledrejection", handler);
	return fn().finally(() => window.removeEventListener("unhandledrejection", handler));
}

QUnit.module("runtime/view-error-logging");

// ---------------------------------------------------------------------------
// Sync-throw variant
// ---------------------------------------------------------------------------

QUnit.test("sync throw in createContent() — Log.error called once, rejection preserved", (assert) => {
	const done = assert.async();
	return withRejectionSuppression(async () => {
		const stub = stubLogError();
		let caught: unknown;
		try {
			sap.ui.define(
				"test/view/ThrowingView",
				["sap/ui/core/mvc/View"],
				function (BaseView: typeof View) {
					return BaseView.extend("test.view.ThrowingView", {
						createContent() {
							throw new TypeError("deliberate sync error");
						}
					});
				}
			);

			try {
				await View.create({ viewName: "module:test/view/ThrowingView" });
			} catch (err) {
				caught = err;
			}

			assert.ok(caught != null, "View.create rejected on createContent() failure");
			assert.strictEqual(stub.calls.length, 1, "Log.error called exactly once");
			if (stub.calls.length >= 1) {
				const [msg, , component] = stub.calls[0];
				assert.ok(
					msg.includes("deliberate sync error"),
					`log message contains original error text: "${msg}"`
				);
				assert.strictEqual(component, "ui5.community.jsx.runtime", "component id correct");
			}
		} finally {
			stub.restore();
			done();
		}
	});
});

// ---------------------------------------------------------------------------
// Async-reject variant
// ---------------------------------------------------------------------------

QUnit.test("async rejected createContent() — Log.error called once, rejection preserved", (assert) => {
	const done = assert.async();
	return withRejectionSuppression(async () => {
		const stub = stubLogError();
		let caught: unknown;
		try {
			sap.ui.define(
				"test/view/AsyncThrowingView",
				["sap/ui/core/mvc/View"],
				function (BaseView: typeof View) {
					return BaseView.extend("test.view.AsyncThrowingView", {
						createContent() {
							return Promise.reject(new RangeError("deliberate async error"));
						}
					});
				}
			);

			try {
				await View.create({ viewName: "module:test/view/AsyncThrowingView" });
			} catch (err) {
				caught = err;
			}

			assert.ok(caught != null, "View.create rejected on async createContent() failure");
			assert.strictEqual(stub.calls.length, 1, "Log.error called exactly once");
			if (stub.calls.length >= 1) {
				const [msg, , component] = stub.calls[0];
				assert.ok(
					msg.includes("deliberate async error"),
					`log message contains original error text: "${msg}"`
				);
				assert.strictEqual(component, "ui5.community.jsx.runtime", "component id correct");
			}
		} finally {
			stub.restore();
			done();
		}
	});
});
