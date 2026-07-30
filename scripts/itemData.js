/**
 * 5e Item Importer - Item Data Model
 * Represents parsed item data and transforms it to dnd5e item data.
 */

import jsyaml from './vendor/js-yaml.mjs';
import { ItemUtils } from "./itemUtils.js";
import {
  MODULE_NAME,
  ItemTypes,
  CurrencyRates,
  BaseToolToType,
} from "./itemConfig.js";
import {
  getRandomWeaponIcon,
  getRandomEquipmentIcon,
  getRandomConsumableIcon,
  getRandomToolIcon,
  getRandomContainerIcon,
  getRandomLootIcon,
  getRandomSpellIcon
} from "./iconSemantics.js";
import { AutoAnimationsHandler } from "./integrations/autoAnimations.js";

export class ItemData {
  constructor(name) {
    // Basic Info
    this.name = name;
    this.type = null;
    this.description = "";
    this.identified = true;
    this.unidentifiedDescription = "";
    this.chatDescription = "";
    this.unidentifiedName = "";
    this.isMagical = false;

    // Classification
    this.categoryText = null;
    this.rarity = "common";
    this.attunement = ""; // Default to "Not Required"
    this.attunementRequirement = null;

    // Numeric Properties
    this.cost = 0; // Total value in copper pieces
    this.costDisplay = null; // Display value in best denomination
    this.costDenomination = "gp"; // Display denomination (pp, gp, ep, sp, cp)
    this.weight = 0; // Weight value
    this.weightUnits = "lb"; // Weight units (lb, tn, kg, Mg)
    this.uses = null; // { value, max } - for tools and other items
    this.recovery = null; // Array of { period, type, formula } for use recovery
    this.quantity = 1;
    this.equipped = false; // Whether item starts equipped
    this.magicBonus = 0;

    // Weapon Properties
    this.weaponType = null;
    this.baseWeapon = null; // Base weapon ID (longsword, dagger, etc.)
    this.damage = null; // { count, faces, bonus, type, formula }
    this.versatileDamage = null;
    this.range = null; // { value, long, units }
    this.reach = null;
    this.thrownRange = null;
    this.properties = []; // Array of property codes
    this.attackBonus = null;
    this.mastery = null; // 2024 weapon mastery
    this.reloadAmount = null; // Reload property value
    this.proficient = null; // Proficiency level (null=automatic, 0=not proficient, 1=proficient)

    // Siege Weapon Properties
    this.siegeArmorClass = null;
    this.cover = "none"; // none, half, threeQuarters, total
    this.hitPoints = null; // { value, max, dt, conditions }

    // Armor Properties
    this.armorType = null;
    this.baseEquipment = null; // Base equipment ID (leather, plate, shield, etc.)
    this.armorClass = null;
    this.armorAddDex = false;
    this.maxDexModifier = null; // Maximum Dex bonus to AC
    this.stealthDisadvantage = false;
    this.strengthRequirement = null;

    // Vehicle Properties
    this.vehicleArmorClass = null;
    this.cover = "none"; // none, half, threeQuarters, total
    this.speed = null;
    this.speedConditions = "";

    // Consumable Properties
    this.consumableType = null;
    this.autoDestroy = false; // Destroy on empty
    this.poisonType = null; // contact, ingested, inhaled, injury

    // Scroll properties
    this.concentration = false;
    this.somatic = false;
    this.verbal = false;
    this.ritual = false;

    // Ammunition Properties
    this.ammunitionType = null; // arrow, bolt, bullet, etc.
    this.ammunitionDamage = null; // { formula, type }
    this.replaceDamage = false; // Replace weapon damage
    this.adamantine = false; // Adamantine ammunition
    this.silvered = false; // Silvered ammunition
    this.returning = false; // Returning ammunition

    // Tool Properties
    this.toolType = null; // art, game, music
    this.baseToolItem = null; // specific tool name
    this.toolAbility = null; // ability for tool checks
    this.toolBonus = null; // bonus to tool checks

    // Container Properties
    this.weightCapacity = null; // Weight capacity value
    this.weightCapacityUnits = "lb"; // lb, tn, kg, Mg
    this.volumeCapacity = null; // Volume capacity value
    this.volumeCapacityUnits = "cubicFoot"; // cubicFoot or liter
    this.itemCapacity = null; // Item count capacity
    this.weightlessContents = false; // Weightless contents property

    // Spell Properties
    this.spellLevel = 0;
    this.spellSchool = null;
    this.spellAbility = null; // Override spellcasting ability (str|dex|con|int|wis|cha)

    // Components
    this.vocal = false;
    this.somatic = false;
    this.material = false;
    this.materialValue = '';
    this.materialCost = null;
    this.materialSupply = null;
    this.materialConsumed = false;

    // Preparation
    this.preparationMode = 'spell';
    this.prepared = false;
    this.ritual = false;
    this.concentration = false;

    // Duration (spell-specific structure)
    this.duration = null; // { value, units }

    // Target (spell-specific structure)
    this.target = null; // { type, count, choice, special }

    // Area of Effect
    this.area = null; // { type, size, units, count, width, height, contiguous }

    // Activation
    this.activationType = null; // action, bonus, reaction, special
    this.saveDC = null; // DC for saving throw
    this.saveAbility = null; // Ability for saving throw

    // Inline activities/effects (from Activities: section in YAML)
    this.pendingActivities = []; // Array of { key, name, rawData }

    // Allowlisted extension data. This is persisted under this module's flags,
    // never into arbitrary dnd5e system paths.
    this.customProperties = {};

    // Foundry data holder
    this.#dnd5e = {};
  }

  #dnd5e = {};

  /**
   * Get the Foundry item data
   */
  get itemData() {
    return this.#dnd5e;
  }

  /**
   * Set a property on the Foundry item data
   */
  setProperty(path, value) {
    return ItemUtils.setProperty(this.#dnd5e, path, value);
  }

  /**
   * Get a property from the Foundry item data
   */
  getProperty(path) {
    return ItemUtils.getProperty(this.#dnd5e, path);
  }

  /**
   * Transform parsed data to Foundry dnd5e item structure
   */
  async buildFoundryData(options = {}) {
    ItemUtils.log("Building Foundry data for:", this.name);
    ItemUtils.log("ChatDescription before build:", this.chatDescription);
    ItemUtils.log(
      "UnidentifiedDescription before build:",
      this.unidentifiedDescription
    );
    ItemUtils.log("Description to be used:", {
      length: this.description.length,
      content: this.description,
    });

    if (this.type === "container" && this.quantity !== 1) {
      ItemUtils.warn(`Container quantity "${this.quantity}" was normalized to 1 for the current dnd5e schema.`);
      this.quantity = 1;
    }

    // Base item structure
    this.#dnd5e = {
      name: this.name,
      type: this.type,
      img:
        {
          weapon: "systems/dnd5e/icons/svg/items/weapon.svg",
          equipment: "systems/dnd5e/icons/svg/items/equipment.svg",
          container: "systems/dnd5e/icons/svg/items/container.svg",
          consumable: "systems/dnd5e/icons/svg/items/consumable.svg",
          tool: "systems/dnd5e/icons/svg/items/tool.svg",
          loot: "systems/dnd5e/icons/svg/items/loot.svg",
          spell: "systems/dnd5e/icons/svg/items/spell.svg",
        }[this.type] ?? "icons/svg/item-bag.svg",
      system: {
        description: {
          value: this.description,
          chat: this.chatDescription || "",
        },
        unidentified: {
          name: this.unidentifiedName || "",
          description: this.unidentifiedDescription || "",
        },
        quantity: this.type === "container" ? 1 : this.quantity,
        weight: {
          value: this.weight,
          units: this.weightUnits,
        },
        price: {
          value: this.getCostValue(),
          denomination: this.costDenomination,
        },
        rarity: this.rarity,
        identified: this.identified,
      },
    };

    // dnd5e SpellData has description/activity fields, but not the physical,
    // identification, rarity, or attunement templates used by inventory items.
    if (this.type === "spell") {
      delete this.#dnd5e.system.unidentified;
      delete this.#dnd5e.system.quantity;
      delete this.#dnd5e.system.weight;
      delete this.#dnd5e.system.price;
      delete this.#dnd5e.system.rarity;
      delete this.#dnd5e.system.identified;
    }

    // This triggers the specific builders (like buildEquipmentData)
    // which actually fill in the system.type.value and system.type.baseItem
    switch (this.type) {
      case "weapon":
        await this.buildWeaponData();
        break;
      case "equipment":
        await this.buildEquipmentData();
        break;
      case "consumable":
        await this.buildConsumableData();
        break;
      case "tool":
        await this.buildToolData();
        break;
      case "container":
        await this.buildContainerData();
        break;
      case "loot":
        await this.buildLootData();
        break;
      case "spell":
        await this.buildSpellData();
        break;
    }

    // Equipped state (weapon, equipment, consumable, tool only — not loot/container/spell)
    const equippableTypes = ["weapon", "equipment", "consumable", "tool"];
    if (equippableTypes.includes(this.type) && this.equipped) {
      this.setProperty("system.equipped", true);
      ItemUtils.log("Equipped set to true");
    }

    // Attunement - Uses the string directly ("required", "optional", or "")
    if (this.type !== "spell") {
      if (this.attunement === "none") {
        this.setProperty("system.attunement", "");
      } else {
        this.setProperty("system.attunement", this.attunement || "");
      }
      if (this.attunementRequirement) {
        this.setProperty(`flags.${MODULE_NAME}.attunementRequirement`, this.attunementRequirement);
      }
    }

    // Try to find matching icon using priority: Semantic → Compendium → System
    let icon = null;

    // 1. First try semantic random icons (if enabled)
    switch (this.type) {
      case "weapon":
        icon = await getRandomWeaponIcon(
          this.baseWeapon,
          this.weaponType,
          this.name,
          options
        );
        break;
      case "equipment":
        icon = await getRandomEquipmentIcon(
          this.baseEquipment,
          this.armorType,
          this.name,
          options
        );
        break;
      case "consumable":
        icon = await getRandomConsumableIcon(
          this.consumableType,
          this.ammunitionType,
          this.poisonType,
          this.name,
          options
        );
        break;
      case "tool":
        icon = await getRandomToolIcon(
          this.toolType,
          this.baseToolItem,
          this.name,
          options
        );
        break;
      case "container":
        icon = await getRandomContainerIcon(this.name, options);
        break;
      case "loot":
        icon = await getRandomLootIcon(this.lootType, this.name, options);
        break;
      case "spell":
        icon = await getRandomSpellIcon(
          this.spellSchool,
          this.spellLevel,
          this.name,
          options
        );
        break;
    }

    // 2. Fall back to compendium search (if enabled and no semantic icon found)
    if (!icon && game.settings.get(MODULE_NAME, "matchIcons")) {
      try {
        const core = await import("./itemCoreFeatures.js");
        if (typeof core.collectCompendiumImageCandidates === "function"
          && typeof core.selectCompendiumImageCandidate === "function") {
          const mode = options.compendiumImageMode
            ?? game.settings.get(MODULE_NAME, "compendiumImageMode")
            ?? "deterministic";
          const cacheKey = `${this.type}:${this.name.toLocaleLowerCase()}`;
          const candidates = await core.collectCompendiumImageCandidates(this.name, {
            type: this.type,
            cacheKey,
            useCache: true
          });
          this.selectedImageCandidate = core.selectCompendiumImageCandidate(candidates, {
            deterministic: mode !== "random",
            seed: options.compendiumImageSeed,
            cacheKey: mode !== "random" ? cacheKey : null,
            useCache: mode !== "random"
          });
          icon = this.selectedImageCandidate?.img ?? null;
        }
      } catch (error) {
        ItemUtils.warn(`Compendium image selector failed: ${error?.message || error}`);
      }

      // Compatibility fallback for releases without the candidate service.
      if (!icon) icon = await ItemUtils.getImgFromPackItemAsync(this.name, this.type);

      if (icon) {
        ItemUtils.log("Found compendium icon:", icon);
      }
    }

    // 3. Fall back to system icon search
    if (!icon && game.settings.get(MODULE_NAME, "matchIcons")) {
      icon = await ItemUtils.findSystemIcon(this.name, this.type, options);

      if (icon) {
        ItemUtils.log("Found system icon:", icon);
      }
    }

    // Apply found icon
    if (icon) {
      this.#dnd5e.img = icon;
    }

    // AutoAnimations Integration
    // 1. Check if user checked the box (options.generateAnimations)
    // 2. Check if module is active (safety)
    if (options.generateAnimations && game.modules.get("autoanimations")?.active) {
      const aaFlags = AutoAnimationsHandler.generateFlags(this);

      if (aaFlags) {
        const existingFlags = this.getProperty("flags") || {};
        const mergedFlags = foundry.utils.mergeObject(existingFlags, aaFlags);
        this.setProperty("flags", mergedFlags);
        ItemUtils.log("Applied AutoAnimations flags for:", this.name);
      }
    }

    // Custom properties are module-owned and restricted to registered IDs.
    await this.#applyCustomPropertyFlags(options);

    ItemUtils.log("Foundry data built", this.#dnd5e);
  }

  async #applyCustomPropertyFlags(options = {}) {
    if (!this.customProperties || typeof this.customProperties !== "object" || Array.isArray(this.customProperties)) return;
    let patch;
    try {
      const core = await import("./itemCoreFeatures.js");
      if (typeof core.customPropertiesToItemSourcePatch !== "function") {
        ItemUtils.warn("Custom property source adapter is unavailable; custom properties were not persisted.");
        return;
      }
      patch = await Promise.resolve(core.customPropertiesToItemSourcePatch(this.customProperties, { ...options, itemType: this.type }));
    } catch (error) {
      ItemUtils.warn(`Custom property service unavailable: ${error?.message || error}`);
      return;
    }

    for (const warning of patch?.warnings ?? []) ItemUtils.warn(warning);
    for (const error of patch?.errors ?? []) ItemUtils.warn(error);

    if (patch?.flags && typeof patch.flags === "object") {
      const existingFlags = this.getProperty("flags") || {};
      this.setProperty("flags", foundry.utils.mergeObject(existingFlags, patch.flags, {
        inplace: false,
        recursive: true
      }));
    }

    if (Array.isArray(patch?.registeredPropertyIds) && patch.registeredPropertyIds.length > 0) {
      const existing = this.getProperty("system.properties");
      const existingIds = existing instanceof Set
        ? [...existing]
        : Array.isArray(existing) ? existing
          : existing && typeof existing === "object"
            ? Object.entries(existing).filter(([, enabled]) => !!enabled).map(([id]) => id)
            : [];
      const properties = new Set(existingIds);
      for (const id of patch.registeredPropertyIds) properties.add(id);
      this.setProperty("system.properties", properties);
    }
  }

  /**
   * Apply uses and recovery data to the Foundry item (shared across all item types).
   * @param {string} [logLabel] - Label for debug logging
   */
  #applyUsesData(logLabel = "uses") {
    if (!this.uses) return;

    this.setProperty("system.uses.max", this.uses.max);
    this.setProperty("system.uses.spent", this.uses.value ?? 0);
    ItemUtils.log(`${logLabel} uses set to`, this.uses);

    if (this.recovery && this.recovery.length > 0) {
      const recoveryArray = this.recovery.map((rec) => {
        const config = { period: rec.period, type: rec.type };
        // dnd5e also uses formula as the recharge threshold for recoverAll.
        if (rec.formula) config.formula = rec.formula;
        return config;
      });
      this.setProperty("system.uses.recovery", recoveryArray);
      ItemUtils.log(`${logLabel} recovery set to`, recoveryArray);
    }
  }

  /**
   * Build weapon-specific data
   */
  async buildWeaponData() {
    ItemUtils.log("Building weapon data");

    // Weapon type
    if (this.weaponType) {
      this.setProperty("system.type.value", this.weaponType);
      ItemUtils.log("Weapon type set to", this.weaponType);
    }

    // Base weapon
    if (this.baseWeapon) {
      this.setProperty("system.type.baseItem", this.baseWeapon);
      ItemUtils.log("Base weapon set to", this.baseWeapon);
    }

    // Damage (formula-based for strict parser)
    if (this.damage) {
      if (this.damage.formula) {
        // New formula-based damage (from strict parser)
        // Use custom formula mode for maximum flexibility

        // Ensure types is always an array. Typed custom formulas can carry
        // their own damage types, so an empty array is valid here.
        const types = Array.isArray(this.damage.type)
          ? this.damage.type
          : this.damage.type
            ? [this.damage.type]
            : [];

        this.setProperty("system.damage.base", {
          number: null,
          denomination: null,
          bonus: "",
          types: types,
          custom: {
            enabled: true,
            formula: this.damage.formula,
          },
          scaling: {
            mode: "",
            number: null,
            formula: "",
          },
        });

        const typeDisplay = types.join(", ");
        ItemUtils.log(
          "Damage set to custom formula",
          `${this.damage.formula} ${typeDisplay}`
        );
      } else if (this.damage.count && this.damage.faces) {
        // Legacy count/faces/bonus format (from natural parser)
        this.setProperty("system.damage.base", {
          number: this.damage.count,
          denomination: this.damage.faces,
          bonus: this.damage.bonus ? this.damage.bonus.toString() : "0",
          types: [this.damage.type],
        });
        ItemUtils.log(
          "Damage set to",
          `${this.damage.count}d${this.damage.faces}+${this.damage.bonus} ${this.damage.type}`
        );
      }
    }

    // Versatile damage
    if (this.versatileDamage) {
      if (this.versatileDamage.formula) {
        // Formula-based versatile damage (from strict parser)
        // Use custom formula mode for maximum flexibility

        // Ensure types is always an array, use base damage type if not specified
        const types = this.versatileDamage.type
          ? Array.isArray(this.versatileDamage.type)
            ? this.versatileDamage.type
            : [this.versatileDamage.type]
          : this.damage && this.damage.type
            ? Array.isArray(this.damage.type)
              ? this.damage.type
              : [this.damage.type]
            : [];

        this.setProperty("system.damage.versatile", {
          number: null,
          denomination: null,
          bonus: "",
          types: types,
          custom: {
            enabled: true,
            formula: this.versatileDamage.formula,
          },
          scaling: {
            mode: "",
            number: null,
            formula: "",
          },
        });

        const typeDisplay = types.join(", ");
        ItemUtils.log(
          "Versatile damage set to custom formula",
          `${this.versatileDamage.formula} ${typeDisplay}`
        );
      } else {
        // Legacy format
        this.setProperty("system.damage.versatile", this.versatileDamage);
      }
    }

    // Range
    if (this.range) {
      if (this.range.value !== null && this.range.value !== undefined) {
        this.setProperty("system.range.value", this.range.value);
      }
      if (this.range.long !== null && this.range.long !== undefined) {
        this.setProperty("system.range.long", this.range.long);
      }
      if (this.range.units) {
        this.setProperty("system.range.units", this.range.units);
      }
      ItemUtils.log("Range set to", this.range);
    }

    // Reach (for melee weapons)
    if (this.reach !== null && this.reach !== undefined) {
      this.setProperty("system.range.reach", this.reach);
      ItemUtils.log("Reach set to", this.reach);
    }

    // Properties (convert array to Set for dnd5e v5)
    if (this.properties && this.properties.length > 0) {
      this.setProperty("system.properties", new Set(this.properties));
      ItemUtils.log("Properties set", this.properties);
    }

    // Stealth disadvantage - must be set on system.properties Set
    if (this.stealthDisadvantage) {
      const props = this.getProperty("system.properties") || new Set();
      if (props instanceof Set) {
        props.add("stealthDisadvantage");
      } else {
        // Convert to Set if it's not already
        const propsSet = new Set(props);
        propsSet.add("stealthDisadvantage");
        this.setProperty("system.properties", propsSet);
      }
      ItemUtils.log("Stealth disadvantage enabled");
    }

    // Ammunition type
    if (this.ammunitionType) {
      this.setProperty("system.ammunition.type", this.ammunitionType);
      ItemUtils.log("Ammunition type set to", this.ammunitionType);
    }

    // Reload amount
    if (this.reloadAmount !== null && this.reloadAmount !== undefined) {
      this.setProperty("system.reload", this.reloadAmount);
      ItemUtils.log("Reload amount set to", this.reloadAmount);
    }

    // Mastery (2024 rules)
    if (this.mastery) {
      this.setProperty("system.mastery", this.mastery);
      ItemUtils.log("Mastery set to", this.mastery);
    }

    // Magic bonus (applies to attack and damage)
    if (this.magicBonus !== null && this.magicBonus !== undefined) {
      this.setProperty("system.magicalBonus", this.magicBonus);
      ItemUtils.log("Magic bonus set to", this.magicBonus);
    }

    // Proficiency
    if (this.proficient !== null && this.proficient !== undefined) {
      this.setProperty("system.proficient", this.proficient);
      ItemUtils.log("Proficiency set to", this.proficient);
    }

    // Uses (for limited-use magical weapons)
    this.#applyUsesData("Weapon");

    // Siege weapon properties
    if (this.weaponType === "siege") {
      // Armor Class
      if (this.siegeArmorClass !== null) {
        this.setProperty("system.armor.value", this.siegeArmorClass);
        ItemUtils.log("Siege AC set to", this.siegeArmorClass);
      }

      // Cover
      if (this.cover) {
        this.setProperty("system.cover", this.cover);
        ItemUtils.log("Cover set to", this.cover);
      }

      // Hit Points
      if (this.hitPoints) {
        if (this.hitPoints.value !== null) {
          this.setProperty("system.hp.value", this.hitPoints.value);
        }
        if (this.hitPoints.max !== null) {
          this.setProperty("system.hp.max", this.hitPoints.max);
        }
        if (this.hitPoints.dt !== null) {
          this.setProperty("system.hp.dt", this.hitPoints.dt);
        }
        if (this.hitPoints.conditions) {
          this.setProperty("system.hp.conditions", this.hitPoints.conditions);
        }
        ItemUtils.log("Siege HP set to", this.hitPoints);
      }
    }

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? new Set();
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("mgc");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Magical property added to Set");
    }
  }

  /**
   * Build equipment/armor data
   */
  async buildEquipmentData() {
    ItemUtils.log("Building equipment data");

    // Armor/Equipment type
    if (this.armorType) {
      this.setProperty("system.type.value", this.armorType);
      ItemUtils.log("Equipment type set to", this.armorType);
    }

    // Base equipment
    if (this.baseEquipment) {
      this.setProperty("system.type.baseItem", this.baseEquipment);
      ItemUtils.log("Base equipment set to", this.baseEquipment);
      // Verify it was set
      const verifyBase = this.getProperty("system.type.baseItem");
      ItemUtils.log("Base equipment verification:", verifyBase);
    }

    // Armor class
    if (this.armorClass !== null && this.armorClass !== undefined) {
      this.setProperty("system.armor.value", this.armorClass);
      ItemUtils.log("Armor class set to", this.armorClass);
    }

    // Max Dex modifier
    if (this.maxDexModifier !== null && this.maxDexModifier !== undefined) {
      this.setProperty("system.armor.dex", this.maxDexModifier);
      ItemUtils.log("Max Dex modifier set to", this.maxDexModifier);
    } else if (this.armorAddDex) {
      // Legacy: armorAddDex true means unlimited dex bonus
      this.setProperty("system.armor.dex", null);
      ItemUtils.log("Armor allows full Dex bonus");
    }

    // Strength requirement
    if (
      this.strengthRequirement !== null &&
      this.strengthRequirement !== undefined
    ) {
      this.setProperty("system.strength", this.strengthRequirement);
      ItemUtils.log("Strength requirement set to", this.strengthRequirement);
    }

    // Properties (convert array to Set for dnd5e v5)
    if (this.properties && this.properties.length > 0) {
      const propsSet = this.getProperty("system.properties") ?? new Set();
      // Ensure it's a Set
      const finalSet = propsSet instanceof Set ? propsSet : new Set();
      // Add all properties from array
      this.properties.forEach((prop) => {
        finalSet.add(prop);
      });
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Properties set as Set", Array.from(finalSet));
    }

    // Stealth disadvantage (add to properties Set)
    if (this.stealthDisadvantage) {
      const props = this.getProperty("system.properties") ?? new Set();
      // Ensure it's a Set
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("stealthDisadvantage");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Stealth disadvantage added to properties Set");
    }

    // Magic bonus (adds to AC for armor/shields)
    if (this.magicBonus !== null && this.magicBonus !== undefined) {
      this.setProperty("system.armor.magicalBonus", this.magicBonus);
      ItemUtils.log("Magic bonus set to", this.magicBonus);
    }

    // Proficiency
    if (this.proficient !== null && this.proficient !== undefined) {
      this.setProperty("system.proficient", this.proficient);
      ItemUtils.log("Proficiency set to", this.proficient);
    }

    // Uses (for limited-use magical items)
    this.#applyUsesData("Equipment");

    // Vehicle properties
    if (this.armorType === "vehicle") {
      // Vehicle Armor Class
      if (this.vehicleArmorClass !== null) {
        this.setProperty("system.armor.value", this.vehicleArmorClass);
        ItemUtils.log("Vehicle AC set to", this.vehicleArmorClass);
      }

      // Cover
      if (this.cover) {
        this.setProperty("system.cover", this.cover);
        ItemUtils.log("Cover set to", this.cover);
      }

      // Hit Points
      if (this.hitPoints) {
        if (this.hitPoints.value !== null) {
          this.setProperty("system.hp.value", this.hitPoints.value);
        }
        if (this.hitPoints.max !== null) {
          this.setProperty("system.hp.max", this.hitPoints.max);
        }
        if (this.hitPoints.dt !== null) {
          this.setProperty("system.hp.dt", this.hitPoints.dt);
        }
        if (this.hitPoints.conditions) {
          this.setProperty("system.hp.conditions", this.hitPoints.conditions);
        }
        ItemUtils.log("Vehicle HP set to", this.hitPoints);
      }

      // Speed
      if (this.speed !== null) {
        this.setProperty("system.speed.value", this.speed);
        ItemUtils.log("Speed set to", this.speed);
      }

      // Speed Conditions
      if (this.speedConditions) {
        this.setProperty("system.speed.conditions", this.speedConditions);
        ItemUtils.log("Speed conditions set to", this.speedConditions);
      }
    }

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? new Set();
      // Ensure it's a Set
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("mgc");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Magical property added to Set");
    }
  }

  async buildConsumableData() {
    ItemUtils.log("Building consumable data");

    // Consumable type
    if (this.consumableType) {
      this.setProperty("system.type.value", this.consumableType);
      ItemUtils.log("Consumable type set to", this.consumableType);
    }

    // Uses (for consumables, use recharge if available, otherwise uses)
    this.#applyUsesData("Consumable");

    // Poison subtype
    if (this.consumableType === "poison" && this.poisonType) {
      this.setProperty("system.type.subtype", this.poisonType);
      ItemUtils.log("Poison subtype set to", this.poisonType);
    }

    // Ammunition subtype (set for all ammunition, not just those with damage)
    if (this.consumableType === "ammo" && this.ammunitionType) {
      this.setProperty("system.type.subtype", this.ammunitionType);
      ItemUtils.log("Ammunition subtype set to", this.ammunitionType);
    }

    // Ammunition damage (if consumable is ammo)
    if (this.consumableType === "ammo" && this.damage && this.damage.formula) {
      // Formula-based ammunition damage
      // Ensure types is always an array
      const types = this.damage.type
        ? Array.isArray(this.damage.type)
          ? this.damage.type
          : [this.damage.type]
        : [];

      this.setProperty("system.damage.base", {
        number: null,
        denomination: null,
        bonus: "",
        types: types,
        custom: {
          enabled: true,
          formula: this.damage.formula,
        },
        scaling: {
          mode: "",
          number: null,
          formula: "",
        },
      });

      // Set replace flag if specified
      if (this.damageReplace !== null && this.damageReplace !== undefined) {
        this.setProperty("system.damage.replace", this.damageReplace);
      }

      const typeDisplay = types.length > 0 ? types.join(", ") : "no type";
      ItemUtils.log(
        "Ammunition damage set to custom formula",
        `${this.damage.formula} [${typeDisplay}]`
      );
    }

    // Magic bonus for magical ammunition
    if (
      this.consumableType === "ammo" &&
      this.magicBonus !== null &&
      this.magicBonus !== undefined
    ) {
      this.setProperty("system.magicalBonus", this.magicBonus);
      ItemUtils.log("Ammunition magic bonus set to", this.magicBonus);
    }

    // Ammunition properties (adamantine, silvered, returning)
    if (this.consumableType === "ammo") {
      const props = this.getProperty("system.properties") || new Set();

      if (this.adamantine) {
        props.add("ada");
        ItemUtils.log("Adamantine property added");
      }
      if (this.silvered) {
        props.add("sil");
        ItemUtils.log("Silvered property added");
      }
      if (this.returning) {
        props.add("ret");
        ItemUtils.log("Returning property added");
      }

      this.setProperty("system.properties", props);
    }

    // Scroll properties (spell components)
    if (this.consumableType === "scroll") {
      const props = this.getProperty("system.properties") || new Set();

      if (this.concentration) {
        props.add("concentration");
        ItemUtils.log("Concentration property added");
      }
      if (this.somatic) {
        props.add("somatic");
        ItemUtils.log("Somatic component added");
      }
      if (this.verbal) {
        props.add("vocal");
        ItemUtils.log("Verbal component added");
      }
      if (this.ritual) {
        props.add("ritual");
        ItemUtils.log("Ritual property added");
      }

      this.setProperty("system.properties", props);
    }

    // Properties (convert array to Set for dnd5e v5.1)
    if (this.properties && this.properties.length > 0) {
      // Get existing properties (like mgc that may have been added)
      const existingProps = this.getProperty("system.properties") || new Set();

      // Add all parsed properties
      this.properties.forEach((prop) => existingProps.add(prop));

      this.setProperty("system.properties", existingProps);
      ItemUtils.log("Properties set", Array.from(existingProps));
    }

    // Magical property for rare+ items
    if (this.isMagical) {
      const props = this.getProperty("system.properties") || new Set();
      props.add("mgc");
      this.setProperty("system.properties", props);
    }

    // Auto-destroy on empty
    if (this.autoDestroy) {
      this.setProperty("system.uses.autoDestroy", true);
      ItemUtils.log("Auto-destroy enabled");
    }
  }

  async buildToolData() {
    ItemUtils.log("Building tool data");

    // Base tool item MUST be set before tool type
    // because tool type is inferred from base tool
    if (this.baseToolItem) {
      this.setProperty("system.type.baseItem", this.baseToolItem);
      ItemUtils.log("Base tool set to", this.baseToolItem);

      // Auto-set tool type based on base tool
      const autoType = BaseToolToType[this.baseToolItem];
      if (autoType !== undefined && !this.toolType) {
        this.toolType = autoType;
        ItemUtils.log("Tool type auto-set to", this.toolType || "(none)");
      }
    }

    // Tool type (art, game, music, or empty string for other tools)
    if (this.toolType !== null) {
      this.setProperty("system.type.value", this.toolType);
      ItemUtils.log("Tool type set to", this.toolType || "(other tools)");
    }

    // Ability for tool checks
    if (this.toolAbility) {
      this.setProperty("system.ability", this.toolAbility);
      ItemUtils.log("Tool ability set to", this.toolAbility);
    }

    // Tool bonus
    if (this.toolBonus !== null && this.toolBonus !== undefined && this.toolBonus !== "") {
      this.setProperty("system.bonus", this.toolBonus.toString());
      ItemUtils.log("Tool bonus set to", this.toolBonus);
    }

    // Limited uses
    this.#applyUsesData("Tool");

    // Proficiency
    if (this.proficient !== null && this.proficient !== undefined) {
      this.setProperty("system.proficient", this.proficient);
      ItemUtils.log("Proficiency set to", this.proficient);
    }

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? new Set();
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("mgc");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Magical property added to Set");
    }
  }

  /**
   * Build container data
   */
  async buildContainerData() {
    ItemUtils.log("Building container data");

    // Item count capacity
    if (this.itemCapacity !== null) {
      this.setProperty("system.capacity.count", this.itemCapacity);
      ItemUtils.log("Item capacity set to", this.itemCapacity);
    }

    // Weight capacity
    if (this.weightCapacity !== null) {
      this.setProperty("system.capacity.weight.value", this.weightCapacity);
      this.setProperty(
        "system.capacity.weight.units",
        this.weightCapacityUnits
      );
      ItemUtils.log(
        "Weight capacity set to",
        `${this.weightCapacity} ${this.weightCapacityUnits}`
      );
    }

    // Volume capacity
    if (this.volumeCapacity !== null) {
      this.setProperty("system.capacity.volume.value", this.volumeCapacity);
      this.setProperty(
        "system.capacity.volume.units",
        this.volumeCapacityUnits
      );
      ItemUtils.log(
        "Volume capacity set to",
        `${this.volumeCapacity} ${this.volumeCapacityUnits}`
      );
    }

    // Weightless contents property
    if (this.weightlessContents) {
      const props = this.getProperty("system.properties") ?? new Set();
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("weightlessContents");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Weightless contents enabled");
    }

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? new Set();
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("mgc");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Magical property added to Set");
    }

    // Currency contents (coins stored IN the container)
    if (this.currency) {
      this.setProperty("system.currency.pp", this.currency.pp || 0);
      this.setProperty("system.currency.gp", this.currency.gp || 0);
      this.setProperty("system.currency.ep", this.currency.ep || 0);
      this.setProperty("system.currency.sp", this.currency.sp || 0);
      this.setProperty("system.currency.cp", this.currency.cp || 0);
      ItemUtils.log("Container currency set:", this.currency);
    }
  }

  /**
   * Build generic loot/adventuring gear data
   */
  async buildLootData() {
    ItemUtils.log("Building loot data");

    // Set loot type
    if (this.lootType) {
      this.setProperty("system.type.value", this.lootType);
      ItemUtils.log("Loot type set to", this.lootType);
    } else {
      // Default to adventuring gear
      this.setProperty("system.type.value", "gear");
    }

    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? new Set();
      const finalSet = props instanceof Set ? props : new Set();
      finalSet.add("mgc");
      this.setProperty("system.properties", finalSet);
      ItemUtils.log("Magical property added to Set");
    }

    ItemUtils.log("After all type-specific builds, final check:");
    ItemUtils.log("  Full system object:", this.#dnd5e.system);
  }

  /**
 * Build spell-specific data
 */
  async buildSpellData() {
    ItemUtils.log("Building spell data");

    // Spell level
    this.setProperty("system.level", this.spellLevel);
    ItemUtils.log("Spell level set to", this.spellLevel);

    // Spell school
    if (this.spellSchool) {
      this.setProperty("system.school", this.spellSchool);
      ItemUtils.log("Spell school set to", this.spellSchool);
    }

    // Spellcasting ability override
    if (this.spellAbility) {
      this.setProperty("system.ability", this.spellAbility);
      ItemUtils.log("Spell ability override set to", this.spellAbility);
    }

    // Build properties Set for components and special properties
    const props = new Set();

    if (this.vocal) {
      props.add("vocal");
      ItemUtils.log("Vocal component added");
    }
    if (this.somatic) {
      props.add("somatic");
      ItemUtils.log("Somatic component added");
    }
    if (this.material) {
      props.add("material");
      ItemUtils.log("Material component added");
    }
    if (this.concentration) {
      props.add("concentration");
      ItemUtils.log("Concentration added");
    }
    if (this.ritual) {
      props.add("ritual");
      ItemUtils.log("Ritual added");
    }

    this.setProperty("system.properties", props);

    // Materials (if material component exists)
    if (this.material) {
      this.setProperty("system.materials.value", this.materialValue || "");
      this.setProperty("system.materials.consumed", this.materialConsumed);

      if (this.materialCost !== null) {
        this.setProperty("system.materials.cost", this.materialCost);
      }
      if (this.materialSupply !== null) {
        this.setProperty("system.materials.supply", this.materialSupply);
      }

      ItemUtils.log("Materials set", {
        value: this.materialValue,
        consumed: this.materialConsumed,
        cost: this.materialCost,
        supply: this.materialSupply
      });
    }

    // Preparation
    const preparationMethod = this.preparationMode === "prepared" ? "spell" : (this.preparationMode || "spell");
    this.setProperty("system.method", preparationMethod);
    this.setProperty("system.prepared", this.prepared ? 1 : 0);
    ItemUtils.log("Preparation set", {
      method: preparationMethod,
      prepared: this.prepared
    });

    // Activation
    if (this.activationType) {
      this.setProperty("system.activation.type", this.activationType);
      this.setProperty("system.activation.value", this.activationValue || 1);

      if (this.activationCondition) {
        this.setProperty("system.activation.condition", this.activationCondition);
      }

      ItemUtils.log("Activation set", {
        type: this.activationType,
        value: this.activationValue,
        condition: this.activationCondition
      });
    }

    // Duration
    if (this.duration) {
      if (this.duration.value !== null && this.duration.value !== undefined) {
        this.setProperty("system.duration.value", this.duration.value.toString());
      }
      if (this.duration.units) {
        this.setProperty("system.duration.units", this.duration.units);
      }
      ItemUtils.log("Duration set", this.duration);
    }

    // Range
    if (this.range) {
      if (this.range.value !== null && this.range.value !== undefined) {
        this.setProperty("system.range.value", this.range.value);
      }
      if (this.range.units) {
        this.setProperty("system.range.units", this.range.units);
      }
      ItemUtils.log("Range set", this.range);
    }

    // Target
    if (this.target) {
      if (this.target.type) {
        this.setProperty("system.target.affects.type", this.target.type);
      }
      if (this.target.count !== null) {
        this.setProperty("system.target.affects.count", this.target.count.toString());
      }
      if (this.target.choice !== undefined) {
        this.setProperty("system.target.affects.choice", this.target.choice);
      }
      if (this.target.special) {
        this.setProperty("system.target.affects.special", this.target.special);
      }
      ItemUtils.log("Target affects set", this.target);
    }

    // Area of Effect (template)
    if (this.area) {
      if (this.area.type) {
        this.setProperty("system.target.template.type", this.area.type);
      }
      if (this.area.size !== null) {
        this.setProperty("system.target.template.size", this.area.size.toString());
      }
      if (this.area.units) {
        this.setProperty("system.target.template.units", this.area.units);
      }
      if (this.area.count !== null && this.area.count !== undefined) {
        this.setProperty("system.target.template.count", this.area.count.toString());
      }
      if (this.area.width !== null && this.area.width !== undefined) {
        this.setProperty("system.target.template.width", this.area.width.toString());
      }
      if (this.area.height !== null && this.area.height !== undefined) {
        this.setProperty("system.target.template.height", this.area.height.toString());
      }
      if (this.area.contiguous !== undefined) {
        this.setProperty("system.target.template.contiguous", this.area.contiguous);
      }
      ItemUtils.log("Area template set", this.area);
    }

    // Uses (for limited-use spells like innate spellcasting)
    this.#applyUsesData("Spell");

    ItemUtils.log("Spell data build complete");
  }

  /**
   * Get cost in the appropriate display denomination
   * @returns {number} Cost value in the display denomination
   */
  getCostValue() {
    // Prioritize the explicitly parsed display value from the template.
    if (this.costDisplay !== null && this.costDisplay !== undefined) {
      return this.costDisplay;
    }

    // If for some reason costDisplay isn't set, fall back to the copper value.
    // This provides backward compatibility if other parts of the module use .cost
    if (this.cost) {
      const rate = CurrencyRates[this.costDenomination] || CurrencyRates.gp;
      const value = this.cost / rate;
      return Math.round(value * 100) / 100;
    }

    // Default to 0 if no price is set.
    return 0;
  }

  /**
   * Convert cost to gold pieces (for display/compatibility)
   */
  costInGold() {
    const displayValue = Number(this.costDisplay);
    let goldValue;
    if (this.costDisplay !== null && this.costDisplay !== undefined && Number.isFinite(displayValue)) {
      const denominationRate = CurrencyRates[this.costDenomination] || CurrencyRates.gp;
      goldValue = displayValue * denominationRate / CurrencyRates.gp;
    } else if (this.cost) {
      // Legacy cost is stored in copper pieces.
      goldValue = this.cost / CurrencyRates.gp;
    } else {
      return 0;
    }

    // Round to 2 decimal places
    return Math.round(goldValue * 100) / 100;
  }

  static async createDocumentAtDestination(itemData, destination = {}) {
    const kind = destination?.kind ?? "world";
    const source = ItemUtils.deepClone(itemData);
    let options = {};

    if (kind === "actor") {
      const actor = destination.actor ?? await fromUuid(destination.actorUuid);
      if (!actor || actor.documentName !== "Actor") throw new Error("The selected Actor destination is unavailable.");
      if (typeof actor.canUserModify === "function" && !actor.canUserModify(game.user, "update")) {
        throw new Error("You do not have permission to add Items to the selected Actor.");
      }
      delete source.folder;
      options = { parent: actor };
    } else if (kind === "compendium") {
      const pack = destination.packDocument ?? game.packs.get(destination.pack);
      const isOwner = typeof pack?.testUserPermission === "function"
        ? pack.testUserPermission(game.user, "OWNER")
        : game.user.isGM === true;
      const documentClass = pack?.documentClass ?? CONFIG.Item.documentClass;
      const canCreate = typeof documentClass?.canUserCreate === "function"
        ? documentClass.canUserCreate(game.user)
        : game.user.isGM === true;
      if (!pack || pack.documentName !== "Item" || pack.locked || !isOwner || !canCreate) {
        throw new Error("The selected Item compendium is unavailable, locked, or not writable.");
      }
      delete source.folder;
      options = { pack: pack.collection };
    } else if (destination?.folderId) {
      source.folder = destination.folderId;
    }

    const documents = await CONFIG.Item.documentClass.createDocuments([source], options);
    return Array.from(documents ?? [])[0] ?? null;
  }

  static prepareExistingItemUpdate(itemData) {
    const update = ItemUtils.deepClone(itemData);
    delete update._id;
    delete update.type;
    delete update.folder;
    delete update.effects;
    delete update.ownership;
    delete update._stats;
    if (update.system && typeof update.system === "object") {
      // Existing activities are never deleted by create/update/merge workflows.
      delete update.system.activities;
    }
    return update;
  }

  static #mergeValueIsEmpty(value) {
    return value === null
      || value === undefined
      || value === ""
      || (Array.isArray(value) && value.length === 0);
  }

  static stableSignature(value) {
    const stable = entry => {
      if (entry instanceof Set) {
        return [...entry].map(stable).sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        );
      }
      if (entry instanceof Map) {
        return Object.fromEntries([...entry.entries()]
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
          .map(([key, nested]) => [key, stable(nested)]));
      }
      if (Array.isArray(entry)) return entry.map(stable);
      if (!entry || typeof entry !== "object") return entry;
      return Object.fromEntries(Object.keys(entry).sort().map(key => [key, stable(entry[key])]));
    };
    try {
      return JSON.stringify(stable(value));
    } catch {
      return String(value);
    }
  }

  static #mergeSignature(value) {
    return ItemData.stableSignature(value);
  }

  static #conservativeMerge(existing, incoming, path, report) {
    if (incoming instanceof Set || existing instanceof Set) {
      const current = new Set(existing instanceof Set ? existing : Array.isArray(existing) ? existing : []);
      const incomingValues = incoming instanceof Set ? incoming : Array.isArray(incoming) ? incoming : [];
      const signatures = new Set([...current].map(ItemData.#mergeSignature));
      let added = 0;
      for (const value of incomingValues) {
        const signature = ItemData.#mergeSignature(value);
        if (signatures.has(signature)) continue;
        current.add(ItemUtils.deepClone(value));
        signatures.add(signature);
        added++;
      }
      if (added) report.addedPaths.push(path);
      if (current.size > added) report.preservedPaths.push(path);
      return current;
    }

    if (incoming instanceof Map || existing instanceof Map) {
      const current = new Map(existing instanceof Map
        ? [...existing.entries()].map(([key, value]) => [key, ItemUtils.deepClone(value)])
        : Object.entries(existing || {}));
      const incomingEntries = incoming instanceof Map ? incoming.entries() : Object.entries(incoming || {});
      let added = 0;
      for (const [key, value] of incomingEntries) {
        if (current.has(key)) {
          report.preservedPaths.push(path ? `${path}.${String(key)}` : String(key));
          continue;
        }
        current.set(key, ItemUtils.deepClone(value));
        report.addedPaths.push(path ? `${path}.${String(key)}` : String(key));
        added++;
      }
      if (!added && current.size) report.preservedPaths.push(path);
      return current;
    }

    if (Array.isArray(incoming)) {
      const current = Array.isArray(existing) ? ItemUtils.deepClone(existing) : [];
      const signatures = new Set(current.map(ItemData.#mergeSignature));
      let added = 0;
      for (const value of incoming) {
        const signature = ItemData.#mergeSignature(value);
        if (signatures.has(signature)) continue;
        current.push(ItemUtils.deepClone(value));
        signatures.add(signature);
        added++;
      }
      if (added > 0) report.addedPaths.push(path);
      if (Array.isArray(existing) && existing.length > 0) report.preservedPaths.push(path);
      return current;
    }

    if (incoming && typeof incoming === "object") {
      const current = existing && typeof existing === "object" && !Array.isArray(existing)
        ? ItemUtils.deepClone(existing)
        : {};
      for (const [key, value] of Object.entries(incoming)) {
        const childPath = path ? `${path}.${key}` : key;
        current[key] = ItemData.#conservativeMerge(current[key], value, childPath, report);
      }
      return current;
    }

    if (ItemData.#mergeValueIsEmpty(existing)) {
      if (!ItemData.#mergeValueIsEmpty(incoming)) report.addedPaths.push(path);
      return ItemUtils.deepClone(incoming);
    }
    if (!foundry.utils.isEmpty?.(incoming) && existing !== incoming) {
      report.preservedPaths.push(path);
    }
    return ItemUtils.deepClone(existing);
  }

  static #collectUpdatePaths(existing, incoming, path, report) {
    if (incoming instanceof Set || incoming instanceof Map) {
      const incomingValues = incoming instanceof Set ? [...incoming] : [...incoming.entries()];
      const existingValues = existing instanceof Set
        ? [...existing]
        : existing instanceof Map ? [...existing.entries()] : existing;
      if (ItemData.#mergeSignature(existingValues) !== ItemData.#mergeSignature(incomingValues)) {
        if (ItemData.#mergeValueIsEmpty(existing)) report.addedPaths.push(path);
        else report.replacedPaths.push(path);
      }
      return;
    }
    if (incoming && typeof incoming === "object") {
      for (const [key, value] of Object.entries(incoming)) {
        const childPath = path ? `${path}.${key}` : key;
        ItemData.#collectUpdatePaths(existing?.[key], value, childPath, report);
      }
      return;
    }
    if (existing === incoming) return;
    if (ItemData.#mergeValueIsEmpty(existing)) report.addedPaths.push(path);
    else report.replacedPaths.push(path);
  }

  static buildExistingOperationPlan(existingItem, itemData, operation = "update") {
    const incoming = ItemData.prepareExistingItemUpdate(itemData);
    const existing = ItemData.prepareExistingItemUpdate(existingItem?.toObject?.() ?? {});
    const report = {
      operation,
      itemUuid: existingItem?.uuid ?? null,
      itemName: existingItem?.name ?? null,
      replacedPaths: [],
      preservedPaths: ["system.activities", "effects"],
      addedPaths: []
    };

    let updateData;
    if (operation === "merge") {
      updateData = ItemData.#conservativeMerge(existing, incoming, "", report);
    } else {
      updateData = incoming;
      ItemData.#collectUpdatePaths(existing, incoming, "", report);
      const incomingHasAttunement = Object.hasOwn(incoming.system ?? {}, "attunement");
      const incomingAttunement = String(incoming.system?.attunement ?? "").trim().toLowerCase();
      const existingRequirement = existing.flags?.[MODULE_NAME]?.attunementRequirement;
      if (incomingHasAttunement
        && ["", "none", "0", "false"].includes(incomingAttunement)
        && existingRequirement) {
        updateData.flags ??= {};
        if (!updateData.flags[MODULE_NAME] || typeof updateData.flags[MODULE_NAME] !== "object") {
          updateData.flags[MODULE_NAME] = {};
        }
        updateData.flags[MODULE_NAME]["-=attunementRequirement"] = null;
        report.replacedPaths.push(`flags.${MODULE_NAME}.attunementRequirement`);
      }
    }

    for (const key of ["replacedPaths", "preservedPaths", "addedPaths"]) {
      report[key] = [...new Set(report[key].filter(Boolean))].sort();
    }
    return { updateData, report };
  }

  /**
     * Create the item in Foundry
     * @param {string|null} folderId - Optional legacy world-folder destination
     * @param {object} options - UI options and destination/update policy
     * @returns {Promise<Object>} Created item and any issues
     */
  async createItem5e(folderId = null, options = {}) {
    ItemUtils.log("State of ItemData before building", this);

    ItemUtils.log("Creating item in Foundry");

    let createdItem = null;
    let activityResults = {
      addedActivities: 0,
      addedEffects: 0,
      createdActivityIds: [],
      createdEffectIds: [],
      issues: []
    };
    const operation = ["create", "update", "merge", "skip"].includes(options.operation)
      ? options.operation
      : "create";
    const existingItem = options.existingItem ?? null;
    const cancellationRequested = () => typeof options.shouldCancel === "function" && options.shouldCancel() === true;

    if (operation === "skip" && existingItem) {
      return {
        success: true,
        skipped: true,
        operation,
        item: existingItem,
        issues: [],
        activityResults
      };
    }

    try {
      // Build Foundry data structure
      await this.buildFoundryData(options);

      // Validate
      const validation = ItemUtils.validateItemData(this.#dnd5e);
      if (!validation.valid) {
        ItemUtils.error("Item validation failed", validation.errors);
        return {
          success: false,
          item: null,
          issues: validation.errors,
          activityResults: null,
        };
      }

      // Clone data to avoid mutations
      const itemData = ItemUtils.deepClone(this.#dnd5e);

      const destination = options.destination ?? { kind: "world", folderId };
      if ((destination.kind ?? "world") === "world" && (destination.folderId || folderId)) {
        itemData.folder = destination.folderId || folderId;
      }
      if (operation === "create" && options.importSessionId) {
        ItemUtils.setProperty(itemData, `flags.${MODULE_NAME}.importSessionId`, options.importSessionId);
        ItemUtils.setProperty(itemData, `flags.${MODULE_NAME}.importedAt`, new Date().toISOString());
      }

      let preparedActivityResults = options.parsedActivityResults ?? null;
      let preParsedActivityIssues = [];
      let preParsedActivityBlockingIssues = [];
      if (this.pendingActivities.length > 0 && this.shouldReplaceGeneratedDefaultActivities()) {
        const prepared = await this.collectActivityResults(preparedActivityResults);
        if (prepared.results) {
          preparedActivityResults = prepared.results;
          preParsedActivityIssues = prepared.issues;
          preParsedActivityBlockingIssues = prepared.blockingIssues;

          const preflightIssues = preParsedActivityBlockingIssues.length > 0
            ? preParsedActivityBlockingIssues
            : await this.preflightInlineActivityPlan(
              preparedActivityResults,
              { type: itemData.type, system: itemData.system },
              { checkCapability: false }
            );
          if (preflightIssues.length === 0) {
            const successfulActivityTypes = ItemData.getSuccessfulActivityTypes(preparedActivityResults);
            if (ItemData.preventGeneratedDefaultActivity(itemData, successfulActivityTypes)) {
              const defaultType = ItemData.DEFAULT_ACTIVITY_BY_ITEM_TYPE[itemData.type];
              ItemUtils.log(`Preventing generated default ${defaultType} activity because the complete inline attachment plan passed preflight.`);
            }
          } else {
            ItemUtils.warn("Keeping the generated default activity because the inline attachment plan did not pass preflight.");
          }
        }
      }

      if ((operation === "update" || operation === "merge") && existingItem) {
        if (cancellationRequested()) {
          return {
            success: false, skipped: true, cancelled: true, operation, item: existingItem,
            issues: ["Import cancelled before persistence."], activityResults
          };
        }
        if (typeof existingItem.canUserModify === "function" && !existingItem.canUserModify(game.user, "update")) {
          throw new Error("You do not have permission to update the matching Item.");
        }
        const plan = ItemData.buildExistingOperationPlan(existingItem, itemData, operation);
        if (typeof options.confirmOperation === "function") {
          const confirmed = await options.confirmOperation(plan.report);
          if (confirmed !== true) {
            return {
              success: false, skipped: true, cancelled: true, operation, item: existingItem,
              issues: ["Duplicate operation cancelled before persistence."], activityResults
            };
          }
        }
        if (cancellationRequested()) {
          return {
            success: false, skipped: true, cancelled: true, operation, item: existingItem,
            issues: ["Import cancelled before persistence."], activityResults
          };
        }
        options.operationPlan = plan.report;
        createdItem = await existingItem.update(plan.updateData);
      } else {
        if (cancellationRequested()) {
          return {
            success: false, skipped: true, cancelled: true, operation: "create", item: null,
            issues: ["Import cancelled before persistence."], activityResults
          };
        }
        createdItem = await ItemData.createDocumentAtDestination(itemData, destination);
      }

      if (createdItem) {
        ItemUtils.log(`Item ${operation === "create" ? "created" : operation} successfully`, createdItem);

        // Apply inline activities/effects if present
        if (this.pendingActivities.length > 0) {
          if (cancellationRequested()) {
            activityResults = {
              addedActivities: 0,
              addedEffects: 0,
              createdActivityIds: [],
              createdEffectIds: [],
              issues: ItemData.dedupeInlineIssues([
                ...preParsedActivityIssues,
                "Import cancellation was requested after Item persistence; skipped inline Activities and Active Effects before their document writes."
              ])
            };
          } else {
            activityResults = await this.applyActivitiesSafely(
              createdItem,
              preparedActivityResults,
              preParsedActivityIssues,
              preParsedActivityBlockingIssues
            );
          }
          for (const issue of activityResults.issues) {
            ItemUtils.warn(`Activity/Effect issue: ${issue}`);
          }
        }

        // Build notification
        const verb = operation === "update" ? "Updated"
          : operation === "merge" ? "Merged"
            : "Created";
        const parts = [`${verb} item: ${this.name}`];
        if (activityResults.addedActivities > 0 || activityResults.addedEffects > 0) {
          const actParts = [];
          if (activityResults.addedActivities > 0) actParts.push(`${activityResults.addedActivities} activit${activityResults.addedActivities === 1 ? 'y' : 'ies'}`);
          if (activityResults.addedEffects > 0) actParts.push(`${activityResults.addedEffects} effect${activityResults.addedEffects === 1 ? '' : 's'}`);
          parts.push(`with ${actParts.join(' and ')}`);
        }
        ui.notifications.info(parts.join(' '));

        return {
          success: true,
          skipped: false,
          operation: existingItem ? operation : "create",
          item: createdItem,
          issues: activityResults.issues,
          activityResults,
          operationPlan: options.operationPlan ?? null
        };
      } else {
        ItemUtils.error("Item creation returned null");
        return {
          success: false,
          item: null,
          issues: ["Item creation failed"],
          activityResults: null,
        };
      }
    } catch (error) {
      if (createdItem) {
        ItemUtils.error("Error after Item creation", error);
        const postCreateIssue = `Item was created, but post-creation processing failed: ${error?.message || String(error)}`;
        activityResults = {
          ...activityResults,
          addedActivities: Number.isFinite(activityResults?.addedActivities) ? activityResults.addedActivities : 0,
          addedEffects: Number.isFinite(activityResults?.addedEffects) ? activityResults.addedEffects : 0,
          issues: [
            ...(Array.isArray(activityResults?.issues) ? activityResults.issues : []),
            postCreateIssue
          ]
        };
        return {
          success: true,
          skipped: false,
          operation: existingItem ? operation : "create",
          item: createdItem,
          issues: activityResults.issues,
          activityResults,
          operationPlan: options.operationPlan ?? null
        };
      }
      ItemUtils.error("Error creating item", error);
      return {
        success: false,
        item: null,
        issues: [error.message],
        activityResults: null,
      };
    }
  }

  // ─── Activity/Effect Application ──────────────────────────────────────────

  /** Default icons for each activity type */
  static ACTIVITY_DEFAULT_ICONS = {
    attack: "systems/dnd5e/icons/svg/activity/attack.svg",
    save: "systems/dnd5e/icons/svg/activity/save.svg",
    damage: "systems/dnd5e/icons/svg/activity/damage.svg",
    heal: "systems/dnd5e/icons/svg/activity/heal.svg",
    utility: "systems/dnd5e/icons/svg/activity/utility.svg",
    check: "systems/dnd5e/icons/svg/activity/check.svg",
    cast: "systems/dnd5e/icons/svg/activity/cast.svg",
    enchant: "systems/dnd5e/icons/svg/activity/enchant.svg",
    summon: "systems/dnd5e/icons/svg/activity/summon.svg",
    transform: "systems/dnd5e/icons/svg/activity/transform.svg",
    forward: "systems/dnd5e/icons/svg/activity/forward.svg",
  };

  static EFFECT_DEFAULT_ICON = "icons/svg/combat.svg";

  /** dnd5e activity schemas that intentionally discard applied-effect links. */
  static ACTIVITY_TYPES_WITHOUT_EFFECTS = new Set(["cast", "forward", "transform"]);

  static DEFAULT_ACTIVITY_BY_ITEM_TYPE = {
    weapon: "attack",
    tool: "check",
  };

  /**
   * Determine whether the module should suppress dnd5e's generated baseline
   * activity when an inline activity supplies the same primary activity type.
   *
   * @returns {boolean}
   */
  shouldReplaceGeneratedDefaultActivities() {
    try {
      return game.settings.get(MODULE_NAME, "replaceGeneratedDefaultActivities");
    } catch (error) {
      return true;
    }
  }

  /**
   * Collect successful activity types from Activity Importer parse results.
   *
   * @param {Array<object>|null} results - Activity Importer parse results
   * @returns {Set<string>}
   */
  static getSuccessfulActivityTypes(results) {
    return new Set(
      (Array.isArray(results) ? results : [])
        .filter(result => result?.success && result.resultType !== "effect" && result.activityType)
        .map(result => result.activityType)
    );
  }

  /** Return unique, non-empty issue strings while preserving their order. */
  static dedupeInlineIssues(issues) {
    return [...new Set((issues || []).filter(Boolean).map(issue => String(issue)))];
  }

  /** Preserve parser warnings, including warnings on embedded effect results. */
  static collectInlineResultWarnings(results) {
    const issues = [];
    const addWarnings = (label, warnings) => {
      for (const warning of Array.isArray(warnings) ? warnings : []) {
        if (warning != null && String(warning).trim()) issues.push(`${label}: ${String(warning).trim()}`);
      }
    };

    for (const result of Array.isArray(results) ? results : []) {
      const label = result?.activityData?.name
        || result?.effectData?.name
        || result?.activityType
        || "Inline attachment";
      addWarnings(label, result?.warnings);
      for (const [index, embedded] of (result?.embeddedEffectResults || []).entries()) {
        const embeddedLabel = embedded?.effectData?.name || `${label} applied effect ${index + 1}`;
        addWarnings(embeddedLabel, embedded?.warnings);
      }
    }
    return ItemData.dedupeInlineIssues(issues);
  }

  /**
   * Check whether a generated dnd5e baseline should be suppressed.
   *
   * @param {string} itemType - Foundry item type
   * @param {Set<string>} parsedActivityTypes - Successfully parsed inline activity types
   * @returns {boolean}
   */
  static shouldSuppressGeneratedDefaultActivity(itemType, parsedActivityTypes) {
    const defaultType = ItemData.DEFAULT_ACTIVITY_BY_ITEM_TYPE[itemType];
    return !!defaultType && !!parsedActivityTypes?.has?.(defaultType);
  }

  /**
   * Mark item source data as current dnd5e data before document creation.
   * dnd5e creates generated weapon/tool activities as a migration for
   * legacy-looking item data; setting the current system version prevents that
   * migration without sending null deletion markers through ActivityField.
   *
   * @param {object} itemData - Candidate item source data
   * @returns {object}
   */
  static markAsCurrentDnd5eSource(itemData) {
    itemData._stats = {
      ...(itemData._stats ?? {}),
      coreVersion: game.version,
      systemId: game.system.id,
      systemVersion: game.system.version
    };
    itemData.system ??= {};
    itemData.system.activities ??= {};
    return itemData;
  }

  /**
   * Suppress dnd5e's generated baseline activity when inline activity data is
   * already replacing that primary activity.
   *
   * @param {object} itemData - Candidate item source data
   * @param {Set<string>} parsedActivityTypes - Successfully parsed inline activity types
   * @returns {boolean} True if source data was marked to skip baseline generation
   */
  static preventGeneratedDefaultActivity(itemData, parsedActivityTypes) {
    if (!ItemData.shouldSuppressGeneratedDefaultActivity(itemData?.type, parsedActivityTypes)) return false;
    ItemData.markAsCurrentDnd5eSource(itemData);
    return true;
  }

  /**
   * Check if an icon path resolves to an actual file.
   * If not, replace with the fallback.
   * @param {Object} data - Activity or effect data (mutated in place)
   * @param {string} fallback - Path to use when the current icon is missing
   */
  async applyIconFallback(data, fallback) {
    if (!data) return;
    if (!data.img) {
      data.img = fallback;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(data.img, {
        method: "HEAD",
        signal: controller.signal,
      });
      if (response.status === 404 || response.status === 410) data.img = fallback;
    } catch {
      // A timeout, CORS failure, or other network error does not prove the icon is missing.
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Preserve a resolvable explicit origin; otherwise bind the effect to its Item. */
  async normalizeEffectOrigin(effectData, createdItem) {
    if (!effectData) return;
    const explicitOrigin = typeof effectData.origin === "string" ? effectData.origin.trim() : "";
    if (explicitOrigin && typeof globalThis.fromUuid === "function") {
      try {
        if (await globalThis.fromUuid(explicitOrigin)) return;
      } catch {
        // Invalid or inaccessible origins fall back to the owning Item.
      }
    }
    effectData.origin = createdItem.uuid;
  }

  /**
   * Parse pending inline activities and effects using Activity Importer.
   *
   * @param {Array<Object>|null} [parsedResults=null] - Pre-parsed activity results with resolved UUIDs
   * @returns {Promise<{results: Array<Object>|null, issues: string[], blockingIssues: string[]}>}
   */
  async collectActivityResults(parsedResults = null) {
    const hasPendingSource = Array.isArray(this.pendingActivities);
    const pendingActivities = hasPendingSource ? this.pendingActivities : [];
    if (Array.isArray(parsedResults) && parsedResults.length > 0) {
      if (hasPendingSource && parsedResults.length !== pendingActivities.length) {
        const issue = `Pre-parsed attachment count (${parsedResults.length}) does not match the Item attachment count (${pendingActivities.length}).`;
        return { results: null, issues: [issue], blockingIssues: [issue] };
      }
      const comparableRawData = value => {
        if (Array.isArray(value)) return value.map(comparableRawData);
        if (!value || typeof value !== "object") return value;
        return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
          key,
          ["Item UUID", "Actor UUID"].includes(key) ? "<resolved-uuid>" : comparableRawData(nested)
        ]));
      };
      const mismatched = parsedResults.findIndex((result, index) => {
        const rawData = result?.rawData ?? result?._itemImporterRawData;
        if (!rawData) return false;
        const pendingRawData = pendingActivities[index]?.rawData;
        return ItemData.stableSignature(comparableRawData(rawData))
          !== ItemData.stableSignature(comparableRawData(pendingRawData));
      });
      if (mismatched >= 0) {
        const issue = `Pre-parsed attachment ${mismatched + 1} does not match its strict Item source block outside resolvable UUID fields.`;
        return { results: null, issues: [issue], blockingIssues: [issue] };
      }
      const decorated = parsedResults.map((result, index) => {
        const rawData = result?.rawData ?? result?._itemImporterRawData ?? pendingActivities[index]?.rawData ?? null;
        if (result?.rawData && pendingActivities[index]) {
          pendingActivities[index].rawData = ItemUtils.deepClone(result.rawData);
        }
        return { ...result, _itemImporterRawData: rawData };
      });
      return {
        results: decorated,
        issues: ItemData.collectInlineResultWarnings(parsedResults),
        blockingIssues: []
      };
    }

    const issues = [];
    const blockingIssues = [];
    const activityImporter = game.modules.get("5e-activity-importer");
    if (!activityImporter?.active) {
      const issue = "5e-activity-importer module is not active. Skipping inline activities/effects.";
      issues.push(issue);
      blockingIssues.push(issue);
      return { results: null, issues, blockingIssues };
    }

    const parseAll = activityImporter.api?.parseAll;
    const parse = activityImporter.api?.parse;
    if (typeof parseAll !== "function" && typeof parse !== "function") {
      const issue = "5e-activity-importer does not expose a compatible parse API. Skipping inline activities/effects.";
      issues.push(issue);
      blockingIssues.push(issue);
      return { results: null, issues, blockingIssues };
    }

    const allResults = [];
    for (const pending of pendingActivities) {
      try {
        const yamlText = jsyaml.dump(pending.rawData);
        const parsed = typeof parseAll === "function"
          ? await parseAll(yamlText)
          : await parse(yamlText);
        const results = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        if (results.length === 0) {
          const issue = `No activity result was returned for ${pending.name || pending.key}.`;
          issues.push(issue);
          blockingIssues.push(issue);
          continue;
        }
        for (const result of results) {
          if (!result.success) {
            issues.push(`Failed to parse ${pending.name || pending.key}: ${result.errors?.join(", ") || "Unknown error"}`);
          }
          allResults.push({
            ...result,
            _itemImporterRawData: result?.rawData ?? pending.rawData
          });
        }
      } catch (err) {
        const issue = `Error parsing ${pending.name || pending.key}: ${err.message}`;
        issues.push(issue);
        blockingIssues.push(issue);
      }
    }

    issues.push(...ItemData.collectInlineResultWarnings(allResults));
    return {
      results: allResults,
      issues: ItemData.dedupeInlineIssues(issues),
      blockingIssues: ItemData.dedupeInlineIssues(blockingIssues)
    };
  }

  /**
   * Keep attachment integration soft after the base Item has been persisted.
   * An unexpected attachment exception must not report the already-created Item
   * as a failed creation, which could cause a retry to create a duplicate.
   */
  async applyActivitiesSafely(
    createdItem,
    parsedResults = null,
    inheritedIssues = [],
    inheritedBlockingIssues = []
  ) {
    if (inheritedBlockingIssues.length > 0) {
      return {
        addedActivities: 0,
        addedEffects: 0,
        createdActivityIds: [],
        createdEffectIds: [],
        issues: ItemData.dedupeInlineIssues([
          ...inheritedIssues,
          "Skipped the entire inline attachment batch because one or more attachments could not be parsed."
        ])
      };
    }
    try {
      const result = await this.applyActivities(createdItem, parsedResults);
      return {
        ...result,
        issues: ItemData.dedupeInlineIssues([
          ...inheritedIssues,
          ...(Array.isArray(result?.issues) ? result.issues : [])
        ])
      };
    } catch (error) {
      ItemUtils.error("Unexpected error applying inline attachments after Item creation", error);
      return {
        addedActivities: 0,
        addedEffects: 0,
        createdActivityIds: [],
        createdEffectIds: [],
        issues: ItemData.dedupeInlineIssues([
          ...inheritedIssues,
          `Item was created, but inline attachment processing failed unexpectedly: ${error?.message || String(error)}`
        ])
      };
    }
  }

  /**
   * Validate cross-document references used by programmatic/direct imports.
   * UUIDs are resolved when Foundry exposes fromUuid; local Forward targets are
   * valid when they already exist on the Item or are planned in this batch.
   */
  async validateInlineActivityReferences(results, createdItem, resolveUuid = globalThis.fromUuid) {
    const issues = [];
    const activityResults = (Array.isArray(results) ? results : [])
      .filter(result => result?.success && result.resultType !== "effect" && result.activityData);
    const plannedActivityIds = new Set(
      activityResults
        .map(result => result.activityData?._id)
        .filter(id => typeof id === "string" && id.trim())
        .map(id => id.trim())
    );
    const uuidResolver = typeof resolveUuid === "function"
      ? uuid => resolveUuid.call(globalThis, uuid)
      : null;
    const resolutionCache = new Map();
    const resolveDocument = async uuid => {
      if (!uuidResolver) return undefined;
      if (!resolutionCache.has(uuid)) {
        resolutionCache.set(uuid, Promise.resolve().then(() => uuidResolver(uuid)).catch(() => null));
      }
      return resolutionCache.get(uuid);
    };

    const existingActivities = createdItem.system?.activities;
    const hasExistingActivity = id => {
      if (typeof existingActivities?.has === "function") return existingActivities.has(id);
      if (typeof existingActivities?.get === "function") return !!existingActivities.get(id);
      return !!existingActivities
        && typeof existingActivities === "object"
        && Object.prototype.hasOwnProperty.call(existingActivities, id);
    };

    for (const result of activityResults) {
      const { activityType, activityData } = result;
      const label = activityData.name || activityType || "Inline activity";

      if (activityType === "cast") {
        const uuid = typeof activityData.spell?.uuid === "string" ? activityData.spell.uuid.trim() : "";
        if (!uuid) {
          issues.push(`${label} requires a spell Item UUID.`);
        } else if (uuidResolver) {
          const spell = await resolveDocument(uuid);
          if (!spell || spell.documentName !== "Item" || spell.type !== "spell") {
            issues.push(`${label} has a UUID that does not resolve to a spell Item.`);
          }
        }
      }

      if (activityType === "summon" || activityType === "transform") {
        const mode = activityType === "summon"
          ? activityData.summon?.mode
          : activityData.transform?.mode;
        if (mode !== "cr") {
          const profiles = Array.isArray(activityData.profiles) ? activityData.profiles : [];
          if (profiles.length === 0) {
            issues.push(`${label} direct-link mode requires at least one Actor profile.`);
          }
          for (const [index, profile] of profiles.entries()) {
            const uuid = typeof profile?.uuid === "string" ? profile.uuid.trim() : "";
            if (!uuid) {
              issues.push(`${label} profile ${index + 1} requires an Actor UUID.`);
            } else if (uuidResolver) {
              const actor = await resolveDocument(uuid);
              if (!actor || actor.documentName !== "Actor") {
                issues.push(`${label} profile ${index + 1} has a UUID that does not resolve to an Actor.`);
              }
            }
          }
        }
      }

      if (activityType === "forward") {
        const targetId = typeof activityData.activity?.id === "string"
          ? activityData.activity.id.trim()
          : "";
        if (!targetId) {
          issues.push(`${label} requires a target activity ID.`);
        } else if (!hasExistingActivity(targetId) && !plannedActivityIds.has(targetId)) {
          issues.push(`${label} targets activity ID "${targetId}", which is not on the Item or in this inline batch.`);
        }
      }
    }

    return issues;
  }

  static inlineAttachmentSignature(rawData) {
    return ItemData.stableSignature(rawData ?? null);
  }

  existingInlineAttachmentSignatures(item) {
    const documents = [
      ...Array.from(item?.system?.activities?.values?.() ?? item?.system?.activities ?? []),
      ...Array.from(item?.effects?.values?.() ?? item?.effects ?? [])
    ];
    return new Set(documents.map(document =>
      document?.getFlag?.(MODULE_NAME, "strictYaml")
        ?? document?.flags?.[MODULE_NAME]?.strictYaml
        ?? null
    ).filter(Boolean).map(ItemData.inlineAttachmentSignature));
  }

  /** Validate the complete attachment plan before any embedded documents are created. */
  async preflightInlineActivityPlan(
    allResults,
    itemContext,
    { checkCapability = true, resolveUuid = globalThis.fromUuid } = {}
  ) {
    const preflightIssues = [];
    const results = Array.isArray(allResults) ? allResults : [];
    const hasActivityResults = results.some(result => result && result.resultType !== "effect");
    const itemSupportsActivities = itemContext?.system?.activities != null
      && typeof itemContext?.createActivity === "function";
    if (checkCapability && hasActivityResults && !itemSupportsActivities) {
      preflightIssues.push(
        `${itemContext?.type || "This Item"} does not support dnd5e activities; skipped the entire inline attachment batch before creating any activities or effects.`
      );
    }

    for (const result of results) {
      if (!result?.success) {
        preflightIssues.push(`Failed to parse inline attachment: ${(result?.errors || []).join(", ") || "Unknown parse error"}`);
        continue;
      }
      if (result.resultType === "effect") {
        if (!result.effectData) preflightIssues.push("A standalone inline effect is missing effect data.");
        continue;
      }
      if (!result.activityType || !result.activityData) {
        preflightIssues.push("An inline activity is missing its type or activity data.");
        continue;
      }

      if (result.embeddedEffectResults != null && !Array.isArray(result.embeddedEffectResults)) {
        preflightIssues.push(`${result.activityData.name || result.activityType} has malformed embedded effect results.`);
        continue;
      }
      const embeddedResults = result.embeddedEffectResults || [];
      const invalidEmbedded = embeddedResults.filter(effect => !effect?.success || !effect.effectData);
      if (invalidEmbedded.length > 0) {
        preflightIssues.push(`${result.activityData.name || result.activityType} has ${invalidEmbedded.length} invalid embedded effect result(s).`);
      }
      if (embeddedResults.length > 0 && ItemData.ACTIVITY_TYPES_WITHOUT_EFFECTS.has(result.activityType)) {
        preflightIssues.push(`${result.activityType} activities do not support applied effects in the current dnd5e schema.`);
      }
    }

    if (preflightIssues.length === 0) {
      preflightIssues.push(...await this.validateInlineActivityReferences(results, itemContext, resolveUuid));
    }
    return preflightIssues;
  }

  /** Collect document IDs from Foundry Collections and collection-like test doubles. */
  static collectInlineDocumentIds(collection) {
    if (!collection) return [];
    if (typeof collection.keys === "function") return Array.from(collection.keys()).filter(Boolean);
    const documents = Array.isArray(collection)
      ? collection
      : (Array.isArray(collection.contents) ? collection.contents : []);
    return documents.map(document => document?.id ?? document?._id).filter(Boolean);
  }

  /** Allocate a collision-free embedded-document ID, preserving a usable requested ID. */
  static allocateInlineDocumentId(requestedId, reservedIds) {
    const requested = typeof requestedId === "string" ? requestedId.trim() : "";
    if (requested && !reservedIds.has(requested)) {
      reservedIds.add(requested);
      return requested;
    }

    for (let attempt = 0; attempt < 1000; attempt++) {
      const generated = globalThis.foundry?.utils?.randomID?.()
        || globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 16)
        || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 16);
      if (generated && !reservedIds.has(generated)) {
        reservedIds.add(generated);
        return generated;
      }
    }
    throw new Error("Could not allocate a collision-free inline document ID.");
  }

  /** Clone the validated plan and preallocate IDs needed for reliable rollback. */
  prepareInlineAttachmentPlan(results, createdItem) {
    const existingActivityIds = new Set(
      ItemData.collectInlineDocumentIds(createdItem.system?.activities)
    );
    const reservedActivityIds = new Set(existingActivityIds);
    const existingEffectIds = new Set(
      ItemData.collectInlineDocumentIds(createdItem.effects)
    );
    const reservedEffectIds = new Set(existingEffectIds);
    const requestedActivityIds = new Set();
    const requestedEffectIds = new Set();

    return results.map(source => {
      const result = {
        ...source,
        activityData: source.activityData ? ItemUtils.deepClone(source.activityData) : null,
        effectData: source.effectData ? ItemUtils.deepClone(source.effectData) : null,
        embeddedEffectResults: (source.embeddedEffectResults || []).map(embedded => ({
          ...embedded,
          effectData: embedded.effectData ? ItemUtils.deepClone(embedded.effectData) : null
        }))
      };

      if (result.activityData) {
        const requestedId = typeof result.activityData._id === "string"
          ? result.activityData._id.trim()
          : "";
        if (requestedId && existingActivityIds.has(requestedId)) {
          throw new Error(`Inline Activity ID "${requestedId}" collides with an existing Activity; the attachment batch was not created.`);
        }
        if (requestedId && requestedActivityIds.has(requestedId)) {
          throw new Error(`Inline Activity ID "${requestedId}" is duplicated in this import batch; the attachment batch was not created.`);
        }
        if (requestedId) requestedActivityIds.add(requestedId);
        result.activityData._id = ItemData.allocateInlineDocumentId(
          result.activityData._id,
          reservedActivityIds
        );
        for (const profile of result.activityData.profiles || []) delete profile.actorName;
      }
      for (const effectData of [
        result.effectData,
        ...result.embeddedEffectResults.map(embedded => embedded.effectData)
      ].filter(Boolean)) {
        const requestedId = typeof effectData._id === "string" ? effectData._id.trim() : "";
        if (requestedId && existingEffectIds.has(requestedId)) {
          throw new Error(`Inline Active Effect ID "${requestedId}" collides with an existing Active Effect; the attachment batch was not created.`);
        }
        if (requestedId && requestedEffectIds.has(requestedId)) {
          throw new Error(`Inline Active Effect ID "${requestedId}" is duplicated in this import batch; the attachment batch was not created.`);
        }
        if (requestedId) requestedEffectIds.add(requestedId);
        effectData._id = ItemData.allocateInlineDocumentId(effectData._id, reservedEffectIds);
      }
      return result;
    });
  }

  /** Record preallocated or returned IDs once without losing transaction order. */
  recordInlineDocumentIds(destination, ids) {
    for (const id of ids) {
      if (id && !destination.includes(id)) destination.push(id);
    }
  }

  /** Track any preallocated effect payloads that Foundry has already persisted. */
  trackExistingInlineEffectIds(createdItem, effectPayloads, destination) {
    for (const effectData of effectPayloads) {
      const id = effectData?._id;
      if (id && createdItem.effects?.has?.(id)) this.recordInlineDocumentIds(destination, [id]);
    }
  }

  /** Roll back only documents created by the current inline attachment batch. */
  async rollbackInlineDocuments(createdItem, activityIds, effectIds) {
    const failures = [];
    const uniqueActivityIds = [...new Set(activityIds)].reverse();
    for (const id of uniqueActivityIds) {
      try {
        const activitiesBefore = createdItem.system?.activities;
        if (typeof activitiesBefore?.has !== "function" || activitiesBefore.has(id)) {
          await createdItem.deleteActivity(id);
        }
        const activitiesAfter = createdItem.system?.activities;
        if (typeof activitiesAfter?.has === "function" && activitiesAfter.has(id)) {
          throw new Error("activity still exists after rollback deletion");
        }
      } catch (error) {
        const activitiesAfterError = createdItem.system?.activities;
        if (typeof activitiesAfterError?.has !== "function" || activitiesAfterError.has(id)) {
          failures.push({ type: "activity", id, error: error.message });
        }
      }
    }

    const uniqueEffectIds = [...new Set(effectIds)];
    const effectsToDelete = uniqueEffectIds.filter(id => {
      const effects = createdItem.effects;
      return typeof effects?.has !== "function" || effects.has(id);
    });
    if (effectsToDelete.length > 0) {
      try {
        await createdItem.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
        const remaining = effectsToDelete.filter(id => createdItem.effects?.has?.(id));
        if (remaining.length > 0) {
          failures.push({ type: "effect", ids: remaining, error: "effect still exists after rollback deletion" });
        }
      } catch (error) {
        const remaining = effectsToDelete.filter(id => {
          const effects = createdItem.effects;
          return typeof effects?.has !== "function" || effects.has(id);
        });
        if (remaining.length > 0) failures.push({ type: "effect", ids: remaining, error: error.message });
      }
    }

    return failures;
  }

  async applyStrictYamlAttachmentFlags(data, rawData) {
    if (!data || !rawData) return;
    try {
      const core = await import("./itemCoreFeatures.js");
      if (typeof core.createStrictYamlAttachmentFlags !== "function") return;
      const strictFlags = core.createStrictYamlAttachmentFlags(rawData);
      if (!strictFlags || typeof strictFlags !== "object") return;
      data.flags = foundry.utils.mergeObject(data.flags || {}, strictFlags, {
        inplace: false,
        recursive: true
      });
    } catch (error) {
      ItemUtils.warn(`Could not preserve strict YAML attachment provenance: ${error?.message || error}`);
    }
  }

  /**
   * Apply inline activities and effects to a created Foundry item.
   * If pre-parsed results (with resolved UUIDs) are provided, uses those directly.
   * Otherwise uses the public parser API from the 5e-activity-importer module.
   *
   * @param {Object} createdItem - The created Foundry Item document
   * @param {Array<Object>|null} [parsedResults=null] - Pre-parsed activity results with resolved UUIDs
   * @returns {Promise<Object>} { addedActivities, addedEffects, issues }
   */
  async applyActivities(createdItem, parsedResults = null) {
    const issues = [];
    let addedActivities = 0;
    let addedEffects = 0;
    const createdActivityIds = [];
    const createdEffectIds = [];

    const prepared = await this.collectActivityResults(parsedResults);
    issues.push(...prepared.issues);
    if (!prepared.results || prepared.blockingIssues.length > 0) {
      if (prepared.results && prepared.blockingIssues.length > 0) {
        issues.push("Skipped the entire inline attachment batch because one or more attachments could not be parsed.");
      }
      return { addedActivities, addedEffects, createdActivityIds, createdEffectIds, issues };
    }

    const allResults = prepared.results;
    const existingSignatures = this.existingInlineAttachmentSignatures(createdItem);
    const missingResults = allResults.filter(result => {
      const rawData = result?._itemImporterRawData ?? result?.rawData;
      return !rawData || !existingSignatures.has(ItemData.inlineAttachmentSignature(rawData));
    });
    const duplicateCount = allResults.length - missingResults.length;
    if (duplicateCount > 0) {
      issues.push(`Skipped ${duplicateCount} inline attachment${duplicateCount === 1 ? "" : "s"} already present on the Item.`);
    }
    if (missingResults.length === 0) {
      return { addedActivities, addedEffects, createdActivityIds, createdEffectIds, issues };
    }

    // A partially valid batch is more dangerous than a skipped soft integration.
    const preflightIssues = await this.preflightInlineActivityPlan(missingResults, createdItem);
    if (preflightIssues.length > 0) {
      issues.push(...preflightIssues);
      return { addedActivities, addedEffects, createdActivityIds, createdEffectIds, issues };
    }

    const importPlan = this.prepareInlineAttachmentPlan(missingResults, createdItem);

    // Apply each parsed result to the created item
    for (const result of importPlan) {
      try {
        if (result.resultType === "effect") {
          const effectData = result.effectData;
          await this.applyStrictYamlAttachmentFlags(effectData, result._itemImporterRawData ?? result.rawData);
          await this.normalizeEffectOrigin(effectData, createdItem);
          await this.applyIconFallback(effectData, ItemData.EFFECT_DEFAULT_ICON);
          ItemUtils.log("Adding inline effect to item:", createdItem.name, effectData);
          const effectSources = [effectData];
          const payloadIds = effectSources.map(effect => effect._id);
          this.recordInlineDocumentIds(createdEffectIds, payloadIds);
          this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
          let createdEffects;
          try {
            createdEffects = await createdItem.createEmbeddedDocuments(
              "ActiveEffect",
              effectSources,
              { keepId: true }
            );
          } catch (error) {
            this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
            throw error;
          }
          this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
          const returnedIds = Array.isArray(createdEffects)
            ? createdEffects.map(effect => effect?.id).filter(Boolean)
            : [];
          this.recordInlineDocumentIds(createdEffectIds, returnedIds);
          const payloadPersisted = payloadIds.every(id => createdItem.effects?.has?.(id) !== false);
          if (!Array.isArray(createdEffects)
            || createdEffects.length !== 1
            || returnedIds.length !== 1
            || !returnedIds.includes(effectData._id)
            || !payloadPersisted) {
            throw new Error("Foundry did not return the required standalone effect document");
          }
          addedEffects++;
        } else {
          const { activityType } = result;
          const activityData = result.activityData;

          const fallbackIcon = ItemData.ACTIVITY_DEFAULT_ICONS[activityType] ?? ItemData.ACTIVITY_DEFAULT_ICONS.utility;
          await this.applyIconFallback(activityData, fallbackIcon);

          // Handle embedded effects (APPLIED_EFFECTS within the activity)
          const embeddedEffects = (result.embeddedEffectResults || []).filter(er => er.success && er.effectData);
          const effectsToCreate = embeddedEffects;

          let createdEffects = [];
          if (effectsToCreate.length > 0) {
            ItemUtils.log(`Creating ${effectsToCreate.length} embedded effect(s) for activity...`);
            const effectSources = effectsToCreate.map(er => er.effectData);
            for (const embedded of effectsToCreate) {
              if (embedded.rawData) await this.applyStrictYamlAttachmentFlags(embedded.effectData, embedded.rawData);
            }
            for (const effectData of effectSources) {
              if (activityType === "enchant") effectData.type = "enchantment";
              await this.normalizeEffectOrigin(effectData, createdItem);
              await this.applyIconFallback(effectData, ItemData.EFFECT_DEFAULT_ICON);
            }
            const payloadIds = effectSources.map(effect => effect._id);
            this.recordInlineDocumentIds(createdEffectIds, payloadIds);
            this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
            try {
              createdEffects = await createdItem.createEmbeddedDocuments(
                "ActiveEffect",
                effectSources,
                { keepId: true }
              );
            } catch (error) {
              this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
              throw error;
            }
            this.trackExistingInlineEffectIds(createdItem, effectSources, createdEffectIds);
            const returnedIds = Array.isArray(createdEffects)
              ? createdEffects.map(effect => effect?.id).filter(Boolean)
              : [];
            this.recordInlineDocumentIds(createdEffectIds, returnedIds);
            const payloadPersisted = payloadIds.every(id => createdItem.effects?.has?.(id) !== false);
            if (!Array.isArray(createdEffects)
              || createdEffects.length !== effectSources.length
              || returnedIds.length !== effectSources.length
              || !payloadIds.every(id => returnedIds.includes(id))
              || !payloadPersisted) {
              throw new Error(`Created ${returnedIds.length} of ${effectSources.length} required embedded effects`);
            }
            activityData.effects = payloadIds.map((id, index) => ({
              _id: id,
              ...(effectsToCreate[index]?.applicationData || {})
            }));
            ItemUtils.log("Linked effect IDs to activity:", activityData.effects);
          }

          await this.applyStrictYamlAttachmentFlags(activityData, result._itemImporterRawData ?? result.rawData);
          ItemUtils.log("Adding inline activity to item:", createdItem.name, activityType, activityData);
          const activityId = activityData._id;
          this.recordInlineDocumentIds(createdActivityIds, [activityId]);
          await createdItem.createActivity(activityType, activityData, { renderSheet: false });
          if (typeof createdItem.system.activities?.has !== "function"
            || !createdItem.system.activities.has(activityId)) {
            throw new Error("dnd5e did not create the required activity document");
          }
          addedActivities++;
          addedEffects += effectsToCreate.length;
        }
      } catch (err) {
        issues.push(`Error applying activity: ${err.message}`);
        const rollbackFailures = await this.rollbackInlineDocuments(
          createdItem,
          createdActivityIds,
          createdEffectIds
        );
        if (rollbackFailures.length > 0) {
          const details = rollbackFailures.map(failure => {
            const ids = failure.id ?? failure.ids?.join(", ") ?? "unknown";
            return `${failure.type} ${ids}: ${failure.error}`;
          });
          issues.push(`Inline attachment rollback was incomplete: ${details.join("; ")}`);
          const failedActivityIds = new Set(
            rollbackFailures.filter(failure => failure.type === "activity").map(failure => failure.id)
          );
          const failedEffectIds = new Set(
            rollbackFailures
              .filter(failure => failure.type === "effect")
              .flatMap(failure => failure.ids || [])
          );
          addedActivities = failedActivityIds.size;
          addedEffects = failedEffectIds.size;
        } else {
          if (createdActivityIds.length > 0 || createdEffectIds.length > 0) {
            issues.push("Inline attachment creation failed; all documents created by this inline batch were rolled back.");
          }
          addedActivities = 0;
          addedEffects = 0;
        }
        break;
      }
    }

    if (addedActivities > 0 || addedEffects > 0) {
      const parts = [];
      if (addedActivities > 0) parts.push(`${addedActivities} activit${addedActivities === 1 ? 'y' : 'ies'}`);
      if (addedEffects > 0) parts.push(`${addedEffects} effect${addedEffects === 1 ? '' : 's'}`);
      ItemUtils.log(`Applied ${parts.join(' and ')} to ${createdItem.name}`);
    }

    return { addedActivities, addedEffects, createdActivityIds, createdEffectIds, issues };
  }

  /**
   * Export item data for debugging
   */
  toJSON() {
    const json = {
      name: this.name,
      type: this.type,
      rarity: this.rarity,
      cost: this.costInGold(),
      weight: this.weight,
      description: this.description,
      properties: {
        weaponType: this.weaponType,
        armorType: this.armorType,
        consumableType: this.consumableType,
        damage: this.damage,
        armorClass: this.armorClass,
        range: this.range,
        properties: this.properties,
        recovery: this.recovery,
        attunement: this.attunement,
        attunementRequirement: this.attunementRequirement,
        magicBonus: this.magicBonus,
      },
      foundryData: this.#dnd5e,
    };
    if (this.type === "spell") {
      delete json.rarity;
      delete json.cost;
      delete json.weight;
      delete json.properties.attunement;
      delete json.properties.attunementRequirement;
    }
    return json;
  }
}
