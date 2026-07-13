import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import VBox from "sap/m/VBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Input from "sap/m/Input";
import Button from "sap/m/Button";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * # Chapter 16. Internationalization via `{i18n>…}`
 *
 * UI5's `ResourceModel` is already wired into the app at
 * `manifest.json` → `sap.ui5.models.i18n`. The `i18n` name is a
 * conventional prefix that any UI5 view or fragment can read via
 * `{i18n>key}` bindings.
 *
 * Nothing in the JSX runtime special-cases i18n. The same binding
 * strings you'd write in an XMLView work verbatim in TSX because the
 * runtime hands the string to UI5 unchanged.
 *
 * ## Three patterns exercised
 *
 *  - **Static key.** `text="{i18n>sampleI18nHeading}"`, the simplest
 *    form. UI5 resolves it against the currently active locale.
 *  - **Parameterized message.** The bundle key
 *    `sampleI18nGreetingNamed=Hello, {0}!` is looked up imperatively
 *    with `getText(key, [args])` and pushed into a JSONModel; the
 *    view then binds `text="{form>/greeting}"` against that model.
 *  - **Placeholder binding.** `placeholder="{i18n>sampleI18nInputPlaceholder}"`,
 *    same idea, different prop.
 *
 * ## Why `getText(...)` and not `{i18n>sampleI18nGreetingNamed}`?
 *
 * String-form UI5 bindings don't parameterize. A key that carries
 * `{0}` placeholders needs the imperative
 * `ResourceBundle.getText(key, [value])` call to substitute values,
 * or a custom formatter attached via a binding-info object. This
 * sample shows the imperative form because it composes cleanly with
 * a JSONModel and keeps the view declarative.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class I18n extends View {
	private readonly _state: JSONModel = new JSONModel({
		name: "",
		greeting: ""
	});

	getAutoPrefixId(): boolean {
		return true;
	}

	getController(): Controller {
		// Sample-only convenience; real apps keep a separate
		// *.controller.ts (see the controller-as-file sample).
		return this as unknown as Controller;
	}

	createContent(): Control {
		this.setModel(this._state, "form");
		// Initialise the greeting once so something is visible before
		// the user types anything.
		this._refreshGreeting();

		return (
			<VBox class="sapUiSmallMargin">
				<Title text="{i18n>sampleI18nHeading}" level="H4" class="sapUiSmallMarginBottom" />
				<Text text="{i18n>sampleI18nIntro}" class="sapUiSmallMarginBottom" />

				<Input
					placeholder="{i18n>sampleI18nInputPlaceholder}"
					value="{form>/name}"
					liveChange={this._refreshGreeting.bind(this)}
					class="sapUiSmallMarginBottom"
				/>

				<Text text="{form>/greeting}" />

				<Button
					text="{i18n>sampleI18nGreetLabel}"
					press={this.onGreet.bind(this)}
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}

	private _refreshGreeting(): void {
		const bundle = this._getBundle();
		if (!bundle) {
			return;
		}
		const name = ((this._state.getProperty("/name") as string) ?? "").trim();
		const text = name === ""
			? bundle.getText("sampleI18nGreetingUnnamed") ?? ""
			: bundle.getText("sampleI18nGreetingNamed", [name]) ?? "";
		this._state.setProperty("/greeting", text);
	}

	onGreet(): void {
		const bundle = this._getBundle();
		const greeting = (this._state.getProperty("/greeting") as string) ?? "";
		if (bundle && greeting !== "") {
			MessageToast.show(greeting);
		}
	}

	private _getBundle(): ResourceBundle | undefined {
		const model = this.getModel("i18n") as ResourceModel | undefined;
		return model?.getResourceBundle() as ResourceBundle | undefined;
	}
}
