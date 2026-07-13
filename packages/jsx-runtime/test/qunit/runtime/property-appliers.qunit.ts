/**
 * QUnit tests for the PropertyApplier extension point.
 *
 * PropertyAppliers are post-construction, they run after all intrinsics
 * and after the control is constructed. This test registers a custom
 * applier via `withScope` and verifies it fires after intrinsic
 * post-hooks.
 */
import { jsx, withScope, type PropertyApplier } from "ui5/community/jsx/runtime/jsx-runtime";
import Button from "sap/m/Button";

QUnit.module("runtime/property-appliers");

QUnit.test("PropertyApplier fires after the control is constructed", (assert) => {
	const log: string[] = [];
	const applier: PropertyApplier = {
		matches: (name: string) => name === "myLateProp",
		apply: (instance: unknown, name: string, value: unknown) => {
			log.push(`applier:${name}=${String(value)}`);
			assert.ok(instance instanceof Button, "applier receives the constructed instance");
		}
	};
	withScope({ propertyAppliers: [applier] }, () => {
		const b = jsx(Button, {
			text: "hello",
			myLateProp: "delayed" as unknown
		} as never) as Button;
		assert.deepEqual(log, ["applier:myLateProp=delayed"], "applier called once");
		b.destroy();
	});
});

QUnit.test("PropertyApplier receives the value even if intrinsic did not claim it", (assert) => {
	const log: unknown[] = [];
	const applier: PropertyApplier = {
		matches: (name: string) => name === "customThing",
		apply: (_i: unknown, _n: string, value: unknown) => log.push(value)
	};
	withScope({ propertyAppliers: [applier] }, () => {
		const b = jsx(Button, { text: "x", customThing: 42 } as never) as Button;
		assert.deepEqual(log, [42], "applier saw the raw value");
		b.destroy();
	});
});
