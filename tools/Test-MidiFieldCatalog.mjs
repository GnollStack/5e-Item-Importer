#!/usr/bin/env node
/** Source-only synthetic discovery and real parser/serializer checks; no live globals are modified. */
import vm from "node:vm";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "module.json"), "utf8"));
const quiet = { log() {}, warn() {}, error() {}, group() {}, groupEnd() {} };
const context = vm.createContext({ console: quiet, structuredClone, __fieldCatalogTestSandbox: true });
const cache = new Map();
async function load(file) {
    file = path.resolve(file);
    if (!cache.has(file)) cache.set(file, fs.readFile(file, "utf8").then(source => new vm.SourceTextModule(source, { context, identifier: file })));
    return cache.get(file);
}
async function api(file) {
    const module = await load(path.join(root, file));
    if (module.status === "unlinked") await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
}
const tests = await api("tests/unit/midiFieldCatalogTests.js");
const coverage = await api(manifest.id === "5e-activity-importer" ? "scripts/activityFieldCatalogMidiCoverage.js" : "scripts/itemFieldCatalogMidiCoverage.js");
const result = tests.runMidiFieldCatalogTests({ provider: manifest.id, decorate: coverage.decorateMidiCatalogFields });
if (manifest.id === "5e-activity-importer") {
    tests.installMidiParserTestEnvironment();
    const parser = await api("scripts/activityParsers/yamlParser.js");
    const serializer = await api("scripts/activityStrictSerializer.js");
    result.tests.push(...tests.runMidiYamlCoverageTests({ parser, serializer, decorate: coverage.decorateMidiCatalogFields }).tests);
}
result.passed = result.tests.filter(test => test.passed).length;
result.failed = result.tests.length - result.passed;
result.success = result.failed === 0;
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.success ? 0 : 1;
