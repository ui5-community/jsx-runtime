import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/report/**",
			"**/.nyc_output/**",
			"**/.ui5-tooling-modules/**",
			"**/webapp/api/**",
			"**/*.gen.d.ts"
		]
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				sap: "readonly",
				QUnit: "readonly"
			},
			ecmaVersion: 2023,
			sourceType: "module",
			// Pin the TSConfig root explicitly. Without it, typescript-eslint
			// cannot disambiguate between candidate roots (the repo root vs a
			// package that enables type-aware linting, e.g. helloworld) when
			// ESLint runs from the workspace root over files spanning
			// packages — as the IDE integration and lint-staged do. It then
			// fails with "multiple candidate TSConfigRootDirs are present".
			// See https://typescript-eslint.io/packages/parser/#tsconfigrootdir
			parserOptions: {
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
		}
	}
);
