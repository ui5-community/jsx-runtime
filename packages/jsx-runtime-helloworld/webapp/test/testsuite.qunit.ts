import type {SuiteConfiguration} from "sap/ui/test/starter/config";
export default {
	name: "QUnit test suite for the UI5 Application: ui5.community.jsx.helloworld",
	defaults: {
		page: "ui5://test-resources/ui5/community/jsx/helloworld/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: {
			version: 2
		},
		sinon: {
			version: 4
		},
		ui5: {
			language: "EN",
			theme: "sap_horizon"
		},
		coverage: {
			only: ["ui5/community/jsx/helloworld/"],
			never: ["test-resources/ui5/community/jsx/helloworld/"]
		},
		loader: {
			paths: {
				"ui5/community/jsx/helloworld": "../"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "Unit tests for ui5.community.jsx.helloworld"
		},
		"integration/opaTests": {
			title: "Integration tests for ui5.community.jsx.helloworld"
		}
	}
} satisfies SuiteConfiguration;