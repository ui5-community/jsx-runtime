import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import Page from "sap/m/Page";
import IllustratedMessage from "sap/m/IllustratedMessage";
import Button from "sap/m/Button";
import IllustratedMessageType from "sap/m/IllustratedMessageType";

import formatter from "../model/formatter";

/**
 * Main view (converted from `Main.view.xml`).
 *
 * `Page` › `IllustratedMessage` with a `Button` in its
 * `additionalContent` aggregation. Bindings and the event handler are
 * unchanged from the XML:
 *
 *  - `title` / `description` bind the i18n model (`{i18n>…}`).
 *  - the button `text` uses the same formatter the XML referenced via
 *    `core:require`; here it's a normal import + a binding-info object
 *    (`{ path, formatter }`).
 *  - `press=".sayHello"` resolves against the paired `Main.controller.ts`
 *    (loaded via `getControllerModuleName()`), same dot-handler the XML
 *    used.
 *
 * `additionalContent` is a *named* aggregation, so it's a prop; the
 * `Page` content is the default aggregation, so the `IllustratedMessage`
 * is a JSX child.
 *
 * @namespace ui5.community.jsx.helloworld.view
 */
export default class MainView extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	getControllerModuleName(): string {
		return "ui5/community/jsx/helloworld/controller/Main";
	}

	createContent(): Control {
		return (
			<Page id="page" title="{i18n>appTitle}">
				<IllustratedMessage
					title="{i18n>appTitle}"
					description="{i18n>appDescription}"
					illustrationType={IllustratedMessageType.SuccessHighFive}
					enableVerticalResponsiveness={true}
					additionalContent={
						<Button
							id="helloButton"
							text={{ path: "i18n>btnText", formatter: formatter.formatValue }}
							press=".sayHello"
						/>
					}
				/>
			</Page>
		);
	}
}
