import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		// JSX/TSX views: this runtime types every JSX expression as `any`
		// by design (a JSX element must be assignable to any UI5
		// aggregation slot — see the `JSX.Element = any` rationale in the
		// runtime). That makes the type-checked "unsafe any" rules fire on
		// every `createContent()` return and aggregation prop, which is
		// noise here, not a real risk. Relax them for .tsx only.
		files: ["**/*.tsx"],
		rules: {
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-assignment": "off"
		}
	},
	{
		ignores: ["eslint.config.mjs", "webapp/test/e2e/**"]
	}
);
