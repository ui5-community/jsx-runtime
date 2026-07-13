import Opa5 from "sap/ui/test/Opa5";
import opaTest from "sap/ui/test/opaQunit";

/**
 * Explore navigation journey.
 *
 * Starts on welcome, then navigates to the `exploreSample` route with
 * the `hello-jsx` sample (`explore/hello-jsx`). `ExploreSample` sets its
 * header `sap.m.Title` synchronously from the sample REGISTRY (here
 * "Hello, JSX"), so — unlike the LearnDoc doc body, which is fetched
 * relative to `document.baseURI` and 404s under the OPA test-runner
 * page — this title is reliably assertable and proves the route
 * resolved and the view mounted with its sample metadata.
 */
Opa5.createPageObjects({
	onTheExplorePage: {
		assertions: {
			iSeeTheSampleTitle(this: Opa5, expected: string): unknown {
				return this.waitFor({
					controlType: "sap.m.Title",
					autoWait: false,
					matchers: ((title: { getText(): string }) =>
						title.getText() === expected) as never,
					success: () => Opa5.assert.ok(true, `Explore sample title '${expected}' rendered`)
				});
			}
		}
	}
});

QUnit.module("Explore journey");

opaTest("Navigating to explore/hello-jsx mounts the sample with its title", (Given: never, When: never, Then: never) => {
	const g = Given as unknown as { iStartMyApp: (hash?: string) => void; iNavigateToHash: (hash: string) => void };
	const t = Then as unknown as {
		onTheExplorePage: { iSeeTheSampleTitle: (expected: string) => void };
		iTeardownMyApp: () => void;
	};
	g.iStartMyApp("");
	g.iNavigateToHash("explore/hello-jsx");
	t.onTheExplorePage.iSeeTheSampleTitle("Hello, JSX");
	t.iTeardownMyApp();
});
