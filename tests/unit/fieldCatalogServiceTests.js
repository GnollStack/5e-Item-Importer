import { createFieldCatalogService, stableCatalogString } from "../../scripts/fieldCatalogService.js";

export function runFieldCatalogServiceTests() {
  const tests = [];
  const check = (name, fn) => {
    try { fn(); tests.push({ name, passed: true, pass: true }); }
    catch (error) { tests.push({ name, passed: false, pass: false, error: error.message }); }
  };
  const assert = (condition, message = "Assertion failed") => { if (!condition) throw new Error(message); };
  let version = "5.3.3";
  let defaultCalls = 0;
  const number = {
    initial: () => { defaultCalls++; return 3; },
    validate(value) { if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) throw new Error("nonnegative number required"); },
    clean(value) { if (value === undefined) return this.initial(); return value === "" ? null : value === null ? null : Number(value); }
  };
  const any = { validate() {}, clean(value) { return typeof value === "string" ? value.trim() : value; } };
  const types = [{ kind: "item", type: "weapon", modelClass: "WeaponData", importSupport: "supported" }];
  const fields = Array.from({ length: 205 }, (_, i) => ({ id: "item/weapon/field" + String(i).padStart(3, "0"),
    kind: "item", type: "weapon", path: "system.field" + i, variant: "", fieldClass: "NumberField", classification: "field",
    schemaChoices: { status: "known", values: Array.from({ length: 260 }, (_, n) => n) }, default: { kind: "dynamic" } }));
  const handles = new Map(fields.map(field => [field.id, { field: number, model: null, rootSchema: null,
    pathSegments: ["value"], kind: field.kind, type: field.type, path: field.path }]));
  handles.get(fields[1].id).field = any;
  const service = createFieldCatalogService({ provider: "test-provider",
    discover: () => ({ types, fields: structuredClone(fields), handles, environment: { system: { version } }, diagnostics: [] }),
    decorate: rows => rows.map(field => ({ ...field, sheet: { status: "unreviewed" }, coverage: { status: "declared", yamlLocations: ["VALUE"] } })) });

  check("catalog pages preserve complete field and option lists", () => {
    let page = service.getFieldCatalog({ limit: 100 });
    const ids = [], firstId = page.catalogId;
    do {
      assert(page.success, JSON.stringify(page.errors));
      assert(page.catalogId === firstId);
      ids.push(...page.fields.map(field => field.id));
      assert(page.fields.every(field => field.schemaChoices.values.length === 260));
      page = page.nextCursor ? service.getFieldCatalog({ limit: 100, cursor: page.nextCursor }) : null;
    } while (page);
    assert(ids.length === 205 && new Set(ids).size === 205);
    assert(defaultCalls === 0, "Discovery must not execute generated defaults");
  });
  check("catalog rejects stale or mismatched cursors", () => {
    const cursor = service.getFieldCatalog().nextCursor;
    assert(!service.getFieldCatalog({ cursor, query: "field1" }).success);
    version = "5.3.4";
    assert(!service.getFieldCatalog({ cursor }).success);
    version = "5.3.3";
  });
  check("catalog queries and identities cannot invoke arbitrary paths", () => {
    assert(service.getFieldCatalog({ query: "VALUE", status: "declared" }).total === 205);
    assert(service.getFieldCatalog({ type: "spell" }).total === 0);
    assert(!service.getFieldDetails({ fieldId: "game.items" }).success);
    assert(!service.probeFieldValues({ fieldId: "game.items.create", values: [1] }).success);
    assert(!service.getFieldCatalog({ limit: 1000 }).success);
    const hostile = JSON.parse('{"__proto__":{"polluted":true}}');
    assert(!service.getFieldCatalog(hostile).success);
    assert({}.polluted === undefined);
  });
  check("probes distinguish raw rejection, cleaning, null and missing", () => {
    const result = service.probeFieldValues({ fieldId: fields[0].id, values: [2, "2", -1, 1.5, null, false, ""], includeMissing: true });
    assert(result.success);
    assert(result.results[0].raw.valid && !result.results[0].cleaning.changed);
    assert(!result.results[1].raw.valid && result.results[1].cleaning.after.value === 2);
    assert(!result.results[2].raw.valid && !result.results[2].cleaning.validation.valid);
    assert(result.results[3].raw.valid && result.results[4].submitted.value === null);
    assert(result.results[5].submitted.value === false);
    assert(result.results[6].cleaning.after.value === null);
    assert(result.results[7].submitted.present === false && result.results[7].cleaning.status === "incomplete");
    assert(result.results.every(row => row.contextual.status === "incomplete"));
    assert(defaultCalls === 0);
  });
  check("probes preserve typed values and never mutate submitted objects", () => {
    const input = { fieldId: fields[1].id, values: [0, false, [], {}, null, { a: [false, 0, null] }, " text "] };
    const before = JSON.stringify(input);
    const report = service.probeFieldValues(input);
    assert(report.success);
    assert(JSON.stringify(input) === before);
    assert(report.results[5].cleaning.after.value.a[0] === false);
    assert(report.results[6].cleaning.after.value === "text");
  });
  check("context validation changes a clone and reports running-world scope", () => {
    const handle = handles.get(fields[0].id);
    handle.model = { name: "WeaponData", cleanData: data => { data.value = Number(data.value); return data; }, validateJoint() {} };
    handle.rootSchema = { validate(data) { number.validate(data.value); } };
    handle.contextSourcePrefix = "system";
    const context = { source: { name: "Untouched", system: { value: 2 } } };
    const before = JSON.stringify(context);
    const result = service.probeFieldValues({ fieldId: fields[0].id, values: ["4", -2], context });
    assert(result.success && result.results[0].contextual.valid);
    assert(result.results[0].contextual.after.value === 4 && result.results[0].contextual.changed);
    assert(result.results[0].contextual.scope === "running-world");
    assert(!result.results[1].contextual.valid && JSON.stringify(context) === before);
    handle.model = null; handle.rootSchema = null;
  });
  check("details retain large metadata and snapshots are stable", () => {
    const a = service.getFieldCatalog({ limit: 200 }), b = service.getFieldCatalog({ limit: 200 });
    assert(stableCatalogString(a) === stableCatalogString(b));
    assert(service.getFieldDetails({ fieldId: fields[0].id }).field.schemaChoices.values.length === 260);
  });
  check("document contexts validate known system models rather than skipping TypeDataField", () => {
    const handle = handles.get(fields[0].id);
    const TypeDataField = class TypeDataField {};
    handle.contextSourcePrefix = "";
    handle.pathSegments = ["name"];
    handle.model = { name: "BaseItem", cleanData: data => data };
    handle.rootSchema = { fields: { system: new TypeDataField() }, validate() {} };
    handle.additionalModelSchemas = [{ prefix: "system", model: { cleanData: data => data }, schema: { validate: data => number.validate(data.value) } }];
    const good = service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { type: "weapon", name: 1, system: { value: 2 } } } });
    const bad = service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { type: "weapon", name: 1, system: { value: -1 } } } });
    assert(good.results[0].contextual.valid && !bad.results[0].contextual.valid);
    handle.additionalModelSchemas = [];
    assert(service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { type: "weapon", system: { value: 2 } } } }).results[0].contextual.status === "incomplete");
    handle.model = null; handle.rootSchema = null;
  });
  check("wildcard and parent-dependent contexts stay explicitly incomplete", () => {
    const handle = handles.get(fields[0].id);
    handle.model = { name: "Model" }; handle.rootSchema = {};
    handle.contextRequired = true;
    let report = service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { value: 1 } } });
    assert(report.results[0].contextual.status === "incomplete");
    handle.contextRequired = false;
    report = service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { value: 1 }, parent: { type: "weapon" } } });
    assert(report.results[0].contextual.status === "incomplete" && report.results[0].contextual.reason.includes("Parent"));
    handle.model = null; handle.rootSchema = null;
  });
  check("inserted nested activities and mismatched source types cannot bypass contextual checks", () => {
    const handle = handles.get(fields[0].id);
    const ActivityField = class ActivityField {};
    let cleaned = false;
    handle.contextSourcePrefix = ""; handle.contextRequired = false;
    handle.pathSegments = ["activities"];
    handle.rootSchema = { fields: { activities: { element: new ActivityField() } }, validate() {} };
    handle.model = { name: "WeaponData", cleanData: value => { cleaned = true; return value; } };
    const nested = service.probeFieldValues({ fieldId: fields[0].id, values: [{ bad: { type: "attack", _id: "bad" } }], context: { source: { type: "weapon", activities: {} } } });
    assert(nested.results[0].contextual.status === "incomplete" && !cleaned);
    handle.contextSourcePrefix = "system"; handle.pathSegments = ["value"];
    handle.rootSchema = { fields: {}, validate() {} };
    const mismatch = service.probeFieldValues({ fieldId: fields[0].id, values: [1], context: { source: { type: "spell", system: { value: 1 } } } });
    assert(mismatch.results[0].contextual.status === "incomplete" && mismatch.results[0].contextual.reason.includes("type"));
    handle.model = null; handle.rootSchema = null;
  });
  return { success: tests.every(test => test.passed), passed: tests.filter(test => test.passed).length,
    failed: tests.filter(test => !test.passed).length, tests };
}
