import Log from "sap/base/Log";

/**
 * Fetch the raw source of a project file (typically a `.tsx` view, a
 * `.md` doc, or a `.mmd` diagram) and return it as a string.
 *
 * ## URL resolution
 *
 * The `ui5-tooling-transpile-middleware` serves each `.tsx` file
 * verbatim at its natural path inside `webapp/`, e.g.
 * `webapp/view/HelloShowcase.tsx` is reachable as
 * `/view/HelloShowcase.tsx` in dev. The built distribution places the
 * same files under the app root as static assets, still relative to
 * the loaded `index.html`. So resolving `appRelativePath` against
 * `document.baseURI` gives the correct URL in both modes and survives
 * any base-URL configuration (subdirectory hosting, CDN prefix, etc.).
 *
 * ## Caching
 *
 * Results are cached in-process for the lifetime of the page. Since a
 * doc or a sample source may be revisited many times, caching removes
 * the repeat network round-trip. The dev-server livereload restarts
 * the whole page on file changes, so the cache doesn't need
 * invalidation.
 *
 * @param appRelativePath  Path relative to the `webapp/` root, e.g.
 *                         `"view/HelloShowcase.tsx"` or
 *                         `"docs/one-pager.md"`.
 * @returns                The file contents as a string.
 * @throws                 Error on non-2xx or network failure.
 *
 * Ported from `webapp/util/loadSource.ts` in the reference app at
 * `/Users/d039071/SAPDevelop/_work/tsx/ui5.app.tsx/`.
 *
 * @namespace ui5.community.jsx.showcase.util
 */
export async function loadSource(appRelativePath: string): Promise<string> {
	const cached = cache.get(appRelativePath);
	if (cached !== undefined) {
		return cached;
	}

	const url = new URL(appRelativePath, document.baseURI).toString();
	const response = await fetch(url);
	if (!response.ok) {
		const err = new Error(
			`loadSource: fetch(${url}) failed with HTTP ${response.status} ${response.statusText}`
		);
		Log.error(err.message, undefined, "ui5.community.jsx.showcase.util.loadSource");
		throw err;
	}
	const text = await response.text();
	cache.set(appRelativePath, text);
	return text;
}

const cache = new Map<string, string>();
