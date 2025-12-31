// scripts/strictItemParsers/equipmentParser.js

import { BaseStrictParser } from "./baseParser.js";
import { ItemUtils } from "../itemUtils.js";

/**
 * Strict Parser for Equipment items.
 * Extends the BaseStrictParser and adds logic for equipment-specific fields.
 *
 * Template Specification: Strict_Equipment_Template.md v1.0
 *
 * Equipment Types:
 * - light (Light Armor)
 * - medium (Medium Armor)
 * - heavy (Heavy Armor)
 * - natural (Natural Armor)
 * - shield (Shield)
 * - clothing (Clothing)
 * - ring (Ring)
 * - rod (Rod - permanent equipment)
 * - trinket (Trinket - permanent)
 * - wand (Wand - permanent equipment)
 * - wondrous (Wondrous Item)
 * - vehicle (Vehicle Equipment)
 *
 * Properties (4 total):
 * - Adamantine, Focus, Magical, Stealth Disadvantage
 *
 * Conditional Sections:
 * - ATTUNEMENT (if Magical is true)
 * - ARMOR (if armor or shield type)
 * - VEHICLE PROPERTIES (if vehicle type)
 */

/**
 * Map template base equipment values to dnd5e system values
 */
const BASE_EQUIPMENT_MAP = {
  // Light armor
  leather: "leather",
  padded: "padded",
  studdedleather: "studded",

  // Medium armor
  breastplate: "breastplate",
  chainshirt: "chainshirt", // Fixed: no hyphen
  halfplate: "halfplate", // Fixed: no hyphen
  hide: "hide",
  scalemail: "scalemail", // Fixed: not 'scale'

  // Heavy armor
  chainmail: "chainmail", // Fixed: not 'chain'
  plate: "plate",
  ringmail: "ringmail", // Fixed: not 'ring'
  splint: "splint",

  // Shield
  shield: "shield",
};

export class EquipmentStrictParser extends BaseStrictParser {
  constructor() {
    super();
  }

  /**
   * Main parse method for Equipment items.
   * @param {string} text - The full text to parse.
   * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
   */
  parse(text) {
    // 1. Parse all universal fields using the parent parser.
    const baseResult = super.parse(text);

    // If the base parsing failed, we can't continue. Return the errors.
    if (!baseResult.success) {
      ItemUtils.warn(
        "EquipmentStrictParser: Base parsing had errors, but continuing with equipment-specific parsing"
      );
      this.errors.push(...baseResult.errors);
      this.warnings.push(...baseResult.warnings);
    }

    const { item } = baseResult;
    ItemUtils.log(
      "EquipmentStrictParser: Base parsing successful, starting equipment-specific parsing..."
    );

    try {
      // 2. Extract equipment-specific fields from the text.
      const equipmentData = this.extractEquipmentFields();

      // 3. Populate the ItemData object with the new fields.
      this.populateEquipmentFields(item, equipmentData);

      // 4. Perform any equipment-specific validation.
      if (!this.validateEquipment(item, equipmentData)) {
        ItemUtils.warn(
          "EquipmentStrictParser: Validation found issues, but continuing with warnings"
        );
      }

      ItemUtils.log(
        "EquipmentStrictParser: Equipment parsing completed successfully"
      );
    } catch (error) {
      ItemUtils.error(
        "EquipmentStrictParser: Unexpected error during equipment parsing",
        error
      );
      this.addError(
        `Unexpected error during equipment parsing: ${error.message}`
      );
    }

    // 5. Return the final result.
    const success = this.errors.length === 0;
    return this.createResult(success, item);
  }

  /**
   * Extracts fields specific to Equipment items from the class's `this.lines`.
   * @returns {Object} An object containing the extracted equipment data.
   */
  extractEquipmentFields() {
    const data = {
      equipmentType: null,
      baseEquipment: null,

      // 4 Boolean Properties
      adamantine: false,
      focus: false,
      magical: false,
      stealthDisadvantage: false,

      // Attunement (conditional)
      attunement: "none",
      attunementBy: "",
      magicBonus: null,

      // Armor properties (conditional)
      armorClass: null,
      maxDexModifier: null,
      strengthRequirement: null,

      // Proficiency
      proficiency: 1, // Default to proficient

      // Vehicle Properties (conditional)
      vehicleArmorClass: null,
      cover: 0, // Default to no cover (numeric)
      hitPointsCurrent: null,
      hitPointsMax: null,
      hitPointsThreshold: null,
      healthConditions: "",
      speed: null,
      speedConditions: "",

      // Uses
      usesCurrent: 0,
      usesMax: 0,
      recovery: [], // Array of recovery configurations
    };

    // --- Extract Equipment Type (REQUIRED) ---
    const equipmentTypeLine = this.findLine(/^Equipment Type:\s*(.+)$/);

    if (!equipmentTypeLine) {
      this.addError("Equipment Type is required but was not found");
      return data;
    }

    const typeMatch = equipmentTypeLine.line.match(/^Equipment Type:\s*(.+)$/);
    const typeText = typeMatch[1].trim().toLowerCase();

    const validTypes = [
      "light",
      "medium",
      "heavy",
      "natural",
      "shield",
      "clothing",
      "ring",
      "rod",
      "trinket",
      "wand",
      "wondrous",
      "vehicle",
    ];
    if (validTypes.includes(typeText)) {
      data.equipmentType = typeText;
      ItemUtils.log(
        `EquipmentStrictParser: Equipment Type set to "${typeText}"`
      );
    } else {
      this.addError(
        `Invalid Equipment Type "${typeText}". Must be one of: ${validTypes.join(
          ", "
        )}`
      );
      return data;
    }

    // --- Extract Base Equipment ---
    const baseEquipmentLine = this.findLine(/^Base Equipment:\s*(.+)$/);

    if (baseEquipmentLine) {
      const baseMatch = baseEquipmentLine.line.match(
        /^Base Equipment:\s*(.+)$/
      );
      // This removes spaces and converts to lowercase to match your map keys
      // e.g. "Plate Armor" becomes "platearmor" (or just "plate")
      const baseText = baseMatch[1].trim().toLowerCase().replace(/\s+/g, "");

      if (baseText !== "blank" && baseText !== "") {
        // Check if the cleaned text exists in your BASE_EQUIPMENT_MAP
        const systemValue = BASE_EQUIPMENT_MAP[baseText];
        if (systemValue) {
          data.baseEquipment = systemValue;
          ItemUtils.log(
            `EquipmentStrictParser: Base Equipment mapped to "${systemValue}"`
          );
        } else {
          // Fallback: If not in map, try using the cleaned name as-is
          data.baseEquipment = baseText;
          ItemUtils.warn(
            `EquipmentStrictParser: No mapping for "${baseText}", using as-is`
          );
        }
      }
    }

    // Validate base equipment for armor/shield types
    const validArmorTypes = ["light", "medium", "heavy", "shield"];
    if (validArmorTypes.includes(data.equipmentType) && !data.baseEquipment) {
      this.addWarning(
        `Base Equipment is recommended for ${data.equipmentType} equipment`
      );
    }

    // --- Extract Properties Section ---
    const properties = this.extractPropertiesSection("PROPERTIES", {
      Adamantine: false,
      Focus: false,
      Magical: false,
      "Stealth Disadvantage": false,
    });

    data.adamantine = properties.Adamantine;
    data.focus = properties.Focus;
    data.magical = properties.Magical;
    data.stealthDisadvantage = properties["Stealth Disadvantage"];

    ItemUtils.log("EquipmentStrictParser: Equipment properties extracted", {
      adamantine: data.adamantine,
      focus: data.focus,
      magical: data.magical,
      stealthDisadvantage: data.stealthDisadvantage,
    });

    // --- Extract Attunement Section (only if magical) ---
    if (data.magical) {
      const attunementSection = this.findLine(/^---ATTUNEMENT---$/);

      if (attunementSection) {
        ItemUtils.log("EquipmentStrictParser: Found ATTUNEMENT section");

        const attunementLine = this.findLineAfter(
          attunementSection.index,
          /^Attunement:\s*(.+)$/
        );
        if (attunementLine) {
          const attunementMatch =
            attunementLine.line.match(/^Attunement:\s*(.+)$/);
          const attunementText = attunementMatch[1].trim().toLowerCase();
          const validAttunements = ["none", "required", "optional"];

          if (validAttunements.includes(attunementText)) {
            data.attunement = attunementText;
            ItemUtils.log(
              `EquipmentStrictParser: Attunement set to "${attunementText}"`
            );
          } else {
            this.addWarning(
              `Invalid Attunement value "${attunementText}". Defaulting to "none".`
            );
          }
        }

        const attunementByLine = this.findLineAfter(
          attunementSection.index,
          /^Attunement By:\s*(.+)$/
        );
        if (attunementByLine) {
          const attunementByMatch = attunementByLine.line.match(
            /^Attunement By:\s*(.+)$/
          );
          const attunementByText = attunementByMatch[1].trim();
          if (attunementByText.toLowerCase() !== "blank") {
            data.attunementBy = attunementByText;
            ItemUtils.log(
              `EquipmentStrictParser: Attunement By set to "${attunementByText}"`
            );
          }
        }

        const magicBonusLine = this.findLineAfter(
          attunementSection.index,
          /^Magic Bonus:\s*(.+)$/
        );
        if (magicBonusLine) {
          const bonusMatch = magicBonusLine.line.match(/^Magic Bonus:\s*(.+)$/);
          const bonusText = bonusMatch[1].trim().toLowerCase();

          if (bonusText !== "blank" && bonusText !== "") {
            const bonusValue = parseInt(bonusText);
            if (!isNaN(bonusValue) && bonusValue >= 0) {
              data.magicBonus = bonusValue;
              ItemUtils.log(
                `EquipmentStrictParser: Magic Bonus set to +${bonusValue}`
              );
            } else {
              this.addWarning(`Invalid Magic Bonus value "${bonusText}".`);
            }
          }
        }
      }
    }

    // --- Extract Armor Section (only if armor or shield type) ---
    const armorTypes = ["light", "medium", "heavy", "natural", "shield"];
    if (armorTypes.includes(data.equipmentType)) {
      const armorSection = this.findLine(/^---ARMOR---$/);

      if (armorSection) {
        ItemUtils.log("EquipmentStrictParser: Found ARMOR section");

        // Armor Class (REQUIRED for armor/shield)
        const armorClassLine = this.findLineAfter(
          armorSection.index,
          /^Armor Class:\s*(.+)$/
        );
        if (!armorClassLine) {
          this.addError(
            "Armor Class is required for armor and shield equipment"
          );
        } else {
          const acMatch = armorClassLine.line.match(/^Armor Class:\s*(.+)$/);
          const acText = acMatch[1].trim();
          const acValue = parseInt(acText);

          if (!isNaN(acValue) && acValue >= 0) {
            data.armorClass = acValue;
            ItemUtils.log(
              `EquipmentStrictParser: Armor Class set to ${acValue}`
            );
          } else {
            this.addError(
              `Invalid Armor Class value "${acText}". Must be a non-negative integer.`
            );
          }
        }

        // Max Dex Modifier (optional)
        const maxDexLine = this.findLineAfter(
          armorSection.index,
          /^Max Dex Modifier:\s*(.+)$/
        );
        if (maxDexLine) {
          const dexMatch = maxDexLine.line.match(/^Max Dex Modifier:\s*(.+)$/);
          const dexText = dexMatch[1].trim().toLowerCase();

          if (dexText !== "blank" && dexText !== "") {
            const dexValue = parseInt(dexText);
            if (!isNaN(dexValue) && dexValue >= 0) {
              data.maxDexModifier = dexValue;
              ItemUtils.log(
                `EquipmentStrictParser: Max Dex Modifier set to ${dexValue}`
              );
            } else {
              this.addWarning(`Invalid Max Dex Modifier value "${dexText}".`);
            }
          }
        }

        // Strength Requirement (optional)
        const strengthLine = this.findLineAfter(
          armorSection.index,
          /^Strength Requirement:\s*(.+)$/
        );
        if (strengthLine) {
          const strMatch = strengthLine.line.match(
            /^Strength Requirement:\s*(.+)$/
          );
          const strText = strMatch[1].trim().toLowerCase();

          if (strText !== "blank" && strText !== "") {
            const strValue = parseInt(strText);
            if (!isNaN(strValue) && strValue >= 0) {
              data.strengthRequirement = strValue;
              ItemUtils.log(
                `EquipmentStrictParser: Strength Requirement set to ${strValue}`
              );
            } else {
              this.addWarning(
                `Invalid Strength Requirement value "${strText}".`
              );
            }
          }
        }
      } else {
        this.addError(
          "ARMOR section is required for armor and shield equipment"
        );
      }
    }

    // --- Extract Vehicle Properties Section (only if vehicle type) ---
    if (data.equipmentType === "vehicle") {
      const vehicleSection = this.findLine(/^---VEHICLE PROPERTIES---$/);

      if (vehicleSection) {
        ItemUtils.log(
          "EquipmentStrictParser: Found VEHICLE PROPERTIES section"
        );

        // Vehicle Armor Class
        const vehicleACLine = this.findLineAfter(
          vehicleSection.index,
          /^Vehicle Armor Class:\s*(.+)$/
        );
        if (vehicleACLine) {
          const acMatch = vehicleACLine.line.match(
            /^Vehicle Armor Class:\s*(.+)$/
          );
          const acValue = parseInt(acMatch[1].trim());
          if (!isNaN(acValue)) {
            data.vehicleArmorClass = acValue;
            ItemUtils.log(
              `EquipmentStrictParser: Vehicle Armor Class set to ${acValue}`
            );
          }
        }

        // Cover - convert to numeric value
        const coverLine = this.findLineAfter(
          vehicleSection.index,
          /^Cover:\s*(.+)$/
        );
        if (coverLine) {
          const coverMatch = coverLine.line.match(/^Cover:\s*(.+)$/);
          const coverText = coverMatch[1].trim().toLowerCase();

          // Map cover text to numeric values as per dnd5e system
          const coverMap = {
            none: 0,
            half: 0.5,
            threequarters: 0.75,
            total: 1,
          };

          if (coverMap[coverText] !== undefined) {
            data.cover = coverMap[coverText];
            ItemUtils.log(
              `EquipmentStrictParser: Cover set to ${data.cover} (${coverText})`
            );
          } else {
            this.addWarning(
              `Invalid Cover value "${coverText}". Expected: none, half, threeQuarters, total`
            );
            data.cover = 0; // Default to no cover
          }
        }

        // Hit Points Current
        const hpCurrentLine = this.findLineAfter(
          vehicleSection.index,
          /^Hit Points Current:\s*(.+)$/
        );
        if (hpCurrentLine) {
          const hpMatch = hpCurrentLine.line.match(
            /^Hit Points Current:\s*(.+)$/
          );
          const hpValue = parseInt(hpMatch[1].trim());
          if (!isNaN(hpValue)) {
            data.hitPointsCurrent = hpValue;
            ItemUtils.log(
              `EquipmentStrictParser: Hit Points Current set to ${hpValue}`
            );
          }
        }

        // Hit Points Max
        const hpMaxLine = this.findLineAfter(
          vehicleSection.index,
          /^Hit Points Max:\s*(.+)$/
        );
        if (hpMaxLine) {
          const hpMatch = hpMaxLine.line.match(/^Hit Points Max:\s*(.+)$/);
          const hpValue = parseInt(hpMatch[1].trim());
          if (!isNaN(hpValue)) {
            data.hitPointsMax = hpValue;
            ItemUtils.log(
              `EquipmentStrictParser: Hit Points Max set to ${hpValue}`
            );
          }
        }

        // Hit Points Threshold
        const hpThresholdLine = this.findLineAfter(
          vehicleSection.index,
          /^Hit Points Threshold:\s*(.+)$/
        );
        if (hpThresholdLine) {
          const hpMatch = hpThresholdLine.line.match(
            /^Hit Points Threshold:\s*(.+)$/
          );
          const hpValue = parseInt(hpMatch[1].trim());
          if (!isNaN(hpValue)) {
            data.hitPointsThreshold = hpValue;
            ItemUtils.log(
              `EquipmentStrictParser: Hit Points Threshold set to ${hpValue}`
            );
          }
        }

        // Health Conditions
        const conditionsLine = this.findLineAfter(
          vehicleSection.index,
          /^Health Conditions:\s*(.+)$/
        );
        if (conditionsLine) {
          const condMatch = conditionsLine.line.match(
            /^Health Conditions:\s*(.+)$/
          );
          const condText = condMatch[1].trim();
          if (condText.toLowerCase() !== "blank") {
            data.healthConditions = condText;
            ItemUtils.log(
              `EquipmentStrictParser: Health Conditions set to "${condText}"`
            );
          }
        }

        // Speed
        const speedLine = this.findLineAfter(
          vehicleSection.index,
          /^Speed:\s*(.+)$/
        );
        if (speedLine) {
          const speedMatch = speedLine.line.match(/^Speed:\s*(.+)$/);
          const speedValue = parseInt(speedMatch[1].trim());
          if (!isNaN(speedValue)) {
            data.speed = speedValue;
            ItemUtils.log(`EquipmentStrictParser: Speed set to ${speedValue}`);
          }
        }

        // Speed Conditions
        const speedCondLine = this.findLineAfter(
          vehicleSection.index,
          /^Speed Conditions:\s*(.+)$/
        );
        if (speedCondLine) {
          const speedCondMatch = speedCondLine.line.match(
            /^Speed Conditions:\s*(.+)$/
          );
          const speedCondText = speedCondMatch[1].trim();
          if (speedCondText.toLowerCase() !== "blank") {
            data.speedConditions = speedCondText;
            ItemUtils.log(
              `EquipmentStrictParser: Speed Conditions set to "${speedCondText}"`
            );
          }
        }
      } else {
        this.addWarning(
          "VEHICLE PROPERTIES section recommended for vehicle equipment"
        );
      }
    }

    // --- Extract Proficiency Section ---
    const proficiencySection = this.findLine(/^---PROFICIENCY---$/);

    if (proficiencySection) {
      ItemUtils.log("EquipmentStrictParser: Found PROFICIENCY section");

      const proficiencyLine = this.findLineAfter(
        proficiencySection.index,
        /^Proficiency:\s*(.+)$/
      );
      if (proficiencyLine) {
        const profMatch = proficiencyLine.line.match(/^Proficiency:\s*(.+)$/);
        const profText = profMatch[1].trim().toLowerCase();

        // Map template values to system values
        const profMap = {
          automatic: -1,
          notproficient: 0,
          proficient: 1,
        };

        if (profMap[profText] !== undefined) {
          data.proficiency = profMap[profText];
          ItemUtils.log(
            `EquipmentStrictParser: Proficiency set to ${data.proficiency}`
          );
        }
      }
    }

    // --- Extract Usage Section ---
    const usageSection = this.findLine(/^---USAGE---$/);

    if (usageSection) {
      ItemUtils.log("EquipmentStrictParser: Found USAGE section");

      // Uses Current
      const usesCurrentLine = this.findLineAfter(
        usageSection.index,
        /^Uses Current:\s*(.+)$/
      );
      if (usesCurrentLine) {
        const currentMatch = usesCurrentLine.line.match(
          /^Uses Current:\s*(.+)$/
        );
        const currentValue = parseInt(currentMatch[1].trim());
        if (!isNaN(currentValue) && currentValue >= 0) {
          data.usesCurrent = currentValue;
          ItemUtils.log(
            `EquipmentStrictParser: Uses Current set to ${currentValue}`
          );
        }
      }

      // Uses Max
      const usesMaxLine = this.findLineAfter(
        usageSection.index,
        /^Uses Max:\s*(.+)$/
      );
      if (usesMaxLine) {
        const maxMatch = usesMaxLine.line.match(/^Uses Max:\s*(.+)$/);
        const maxValue = parseInt(maxMatch[1].trim());
        if (!isNaN(maxValue) && maxValue >= 0) {
          data.usesMax = maxValue;
          ItemUtils.log(`EquipmentStrictParser: Uses Max set to ${maxValue}`);
        }
      }
    }

    // --- Extract Recovery Blocks (only if Uses Max > 0) ---
    if (data.usesMax > 0) {
      const recoveryBlocks = this.extractRecoveryBlocks();
      if (recoveryBlocks.length > 0) {
        data.recovery = recoveryBlocks;
        ItemUtils.log(
          `EquipmentStrictParser: Found ${recoveryBlocks.length} recovery configuration(s)`
        );
      }
    }

    return data;
  }

  /**
   * Extracts all recovery blocks from the template.
   * Recovery blocks are repeatable sections between ---RECOVERY--- and ===END RECOVERY===
   * @returns {Array} Array of recovery configuration objects
   */
  extractRecoveryBlocks() {
    const recoveryConfigs = [];

    // Find all ---RECOVERY--- markers
    let searchStart = 0;

    while (searchStart < this.lines.length) {
      // Find next recovery section start
      let recoveryStart = null;
      for (let i = searchStart; i < this.lines.length; i++) {
        if (this.lines[i].trim() === "---RECOVERY---") {
          recoveryStart = i;
          break;
        }
      }

      if (recoveryStart === null) break; // No more recovery blocks

      // Find the end marker
      let recoveryEnd = null;
      for (let i = recoveryStart + 1; i < this.lines.length; i++) {
        if (this.lines[i].trim() === "===END RECOVERY===") {
          recoveryEnd = i;
          break;
        }
      }

      if (recoveryEnd === null) {
        this.addWarning(
          "Found ---RECOVERY--- without matching ===END RECOVERY==="
        );
        break;
      }

      // Parse this recovery block
      const config = this.parseRecoveryBlock(recoveryStart, recoveryEnd);
      if (config) {
        recoveryConfigs.push(config);
      }

      // Move search past this block
      searchStart = recoveryEnd + 1;
    }

    return recoveryConfigs;
  }

  /**
   * Parses a single recovery block between start and end indices.
   * @param {number} startIndex - Line index of ---RECOVERY---
   * @param {number} endIndex - Line index of ===END RECOVERY===
   * @returns {Object|null} Recovery configuration object or null if invalid
   */
  parseRecoveryBlock(startIndex, endIndex) {
    const config = {
      period: null,
      type: null,
      formula: null,
    };

    // Valid values
    const validPeriods = ["lr", "sr", "day", "dawn", "dusk", "recharge"];
    const validTypes = ["recoverAll", "loseAll", "formula"];

    // Search within the block for each field
    for (let i = startIndex + 1; i < endIndex; i++) {
      const line = this.lines[i].trim();

      // Period
      const periodMatch = line.match(/^Period:\s*(.+)$/i);
      if (periodMatch) {
        const periodText = periodMatch[1].trim().toLowerCase();
        if (validPeriods.includes(periodText)) {
          config.period = periodText;
          ItemUtils.log(
            `EquipmentStrictParser: Recovery Period set to "${periodText}"`
          );
        } else {
          this.addWarning(
            `Invalid Recovery Period "${periodText}". Must be one of: ${validPeriods.join(
              ", "
            )}`
          );
        }
        continue;
      }

      // Type
      const typeMatch = line.match(/^Type:\s*(.+)$/i);
      if (typeMatch) {
        const typeText = typeMatch[1].trim();
        // Check case-insensitive but preserve for matching
        const typeLower = typeText.toLowerCase();
        const typeMap = {
          recoverall: "recoverAll",
          loseall: "loseAll",
          formula: "formula",
        };

        if (typeMap[typeLower]) {
          config.type = typeMap[typeLower];
          ItemUtils.log(
            `EquipmentStrictParser: Recovery Type set to "${config.type}"`
          );
        } else {
          this.addWarning(
            `Invalid Recovery Type "${typeText}". Must be one of: ${validTypes.join(
              ", "
            )}`
          );
        }
        continue;
      }

      // Formula
      const formulaMatch = line.match(/^Formula:\s*(.+)$/i);
      if (formulaMatch) {
        const formulaText = formulaMatch[1].trim();
        if (formulaText.toLowerCase() !== "blank" && formulaText !== "") {
          config.formula = formulaText;
          ItemUtils.log(
            `EquipmentStrictParser: Recovery Formula set to "${formulaText}"`
          );
        }
        continue;
      }
    }

    // Validate required fields
    if (!config.period) {
      this.addWarning("Recovery block missing Period field");
      return null;
    }
    if (!config.type) {
      this.addWarning("Recovery block missing Type field");
      return null;
    }

    // Validate formula requirements
    if (config.type === "formula" && !config.formula) {
      this.addWarning(`Recovery Type "formula" requires a Formula value`);
      return null;
    }

    // Validate recharge period has valid formula (2-6)
    if (config.period === "recharge") {
      const rechargeValue = parseInt(config.formula);
      if (isNaN(rechargeValue) || rechargeValue < 2 || rechargeValue > 6) {
        this.addWarning(
          `Recovery Period "recharge" requires Formula to be 2, 3, 4, 5, or 6`
        );
        return null;
      }
    }

    return config;
  }

  /**
   * Populates the ItemData instance with parsed equipment-specific data.
   * @param {ItemData} item - The ItemData instance to populate.
   * @param {Object} equipmentData - The object from extractEquipmentFields.
   */
  populateEquipmentFields(item, equipmentData) {
    // Set equipment type and base equipment
    item.armorType = equipmentData.equipmentType;
    item.baseEquipment = equipmentData.baseEquipment;

    // Set magical property
    item.isMagical = equipmentData.magical;

    // Set attunement - Pass the string ("required", "optional", or "none") directly
    if (equipmentData.magical) {
      // Map "none" to empty string, otherwise use the value (required/optional)
      item.attunement =
        equipmentData.attunement === "none" ? "" : equipmentData.attunement;
      item.attunementRequirement = equipmentData.attunementBy;
    } else {
      item.attunement = "";
      item.attunementRequirement = null;
    }

    // Set magic bonus
    item.magicBonus = equipmentData.magicBonus;

    // Set armor properties
    item.armorClass = equipmentData.armorClass;
    item.armorAddDex = equipmentData.maxDexModifier !== null;
    item.maxDexModifier = equipmentData.maxDexModifier;
    item.strengthRequirement = equipmentData.strengthRequirement;
    item.stealthDisadvantage = equipmentData.stealthDisadvantage;

    // Set proficiency
    item.proficient = equipmentData.proficiency;

    // Set uses
    if (equipmentData.usesMax > 0) {
      item.uses = {
        value: equipmentData.usesCurrent,
        max: equipmentData.usesMax,
      };

      // Set recovery configurations
      if (equipmentData.recovery && equipmentData.recovery.length > 0) {
        item.recovery = equipmentData.recovery;
        ItemUtils.log(
          "EquipmentStrictParser: Recovery configurations set",
          item.recovery
        );
      }
    }

    // Set properties
    item.properties = [];
    if (equipmentData.adamantine) {
      item.properties.push("ada");
    }
    if (equipmentData.focus) {
      item.properties.push("fcs");
    }
    if (equipmentData.magical) {
      item.properties.push("mgc");
    }
    if (equipmentData.stealthDisadvantage) {
      item.properties.push("stealthDisadvantage");
      item.stealthDisadvantage = true;
    }

    // Set vehicle properties
    if (equipmentData.equipmentType === "vehicle") {
      item.vehicleArmorClass = equipmentData.vehicleArmorClass;
      item.cover = equipmentData.cover;
      item.hitPoints = {
        value: equipmentData.hitPointsCurrent,
        max: equipmentData.hitPointsMax,
        dt: equipmentData.hitPointsThreshold,
        conditions: equipmentData.healthConditions,
      };
      item.speed = equipmentData.speed;
      item.speedConditions = equipmentData.speedConditions;
    }

    ItemUtils.log(
      "EquipmentStrictParser: Equipment-specific fields populated",
      {
        armorType: item.armorType,
        baseEquipment: item.baseEquipment,
        armorClass: item.armorClass,
        properties: item.properties,
        isMagical: item.isMagical,
      }
    );
  }

  /**
   * Validates the parsed equipment data.
   * @param {ItemData} item - The ItemData instance to validate.
   * @param {Object} equipmentData - The extracted equipment data for cross-validation.
   * @returns {boolean} - True if validation passes (no critical errors).
   */
  validateEquipment(item, equipmentData) {
    let valid = true;

    // Validate equipment type is set
    if (!item.armorType) {
      this.addError("Equipment Type is required but was not set");
      valid = false;
    }

    // Validate armor/shield types have armor class
    const armorTypes = ["light", "medium", "heavy", "natural", "shield"];
    if (armorTypes.includes(item.armorType) && item.armorClass === null) {
      this.addError(`Armor Class is required for ${item.armorType} equipment`);
      valid = false;
    }

    // Validate uses
    if (item.uses) {
      if (item.uses.value < 0) {
        this.addWarning("Uses Current cannot be negative");
      }
      if (item.uses.max < 0) {
        this.addError("Uses Max cannot be negative");
        valid = false;
      }
      if (item.uses.value > item.uses.max) {
        this.addWarning(
          `Uses Current (${item.uses.value}) exceeds Uses Max (${item.uses.max})`
        );
      }
    }

    // Validate recovery configurations
    if (item.recovery && item.recovery.length > 0) {
      if (!item.uses || item.uses.max <= 0) {
        this.addWarning(
          "Recovery configurations specified but Uses Max is 0 or not set"
        );
      }

      for (let i = 0; i < item.recovery.length; i++) {
        const rec = item.recovery[i];
        if (rec.type === "formula" && !rec.formula) {
          this.addWarning(
            `Recovery configuration ${i + 1}: Type "formula" requires a formula`
          );
        }
      }
    }

    // Validate magic bonus range
    if (item.magicBonus !== null) {
      if (item.magicBonus < 0 || item.magicBonus > 3) {
        this.addWarning(
          `Magic Bonus (${item.magicBonus}) should typically be between 0 and 3`
        );
      }
    }

    // Log validation result
    if (valid) {
      ItemUtils.log("EquipmentStrictParser: Validation passed");
    } else {
      ItemUtils.warn("EquipmentStrictParser: Validation failed with errors");
    }

    return valid;
  }
}
