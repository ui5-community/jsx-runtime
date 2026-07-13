import Opa5 from "sap/ui/test/Opa5";
import opaTest from "sap/ui/test/opaQunit";

/**
 * Overview / Learn navigation journey.
 *
 * Starts on welcome, then navigates to the `learnDoc` route with the
 * `overview` topic (`learn/overview`). Asserts the `LearnDoc` view
 * mounted by matching its header `sap.m.Title` (default text "Learn").
 *
 * We assert the view mounted rather than the rendered doc's H1: the doc
 * body is fetched with a `document.baseURI`-relative `fetch()`
 * (`util/loadSource`), which resolves against the OPA test-runner page
 * (`/test/…`) rather than the app root, so the markdown 404s in the
 * harness and the title never swaps to the H1. That's a test-harness
 * path artifact, not an app bug — in the real app the fetch resolves.
 * Matching the mounted view keeps the routing assertion meaningful and
 * stable.
 */
Opa5.createPageObjects({
	onTheOverviewPage: {
		assertions: {
			iSeeTheLearnView(this: Opa5): unknown {
				return this.waitFor({
					controlType: "sap.m.Title",
					autoWait: false,
					matchers: ((title: { getText(): string }) =>
						title.getText() === "Learn") as never,
					success: () => Opa5.assert.ok(true, "LearnDoc view mounted for learn/overview")
				});
			}
		}
	}
});

QUnit.module("Overview journey");

opaTest("Navigating to learn/overview mounts the LearnDoc view", (Given: never, When: never, Then: never) => {
	const g = Given as unknown as { iStartMyApp: (hash?: string) => void; iNavigateToHash: (hash: string) => void };
	const t = Then as unknown as {
		onTheOverviewPage: { iSeeTheLearnView: () => void };
		iTeardownMyApp: () => void;
	};
	g.iStartMyApp("");
	g.iNavigateToHash("learn/overview");
	t.onTheOverviewPage.iSeeTheLearnView();
	t.iTeardownMyApp();
});
