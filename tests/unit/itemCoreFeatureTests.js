/** Focused tests for standalone Item core feature services. */

import jsyaml from "../../scripts/vendor/js-yaml.mjs";

import {
  ITEM_YAML_SCHEMA_KEY,
  ITEM_YAML_SCHEMA_VERSION,
  migrateItemYamlDocument
} from "../../scripts/strictItemParsers/itemSchemaVersion.js";
import { YamlItemParser } from "../../scripts/strictItemParsers/yamlItemParser.js";
import {
  exportStrictItemYaml,
  exportStrictItemYamlBatch,
  itemToStrictYamlDocument,
  createStrictYamlAttachmentFlags
} from "../../scripts/itemYamlExporter.js";
import {
  normalizeCustomProperties,
  customPropertiesToItemSourcePatch
} from "../../scripts/itemCustomProperties.js";
import { buildItemParseInsights } from "../../scripts/itemParseInsights.js";
import {
  synthesizeNaturalAutomation,
  validateSynthesizedAutomation
} from "../../scripts/naturalAutomationSynthesis.js";
import {
  clearCompendiumImageCandidateCache,
  collectCompendiumImageCandidates,
  selectCompendiumImageCandidate
} from "../../scripts/compendiumImageSelector.js";
import {
  AutoAnimationsHandler,
  buildAutoAnimationFlagsFromCandidate,
  getAutoAnimationCandidates,
  getAutoAnimationPreview
} from "../../scripts/integrations/autoAnimations.js";
import { parseItemText } from "../../scripts/parserRouting.js";
import {
  createItemImporterApi,
  ITEM_PUBLIC_API_SCHEMA_VERSION
} from "../../scripts/ui/itemPublicApi.js";

function activityPayload(name = "Extra Fire") {
  return {
    ACTIVITY_DAMAGE: {
      ACTIVITY: { Name: name, Icon: "n/a" },
      DAMAGE: {
        DAMAGE_PARTS: [{
          "Damage Formula": "1d6",
          "Damage Type": "fire",
          "Damage Scaling": "No Scaling"
        }]
      }
    }
  };
}

function effectPayload(name = "Poisoned") {
  return {
    EFFECT: {
      DETAILS: {
        Name: name,
        "Effect Suspended": false,
        "Apply Effect to Actor": false,
        "Status Conditions": "poisoned"
      }
    }
  };
}

function fixtures() {
  return [
    {
      name: "Core Test Blade", type: "weapon", rarity: "rare",
      weaponType: "improv", baseWeapon: null,
      damage: { formula: "1d6", type: "slashing" },
      properties: ["mgc", "customProp"], isMagical: true,
      range: { value: 20, long: 60, units: "ft" }, reach: 5,
      uses: { value: 1, max: 3 },
      recovery: [{ period: "dawn", type: "formula", formula: "1d3" }],
      description: "A deterministic test weapon.",
      customProperties: {
        registered: ["customProp"],
        metadata: { "tests.roundTrip": true }
      },
      pendingActivities: [
        { key: "ACTIVITY_DAMAGE", name: "Extra Fire", rawData: activityPayload() },
        { key: "EFFECT", name: "Poisoned", rawData: effectPayload() }
      ]
    },
    {
      name: "Core Test Cloak", type: "equipment", rarity: "uncommon",
      armorType: "wondrous", properties: ["mgc"], isMagical: true,
      description: "A deterministic equipment fixture."
    },
    {
      name: "Core Test Potion", type: "consumable", rarity: "common",
      consumableType: "potion", properties: [], autoDestroy: false,
      description: "A deterministic consumable fixture."
    },
    {
      name: "Core Test Tools", type: "tool", rarity: "common",
      toolType: "", baseToolItem: "thief", toolAbility: "dex", proficient: 1,
      properties: [], description: "A deterministic tool fixture."
    },
    {
      name: "Core Test Gem", type: "loot", rarity: "common",
      lootType: "gem", properties: [], description: "A deterministic loot fixture."
    },
    {
      name: "Core Test Chest", type: "container", rarity: "common",
      properties: [], itemCapacity: 20, weightCapacity: 100,
      weightCapacityUnits: "lb", volumeCapacity: 4,
      volumeCapacityUnits: "cubicFoot", currency: { pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 },
      description: "A deterministic container fixture."
    },
    {
      name: "Core Test Bolt", type: "spell", spellLevel: 2, spellSchool: "evo",
      vocal: true, somatic: true, material: false,
      preparationMode: "spell", prepared: false,
      activationType: "action", activationValue: 1,
      range: { value: 60, units: "ft" }, duration: { value: null, units: "inst" },
      target: { type: "creature", count: 1, choice: false, special: null },
      properties: ["vocal", "somatic"], description: "A deterministic spell fixture."
    }
  ];
}

function record(results, name, condition, details = null) {
  results.push({ name, passed: !!condition, details: condition ? null : details });
}

/** Run in Foundry diagnostics or any harness providing the usual game/ui globals. */
export async function runItemCoreFeatureTests(options = {}) {
  const results = [];
  const propertyRegistry = new Set(["mgc", "customProp"]);

  const legacy = migrateItemYamlDocument({
    CONSUMABLE: {
      ITEM: { Name: "Legacy Scroll", Rarity: "common", "Consumable Type": "scroll" },
      SCROLL_PROPERTIES: { Verbal: true },
      USAGE: { "Uses Current": 2, "Uses Max": 5 }
    }
  });
  record(results, "schema migrates unversioned documents", legacy.errors.length === 0
    && legacy.sourceVersion === 0
    && legacy.document[ITEM_YAML_SCHEMA_KEY] === ITEM_YAML_SCHEMA_VERSION
    && legacy.document.CONSUMABLE.SCROLL_PROPERTIES.Vocal === true
    && legacy.document.CONSUMABLE.USAGE["Uses Spent"] === 3
    && legacy.migrations.some((message) => message.includes("deprecated")), legacy);
  const invalidLegacyUses = migrateItemYamlDocument({
    CONSUMABLE: {
      ITEM: { Name: "Invalid Legacy Uses", "Consumable Type": "wand" },
      USAGE: { "Uses Current": -1, "Uses Max": 5 }
    }
  });
  record(results, "schema leaves invalid legacy uses for strict validation",
    invalidLegacyUses.document.CONSUMABLE.USAGE["Uses Current"] === -1
      && !Object.prototype.hasOwnProperty.call(invalidLegacyUses.document.CONSUMABLE.USAGE, "Uses Spent"),
    invalidLegacyUses);
  const future = migrateItemYamlDocument({ SCHEMA_VERSION: 99, LOOT: {} });
  record(results, "schema rejects future versions", future.errors.length === 1, future);

  const normalizedCustom = normalizeCustomProperties({
    Registered: ["customProp", "notRegistered"],
    Metadata: { "tests.rating": 5, unscoped: "ignored" }
  }, { registry: propertyRegistry, itemType: "weapon" });
  const customPatch = customPropertiesToItemSourcePatch(normalizedCustom);
  record(results, "custom properties require registered IDs", normalizedCustom.registered.join(",") === "customProp"
    && !Object.prototype.hasOwnProperty.call(normalizedCustom.metadata, "unscoped"), normalizedCustom);
  record(results, "custom property source patch keeps nested flags and separate IDs",
    customPatch.registeredPropertyIds[0] === "customProp"
      && customPatch.flags?.["5e-item-importer"]?.customProperties?.metadata?.["tests.rating"] === 5
      && !Object.prototype.hasOwnProperty.call(customPatch.flags, "customProp"), customPatch);

  const itemFixtures = fixtures();
  for (const fixture of itemFixtures) {
    const yaml = exportStrictItemYaml(fixture, { propertyRegistry });
    const parsed = new YamlItemParser({ propertyRegistry }).parse(yaml);
    record(results, `strict exporter round-trips ${fixture.type}`,
      parsed.success && parsed.item?.type === fixture.type && parsed.item?.name === fixture.name,
      { yaml, errors: parsed.errors, warnings: parsed.warnings });
    const document = itemToStrictYamlDocument(fixture, { propertyRegistry });
    record(results, `${fixture.type} export includes visible schema metadata`,
      document[ITEM_YAML_SCHEMA_KEY] === ITEM_YAML_SCHEMA_VERSION, document);
    if (fixture.type === "weapon") {
      record(results, "exporter round-trips inline activities and effects",
        parsed.item?.pendingActivities?.length === 2
          && parsed.item.pendingActivities.some((entry) => entry.key === "ACTIVITY_DAMAGE")
          && parsed.item.pendingActivities.some((entry) => entry.key === "EFFECT"),
        parsed.item?.pendingActivities);
      record(results, "parser stages custom flags on ItemData",
        parsed.item?.properties?.includes("customProp")
          && parsed.item?.customPropertyFlags?.["5e-item-importer"]?.customProperties?.registered?.includes("customProp"),
        parsed.item?.customPropertyFlags);
    }
  }

  const batchYaml = exportStrictItemYamlBatch(itemFixtures, { propertyRegistry });
  const batch = new YamlItemParser({ propertyRegistry }).parseAll(batchYaml);
  record(results, "batch exporter/parser round-trips all seven types",
    batch.length === 7 && batch.every((entry) => entry.success),
    batch.map((entry) => ({ success: entry.success, errors: entry.errors, warnings: entry.warnings })));

  const lightweightDefaults = [
    {
      type: "weapon",
      validate: (item) => item.weaponType === "improv"
        && item.baseWeapon === null
        && item.damage?.formula === "1d4"
    },
    {
      type: "equipment",
      validate: (item) => item.armorType === "wondrous"
    },
    {
      type: "consumable",
      validate: (item) => item.consumableType === "potion"
    },
    {
      type: "tool",
      validate: (item) => item.baseToolItem === "thief" && item.toolType === ""
    },
    {
      type: "loot",
      validate: (item) => item.lootType === "gear"
    },
    {
      type: "container",
      validate: (item) => item.quantity === 1
        && Object.values(item.currency || {}).every((value) => value === 0)
    },
    {
      type: "spell",
      validate: (item) => item.spellLevel === 0
        && item.spellSchool === "evo"
        && item.activationType === "action"
    }
  ];
  for (const fixture of lightweightDefaults) {
    const parsed = parseItemText(`name: Minimal ${fixture.type}\ntype: ${fixture.type}`, { trace: true });
    await parsed.item?.buildFoundryData({ deterministicIcons: true });
    const foundryData = parsed.item?.toJSON?.().foundryData;
    record(results, `lightweight routing builds minimal ${fixture.type}`,
      parsed.success
        && parsed.item?.type === fixture.type
        && fixture.validate(parsed.item)
        && foundryData?.type === fixture.type
        && parsed.trace?.normalizedStrictTemplate?.includes("SCHEMA_VERSION: 1"),
      { parsed, foundryData });
  }

  const lightweightAliases = [
    {
      text: "name: Field Armor\ntype: armour",
      validate: (item) => item.type === "equipment"
        && item.armorType === "light"
        && item.baseEquipment === "leather"
        && item.armorClass === 11
    },
    {
      text: "name: Practice Bolts\ntype: consumable\nconsumableType: ammunition\nammoType: crossbow bolt",
      validate: (item) => item.type === "consumable"
        && item.consumableType === "ammo"
        && item.ammunitionType === "crossbowBolt"
    },
    {
      text: "name: Lock Picks\ntype: tool\nbaseTool: thieves tools",
      validate: (item) => item.type === "tool"
        && item.baseToolItem === "thief"
        && item.toolType === ""
    },
    {
      text: "name: Merchant Goods\ntype: loot\nlootType: trade goods",
      validate: (item) => item.type === "loot" && item.lootType === "trade"
    },
    {
      text: "name: Quick Spark\ntype: spell\nlevel: 2\nschool: evocation\nactivation: bonus action\ncomponents: V, S\nrange: 60 feet\nduration: 1 minute",
      validate: (item) => item.type === "spell"
        && item.spellLevel === 2
        && item.spellSchool === "evo"
        && item.activationType === "bonus"
        && item.vocal
        && item.somatic
        && item.range?.value === 60
        && item.range?.units === "ft"
        && item.duration?.value === 1
        && item.duration?.units === "minute"
    }
  ].map((fixture) => {
    const parsed = parseItemText(fixture.text, { trace: true });
    return { parsed, passed: parsed.success && fixture.validate(parsed.item) };
  });
  record(results, "lightweight routing normalizes documented type and value aliases",
    lightweightAliases.every((fixture) => fixture.passed), lightweightAliases);

  const unsupportedLightType = parseItemText("name: Mystery\ntype: vehicle-part", { trace: true });
  record(results, "lightweight routing rejects unsupported explicit Item types",
    !unsupportedLightType.success
      && unsupportedLightType.errors?.some((error) => error.includes("Unsupported lightweight Item type")),
    unsupportedLightType);

  const invalidLightweightFixtures = [
    ["name: Guiding Bolt\ntype: spell\ndamage: 4d6 radiant", "not supported for spell"],
    ["name: Priced Spell\ntype: spell\nprice: 5 gp", "not supported for spell"],
    ["name: Mixed Weapon\ntype: weapon\nequipmentType: light", "not supported for weapon"],
    ["name: Wrong Ammo\ntype: potion\nammunitionType: arrow", "not supported for consumable"],
    ["name: Bad Damage\ntype: weapon\ndamage: bananas", "simple dice formula"],
    ["name: Priceless\ntype: loot\nprice: priceless", "optional pp/gp/ep/sp/cp"],
    ["name: Maybe Bag\ntype: container\nweightlessContents: maybe", "must be true or false"],
    ["name: Maybe Spell\ntype: spell\nprepared: maybe", "must be true or false"],
    ["name: Odd Blade\ntype: weapon\nproperties: finesse, teleporting", "Unknown lightweight property"],
    ["name: Nimble Gem\ntype: loot\nproperties: finesse", "not supported for loot"],
    ["name: Conflicting Price\ntype: loot\nprice: 2 gp\npriceValue: 3", "cannot be combined"],
    ["name: Psychic Components\ntype: spell\ncomponents: V, psychic", "Unsupported lightweight spell component"],
    ["name: Bonus Gem\ntype: loot\nmagicBonus: 1", "not supported for loot"]
  ].map(([text, expected]) => {
    const parsed = parseItemText(text, { trace: true });
    return {
      text,
      expected,
      passed: parsed.success === false
        && parsed.item === null
        && parsed.errors?.some(error => error.includes(expected)),
      parsed
    };
  });
  record(results, "lightweight routing rejects unconsumed and malformed explicit fields",
    invalidLightweightFixtures.every(fixture => fixture.passed),
    invalidLightweightFixtures.filter(fixture => !fixture.passed));

  const legacyBatchDocument = {
    WEAPON: itemToStrictYamlDocument(itemFixtures[0], { propertyRegistry }).WEAPON,
    LOOT: itemToStrictYamlDocument(itemFixtures[4], { propertyRegistry }).LOOT
  };
  const legacyBatchYaml = jsyaml.dump(legacyBatchDocument, { lineWidth: -1 });
  const legacyBatch = new YamlItemParser({ propertyRegistry }).parseAll(legacyBatchYaml);
  record(results, "parseAll preserves legacy schema provenance per item",
    legacyBatch.length === 2
      && legacyBatch.every((entry) => entry.schema?.sourceVersion === 0)
      && legacyBatch.every((entry) => entry.item?.yamlSourceSchemaVersion === 0), legacyBatch);

  const parserStub = () => [{ success: true, activityData: { type: "stub" }, effectData: null }];
  const automationText = "The target must make a DC 15 Constitution saving throw, takes an extra 2d6 poison damage, and is poisoned until the end of its next turn. It regains 1d8 + 2 hit points. Recharge 5-6.";
  const automation = synthesizeNaturalAutomation(automationText, {
    name: "Venom Engine",
    parseAll: parserStub
  });
  record(results, "natural automation synthesizes explicit mechanics",
    automation.pendingActivities.some((entry) => entry.key === "ACTIVITY_DAMAGE")
      && automation.pendingActivities.some((entry) => entry.key === "ACTIVITY_SAVE")
      && automation.pendingActivities.some((entry) => entry.key === "ACTIVITY_HEAL")
      && automation.pendingActivities.some((entry) => entry.key === "ACTIVITY_UTILITY"), automation);
  record(results, "condition automation is embedded instead of inert standalone effect",
    !automation.pendingActivities.some((entry) => entry.key === "EFFECT")
      && automation.pendingActivities.some((entry) =>
        Array.isArray(entry.rawData?.[entry.key]?.APPLIED_EFFECTS)
      ), automation.pendingActivities);
  record(results, "synthesized automation validates through supplied Activity parser",
    automation.validation.available && automation.validation.valid, automation.validation);
  const skippedValidation = validateSynthesizedAutomation([], {
    parseAllBlocks: null,
    useRuntimeApi: false
  });
  record(results, "missing Activity parser reports skipped validation",
    skippedValidation.available === false && skippedValidation.valid === null && skippedValidation.skipped,
    skippedValidation);

  const insightInput = {
    text: "A rare blade",
    result: { success: true, item: { name: "Blade", description: "" }, errors: [], warnings: [] },
    trace: {
      selectedParser: "NaturalItemParser", inputKind: "natural",
      extractedFields: { name: "Blade", rarity: "rare", weight: 1 },
      confidence: { name: 0.9, rarity: 0.9, weight: 0.4 }
    }
  };
  const insightsA = buildItemParseInsights(insightInput);
  const insightsB = buildItemParseInsights(insightInput);
  record(results, "parse insights are deterministic and local-only",
    JSON.stringify(insightsA) === JSON.stringify(insightsB)
      && insightsA.localOnly && insightsA.suggestions.some((entry) => entry.field === "weight"), insightsA);

  const irrelevantWeaponFields = new Set([
    "equipmentType", "baseEquipment", "armorClass", "maxDexModifier",
    "strengthRequirement", "equipmentProperties", "toolType", "baseTool",
    "toolBonus", "toolAbility", "toolProficiency", "containerCapacity",
    "containerProperties", "currencyContents", "lootType", "lootProperties"
  ]);
  const focusedWeaponInsights = buildItemParseInsights({
    text: "Focus Blade, a martial weapon with defined damage.",
    result: {
      success: true,
      item: { name: "Focus Blade", type: "weapon", description: "Defined damage." },
      errors: [],
      warnings: []
    },
    trace: {
      selectedParser: "NaturalItemParser",
      inputKind: "natural",
      extractedFields: {
        name: "Focus Blade",
        itemType: "weapon",
        weaponType: "martialM",
        damage: { formula: "1d8", type: "slashing" },
        equipmentType: "clothing",
        toolType: "artisan",
        containerProperties: { weightlessContents: false },
        lootType: "gear",
        "extension.reviewMarker": "retained"
      },
      confidence: {
        name: 0.9,
        itemType: 0.9,
        weaponType: 0.9,
        damage: 0.9,
        equipmentType: 0.1,
        toolType: 0.1,
        containerProperties: 0.1,
        lootType: 0.1,
        "extension.reviewMarker": 0.9
      }
    }
  });
  record(results, "weapon insights exclude other Item type review fields",
    !focusedWeaponInsights.provenance.some((entry) => irrelevantWeaponFields.has(entry.field))
      && !focusedWeaponInsights.suggestions.some((entry) => irrelevantWeaponFields.has(entry.field))
      && focusedWeaponInsights.provenance.some((entry) => entry.field === "extension.reviewMarker"),
    focusedWeaponInsights);
  record(results, "weapon overall confidence averages relevant and unknown fields only",
    focusedWeaponInsights.confidence.overall === 0.9
      && Object.keys(focusedWeaponInsights.confidence.fields).length === 5,
    focusedWeaponInsights.confidence);

  const naturalText = "Venom Dagger\nWeapon (dagger), rare\nDamage: 1d4 piercing\nProperties: finesse, light\nOn a hit, the target takes an extra 1d6 poison damage.";
  const naturalPreview = parseItemText(naturalText, { trace: true, synthesizeAutomation: false });
  const naturalAccepted = parseItemText(naturalText, { trace: true, synthesizeAutomation: true });
  record(results, "normal routing always returns insights and automation suggestions",
    naturalPreview.success && naturalPreview.insights?.localOnly
      && naturalPreview.trace?.automation?.pendingActivities?.length === 1,
    naturalPreview);
  record(results, "natural automation attachment is explicitly option-driven",
    naturalPreview.item?.pendingActivities?.length === 0
      && naturalAccepted.item?.pendingActivities?.length === 1,
    { preview: naturalPreview.item?.pendingActivities, accepted: naturalAccepted.item?.pendingActivities });
  record(results, "natural weapon suggestions omit equipment, tool, container, and loot defaults",
    !naturalPreview.insights?.suggestions?.some((entry) => irrelevantWeaponFields.has(entry.field)),
    naturalPreview.insights);

  clearCompendiumImageCandidateCache({ resetStats: true });
  const imageCandidates = [
    { name: "Blade A", img: "icons/a.webp", score: 1 },
    { name: "Blade B", img: "icons/b.webp", score: 1 }
  ];
  const imageA = selectCompendiumImageCandidate(imageCandidates, { seed: "same-seed", useCache: false });
  const imageB = selectCompendiumImageCandidate(imageCandidates, { seed: "same-seed", useCache: false });
  record(results, "compendium image selection supports deterministic seeds", imageA?.img === imageB?.img, { imageA, imageB });
  clearCompendiumImageCandidateCache();
  selectCompendiumImageCandidate(imageCandidates, { seed: "alpha", cacheKey: "same-item" });
  const cachedBeta = selectCompendiumImageCandidate(imageCandidates, { seed: "beta", cacheKey: "same-item" });
  const directBeta = selectCompendiumImageCandidate(imageCandidates, { seed: "beta", useCache: false });
  record(results, "compendium image cache keys include the deterministic seed",
    cachedBeta?.img === directBeta?.img && directBeta?.img === "icons/b.webp",
    { cachedBeta, directBeta });
  const deterministicBest = selectCompendiumImageCandidate([
    { name: "Lower Match", img: "icons/lower.webp", score: 0.9 },
    { name: "Best Match", img: "icons/best.webp", score: 1 }
  ], { deterministic: true, useCache: false });
  record(results, "deterministic compendium image mode selects the highest-ranked match",
    deterministicBest?.img === "icons/best.webp", deterministicBest);
  const collected = await collectCompendiumImageCandidates("Core Blade", {
    itemType: "weapon",
    useCache: false,
    packs: [{
      documentName: "Item",
      collection: "tests.items",
      async getIndex() {
        return [{ _id: "abc", name: "Core Blade", img: "icons/core.webp", type: "weapon" }];
      }
    }]
  });
  record(results, "compendium collection accepts itemType and emits Foundry 14 UUIDs",
    collected[0]?.uuid === "Compendium.tests.items.Item.abc", collected);
  clearCompendiumImageCandidateCache();
  const thresholdPack = {
    documentName: "Item",
    collection: "tests.threshold-items",
    async getIndex() {
      return [{ _id: "low", name: "Unrelated Pebble", img: "icons/low.webp", type: "weapon" }];
    }
  };
  const lowThresholdCandidates = await collectCompendiumImageCandidates("Core Blade", {
    itemType: "weapon", minimumScore: 0, packs: [thresholdPack]
  });
  const highThresholdCandidates = await collectCompendiumImageCandidates("Core Blade", {
    itemType: "weapon", minimumScore: 0.99, packs: [thresholdPack]
  });
  record(results, "compendium image cache keys include minimumScore",
    lowThresholdCandidates.length === 1 && highThresholdCandidates.length === 0,
    { lowThresholdCandidates, highThresholdCandidates });

  const spellCandidates = getAutoAnimationCandidates({
    name: "Flame Cure", type: "spell", spellSchool: "evo",
    damage: { type: "fire" },
    pendingActivities: [{ key: "ACTIVITY_HEAL", rawData: {} }]
  });
  const preview = getAutoAnimationPreview({
    name: "Flame Cure", type: "spell", spellSchool: "evo",
    damage: { type: "fire" }, pendingActivities: [{ key: "ACTIVITY_HEAL", rawData: {} }]
  }, { checkAvailability: false });
  record(results, "AutoAnimations candidates cover spells and activity hints",
    spellCandidates.some((entry) => entry.id === "damage-fire")
      && spellCandidates.some((entry) => entry.id === "activity-heal")
      && preview.activityAware, { spellCandidates, preview });
  const hadOwnSequencer = Object.hasOwn(globalThis, "Sequencer");
  const previousSequencer = globalThis.Sequencer;
  let sequencerBindingResult = null;
  let unavailablePreviewResult = null;
  let unavailableWeaponFlags = undefined;
  try {
    globalThis.Sequencer = {
      Database: {
        entryExists(path) {
          return path === "autoanimations.melee.weapon.sword.01.white";
        },
        getEntry(path) {
          const exists = this.entryExists(path);
          return exists ? { file: path } : null;
        }
      }
    };
    sequencerBindingResult = AutoAnimationsHandler.isVideoAvailable({
      dbSection: "melee",
      menuType: "weapon",
      animation: "sword",
      variant: "01",
      color: "white"
    });
    globalThis.Sequencer.Database.entryExists = () => false;
    unavailablePreviewResult = getAutoAnimationPreview({
      name: "Unavailable Flame",
      type: "spell",
      spellSchool: "evo",
      damage: { type: "fire" }
    });
    unavailableWeaponFlags = AutoAnimationsHandler.generateFlags({
      name: "Unavailable Sword",
      type: "weapon",
      weaponType: "martialM",
      baseWeapon: "longsword",
      properties: []
    });
  } catch (error) {
    sequencerBindingResult = error;
  } finally {
    if (hadOwnSequencer) globalThis.Sequencer = previousSequencer;
    else Reflect.deleteProperty(globalThis, "Sequencer");
  }
  record(results, "AutoAnimations preserves the Sequencer Database receiver binding",
    sequencerBindingResult === true, sequencerBindingResult);
  record(results, "AutoAnimations refuses unavailable Sequencer candidates instead of previewing invalid paths",
    unavailablePreviewResult?.selected === null && unavailableWeaponFlags === null,
    { unavailablePreviewResult, unavailableWeaponFlags });
  const aaItems = [
    { name: "AA Spell", type: "spell", spellSchool: "evo" },
    { name: "AA Potion", type: "consumable", consumableType: "potion" },
    { name: "AA Tool", type: "tool", pendingActivities: [{ key: "ACTIVITY_UTILITY", rawData: {} }] },
    { name: "AA Shield", type: "equipment", armorType: "shield" }
  ];
  for (const aaItem of aaItems) {
    const generated = AutoAnimationsHandler.generateFlags(aaItem, { checkAvailability: false });
    record(results, `AutoAnimations persists semantic flags for ${aaItem.type}`,
      generated?.autoanimations?.version === 5
        && generated.autoanimations.primary?.video?.animation
        && generated?.["5e-item-importer"]?.autoAnimationHint?.id,
      generated);
  }
  const explicitCandidateFlags = buildAutoAnimationFlagsFromCandidate(
    { name: "Explicit AA" }, spellCandidates[0], { id: "00000000-0000-4000-8000-000000000000" }
  );
  record(results, "explicit AA candidate builds valid persisted flag structure",
    explicitCandidateFlags?.autoanimations?.primary?.video
      && explicitCandidateFlags.autoanimations.meleeSwitch?.options?.switchType === "off",
    explicitCandidateFlags);

  const flags = createStrictYamlAttachmentFlags(activityPayload("Persisted"));
  record(results, "attachment provenance flags preserve strict YAML payload",
    flags?.["5e-item-importer"]?.strictYaml?.ACTIVITY_DAMAGE?.ACTIVITY?.Name === "Persisted"
      && !Object.prototype.hasOwnProperty.call(flags?.["5e-item-importer"] ?? {}, "rawData"), flags);
  const foundryLike = {
    ...itemFixtures[4],
    system: {
      activities: [{ flags: createStrictYamlAttachmentFlags(activityPayload("Foundry Activity")) }]
    },
    effects: [{ flags: createStrictYamlAttachmentFlags(effectPayload("Foundry Effect")) }]
  };
  const foundryLikeDocument = itemToStrictYamlDocument(foundryLike, { propertyRegistry });
  record(results, "exporter recovers canonical attachment flags from Foundry documents",
    foundryLikeDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.ACTIVITY?.Name === "Foundry Activity"
      && foundryLikeDocument.LOOT.effects?.[0]?.DETAILS?.Name === "Foundry Effect",
    foundryLikeDocument.LOOT);

  const linkedActivityPayload = activityPayload("Activity With Linked Effect");
  linkedActivityPayload.ACTIVITY_DAMAGE.APPLIED_EFFECTS = [effectPayload("Inline Poisoned").EFFECT];
  const foundryLinkedEffect = {
    ...itemFixtures[4],
    system: {
      activities: [{
        effects: new Set([{ id: "linked-effect" }]),
        flags: createStrictYamlAttachmentFlags(linkedActivityPayload)
      }]
    },
    effects: [{
      _id: "linked-effect",
      flags: createStrictYamlAttachmentFlags(effectPayload("Inline Poisoned"))
    }]
  };
  const linkedEffectDocument = itemToStrictYamlDocument(foundryLinkedEffect, { propertyRegistry });
  record(results, "exporter does not duplicate activity-linked effects as standalone effects",
    linkedEffectDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.APPLIED_EFFECTS?.length === 1
      && !Object.prototype.hasOwnProperty.call(linkedEffectDocument.LOOT, "effects"),
    linkedEffectDocument.LOOT);

  const applicationPayload = activityPayload("Activity With Applied Effect Metadata");
  applicationPayload.ACTIVITY_DAMAGE.APPLIED_EFFECTS = [{
    ...effectPayload("Inline Poisoned").EFFECT,
    APPLICATION: { "Level Minimum": 3 }
  }];
  const applicationLinkedDocument = itemToStrictYamlDocument({
    ...itemFixtures[4],
    system: {
      activities: [{
        effects: new Set([{ id: "application-linked-effect" }]),
        flags: createStrictYamlAttachmentFlags(applicationPayload)
      }]
    },
    effects: [{
      _id: "application-linked-effect",
      flags: createStrictYamlAttachmentFlags(effectPayload("Inline Poisoned"))
    }]
  }, { propertyRegistry });
  record(results, "linked-effect matching ignores activity-specific application metadata",
    applicationLinkedDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.APPLIED_EFFECTS?.[0]?.APPLICATION?.["Level Minimum"] === 3
      && !Object.prototype.hasOwnProperty.call(applicationLinkedDocument.LOOT, "effects"),
    applicationLinkedDocument.LOOT);

  const secondLinkedActivityPayload = activityPayload("Second Activity Sharing Effect");
  secondLinkedActivityPayload.ACTIVITY_DAMAGE.APPLIED_EFFECTS = [effectPayload("Inline Poisoned").EFFECT];
  let sharedEffectError = null;
  try {
    itemToStrictYamlDocument({
      ...itemFixtures[4],
      system: {
        activities: [
          {
            _id: "shared-activity-one",
            name: "First Activity Sharing Effect",
            effects: new Set([{ id: "shared-effect" }]),
            flags: createStrictYamlAttachmentFlags(linkedActivityPayload)
          },
          {
            _id: "shared-activity-two",
            name: "Second Activity Sharing Effect",
            effects: new Set([{ id: "shared-effect" }]),
            flags: createStrictYamlAttachmentFlags(secondLinkedActivityPayload)
          }
        ]
      },
      effects: [{
        _id: "shared-effect",
        flags: createStrictYamlAttachmentFlags(effectPayload("Inline Poisoned"))
      }]
    }, { propertyRegistry });
  } catch (error) {
    sharedEffectError = error;
  }
  record(results, "exporter rejects shared Activity effects instead of duplicating them",
    sharedEffectError?.code === "ITEM_EXPORT_SHARED_ACTIVITY_EFFECT"
      && sharedEffectError?.effectId === "shared-effect"
      && /prevent data loss/i.test(sharedEffectError?.message ?? ""),
    sharedEffectError);

  const unembeddedLinkedEffect = {
    ...itemFixtures[4],
    system: {
      activities: [{
        name: "Activity Without Embedded Effect",
        type: "damage",
        effects: new Set([{ id: "retained-linked-effect" }]),
        flags: createStrictYamlAttachmentFlags(activityPayload("Activity Without Embedded Effect"))
      }]
    },
    effects: [{
      _id: "retained-linked-effect",
      flags: createStrictYamlAttachmentFlags(effectPayload("Retained Linked Effect"))
    }]
  };
  const unembeddedLinkedEffectDocument = itemToStrictYamlDocument(unembeddedLinkedEffect, { propertyRegistry });
  record(results, "exporter retains linked effects not embedded in their serialized Activity",
    unembeddedLinkedEffectDocument.LOOT.Activities?.length === 1
      && unembeddedLinkedEffectDocument.LOOT.effects?.[0]?.DETAILS?.Name === "Retained Linked Effect",
    unembeddedLinkedEffectDocument.LOOT);

  let serializerCall = null;
  const apiSerializedDocument = itemToStrictYamlDocument({
    ...itemFixtures[4],
    system: {
      activities: [{
        _id: "ordinary-live-activity",
        name: "Ordinary Live Activity",
        type: "damage",
        effects: new Set([{ id: "api-linked-effect" }])
      }]
    },
    effects: [{
      _id: "api-linked-effect",
      flags: createStrictYamlAttachmentFlags(effectPayload("API Linked Effect"))
    }]
  }, {
    propertyRegistry,
    activityImporterApi: {
      serializeActivity(source, serializeOptions) {
        serializerCall = { source, serializeOptions };
        const payload = activityPayload("Ordinary Live Activity");
        payload.ACTIVITY_DAMAGE.APPLIED_EFFECTS = [effectPayload("API Linked Effect").EFFECT];
        return { rawData: payload, serializedEffectIds: ["api-linked-effect"] };
      }
    }
  });
  record(results, "exporter validates and uses the Activity Importer public serializer",
    serializerCall?.source?._id === "ordinary-live-activity"
      && serializerCall?.serializeOptions?.format === "object"
      && serializerCall?.serializeOptions?.strictYaml === true
      && apiSerializedDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.ACTIVITY?.Name === "Ordinary Live Activity"
      && !Object.prototype.hasOwnProperty.call(apiSerializedDocument.LOOT, "effects"),
    { serializerCall, document: apiSerializedDocument.LOOT });

  const liveActivityWithStaleProvenance = {
    _id: "edited-live-activity",
    name: "Edited Live Activity",
    type: "damage",
    effects: new Set(),
    flags: createStrictYamlAttachmentFlags(activityPayload("Old Activity Name")),
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        type: this.type,
        effects: [],
        flags: this.flags
      };
    }
  };
  const editedLiveActivityDocument = itemToStrictYamlDocument({
    ...itemFixtures[4],
    system: { activities: [liveActivityWithStaleProvenance] },
    effects: []
  }, {
    propertyRegistry,
    activityImporterApi: {
      serializeActivity(source) {
        return { rawData: activityPayload(source.name), serializedEffectIds: [] };
      }
    }
  });
  record(results, "live Activity serialization supersedes stale provenance flags",
    editedLiveActivityDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.ACTIVITY?.Name === "Edited Live Activity",
    editedLiveActivityDocument.LOOT);

  const staleEffectPayload = effectPayload("Old Effect Name");
  const liveEditedEffect = {
    _id: "edited-live-effect",
    name: "Edited Live Effect",
    flags: createStrictYamlAttachmentFlags(staleEffectPayload),
    toObject() {
      return { _id: this._id, name: this.name, disabled: false, transfer: false, flags: this.flags };
    }
  };
  const editedLiveEffectDocument = itemToStrictYamlDocument({
    ...itemFixtures[4],
    system: { activities: [] },
    effects: [liveEditedEffect]
  }, {
    propertyRegistry,
    activityImporterApi: {
      serializeEffect(source) {
        return { rawData: { EFFECT: effectPayload(source.name).EFFECT } };
      }
    }
  });
  record(results, "live Active Effect serialization supersedes stale provenance flags",
    editedLiveEffectDocument.LOOT.effects?.[0]?.DETAILS?.Name === "Edited Live Effect",
    editedLiveEffectDocument.LOOT);

  const standaloneLiveItem = {
    ...itemFixtures[4],
    system: {
      activities: [{
        _id: "standalone-live-activity",
        name: "Standalone Live Activity",
        type: "utility",
        effects: new Set(),
        toObject() {
          return { _id: this._id, name: this.name, type: this.type, effects: [] };
        }
      }]
    },
    effects: [{
      _id: "standalone-live-effect",
      name: "Standalone Live Effect",
      toObject() {
        return { _id: this._id, name: this.name, disabled: false, transfer: false };
      }
    }]
  };
  const standaloneCoreDocument = itemToStrictYamlDocument(standaloneLiveItem, {
    propertyRegistry,
    activityImporterApi: null,
    includeActivities: false,
    includeEffects: false
  });
  record(results, "core-only export remains available without Activity Importer serializers",
    !Object.prototype.hasOwnProperty.call(standaloneCoreDocument.LOOT, "Activities")
      && !Object.prototype.hasOwnProperty.call(standaloneCoreDocument.LOOT, "effects"),
    standaloneCoreDocument.LOOT);

  const publicApi = createItemImporterApi({
    utils: null,
    openWindow: () => null,
    diagnostics: null,
    version: "test",
    info: () => ({})
  });
  const publicCoreYaml = await publicApi.export(standaloneLiveItem, {
    propertyRegistry,
    activityImporterApi: null
  });
  const publicCoreDocument = jsyaml.load(publicCoreYaml);
  record(results, "public API defaults to standalone core export",
    ITEM_PUBLIC_API_SCHEMA_VERSION === 3
      && publicApi.schemaVersion === 3
      && publicApi.capabilities.exportModes?.join(",") === "core,full"
      && !Object.prototype.hasOwnProperty.call(publicCoreDocument.LOOT, "Activities")
      && !Object.prototype.hasOwnProperty.call(publicCoreDocument.LOOT, "effects"),
    publicCoreDocument.LOOT);

  const publicFullYaml = await publicApi.export(standaloneLiveItem, {
    mode: "full",
    propertyRegistry,
    activityImporterApi: {
      serializeActivity(source) {
        return { rawData: activityPayload(source.name), serializedEffectIds: [] };
      },
      serializeEffect(source) {
        return { rawData: { EFFECT: effectPayload(source.name).EFFECT } };
      }
    }
  });
  const publicFullDocument = jsyaml.load(publicFullYaml);
  record(results, "public API full mode uses companion serializers explicitly",
    publicFullDocument.LOOT.Activities?.[0]?.ACTIVITY_DAMAGE?.ACTIVITY?.Name === "Standalone Live Activity"
      && publicFullDocument.LOOT.effects?.[0]?.DETAILS?.Name === "Standalone Live Effect",
    publicFullDocument.LOOT);

  let unavailableFullExportError = null;
  try {
    await publicApi.exportFull(standaloneLiveItem, {
      propertyRegistry,
      activityImporterApi: null
    });
  } catch (error) {
    unavailableFullExportError = error;
  }
  record(results, "explicit full export fails closed when companion serialization is unavailable",
    unavailableFullExportError?.code === "ITEM_EXPORT_UNSUPPORTED_ACTIVITY"
      && unavailableFullExportError?.activityId === "standalone-live-activity",
    unavailableFullExportError);

  let unsupportedActivityError = null;
  try {
    itemToStrictYamlDocument({
      ...itemFixtures[4],
      system: {
        activities: [{
          _id: "unserializable-live-activity",
          name: "Unserializable Live Activity",
          type: "utility",
          effects: new Set()
        }]
      },
      effects: []
    }, {
      propertyRegistry,
      activityImporterApi: {
        serializeActivity(source) {
          return { schemaVersion: 2, kind: "payload", data: source };
        }
      }
    });
  } catch (error) {
    unsupportedActivityError = error;
  }
  record(results, "exporter rejects noncanonical Activity serializer envelopes instead of omitting live data",
    unsupportedActivityError?.code === "ITEM_EXPORT_UNSUPPORTED_ACTIVITY"
      && unsupportedActivityError?.activityId === "unserializable-live-activity"
      && /prevent data loss/i.test(unsupportedActivityError?.message ?? ""),
    unsupportedActivityError);

  const activitiesExcluded = itemToStrictYamlDocument(foundryLinkedEffect, {
    propertyRegistry,
    includeActivities: false,
    includeEffects: true
  });
  record(results, "public includeActivities=false excludes only Activities",
    !Object.prototype.hasOwnProperty.call(activitiesExcluded.LOOT, "Activities")
      && activitiesExcluded.LOOT.effects?.[0]?.DETAILS?.Name === "Inline Poisoned",
    activitiesExcluded.LOOT);

  const effectsExcluded = itemToStrictYamlDocument(foundryLinkedEffect, {
    propertyRegistry,
    includeActivities: true,
    includeEffects: false
  });
  record(results, "public includeEffects=false excludes embedded and standalone effects",
    effectsExcluded.LOOT.Activities?.length === 1
      && !Object.prototype.hasOwnProperty.call(effectsExcluded.LOOT.Activities[0].ACTIVITY_DAMAGE, "APPLIED_EFFECTS")
      && !Object.prototype.hasOwnProperty.call(effectsExcluded.LOOT, "effects"),
    effectsExcluded.LOOT);

  const aliasesOverrideLegacy = itemToStrictYamlDocument(foundryLinkedEffect, {
    propertyRegistry,
    includeAttachments: false,
    includeActivities: true,
    includeEffects: false
  });
  record(results, "public attachment aliases take precedence over legacy aggregate options",
    aliasesOverrideLegacy.LOOT.Activities?.length === 1
      && !Object.prototype.hasOwnProperty.call(aliasesOverrideLegacy.LOOT, "effects"),
    aliasesOverrideLegacy.LOOT);

  const foundryAttunement = {
    ...itemFixtures[0],
    system: { attunement: "required", attunedBy: "system fallback" },
    flags: { "5e-item-importer": { attunementRequirement: "by a spellcaster" } }
  };
  const foundryAttunementDocument = itemToStrictYamlDocument(foundryAttunement, { propertyRegistry });
  record(results, "exporter recovers the Foundry attunement qualifier flag",
    foundryAttunementDocument.WEAPON.ATTUNEMENT?.["Attunement By"] === "by a spellcaster",
    foundryAttunementDocument.WEAPON.ATTUNEMENT);

  const foundryUnattuned = {
    ...itemFixtures[0],
    system: { attunement: "none" },
    flags: { "5e-item-importer": { attunementRequirement: "stale qualifier" } }
  };
  const foundryUnattunedDocument = itemToStrictYamlDocument(foundryUnattuned, { propertyRegistry });
  record(results, "exporter ignores stale qualifier flags when attunement is none",
    foundryUnattunedDocument.WEAPON.ATTUNEMENT?.["Attunement By"] === "n/a",
    foundryUnattunedDocument.WEAPON.ATTUNEMENT);

  const formulaUsesDocument = itemToStrictYamlDocument({
    ...itemFixtures[0],
    uses: { value: 1, max: "@prof" },
    recovery: [{ period: "recharge", type: "recoverAll", formula: "5" }]
  }, { propertyRegistry });
  const formulaUsesParsed = new YamlItemParser({ propertyRegistry }).parse(
    jsyaml.dump(formulaUsesDocument, { lineWidth: -1 })
  );
  await formulaUsesParsed.item?.buildFoundryData({ deterministicIcons: true });
  record(results, "formula Uses Max and recharge thresholds round-trip without numeric coercion",
    formulaUsesDocument.WEAPON.USAGE?.["Uses Max"] === "@prof"
      && formulaUsesParsed.success
      && formulaUsesParsed.item?.uses?.max === "@prof"
      && formulaUsesParsed.item?.recovery?.[0]?.formula === "5"
      && formulaUsesParsed.item?.toJSON?.().foundryData?.system?.uses?.max === "@prof"
      && formulaUsesParsed.item?.toJSON?.().foundryData?.system?.uses?.recovery?.[0]?.formula === "5",
    { document: formulaUsesDocument.WEAPON, parsed: formulaUsesParsed });

  const preparedFormulaUsesDocument = itemToStrictYamlDocument({
    ...itemFixtures[0],
    uses: undefined,
    _source: {
      system: {
        uses: {
          max: "@prof",
          spent: 1,
          recovery: [{ period: "recharge", type: "recoverAll", formula: "5" }]
        }
      }
    },
    system: {
      uses: {
        max: 4,
        spent: 1,
        recovery: [{ period: "recharge", type: "recoverAll", formula: "6" }]
      }
    }
  }, { propertyRegistry });
  record(results, "live exporter prefers raw Uses formulas over prepared numeric values",
    preparedFormulaUsesDocument.WEAPON.USAGE?.["Uses Max"] === "@prof"
      && preparedFormulaUsesDocument.WEAPON.USAGE?.["Uses Spent"] === 1
      && preparedFormulaUsesDocument.WEAPON.RECOVERY?.[0]?.Formula === "5",
    preparedFormulaUsesDocument.WEAPON);

  const legacyFormulaCurrent = new YamlItemParser({ propertyRegistry }).parse([
    "CONSUMABLE:",
    "  ITEM:",
    "    Name: Formula Legacy Current",
    "    Consumable Type: wand",
    "  USAGE:",
    "    Uses Current: 1",
    "    Uses Max: '@prof'"
  ].join("\n"));
  record(results, "legacy remaining uses fail closed against formula maxima",
    legacyFormulaCurrent.success === false
      && legacyFormulaCurrent.item === null
      && legacyFormulaCurrent.errors?.some(error => error.includes("provide Uses Spent")),
    legacyFormulaCurrent);

  const magicFormulaDocument = itemToStrictYamlDocument(itemFixtures[0], { propertyRegistry });
  magicFormulaDocument.WEAPON.PROPERTIES.Magical = false;
  magicFormulaDocument.WEAPON.ATTUNEMENT["Magic Bonus"] = "@prof";
  const magicFormulaParsed = new YamlItemParser({ propertyRegistry }).parse(
    jsyaml.dump(magicFormulaDocument, { lineWidth: -1 })
  );
  await magicFormulaParsed.item?.buildFoundryData({ deterministicIcons: true });

  const negativeMagicDocument = itemToStrictYamlDocument(itemFixtures[0], { propertyRegistry });
  negativeMagicDocument.WEAPON.ATTUNEMENT["Magic Bonus"] = -1;
  const negativeMagicParsed = new YamlItemParser({ propertyRegistry }).parse(
    jsyaml.dump(negativeMagicDocument, { lineWidth: -1 })
  );

  const diceMagicDocument = itemToStrictYamlDocument(itemFixtures[0], { propertyRegistry });
  diceMagicDocument.WEAPON.ATTUNEMENT["Magic Bonus"] = "1d4";
  const diceMagicParsed = new YamlItemParser({ propertyRegistry }).parse(
    jsyaml.dump(diceMagicDocument, { lineWidth: -1 })
  );

  const diceToolDocument = itemToStrictYamlDocument(itemFixtures[3], { propertyRegistry });
  diceToolDocument.TOOL.PROPERTIES["Tool Bonus"] = "1d4";
  const diceToolParsed = new YamlItemParser({ propertyRegistry }).parse(
    jsyaml.dump(diceToolDocument, { lineWidth: -1 })
  );
  await diceToolParsed.item?.buildFoundryData({ deterministicIcons: true });

  record(results, "FormulaField bonuses preserve deterministic magic and general tool formulas",
    magicFormulaParsed.success
      && magicFormulaParsed.item?.magicBonus === "@prof"
      && magicFormulaParsed.item?.isMagical === true
      && magicFormulaParsed.item?.toJSON?.().foundryData?.system?.magicalBonus === "@prof"
      && negativeMagicParsed.success
      && negativeMagicParsed.item?.magicBonus === -1
      && diceMagicParsed.success === false
      && diceMagicParsed.item === null
      && diceToolParsed.success
      && diceToolParsed.item?.toolBonus === "1d4"
      && diceToolParsed.item?.toJSON?.().foundryData?.system?.bonus === "1d4",
    { magicFormulaParsed, negativeMagicParsed, diceMagicParsed, diceToolParsed });

  const preparedMagicBonusDocument = itemToStrictYamlDocument({
    ...itemFixtures[0],
    magicBonus: undefined,
    isMagical: false,
    properties: [],
    _source: { system: { magicalBonus: "@prof" } },
    system: { magicalBonus: 4 }
  }, { propertyRegistry });
  record(results, "live exporter prefers raw magicalBonus formulas and marks the Item magical",
    preparedMagicBonusDocument.WEAPON.ATTUNEMENT?.["Magic Bonus"] === "@prof"
      && preparedMagicBonusDocument.WEAPON.PROPERTIES?.Magical === true,
    preparedMagicBonusDocument.WEAPON);

  const passed = results.filter((result) => result.passed).length;
  const summary = { passed, failed: results.length - passed, total: results.length, results };
  if (options.log !== false) {
    console.group?.(`5e Item Importer | Core feature tests: ${passed}/${results.length}`);
    for (const result of results) {
      const method = result.passed ? "log" : "error";
      console[method](`${result.passed ? "PASS" : "FAIL"} ${result.name}`, result.details ?? "");
    }
    console.groupEnd?.();
  }
  return summary;
}
