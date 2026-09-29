#!/usr/bin/env node
/** Isolated source-only schema walker/provider tests. No Foundry client or world is accessed. */
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "module.json"), "utf8"));
const context = vm.createContext({ console, __fieldCatalogTestSandbox: true });
const cache = new Map();
async function load(filename) {
  filename = path.resolve(filename);
  if (!cache.has(filename)) cache.set(filename, fs.readFile(filename, "utf8").then(source =>
    new vm.SourceTextModule(source, { context, identifier: filename })));
  return cache.get(filename);
}
async function api(relative) {
  const module = await load(path.join(root, relative));
  if (module.status === "unlinked") await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
  if (module.status === "linked") await module.evaluate();
  return module.namespace;
}
try {
  const tests = await api("tests/unit/fieldCatalogCoreTests.js");
  const native = await api(manifest.id === "5e-item-importer" ? "scripts/itemFieldCatalogNative.js" : "scripts/activityFieldCatalogNative.js");
  const report = tests.runFieldCatalogCoreTests({ provider: manifest.id, discover: native.discoverNativeCatalog });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (report.failed) process.exitCode = 1;
} catch (error) {
  process.stderr.write(error.stack + "\n");
  process.exitCode = 1;
}
