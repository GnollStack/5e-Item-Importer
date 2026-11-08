import { EXPLICIT_ITEM_FIELDS } from "./itemExplicitFields.js";
import { isPhysicalItemType } from "./itemConfig.js";
import { ADVANCEMENT_TYPE_ROOTS, SUPPORTED_ADVANCEMENT_TYPES, MULTI_LEVEL_ADVANCEMENT_TYPES } from "./itemAdvancement.js";

/**
 * Reviewed YAML coverage annotations, separate from the discovered native contract.
 * These declarations are not validation results and never enable importer support.
 */
const OWNER = "5e-item-importer";
const VERIFIED_VERSION = "6.0.6";
const SUPPORTED = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell", "feat"];
const PHYSICAL = SUPPORTED.filter(isPhysicalItemType);
const EQUIPPABLE = PHYSICAL.filter(type => type !== "loot");
const USABLE = ["weapon", "equipment", "consumable", "tool", "spell", "feat"];
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
  ["modifiers", "Modifiers", "list of dice modifier strings"],
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
  method: "native method identifier", attunement: "none | required | optional", cover: "none | half | threequarters | total | number from 0 to 1",
  identifierList: "list of identifier or type:identifier strings"
};
for (const descriptor of EXPLICIT_ITEM_FIELDS) {
  add(descriptor.types, descriptor.path, descriptor.section + "." + descriptor.label,
    KIND_REPRESENTATIONS[descriptor.kind] ?? descriptor.kind, {
      implementation: "scripts/itemExplicitFields.js",
      evidence: [{ file: EXPLICIT_TESTS, test: "<item type> identity, source, state and native controls", status: "referenced" }]
    });
}
/**
 * Feature advancement (dnd5e advancement catalog kind). Native paths are relative to
 * one advancement entry; YAML paths are relative to FEAT (ADVANCEMENT[].<ROOT>.<Label>).
 */
const ADVANCEMENT_PARSER = "scripts/strictItemParsers/yamlItemParser.js";
function adv(type, path, yaml, representation = "native YAML scalar", options = {}) {
  const root = ADVANCEMENT_TYPE_ROOTS[type];
  const labels = (Array.isArray(yaml) ? yaml : [yaml]).map(label => "ADVANCEMENT[]." + root + "." + label);
  const aliases = (options.aliases ?? []).map(label => "ADVANCEMENT[]." + root + "." + label);
  mappings.push({ kind: "advancement", types: [type], path, yaml: labels, representation, ...options, aliases,
    implementation: ADVANCEMENT_PARSER,
    evidence: [{ file: EXPLICIT_TESTS, test: "feat identity, source, state and native controls", status: "referenced" }] });
}
const REFERENCE_ALIASES = ["Name", "Identifier", "Type"];
const REFERENCE_CONVERSIONS = ["A unique Name or Identifier match in the world or compendia resolves automatically; ambiguous or missing references wait for a drop in the import window, and import is blocked until every reference resolves."];
for (const type of SUPPORTED_ADVANCEMENT_TYPES) {
  adv(type, "_id", "Advancement ID", "optional 16-character alphanumeric ID");
  if (!MULTI_LEVEL_ADVANCEMENT_TYPES.includes(type)) adv(type, "level", "Level", "non-negative integer; 0 is any level", { conversions: ["Omitted on new entries lets dnd5e store its default level 0."] });
  adv(type, "name", "Name", "text", { conversions: ["Omitted keeps the native undefined so the sheet shows the type title."] });
  adv(type, "hint", "Hint", "HTML/text");
  adv(type, "img", "Icon", "image path");
  adv(type, "classRestriction", "Class Restriction", "primary | secondary | n/a");
}
adv("AbilityScoreImprovement", "configuration.points", "Points", "non-negative integer");
adv("AbilityScoreImprovement", "configuration.cap", "Cap", "positive integer");
adv("AbilityScoreImprovement", "configuration.max", "Max", "nullable positive integer");
adv("AbilityScoreImprovement", "configuration.locked", "Locked", "list of ability identifiers");
adv("AbilityScoreImprovement", "configuration.fixed.{key}", ["FIXED[].Ability", "FIXED[].Value"], "ability identifier and integer increase", { conversions: ["A compact { str: 1 } mapping is accepted as input; export writes the list form."] });
adv("AbilityScoreImprovement", "configuration.recommendation", "RECOMMENDATION.UUID", "feat Item UUID (world or compendium)", { aliases: REFERENCE_ALIASES, conversions: REFERENCE_CONVERSIONS });
adv("ItemGrant", "configuration.optional", "Optional", "boolean");
adv("ItemGrant", "configuration.sorting", "Sorting", "a | m");
adv("ItemGrant", "configuration.items[].uuid", "ITEMS[].UUID", "Item UUID (world or compendium, not embedded)", { aliases: REFERENCE_ALIASES, conversions: REFERENCE_CONVERSIONS });
adv("ItemGrant", "configuration.items[].optional", "ITEMS[].Optional", "boolean");
adv("ItemGrant", "configuration.items[].sort", "ITEMS[].Sort", "integer");
adv("ItemChoice", "configuration.allowDrops", "Allow Drops", "boolean");
adv("ItemChoice", "configuration.sorting", "Sorting", "a | m");
adv("ItemChoice", "configuration.type", "Type", "nullable Item type identifier");
adv("ItemChoice", "configuration.choices.{key}.count", ["CHOICES[].Level", "CHOICES[].Count"], "level key with a non-negative integer count", { conversions: ["A level-keyed mapping is accepted as input; export writes the list form."] });
adv("ItemChoice", "configuration.choices.{key}.replacement", "CHOICES[].Replacement", "boolean");
adv("ItemChoice", "configuration.pool[].uuid", "POOL[].UUID", "Item UUID (world or compendium, not embedded)", { aliases: REFERENCE_ALIASES, conversions: REFERENCE_CONVERSIONS });
adv("ItemChoice", "configuration.pool[].sort", "POOL[].Sort", "integer");
for (const [key, label] of [["level", "Level"], ["list", "List"], ["school", "School"], ["type", "Type"], ["subtype", "Subtype"]])
  adv("ItemChoice", "configuration.restriction." + key, "RESTRICTION." + label, ["list", "school"].includes(key) ? "list of identifiers" : "text; n/a stores an empty string");
for (const type of ["ItemGrant", "ItemChoice"]) {
  adv(type, "configuration.spell.ability", "SPELL.Ability", "list of ability identifiers");
  adv(type, "configuration.spell.method", "SPELL.Method", "atwill | innate | ritual | pact | spell | n/a");
  adv(type, "configuration.spell.prepared", "SPELL.Prepared", "unprepared | prepared | always | 0 | 1 | 2");
  adv(type, "configuration.spell.uses.max", "SPELL.Uses Max", "deterministic formula string");
  adv(type, "configuration.spell.uses.per", "SPELL.Uses Per", "native recovery period identifier");
  adv(type, "configuration.spell.uses.requireSlot", "SPELL.Require Slot", "boolean");
}
adv("ModifyItem", "configuration.changes[]._id", "CHANGES[].Effect ID", "16-character ID of an enchantment effect on this feature, or n/a");
adv("ModifyItem", "configuration.changes[].uuid", "CHANGES[].EFFECT.UUID", "standalone ActiveEffect compendium UUID", { aliases: ["Name"], conversions: REFERENCE_CONVERSIONS });
adv("ModifyItem", "configuration.changes[].identifiers", "CHANGES[].Identifiers", "list of identifier or type:identifier strings");
adv("ScaleValue", "configuration.identifier", "Identifier", "identifier text");
adv("ScaleValue", "configuration.type", "Type", "string | number | cr | dice | distance | usage");
adv("ScaleValue", "configuration.distance.units", "Distance Units", "length unit identifier");
adv("ScaleValue", "configuration.scale.{key}.value", ["SCALE[].Level", "SCALE[].Value"], "level key with the string, number, cr, distance or usage value", { conversions: ["A level-keyed mapping is accepted as input; export writes the list form."] });
adv("ScaleValue", "configuration.scale.{key}.number", "SCALE[].Dice Count", "nullable non-negative integer (dice)");
adv("ScaleValue", "configuration.scale.{key}.faces", "SCALE[].Die Denomination", "positive integer (dice)");
adv("ScaleValue", "configuration.scale.{key}.modifiers", "SCALE[].Modifiers", "list of dice modifier strings (dice)");
adv("ScaleValue", "configuration.scale.{key}.period", "SCALE[].Period", "native recovery period identifier (usage)");
adv("Trait", "configuration.mode", "Mode", "default | expertise | forcedExpertise | upgrade | mastery");
adv("Trait", "configuration.allowReplacements", "Allow Replacements", "boolean");
adv("Trait", "configuration.grants", "Grants", "list of trait keys (<trait>:<category>[:<child>])");
adv("Trait", "configuration.choices[].count", "CHOICES[].Count", "positive integer");
adv("Trait", "configuration.choices[].pool", "CHOICES[].Pool", "list of trait keys");

add(SUPPORTED, "name", "ITEM.Name", "required text");
add(PHYSICAL, "system.quantity", "INVENTORY.Quantity", "exact non-negative integer", {
  conditions: ["Container imports use quantity 1; quantity is not a free container control."],
  conversions: ["Container quantity is fixed to 1 by the existing builder."]
});
add(PHYSICAL, "system.container", "INVENTORY.Container", "container reference: a container's name in the same batch, a container Item UUID, or n/a", {
  conditions: ["Nested CONTAINER.CONTENTS entries are placed without this key. dnd5e keeps contents in the container's collection and folder, at most five containers deep; a UUID in another collection is rejected before import."],
  conversions: ["A same-batch name binds at parse time; other names and UUIDs resolve against the destination collection (unique match) or wait for a drop in the import window. The builder never writes system.container from text; createItem5e sets it after the container exists."]
});
add(PHYSICAL, "system.rarities", "ITEM.Rarities", "list of native rarity identifiers", {
  aliases: ["ITEM.Rarity"], conversions: ["Legacy scalar Rarity becomes a one-entry list; an explicit empty list remains mundane. Equivalent aliases are accepted and conflicting values fail."]
});
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
add(["tool"], "system.proficient", "ABILITY_CHECK.Proficient", "Automatic/null or 0, 0.5, 1, 1.5, 2", {
  conversions: ["The native 1.5 multiplier is accepted and preserved alongside 0, 0.5, 1 and 2; Automatic maps to null."]
});
add(["tool"], "system.ability", "ABILITY_CHECK.Ability", "native ability identifier");
add(["tool"], "system.bonus", "PROPERTIES.Tool Bonus", "formula string");
add(["spell"], "system.level", "ITEM.Level", "integer from 0 to 9");
add(["spell"], "system.ability", "ITEM.Ability", "native ability identifier or blank");
addGroup(["spell"], "system.activation.", "ACTIVATION.", [["type", "Type", "native activation identifier"], ["value", "Value", "non-negative integer"], ["condition", "Condition", "text"]]);
add(["feat"], "system.type.value", "ITEM.Feature Type", "native feature type identifier or blank", {
  conversions: ["Unknown values are stored as-is with a warning; dnd5e labels them as a generic Feature."]
});
add(["feat"], "system.type.subtype", "ITEM.Feature Subtype", "native feature subtype identifier or blank", {
  conditions: ["Subtypes exist for class, enchantment, feat, and supernaturalGift feature types; other types store the value without a label."]
});
add(["feat"], "system.properties", ["PROPERTIES.Magical", "PROPERTIES.Passive Trait"], "independent booleans mapped to Set membership", {
  members: [{ id: "mgc", yaml: "PROPERTIES.Magical" }, { id: "trait", yaml: "PROPERTIES.Passive Trait" }],
  conversions: ["True adds its native property identifier; explicit false removes only that property."]
});
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
add(["weapon", "consumable"], "system.damage.base", "DAMAGE.DAMAGE_DATA", "mapping of explicit damage leaves", {
  aliases: ["DAMAGE.Damage Formula", "DAMAGE.Damage Type"],
  conversions: ["Formula/type aliases are legacy shorthand, accepted only when explicit DAMAGE_DATA is absent; ammunition aliases apply only to Consumable."]
});
add(["consumable"], "system.damage.base", "DAMAGE.DAMAGE_DATA", "mapping of explicit damage leaves", {
  aliases: ["AMMUNITION_PROPERTIES.Damage Formula", "AMMUNITION_PROPERTIES.Damage Type"]
});
add(["weapon"], "system.damage.versatile", "VERSATILE_DAMAGE.DAMAGE_DATA", "mapping of explicit damage leaves", {
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
    sheet.verifiedFoundryVersion = "14.369";
    sheet.references.push(reference);
    sheet.conditions.push(...conditions);
    sheet.inactiveBehavior = inactive;
  };
  if (field.type === "spell" && path === "system.prepared") {
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Preparation dropdown appears only when canPrepare is true for the current spellcasting method."]);
    sheet.options.push(reviewedOption("DND5E.spellPreparationStates (6.0.6)", [0, 1, 2]), runningOptions("spellPreparationStates"));
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
    if (path.endsWith(".denomination")) sheet.options.push(reviewedOption("Native sheet blank + DND5E.dieSteps (6.0.6)", ["", 4, 6, 8, 10, 12, 20, 100]), runningOptions("dieSteps"));
    if (/\.types(?:\[\])?$/.test(path)) sheet.options.push(reviewedOption("Native " + field.type + " damage choices (6.0.6)", field.type === "weapon" ? [...DAMAGE_TYPES, "maximum"] : [...DAMAGE_TYPES]), runningOptions("damageTypes"));
    if (path.endsWith(".scaling.mode")) sheet.options.push(reviewedOption("DND5E.damageScalingModes (6.0.6)", ["", "whole", "half"]), runningOptions("damageScalingModes"));
    if (path.includes(".scaling.")) sheet.conditions.push("Damage scaling is stored by DamageField; item sheets may omit scaling controls. Activity and resource scaling are separate.");
  }
  if (samePath(path, "system.properties")) sheet.options.push(runningOptions("itemProperties"));
  if (field.type === "spell" && (/^system\.(range|duration)\./.test(path) || path.startsWith("system.target.")))
    reviewed("systems/dnd5e/templates/items/details/details-spell.hbs", ["Units, target type and area shape control displayed inputs; formulas and inactive dimensions are retained."]);
  if (field.type === "spell" && path === "system.duration.expiry") {
    sheet.references.push("systems/dnd5e/templates/shared/fields/field-duration.hbs");
    sheet.options.push(reviewedOption("ActiveEffect5e expiry options (6.0.6)", [null, "turnStart", "turnEnd", "roundStart", "roundEnd", "combatStart", "combatEnd", "longRest", "shortRest", "sourceStart", "sourceEnd", "targetStart", "targetEnd"]));
  }
  if (["weapon", "equipment"].includes(field.type) && /^system\.(crew|speed|hp|cover|armor)\b/.test(path)) {
    reviewed("systems/dnd5e/templates/items/details/details-" + field.type + ".hbs", ["Mountable/siege/vehicle and armor controls depend on item category; hidden stored values remain importable."]);
  }
  if (field.type === "feat" && path.startsWith("system.type."))
    reviewed("systems/dnd5e/templates/items/details/details-feat.hbs", ["The subtype selector appears only when the selected feature type defines subtypes; unknown values are stored and labeled as a generic Feature."]);
  if (field.type === "feat" && path.startsWith("system.enchant."))
    reviewed("systems/dnd5e/templates/items/details/details-feat.hbs", ["Enchantment limit controls appear only when the feature is an enchantment source (artificerInfusion or rune subtype)."]);
  if (field.type === "feat" && path === "system.cover")
    reviewed("systems/dnd5e/templates/items/details/details-feat.hbs", ["Cover is shown only for vehicle features (type.value vehicle)."]);
  if (field.type === "feat" && path === "system.crewed")
    reviewed("systems/dnd5e/templates/items/details/details-feat.hbs", ["dnd5e 6.0.6 has no sheet control for this field."], "Stored value is retained; no native control reads it.");
  return sheet;
}
function excludedReason(field, path) {
  if (field.kind === "advancement") {
    if (path === "type") return "Selected by the ADVANCEMENT entry's root key.";
    if (/^flags(\.|\[|$)/.test(path)) return "Document-management, provenance or extension metadata; no new arbitrary flag/path import is declared.";
    if (/^value(\.|\[|$)/.test(path)) return "Advancement value records a character's choices after the Item is added; new Items store an empty value.";
    return null;
  }
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
  const current = version === VERIFIED_VERSION && environment?.foundryVersion === "14.369";
  const kind = field.kind === "advancement" ? "advancement" : "item";
  const applicable = mappings.filter(entry => (entry.kind ?? "item") === kind && entry.types.includes(field.type) && samePath(path, entry.path));
  const coverage = { status: "needs-review", owner: OWNER, yamlLocations: [], aliases: [], acceptedRepresentations: [], conversions: [], stages: stages("needs-review"), evidence: [] };
  const excluded = excludedReason(field, path);
  if (excluded) Object.assign(coverage, { status: "excluded", stages: stages("excluded"), reason: excluded });
  else if (field.kind === "advancement" && !SUPPORTED_ADVANCEMENT_TYPES.includes(field.type)) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Catalog discovery only: this advancement type belongs to classes, subclasses or species, which have no supported Item YAML root." });
  } else if (field.kind === "item" && !SUPPORTED.includes(field.type)) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Catalog discovery only: this native type has no supported Item YAML root or advancement import mapping." });
  } else if (field.kind !== "item" && field.kind !== "advancement") {
    Object.assign(coverage, { status: "excluded", stages: stages("excluded"), reason: "This document kind belongs to the Activity Importer catalog.", owner: "5e-activity-importer" });
  } else if (field.kind === "item" && /^system\.crew\.value(\.|\[|$)/.test(path)) {
    Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Actor crew assignments remain a deferred relationship." });
  } else if (field.kind === "item" && /^(system\.activities|effects)(\.|\[|$)/.test(path)) {
    Object.assign(coverage, { status: "excluded", stages: stages("excluded"), owner: "5e-activity-importer",
      yamlLocations: [field.type.toUpperCase() + (path.startsWith("effects") ? ".effects[]" : ".Activities[]")],
      reason: "Cross-catalog relationship: attachment fields are mapped once by Activity Importer. Item Importer delegates through its optional companion API.",
      relatedCatalog: path.startsWith("effects") ? "effect" : "activity" });
  } else if (field.kind === "item" && /^system\.advancement(\.|\[|$)/.test(path)) {
    if (field.type === "feat") Object.assign(coverage, {
      status: current ? "declared" : "needs-review", stages: stages("declared"), yamlLocations: ["FEAT.ADVANCEMENT[]"], relatedCatalog: "advancement",
      acceptedRepresentations: ["list of one-root entries (ABILITY_SCORE_IMPROVEMENT, GRANT_ITEMS, CHOOSE_ITEMS, MODIFY_ITEMS, SCALE_VALUE, TRAIT)"],
      conversions: ["Entries are keyed by Advancement ID at build time; omitted IDs are allocated. Each type's configuration leaves are mapped in the advancement catalog."],
      references: [REFERENCE, ADVANCEMENT_PARSER, "scripts/itemData.js", "scripts/itemYamlExporter.js", "scripts/itemAdvancement.js"],
      reviewedSystemVersion: VERIFIED_VERSION, reviewedFoundryVersion: "14.369"
    });
    else Object.assign(coverage, { status: "unsupported", stages: stages("unsupported"), reason: "Advancement is authored on Feature Items only; this Item type has no supported YAML root for it.", relatedCatalog: "advancement" });
  } else if (applicable.length) {
    const prefix = kind === "advancement" ? "FEAT." : field.type.toUpperCase() + ".";
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
      reviewedFoundryVersion: "14.369"
    });
    const members = applicable.flatMap(entry => entry.members ?? []);
    if (members.length) coverage.members = members.map(entry => ({ ...entry, yaml: prefix + entry.yaml }));
    if (path === "system.prepared") {
      coverage.conversions.push("unprepared/false -> 0; prepared/true -> 1; always -> 2. Canonical export uses descriptive labels.");
      coverage.evidence = [0, 1, 2, false, true, "unprepared", "prepared", "always"].map(input => ({file:EXPLICIT_TESTS,test:"Preparation " + JSON.stringify(input),status:"referenced"}));
    }
    if (!coverage.evidence.length) coverage.evidence.push({file:"tests/unit/itemCoreFeatureTests.js",test:"strict exporter round-trips " + field.type,status:"referenced",limitation:"Type fixture reference; individual leaf assertions have not been audited."});
    if (!current) coverage.reason = "Mapping reviewed for Foundry 14.369 / dnd5e 6.0.6; compare the discovered contract before treating it as supported on this runtime.";
    if (field.type === "container" && path === "system.quantity") coverage.stages = { ...stages("declared"), build: "unsupported", export: "unsupported" };
  } else {
    const children = mappings.some(entry => (entry.kind ?? "item") === kind && entry.types.includes(field.type) && (entry.path.startsWith(path + ".") || entry.path.startsWith(path + "[]")));
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
  const presentTypes = new Set(fields.filter(field => ["item", "advancement"].includes(field.kind)).map(field => field.kind + ":" + field.type));
  const missing = [];
  const checked = new Set();
  for (const entry of mappings) for (const type of entry.types) {
    const kind = entry.kind ?? "item";
    if (!presentTypes.has(kind + ":" + type)) continue;
    const id = kind + ":" + type + ":" + entry.path;
    if (checked.has(id)) continue;
    checked.add(id);
    if (!fields.some(field => field.kind === kind && field.type === type && samePath(pathKey(field.path), entry.path))) {
      const prefix = kind === "advancement" ? "FEAT." : type.toUpperCase() + ".";
      missing.push({kind,type,path:entry.path,yamlLocations:entry.yaml.map(path => prefix + path)});
    }
  }
  return {success:missing.length === 0,checked:checked.size,missing,
    scope:"Mappings checked only for native Item and advancement types present in this catalog; no import support is inferred."};
}

