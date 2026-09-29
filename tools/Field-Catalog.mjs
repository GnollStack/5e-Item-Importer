#!/usr/bin/env node
/** Source-only offline reports. Inputs are saved JSON files, never URLs or world documents. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleSnapshot, compareSnapshots, renderMarkdown, selectSnapshotLayer } from "./field-catalog-reports.mjs";

const help = [
  "Usage:",
  "  node tools/Field-Catalog.mjs assemble <page.json...> [--out snapshot.json]",
  "  node tools/Field-Catalog.mjs render <snapshot.json> [--out reference.md]",
  "  node tools/Field-Catalog.mjs diff <before.json> <after.json> [--out changes.json]",
  "  node tools/Field-Catalog.mjs --check-parity <companion-repository>",
  "  Optional: --layer native|midi|extensions|all selects a captured layer for assemble/render/diff.",
  "",
  "Inputs may be raw pages, arrays of pages, or saved MCP result envelopes.",
  "Without --out, output goes to stdout. Captures should live outside shipped docs.",
  "Diff reports differences as data; valid reports exit 0 even when differences exist.",
  "No network or Foundry access is performed."
].join("\n");

async function readJson(filename) {
  let text = await fs.readFile(filename, "utf8");
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  try { return JSON.parse(text); } catch (error) { throw new Error("Invalid JSON in " + filename + ": " + error.message); }
}
async function main(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) { process.stdout.write(help + "\n"); return; }
  if (argv[0] === "--check-parity") {
    if (argv.length !== 2) throw new Error("--check-parity requires exactly one companion repository.");
    const localRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const names = ["tools/Field-Catalog.mjs", "tools/field-catalog-reports.mjs", "tools/field-catalog-reports.test.mjs",
      "scripts/fieldCatalogCore.js", "scripts/fieldCatalogService.js", "scripts/diagnostics/fieldCatalogChecks.js",
      "scripts/fieldCatalogMidi.js", "scripts/fieldCatalogMidiRules.js", "tools/Test-MidiFieldCatalog.mjs", "tests/unit/midiFieldCatalogTests.js",
      "tools/template-completeness.mjs", "tools/template-completeness.test.mjs", "tools/Test-TemplateCompleteness.mjs",
      "tools/template-authoring.mjs", "tools/template-authoring.test.mjs", "tools/Test-TemplateAuthoring.mjs"];
    for (const name of names) {
      const [local, sibling] = await Promise.all([fs.readFile(path.join(localRoot, name)), fs.readFile(path.join(argv[1], name))]);
      if (!local.equals(sibling)) throw new Error("Catalog shared helper parity failed: " + name);
    }
    process.stdout.write("Catalog shared helper parity passed (" + names.length + " files).\n");
    return;
  }
  const [command, ...args] = argv, inputs = [];
  let output, layer;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--out") {
      if (output || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("--out requires one filename.");
      output = args[++index];
    } else if (args[index] === "--layer") {
      if (layer || !["native", "midi", "extensions", "all"].includes(args[index + 1])) throw new Error("--layer requires native, midi, extensions, or all.");
      layer = args[++index];
    } else if (args[index].startsWith("--")) throw new Error("Unknown option: " + args[index]);
    else inputs.push(args[index]);
  }
  const arity = { assemble: [1, Infinity], render: [1, 1], diff: [2, 2] }[command];
  if (!arity || inputs.length < arity[0] || inputs.length > arity[1]) throw new Error("Invalid arguments.\n" + help);
  if (output && inputs.some(input => path.resolve(input) === path.resolve(output))) throw new Error("Output must not overwrite an input capture.");
  const values = await Promise.all(inputs.map(readJson));
  const select = snapshot => layer ? selectSnapshotLayer(snapshot, layer) : snapshot;
  const result = command === "assemble" ? select(assembleSnapshot(values))
    : command === "render" ? renderMarkdown(select(values[0])) : compareSnapshots(select(values[0]), select(values[1]));
  const rendered = typeof result === "string" ? result : JSON.stringify(result, null, 2) + "\n";
  if (output) {
    await fs.writeFile(output, rendered, "utf8");
    process.stderr.write("Wrote " + output + "\n");
  } else process.stdout.write(rendered);
}
try { await main(process.argv.slice(2)); }
catch (error) { process.stderr.write("Field catalog: " + error.message + "\n"); process.exitCode = 1; }
