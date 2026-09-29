/** Source-only native schema discovery tests. Run through tools/Test-FieldCatalogCore.mjs. */
import { fieldCatalogId, toCatalogValue, createCatalogAccumulator, addCatalogModel, finishCatalog } from "../../scripts/fieldCatalogCore.js";

class DataField {
  constructor(options = {}) { this.options = options; Object.assign(this, options); }
  _validateType() {}
}
class StringField extends DataField {}
class NumberField extends DataField {}
class BooleanField extends DataField {}
class AnyField extends DataField {}
class ObjectField extends DataField {}
class SchemaField extends DataField {
  constructor(fields = {}, options = {}) { super(options); this.fields = fields; }
}
class ArrayField extends DataField {
  constructor(element, options = {}) { super(options); this.element = element; }
}
class SetField extends ArrayField {}
class TypedObjectField extends ArrayField {}
class MappingField extends TypedObjectField {}
class TypedSchemaField extends DataField {
  constructor(types) { super(); this.types = types; }
}
class EmbeddedCollectionField extends DataField {}
class EmbeddedDocumentField extends DataField {}
class TypeDataField extends DataField {}
class ActivityField extends DataField {}
class AdvancementField extends DataField {}
class AdvancementDataField extends DataField {}
class ScaleValueEntryField extends DataField {}
class FormulaField extends StringField {}
class DocumentIdField extends StringField {}
class ForeignDocumentField extends StringField {}
class DocumentUUIDField extends StringField {}
class MysteryField extends ObjectField {}
class RecursiveMysteryField extends DataField { static recursive = true; }
const fieldClasses = { DataField, StringField, NumberField, BooleanField, AnyField, ObjectField, SchemaField,
  ArrayField, SetField, TypedObjectField, MappingField, TypedSchemaField, EmbeddedCollectionField, EmbeddedDocumentField,
  TypeDataField, ActivityField, AdvancementField, AdvancementDataField, ScaleValueEntryField, FormulaField,
  DocumentIdField, ForeignDocumentField, DocumentUUIDField, MysteryField, RecursiveMysteryField };
function assert(value, message = "Assertion failed") { if (!value) throw new Error(message); }
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
function equal(actual, expected, message = "Values differ") {
  assert(JSON.stringify(ordered(actual)) === JSON.stringify(ordered(expected)), message + ": " + JSON.stringify(actual));
}
function installEnvironment(provider) {
  globalThis.foundry = { data: { fields: fieldClasses }, documents: {} };
  globalThis.CONFIG = {};
  globalThis.CONST = { BASE_DOCUMENT_TYPE: "base" };
  globalThis.game = {
    version: "14.367", system: { id: "dnd5e", version: "5.3.3" }, i18n: { lang: "en" },
    modules: new Map([[provider, { id: provider, version: "14.1.2", active: true }]])
  };
  globalThis.dnd5e = { settings: { rulesVersion: "2024" } };
}
function catalog(fields, extra = {}) {
  class ProbeData {}
  ProbeData.schema = new SchemaField(fields);
  const accumulator = createCatalogAccumulator("synthetic-provider");
  addCatalogModel(accumulator, { kind: "item", type: "weapon", model: ProbeData, prefix: "system", ...extra });
  return finishCatalog(accumulator);
}
const at = (result, path, variant = "") => {
  const record = result.fields.find(field => field.path === path && field.variant === variant);
  assert(record, "Missing field " + path + " variant " + variant);
  return record;
};

/** This deliberately supplies metadata classes only, never real world documents. */
function installNativeProviderModels() {
  class BaseItem {}
  BaseItem.schema = new SchemaField({ name: new StringField(), system: new TypeDataField(), effects: new EmbeddedCollectionField() });
  class ItemDataModel {}
  class WeaponData extends ItemDataModel {}
  WeaponData.schema = new SchemaField({ quantity: new NumberField({ integer: true, initial: 1 }),
    activities: new ActivityField(), advancement: new AdvancementField() });
  class BaseActivityData {}
  class AttackActivity extends BaseActivityData {}
  AttackActivity.metadata = { type: "attack", title: "Attack" };
  AttackActivity.schema = new SchemaField({ name: new StringField(), damage: new SchemaField({ critical: new NumberField({ initial: 20 }) }) });
  class OrderActivity extends BaseActivityData {}
  OrderActivity.metadata = { type: "order", title: "Order" };
  OrderActivity.schema = new SchemaField({ name: new StringField() });
  class Advancement {}
  class AdvancementConfiguration {}
  AdvancementConfiguration.schema = new SchemaField({ fixed: new NumberField({ initial: 0 }) });
  class HitPointsAdvancement extends Advancement {}
  HitPointsAdvancement.typeName = "HitPoints";
  HitPointsAdvancement.metadata = { dataModels: { configuration: AdvancementConfiguration }, validItemTypes: ["weapon"] };
  HitPointsAdvancement.schema = new SchemaField({ configuration: new AdvancementDataField() });
  class ScaleConfiguration {}
  ScaleConfiguration.schema = new SchemaField({ type: new StringField({ choices: ["number", "dice"] }) });
  class ScaleNumber {}
  ScaleNumber.schema = new SchemaField({ value: new NumberField() });
  class ScaleDice {}
  ScaleDice.schema = new SchemaField({ number: new NumberField(), faces: new NumberField() });
  class ScaleValueAdvancement extends Advancement {}
  ScaleValueAdvancement.typeName = "ScaleValue";
  ScaleValueAdvancement.metadata = { dataModels: { configuration: ScaleConfiguration }, validItemTypes: ["weapon"] };
  ScaleValueAdvancement.schema = new SchemaField({ configuration: new AdvancementDataField(), value: new ScaleValueEntryField() });
  class BaseActiveEffect {}
  BaseActiveEffect.schema = new SchemaField({ name: new StringField(), system: new TypeDataField(), statuses: new SetField(new StringField()) });
  class ActiveEffect5e extends BaseActiveEffect {}
  class ActiveEffectTypeDataModel {}
  ActiveEffectTypeDataModel.schema = new SchemaField();
  class EnchantmentData {}
  EnchantmentData.schema = new SchemaField({ magicalBonus: new NumberField({ initial: 0 }) });
  Object.assign(globalThis.foundry.documents, { BaseItem, BaseActiveEffect });
  globalThis.foundry.data.ActiveEffectTypeDataModel = ActiveEffectTypeDataModel;
  globalThis.game.system._source = { documentTypes: { Item: { weapon: {}, backpack: {} }, ActiveEffect: { enchantment: {} } } };
  Object.assign(globalThis.dnd5e, {
    dataModels: { abstract: { ItemDataModel }, item: { WeaponData }, activity: { BaseActivityData },
      activeEffect: { EnchantmentData }, advancement: { scaleValue: { TYPES: { number: ScaleNumber, dice: ScaleDice } } } },
    documents: { Item5e: BaseItem, ActiveEffect5e, activity: { AttackActivity, OrderActivity },
      advancement: { Advancement, HitPointsAdvancement, ScaleValueAdvancement } }
  });
  globalThis.CONFIG = {
    Item: { dataModels: { weapon: WeaponData } },
    ActiveEffect: { documentClass: ActiveEffect5e, dataModels: { base: ActiveEffectTypeDataModel, enchantment: EnchantmentData } },
    DND5E: { activityTypes: { attack: { documentClass: AttackActivity }, order: { documentClass: OrderActivity } },
      advancementTypes: { HitPoints: { documentClass: HitPointsAdvancement, validItemTypes: ["weapon"] },
        ScaleValue: { documentClass: ScaleValueAdvancement, validItemTypes: ["weapon"] } } }
  };
  return { WeaponData, AttackActivity };
}

export function runFieldCatalogCoreTests({ provider, discover }) {
  if (globalThis.__fieldCatalogTestSandbox !== true) throw new Error("Run this suite only in its isolated source-test VM.");
  const results = [];
  const run = (name, callback) => {
    installEnvironment(provider);
    try { callback(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  };
  run("literal defaults retain false, zero, null, arrays and objects", () => {
    const result = catalog({ flag: new BooleanField({ initial: false }), count: new NumberField({ initial: 0 }),
      any: new AnyField({ initial: null, nullable: true }), list: new AnyField({ initial: [] }),
      data: new AnyField({ initial: { enabled: false, count: 0 } }) });
    for (const [name, value] of [["flag", false], ["count", 0], ["any", null], ["list", []], ["data", { enabled: false, count: 0 }]]) {
      equal(at(result, "system." + name).default, { kind: "literal", value });
    }
  });
  run("default, choice, validation and future-option callbacks are described without execution", () => {
    let calls = 0;
    const callback = () => { calls++; throw new Error("must not run"); };
    const result = catalog({ dynamic: new StringField({ initial: callback, choices: callback, validate: callback,
      customFutureConstraint: { limit: 6, callback } }) });
    const record = at(result, "system.dynamic");
    equal(record.default.kind, "dynamic"); equal(record.schemaChoices.status, "dynamic");
    equal(record.declaredOptions.customFutureConstraint.limit, 6);
    assert(record.validation.custom); equal(calls, 0);
  });
  run("nested schemas, arrays, sets and keyed mappings expose their child paths", () => {
    const result = catalog({ nested: new SchemaField({ enabled: new BooleanField() }),
      parts: new ArrayField(new SchemaField({ formula: new FormulaField() })),
      statuses: new SetField(new StringField()), values: new TypedObjectField(new NumberField()) });
    equal(at(result, "system.parts").structure.kind, "array");
    equal(at(result, "system.statuses").structure.kind, "set");
    equal(at(result, "system.values").structure.kind, "mapping");
    at(result, "system.nested.enabled"); at(result, "system.statuses[*]"); at(result, "system.values.{key}");
    const handle = result.handles.get(at(result, "system.parts[*].formula").id);
    equal(handle.pathSegments, ["parts", "*", "formula"]); equal(handle.contextSourcePrefix, "system");
    assert(handle.contextRequired);
  });
  run("finite mapping initialization keys expose concrete probes and retain generic stored keys", () => {
    const result = catalog({ currency: new MappingField(new NumberField({ min: 0, initial: 0 }),
      { initialKeysOnly: true, initialKeys: { cp: "Copper", gp: "Gold", sp: "Silver", "a.b": "Literal dot" } }) });
    const root = at(result, "system.currency");
    equal(root.structure.kind, "mapping");
    equal(root.structure.keys, ["a.b", "cp", "gp", "sp"]);
    equal(root.structure.initializedKeysOnly, true);
    equal(root.structure.keyRestrictionPhase, "initialization");
    assert(root.structure.sourceKeyConstraint.includes("does not itself reject"));
    assert(!Object.hasOwn(root.structure, "allowAdditionalKeys"), "Initialization keys must not imply a source-key rejection rule");
    const copper = result.handles.get(at(result, "system.currency.cp").id);
    equal(copper.pathSegments, ["currency", "cp"]);
    equal(copper.contextSourcePrefix, "system");
    equal(copper.contextRequired, false);
    const generic = result.handles.get(at(result, "system.currency.{key}").id);
    equal(generic.contextRequired, true);
    const literal = at(result, 'system.currency["a.b"]');
    equal(result.handles.get(literal.id).pathSegments, ["currency", "a.b"]);
    assert(!result.fields.some(field => field.path === "system.currency.a.b"));
  });
  run("dynamic mapping keys are unresolved without callback execution", () => {
    let calls = 0;
    const result = catalog({
      dynamic: new MappingField(new StringField(), { initialKeysOnly: true, initialKeys() { calls++; return ["a"]; } }),
      invalid: new MappingField(new StringField(), { initialKeysOnly: true, initialKeys: 42 }),
      empty: new MappingField(new StringField(), { initialKeysOnly: true, initialKeys: [] })
    });
    equal(calls, 0);
    for (const key of ["dynamic", "invalid"]) {
      const record = at(result, "system." + key);
      equal(record.classification, "unresolved"); equal(record.structure.complete, false);
      assert(result.diagnostics.some(entry => entry.code === "unresolved-mapping-keys" && entry.fieldId === record.id));
    }
    equal(at(result, "system.empty").structure.keys, []);
    at(result, "system.empty.{key}");
  });
  run("typed variants use separate stable IDs even where native paths match", () => {
    const result = catalog({ variant: new TypedSchemaField({
      alpha: new SchemaField({ value: new NumberField() }), beta: new SchemaField({ value: new StringField() })
    }) });
    const values = result.fields.filter(field => field.path === "system.variant.value");
    equal(values.length, 2); assert(values[0].id !== values[1].id);
    equal(new Set(values.map(field => field.variant)).size, 2);
    assert(values.every(field => result.handles.get(field.id).contextRequired));
    equal(fieldCatalogId("item", "weapon", "a/b", "x"), "item/weapon/x/a%2Fb");
  });
  run("embedded documents are references instead of recursive world document reads", () => {
    let reads = 0;
    class MustNotReadDocument { static get schema() { reads++; throw new Error("document read"); } }
    const result = catalog({ effects: new EmbeddedCollectionField({ model: MustNotReadDocument }),
      parent: new EmbeddedDocumentField({ model: MustNotReadDocument }) });
    equal(at(result, "system.effects").structure.reference, { kind: "effect" });
    equal(at(result, "system.parent").structure.kind, "embedded-documents");
    equal(result.fields.length, 2); equal(reads, 0);
  });
  run("cyclic schemas terminate at explicit unresolved boundaries", () => {
    const recursive = new SchemaField(); recursive.fields.self = recursive;
    const result = catalog({ recursive });
    assert(result.fields.length < 5);
    const boundary = at(result, "system.recursive.self");
    equal(boundary.classification, "unresolved"); assert(!boundary.structure.complete);
    assert(result.diagnostics.some(entry => entry.code === "recursive-schema-boundary"));
  });
  run("open and unknown custom fields remain distinguishable", () => {
    const result = catalog({ flags: new ObjectField(), typedValue: new AnyField(),
      mystery: new MysteryField(), recursive: new RecursiveMysteryField() });
    equal(at(result, "system.flags").classification, "metadata");
    equal(at(result, "system.flags").structure.kind, "open-object");
    equal(at(result, "system.typedValue").structure.kind, "any-value");
    equal(at(result, "system.mystery").classification, "unresolved");
    equal(at(result, "system.recursive").classification, "unresolved");
    assert(result.diagnostics.filter(entry => entry.code === "unresolved-custom-field").length === 2);
  });
  run("adapter references and schema children retain parent context and explicit completeness", () => {
    const result = catalog({ activities: new ActivityField(), custom: new MysteryField() }, {
      adapter(field) {
        if (field instanceof ActivityField) return { contextRequired: true,
          structure: { kind: "catalog-reference", complete: true, references: [{ kind: "activity", type: "attack" }] } };
        if (field instanceof MysteryField) return { structure: { kind: "schema", complete: true },
          children: [{ field: new NumberField(), segments: ["count"], variant: "kind=custom" }] };
        return null;
      }
    });
    equal(at(result, "system.activities").structure.references, [{ kind: "activity", type: "attack" }]);
    assert(result.handles.get(at(result, "system.activities").id).contextRequired);
    at(result, "system.custom.count", "kind=custom");
  });
  run("adapter failures and unavailable root schemas produce explicit diagnostics", () => {
    const result = catalog({ mystery: new MysteryField() }, { adapter() { throw new Error("missing native variant"); } });
    assert(result.diagnostics.some(entry => entry.code === "field-adapter-failed"));
    assert(!at(result, "system.mystery").structure.complete);
    class MissingModel { static get schema() { throw new Error("schema unavailable"); } }
    const acc = createCatalogAccumulator(provider);
    addCatalogModel(acc, { kind: "item", type: "future", model: MissingModel });
    equal(acc.types[0].importSupport, "catalog-only");
    assert(acc.diagnostics.some(entry => entry.code === "schema-unavailable"));
  });
  run("metadata conversion never evaluates getters and retains sparse/undefined values", () => {
    let calls = 0;
    const value = { get dynamic() { calls++; return 1; } };
    equal(toCatalogValue(value).dynamic.reason, "accessor-not-evaluated"); equal(calls, 0);
    const sparse = []; sparse[1] = undefined;
    equal(toCatalogValue(sparse), [{ kind: "array-hole" }, { kind: "undefined" }]);
    const cyclic = {}; cyclic.self = cyclic;
    equal(toCatalogValue(cyclic).self.reason, "cyclic-metadata");
    equal(toCatalogValue(new Map([["key", false]])).entries, [["key", false]]);
    equal(toCatalogValue(new Set([0, null])).values, [0, null]);
  });
  run("choice constraints retain declared values while unknown sources remain unresolved", () => {
    const result = catalog({ defined: new StringField({ choices: { none: "None", amount: "Amount" } }),
      empty: new StringField({ choices: [] }), absent: new StringField(),
      unknown: new StringField({ choices: 42 }), decimal: new NumberField({ min: 0, step: 0.25, integer: false }) });
    equal(at(result, "system.defined").schemaChoices.values.map(entry => entry.value), ["amount", "none"]);
    equal(at(result, "system.empty").schemaChoices.values, []);
    equal(at(result, "system.absent").schemaChoices.status, "not-declared");
    equal(at(result, "system.unknown").schemaChoices.status, "unresolved");
    equal(at(result, "system.decimal").constraints.step, 0.25);
    equal(at(result, "system.decimal").constraints.integer, false);
  });
  run("formula, IDs, references and nonpersisted state advertise their limits", () => {
    const result = catalog({ formula: new FormulaField({ deterministic: true }), id: new DocumentIdField(),
      uuid: new DocumentUUIDField(), actor: new ForeignDocumentField(), computed: new NumberField({ persisted: false }) });
    assert(at(result, "system.formula").constraints.formulaContext.includes("variables"));
    assert(at(result, "system.formula").constraints.deterministic);
    assert(at(result, "system.id").constraints.documentId);
    equal(at(result, "system.uuid").classification, "relationship");
    equal(at(result, "system.actor").classification, "relationship");
    equal(at(result, "system.computed").classification, "non-persisted");
  });
  run("repeated discovery produces stable unique types, fields and JSON-safe metadata", () => {
    const fields = { second: new StringField(), first: new NumberField() };
    const first = catalog(fields), second = catalog(fields);
    equal(first.fields, second.fields);
    equal(first.types, second.types);
    equal(new Set(first.fields.map(field => field.id)).size, first.fields.length);
    const { handles, ...serializable } = first;
    JSON.parse(JSON.stringify(serializable));
    assert(handles instanceof Map);
  });
  run("native provider works with its companion missing or inactive without touching world collections", () => {
    installNativeProviderModels();
    let reads = 0;
    for (const key of ["actors", "items", "scenes", "packs"]) Object.defineProperty(globalThis.game, key, {
      configurable: true, get() { reads++; throw new Error("world collection must not be read"); }
    });
    const missing = discover();
    const companion = provider === "5e-item-importer" ? "5e-activity-importer" : "5e-item-importer";
    globalThis.game.modules.set(companion, { id: companion, version: "14.1.2", active: false });
    const inactive = discover();
    equal(missing.fields, inactive.fields); equal(missing.types, inactive.types);
    assert(missing.fields.length > 0); equal(reads, 0);
    if (provider === "5e-item-importer") {
      assert(missing.types.some(type => type.kind === "item" && type.type === "weapon"));
      assert(!missing.types.some(type => type.type === "backpack"));
      assert(missing.types.some(type => type.kind === "advancement" && type.type === "ScaleValue"));
      assert(missing.fields.some(field => field.variant === "configuration.type=dice"));
    } else {
      assert(missing.types.some(type => type.kind === "activity" && type.type === "attack"));
      assert(missing.types.some(type => type.type === "order" && type.importSupport === "catalog-only"));
      assert(missing.types.some(type => type.kind === "effect" && type.type === "enchantment"));
    }
  });
  run("module registry overrides and extensions are disclosed rather than treated as native models", () => {
    const { WeaponData, AttackActivity } = installNativeProviderModels();
    class ReplacedWeapon extends WeaponData {}
    ReplacedWeapon.schema = new SchemaField({ extensionCounter: new NumberField() });
    class ReplacedAttack extends AttackActivity {}
    ReplacedAttack.schema = new SchemaField({ extensionCounter: new NumberField() });
    globalThis.CONFIG.Item.dataModels.weapon = ReplacedWeapon;
    globalThis.CONFIG.Item.dataModels.custom = ReplacedWeapon;
    globalThis.CONFIG.DND5E.activityTypes.attack.documentClass = ReplacedAttack;
    globalThis.CONFIG.DND5E.activityTypes.custom = { documentClass: ReplacedAttack };
    const result = discover();
    assert(result.environment.modelOverrides.length > 0);
    assert(!result.fields.some(field => field.path.includes("extensionCounter")));
    assert(!result.types.some(type => type.type === "custom"));
    const code = provider === "5e-item-importer" ? "runtime-item-extension" : "runtime-activity-extension";
    assert(result.diagnostics.some(entry => entry.code === code));
  });
  return { provider, total: results.length, passed: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed).length, results };
}
