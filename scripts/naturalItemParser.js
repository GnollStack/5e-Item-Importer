/**
 * 5e Item Importer - Natural Language Parser
 * Parses free-form text (D&D Beyond, PDFs, etc.) and converts to strict template
 *
 * Flow:
 * 1. Extract data from unstructured text using heuristics and regex
 * 2. Build a strict template from extracted data
 * 3. Pass to strict parser for final processing
 *
 * This allows us to reuse all the strict parser validation and transformation logic
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_NAME } from "./itemConfig.js";
import { getParserForText } from "./strictItemParsers/strictParserDispatcher.js";
import { ItemRegex } from "./itemRegex.js";
import jsyaml from "./vendor/js-yaml.mjs";
import { ITEM_YAML_SCHEMA_KEY, ITEM_YAML_SCHEMA_VERSION } from "./strictItemParsers/itemSchemaVersion.js";
import { deriveParseProvenance } from "./itemParseInsights.js";
import { synthesizeNaturalAutomation } from "./naturalAutomationSynthesis.js";

function getDefaultIdentifiedSetting() {
  if (typeof game === "undefined") return true;
  return game.settings?.get?.(MODULE_NAME, "createIdentified") ?? true;
}

function inferVersatileFormula(formula) {
  const match = String(formula ?? "").match(/^1d(4|6|8|10)$/i);
  if (!match) return null;
  const nextDie = { 4: 6, 6: 8, 8: 10, 10: 12 }[match[1]];
  return nextDie ? `1d${nextDie}` : null;
}

export class NaturalItemParser {
  constructor(options = {}) {
    this.options = options;
    this.errors = [];
    this.warnings = [];
    this.text = "";
    this.confidence = {}; // Track confidence scores for extracted fields
    this.trace = null;
    this.extractedQuantity = null;
  }

  // Base armor data lookup table for inheriting properties
  // AC values are the base AC (before Dex), maxDex null means unlimited
  static BASE_ARMOR_DATA = {
    // Light armor (AC + Dex modifier)
    padded: { ac: 11, maxDex: null, stealthDisadvantage: true, strengthReq: null },
    leather: { ac: 11, maxDex: null, stealthDisadvantage: false, strengthReq: null },
    studdedleather: { ac: 12, maxDex: null, stealthDisadvantage: false, strengthReq: null },

    // Medium armor (AC + Dex modifier, max 2)
    hide: { ac: 12, maxDex: 2, stealthDisadvantage: false, strengthReq: null },
    chainshirt: { ac: 13, maxDex: 2, stealthDisadvantage: false, strengthReq: null },
    scalemail: { ac: 14, maxDex: 2, stealthDisadvantage: true, strengthReq: null },
    breastplate: { ac: 14, maxDex: 2, stealthDisadvantage: false, strengthReq: null },
    halfplate: { ac: 15, maxDex: 2, stealthDisadvantage: true, strengthReq: null },

    // Heavy armor (no Dex modifier)
    ringmail: { ac: 14, maxDex: 0, stealthDisadvantage: true, strengthReq: null },
    chainmail: { ac: 16, maxDex: 0, stealthDisadvantage: true, strengthReq: 13 },
    splint: { ac: 17, maxDex: 0, stealthDisadvantage: true, strengthReq: 15 },
    plate: { ac: 18, maxDex: 0, stealthDisadvantage: true, strengthReq: 15 },

    // Shield
    shield: { ac: 2, maxDex: null, stealthDisadvantage: false, strengthReq: null },
  };

  // Base weapon data lookup table for inheriting properties
  static BASE_WEAPON_DATA = {
    // Simple Melee
    club: { damage: "1d4", damageType: "bludgeoning", weaponType: "simpleM", properties: ["light"] },
    dagger: { damage: "1d4", damageType: "piercing", weaponType: "simpleM", properties: ["finesse", "light", "thrown"], range: { normal: 20, long: 60 } },
    greatclub: { damage: "1d8", damageType: "bludgeoning", weaponType: "simpleM", properties: ["twoHanded"] },
    handaxe: { damage: "1d6", damageType: "slashing", weaponType: "simpleM", properties: ["light", "thrown"], range: { normal: 20, long: 60 } },
    javelin: { damage: "1d6", damageType: "piercing", weaponType: "simpleM", properties: ["thrown"], range: { normal: 30, long: 120 } },
    lighthammer: { damage: "1d4", damageType: "bludgeoning", weaponType: "simpleM", properties: ["light", "thrown"], range: { normal: 20, long: 60 } },
    mace: { damage: "1d6", damageType: "bludgeoning", weaponType: "simpleM", properties: [] },
    quarterstaff: { damage: "1d6", damageType: "bludgeoning", weaponType: "simpleM", properties: ["versatile"], versatile: "1d8" },
    sickle: { damage: "1d4", damageType: "slashing", weaponType: "simpleM", properties: ["light"] },
    spear: { damage: "1d6", damageType: "piercing", weaponType: "simpleM", properties: ["thrown", "versatile"], versatile: "1d8", range: { normal: 20, long: 60 } },

    // Simple Ranged
    lightcrossbow: { damage: "1d8", damageType: "piercing", weaponType: "simpleR", properties: ["ammunition", "loading", "twoHanded"], range: { normal: 80, long: 320 } },
    dart: { damage: "1d4", damageType: "piercing", weaponType: "simpleR", properties: ["finesse", "thrown"], range: { normal: 20, long: 60 } },
    shortbow: { damage: "1d6", damageType: "piercing", weaponType: "simpleR", properties: ["ammunition", "twoHanded"], range: { normal: 80, long: 320 } },
    sling: { damage: "1d4", damageType: "bludgeoning", weaponType: "simpleR", properties: ["ammunition"], range: { normal: 30, long: 120 } },

    // Martial Melee
    battleaxe: { damage: "1d8", damageType: "slashing", weaponType: "martialM", properties: ["versatile"], versatile: "1d10" },
    flail: { damage: "1d8", damageType: "bludgeoning", weaponType: "martialM", properties: [] },
    glaive: { damage: "1d10", damageType: "slashing", weaponType: "martialM", properties: ["heavy", "reach", "twoHanded"] },
    greataxe: { damage: "1d12", damageType: "slashing", weaponType: "martialM", properties: ["heavy", "twoHanded"] },
    greatsword: { damage: "2d6", damageType: "slashing", weaponType: "martialM", properties: ["heavy", "twoHanded"] },
    halberd: { damage: "1d10", damageType: "slashing", weaponType: "martialM", properties: ["heavy", "reach", "twoHanded"] },
    lance: { damage: "1d12", damageType: "piercing", weaponType: "martialM", properties: ["reach", "special"] },
    longsword: { damage: "1d8", damageType: "slashing", weaponType: "martialM", properties: ["versatile"], versatile: "1d10" },
    maul: { damage: "2d6", damageType: "bludgeoning", weaponType: "martialM", properties: ["heavy", "twoHanded"] },
    morningstar: { damage: "1d8", damageType: "piercing", weaponType: "martialM", properties: [] },
    pike: { damage: "1d10", damageType: "piercing", weaponType: "martialM", properties: ["heavy", "reach", "twoHanded"] },
    rapier: { damage: "1d8", damageType: "piercing", weaponType: "martialM", properties: ["finesse"] },
    scimitar: { damage: "1d6", damageType: "slashing", weaponType: "martialM", properties: ["finesse", "light"] },
    shortsword: { damage: "1d6", damageType: "piercing", weaponType: "martialM", properties: ["finesse", "light"] },
    trident: { damage: "1d6", damageType: "piercing", weaponType: "martialM", properties: ["thrown", "versatile"], versatile: "1d8", range: { normal: 20, long: 60 } },
    warhammer: { damage: "1d8", damageType: "bludgeoning", weaponType: "martialM", properties: ["versatile"], versatile: "1d10" },
    warpick: { damage: "1d8", damageType: "piercing", weaponType: "martialM", properties: [] },
    whip: { damage: "1d4", damageType: "slashing", weaponType: "martialM", properties: ["finesse", "reach"] },

    // Martial Ranged
    blowgun: { damage: "1", damageType: "piercing", weaponType: "martialR", properties: ["ammunition", "loading"], range: { normal: 25, long: 100 } },
    handcrossbow: { damage: "1d6", damageType: "piercing", weaponType: "martialR", properties: ["ammunition", "light", "loading"], range: { normal: 30, long: 120 } },
    heavycrossbow: { damage: "1d10", damageType: "piercing", weaponType: "martialR", properties: ["ammunition", "heavy", "loading", "twoHanded"], range: { normal: 100, long: 400 } },
    longbow: { damage: "1d8", damageType: "piercing", weaponType: "martialR", properties: ["ammunition", "heavy", "twoHanded"], range: { normal: 150, long: 600 } },
    net: { damage: null, damageType: null, weaponType: "martialR", properties: ["special", "thrown"], range: { normal: 5, long: 15 } },
  };



  /**
   * Main entry point - Parse natural language text
   * @param {string} text - Unstructured text to parse
   * @returns {Object} { success: boolean, item: ItemData|null, errors: string[], warnings: string[] }
   */
  parse(text) {
    this.reset();

    // Normalize text first to handle encoding issues
    this.text = ItemRegex.normalizeText(text);
    this.trace = {
      selectedParser: "NaturalItemParser",
      inputKind: "natural",
      inputLength: this.text.length
    };

    if (!this.text) {
      this.addError("Empty text provided");
      return this.createResult(false, null);
    }

    // Detect input format for better parsing
    this.inputFormat = this.detectInputFormat(this.text);
    this.trace.inputFormat = this.inputFormat;
    ItemUtils.log(`NaturalItemParser: Detected format: ${this.inputFormat}`);

    ItemUtils.log("NaturalItemParser: Starting natural language parsing...");

    try {
      // Step 1: Extract all fields from natural language
      ItemUtils.log(
        "NaturalItemParser: Extracting fields from natural language..."
      );
      const extracted = this.extractAllFields(this.text);
      this.trace.extractedFields = extracted;
      this.trace.confidence = { ...this.confidence };
      this.trace.provenance = deriveParseProvenance({
        text: this.text,
        extractedFields: extracted,
        confidence: this.confidence,
        parser: "NaturalItemParser"
      });

      // Step 2: Build strict template from extracted data
      ItemUtils.log(
        "NaturalItemParser: Building strict template from extracted data..."
      );
      const strictTemplate = this.buildStrictTemplate(extracted);
      this.trace.generatedStrictTemplate = strictTemplate;

      // Log the generated template for debugging
      if (game.settings.get("5e-item-importer", "debug")) {
        console.log("Generated Strict Template:", strictTemplate);
      }

      // Step 3: Pass to strict parser for processing
      ItemUtils.log("NaturalItemParser: Passing to strict parser...");
      const strictParser = getParserForText(strictTemplate);
      const result = strictParser.parse(strictTemplate);
      this.trace.yaml = strictParser.trace ?? null;
      this.trace.errors = result.errors ?? [];
      this.trace.warnings = result.warnings ?? [];

      const automation = synthesizeNaturalAutomation(this.text, {
        name: extracted.name,
        itemType: extracted.itemType
      });
      this.trace.automation = {
        ...automation,
        enabledForImport: this.options.synthesizeAutomation === true
      };
      if (this.options.synthesizeAutomation === true
          && result.success && result.item && automation.pendingActivities.length > 0) {
        const validatedEntries = automation.validation.available
          ? automation.pendingActivities.filter((entry) =>
              automation.validation.results.some((checked) =>
                checked.valid && checked.key === entry.key && checked.name === entry.name
              )
            )
          : automation.pendingActivities;
        const existing = Array.isArray(result.item.pendingActivities)
          ? result.item.pendingActivities
          : [];
        const signatures = new Set(existing.map((entry) =>
          `${entry.key}|${entry.name}|${JSON.stringify(entry.rawData)}`
        ));
        for (const entry of validatedEntries) {
          const signature = `${entry.key}|${entry.name}|${JSON.stringify(entry.rawData)}`;
          if (!signatures.has(signature)) {
            existing.push(entry);
            signatures.add(signature);
          }
        }
        result.item.pendingActivities = existing;
        if (automation.validation.available && !automation.validation.valid) {
          result.warnings = [
            ...(result.warnings ?? []),
            ...automation.validation.errors.map((message) => `Skipped invalid synthesized automation: ${message}`)
          ];
        }
      }

      // Add our warnings to the result
      if (this.warnings.length > 0) {
        result.warnings = [...result.warnings, ...this.warnings];
      }
      this.trace.errors = result.errors ?? [];
      this.trace.warnings = result.warnings ?? [];

      ItemUtils.log("NaturalItemParser: Natural language parsing completed");
      return result;
    } catch (error) {
      ItemUtils.error(
        "NaturalItemParser: Unexpected error during natural parsing",
        error
      );
      this.addError(
        `Unexpected error during natural parsing: ${error.message}`
      );
      this.trace.errors = [...this.errors];
      return this.createResult(false, null);
    }
  }

  /**
   * Detect the format of the input text
   * @param {string} text - The text to analyze
   * @returns {string} Format type: 'dndbeyond', 'srd', 'statblock', 'freeform'
   */
  detectInputFormat(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // D&D Beyond format: has specific markers like "Type:", "Rarity:", bullets
    if (
      text.includes("Type:") &&
      text.includes("Rarity:") &&
      /^[•\-\*]/.test(text)
    ) {
      return "dndbeyond";
    }

    // SRD/Statblock format: Item name on first line, then type line in format "Category (details), rarity"
    if (lines.length >= 2) {
      const secondLine = lines[1];
      if (
        ItemRegex.typeLine.test(secondLine) ||
        /\b(weapon|armor|potion|wondrous item)\b.*?,.*?\b(common|uncommon|rare)\b/i.test(
          secondLine
        )
      ) {
        return "statblock";
      }
    }

    // Structured format: has clear sections with headers/labels
    if (text.match(/(?:Cost|Price|Weight|Damage|Properties):/gi)?.length >= 2) {
      return "srd";
    }

    // Default to freeform (paragraph description)
    return "freeform";
  }

  /**
   * Extract all possible fields from natural language text
   * @param {string} text - The text to extract from
   * @returns {Object} Extracted field data
   */
  extractAllFields(text) {
    ItemUtils.log("NaturalItemParser: Extracting fields...");

    // Resolve the broad item category and concrete base/subtype first. Later
    // extractors use these values to avoid treating rules prose as base stats.
    const itemType = this.guessItemType(text);
    const baseWeapon = itemType === 'weapon' ? this.extractBaseWeapon(text) : null;
    const consumableType = itemType === 'consumable' ? this.extractConsumableType(text) : null;

    const extracted = {
      // Universal fields
      name: this.extractName(text),
      itemType,
      rarity: this.extractRarity(text),
      cost: this.extractCost(text),
      weight: this.extractWeight(text),
      description: this.extractDescription(text),
      quantity: this.extractQuantity(text),
      uses: this.extractUses(text),

      // Weapon-specific
      weaponType: this.extractWeaponType(text),
      baseWeapon,
      damage: this.extractDamage(text, { baseWeapon }),
      versatileDamage: this.extractVersatileDamage(text),
      properties: this.extractProperties(text),
      mastery: this.extractMastery(text),
      range: this.extractRange(text),
      attunement: this.extractAttunement(text),

      // Equipment-specific
      equipmentType: this.extractEquipmentType(text),
      baseEquipment: this.extractBaseEquipment(text),
      armorClass: this.extractArmorClass(text),
      maxDexModifier: this.extractMaxDexModifier(text),
      strengthRequirement: this.extractStrengthRequirement(text),
      equipmentProperties: this.extractEquipmentProperties(text),
      magicBonus: this.extractMagicBonus(text),

      // Tool-specific
      toolType: this.extractToolType(text),
      baseTool: this.extractBaseTool(text),
      toolBonus: this.extractToolBonus(text),
      toolAbility: this.extractToolAbility(text),
      toolProficiency: this.extractToolProficiency(text),

      // Consumable-specific
      consumableType,
      ammunitionType:
        consumableType === 'ammo' ? this.extractAmmunitionType(text) : null,
      ammunitionProperties:
        consumableType === 'ammo'
          ? this.extractAmmunitionProperties(text)
          : null,
      poisonType:
        consumableType === 'poison' ? this.extractPoisonType(text) : null,
      scrollProperties:
        consumableType === 'scroll'
          ? this.extractScrollProperties(text)
          : null,

      // Container-specific
      containerCapacity: this.extractContainerCapacity(text),
      containerProperties: this.extractContainerProperties(text),
      currencyContents: this.extractCurrencyContents(text),

      // Loot-specific
      lootType: this.extractLootType(text),
      lootProperties: this.extractLootProperties(text),

      // Add more as needed
    };

    ItemUtils.log("NaturalItemParser: Extracted fields", extracted);
    return extracted;
  }

  /**
   * Determine if an item should be considered magical based on multiple signals
   * @param {string} text - The item text
   * @param {Object} extracted - The extracted field data
   * @returns {boolean} Whether the item is magical
   */
  extractIsMagical(text, extracted) {
    // Definite magical indicators
    if (extracted.attunement?.required) {
      ItemUtils.log("NaturalItemParser: Item is magical (requires attunement)");
      return true;
    }

    if (extracted.magicBonus && extracted.magicBonus > 0) {
      ItemUtils.log("NaturalItemParser: Item is magical (has magic bonus)");
      return true;
    }

    if (/\bmagic(al)?\s+(item|weapon|armor|shield)\b/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Item is magical (explicit magic item text)");
      return true;
    }

    if (/\bthis\s+(item|weapon)\s+is\s+magic(al)?\b/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Item is magical (stated as magical)");
      return true;
    }

    // Rarity-based (uncommon+ is magical by RAW)
    const magicalRarities = ["uncommon", "rare", "very rare", "legendary", "artifact"];
    if (extracted.rarity && magicalRarities.includes(extracted.rarity.toLowerCase())) {
      ItemUtils.log(`NaturalItemParser: Item is magical (rarity: ${extracted.rarity})`);
      return true;
    }

    // Common items default to non-magical unless other indicators present
    ItemUtils.log("NaturalItemParser: Item is not magical");
    return false;
  }

  /**
   * Build a strict template from extracted data
   * @param {Object} extracted - The extracted field data
   * @returns {string} A strict template string
   */
  buildStrictTemplate(extracted) {
    ItemUtils.log("NaturalItemParser: Building strict template...");

    // Compute magical status once for all template builders
    extracted.isMagical = this.extractIsMagical(this.text, extracted);

    // Determine item type (defaulting to loot if unknown)
    const itemType = extracted.itemType || "loot";
    const typeKey = this.getTypeKey(itemType);

    // Build universal sections as JS object
    const data = {};

    data.ITEM = {
      Name: extracted.name || "Unnamed Item",
      Rarity: extracted.rarity || "common",
    };

    data.INVENTORY = {
      Quantity: extracted.quantity ?? 1,
      Identified: getDefaultIdentifiedSetting(),
      Equipped: false,
    };

    data.COST_AND_WEIGHT = {
      "Price Value": extracted.cost?.value || 0,
      "Price Denomination": extracted.cost?.denomination || "gp",
      "Weight Value": extracted.weight?.value || 0,
      "Weight Units": extracted.weight?.units || "lb",
    };

    data.DESCRIPTION = {
      Description: extracted.description || "No description available.",
    };

    // Add type-specific sections (mutates data in-place)
    this.buildTypeSpecificSections(itemType, extracted, data);

    // Wrap in top-level type key and serialize to YAML
    const doc = {
      [ITEM_YAML_SCHEMA_KEY]: ITEM_YAML_SCHEMA_VERSION,
      [typeKey]: data
    };
    return jsyaml.dump(doc, { lineWidth: -1 });
  }

  /**
   * Build type-specific sections of the template
   * @param {string} itemType - The item type
   * @param {Object} extracted - Extracted data
   * @returns {string} Type-specific template sections
   */
  buildTypeSpecificSections(itemType, extracted, data) {
    switch (itemType) {
      case "weapon":
        this.buildWeaponSections(extracted, data); break;
      case "loot":
        this.buildLootSections(extracted, data); break;
      case "tool":
        this.buildToolSections(extracted, data); break;
      case "container":
        this.buildContainerSections(extracted, data); break;
      case "consumable":
        this.buildConsumableSections(extracted, data); break;
      case "equipment":
        this.buildEquipmentSections(extracted, data); break;
      default:
        this.buildLootSections(extracted, data); break;
    }
  }

  /**
   * Build weapon-specific sections
   */
buildWeaponSections(extracted, data) {
    // Get base weapon data for property inheritance
    const baseData = extracted.baseWeapon
      ? NaturalItemParser.BASE_WEAPON_DATA[extracted.baseWeapon] || {}
      : {};

    // Weapon type and base - inherit from base weapon if not extracted
    const weaponType = extracted.weaponType || baseData.weaponType || "simpleM";
    data.ITEM["Weapon Type"] = weaponType;
    data.ITEM["Base Weapon"] = extracted.baseWeapon || "n/a";

    // Properties section - merge extracted properties with base weapon properties
    const props = extracted.properties || {};
    const baseProps = baseData.properties || [];
    data.PROPERTIES = {
      Adamantine: props.adamantine || false,
      Ammunition: props.ammunition || baseProps.includes("ammunition"),
      Finesse: props.finesse || baseProps.includes("finesse"),
      Firearm: props.firearm || false,
      Focus: props.focus || false,
      Heavy: props.heavy || baseProps.includes("heavy"),
      Light: props.light || baseProps.includes("light"),
      Loading: props.loading || baseProps.includes("loading"),
      Magical: extracted.isMagical,
      Reach: props.reach || baseProps.includes("reach"),
      Reload: props.reload || false,
      Returning: props.returning || false,
      Silvered: props.silvered || false,
      Special: props.special || baseProps.includes("special"),
      Thrown: props.thrown || baseProps.includes("thrown"),
      "Two-Handed": props.twoHanded || baseProps.includes("twoHanded"),
      Versatile: props.versatile || baseProps.includes("versatile"),
    };

    // Damage section
    data.DAMAGE = {
      "Damage Formula": extracted.damage?.formula || baseData.damage || "1d4",
      "Damage Type": extracted.damage?.type || baseData.damageType || "bludgeoning",
    };

    // Range section
    data.RANGE = {
      Reach: extracted.range?.reach || 5,
      "Range Normal": extracted.range?.normal ?? baseData.range?.normal ?? "n/a",
      "Range Long": extracted.range?.long ?? baseData.range?.long ?? "n/a",
      "Range Units": extracted.range?.units || "ft",
    };

    // Versatile damage section
    const hasVersatile = props.versatile || baseProps.includes("versatile");
    const versatileDamage =
      extracted.versatileDamage?.formula ||
      baseData.versatile ||
      (hasVersatile ? inferVersatileFormula(extracted.damage?.formula || baseData.damage) : null);
    if (versatileDamage || hasVersatile) {
      data.VERSATILE_DAMAGE = {
        "Versatile Formula": versatileDamage || "n/a",
        "Versatile Damage Type":
          extracted.versatileDamage?.type ||
          extracted.damage?.type ||
          baseData.damageType ||
          "bludgeoning",
      };
    } else {
      data.VERSATILE_DAMAGE = {
        "Versatile Formula": "n/a",
        "Versatile Damage Type": "n/a",
      };
    }

    // Mastery section
    data.MASTERY = {
      Mastery: extracted.mastery || "n/a",
    };

    // Proficiency section (separate from MASTERY in YAML parser)
    data.PROFICIENCY = {
      Proficient: "Automatic",
    };

    // Attunement section (include magic bonus even when attunement is not required)
    if (extracted.isMagical && extracted.attunement?.required) {
      data.ATTUNEMENT = {
        Attunement: "required",
        "Attunement By": extracted.attunement.restriction || "n/a",
        "Magic Bonus": extracted.magicBonus || 0,
      };
    } else if (extracted.magicBonus !== null && extracted.magicBonus !== undefined) {
      data.ATTUNEMENT = {
        Attunement: "none",
        "Attunement By": "n/a",
        "Magic Bonus": extracted.magicBonus,
      };
    }
  }

  /**
   * Build loot-specific sections
   */
  buildLootSections(extracted, data) {
    // Add type-specific field to ITEM section
    data.ITEM["Loot Type"] = extracted.lootType || "gear";

    // Properties section
    data.PROPERTIES = {
      Magical: extracted.isMagical,
    };
  }

  /**
   * Build tool-specific sections (stub for now)
   */
  buildToolSections(extracted, data) {
    // Add type-specific fields to ITEM section
    data.ITEM["Tool Type"] = extracted.toolType || "";
    data.ITEM["Base Tool"] = extracted.baseTool || "";

    // Properties section
    data.PROPERTIES = {
      Magical: extracted.isMagical,
      "Tool Bonus": extracted.toolBonus !== null ? extracted.toolBonus : "n/a",
    };

    // Attunement section (only if magical and attunement required)
    if (extracted.isMagical && extracted.attunement?.required) {
      data.ATTUNEMENT = {
        Attunement: "required",
        "Attunement By": extracted.attunement.restriction || "n/a",
      };
    }

    // Ability check section
    const proficiencyMap = {
      expert: "2",
      proficient: "1",
      notproficient: "0",
    };
    data.ABILITY_CHECK = {
      Proficient: proficiencyMap[extracted.toolProficiency] || "Automatic",
      Ability: extracted.toolAbility || "n/a",
    };

    // Usage section
    data.USAGE = {
      "Uses Spent": extracted.uses?.spent ?? extracted.uses?.current ?? 0,
      "Uses Max": extracted.uses?.max ?? 0,
    };
  }

  /**
   * Build container-specific sections (stub for now)
   */
  buildContainerSections(extracted, data) {
    const props = extracted.containerProperties || {};

    // Properties section
    data.PROPERTIES = {
      Magical: extracted.isMagical,
      "Weightless Contents": props.weightlessContents || false,
    };

    // Attunement section (only if magical and attunement required)
    if (extracted.isMagical && extracted.attunement?.required) {
      data.ATTUNEMENT = {
        Attunement: "required",
        "Attunement By": extracted.attunement.restriction || "n/a",
      };
    }

    // Capacity section (optional - only if we found capacity data)
    const capacity = extracted.containerCapacity;
    if (
      capacity &&
      (capacity.itemCount || capacity.weightValue || capacity.volumeValue)
    ) {
      data.CAPACITY = {
        "Item Count": capacity.itemCount !== null ? capacity.itemCount : "n/a",
        "Weight Capacity Value": capacity.weightValue !== null ? capacity.weightValue : "n/a",
        "Weight Capacity Units": capacity.weightUnits || "lb",
        "Volume Capacity Value": capacity.volumeValue !== null ? capacity.volumeValue : "n/a",
        "Volume Capacity Units": capacity.volumeUnits || "cubicFoot",
      };
    }

    // Currency contents section (only when currency is actually present)
    const currency = extracted.currencyContents;
    const hasCurrency = currency
      ? Object.values(currency).some((value) => Number(value) > 0)
      : false;
    if (hasCurrency) {
      data.CURRENCY_CONTENTS = {
        Platinum: currency.pp || 0,
        Gold: currency.gp || 0,
        Electrum: currency.ep || 0,
        Silver: currency.sp || 0,
        Copper: currency.cp || 0,
      };
    }
  }

  /**
   * Build consumable-specific sections (stub for now)
   */
  buildConsumableSections(extracted, data) {
    const consumableType = extracted.consumableType || "potion";

    // Add type-specific field to ITEM section
    data.ITEM["Consumable Type"] = consumableType;

    // Properties section
    data.PROPERTIES = {
      Magical: extracted.isMagical,
    };

    // Attunement section (only if magical and attunement required)
    if (extracted.isMagical && extracted.attunement?.required) {
      data.ATTUNEMENT = {
        Attunement: "required",
        "Attunement By": extracted.attunement.restriction || "n/a",
      };
    }

    // Ammunition properties (only if type is ammo)
    if (consumableType === "ammo") {
      const ammoProps = extracted.ammunitionProperties || {};
      data.AMMUNITION_PROPERTIES = {
        "Ammunition Type": extracted.ammunitionType || "arrow",
        Adamantine: ammoProps.adamantine || false,
        Silvered: ammoProps.silvered || false,
        Returning: ammoProps.returning || false,
        "Magic Bonus": ammoProps.magicBonus || 0,
        "Damage Formula": ammoProps.damageFormula || "n/a",
        "Damage Type": ammoProps.damageType || "n/a",
        "Damage Replace": ammoProps.damageReplace || false,
      };
    }

    // Poison properties (only if type is poison)
    if (consumableType === "poison") {
      data.POISON_PROPERTIES = {
        "Poison Type": extracted.poisonType || "injury",
      };
    }

    // Scroll properties (only if type is scroll)
    if (consumableType === "scroll") {
      const scrollProps = extracted.scrollProperties || {};
      data.SCROLL_PROPERTIES = {
        Concentration: scrollProps.concentration || false,
        Somatic: scrollProps.somatic || false,
        Vocal: scrollProps.vocal || false,
        Ritual: scrollProps.ritual || false,
      };
    }

    // Usage section
    data.USAGE = {
      "Uses Spent": extracted.uses?.spent ?? extracted.uses?.current ?? 0,
      "Uses Max": extracted.uses?.max ?? 0,
      "Destroy on Empty": extracted.uses?.destroyOnEmpty ?? false,
    };
  }

  /**
   * Build equipment-specific sections (stub for now)
   */
  buildEquipmentSections(extracted, data) {
    // Get base armor data for property inheritance
    const baseData = extracted.baseEquipment
      ? NaturalItemParser.BASE_ARMOR_DATA[extracted.baseEquipment] || {}
      : {};

    // Add type-specific fields to ITEM section
    data.ITEM["Equipment Type"] = extracted.equipmentType || "clothing";
    data.ITEM["Base Equipment"] = extracted.baseEquipment || "n/a";

    // Properties section - inherit stealthDisadvantage from base armor if not explicitly set
    const props = extracted.equipmentProperties || {};
    const stealthDisadvantage = props.stealthDisadvantage || baseData.stealthDisadvantage || false;
    data.PROPERTIES = {
      Adamantine: props.adamantine || false,
      Focus: props.focus || false,
      Magical: extracted.isMagical,
      "Stealth Disadvantage": stealthDisadvantage,
    };

    // Attunement section (only if magical and attunement required)
    if (extracted.isMagical && extracted.attunement?.required) {
      data.ATTUNEMENT = {
        Attunement: "required",
        "Attunement By": extracted.attunement.restriction || "n/a",
        "Magic Bonus": extracted.magicBonus || 0,
      };
    }

    // Armor section (for armor and shield types)
    const armorTypes = ["light", "medium", "heavy", "natural", "shield"];
    if (armorTypes.includes(extracted.equipmentType)) {
      const armorClass = extracted.armorClass ?? baseData.ac ?? 10;
      const maxDexModifier = extracted.maxDexModifier ?? baseData.maxDex;
      const strengthReq = extracted.strengthRequirement ?? baseData.strengthReq;

      data.ARMOR = {
        "Armor Class": armorClass,
        "Max Dex Modifier": maxDexModifier !== null && maxDexModifier !== undefined
          ? maxDexModifier : "n/a",
        "Strength Requirement": strengthReq || "n/a",
      };
    }

    // Proficiency section
    data.PROFICIENCY = {
      Proficient: "Automatic",
    };

    // Usage section
    data.USAGE = {
      "Uses Spent": extracted.uses?.spent ?? extracted.uses?.current ?? 0,
      "Uses Max": extracted.uses?.max ?? 0,
    };
  }

  /**
   * Get the type marker for strict template
   */
  getTypeKey(itemType) {
    const keys = {
      weapon: "WEAPON",
      equipment: "EQUIPMENT",
      consumable: "CONSUMABLE",
      tool: "TOOL",
      loot: "LOOT",
      container: "CONTAINER",
    };
    return keys[itemType] || "LOOT";
  }

  // ==========================================
  // EXTRACTION METHODS (Stubs - We'll implement these next)
  // ==========================================

  extractName(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    if (lines.length === 0) {
      return null;
    }

    let name = lines[0];

    // Handle different formats
    if (this.inputFormat === "statblock") {
      // For statblock format, first line is the name, possibly with magic bonus
      const nameMatch = name.match(ItemRegex.itemName);
      if (nameMatch && nameMatch.groups?.name) {
        name = nameMatch.groups.name;
      }
    } else if (this.inputFormat === "dndbeyond") {
      // D&D Beyond often has "Name: Item Name" format
      const labelMatch = name.match(/^(?:Name|Item):\s*(.+)/i);
      if (labelMatch) {
        name = labelMatch[1];
      }
    }

    // Quantity suffixes are a special kind of parenthetical, so preserve them
    // before the generic name cleanup removes other annotations.
    const quantityInName = this.extractQuantityFromName(name);
    if (quantityInName.name !== name) {
      name = quantityInName.name;
      if (quantityInName.quantity !== null) {
        this.extractedQuantity = quantityInName.quantity;
      } else if (quantityInName.invalidQuantity !== null) {
        this.addWarning(
          `Ignored invalid quantity "${quantityInName.invalidQuantity}"; quantity must be a non-negative integer.`
        );
      }
    }

    // Clean up common patterns
    name = name.replace(/^([^()\n]+?)(?:\s*[\(\[].*)?$/, "$1"); // Remove parenthetical
    name = name.replace(
      /,\s*(?:common|uncommon|rare|very rare|legendary|artifact).*/i,
      ""
    ); // Remove rarity
    name = name.trim();

    ItemUtils.log(`NaturalItemParser: Extracted name: "${name}"`);
    this.confidence.name = 0.95;
    return name;
  }

  /**
   * Extract quantity from item name (e.g., "Arrow (20)" -> {name: "Arrow", quantity: 20})
   */
  extractQuantityFromName(name) {
    const buildQuantityResult = (match, pattern) => {
      const value = Number(match[1]);
      const valid = Number.isSafeInteger(value) && value >= 0;
      return {
        name: name.replace(pattern, "").trim(),
        quantity: valid ? value : null,
        invalidQuantity: valid ? null : match[1],
      };
    };

    // Recognize malformed numeric suffixes too, so fractional/unsafe values are
    // removed from the name and reported instead of being partially coerced.
    const parentheticalQuantity = /\((\d+(?:\.\d+)?)\)\s*$/;
    let match = name.match(parentheticalQuantity);
    if (match) return buildQuantityResult(match, parentheticalQuantity);

    // Try patterns from ItemRegex
    match = name.match(ItemRegex.quantity);
    if (match) {
      return buildQuantityResult(match, ItemRegex.quantity);
    }

    match = name.match(ItemRegex.quantityX);
    if (match) {
      return buildQuantityResult(match, ItemRegex.quantityX);
    }

    match = name.match(ItemRegex.quantityMultiple);
    if (match) {
      return buildQuantityResult(match, ItemRegex.quantityMultiple);
    }

    return { name, quantity: null, invalidQuantity: null };
  }

  guessItemType(text) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const labeledTypeLine = lines.find((line) => /^type\s*:/i.test(line));
    const declaredType = (labeledTypeLine || lines[1] || "")
      .replace(/^type\s*:\s*/i, "")
      .trim();

    // A declared stat-block type is stronger evidence than a keyword in the
    // description (for example, a potion that mentions a weapon).
    const declaredTypes = [
      { pattern: /^weapon\b/i, type: "weapon" },
      { pattern: /^(?:armor|armour)\b/i, type: "equipment" },
      { pattern: /^(?:wondrous item|ring)\b/i, type: "equipment" },
      {
        pattern: /^(?:potion|scroll|wand|rod|ammunition|ammo|poison|food|drink|trinket|consumable)\b/i,
        type: "consumable",
      },
      { pattern: /^tool\b/i, type: "tool" },
      { pattern: /^(?:container|bag|pouch|chest|box)\b/i, type: "container" },
    ];

    for (const declared of declaredTypes) {
      if (declared.pattern.test(declaredType)) {
        ItemUtils.log(
          `NaturalItemParser: Detected declared item type: ${declared.type}`
        );
        this.confidence.itemType = 0.98;
        return declared.type;
      }
    }

    // Use ItemRegex helper methods for better detection
    // Check in order of specificity

    // 1. Weapons - most specific patterns first
    if (ItemRegex.isWeapon(text)) {
      ItemUtils.log("NaturalItemParser: Detected item type: weapon");
      this.confidence.itemType = 0.9;
      return "weapon";
    }

    // 2. Armor/Equipment
    if (ItemRegex.isArmor(text)) {
      ItemUtils.log("NaturalItemParser: Detected item type: equipment");
      this.confidence.itemType = 0.9;
      return "equipment";
    }

    // 3. Tools
    if (ItemRegex.isTool(text)) {
      ItemUtils.log("NaturalItemParser: Detected item type: tool");
      this.confidence.itemType = 0.85;
      return "tool";
    }

    // 4. Containers
    if (ItemRegex.isContainer(text)) {
      ItemUtils.log("NaturalItemParser: Detected item type: container");
      this.confidence.itemType = 0.85;
      return "container";
    }

    // 5. Consumables (potions, scrolls, etc.)
    if (ItemRegex.isConsumable(text)) {
      // Try to determine specific consumable type
      if (ItemRegex.potionType.test(text)) {
        ItemUtils.log(
          "NaturalItemParser: Detected item type: consumable (potion)"
        );
        this.confidence.itemType = 0.9;
        return "consumable";
      }
      if (ItemRegex.scrollType.test(text)) {
        ItemUtils.log(
          "NaturalItemParser: Detected item type: consumable (scroll)"
        );
        this.confidence.itemType = 0.9;
        return "consumable";
      }
      ItemUtils.log("NaturalItemParser: Detected item type: consumable");
      this.confidence.itemType = 0.85;
      return "consumable";
    }

    // 6. Check for explicit type line (statblock format)
    if (this.inputFormat === "statblock") {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      if (lines.length >= 2) {
        const typeLine = lines[1];
        const typeMatch = typeLine.match(ItemRegex.typeLine);
        if (typeMatch && typeMatch.groups?.category) {
          const category = typeMatch.groups.category.toLowerCase();
          if (category.includes("weapon")) return "weapon";
          if (category.includes("armor")) return "equipment";
          if (category.includes("potion")) return "consumable";
          if (category.includes("scroll")) return "consumable";
          if (category.includes("wand")) return "consumable";
          if (category.includes("tool")) return "tool";
          if (category.includes("container") || category.includes("bag"))
            return "container";
          if (category.includes("wondrous")) return "equipment";
        }
      }
    }

    // 7. Use the configured default for unrecognized items
    const validDefaults = new Set(["loot", "consumable", "weapon", "equipment", "tool", "container"]);
    const configuredDefault = typeof game !== "undefined"
      ? game.settings?.get?.(MODULE_NAME, "defaultItemType") ?? "loot"
      : "loot";
    const defaultType = validDefaults.has(configuredDefault) ? configuredDefault : "loot";
    ItemUtils.log(
      `NaturalItemParser: Could not determine item type, defaulting to ${defaultType}`
    );
    this.confidence.itemType = 0.3;
    return defaultType;
  }

  /**
   * Determine a dnd5e consumable subtype from the item header first, then
   * conservatively fall back to the full text.
   */
  extractConsumableType(text) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const labeledTypeLine = lines.find((line) => /^type\s*:/i.test(line));
    const definitions = [
      { type: "ammo", pattern: ItemRegex.ammunitionType },
      { type: "scroll", pattern: ItemRegex.scrollType },
      { type: "wand", pattern: ItemRegex.wandType },
      { type: "rod", pattern: ItemRegex.rodType },
      { type: "poison", pattern: ItemRegex.poisonType },
      { type: "food", pattern: ItemRegex.foodType },
      { type: "trinket", pattern: ItemRegex.trinketType },
      { type: "potion", pattern: ItemRegex.potionType },
    ];

    const detect = (candidate) => {
      const matches = definitions
        .map((definition, priority) => {
          const match = candidate.match(definition.pattern);
          return match
            ? { ...definition, priority, index: match.index ?? 0 }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.index - b.index || a.priority - b.priority);
      return matches[0]?.type ?? null;
    };

    const declaredTypeLine = labeledTypeLine || (/^(?:consumable|potion|scroll|wand|rod|ammunition|ammo|poison|food|drink|trinket)\b/i.test(lines[1] || "")
      ? lines[1]
      : "");
    const detectedFromText = detect(text);
    // An explicit type line is stronger than a subtype-looking word in the
    // item name (for example, "Poison Wand" declared as "Wand, rare").
    const consumableType = detect(declaredTypeLine) || detect(lines[0] || "") || detectedFromText || "potion";
    this.confidence.consumableType = consumableType === "potion" && !detectedFromText
      ? 0.35
      : 0.9;
    ItemUtils.log(
      `NaturalItemParser: Found consumable type: ${consumableType}`
    );
    return consumableType;
  }

  extractAmmunitionType(text) {
    const match = text.match(ItemRegex.ammunitionSubtype) || text.match(/\b(?:bullets?|needles?)\b/i);
    if (!match) return null;

    const value = match[0].toLowerCase();
    const ammunitionType = value.includes("sling")
      ? "slingBullet"
      : value.includes("energy")
        ? "energyCell"
        : value.includes("needle")
          ? "blowgunNeedle"
          : value.includes("bolt")
            ? "crossbowBolt"
            : value.includes("bullet")
              ? "firearmBullet"
              : "arrow";

    this.confidence.ammunitionType = 0.95;
    return ammunitionType;
  }

  extractAmmunitionProperties(text) {
    const explicitDamage = text.match(
      /(?:^|\n)\s*(?:damage|extra damage)\s*:\s*(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/i
    );
    return {
      adamantine: ItemRegex.ammunitionPropertyAdamantine.test(text),
      silvered: ItemRegex.ammunitionPropertySilvered.test(text),
      returning: ItemRegex.ammunitionPropertyReturning.test(text),
      magicBonus: this.extractMagicBonus(text) ?? 0,
      damageFormula: explicitDamage?.[1]?.replace(/\s+/g, "") ?? null,
      damageType: explicitDamage?.[2]?.toLowerCase() ?? null,
      damageReplace: ItemRegex.replaceDamage.test(text),
    };
  }

  extractPoisonType(text) {
    const match = text.match(
      /\b(contact|ingested|inhaled|injury)\s+poison\b|\bpoison\s*\((contact|ingested|inhaled|injury)\)/i
    );
    const poisonType = (match?.[1] || match?.[2] || "injury").toLowerCase();
    this.confidence.poisonType = match ? 0.95 : 0.4;
    return poisonType;
  }

  extractScrollProperties(text) {
    const components = text.match(/\bcomponents?\s*:\s*([vsm,\s]+)/i)?.[1] || "";
    const componentTokens = new Set(
      components
        .toUpperCase()
        .split(/[\s,]+/)
        .filter(Boolean)
    );

    return {
      concentration: /\bconcentration\b/i.test(text),
      somatic: componentTokens.has("S") || /\bsomatic\b/i.test(text),
      vocal:
        componentTokens.has("V") || /\b(?:vocal|verbal)\b/i.test(text),
      ritual: /\britual\b/i.test(text),
    };
  }

  /**
   * Extract limited-use state. ItemData uses `value` as uses already spent, so
   * natural items start at zero spent unless the source explicitly reports a
   * current/maximum pair.
   */
  extractUses(text) {
    const destroyOnEmpty =
      ItemRegex.autoDestroy.test(text) || ItemRegex.singleUse.test(text);
    let max = 0;
    let spent = 0;

    const countToken = "([+\\-]?\\d+(?:\\.\\d+)?)";
    const tokenStart = "(?:^|[^A-Za-z0-9_.])";
    const tokenEnd = "(?![\\d.])";
    const currentAndMax = text.match(new RegExp(
      `${tokenStart}${countToken}\\s+charges?[^\\n]{0,120}?(?:maximum|max)(?:\\s+of)?\\s+${countToken}${tokenEnd}`,
      "i"
    ));
    const parseChargeCount = (raw) => {
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 0) {
        this.addWarning(
          `Ignored invalid charge count "${raw}"; charges must be non-negative integers.`
        );
        return null;
      }
      return value;
    };

    if (currentAndMax) {
      const current = parseChargeCount(currentAndMax[1]);
      const parsedMax = parseChargeCount(currentAndMax[2]);
      if (current !== null && parsedMax !== null) {
        max = parsedMax;
        if (current > max) {
          this.addWarning(
            `Ignored current charge count ${current} because it exceeds maximum ${max}.`
          );
          max = 0;
        } else {
          spent = max - current;
        }
      }
    } else {
      const charges = text.match(new RegExp(
        `\\b(?:has|have|contains?)\\s+${countToken}${tokenEnd}\\s+charges?\\b`,
        "i"
      ));
      const maximum = text.match(
        /(?:(?:maximum|max)(?:\s+of)?|up to)\s+([+\-]?\d+(?:\.\d+)?)(?![\d.])\s+charges?\b/i
      );
      const trailingMaximum = text.match(
        /(?:^|[^A-Za-z0-9_.])([+\-]?\d+(?:\.\d+)?)(?![\d.])\s+charges?\s+(?:maximum|max)\b/i
      );
      const maxRaw = maximum?.[1] ?? trailingMaximum?.[1] ?? charges?.[1];
      if (maxRaw !== undefined) {
        const parsedMax = parseChargeCount(maxRaw);
        if (parsedMax !== null) max = parsedMax;
      }
    }

    if (max === 0 && ItemRegex.singleUse.test(text)) max = 1;
    if (max > 0) this.confidence.uses = 0.9;

    return { spent, max, destroyOnEmpty };
  }

  extractRarity(text) {
    // Try ItemRegex detailed pattern first
    const detailMatch = text.match(ItemRegex.rarityDetails);
    if (detailMatch && detailMatch.groups && detailMatch.groups.rarity) {
      const rarity = detailMatch.groups.rarity
        .toLowerCase()
        .replace(/\s+/g, "");
      ItemUtils.log(`NaturalItemParser: Extracted rarity: ${rarity}`);
      this.confidence.rarity = 0.95;
      return rarity;
    }

    // Try basic pattern
    const basicMatch = text.match(ItemRegex.rarity);
    if (basicMatch) {
      const rarity = basicMatch[1].toLowerCase().replace(/\s+/g, "");
      ItemUtils.log(`NaturalItemParser: Extracted rarity: ${rarity}`);
      this.confidence.rarity = 0.95;
      return rarity;
    }

    // For statblock format, check second line specifically
    if (this.inputFormat === "statblock") {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      if (lines.length >= 2) {
        const typeLineMatch = lines[1].match(ItemRegex.typeLine);
        if (typeLineMatch && typeLineMatch.groups?.rarity) {
          const rarity = typeLineMatch.groups.rarity
            .toLowerCase()
            .replace(/\s+/g, "");
          ItemUtils.log(
            `NaturalItemParser: Extracted rarity from type line: ${rarity}`
          );
          this.confidence.rarity = 0.95;
          return rarity;
        }
      }
    }

    ItemUtils.log("NaturalItemParser: No rarity found, defaulting to common");
    this.confidence.rarity = 0.3;
    return "common";
  }

  extractCost(text) {
    // Use ItemRegex patterns for better extraction
    const match = text.match(ItemRegex.cost);

    if (match && match.groups && match.groups.amount && match.groups.currency) {
      const value = parseInt(match.groups.amount.replace(/,/g, ""));
      const denomination = match.groups.currency.toLowerCase();

      ItemUtils.log(
        `NaturalItemParser: Extracted cost: ${value} ${denomination}`
      );
      this.confidence.cost = 0.9;

      return {
        value: value,
        denomination: denomination,
      };
    }

    // Fallback: try to extract all currency mentions and use the first/largest
    const allCurrency = ItemRegex.extractAllCurrency(text);
    if (allCurrency.length > 0) {
      // Convert all to GP for comparison, return the largest
      const currencyValues = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 };
      let largest = allCurrency[0];
      let largestGpValue =
        allCurrency[0].amount * currencyValues[allCurrency[0].currency];

      for (const currency of allCurrency) {
        const gpValue = currency.amount * currencyValues[currency.currency];
        if (gpValue > largestGpValue) {
          largestGpValue = gpValue;
          largest = currency;
        }
      }

      ItemUtils.log(
        `NaturalItemParser: Extracted cost from currency list: ${largest.amount} ${largest.currency}`
      );
      this.confidence.cost = 0.85;
      return {
        value: largest.amount,
        denomination: largest.currency,
      };
    }

    ItemUtils.log("NaturalItemParser: No cost found");
    return null;
  }

  extractWeight(text) {
    // Use ItemRegex pattern
    const match = text.match(ItemRegex.weight);

    if (match && match.groups && match.groups.weight) {
      const value = parseFloat(match.groups.weight);

      ItemUtils.log(`NaturalItemParser: Extracted weight: ${value} lb`);
      this.confidence.weight = 0.9;

      return {
        value: value,
        units: "lb",
      };
    }

    // Fallback: look for weight anywhere in text without label
    const fallbackPattern = /\b(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)\b/i;
    const fallbackMatch = text.match(fallbackPattern);
    if (fallbackMatch) {
      const value = parseFloat(fallbackMatch[1]);
      ItemUtils.log(
        `NaturalItemParser: Extracted weight (fallback): ${value} lb`
      );
      this.confidence.weight = 0.75;
      return {
        value: value,
        units: "lb",
      };
    }

    ItemUtils.log("NaturalItemParser: No weight found");
    return null;
  }

  extractDescription(text) {
    let description = text;
    const lines = text.split("\n").map((l) => l.trim());

    if (this.inputFormat === "statblock") {
      // Statblock: skip first 2 lines (name and type line), keep rest
      if (lines.length > 2) {
        description = lines.slice(2).join("\n").trim();
      }
    } else if (this.inputFormat === "dndbeyond") {
      // D&D Beyond: skip labeled fields, find description paragraph
      const descStart = lines.findIndex(
        (l) =>
          !l.match(
            /^(?:Name|Type|Rarity|Cost|Price|Weight|Damage|Properties|Armor Class|AC):/i
          ) && l.length > 20 // Descriptions are usually substantial
      );
      if (descStart >= 0) {
        description = lines.slice(descStart).join("\n").trim();
      }
    } else {
      // Freeform/SRD: remove first line and metadata
      if (lines.length > 1) {
        description = lines.slice(1).join("\n").trim();
      }
    }

    // Clean up common metadata patterns regardless of format
    description = description.replace(
      /^(?:weapon|armor|tool|container|potion|wondrous item).*?(?:,\s*(?:common|uncommon|rare|very rare|legendary|artifact))?.*$/im,
      ""
    );
    description = description.replace(/^(?:cost|price|value):\s*\d+.*$/im, "");
    description = description.replace(/^(?:weight|wt\.):\s*\d+.*$/im, "");
    description = description.replace(
      /^(?:attunement|requires attunement).*$/im,
      ""
    );

    // Remove property lines that might be separate
    description = description.replace(
      /^(?:properties|damage|range):\s*.+$/gim,
      ""
    );

    // Clean up extra whitespace
    description = description.replace(/\n{3,}/g, "\n\n").trim();

    // Remove leading/trailing bullets or markers
    description = description
      .replace(/^[\s•\-\*]+/, "")
      .replace(/[\s•\-\*]+$/, "");

    if (!description || description.length < 10) {
      description = "No description available.";
      this.confidence.description = 0.2;
    } else {
      this.confidence.description = 0.8;
    }

    ItemUtils.log(
      `NaturalItemParser: Extracted description (${description.length} chars)`
    );
    return description;
  }

  extractQuantity(text) {
    if (Number.isSafeInteger(this.extractedQuantity)) {
      ItemUtils.log(
        `NaturalItemParser: Found quantity in item name: ${this.extractedQuantity}`
      );
      this.confidence.quantity = 0.95;
      return this.extractedQuantity;
    }

    // Look for explicit quantity patterns
    const patterns = [
      /\bquantity(?:\s*:|\s+)\s*([+\-]?\d+(?:\.\d+)?)(?![\d.])/i,
      /\bamount(?:\s*:|\s+)\s*([+\-]?\d+(?:\.\d+)?)(?![\d.])/i,
      /(?:^|[^A-Za-z0-9_.])([+\-]?\d+(?:\.\d+)?)(?![\d.])\s*(?:items?|pieces?|units?)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const quantity = Number(match[1]);
        if (!Number.isSafeInteger(quantity) || quantity < 0) {
          this.addWarning(
            `Ignored invalid quantity "${match[1]}"; quantity must be a non-negative integer.`
          );
          return 1;
        }
        ItemUtils.log(`NaturalItemParser: Found quantity: ${quantity}`);
        this.confidence.quantity = 0.85;
        return quantity;
      }
    }

    // For ammunition, check if it's mentioned
    if (/\b(?:arrows?|bolts?|bullets?|darts?)\b/i.test(text)) {
      // D&D Beyond often lists ammunition in quantities of 20
      if (/20\s*(?:arrows?|bolts?)/i.test(text)) {
        ItemUtils.log("NaturalItemParser: Inferred quantity 20 for ammunition");
        this.confidence.quantity = 0.7;
        return 20;
      }
    }

    ItemUtils.log("NaturalItemParser: No quantity found, defaulting to 1");
    return 1;
  }

  extractBaseWeapon(text) {
    const lowerText = text.toLowerCase();

    // List of all base weapons (from itemConfig.js BASE_WEAPON_MAP)
    const baseWeapons = [
      "club",
      "dagger",
      "greatclub",
      "handaxe",
      "javelin",
      "lighthammer",
      "mace",
      "quarterstaff",
      "sickle",
      "spear",
      "battleaxe",
      "flail",
      "glaive",
      "greataxe",
      "greatsword",
      "halberd",
      "lance",
      "longsword",
      "maul",
      "morningstar",
      "pike",
      "rapier",
      "scimitar",
      "shortsword",
      "trident",
      "warpick",
      "warhammer",
      "whip",
      "dart",
      "lightcrossbow",
      "shortbow",
      "sling",
      "blowgun",
      "handcrossbow",
      "heavycrossbow",
      "longbow",
      "net",
    ];

    // Also check for multi-word weapon names with spaces
    const spacedWeapons = [
      { spaced: "light hammer", base: "lighthammer" },
      { spaced: "light crossbow", base: "lightcrossbow" },
      { spaced: "short bow", base: "shortbow" },
      { spaced: "hand crossbow", base: "handcrossbow" },
      { spaced: "heavy crossbow", base: "heavycrossbow" },
      { spaced: "long bow", base: "longbow" },
      { spaced: "long sword", base: "longsword" },
      { spaced: "short sword", base: "shortsword" },
      { spaced: "great axe", base: "greataxe" },
      { spaced: "great sword", base: "greatsword" },
      { spaced: "great club", base: "greatclub" },
      { spaced: "war hammer", base: "warhammer" },
      { spaced: "war pick", base: "warpick" },
      { spaced: "hand axe", base: "handaxe" },
      { spaced: "quarter staff", base: "quarterstaff" },
    ];

    // Check spaced versions first (more specific)
    for (const { spaced, base } of spacedWeapons) {
      if (lowerText.includes(spaced)) {
        ItemUtils.log(`NaturalItemParser: Found base weapon (spaced): ${base}`);
        return base;
      }
    }

    // Check single-word versions
    for (const weapon of baseWeapons) {
      // Use word boundary to avoid partial matches
      const pattern = new RegExp(`\\b${weapon}\\b`, "i");
      if (pattern.test(lowerText)) {
        ItemUtils.log(`NaturalItemParser: Found base weapon: ${weapon}`);
        return weapon;
      }
    }

    const aliases = [
      { pattern: /\bhooked\s+blade\b/i, base: "scimitar" },
      { pattern: /\bkatana\b/i, base: "longsword" },
      { pattern: /\bsab(?:er|re)\b/i, base: "scimitar" },
      { pattern: /\bcleaver\b/i, base: "handaxe" },
      { pattern: /\bknife\b/i, base: "dagger" },
      { pattern: /\bcudgel\b/i, base: "club" },
      { pattern: /\bpoleaxe\b/i, base: "halberd" },
      { pattern: /\bwar\s+scythe\b/i, base: "glaive" },
    ];

    for (const { pattern, base } of aliases) {
      if (pattern.test(lowerText)) {
        ItemUtils.log(`NaturalItemParser: Inferred base weapon from alias: ${base}`);
        this.confidence.baseWeapon = 0.65;
        return base;
      }
    }

    ItemUtils.log("NaturalItemParser: Could not determine base weapon");
    return null;
  }

  extractDamage(text, { baseWeapon = null } = {}) {
    const explicitDamageLine = text.match(
      /(?:^|\n)\s*(?:base\s+)?damage\s*:\s*([^\n]+)/i
    );

    // Known base weapons already have authoritative base damage. Rules prose
    // such as "deals an extra 2d6 fire damage" must not replace that value.
    if (baseWeapon && !explicitDamageLine) {
      ItemUtils.log(
        `NaturalItemParser: Using ${baseWeapon} base damage; no explicit Damage field found`
      );
      return null;
    }

    const damageSource = explicitDamageLine?.[1] || text;
    const isSecondaryDamageAt = (index, length) => {
      if (explicitDamageLine) return false;
      const prefix = damageSource.slice(Math.max(0, index - 80), index);
      const suffix = damageSource.slice(index + length, index + length + 30);
      return (
        /\b(?:extra|additional|bonus|plus)\s*$/i.test(prefix) ||
        /\b(?:target|creature|it)\s+(?:takes?|suffers?)\s+(?:an?\s+)?(?:extra\s+)?$/i.test(prefix) ||
        /^\s+(?:extra|additional|bonus)\b/i.test(suffix)
      );
    };

    // Use ItemRegex pattern with named groups
    const match = damageSource.match(ItemRegex.damage);

    if (match && !explicitDamageLine) {
      if (isSecondaryDamageAt(match.index ?? 0, match[0].length)) {
        ItemUtils.log(
          "NaturalItemParser: Ignoring additional/effect damage as base weapon damage"
        );
        return null;
      }
    }

    if (
      match &&
      match.groups &&
      match.groups.count &&
      match.groups.faces &&
      match.groups.damageType
    ) {
      const damage = {
        diceCount: parseInt(match.groups.count),
        diceSize: parseInt(match.groups.faces),
        bonus: 0,
        type: match.groups.damageType.toLowerCase(),
      };

      // Handle bonus if present
      if (match.groups.operator && match.groups.bonus) {
        damage.bonus =
          (match.groups.operator === "-" ? -1 : 1) *
          parseInt(match.groups.bonus);
      }

      // Build formula string for template
      damage.formula = `${damage.diceCount}d${damage.diceSize}`;
      if (damage.bonus !== 0) {
        damage.formula += damage.bonus > 0 ? `+${damage.bonus}` : `${damage.bonus}`;
      }

      ItemUtils.log(
        `NaturalItemParser: Extracted damage: ${damage.diceCount}d${
          damage.diceSize
        }${damage.bonus > 0 ? "+" : ""}${
          damage.bonus !== 0 ? damage.bonus : ""
        } ${damage.type}`
      );
      this.confidence.damage = 0.95;
      return damage;
    }

    // Fallback: try to find ANY dice pattern, even without damage type
    const diceOnlyPattern = /(\d+)d(\d+)(?:\s*([+\-])\s*(\d+))?/i;
    const diceMatch = damageSource.match(diceOnlyPattern);
    if (diceMatch) {
      if (isSecondaryDamageAt(diceMatch.index ?? 0, diceMatch[0].length)) {
        ItemUtils.log(
          "NaturalItemParser: Ignoring additional/effect damage as base weapon damage"
        );
        return null;
      }

      // Try to infer damage type from context or item type
      let damageType = "bludgeoning"; // default

      if (/slash|cut|blade|sword|axe|scimitar/i.test(text))
        damageType = "slashing";
      else if (/pierc|stab|arrow|bolt|spear|dagger/i.test(text))
        damageType = "piercing";
      else if (/fire|flame|burn/i.test(text)) damageType = "fire";
      else if (/cold|frost|ice/i.test(text)) damageType = "cold";
      else if (/lightning|shock|electric/i.test(text)) damageType = "lightning";
      else if (/acid|corros/i.test(text)) damageType = "acid";
      else if (/poison|venom|toxic/i.test(text)) damageType = "poison";
      else if (/necrotic|death|drain/i.test(text)) damageType = "necrotic";
      else if (/radiant|holy|divine/i.test(text)) damageType = "radiant";
      else if (/psychic|mental|mind/i.test(text)) damageType = "psychic";
      else if (/thunder|sonic|sound/i.test(text)) damageType = "thunder";
      else if (/force|magic/i.test(text)) damageType = "force";

      const damage = {
        diceCount: parseInt(diceMatch[1]),
        diceSize: parseInt(diceMatch[2]),
        bonus:
          diceMatch[3] && diceMatch[4]
            ? (diceMatch[3] === "-" ? -1 : 1) * parseInt(diceMatch[4])
            : 0,
        type: damageType,
      };

      // Build formula string for template
      damage.formula = `${damage.diceCount}d${damage.diceSize}`;
      if (damage.bonus !== 0) {
        damage.formula +=
          damage.bonus > 0 ? `+${damage.bonus}` : `${damage.bonus}`;
      }

      ItemUtils.log(
        `NaturalItemParser: Extracted damage (inferred type): ${damage.formula} ${damage.type}`
      );
      this.confidence.damage = 0.7;
      return damage;
    }

    ItemUtils.log("NaturalItemParser: No damage found");
    return null;
  }

  /**
   * Extract weapon type (simpleM, martialM, etc.) from text
   */
  extractWeaponType(text) {
    const lowerText = text.toLowerCase();

    // Look for explicit patterns first
    if (/martial\s+melee/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: martialM");
      return "martialM";
    }
    if (/martial\s+ranged/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: martialR");
      return "martialR";
    }
    if (/simple\s+melee/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: simpleM");
      return "simpleM";
    }
    if (/simple\s+ranged/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: simpleR");
      return "simpleR";
    }
    if (/\bsiege(?:\s+weapon)?\b|\bweapon\s*\(\s*siege\s*\)/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: siege");
      return "siege";
    }
    if (/\bnatural(?:\s+weapon|\s+attack)\b|\bweapon\s*\(\s*natural\s*\)/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: natural");
      return "natural";
    }
    if (/\bimprovised(?:\s+weapon)?\b|\bweapon\s*\(\s*improvised\s*\)/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found weapon type: improv");
      return "improv";
    }

    // Try to infer from base weapon name
    const baseWeapon = this.extractBaseWeapon(text);
    if (baseWeapon) {
      const weaponTypeMap = {
        // Simple Melee
        club: "simpleM",
        dagger: "simpleM",
        greatclub: "simpleM",
        handaxe: "simpleM",
        javelin: "simpleM",
        lighthammer: "simpleM",
        mace: "simpleM",
        quarterstaff: "simpleM",
        sickle: "simpleM",
        spear: "simpleM",

        // Martial Melee
        battleaxe: "martialM",
        flail: "martialM",
        glaive: "martialM",
        greataxe: "martialM",
        greatsword: "martialM",
        halberd: "martialM",
        lance: "martialM",
        longsword: "martialM",
        maul: "martialM",
        morningstar: "martialM",
        pike: "martialM",
        rapier: "martialM",
        scimitar: "martialM",
        shortsword: "martialM",
        trident: "martialM",
        warpick: "martialM",
        warhammer: "martialM",
        whip: "martialM",

        // Simple Ranged
        dart: "simpleR",
        lightcrossbow: "simpleR",
        shortbow: "simpleR",
        sling: "simpleR",

        // Martial Ranged
        blowgun: "martialR",
        handcrossbow: "martialR",
        heavycrossbow: "martialR",
        longbow: "martialR",
        net: "martialR",
      };

      const type = weaponTypeMap[baseWeapon];
      if (type) {
        ItemUtils.log(
          `NaturalItemParser: Inferred weapon type from base weapon "${baseWeapon}": ${type}`
        );
        return type;
      }
    }

    // Default fallback
    ItemUtils.log(
      "NaturalItemParser: Could not determine weapon type, defaulting to simpleM"
    );
    return "simpleM";
  }

  /**
   * Try to infer damage type from weapon name/context
   */
  inferDamageType(text) {
    const lowerText = text.toLowerCase();

    // Slashing weapons
    if (
      /\b(sword|axe|scimitar|glaive|halberd|greataxe|greatsword|longsword|shortsword|rapier)\b/.test(
        lowerText
      )
    ) {
      return "slashing";
    }

    // Piercing weapons
    if (
      /\b(dagger|spear|rapier|pike|javelin|trident|arrow|bolt|needle)\b/.test(
        lowerText
      )
    ) {
      return "piercing";
    }

    // Bludgeoning weapons
    if (
      /\b(mace|club|hammer|maul|staff|quarterstaff|greatclub|warhammer|morningstar|flail)\b/.test(
        lowerText
      )
    ) {
      return "bludgeoning";
    }

    // Default to bludgeoning (most common)
    return "bludgeoning";
  }

  extractVersatileDamage(text) {
    // Pattern: "Versatile (1d10)" or "Versatile (1d8 slashing)"
    const versatilePattern =
      /versatile\s*\((\d+d\d+(?:\s*[+\-]\s*\d+)?)\s*(?:([a-z]+))?\)/i;

    const match = text.match(versatilePattern);

    if (match) {
      const formula = match[1].trim().replace(/\s+/g, "");
      const type = match[2] ? match[2].toLowerCase() : null;

      ItemUtils.log(
        `NaturalItemParser: Found versatile damage: ${formula}${
          type ? " " + type : ""
        }`
      );
      this.confidence.versatileDamage = 0.95;

      return {
        formula,
        type: type || null, // If no type specified, we'll use the main damage type later
      };
    }

    ItemUtils.log("NaturalItemParser: No versatile damage found");
    return null;
  }

  extractProperties(text) {
    const lowerText = text.toLowerCase();
    const props = {
      adamantine: false,
      ammunition: false,
      finesse: false,
      firearm: false,
      focus: false,
      heavy: false,
      light: false,
      loading: false,
      magical: false,
      reach: false,
      reload: false,
      returning: false,
      silvered: false,
      special: false,
      thrown: false,
      twoHanded: false,
      versatile: false,
    };

    const propertyContexts = [];
    for (const line of text.split("\n")) {
      const labeled = line.match(/\bpropert(?:y|ies)\s*:\s*([^\n]+)/i);
      if (labeled?.[1]) propertyContexts.push(labeled[1]);

      const sentence = line.match(
        /\b(?:has|have|gains?|possesses?)\s+(?:the\s+)?([^.]{1,120}?)\s+propert(?:y|ies)\b/i
      );
      if (sentence?.[1]) propertyContexts.push(sentence[1]);
    }
    const propertyText = propertyContexts.join(", ");

    // Standard weapon properties are accepted only from an explicit property
    // context. This prevents prose such as "sheds bright light" or "special
    // ability" from mutating the weapon's mechanical property set.
    const contextualPatterns = {
      ammunition: /\bammunition\b/i,
      finesse: /\bfinesse\b/i,
      heavy: /\bheavy\b/i,
      light: /\blight\b/i,
      loading: /\bloading\b/i,
      reach: /\breach\b/i,
      reload: /\breload\b/i,
      special: /\bspecial\b/i,
      thrown: /\bthrown\b/i,
      twoHanded: /\btwo-?handed\b/i,
      versatile: /\bversatile\b/i,
    };
    const intrinsicPatterns = {
      adamantine: /\badamantine\b/i,
      firearm: /\bfirearm\b/i,
      focus: /\bspellcasting focus\b/i,
      magical: /\bmagical?\b|\bmagic\b|\+\d+\s+(weapon|armor|sword|axe)/i,
      returning: /\breturning\b/i,
      silvered: /\bsilvered?\b/i,
    };

    let foundCount = 0;
    for (const [prop, pattern] of Object.entries(contextualPatterns)) {
      if (pattern.test(propertyText)) {
        props[prop] = true;
        foundCount++;
        ItemUtils.log(`NaturalItemParser: Found explicit property: ${prop}`);
      }
    }
    for (const [prop, pattern] of Object.entries(intrinsicPatterns)) {
      if (pattern.test(text)) {
        props[prop] = true;
        foundCount++;
        ItemUtils.log(`NaturalItemParser: Found property: ${prop}`);
      }
    }

    if (foundCount === 0) {
      ItemUtils.log("NaturalItemParser: No properties found");
    } else {
      ItemUtils.log(`NaturalItemParser: Found ${foundCount} properties`);
      this.confidence.properties = 0.85;
    }

    return props;
  }

  extractMastery(text) {
    const lowerText = text.toLowerCase();

    // 2024 weapon mastery properties
    const masteries = [
      "cleave",
      "graze",
      "nick",
      "push",
      "sap",
      "slow",
      "topple",
      "vex",
    ];

    // Look for explicit "Mastery:" pattern first
    for (const mastery of masteries) {
      const pattern = new RegExp(`mastery[:\\s]+${mastery}`, "i");
      if (pattern.test(lowerText)) {
        ItemUtils.log(
          `NaturalItemParser: Found mastery via explicit pattern: ${mastery}`
        );
        this.confidence.mastery = 0.95;
        return mastery;
      }
    }

    // Check for mastery mentioned anywhere in text
    for (const mastery of masteries) {
      const pattern = new RegExp(`\\b${mastery}\\b`, "i");
      if (pattern.test(lowerText)) {
        ItemUtils.log(
          `NaturalItemParser: Found mastery via keyword: ${mastery}`
        );
        this.confidence.mastery = 0.7;
        return mastery;
      }
    }

    ItemUtils.log("NaturalItemParser: No mastery found");
    return null;
  }

  extractRange(text) {
    const range = {
      reach: null,
      normal: null,
      long: null,
    };

    // Require the reach keyword on either side of the distance. A bare
    // distance in effect prose is not the weapon's reach.
    const reachPattern =
      /(?:reach(?:\s+of)?\s+(\d+)\s*(?:ft\.?|feet|foot)|\b(\d+)\s*(?:-|\s)?(?:ft\.?|feet|foot)\s+reach)\b/i;
    const reachMatch = text.match(reachPattern);

    if (reachMatch) {
      range.reach = parseInt(reachMatch[1] || reachMatch[2]);
      ItemUtils.log(`NaturalItemParser: Found reach: ${range.reach} ft`);
    }

    // Pattern for thrown/ranged: "range 20/60", "(range 30/120)", "thrown (20/60)"
    const rangePattern = /(?:range|thrown)\s*\(?(\d+)\s*\/\s*(\d+)\)?/i;
    const rangeMatch = text.match(rangePattern);

    if (rangeMatch) {
      range.normal = parseInt(rangeMatch[1]);
      range.long = parseInt(rangeMatch[2]);
      ItemUtils.log(
        `NaturalItemParser: Found range: ${range.normal}/${range.long} ft`
      );
    }

    // If we found any range data, return it
    if (range.reach || range.normal || range.long) {
      this.confidence.range = 0.9;
      return range;
    }

    ItemUtils.log("NaturalItemParser: No range found");
    return null;
  }

  extractAttunement(text) {
    // Use ItemRegex patterns
    const hasAttunement = ItemRegex.attunement.test(text);
    const byMatch = text.match(ItemRegex.attunementBy);

    if (hasAttunement) {
      const result = {
        required: true,
        restriction:
          byMatch && byMatch.groups?.attunementBy
            ? byMatch.groups.attunementBy.trim()
            : null,
      };

      ItemUtils.log(
        `NaturalItemParser: Attunement required${
          result.restriction ? ` by ${result.restriction}` : ""
        }`
      );
      this.confidence.attunement = 0.95;
      return result;
    }

    // Check in type line for statblock format
    if (this.inputFormat === "statblock") {
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      if (lines.length >= 2) {
        const typeLineMatch = lines[1].match(ItemRegex.typeLine);
        if (typeLineMatch && typeLineMatch.groups?.attunement) {
          const attunementText = typeLineMatch.groups.attunement;
          const byInnerMatch = attunementText.match(/by\s+(.+)/i);

          const result = {
            required: true,
            restriction:
              byInnerMatch?.[1]?.trim() ||
              byMatch?.groups?.attunementBy?.trim() ||
              null,
          };

          ItemUtils.log(
            `NaturalItemParser: Attunement from type line${
              result.restriction ? ` by ${result.restriction}` : ""
            }`
          );
          this.confidence.attunement = 0.95;
          return result;
        }
      }
    }

    return { required: false, restriction: null };
  }

  extractEquipmentType(text) {
    const lowerText = text.toLowerCase();

    // Equipment type patterns (checking most specific first)
    const typePatterns = {
      // Armor types
      light: /\b(?:light armor|leather armor|padded armor|studded leather)\b/i,
      medium:
        /\b(?:medium armor|hide armor|chain shirt|scale mail|breastplate|half plate)\b/i,
      heavy:
        /\b(?:heavy armor|ring mail|chain mail|splint armor|plate armor)\b/i,
      natural: /\bnatural armor\b/i,
      shield: /\bshield\b/i,

      // Non-armor equipment
      wondrous: /\bwondrous item\b/i,
      clothing: /\b(?:clothing|robe|cloak|hat|boots|gloves)\b/i,
      ring: /\bring\b/i,
      rod: /\brod\b/i,
      trinket: /\b(?:trinket|bauble|curio)\b/i,
      wand: /\bwand\b/i,
      vehicle: /\b(?:vehicle|mount|ship|cart|wagon)\b/i,
    };

    // Check for explicit type declaration
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(text)) {
        ItemUtils.log(`NaturalItemParser: Found equipment type: ${type}`);
        this.confidence.equipmentType = 0.85;
        return type;
      }
    }

    // Default to clothing for generic equipment
    ItemUtils.log(
      "NaturalItemParser: Could not determine equipment type, defaulting to clothing"
    );
    this.confidence.equipmentType = 0.3;
    return "clothing";
  }

  extractBaseEquipment(text) {
    const lowerText = text.toLowerCase();

    // Base armor/shield types
    const baseEquipment = {
      // Light armor
      leather: ["leather armor", "leather"],
      padded: ["padded armor", "padded"],
      studdedleather: ["studded leather", "studded"],

      // Medium armor
      breastplate: ["breastplate"],
      chainshirt: ["chain shirt"],
      halfplate: ["half plate", "halfplate"],
      hide: ["hide armor", "hide"],
      scalemail: ["scale mail", "scalemail"],

      // Heavy armor
      chainmail: ["chain mail", "chainmail"],
      plate: ["plate armor", "plate mail", "plate"],
      ringmail: ["ring mail", "ringmail"],
      splint: ["splint armor", "splint"],

      // Shield
      shield: ["shield"],
    };

    // Check each base equipment type
    for (const [base, variations] of Object.entries(baseEquipment)) {
      for (const variation of variations) {
        if (lowerText.includes(variation)) {
          ItemUtils.log(`NaturalItemParser: Found base equipment: ${base}`);
          this.confidence.baseEquipment = 0.9;
          return base;
        }
      }
    }

    ItemUtils.log("NaturalItemParser: No base equipment found");
    return null;
  }

  extractArmorClass(text) {
    // Patterns: "AC 16", "Armor Class 14", "AC: 18"
    const patterns = [/(?:armor\s+class|ac)[:\s]+(\d+)/i, /\bac\s+(\d+)\b/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const ac = parseInt(match[1]);
        ItemUtils.log(`NaturalItemParser: Found armor class: ${ac}`);
        this.confidence.armorClass = 0.95;
        return ac;
      }
    }

    ItemUtils.log("NaturalItemParser: No armor class found");
    return null;
  }

  extractMaxDexModifier(text) {
    // Pattern: "max Dex modifier +2", "maximum Dexterity modifier of +3"
    const pattern =
      /max(?:imum)?\s+dex(?:terity)?\s+modifier\s+(?:of\s+)?[+]?(\d+)/i;
    const match = text.match(pattern);

    if (match) {
      const maxDex = parseInt(match[1]);
      ItemUtils.log(`NaturalItemParser: Found max dex modifier: ${maxDex}`);
      this.confidence.maxDexModifier = 0.9;
      return maxDex;
    }

    ItemUtils.log("NaturalItemParser: No max dex modifier found");
    return null;
  }

  extractStrengthRequirement(text) {
    // Pattern: "Str 13", "Strength 15 required", "requires Strength 13"
    const patterns = [
      /(?:requires?\s+)?str(?:ength)?\s+(\d+)/i,
      /str(?:ength)?\s+requirement[:\s]+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const strReq = parseInt(match[1]);
        ItemUtils.log(
          `NaturalItemParser: Found strength requirement: ${strReq}`
        );
        this.confidence.strengthRequirement = 0.9;
        return strReq;
      }
    }

    ItemUtils.log("NaturalItemParser: No strength requirement found");
    return null;
  }

  extractStealthDisadvantage(text) {
    // Look for stealth disadvantage indication
    const pattern =
      /(?:stealth|dexterity\s+\(stealth\))\s+(?:checks?\s+)?(?:made\s+)?(?:at\s+)?disadvantage/i;

    if (pattern.test(text)) {
      ItemUtils.log("NaturalItemParser: Stealth disadvantage detected");
      this.confidence.stealthDisadvantage = 0.95;
      return true;
    }

    return false;
  }

  extractEquipmentProperties(text) {
    const lowerText = text.toLowerCase();
    const props = {
      adamantine: false,
      focus: false,
      magical: false,
      stealthDisadvantage: false,
    };

    // Adamantine
    if (/\badamantine\b/i.test(text)) {
      props.adamantine = true;
      ItemUtils.log("NaturalItemParser: Found property: adamantine");
    }

    // Focus (spellcasting focus)
    if (/\b(?:spellcasting\s+)?focus\b/i.test(text)) {
      props.focus = true;
      ItemUtils.log("NaturalItemParser: Found property: focus");
    }

    // Magical
    if (
      /\bmagical?\b|\bmagic\b|\+\d+\s+(?:armor|shield|equipment)/i.test(text)
    ) {
      props.magical = true;
      ItemUtils.log("NaturalItemParser: Found property: magical");
    }

    // Stealth disadvantage (use dedicated method)
    props.stealthDisadvantage = this.extractStealthDisadvantage(text);

    return props;
  }

  extractMagicBonus(text) {
    // Pattern: "+1 armor", "+1 weapon", "longsword +1", "+1 bonus to attack and damage"
    const patterns = [
      /[+](\d+)\s+(?:armor|shield|equipment|weapon|longsword|shortsword|greatsword|sword|axe|mace|hammer|dagger|bow|crossbow|spear|staff|club|flail|whip|lance|pike|scimitar|rapier|trident|glaive|halberd|maul|morningstar|war\s*pick)/i,
      /(?:armor|shield|equipment|weapon|longsword|shortsword|greatsword|sword|axe|mace|hammer|dagger|bow|crossbow|spear|staff|club|flail|whip|lance|pike|scimitar|rapier|trident|glaive|halberd|maul|morningstar|war\s*pick)\s+[+](\d+)/i,
      /[+](\d+)\s+bonus\s+to\s+(?:attack\s+and\s+damage|damage\s+and\s+attack)\s+rolls/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const bonus = parseInt(match[1]);
        ItemUtils.log(`NaturalItemParser: Found magic bonus: +${bonus}`);
        this.confidence.magicBonus = 0.9;
        return bonus;
      }
    }

    ItemUtils.log("NaturalItemParser: No magic bonus found");
    return null;
  }

  extractToolType(text) {
    const lowerText = text.toLowerCase();

    // Tool type patterns
    const typePatterns = {
      art: /\b(?:artisan'?s?\s+tools?|alchemist|brewer|calligrapher|carpenter|cartographer|cobbler|cook|glassblower|jeweler|leatherworker|mason|painter|potter|smith|tinker|weaver|woodcarver)\b/i,
      game: /\b(?:gaming\s+set|dice\s+set|playing\s+card|dragonchess|three-dragon\s+ante)\b/i,
      music:
        /\b(?:musical\s+instrument|bagpipes|drum|dulcimer|flute|horn|lute|lyre|pan\s+flute|shawm|viol)\b/i,
      none:
        /\b(?:disguise\s+kit|forgery\s+kit|herbalism\s+kit|navigator|poisoner|thieves|thief)\b/i,
    };

    // Check for explicit type declaration
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(text)) {
        const normalizedType = type === "none" ? "" : type;
        ItemUtils.log(
          `NaturalItemParser: Found tool type: ${normalizedType || "(blank)"}`
        );
        this.confidence.toolType = 0.85;
        return normalizedType;
      }
    }

    // Let the strict parser infer the type from the base tool when possible
    ItemUtils.log(
      "NaturalItemParser: Could not determine tool type, leaving it blank"
    );
    this.confidence.toolType = 0.3;
    return "";
  }

  extractBaseTool(text) {
    const lowerText = text.toLowerCase();

    // Base tool mappings with their common names
    const baseTools = {
      // Artisan's Tools
      alchemist: ["alchemist", "alchemist's supplies"],
      brewer: ["brewer", "brewer's supplies"],
      calligrapher: ["calligrapher", "calligrapher's supplies"],
      carpenter: ["carpenter", "carpenter's tools"],
      cartographer: ["cartographer", "cartographer's tools"],
      cobbler: ["cobbler", "cobbler's tools"],
      cook: ["cook", "cook's utensils"],
      glassblower: ["glassblower", "glassblower's tools"],
      jeweler: ["jeweler", "jeweler's tools"],
      leatherworker: ["leatherworker", "leatherworker's tools"],
      mason: ["mason", "mason's tools"],
      painter: ["painter", "painter's supplies"],
      potter: ["potter", "potter's tools"],
      smith: ["smith", "smith's tools", "blacksmith"],
      tinker: ["tinker", "tinker's tools"],
      weaver: ["weaver", "weaver's tools"],
      woodcarver: ["woodcarver", "woodcarver's tools"],

      // Gaming Sets
      dice: ["dice set", "dice"],
      card: ["playing card set", "playing cards", "card set"],
      chess: ["dragonchess set", "chess set", "three-dragon ante"],

      // Musical Instruments
      bagpipes: ["bagpipes"],
      drum: ["drum"],
      dulcimer: ["dulcimer"],
      flute: ["flute"],
      horn: ["horn"],
      lute: ["lute"],
      lyre: ["lyre"],
      panflute: ["pan flute", "panflute"],
      shawm: ["shawm"],
      viol: ["viol"],

      // Other Tools
      disg: ["disguise kit", "disguise"],
      forg: ["forgery kit", "forgery"],
      herb: ["herbalism kit", "herbalism"],
      navg: ["navigator's tools", "navigator"],
      pois: ["poisoner's kit", "poisoner"],
      thief: ["thieves' tools", "thief tools", "lockpicks"],
    };

    // Check each base tool
    for (const [base, variations] of Object.entries(baseTools)) {
      for (const variation of variations) {
        if (lowerText.includes(variation)) {
          ItemUtils.log(`NaturalItemParser: Found base tool: ${base}`);
          this.confidence.baseTool = 0.9;
          return base;
        }
      }
    }

    // Default fallback
    ItemUtils.log(
      "NaturalItemParser: Could not determine base tool, defaulting to thief"
    );
    return "thief";
  }

  extractToolBonus(text) {
    // Pattern: "+2 bonus to checks", "grants a +3 bonus"
    const bonusPattern = /[+](\d+)\s+(?:bonus\s+to\s+)?(?:tool\s+)?checks?/i;
    const match = text.match(bonusPattern);

    if (match) {
      const bonus = parseInt(match[1]);
      ItemUtils.log(`NaturalItemParser: Found tool bonus: +${bonus}`);
      this.confidence.toolBonus = 0.9;
      return bonus;
    }

    // Alternative pattern: "provides a +1"
    const altPattern = /provides?\s+a\s+[+](\d+)/i;
    const altMatch = text.match(altPattern);

    if (altMatch) {
      const bonus = parseInt(altMatch[1]);
      ItemUtils.log(
        `NaturalItemParser: Found tool bonus (alt pattern): +${bonus}`
      );
      this.confidence.toolBonus = 0.8;
      return bonus;
    }

    ItemUtils.log("NaturalItemParser: No tool bonus found");
    return null;
  }

  extractToolAbility(text) {
    const lowerText = text.toLowerCase();

    // Look for ability score mentions with tool checks
    const abilityPatterns = {
      str: /\bstrength\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
      dex: /\bdexterity\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
      con: /\bconstitution\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
      int: /\bintelligence\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
      wis: /\bwisdom\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
      cha: /\bcharisma\s+(?:\([^)]+\)\s+)?checks?\s+(?:using|with|made with)\s+(?:the\s+)?tool/i,
    };

    // Check each ability pattern
    for (const [ability, pattern] of Object.entries(abilityPatterns)) {
      if (pattern.test(text)) {
        ItemUtils.log(`NaturalItemParser: Found tool ability: ${ability}`);
        this.confidence.toolAbility = 0.9;
        return ability;
      }
    }

    // Infer from tool type if not explicitly stated
    const baseTool = this.extractBaseTool(text);
    const abilityDefaults = {
      // Artisan tools
      alchemist: "int",
      brewer: "int",
      calligrapher: "dex",
      carpenter: "str",
      cartographer: "wis",
      cobbler: "dex",
      cook: "wis",
      glassblower: "int",
      jeweler: "int",
      leatherworker: "dex",
      mason: "str",
      painter: "wis",
      potter: "int",
      smith: "str",
      tinker: "dex",
      weaver: "dex",
      woodcarver: "dex",

      // Gaming sets
      dice: "wis",
      card: "wis",
      chess: "wis",

      // Musical instruments - typically CHA
      bagpipes: "cha",
      drum: "cha",
      dulcimer: "cha",
      flute: "cha",
      horn: "cha",
      lute: "cha",
      lyre: "cha",
      panflute: "cha",
      shawm: "cha",
      viol: "cha",

      // Other tools
      disg: "cha",
      forg: "dex",
      herb: "int",
      navg: "wis",
      pois: "int",
      thief: "dex",
    };

    if (baseTool && abilityDefaults[baseTool]) {
      ItemUtils.log(
        `NaturalItemParser: Inferred tool ability from base tool: ${abilityDefaults[baseTool]}`
      );
      this.confidence.toolAbility = 0.6;
      return abilityDefaults[baseTool];
    }

    ItemUtils.log("NaturalItemParser: No tool ability found or inferred");
    return null;
  }

  extractToolProficiency(text) {
    const lowerText = text.toLowerCase();

    // Look for proficiency mentions
    if (/\bexpertise\b|\bdouble\s+proficiency\b/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found proficiency: expert");
      this.confidence.toolProficiency = 0.95;
      return "expert";
    }

    if (/\bproficien(?:t|cy)\b/i.test(text)) {
      ItemUtils.log("NaturalItemParser: Found proficiency: proficient");
      this.confidence.toolProficiency = 0.9;
      return "proficient";
    }

    // Default to proficient (most tools grant proficiency)
    ItemUtils.log(
      "NaturalItemParser: No proficiency found, defaulting to proficient"
    );
    return "proficient";
  }

  extractContainerCapacity(text) {
    const capacity = {
      itemCount: null,
      weightValue: null,
      weightUnits: "lb",
      volumeValue: null,
      volumeUnits: "cubicFoot",
    };

    // Item count capacity: "holds 10 items", "capacity: 15 items"
    const itemPattern = /(?:holds?|capacity|contain)[:\s]+(\d+)\s+items?/i;
    const itemMatch = text.match(itemPattern);
    if (itemMatch) {
      capacity.itemCount = parseInt(itemMatch[1]);
      ItemUtils.log(
        `NaturalItemParser: Found item capacity: ${capacity.itemCount} items`
      );
    }

    // Weight capacity: "holds 30 pounds", "500 lbs capacity", "can hold up to 500 pounds"
    const weightPatterns = [
      /(?:holds?|capacity|carry)[:\s]+(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:pounds?|lbs?)/i,
      /(?:can\s+)?hold(?:s)?\s+(?:up\s+to\s+)?(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:pounds?|lbs?)/i,
    ];
    for (const pattern of weightPatterns) {
      const weightMatch = text.match(pattern);
      if (weightMatch) {
        capacity.weightValue = parseFloat(weightMatch[1].replace(/,/g, ""));
        capacity.weightUnits = "lb";
        ItemUtils.log(
          `NaturalItemParser: Found weight capacity: ${capacity.weightValue} lb`
        );
        break;
      }
    }

    // Volume capacity: "1 cubic foot", "2 cubic feet"
    const volumePattern = /(\d+(?:\.\d+)?)\s+cubic\s+(?:foot|feet|ft)/i;
    const volumeMatch = text.match(volumePattern);
    if (volumeMatch) {
      capacity.volumeValue = parseFloat(volumeMatch[1]);
      capacity.volumeUnits = "cubicFoot";
      ItemUtils.log(
        `NaturalItemParser: Found volume capacity: ${capacity.volumeValue} cubic feet`
      );
    }

    // Check if we found any capacity
    if (capacity.itemCount || capacity.weightValue || capacity.volumeValue) {
      this.confidence.containerCapacity = 0.9;
      return capacity;
    }

    ItemUtils.log("NaturalItemParser: No container capacity found");
    return null;
  }

  extractWeightlessContents(text) {

    // Look for indicators that contents don't count toward weight
    const patterns = [
      /contents?\s+(?:don't|do\s+not|doesn't|does\s+not)\s+(?:count|add)\s+(?:to|toward)\s+(?:the\s+)?weight/i,
      /weightless\s+contents?/i,
      /items?\s+(?:placed\s+)?(?:in|inside)\s+(?:the\s+)?(?:bag|container|backpack)\s+(?:are|become)\s+weightless/i,
      /extradimensional\s+space/i,
      /interior\s+space\s+(?:is\s+)?(?:considerably\s+)?larger\s+than\s+(?:its\s+)?(?:outside|exterior)\s+dimensions?/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        ItemUtils.log("NaturalItemParser: Weightless contents detected");
        this.confidence.weightlessContents = 0.95;
        return true;
      }
    }

    return false;
  }

  extractCurrencyContents(text) {
    const currency = {
      pp: 0,
      gp: 0,
      ep: 0,
      sp: 0,
      cp: 0,
    };

    // Look for currency amounts INSIDE the container (not the item's cost)
    // Pattern: "contains X gp", "holds X pp", "X gp inside"

    // Platinum - look for "contains", "holds", "inside" context
    const ppPattern =
      /(?:contains?|holds?|inside|stored)[:\s]+(?:.*?)\b(\d+)\s*(?:pp|platinum)/i;
    const ppMatch = text.match(ppPattern);
    if (ppMatch) {
      currency.pp = parseInt(ppMatch[1]);
      ItemUtils.log(`NaturalItemParser: Found platinum: ${currency.pp} pp`);
    }

    // Gold
    const gpPattern =
      /(?:contains?|holds?|inside|stored)[:\s]+(?:.*?)\b(\d+)\s*(?:gp|gold)/i;
    const gpMatch = text.match(gpPattern);
    if (gpMatch) {
      currency.gp = parseInt(gpMatch[1]);
      ItemUtils.log(`NaturalItemParser: Found gold: ${currency.gp} gp`);
    }

    // Electrum
    const epPattern =
      /(?:contains?|holds?|inside|stored)[:\s]+(?:.*?)\b(\d+)\s*(?:ep|electrum)/i;
    const epMatch = text.match(epPattern);
    if (epMatch) {
      currency.ep = parseInt(epMatch[1]);
      ItemUtils.log(`NaturalItemParser: Found electrum: ${currency.ep} ep`);
    }

    // Silver
    const spPattern =
      /(?:contains?|holds?|inside|stored)[:\s]+(?:.*?)\b(\d+)\s*(?:sp|silver)/i;
    const spMatch = text.match(spPattern);
    if (spMatch) {
      currency.sp = parseInt(spMatch[1]);
      ItemUtils.log(`NaturalItemParser: Found silver: ${currency.sp} sp`);
    }

    // Copper
    const cpPattern =
      /(?:contains?|holds?|inside|stored)[:\s]+(?:.*?)\b(\d+)\s*(?:cp|copper)/i;
    const cpMatch = text.match(cpPattern);
    if (cpMatch) {
      currency.cp = parseInt(cpMatch[1]);
      ItemUtils.log(`NaturalItemParser: Found copper: ${currency.cp} cp`);
    }

    // Check if we found any currency
    const hasAnyCurrency =
      currency.pp > 0 ||
      currency.gp > 0 ||
      currency.ep > 0 ||
      currency.sp > 0 ||
      currency.cp > 0;

    if (hasAnyCurrency) {
      this.confidence.currencyContents = 0.9;
    }

    return currency;
  }

  extractContainerProperties(text) {
    const props = {
      magical: false,
      weightlessContents: false,
    };

    // Magical
    if (/\bmagical?\b|\bmagic\b/i.test(text)) {
      props.magical = true;
      ItemUtils.log("NaturalItemParser: Found container property: magical");
    }

    // Weightless contents (use dedicated method)
    props.weightlessContents = this.extractWeightlessContents(text);

    return props;
  }

  extractLootType(text) {
    const lowerText = text.toLowerCase();

    // Loot type patterns (checking from most specific to most general)
    const typePatterns = {
      gem: /\b(?:gem|gemstone|diamond|ruby|emerald|sapphire|pearl|jewel)\b/i,
      art: /\b(?:art\s+object|artwork|painting|sculpture|statue|tapestry|vase)\b/i,
      treasure: /\b(?:treasure|hoard|valuables?|riches)\b/i,
      material: /\b(?:material|ore|ingot|metal|wood|stone|fabric|cloth)\b/i,
      resource: /\b(?:resource|component|ingredient|reagent)\b/i,
      junk: /\b(?:junk|scrap|debris|refuse|trash|broken)\b/i,
      gear: /\b(?:adventuring\s+gear|gear|equipment|item|object)\b/i,
    };

    // Check for explicit type declaration
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(text)) {
        ItemUtils.log(`NaturalItemParser: Found loot type: ${type}`);
        this.confidence.lootType = 0.85;
        return type;
      }
    }

    // Default to gear (most generic loot type)
    ItemUtils.log(
      "NaturalItemParser: Could not determine loot type, defaulting to gear"
    );
    this.confidence.lootType = 0.3;
    return "gear";
  }

  extractLootProperties(text) {
    const props = {
      magical: false,
    };

    // Magical detection
    if (/\bmagical?\b|\bmagic\b|\benchanted\b/i.test(text)) {
      props.magical = true;
      ItemUtils.log("NaturalItemParser: Found loot property: magical");
    }

    return props;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  reset() {
    this.errors = [];
    this.warnings = [];
    this.text = "";
    this.confidence = {};
    this.extractedQuantity = null;
  }

  addError(message) {
    this.errors.push(message);
    ItemUtils.error(`NaturalItemParser Error: ${message}`);
  }

  addWarning(message) {
    this.warnings.push(message);
    ItemUtils.warn(`NaturalItemParser Warning: ${message}`);
  }

  createResult(success, item) {
    return {
      success,
      item,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }
}
