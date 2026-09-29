import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { assembleSnapshot, compareSnapshots, renderMarkdown, unwrapCatalogPages, validateSnapshot, selectSnapshotLayer } from "./field-catalog-reports.mjs";

const clone = value => JSON.parse(JSON.stringify(value));
const field = (id, extra = {}) => ({
  id, kind: "item", type: "spell", path: "system." + id, variant: null,
  fieldClass: "NumberField", classification: "stored", storage: { persisted: true },
  constraints: { required: true, nullable: false, integer: true, min: 0 },
  default: { kind: "literal", value: 0 }, schemaChoices: { status: "literal", values: [0, 1, 2] },
  validation: { custom: false }, sheet: { status: "reviewed", label: "Prepared", conditions: [] },
  coverage: { status: "declared", yaml: ["PREPARATION.Prepared"], tests: [] }, ...extra
});
function pages() {
  const shared = {
    formatVersion: 1, kind: "native-field-catalog-page", provider: "5e-item-importer", catalogId: "native-1",
    environment: { foundry: "14.367", dnd5e: "5.3.3", modules: [{ id: "test", version: "1" }], capturedAt: "first" },
    total: 3, limit: 2, query: {}, types: [{ kind: "item", type: "spell", label: "Spell", importSupport: "supported" }],
    diagnostics: [{ code: "open-object", path: "flags" }], completeness: { schema: "classified", sheets: "partial" }
  };
  return [
    { ...clone(shared), offset: 0, nextCursor: "2", fields: [field("prepared"), field("uses", { default: { kind: "generated" } })] },
    { ...clone(shared), offset: 2, nextCursor: null, fields: [field("formula", { fieldClass: "FormulaField", schemaChoices: { status: "unresolved" } })] }
  ];
}

test("MIDI layer snapshots retain attribution, choice changes and coverage gaps", () => {
  const input = pages();
  input.forEach(page => { page.query.layer = "all"; });
  input[0].fields[1] = field("midi/item/spell//extra", { layer: "midi", provenance: { native: false, source: { package: "midi-qol" } },
    coverage: { status: "unsupported", stages: { parse: "unsupported", export: "unsupported" } }, schemaChoices: { status: "declared", values: ["one"] } });
  const snapshot = assembleSnapshot(input), unchanged = clone(snapshot);
  const selected = selectSnapshotLayer(snapshot, "midi");
  assert.equal(selected.catalogs[0].total, 1);
  assert.equal(selected.catalogs[0].completeness.paginationComplete, true);
  assert.match(renderMarkdown(selected), /MIDI layers/);
  assert.match(renderMarkdown(selected), /unsupported/);
  assert.deepEqual(snapshot, unchanged);
  const after = clone(snapshot);
  after.catalogs[0].fields.find(field => field.layer === "midi").schemaChoices.values.push("two");
  const diff = compareSnapshots(selected, selectSnapshotLayer(after, "midi"));
  assert.equal(diff.fields.changed.length, 1);
  assert.equal(diff.fields.changed[0].changes[0].property, "schemaChoices");
  assert.equal(selectSnapshotLayer(snapshot, "native").catalogs[0].total, 2);
  assert.throws(() => selectSnapshotLayer(assembleSnapshot(pages()), "midi"), /no complete capture/);
});

test("complete out-of-order MCP captures assemble deterministically without mutating inputs", () => {
  const source = pages(), original = clone(source);
  const wrapped = { content: [{ type: "text", text: JSON.stringify({ success: true, result: source[1] }) }] };
  const assembled = assembleSnapshot([wrapped, { structuredContent: source[0] }]);
  assert.equal(assembled.catalogs[0].fields.length, 3);
  assert.equal(assembled.catalogs[0].completeness.paginationComplete, true);
  assert.equal(assembled.catalogs[0].completeness.sheets, "partial");
  assert.equal(assembled.catalogs[0].diagnostics.length, 1);
  assert.deepEqual(assembled, assembleSnapshot(source));
  assert.deepEqual(source, original);
});

test("missing, duplicate, overlapping and truncated pages fail clearly", () => {
  const source = pages();
  assert.throws(() => assembleSnapshot(source.slice(1)), /Missing/);
  assert.throws(() => assembleSnapshot(source.slice(0, 1)), /incomplete/);
  assert.throws(() => assembleSnapshot([source[0], ...source]), /overlapping/);
  const duplicateId = clone(source); duplicateId[1].fields[0].id = "prepared";
  assert.throws(() => assembleSnapshot(duplicateId), /Duplicate catalog field ID/);
  const overlap = clone(source); overlap[1].offset = 1;
  assert.throws(() => assembleSnapshot(overlap), /overlapping|next cursor/);
  const terminal = clone(source); terminal[1].nextCursor = "more";
  assert.throws(() => assembleSnapshot(terminal), /Terminal/);
});

test("metadata and catalog revision changes within a capture cannot silently merge", () => {
  for (const mutate of [
    page => { page.catalogId = "native-2"; },
    page => { page.environment.dnd5e = "5.4.0"; },
    page => { page.types[0].importSupport = "unsupported"; },
    page => { page.total = 4; page.nextCursor = "3"; }
  ]) {
    const source = pages(); mutate(source[1]);
    assert.throws(() => assembleSnapshot(source), /incompatible/);
  }
  const timestamps = pages(); timestamps[1].environment.capturedAt = "later";
  assert.equal(assembleSnapshot(timestamps).catalogs[0].total, 3);
});

test("selected queries and different providers retain separate completeness", () => {
  const first = pages(), second = pages();
  for (const page of first) page.query = { type: "spell", offset: page.offset, limit: page.limit };
  for (const page of second) page.provider = "5e-activity-importer";
  const snapshot = assembleSnapshot([...first, ...second]);
  assert.equal(snapshot.catalogs.length, 2);
  const selected = snapshot.catalogs.find(catalog => catalog.provider === "5e-item-importer");
  assert.deepEqual(selected.query, { type: "spell" });
  assert.deepEqual(selected.completeness.selection, { type: "spell" });
  assert.equal(Object.hasOwn(selected.completeness, "allNativeFieldsKnown"), false);
});

test("empty selections are complete only with one valid terminal page", () => {
  const empty = { ...pages()[0], total: 0, fields: [], nextCursor: null, query: { path: "does-not-exist" } };
  assert.equal(assembleSnapshot(empty).catalogs[0].total, 0);
  assert.throws(() => assembleSnapshot([empty, empty]), /duplicated/);
  assert.throws(() => assembleSnapshot({ ...empty, formatVersion: 99 }), /Unsupported/);
});

test("envelopes reject errors and noncatalog text rather than hiding them", () => {
  assert.equal(unwrapCatalogPages({ results: [{ data: pages()[0] }] }).length, 1);
  assert.throws(() => unwrapCatalogPages({ isError: true, content: [] }), /error response/);
  assert.throws(() => unwrapCatalogPages({ content: [{ type: "text", text: "truncated" }] }), /valid catalog JSON/);
  assert.throws(() => unwrapCatalogPages({ mystery: pages()[0] }), /No native/);
});

test("snapshot comparison separates environments, native fields, types, variants and coverage", () => {
  const before = assembleSnapshot(pages()), after = clone(before), catalog = after.catalogs[0];
  catalog.catalogId = "native-2";
  catalog.environment.dnd5e = "5.4.0";
  catalog.types.push({ kind: "item", type: "new-native", importSupport: "catalog-only" });
  catalog.fields = catalog.fields.filter(entry => entry.id !== "formula");
  catalog.fields.push(field("added", { type: "new-native", variant: "configuration" }));
  const changed = catalog.fields.find(entry => entry.id === "prepared");
  changed.constraints.max = 3;
  changed.default.value = 1;
  changed.schemaChoices.values.push(3);
  changed.coverage.status = "needs-review";
  const diff = compareSnapshots(before, after);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.environmentChanges.length, 1);
  assert.equal(diff.types.added.length, 1);
  assert.equal(diff.variants.added.length, 1);
  assert.equal(diff.fields.added.length, 1);
  assert.equal(diff.fields.removed.length, 1);
  assert.deepEqual(diff.fields.changed[0].changes.map(entry => entry.property), ["constraints", "coverage", "default", "schemaChoices"]);
  assert.equal(diff.catalogChanges.added.length, 0);
});

test("translated labels and capture times are ignored, meaningful false and zero are retained", () => {
  const before = assembleSnapshot(pages()), after = clone(before);
  after.catalogs[0].environment.capturedAt = "tomorrow";
  after.catalogs[0].types[0].label = "Sort";
  after.catalogs[0].fields[0].sheet.label = "French";
  after.catalogs[0].completeness.capturedPages = 1;
  assert.equal(compareSnapshots(before, after).hasChanges, false);
  after.catalogs[0].fields[0].constraints.nullable = true;
  const diff = compareSnapshots(before, after);
  assert.equal(diff.fields.changed[0].changes[0].before.value.nullable, false);
  assert.equal(diff.fields.changed[0].changes[0].before.value.min, 0);
});

test("literal object defaults retain data keys that resemble translated metadata", () => {
  const before = assembleSnapshot(pages()), after = clone(before);
  before.catalogs[0].fields[0].default = { kind: "literal", value: { label: "stored one", timestamp: 1 } };
  after.catalogs[0].fields[0].default = { kind: "literal", value: { label: "stored two", timestamp: 2 } };
  const diff = compareSnapshots(before, after);
  assert.equal(diff.fields.changed.length, 1);
  assert.equal(diff.fields.changed[0].changes[0].after.value.value.label, "stored two");
});

test("unknown choices never become authoritative empty options and missing differs from null", () => {
  const before = assembleSnapshot(pages()), after = clone(before);
  const entry = after.catalogs[0].fields.find(value => value.id === "formula");
  entry.schemaChoices = { status: "literal", values: [] };
  entry.unknownContext = null;
  const changes = compareSnapshots(before, after).fields.changed[0].changes;
  assert.equal(changes[0].before.value.status, "unresolved");
  assert.deepEqual(changes[0].after.value.values, []);
  assert.deepEqual(changes[1].before, { present: false });
  assert.deepEqual(changes[1].after, { present: true, value: null });
});

test("reference rendering escapes table delimiters and preserves complete field metadata", () => {
  const source = pages(); source[0].fields[0].sheet = { label: "a|b\n<script>", default: false };
  source[0].fields[0].example = { empty: [], nullable: null, zero: 0, text: "" };
  delete source[1].fields[0].default;
  const markdown = renderMarkdown(assembleSnapshot(source));
  assert.ok(markdown.includes("a&#124;b"));
  assert.ok(markdown.includes("&lt;script&gt;"));
  assert.ok(markdown.includes('"nullable":null'));
  assert.ok(markdown.includes('"zero":0'));
  assert.ok(markdown.includes('"empty":[]'));
  assert.ok(markdown.includes('"status":"unresolved"'));
  assert.ok(markdown.includes("Not reported / unknown"));
  assert.ok(markdown.includes("Native field acceptance does not establish YAML importer support"));
});

test("invalid snapshot field identities and false completeness cannot be rendered", () => {
  const source = assembleSnapshot(pages());
  source.catalogs[0].fields[1].id = source.catalogs[0].fields[0].id;
  assert.throws(() => validateSnapshot(source), /field IDs/);
  const partial = assembleSnapshot(pages()); partial.catalogs[0].completeness.paginationComplete = false;
  assert.throws(() => renderMarkdown(partial), /incomplete/);
  const duplicateTypes = assembleSnapshot(pages()); duplicateTypes.catalogs[0].types.push(duplicateTypes.catalogs[0].types[0]);
  assert.throws(() => validateSnapshot(duplicateTypes), /type identities/);
});

test("CLI reads UTF-8 BOM MCP JSON, assembles, renders and diffs without overwriting inputs", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "native-field-report-test-"));
  const cli = fileURLToPath(new URL("./Field-Catalog.mjs", import.meta.url));
  try {
    const input = path.join(directory, "pages.json"), snapshot = path.join(directory, "snapshot.json");
    const report = path.join(directory, "reference.md");
    const text = "\uFEFF" + JSON.stringify({ results: pages() });
    await fs.writeFile(input, text);
    execFileSync(process.execPath, [cli, "assemble", input, "--out", snapshot], { stdio: "pipe" });
    execFileSync(process.execPath, [cli, "render", snapshot, "--out", report], { stdio: "pipe" });
    const diff = JSON.parse(execFileSync(process.execPath, [cli, "diff", snapshot, snapshot], { encoding: "utf8" }));
    assert.equal(diff.hasChanges, false);
    assert.match(await fs.readFile(report, "utf8"), /Native field catalog/);
    const denied = spawnSync(process.execPath, [cli, "assemble", input, "--out", input], { encoding: "utf8" });
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /overwrite an input/);
    assert.equal(await fs.readFile(input, "utf8"), text);
  } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("native-field-report-test-"));
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
