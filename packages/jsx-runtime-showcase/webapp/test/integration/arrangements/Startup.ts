import Opa5 from "sap/ui/test/Opa5";
import HashChanger from "sap/ui/core/routing/HashChanger";

/**
 * OPA5 arrangements: boot the Component container so tests interact
 * with a real running app.
 *
 * `iStartMyApp` starts on the empty hash (welcome). Deep-link tests
 * call `iNavigateToHash(hash)` *after* startup rather than passing a
 * startup hash: the `LearnDoc` / `ExploreSample` views attach their
 * `patternMatched` listener in `onAfterRendering`, so a route matched
 * during component startup (before the view exists) is missed and the
 * view never renders its target doc. Changing the hash after the app
 * is up fires the route with the listener already attached.
 */
export default class Startup extends Opa5 {
	public iStartMyApp(hash?: string): void {
		this.iStartMyUIComponent({
			componentConfig: {
				name: "ui5.community.jsx.showcase",
				async: true,
				manifest: true
			},
			hash: hash ?? ""
		});
	}

	public iNavigateToHash(hash: string): void {
		this.waitFor({
			success: function () {
				HashChanger.getInstance().setHash(hash);
			}
		});
	}
}
