import Dialog from "sap/m/Dialog";
import Button from "sap/m/Button";
import Text from "sap/m/Text";
import VBox from "sap/m/VBox";

/**
 * # Chapter 10 helper. Fragment factory (`*.fragment.tsx`)
 *
 * A reusable chunk of UI without its own controller, the TSX
 * equivalent of `*.fragment.xml`. Exports a plain factory function
 * that returns a control tree. The calling view mounts it via
 * `addDependent(factory())` so the dialog's parent chain leads back
 * to the caller, handlers like `.onCloseDialog` resolve against
 * that view's controller at fire time.
 *
 * The `.fragment.tsx` filename suffix is a convention for readers,
 * the runtime doesn't inspect filenames.
 *
 * @namespace ui5.community.jsx.showcase.view.showcases
 */
export default function FragmentDialog(): Dialog {
	// `JSX.Element` is typed wide in this runtime, so the JSX
	// expression assigns directly to `Dialog` without a cast.
	return (
		<Dialog
			title="Hello from a Fragment"
			contentWidth="20rem"
			endButton={<Button text="Close" press=".onCloseDialog" />}
		>
			<VBox class="sapUiSmallMargin">
				<Text text="This Dialog lives in FragmentDialog.fragment.tsx, no controller, no view subclass, just a factory that returns a control tree." />
			</VBox>
		</Dialog>
	);
}
