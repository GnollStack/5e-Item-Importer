#!/usr/bin/env node
/** Run pure catalog service regressions in the same ES-module layout used by Foundry. */
import vm from "node:vm";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = vm.createContext({ console, structuredClone, Set, Map, WeakSet });
const modules = new Map();
async function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  const module = new vm.SourceTextModule(await fs.readFile(file, "utf8"), { context, identifier: file });
  modules.set(file, module);
  await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier)));
  return module;
}
const module = await load(path.join(root, "tests/unit/fieldCatalogServiceTests.js"));
await module.evaluate();
const result = module.namespace.runFieldCatalogServiceTests();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.success ? 0 : 1;
