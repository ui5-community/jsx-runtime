import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Button from "sap/m/Button";
import Input from "sap/m/Input";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import MessageStrip from "sap/m/MessageStrip";

/**
 * # Chapter 13. Property type coercion
 *
 * The runtime's core `propertyTypeIntrinsic` reads each control's
 * UI5 metadata for every literal prop and either:
 *
 *  1. **Coerces** `string`-typed JSX values to the property's
 *     declared `DataType`, so `<Input maxLength="10" />` becomes
 *     `maxLength={10}` before UI5's `applySettings` runs.
 *  2. **Throws a JSX-site error** when the value can't be coerced,
 *     e.g. `<Button type="Empahsized" />` (typo) produces a
 *     `TypeError` naming the *control class*, the *prop name*, and
 *     the *expected type* in its first line.
 *
 * The intrinsic carefully skips binding values (anything with `.path`
 * or a `"{…}"` string), functions, and properties declared `type: "any"`.
 *
 * ## Note on the casts
 *
 * The demos below use `as never` to deliberately bypass the
 * compile-time per-control prop typing from `@openui5/types` (that
 * typing is Chapter 2's story). The runtime intrinsic is the second
 * line of defence, catching the cases that slip past the type-checker:
 * JSON config, spread props, untyped fetches.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class TypeCoercion extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		// Simulate values arriving as strings from JSON config / untyped
		// fetches / spread props, the shapes that bypass the compile-time
		// type checker.
		const cfg = {
			maxLen: "10",         // declared `int` in $InputSettings
			disabled: "false"     // declared `boolean` in $ButtonSettings
			// badType: "Empahsized" // declared `sap.m.ButtonType` (uncomment for the error path)
		};

		return (
			<VBox class="sapUiSmallMargin">
				<MessageStrip
					text="Each row shows what propertyTypeIntrinsic does at the JSX boundary, coerce literals to their DataType, or throw a JSX-site error when the value can't be coerced."
					type="Information"
					showIcon={true}
					class="sapUiSmallMarginBottom"
				/>

				<Title text="Coercion, string → int" level="H4" />
				<HBox alignItems="Center" class="sapUiTinyMarginBottom">
					<Text text='maxLength = cfg.maxLen ("10") → 10' class="sapUiSmallMarginEnd" />
					<Input maxLength={cfg.maxLen as never} placeholder="Try typing >10 chars" />
				</HBox>

				<Title text="Coercion, string → boolean" level="H4" class="sapUiTinyMarginTop" />
				<HBox alignItems="Center" class="sapUiTinyMarginBottom">
					<Text text='enabled = cfg.disabled ("false") → false' class="sapUiSmallMarginEnd" />
					<Button text="Disabled by coerced boolean" enabled={cfg.disabled as never} />
				</HBox>

				<Title text="Validation. JSX-site error message" level="H4" class="sapUiTinyMarginTop" />
				<Text text="Uncomment `badType: 'Empahsized'` above and use it as <Button type={cfg.badType as never} /> to see the runtime's JSX-site TypeError. Message names the control class, prop, and expected enum." />

				<Title text="Skip, binding strings are left alone" level="H4" class="sapUiTinyMarginTop" />
				<HBox alignItems="Center">
					<Text text='value="{= 1 + 2 }", expression binding, not coerced' class="sapUiSmallMarginEnd" />
					<Input value="{= 1 + 2 }" />
				</HBox>
			</VBox>
		);
	}
}
