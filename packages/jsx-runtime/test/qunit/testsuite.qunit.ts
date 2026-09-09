/**
 * QUnit test suite for `@ui5-community/jsx-runtime`.
 *
 * Serves as the entry point for `ui5-test-runner`. Every test module
 * listed under `tests` becomes an isolated page under
 * `Test.qunit.html?testsuite=...&test=<name>` so runs can be parallelised.
 */
export default {
	name: "QUnit test suite for ui5.community.jsx.runtime",
	defaults: {
		page: "ui5://test-resources/ui5/community/jsx/runtime/qunit/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: { version: 2 },
		sinon: { version: 4, qunitBridge: true },
		ui5: {
			libs: "sap.ui.core,ui5.community.jsx.runtime",
			theme: "sap_horizon",
			noConflict: true,
			preload: "auto"
		},
		loader: {
			paths: {
				"ui5/community/jsx/runtime": "../../../../../../resources/ui5/community/jsx/runtime",
			}
		},
		module: "./{name}.qunit"
	},
	tests: {
		"runtime/jsx": { title: "runtime: jsx / jsxs" },
		"runtime/fragment": { title: "runtime: <Fragment> + flatten" },
		"runtime/for": { title: "runtime: <For>" },
		"runtime/if": { title: "runtime: <If>" },
		"runtime/scope": { title: "runtime: withScope + Scope stack" },
		"runtime/intrinsics": { title: "runtime: built-in IntrinsicHandlers" },
		"runtime/property-appliers": { title: "runtime: PropertyApplier ordering" },
		"runtime/auto-prefix-id": { title: "runtime: auto id prefix bridge" },
		"runtime/string-aggregation-binding": { title: "runtime: string aggregation binding + template" },
		"runtime/forwarded-aggregation": { title: "runtime: forwarded default aggregation (Menu#items)" },
		"runtime/view-error-logging": { title: "runtime: view createContent() errors logged via Log.error" },
		"plugins/switch": { title: "plugins: <Switch> / <Case> / <Default>" }
	}
};
