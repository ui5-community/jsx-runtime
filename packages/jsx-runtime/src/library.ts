import Lib from "sap/ui/core/Lib";

/**
 * Initialise the `ui5.community.jsx.runtime` library.
 *
 * This library does not ship any controls. It exposes the JSX runtime
 * entry point (`ui5.community.jsx.runtime/jsx-runtime`) that Babel
 * imports via `@babel/plugin-transform-react-jsx` with
 * `importSource: "ui5/community/jsx/runtime"`.
 *
 * The `initLibrary` call registers the namespace with UI5's core so
 * consumers can declare `ui5.community.jsx.runtime` as a `libs`
 * dependency in their `manifest.json` and the resource-root mapping
 * resolves automatically.
 *
 * @namespace ui5.community.jsx.runtime
 */
const thisLib = Lib.init({
	name: "ui5.community.jsx.runtime",
	apiVersion: 2,
	version: "${version}",
	dependencies: ["sap.ui.core"],
	types: [],
	interfaces: [],
	controls: [],
	elements: [],
	noLibraryCSS: true
});

export default thisLib;
