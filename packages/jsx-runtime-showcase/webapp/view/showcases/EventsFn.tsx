import View from "sap/ui/core/mvc/View";
import type Control from "sap/ui/core/Control";
import type Controller from "sap/ui/core/mvc/Controller";
import VBox from "sap/m/VBox";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import Input, { type Input$LiveChangeEvent } from "sap/m/Input";
import MessageBox from "sap/m/MessageBox";

/**
 * # Chapter 4. Event handlers with function reference
 *
 * Handlers as direct function references, not `.dotHandler` strings.
 * The strongly-typed event payload (`Input$LiveChangeEvent`) is
 * visible at the call site without a cast.
 *
 *   ```tsx
 *   <Button press={this.onTap} />              // works, `this` is controller
 *   <Button press={this.onTap.bind(this)} />   // also works, just noisier
 *   ```
 *
 * The runtime's `fnHandlerIntrinsic` claims any function-typed prop
 * whose name matches an event on the target control's metadata. It
 * hands UI5 the `[fn, listener]` settings-array shape, same wire
 * format XMLView uses, so `this` inside the handler resolves to the
 * surrounding view's controller. No `.bind(this)` needed.
 *
 * ## When to reach for which
 *
 *  - **Function ref** when the handler is local to the view, captures
 *    closures, or needs typed `e.getParameter(...)` access.
 *  - **`.dotHandler` string** (Chapter 3) when the handler lives on a
 *    separate controller file, or when the JSX subtree might be
 *    re-parented under a different view.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default class EventsFn extends View {
	getAutoPrefixId(): boolean {
		return true;
	}

	// This standalone sample has no separate `*.controller.ts` file,
	// it doubles as its own controller. The runtime's
	// `fnHandlerIntrinsic` rewrites `event={fn}` into UI5's
	// `[fn, listener]` settings-array shape at construction time; the
	// listener is the surrounding view's controller, resolved via
	// `view.getController()`. Without this override the listener
	// would be `undefined`, `this` inside the handler would fall back
	// to the firing control (Button / Input, no `byId` method), and
	// `this.byId("nameInput")` would throw / return undefined. Same
	// one-line bridge every other stand-alone sample in
	// `webapp/view/showcases/` uses.
	getController(): Controller {
		return this as unknown as Controller;
	}

	createContent(): Control {
		return (
			<VBox class="sapUiSmallMargin">
				<Text
					text="press={this.onShow}, the runtime resolves `this` to the controller via UI5's [fn, listener] settings-array shape."
					class="sapUiSmallMarginBottom"
				/>
				<Input
					id="nameInput"
					placeholder="Type something…"
					liveChange={this.onLiveChange}
				/>
				<Text id="nameMirror" />
				<Button
					text="Show input (fn ref)"
					press={this.onShow}
					class="sapUiSmallMarginTop"
				/>
			</VBox>
		);
	}

	onLiveChange(event: Input$LiveChangeEvent): void {
		// Strongly-typed payload, no cast needed.
		const value = event.getParameter("value") ?? "";
		(this.byId("nameMirror") as Text)?.setText(value);
	}

	onShow(): void {
		const input = this.byId("nameInput") as Input;
		const value = input?.getValue() ?? "";
		MessageBox.show(value === "" ? "(empty)" : value);
	}
}
