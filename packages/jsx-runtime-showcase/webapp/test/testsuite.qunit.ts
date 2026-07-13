/**
 * Test suite entry for the showcase app.
 *
 * Runs OPA5 integration journeys that exercise the concept views
 * end-to-end (route, model, JSX-produced UI, event handling).
 */
export default {
	name: "QUnit test suite for @ui5-community/jsx-runtime-showcase",
	defaults: {
		page: "ui5://test-resources/ui5/community/jsx/showcase/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: { version: 2 },
		sinon: { version: 4, qunitBridge: true },
		ui5: {
			theme: "sap_horizon",
			language: "EN",
			noConflict: true,
			preload: "auto"
		},
		coverage: {
			only: "ui5/community/jsx/showcase/",
			never: "test-resources/ui5/community/jsx/showcase/"
		},
		loader: {
			paths: {
				"ui5/community/jsx/showcase": "../"
			}
		},
		module: "./{name}.qunit"
	},
	tests: {
		"integration/opaTests": { title: "OPA5 journeys" }
	}
};
