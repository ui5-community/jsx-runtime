/**
 * Ambient module shims for UI5 internals used by the JSX runtime but
 * not exposed in `@openui5/types`. `BindingParser` is a stable UI5
 * core module (the same primitive `ManagedObject.extractBindingInfo`
 * uses internally), the type export just isn't part of the public
 * `.d.ts` bundle. We declare only the surface we actually call.
 */

declare module "sap/ui/base/BindingParser" {
	/**
	 * Result of a successful bind-info parse, kept intentionally
	 * narrow. UI5's own runtime shape is broader (multi-part
	 * bindings, formatters, etc.); we only look at the *typeof* the
	 * return value to distinguish "binding" (object) from "literal"
	 * (string), so a permissive record is fine.
	 */
	export interface BindingInfoLike {
		path?: string;
		parts?: unknown[];
		formatter?: (...args: unknown[]) => unknown;
		[k: string]: unknown;
	}

	/**
	 * The "complex parser", recognises simple `"{path}"`, expression
	 * `"{= …}"`, and composite `"prefix {path} suffix"` bindings, and
	 * returns a plain string (or `undefined`) for non-binding input.
	 */
	const BindingParser: {
		complexParser(
			value: string
		): BindingInfoLike | string | undefined;
	};

	export default BindingParser;
}
