/**
 * 5e Item Importer - Item Data Model
 * Represents parsed item data and transforms it to Foundry V13 format
 */

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
} from "./iconSemantics.js";

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
    this.proficient = 1; // Proficiency level (0=not proficient, 1=proficient)

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
    this.volumeCapacityUnits = "ft"; // ft (cubic feet) or l (liters) - dnd5e system values
    this.itemCapacity = null; // Item count capacity
    this.weightlessContents = false; // Weightless contents property

    // Activation
    this.activationType = null; // action, bonus, reaction, special
    this.saveDC = null; // DC for saving throw
    this.saveAbility = null; // Ability for saving throw

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
    return foundry.utils.setProperty(this.#dnd5e, path, value);
  }

  /**
   * Get a property from the Foundry item data
   */
  getProperty(path) {
    return foundry.utils.getProperty(this.#dnd5e, path);
  }

  /**
   * Transform parsed data to Foundry V13 item structure
   */
  async buildFoundryData() {
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
        quantity: this.quantity,
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
    }

    // Attunement - Uses the string directly ("required", "optional", or "")
    if (this.attunement === "none") {
      this.setProperty("system.attunement", "");
    } else {
      this.setProperty("system.attunement", this.attunement || "");
    }

    // Try to find matching icon using priority: Semantic → Compendium → System
    let icon = null;

    // 1. First try semantic random icons (if enabled)
    switch (this.type) {
      case "weapon":
        icon = await getRandomWeaponIcon(
          this.baseWeapon,
          this.weaponType,
          this.name
        );
        break;
      case "equipment":
        icon = await getRandomEquipmentIcon(
          this.baseEquipment,
          this.armorType,
          this.name
        );
        break;
      case "consumable":
        icon = await getRandomConsumableIcon(
          this.consumableType,
          this.ammunitionType,
          this.poisonType,
          this.name
        );
        break;
      case "tool":
        icon = await getRandomToolIcon(
          this.toolType,
          this.baseToolItem,
          this.name
        );
        break;
      case "container":
        icon = await getRandomContainerIcon(this.name);
        break;
      case "loot":
        icon = await getRandomLootIcon(this.lootType, this.name);
        break;
    }

    // 2. Fall back to compendium search (if enabled and no semantic icon found)
    if (!icon && game.settings.get(MODULE_NAME, "matchIcons")) {
      icon = await ItemUtils.getImgFromPackItemAsync(this.name, this.type);

      if (icon) {
        ItemUtils.log("Found compendium icon:", icon);
      }
    }

    // 3. Fall back to system icon search
    if (!icon && game.settings.get(MODULE_NAME, "matchIcons")) {
      icon = await ItemUtils.findSystemIcon(this.name, this.type);

      if (icon) {
        ItemUtils.log("Found system icon:", icon);
      }
    }

    // Apply found icon
    if (icon) {
      this.#dnd5e.img = icon;
    }

    ItemUtils.log("Foundry data built", this.#dnd5e);
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

        // Ensure types is always an array
        const types = Array.isArray(this.damage.type)
          ? this.damage.type
          : [this.damage.type];

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
      this.setProperty("system.bonus", this.magicBonus.toString());
      ItemUtils.log("Magic bonus set to", this.magicBonus);
    }

    // Proficiency
    if (this.proficient !== null && this.proficient !== undefined) {
      this.setProperty("system.proficient", this.proficient);
      ItemUtils.log("Proficiency set to", this.proficient);
    }

    // Uses (for limited-use magical weapons)
    if (this.uses) {
      this.setProperty("system.uses.spent", 0);
      this.setProperty("system.uses.max", this.uses.max.toString());

      // Set current value as spent
      if (this.uses.value !== undefined) {
        const spent = this.uses.max - this.uses.value;
        this.setProperty("system.uses.spent", spent);
      }

      ItemUtils.log("Weapon uses set to", this.uses);

      // Set recovery configurations
      if (this.recovery && this.recovery.length > 0) {
        const recoveryArray = this.recovery.map((rec) => {
          const recoveryConfig = {
            period: rec.period,
            type: rec.type,
          };

          // Add formula if type is formula
          if (rec.type === "formula" && rec.formula) {
            recoveryConfig.formula = rec.formula;
          }

          return recoveryConfig;
        });

        this.setProperty("system.uses.recovery", recoveryArray);
        ItemUtils.log("Weapon recovery set to", recoveryArray);
      }
    }

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
      const props = this.getProperty("system.properties") ?? {};
      props.mgc = true;
      this.setProperty("system.properties", props);
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
    if (this.uses) {
      this.setProperty("system.uses.spent", 0);
      this.setProperty("system.uses.max", this.uses.max.toString());

      // Set current value as spent
      if (this.uses.value !== undefined) {
        const spent = this.uses.max - this.uses.value;
        this.setProperty("system.uses.spent", spent);
      }

      ItemUtils.log("Equipment uses set to", this.uses);

      // Set recovery configurations
      if (this.recovery && this.recovery.length > 0) {
        const recoveryArray = this.recovery.map((rec) => {
          const recoveryConfig = {
            period: rec.period,
            type: rec.type,
          };

          // Add formula if type is formula
          if (rec.type === "formula" && rec.formula) {
            recoveryConfig.formula = rec.formula;
          }

          return recoveryConfig;
        });

        this.setProperty("system.uses.recovery", recoveryArray);
        ItemUtils.log("Equipment recovery set to", recoveryArray);
      }
    }

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
    if (this.uses) {
      this.setProperty("system.uses.spent", 0);
      this.setProperty("system.uses.max", this.uses.max.toString());

      // Set current value as spent
      if (this.uses.value !== undefined) {
        const spent = this.uses.max - this.uses.value;
        this.setProperty("system.uses.spent", spent);
      }

      ItemUtils.log("Consumable uses set to", this.uses);

      // Set recovery configurations
      if (this.recovery && this.recovery.length > 0) {
        const recoveryArray = this.recovery.map((rec) => {
          const recoveryConfig = {
            period: rec.period,
            type: rec.type,
          };

          // Add formula if type is formula
          if (rec.type === "formula" && rec.formula) {
            recoveryConfig.formula = rec.formula;
          }

          return recoveryConfig;
        });

        this.setProperty("system.uses.recovery", recoveryArray);
        ItemUtils.log("Consumable recovery set to", recoveryArray);
      }
    }

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
        props.add("verbal");
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
    if (this.toolBonus) {
      this.setProperty("system.bonus", this.toolBonus.toString());
      ItemUtils.log("Tool bonus set to", this.toolBonus);
    }

    // Limited uses
    if (this.uses) {
      this.setProperty("system.uses.spent", 0);
      this.setProperty("system.uses.max", this.uses.max.toString());

      // Set current value as spent
      if (this.uses.value !== undefined) {
        const spent = this.uses.max - this.uses.value;
        this.setProperty("system.uses.spent", spent);
      }

      ItemUtils.log("Tool uses set to", this.uses);

      // Set recovery configurations
      if (this.recovery && this.recovery.length > 0) {
        const recoveryArray = this.recovery.map((rec) => {
          const recoveryConfig = {
            period: rec.period,
            type: rec.type,
          };

          // Add formula if type is formula
          if (rec.type === "formula" && rec.formula) {
            recoveryConfig.formula = rec.formula;
          }

          return recoveryConfig;
        });

        this.setProperty("system.uses.recovery", recoveryArray);
        ItemUtils.log("Tool recovery set to", recoveryArray);
      }
    }

    // Default proficiency
    this.setProperty("system.proficient", 1);

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? {};
      props.mgc = true;
      this.setProperty("system.properties", props);
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
      const props = this.getProperty("system.properties") ?? [];
      if (!props.includes("weightlessContents")) {
        props.push("weightlessContents");
      }
      this.setProperty("system.properties", props);
      ItemUtils.log("Weightless contents enabled");
    }

    // Is magical?
    if (this.isMagical) {
      const props = this.getProperty("system.properties") ?? [];
      if (!props.includes("mgc")) {
        props.push("mgc");
      }
      this.setProperty("system.properties", props);
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
      const props = this.getProperty("system.properties") ?? [];
      if (!props.includes("mgc")) {
        props.push("mgc");
      }
      ItemUtils.log("After buildLootData, checking descriptions:");
      ItemUtils.log(
        "  description.value:",
        this.getProperty("system.description.value")
      );
      ItemUtils.log(
        "  description.chat:",
        this.getProperty("system.description.chat")
      );
      ItemUtils.log(
        "  unidentified.description:",
        this.getProperty("system.unidentified.description")
      );
      ItemUtils.log(
        "  unidentified.name:",
        this.getProperty("system.unidentified.name")
      );
      this.setProperty("system.properties", props);
    }

    ItemUtils.log("After all type-specific builds, final check:");
    ItemUtils.log("  Full system object:", this.#dnd5e.system);
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
    if (!this.cost) return 0;

    // Cost is stored in copper pieces
    const goldValue = this.cost / CurrencyRates.gp;

    // Round to 2 decimal places
    return Math.round(goldValue * 100) / 100;
  }

  /**
   * Create the item in Foundry
   * @param {string} folderId - Optional folder to create item in
   * @returns {Promise<Object>} Created item and any issues
   */
  async createItem5e(folderId = null) {
    ItemUtils.log("State of ItemData before building", this);

    ItemUtils.log("Creating item in Foundry");

    try {
      // Build Foundry data structure
      await this.buildFoundryData();

      // Validate
      const validation = ItemUtils.validateItemData(this.#dnd5e);
      if (!validation.valid) {
        ItemUtils.error("Item validation failed", validation.errors);
        return {
          item: null,
          issues: validation.errors,
        };
      }

      // Clone data to avoid mutations
      const itemData = ItemUtils.deepClone(this.#dnd5e);

      // Set folder if provided
      if (folderId) {
        itemData.folder = folderId;
      }

      // Create the item
      const createdItem = await CONFIG.Item.documentClass.create(itemData);

      if (createdItem) {
        ItemUtils.log("Item created successfully", createdItem);
        ui.notifications.info(`Created item: ${this.name}`);

        return {
          item: createdItem,
          issues: [],
        };
      } else {
        ItemUtils.error("Item creation returned null");
        return {
          item: null,
          issues: ["Item creation failed"],
        };
      }
    } catch (error) {
      ItemUtils.error("Error creating item", error);
      return {
        item: null,
        issues: [error.message],
      };
    }
  }

  /**
   * Export item data for debugging
   */
  toJSON() {
    return {
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
        magicBonus: this.magicBonus,
      },
      foundryData: this.#dnd5e,
    };
  }
}
