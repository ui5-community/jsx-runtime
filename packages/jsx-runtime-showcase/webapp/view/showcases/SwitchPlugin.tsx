import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Button from "sap/m/Button";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import JSONModel from "sap/ui/model/json/JSONModel";
import { withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { Switch, Case, Default, switchProcessor } from "ui5/community/jsx/runtime/plugins/switch/index";

/**
 * # Chapter 12. Plugin `<Switch>`
 *
 * A **plugin**, a `ChildrenProcessor` that adds new structural
 * directives without modifying the core runtime. The plugin ships as
 * a separate module (`ui5.community.jsx.runtime.plugins.switch`);
 * this view opts in by wrapping the JSX construction in
 * `withScope({ childrenProcessors: [switchProcessor] }, () => …)`.
 * Outside that scope, `<Switch>` is just an unknown sentinel, the
 * runtime has no idea what it means.
 *
 * ## Two modes (mirroring `<If>` from Chapter 11)
 *
 *  - **Literal mode**, `on` is a plain string/number/boolean. The
 *    matching `<Case>`'s children are emitted at construction time;
 *    non-matching branches never appear in the rendered tree.
 *  - **Bound mode**, `on` is a binding info shape. Every branch is
 *    emitted; each child's `visible` is bound to a UI5 expression
 *    binding derived from the case's `when`. Pressing the buttons
 *    flips the model property; UI5's normal binding-driven
 *    visibility shows/hides the branches.
 *
 * ## Try this, break the scope on purpose
 *
 * Move the `<Switch>...</Switch>` block outside the `withScope` call.
 * The sentinel throws a clear error at JSX construction time, no
 * silent no-op.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
interface ViewState {
	kind: "info" | "warning" | "error";
}

export default class SwitchPlugin extends View {
	private readonly state: JSONModel = new JSONModel({
		kind: "info"
	} satisfies ViewState);

	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		this.setModel(this.state);

		return withScope({ childrenProcessors: [switchProcessor] }, () => (
			<VBox class="sapUiSmallMargin">
				<HBox class="sapUiSmallMarginBottom">
					<Button text="Info"    press={(): void => this.setKind("info")}    class="sapUiTinyMarginEnd" />
					<Button text="Warning" press={(): void => this.setKind("warning")} class="sapUiTinyMarginEnd" />
					<Button text="Error"   press={(): void => this.setKind("error")} />
				</HBox>

				<Title text="Bound <Switch on={{ path: '/kind' }}>" level="H4" />
				<Switch on={{ path: "/kind" }}>
					<Case when="info">    <Text text="ℹ️ Informational, current kind is 'info'." /> </Case>
					<Case when="warning"> <Text text="⚠️ Heads up, current kind is 'warning'." /> </Case>
					<Case when="error">   <Text text="🛑 Something went wrong, current kind is 'error'." /> </Case>
					<Default>             <Text text="(no branch matched)" /> </Default>
				</Switch>

				<Title text="Literal <Switch on='warning'>" level="H4" class="sapUiSmallMarginTop" />
				<Switch on="warning">
					<Case when="info">    <Text text="branch: info"    /> </Case>
					<Case when="warning"> <Text text="branch: warning" /> </Case>
					<Case when="error">   <Text text="branch: error"   /> </Case>
					<Default>             <Text text="branch: default" /> </Default>
				</Switch>
			</VBox>
		));
	}

	private setKind(kind: ViewState["kind"]): void {
		this.state.setProperty("/kind", kind);
	}
}
