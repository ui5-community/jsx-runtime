import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Label from "sap/m/Label";
import Text from "sap/m/Text";

/**
 * # Chapter 8. JSX fragments `<>…</>`
 *
 * `<>...</>` groups siblings without a wrapper control. The runtime's
 * `flattenChildren` helper inlines fragment children into the parent's
 * aggregation; falsy entries (`null`, `undefined`, `false`, `""`) are
 * filtered so `{flag && <X/>}` works without crashing UI5's
 * aggregation validation.
 *
 * Fragments solve the JSX "single root" rule: a function that wants
 * to return multiple sibling controls no longer needs a wrapper
 * VBox/HBox/FlexBox to satisfy the type checker.
 *
 * ## Two senses of "fragment" in UI5. NOT the same thing
 *
 *  - **JSX fragment** (this chapter): `<>...</>`. A syntactic device
 *    for grouping siblings. No control behind it, no controller, no
 *    id namespace.
 *  - **UI5 fragment** (Chapter 10, `*.fragment.tsx`): a reusable
 *    chunk of UI without its own controller, the TSX equivalent of
 *    `*.fragment.xml`.
 *
 * The two share a name and nothing else.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class Fragments extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		const showExtra = false;

		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="A VBox with 4 children, but two of them come from a fragment inlined below, and one is falsy (dropped)."
					class="sapUiSmallMarginBottom"
				/>

				<>
					<Label text="Name" design="Bold" />
					<Text text="Ada Lovelace" />
				</>

				{/* Falsy children, silently dropped. */}
				{showExtra && <Text text="You won't see me." />}

				{/* Fragments nest and flatten recursively, this HBox
				    ends up with two Label children as peers. */}
				<HBox class="sapUiSmallMarginTop">
					<>
						<Label text="Inline fragment:" design="Bold" />
						<Label text="works inside HBox.items too" />
					</>
				</HBox>
			</VBox>
		);
	}
}
