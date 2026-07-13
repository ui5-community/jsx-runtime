import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";

/**
 * # Chapter 9. Fragment as helper function
 *
 * A regular function that returns a JSX fragment. Composed at the
 * value level, call it with `{field(...)}`, never with `<field/>`.
 * The surrounding `jsx()` call's `flattenChildren` recognises the
 * returned `FragmentNode` and inlines the label + text pair directly
 * into the parent aggregation.
 *
 * ## Why not `<Field/>` against the function?
 *
 * React lets you write `<Field/>` against a plain function. The UI5
 * JSX runtime explicitly does **not**: `<X/>` is always
 * `new X(settings)`. To compose pieces, inline a fragment directly
 * or call a helper that returns one:
 *
 *   ```tsx
 *   {field("Name", "Ada Lovelace")}
 *   ```
 *
 * The helper is a regular function call producing a fragment; no
 * wrapper control, no per-row constructor.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */

/**
 * Build a label / value row as a fragment. Returns two sibling
 * controls with no wrapper, the surrounding VBox's `flattenChildren`
 * inlines them.
 */
function field(label: string, value: string): Control {
	return (
		<>
			<Label text={label} design="Bold" />
			<Text text={value} />
		</>
	);
}

export default class FragmentFn extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="Each field(...) call returns a Label+Text fragment. The VBox ends up with six children at the top level, fragments never appear in the rendered tree."
					class="sapUiSmallMarginBottom"
				/>
				{field("Name", "Ada Lovelace")}
				{field("Role", "Mathematician")}
				{field("Born", "1815")}
			</VBox>
		);
	}
}
