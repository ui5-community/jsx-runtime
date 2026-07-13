import Opa5 from "sap/ui/test/Opa5";
import opaTest from "sap/ui/test/opaQunit";

/**
 * Landing (Welcome) journey.
 *
 * The app boots on the empty hash → `welcome` route, which mounts the
 * `WelcomeBody` view inside the shared shell. The brand title
 * ("JSX Runtime for UI5") lives in the `AppHeader` factory that the
 * shell renders on every route, so we assert against that `sap.m.Title`
 * without pinning a view name (the header isn't a named view).
 */
Opa5.createPageObjects({
	onTheLandingPage: {
		assertions: {
			iSeeTheBrandTitle(this: Opa5): unknown {
				return this.waitFor({
					controlType: "sap.m.Title",
					matchers: ((title: { getText(): string }) => title.getText() === "JSX Runtime for UI5") as never,
					success: () => Opa5.assert.ok(true, "brand title 'JSX Runtime for UI5' rendered")
				});
			}
		}
	}
});

QUnit.module("Landing journey");

opaTest("Landing (welcome route) renders with the brand title", (Given: never, When: never, Then: never) => {
	const g = Given as unknown as { iStartMyApp: (hash?: string) => void };
	const t = Then as unknown as {
		onTheLandingPage: { iSeeTheBrandTitle: () => void };
		iTeardownMyApp: () => void;
	};
	g.iStartMyApp("");
	t.onTheLandingPage.iSeeTheBrandTitle();
	t.iTeardownMyApp();
});
