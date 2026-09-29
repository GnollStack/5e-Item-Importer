import { EXPLICIT_ITEM_FIELDS } from "./itemExplicitFields.js";

/**
 * Reviewed YAML coverage annotations, separate from the discovered native contract.
 * These declarations are not validation results and never enable importer support.
 */
const OWNER = "5e-item-importer";
const VERIFIED_VERSION = "5.3.3";
const SUPPORTED = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"];
const PHYSICAL = SUPPORTED.filter(type => type !== "spell");
const EQUIPPABLE = PHYSICAL.filter(type => type !== "loot");
const USABLE = ["weapon", "equipment", "consumable", "tool", "spell"];
const REFERENCE = "docs/explicit-yaml-v2.md";
const PARSER = "scripts/strictItemParsers/yamlItemParser.js";
const EXPLICIT_TESTS = "tests/unit/explicitYamlTests.js";
const STAGES = ["parse", "build", "export", "template", "preview", "comparison"];
const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const DAMAGE_FIELDS = [
  ["number", "Dice Count", "nullable non-negative integer"],
  ["denomination", "Die Denomination", "nullable non-negative integer"],
  ["bonus", "Bonus", "formula string"],
  ["types", "Damage Types", "list of registered damage/healing identifiers"],
  ["custom.enabled", "Custom Enabled", "boolean"],
  ["custom.formula", "Custom Formula", "formula string"],
  ["scaling.mode", "Scaling Mode", "none | whole | half"],
  ["scaling.number", "Scaling Dice Count", "nullable non-negative integer"],
  ["scaling.formula", "Scaling Formula", "formula string"]
];
const mappings = [];
function add(types, path, yaml, representation = "native YAML scalar", options = {}) {
  mappings.push({ types, path, yaml: Array.isArray(yaml) ? yaml : [yaml], representation, ...options });
}
function addGroup(types, prefix, section, entries, options = {}) {
  for (const [key, label, representation = "native YAML scalar"] of entries)
    add(types, prefix + key, section + label, representation, options);
}
const KIND_REPRESENTATIONS = {
  string: "text", nullableText: "text or null", integer: "exact integer or documented nullable input",
  number: "exact finite number or documented nullable input", formula: "formula string or numeric shorthand",
  boolean: "boolean", prepared: "unprepared | prepared | always | 0 | 1 | 2 | legacy boolean",
  method: "native method identifier", attunement: "none | required | optional", cover: "none | half | threequarters | total | number from 0 to 1"
};
for (const descriptor of EXPLICIT_ITEM_FIELDS) {
  add(descriptor.types, descriptor.path, descriptor.section + "." + descriptor.label,
    KIND_REPRESENTATIONS[descriptor.kind] ?? descriptor.kind, {
      implementation: "scripts/itemExplicitFields.js",
      evidence: [{ file: EXPLICIT_TESTS, test: "<item type> identity, source, state and native controls", status: "referenced" }]
    });
}
add(SUPPORTED, "name", "ITEM.Name", "required text");
add(PHYSICAL, "system.quantity", "INVENTORY.Quantity", "exact non-negative integer", {
  conditions: ["Container imports use quantity 1; quantity is not a free container control."],
  conversions: ["Container quantity is fixed to 1 by the existing builder."]
});
add(PHYSICAL, "system.rarity", "ITEM.Rarity", "native rarity identifier");
addGroup(PHYSICAL, "system.weight.", "COST_AND_WEIGHT.", [["value", "Weight Value", "non-negative finite number"], ["units", "Weight Units", "native weight unit identifier"]]);
addGroup(PHYSICAL, "system.price.", "COST_AND_WEIGHT.", [["value", "Price Value", "non-negative finite number"], ["denomination", "Price Denomination", "native currency identifier"]]);
add(PHYSICAL, "system.identified", "INVENTORY.Identified", "boolean");
add(EQUIPPABLE, "system.equipped", "INVENTORY.Equipped", "boolean");
addGroup(PHYSICAL, "system.unidentified.", "UNIDENTIFIED_DESCRIPTION.", [["name", "Unidentified Name", "text"], ["description", "Unidentified Description", "text"]]);
for (const [type, label] of [["weapon", "Weapon"], ["equipment", "Equipment"], ["consumable", "Consumable"], ["tool", "Tool"], ["loot", "Loot"]])
  add([type], "system.type.value", "ITEM." + label + " Type", "native type identifier");
for (const [type, label] of [["weapon", "Weapon"], ["equipment", "Equipment"], ["tool", "Tool"]])
  add([type], "system.type.baseItem", "ITEM.Base " + label, "native base-item identifier or blank");
add(["weapon"], "system.range.units", "RANGE.Range Units", "native distance unit identifier");
add(["weapon"], "system.mastery", "MASTERY.Mastery", "native mastery identifier or blank");
add(["weapon", "equipment"], "system.proficient", "PROFICIENCY.Proficient", "Automatic/null or native 0/1");
add(["tool"], "system.proficient", "ABILITY_CHECK.Proficient", "Automatic/null or 0, 0.5, 1, 2", {
  conversions: ["The native 1.5 value is not supported by the current YAML parser; it warns and uses Automatic."]
});
add(["tool"], "system.ability", "ABILITY_CHECK.Ability", "native ability identifier");
add(["tool"], "system.bonus", "PROPERTIES.Tool Bonus", "formula string");
add(["spell"], "system.level", "ITEM.Level", "integer from 0 to 9");
add(["spell"], "system.ability", "ITEM.Ability", "native ability identifier or blank");
addGroup(["spell"], "system.activation.", "ACTIVATION.", [["type", "Type", "native activation identifier"], ["value", "Value", "non-negative integer"], ["condition", "Condition", "text"]]);
addGroup(["container"], "system.capacity.", "CAPACITY.", [
  ["count", "Item Count", "nullable non-negative integer"],
  ["weight.value", "Weight Capacity Value", "nullable non-negative finite number"], ["weight.units", "Weight Capacity Units", "native unit identifier"],
  ["volume.value", "Volume Capacity Value", "nullable non-negative finite number"], ["volume.units", "Volume Capacity Units", "native unit identifier"]
]);
addGroup(["container"], "system.currency.", "CURRENCY_CONTENTS.", [["pp", "Platinum"], ["gp", "Gold"], ["ep", "Electrum"], ["sp", "Silver"], ["cp", "Copper"]].map(([key, label]) => [key, label, "non-negative integer"]));
addGroup(USABLE, "system.uses.", "USAGE.", [["spent", "Uses Spent", "non-negative integer"], ["max", "Uses Max", "formula string"]]);
add(USABLE, "system.uses.spent", "USAGE.Uses Spent", "non-negative integer", {
  aliases: ["USAGE.Uses Current"],
  conversions: ["Legacy Uses Current means remaining uses and is converted to spent = maximum - current, with a warning."]
});
addGroup(USABLE, "system.uses.recovery[].", "RECOVERY[].", [["period", "Period", "native recovery period identifier"], ["type", "Type", "native recovery type identifier"], ["formula", "Formula", "formula string"]]);
add(["consumable"], "system.uses.autoDestroy", "USAGE.Destroy on Empty", "boolean");
add(["consumable"], "system.type.subtype", "ITEM.Consumable Subtype", "native subtype identifier or blank", {
  aliases: ["AMMUNITION_PROPERTIES.Ammunition Type", "POISON_PROPERTIES.Poison Type"],
  conversions: ["Ammunition/poison labels are type-specific legacy aliases."]
});
const PROPERTY_LABELS = {
  weapon: { ada: "Adamantine", amm: "Ammunition", fin: "Finesse", fir: "Firearm", foc: "Focus", hvy: "Heavy", lgt: "Light", lod: "Loading", rch: "Reach", rel: "Reload", ret: "Returning", sil: "Silvered", spc: "Special", thr: "Thrown", two: "Two-Handed", ver: "Versatile" },
  equipment: { ada: "Adamantine", foc: "Focus", stealthDisadvantage: "Stealth Disadvantage" },
  tool: { foc: "Focus" }, loot: {}, container: { weightlessContents: "Weightless Contents" }, consumable: {}
};
for (const type of PHYSICAL) {
  const labels = { ...PROPERTY_LABELS[type], mgc: "Magical", gear: "NPC Equipment" };
  add([type], "system.properties", Object.values(labels).map(label => "PROPERTIES." + label), "independent booleans mapped to Set membership", {
    members: Object.entries(labels).map(([id, label]) => ({ id, yaml: "PROPERTIES." + label })),
    conversions: ["True adds its native property identifier; explicit false removes only that property."],
    conditions: ["Property checkboxes are filtered by item type and owning actor; stored inactive membership is retained."]
  });
}
add(["consumable"], "system.properties", ["AMMUNITION_PROPERTIES.Adamantine", "AMMUNITION_PROPERTIES.Silvered", "AMMUNITION_PROPERTIES.Returning", "SCROLL_PROPERTIES.Concentration", "SCROLL_PROPERTIES.Somatic", "SCROLL_PROPERTIES.Vocal", "SCROLL_PROPERTIES.Ritual"], "independent property booleans", {
  members: [{id:"ada",yaml:"AMMUNITION_PROPERTIES.Adamantine"},{id:"sil",yaml:"AMMUNITION_PROPERTIES.Silvered"},{id:"ret",yaml:"AMMUNITION_PROPERTIES.Returning"},{id:"concentration",yaml:"SCROLL_PROPERTIES.Concentration"},{id:"somatic",yaml:"SCROLL_PROPERTIES.Somatic"},{id:"vocal",yaml:"SCROLL_PROPERTIES.Vocal"},{id:"ritual",yaml:"SCROLL_PROPERTIES.Ritual"}],
  aliases: ["SCROLL_PROPERTIES.Verbal"],
  conversions: ["Legacy Verbal maps to Vocal with a warning."],
  evidence: [{ file: EXPLICIT_TESTS, test: "Consumable stored properties survive a subtype change", status: "referenced" }]
});
add(["spell"], "system.properties", ["COMPONENTS.Vocal", "COMPONENTS.Somatic", "COMPONENTS.Material", "COMPONENTS.Ritual", "DURATION.Concentration"], "independent booleans mapped to Set membership", {
  members: [{id:"vocal",yaml:"COMPONENTS.Vocal"},{id:"somatic",yaml:"COMPONENTS.Somatic"},{id:"material",yaml:"COMPONENTS.Material"},{id:"ritual",yaml:"COMPONENTS.Ritual"},{id:"concentration",yaml:"DURATION.Concentration"}]
});
for (const [types, native, yaml] of [[["weapon", "consumable"], "system.damage.base.", "DAMAGE.DAMAGE_DATA."], [["weapon"], "system.damage.versatile.", "VERSATILE_DAMAGE.DAMAGE_DATA."]]) {
  for (const [path, label, representation] of DAMAGE_FIELDS) {
    add(types, native + path, yaml + label, representation, {
      conversions: ["DAMAGE_DATA cannot be combined with populated formula shorthand for the same damage value.", ...(path === "scaling.mode" ? ["YAML none maps to the native empty string."] : [])],
      evidence: [{ file: EXPLICIT_TESTS, test: "<item type> identity, source, state and native controls", status: "referenced" }]
    });
  }
}
add(["consumable"], "system.damage.replace", "DAMAGE.Replace", "boolean", { aliases: ["AMMUNITION_PROPERTIES.Damage Replace"] });
add(["weapon", "consumable"], "system.damage.base", "DAMAGE.DAMAGE_DATA", "mapping of nine explicit damage leaves", {
  aliases: ["DAMAGE.Damage Formula", "DAMAGE.Damage Type"],
  conversions: ["Formula/type aliases are legacy shorthand, accepted only when explicit DAMAGE_DATA is absent; ammunition aliases apply only to Consumable."]
});
add(["consumable"], "system.damage.base", "DAMAGE.DAMAGE_DATA", "mapping of nine explicit damage leaves", {
  aliases: ["AMMUNITION_PROPERTIES.Damage Formula", "AMMUNITION_PROPERTIES.Damage Type"]
});
add(["weapon"], "system.damage.versatile", "VERSATILE_DAMAGE.DAMAGE_DATA", "mapping of nine explicit damage leaves", {
  aliases: ["VERSATILE_DAMAGE.Versatile Formula", "VERSATILE_DAMAGE.Versatile Damage Type"],
  conversions: ["Legacy formula/type shorthand is accepted only when DAMAGE_DATA is absent."]
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
function pathKey(path) { return String(path ?? "").replace(/\[(?:\*|\d+)\]/g, "[]"); }
function samePath(a, b) { return a === b || a === b + "[]"; }
function stages(status) { return Object.fromEntries(STAGES.map(stage => [stage, status])); }
function uniq(values) { return [...new Set(values)]; }
function reviewedOption(source, ids, condition) {
  return { source, ids, kind: "reviewed-native", complete: true, ...(condition ? { condition } : {}) };
}
// Each registry is explicitly selected here; no user-provided path or callback is evaluated.
function runningOptions(key) {
  const config = globalThis.CONFIG?.DND5E;
  const registry = key === "dieSteps" ? config?.dieSteps : key === "damageTypes" ? config?.damageTypes
    : key === "healingTypes" ? config?.healingTypes : key === "damageScalingModes" ? config?.damageScalingModes
    : key === "spellPreparationStates" ? config?.spellPreparationStates : key === "itemProperties" ? config?.itemProperties : null;
  if (!registry) return { source: "CONFIG.DND5E." + key, ids: [], kind: "running-config", complete: false, reason: "Registry unavailable; not an empty allowed set." };
  const ids = Array.isArray(registry) ? registry.filter(value => ["number", "string"].includes(typeof value))
    : key === "spellPreparationStates" ? Object.values(registry).map(value => value?.value).filter(value => typeof value === "number")
      : Object.keys(registry);
  return { source: "CONFIG.DND5E." + key, ids, kind: "running-config", complete: true, note: "Running configuration may include module additions; these are not inferred native constraints." };
}
function sheetFor(field, entries, current) {
  const path = pathKey(field.path);
  const sheet = {
    status: "needs-review", verifiedVersion: null, options: [], conditions: [],
    inactiveBehavior: "Not reviewed for this field.", references: []
  };
  if (!entries.length) return sheet;
  sheet.references = [REFERENCE];
  sheet.conditions = uniq(entries.flatMap(entry => entry.conditions ?? []));
  // Public coverage review documents applicability, but is not a complete sheet audit.
  sheet.inactiveBehavior = "Mapping preserves supplied stored values; control-specific visibility still needs review.";
  const reviewed = (reference, conditions = [], inactive = "Stored inactive values are retained without enabling their controlling checkbox.") => {
    sheet.status = current ? "reviewed" : "needs-review";
    sheet.verifiedVersion = VERIFIED_VERSION;
    sheet.verifiedFoundryVersion = "14.367";
    sheet.references.push(reference);
    sheet.conditions.push(...conditions);
    sheet.inactiveBehavior = inactive;
  };
  if (field.type === "spell" && path === "system.prepared") {
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Preparation dropdown appears only when canPrepare is true for the current spellcasting method."]);
    sheet.options.push(reviewedOption("DND5E.spellPreparationStates (5.3.3)", [0, 1, 2]), runningOptions("spellPreparationStates"));
  }
  if (field.type === "spell" && path === "system.sourceItem")
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Shown for actor-owned spells; options depend on the actor's spellcasting classes and may be locked."], "Stored source identifier is retained; this catalog does not enumerate world actor/item documents.");
  if (field.type === "spell" && path.startsWith("system.materials."))
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Material fields are displayed when the material component is enabled."]);
  if (path.startsWith("system.damage.")) {
    reviewed("systems/dnd5e/templates/shared/fields/field-damage.hbs");
    sheet.references.push("systems/dnd5e/templates/items/details/details-" + field.type + ".hbs");
    if (path.startsWith("system.damage.versatile")) sheet.conditions.push("Versatile controls are shown when property ver is enabled; the YAML mapping retains hidden values. The native versatile partial does not provide a damage-type selector.");
    if (field.type === "consumable") sheet.conditions.push("Native consumable damage controls appear for ammo subtype; YAML retains damage for other subtypes.");
    if (/\.(number|denomination|bonus)$/.test(path) && !path.includes(".scaling.")) sheet.conditions.push("Structured controls are active when custom.enabled is false; stored structured values remain when it is true.");
    if (path.endsWith(".custom.formula")) sheet.conditions.push("Custom formula control is active when custom.enabled is true; its stored value remains when false.");
    if (path.endsWith(".denomination")) sheet.options.push(reviewedOption("Native sheet blank + DND5E.dieSteps (5.3.3)", ["", 4, 6, 8, 10, 12, 20, 100]), runningOptions("dieSteps"));
    if (/\.types(?:\[\])?$/.test(path)) sheet.options.push(reviewedOption("Native " + field.type + " damage choices (5.3.3)", field.type === "weapon" ? [...DAMAGE_TYPES, "maximum"] : [...DAMAGE_TYPES]), runningOptions("damageTypes"));
    if (path.endsWith(".scaling.mode")) sheet.options.push(reviewedOption("DND5E.damageScalingModes (5.3.3)", ["", "whole", "half"]), runningOptions("damageScalingModes"));
    if (path.includes(".scaling.")) sheet.conditions.push("Damage scaling is stored by DamageField; item sheets may omit scaling controls. Activity and resource scaling are separate.");
  }
  if (samePath(path, "system.properties")) sheet.options.push(runningOptions("itemProperties"));
  if (field.type === "spell" && (/^system\.(range|duration)\./.test(path) || path.startsWith("system.target.")))
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Units, target type and area shape control displayed inputs; formulas and inactive dimensions are retained."]);
  if (["weapon", "equipment"].includes(field.type) && /^system\.(crew|speed|hp|cover|armor)\b/.test(path)) {
    reviewed("systems/dnd5e/templates/items/details/details-" + field.type + ".hbs", ["Mountable/siege/vehicle and armor controls depend on item category; hidden stored values remain importable."]);
  }
  return sheet;
}
function excludedReason(field, path) {
  if (field.kind !== "item") return null;
  if (["_id", "type"].includes(path)) return "Creation identity: Foundry allocates the Item ID and the YAML root selects its type.";
  if (/^(folder|ownership|_stats|flags)(\.|\[|$)/.test(path)) return "Document-management, provenance or extension metadata; no new arbitrary flag/path import is declared.";
  if (field.storage?.persisted === false || field.constraints?.persisted === false || field.classification === "derived")
    return "Derived or non-persisted native value; canonical YAML uses stored source.";
  if (field.type === "tool" && path === "system.chatFlavor") return "Legacy tool storage without a current native sheet control; use system.description.chat.";
  return null;
}
function decorate(field, environment) {
  const output = clone(field);
  const path = pathKey(field.path);
  const version = environment?.systemVersion ?? "";
  const current = version === VERIFIED_VERSION && environment?.foundryVersion === "14.367";
  const applicable = mappings.filter(entry => entry.types.includes(field.type) && samePath(path, entry.path));
  const coverage = { status: "needs-review", owner: OWNER, yamlLocations: [], aliases: [], acceptedRepresentations: [], conversions: [], stages: stages("needs-review"), evidence: [] };
  const excluded = excludedReason(field, path);
  if (excluded) Object.assign(coverage, { status: "excluded", stages: stages("excluded"), reason: excluded });
  else if (field.kind === "advancement" || (field.kind === "item" && !SUPPORTED.includes(field.type))) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Catalog discovery only: this native type has no supported Item YAML root or advancement import mapping." });
  } else if (field.kind !== "item") {
    Object.assign(coverage, { status: "excluded", stages: stages("excluded"), reason: "This document kind belongs to the Activity Importer catalog.", owner: "5e-activity-importer" });
  } else if (/^system\.(container|crew\.value)(\.|\[|$)/.test(path)) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Container placement and actor crew assignments remain deferred relationships." });
  } else if (/^(system\.activities|effects)(\.|\[|$)/.test(path)) {
    Object.assign(coverage, { status: "excluded", stages: stages("excluded"), owner: "5e-activity-importer",
      yamlLocations: [field.type.toUpperCase() + (path.startsWith("effects") ? ".effects[]" : ".Activities[]")],
      reason: "Cross-catalog relationship: attachment fields are mapped once by Activity Importer. Item Importer delegates through its optional companion API.",
      relatedCatalog: path.startsWith("effects") ? "effect" : "activity" });
  } else if (/^system\.advancement(\.|\[|$)/.test(path)) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Native advancement variants are cataloged separately; advancement import remains unsupported.", relatedCatalog: "advancement" });
  } else if (applicable.length) {
    const prefix = field.type.toUpperCase() + ".";
    Object.assign(coverage, {
      status: current ? "declared" : "needs-review",
      yamlLocations: uniq(applicable.flatMap(entry => entry.yaml).map(value => prefix + value)),
      aliases: uniq(applicable.flatMap(entry => entry.aliases ?? []).map(value => prefix + value)),
      acceptedRepresentations: uniq(applicable.map(entry => entry.representation)),
      conversions: uniq(applicable.flatMap(entry => entry.conversions ?? [])),
      stages: stages("declared"),
      evidence: applicable.flatMap(entry => entry.evidence ?? []).map(entry => ({...entry, test: entry.test.replace("<item type>", field.type)})),
      references: uniq([REFERENCE, PARSER, "scripts/itemData.js", "scripts/itemYamlExporter.js", ...applicable.map(entry => entry.implementation).filter(Boolean)]),
      reviewedSystemVersion: VERIFIED_VERSION,
      reviewedFoundryVersion: "14.367"
    });
    const members = applicable.flatMap(entry => entry.members ?? []);
    if (members.length) coverage.members = members.map(entry => ({ ...entry, yaml: prefix + entry.yaml }));
    if (path === "system.prepared") {
      coverage.conversions.push("unprepared/false -> 0; prepared/true -> 1; always -> 2. Canonical export uses descriptive labels.");
      coverage.evidence = [0, 1, 2, false, true, "unprepared", "prepared", "always"].map(input => ({file:EXPLICIT_TESTS,test:"Preparation " + JSON.stringify(input),status:"referenced"}));
    }
    if (!coverage.evidence.length) coverage.evidence.push({file:"tests/unit/itemCoreFeatureTests.js",test:"strict exporter round-trips " + field.type,status:"referenced",limitation:"Type fixture reference; individual leaf assertions have not been audited."});
    if (!current) coverage.reason = "Mapping reviewed for Foundry 14.367 / dnd5e 5.3.3; compare the discovered contract before treating it as supported on this runtime.";
    if (field.type === "container" && path === "system.quantity") coverage.stages = { ...stages("declared"), build: "unsupported", export: "unsupported" };
  } else {
    const children = mappings.some(entry => entry.types.includes(field.type) && (entry.path.startsWith(path + ".") || entry.path.startsWith(path + "[]")));
    if (children) Object.assign(coverage, { status: "excluded", stages: stages("excluded"), reason: "Structural container; coverage is recorded on its declared child fields, not counted again." });
    else coverage.reason = "No reviewed YAML or sheet mapping exists for this discovered native field.";
  }
  output.coverage = coverage;
  output.sheet = sheetFor(field, field.kind === "item" ? applicable : [], current);
  return output;
}
export function decorateCatalogFields(fields, environment = {}) {
  if (!Array.isArray(fields)) throw new TypeError("Catalog fields must be an array.");
  return fields.map(field => decorate(field, environment));
}

/** Audit the reviewed map against the supplied native catalog, without changing it. */
export function auditCoverageReferences(fields) {
  if (!Array.isArray(fields)) throw new TypeError("Catalog fields must be an array.");
  const presentTypes = new Set(fields.filter(field => field.kind === "item").map(field => field.type));
  const missing = [];
  const checked = new Set();
  for (const entry of mappings) for (const type of entry.types) {
    if (!presentTypes.has(type)) continue;
    const id = type + ":" + entry.path;
    if (checked.has(id)) continue;
    checked.add(id);
    if (!fields.some(field => field.kind === "item" && field.type === type && samePath(pathKey(field.path), entry.path))) {
      missing.push({kind:"item",type,path:entry.path,yamlLocations:entry.yaml.map(path => type.toUpperCase() + "." + path)});
    }
  }
  return {success:missing.length === 0,checked:checked.size,missing,
    scope:"Mappings checked only for native Item types present in this catalog; no import support is inferred."};
}

