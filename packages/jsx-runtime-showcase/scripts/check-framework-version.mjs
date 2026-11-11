#!/usr/bin/env node
/** Keep the CDN bootstrap and dist preview on the framework used to build. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const frameworkVersion = (yaml) => yaml.match(/^framework:\s*\n\s+name: OpenUI5\s*\n\s+version: "([\d.]+)"/m)?.[1];
const devConfig = read("ui5.yaml");
const distConfig = read("ui5-dist.yaml");
const version = frameworkVersion(devConfig);
const cdnVersion = read("webapp/index.html").match(/src="https:\/\/sdk\.openui5\.org\/([\d.]+)\/resources\/sap-ui-core\.js"/)?.[1];

assert.ok(version, "Cannot find framework.version in ui5.yaml");
assert.equal(frameworkVersion(distConfig), version, "ui5-dist.yaml must match ui5.yaml framework.version");
assert.equal(cdnVersion, version, "index.html CDN bootstrap must match ui5.yaml framework.version");
for (const [name, config] of [["ui5.yaml", devConfig], ["ui5-dist.yaml", distConfig]]) {
	assert.match(config, /^\s+- name: sap\.html\s*$/m, `${name} must include sap.html for the native HTML demo`);
}
console.log(`Showcase framework versions match: OpenUI5 ${version}`);
