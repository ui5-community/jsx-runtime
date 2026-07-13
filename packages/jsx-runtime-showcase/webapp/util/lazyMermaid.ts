import type Control from "sap/ui/core/Control";

/**
 * Dynamically load the `Mermaid` control class and return a fresh
 * instance. The dynamic `sap.ui.require` call means the control
 * module (and, transitively, the `mermaid` npm package) only fetches
 * on first use. Landing and Explore samples that never call this
 * function pay zero cost.
 *
 * Consumers typically mount a placeholder (a `BusyIndicator`, an
 * empty `VBox`, or a plain `Text`) into their content aggregation
 * synchronously and swap it for the returned Mermaid instance once
 * this promise resolves. Set the diagram source via
 * `mermaid.setDefinition(text)` after (or before, doesn't matter,
 * the control invalidates on every property change).
 *
 * @example
 * const slot = new VBox();
 * placeInto(slot);
 * const mermaid = await createMermaid();
 * mermaid.setDefinition(await loadSource("diagrams/big-picture.mmd"));
 * slot.addItem(mermaid);
 *
 * @namespace ui5.community.jsx.showcase.util
 */
export function createMermaid(): Promise<Control> {
	return new Promise((resolve, reject) => {
		sap.ui.require(
			["ui5/community/jsx/showcase/control/Mermaid"],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(MermaidModule: any) => {
				// `sap.ui.require` returns the module's default export
				// for ES-module-shaped files; `Mermaid.tsx` uses
				// `export default class`, so this is the class itself.
				const MermaidCtor = MermaidModule?.default ?? MermaidModule;
				resolve(new MermaidCtor());
			},
			(err: unknown) => reject(err instanceof Error ? err : new Error(String(err)))
		);
	});
}
