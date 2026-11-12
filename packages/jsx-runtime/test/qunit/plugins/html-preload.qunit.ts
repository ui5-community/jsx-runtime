/** Real async component/view lifecycle, with only HTML library/module loading stubbed. */
import Component from "sap/ui/core/Component";
import UIComponent from "sap/ui/core/UIComponent";
import View from "sap/ui/core/mvc/View";
import Control from "sap/ui/core/Control";
import Lib from "sap/ui/core/Lib";
import { jsx, withScope } from "ui5/community/jsx/runtime/jsx-runtime";
import { htmlScope, preloadSapHtml } from "ui5/community/jsx/runtime/plugins/html/index";

const library = { controls: ["sap.html.Div", "sap.html.Span"] } as unknown as Lib;
const FakeDiv = Control.extend("test.html.preload.FakeDiv", {
	metadata: { properties: { text: { type: "string", defaultValue: "" } } },
	renderer: { apiVersion: 2, render: () => { /* no rendering needed */ } }
});
const ui = sap.ui as unknown as { require: (...args: unknown[]) => unknown };
let originalLoad: typeof Lib.load;
let originalRequire: typeof ui.require;
let libraryPromise: Promise<Lib>;
let requestedModules: unknown;
let finishModules: () => void;
let moduleError: Error | undefined;
let completeModulesImmediately: boolean;
let modulesReady: boolean;
let rootBuilds: number;
const components: Component[] = [];

/** @namespace test.html.preload */
class HtmlRootView extends View {
	getAutoPrefixId(): boolean { return true; }
	createContent(): Control {
		rootBuilds++;
		return withScope(htmlScope, () => jsx("div" as never, { id: "inner", children: "ready" }));
	}
}

sap.ui.define("test/html/preload/Root", [], () => HtmlRootView);

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return undefined;
	} catch (error) {
		return error;
	}
}

QUnit.module("plugins/html — preload", {
	beforeEach() {
		originalLoad = Lib.load;
		originalRequire = ui.require;
		libraryPromise = Promise.resolve(library);
		requestedModules = undefined;
		moduleError = undefined;
		completeModulesImmediately = true;
		modulesReady = false;
		rootBuilds = 0;
		Lib.load = () => libraryPromise;
		ui.require = Object.assign((...args: unknown[]) => {
			if (args.length === 1 && args[0] === "sap/html/Div") {
				return modulesReady ? FakeDiv : undefined;
			}
			if (Array.isArray(args[0]) && args[0].includes("sap/html/Div")) {
				requestedModules = args[0];
				finishModules = () => {
					if (moduleError) (args[2] as (error: Error) => void)(moduleError);
					else {
						modulesReady = true;
						(args[1] as () => void)();
					}
				};
				if (completeModulesImmediately) finishModules();
				return;
			}
			return originalRequire.apply(sap.ui, args);
		}, originalRequire);
	},
	afterEach() {
		for (const component of components.splice(0)) component.destroy();
		Lib.load = originalLoad;
		ui.require = originalRequire;
	}
});

QUnit.test("preload waits for library metadata and constructor resolution", async (assert) => {
	let releaseLibrary!: (library: Lib) => void;
	libraryPromise = new Promise((resolve) => { releaseLibrary = resolve; });
	completeModulesImmediately = false;
	let settled = false;
	const promise = preloadSapHtml().then(() => { settled = true; });
	await Promise.resolve();
	assert.notOk(settled, "pending while library loads");
	assert.strictEqual(requestedModules, undefined, "modules not requested before metadata");
	releaseLibrary(library);
	await Promise.resolve();
	assert.deepEqual(requestedModules, [
		"sap/html/Div", "sap/html/Span", "sap/ui/core/html/TextContent"
	], "all HTML controls and TextContent requested");
	assert.notOk(settled, "library preload alone did not complete constructor resolution");
	assert.strictEqual(sap.ui.require("sap/html/Div"), undefined, "constructor unavailable before async require completes");
	finishModules();
	await promise;
	assert.strictEqual(sap.ui.require("sap/html/Div"), FakeDiv, "constructor available after completion");
});

QUnit.test("library errors reject preload unchanged", async (assert) => {
	const error = new Error("library unavailable");
	libraryPromise = Promise.reject(error);
	assert.strictEqual(await rejectionOf(preloadSapHtml()), error, "original error propagated");
	assert.strictEqual(requestedModules, undefined, "no constructor requests after library failure");
});

QUnit.test("constructor errors reject preload unchanged", async (assert) => {
	moduleError = new Error("HTML module unavailable");
	assert.strictEqual(await rejectionOf(preloadSapHtml()), moduleError, "original error propagated");
});

QUnit.test("preload can be awaited repeatedly", async (assert) => {
	await preloadSapHtml();
	await preloadSapHtml();
	assert.strictEqual(sap.ui.require("sap/html/Div"), FakeDiv, "constructor remains available");
});

QUnit.test("async component content gates the HTML root and preserves ownership and view IDs", async (assert) => {
	let releaseLibrary!: (library: Lib) => void;
	libraryPromise = new Promise((resolve) => { releaseLibrary = resolve; });
	let preloadStarted!: () => void;
	const started = new Promise<void>((resolve) => { preloadStarted = resolve; });
	Lib.load = () => {
		preloadStarted();
		return libraryPromise;
	};
	const name = "test.html.preload.ComponentApp";
	sap.ui.define("test/html/preload/ComponentApp/Component", [], () => UIComponent.extend(`${name}.Component`, {
		metadata: {
			interfaces: ["sap.ui.core.IAsyncContentCreation"],
			manifest: {
				"sap.app": { id: name },
				"sap.ui5": { rootView: { viewName: "module:test/html/preload/Root", id: "root", async: true } }
			}
		},
		init(this: UIComponent) {
			components.push(this);
			UIComponent.prototype.init.call(this);
		},
		async createContent(this: UIComponent): Promise<Control | null> {
			await preloadSapHtml();
			return this.runAsOwner(() => UIComponent.prototype.createContent.call(this));
		}
	}));
	let settled = false;
	const creation = Component.create({ name, manifest: false }).then((component) => {
		settled = true;
		return component as UIComponent;
	});
	await started;
	assert.strictEqual(rootBuilds, 0, "root JSX not constructed before preload");
	assert.notOk(settled, "Component.create waits for async content");
	releaseLibrary(library);
	const component = await creation;
	const root = component.getRootControl() as View;
	const child = root.byId("inner");
	assert.strictEqual(rootBuilds, 1, "root constructed after preload");
	assert.ok(child, "synchronous view scope supplied the local ID");
	assert.strictEqual(child.getId(), root.createId("inner"), "view ID prefix preserved");
	assert.strictEqual(Component.getOwnerComponentFor(root), component, "root view belongs to component");
	assert.strictEqual(Component.getOwnerComponentFor(child), component, "HTML child belongs to component");
});
