#!/usr/bin/env node
/** Complete reference structure checks against each independent module's declared YAML coverage. */
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { declaredTemplateRequirements, checkTemplate } from "./template-completeness.mjs";
import { checkMidiTemplateCoverage } from "./template-authoring.mjs";
const ITEM_TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"];
const ACTIVITY_TYPES = ["attack", "save", "damage", "heal", "utility", "check", "cast", "enchant", "summon", "transform", "forward", "effect"];

export async function runTemplateCompleteness({ root, api, yaml, moduleId }) {
  const itemModule = moduleId === "5e-item-importer";
  const coverage = await api(itemModule ? "scripts/itemFieldCatalogCoverage.js" : "scripts/activityFieldCatalogCoverage.js");
  const requirements = declaredTemplateRequirements(coverage, itemModule);
  const midiRequirements = itemModule ? [] : (await api("scripts/activityFieldCatalogMidiCoverage.js")).getMidiTemplateRequirements();
  const folders = itemModule ? ["YAML Templates"] : ["Base Activity Templates", "Midi QOL Activity Templates"];
  const results = [];
  for (const folder of folders) for (const type of itemModule ? ITEM_TYPES : ACTIVITY_TYPES) {
    const title = type[0].toUpperCase() + type.slice(1);
    const filename = (itemModule ? "Strict " : folder.startsWith("Midi") ? "MIDI " : "") + title + " Template.md";
    const relative = path.join("templates", folder, filename), file = path.join(root, relative);
    try {
      const markdown = await fs.readFile(file, "utf8");
      const result = checkTemplate({ markdown, requirements, yaml, itemModule, type });
      if (folder.startsWith("Midi")) {
        result.issues.push(...checkMidiTemplateCoverage({ markdown, type, requirements: midiRequirements, yaml }));
        result.success = result.issues.length === 0;
      }
      results.push({ name: "Full reference completeness: " + relative.replaceAll("\\", "/"), passed: result.success,
        details: { checked: result.checked ?? 0, issues: result.issues, exceptions: result.exceptions } });
    } catch (error) {
      results.push({ name: "Full reference completeness: " + relative.replaceAll("\\", "/"), passed: false, details: { error: error.message } });
    }
  }
  return { module: moduleId, total: results.length, passed: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed).length, requiredLocations: requirements.length, results };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(await fs.readFile(path.join(root, "module.json"), "utf8"));
  const context = vm.createContext({ console, structuredClone, CONFIG: { DND5E: {} },
    game: { modules: new Map(), settings: { get() { return false; } }, i18n: { localize: key => key } }, foundry: { utils: {} } });
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
  const yaml = (await api("scripts/vendor/js-yaml.mjs")).default;
  const report = await runTemplateCompleteness({ root, api, yaml, moduleId: manifest.id });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (report.failed) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch (error) { process.stderr.write(error.stack + "\n"); process.exitCode = 1; }
}
