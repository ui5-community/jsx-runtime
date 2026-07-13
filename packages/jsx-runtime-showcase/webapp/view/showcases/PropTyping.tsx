import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import VBox from "sap/m/VBox";
import HBox from "sap/m/HBox";
import Title from "sap/m/Title";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Input, { type Input$LiveChangeEvent } from "sap/m/Input";
import StepInput from "sap/m/StepInput";
import MessageToast from "sap/m/MessageToast";

/**
 * # Chapter 2. Per-control prop typing
 *
 * TypeScript checks every JSX prop against the target control's
 * `$XSettings` interface (from `@openui5/types`). Typos are
 * compile-time errors; event payloads are typed at the call site;
 * IDE autocomplete works for control props just like for function
 * arguments.
 *
 * No codegen, the runtime's `LibraryManagedAttributes<C, _P>` type
 * pulls the settings interface straight from each UI5 control's
 * constructor via `ConstructorParameters` inference.
 *
 * ## Try this, break it on purpose
 *
 * Uncomment any of the lines marked **TS-ERROR** below. The TypeScript
 * compiler will fail with a precise message pointing at the offending
 * prop. None of these are runtime errors, the type system catches
 * them before the file even compiles.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class PropTyping extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Title text="Per-control prop typing" level="H3" />
				<Text
					text="Hover any prop in your IDE to see the type. Try misspelling one. TypeScript catches it."
					class="sapUiSmallMarginBottom"
				/>

				{/* ── ✅ Correct usage ────────────────────────────── */}
				<HBox>
					<Input
						placeholder="Type here"
						liveChange={(e: Input$LiveChangeEvent): void => {
							// `e.getParameter("value")` is typed `string`, no cast.
							const v = e.getParameter("value") ?? "";
							MessageToast.show(`liveChange → ${v}`);
						}}
					/>
				</HBox>

				<HBox>
					<StepInput value={42} min={0} max={100} step={1} />
				</HBox>

				<HBox>
					<Button text="Press me" press={(): void => MessageToast.show("pressed")} />
					{/*
					   ── 🛑 TS-ERROR (uncomment to see the diagnostic) ──
					   <Button
					       texxt="typo"           // TS2769, does not match $ButtonSettings
					       press="onPress"        // TS2322, `.dotHandler` literal needs leading "."
					       icon={42}              // TS2322, icon is `URI`, not `number`
					   />
					*/}
				</HBox>

				<Text
					text="The class= prop is special-cased by the runtime (it routes through addStyleClass), so it's allowed on every control regardless of the underlying $XSettings type."
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}
}
