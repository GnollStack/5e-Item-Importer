// scripts/strictItemParsers/toolParser.js

import { BaseStrictParser } from "./baseParser.js";
import { ItemUtils } from "../itemUtils.js";
import { BaseToolToType } from "../itemConfig.js";

/**
 * Strict Parser for Tool items.
 * Extends the BaseStrictParser and adds logic for tool-specific fields.
 *
 * Template Specification: Strict_Tool_Template.md v1.0
 * - Tool Type (required): art|game|music|other
 * - Base Tool (required): Must match Tool Type
 * - Magical (optional): Determines if attunement section is parsed
 * - Tool Bonus (optional): Numeric bonus to tool checks
 * - Proficiency (optional): notProficient|proficient|expert
 * - Ability (optional): str|dex|con|int|wis|cha
 * - Uses (optional): Current and Max values
 */
export class ToolStrictParser extends BaseStrictParser {
  constructor() {
    super();

    // Base tool mappings (must match itemConfig.js)
    this.baseToolMappings = {
      // Artisan's Tools (type: "art")
      alch: "art",
      brew: "art",
      calli: "art",
      carp: "art",
      carta: "art",
      cob: "art",
      cook: "art",
      glass: "art",
      jewel: "art",
      leath: "art",
      maso: "art",
      paint: "art",
      pott: "art",
      smith: "art",
      tink: "art",
      weav: "art",
      wood: "art",

      // Gaming Sets (type: "game")
      dice: "game",
      card: "game",
      chess: "game",

      // Musical Instruments (type: "music")
      bagpipes: "music",
      drum: "music",
      dulcimer: "music",
      flute: "music",
      horn: "music",
      lute: "music",
      lyre: "music",
      panflute: "music",
      shawm: "music",
      viol: "music",

      // Other Tools (type: "" or "other")
      disg: "",
      forg: "",
      herb: "",
      navg: "",
      pois: "",
      thief: "",
    };
  }

  /**
   * Main parse method for Tool items.
   * @param {string} text - The full text to parse.
   * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
   */
  parse(text) {
    // 1. Parse all universal fields using the parent parser.
    const baseResult = super.parse(text);

    // Collect base parsing errors but continue with tool-specific parsing
    if (!baseResult.success) {
      ItemUtils.warn(
        "ToolStrictParser: Base parsing had errors, but continuing with tool-specific parsing"
      );
      this.errors.push(...baseResult.errors);
      this.warnings.push(...baseResult.warnings);
    }

    const { item } = baseResult;
    ItemUtils.log(
      "ToolStrictParser: Base parsing successful, starting tool-specific parsing..."
    );

    try {
      // 2. Extract tool-specific fields from the text.
      const toolData = this.extractToolFields();

      // 3. Populate the ItemData object with the new fields.
      this.populateToolFields(item, toolData);

      // 4. Perform any tool-specific validation.
      if (!this.validateTool(item, toolData)) {
        ItemUtils.warn(
          "ToolStrictParser: Validation found issues, but continuing with warnings"
        );
      }

      ItemUtils.log("ToolStrictParser: Tool parsing completed successfully");
    } catch (error) {
      ItemUtils.error(
        "ToolStrictParser: Unexpected error during tool parsing",
        error
      );
      this.addError(`Unexpected error during tool parsing: ${error.message}`);
    }

    // 5. Return the final result.
    const success = this.errors.length === 0;
    return this.createResult(success, item);
  }

  /**
   * Extracts fields specific to Tool items from the class's `this.lines`.
   * @returns {Object} An object containing the extracted tool data.
   */
  extractToolFields() {
    const data = {
      toolType: null, // Required
      baseTool: null, // Required
      magical: false, // Optional
      toolBonus: null, // Optional
      attunement: "none", // Optional, only if magical
      attunementBy: "", // Optional
      proficiency: 0, // Optional (0=not, 1=proficient, 2=expert)
      ability: "", // Optional
      usesCurrent: 0, // Optional
      usesMax: 0, // Optional
      recovery: [], // Optional, array of recovery configurations only available when usesMax is a valid number
    };

    // --- Extract Tool Type (REQUIRED) ---
    const toolTypeLine = this.findLine(/^Tool Type:\s*(.+)$/);

    if (!toolTypeLine) {
      this.addError("Tool Type field is required but was not found");
      data.toolType = "other"; // Fallback
    } else {
      const match = toolTypeLine.line.match(/^Tool Type:\s*(.+)$/);
      const toolTypeText = match[1].trim().toLowerCase();

      const validToolTypes = ["art", "game", "music", "other"];

      if (validToolTypes.includes(toolTypeText)) {
        // Map "other" to empty string for system compatibility
        data.toolType = toolTypeText === "other" ? "" : toolTypeText;
        ItemUtils.log(`ToolStrictParser: Tool Type set to "${toolTypeText}"`);
      } else {
        this.addError(
          `Invalid Tool Type "${toolTypeText}". Must be one of: ${validToolTypes.join(
            ", "
          )}`
        );
        data.toolType = ""; // Fallback to "other"
      }
    }

    // --- Extract Base Tool (REQUIRED) ---
    const baseToolLine = this.findLine(/^Base Tool:\s*(.+)$/);

    if (!baseToolLine) {
      this.addError("Base Tool field is required but was not found");
    } else {
      const match = baseToolLine.line.match(/^Base Tool:\s*(.+)$/);
      const baseToolText = match[1].trim().toLowerCase();

      // Check if base tool is valid
      if (this.baseToolMappings.hasOwnProperty(baseToolText)) {
        data.baseTool = baseToolText;
        ItemUtils.log(`ToolStrictParser: Base Tool set to "${baseToolText}"`);
      } else {
        this.addError(
          `Invalid Base Tool "${baseToolText}". See template for valid base tool IDs.`
        );
      }
    }

    // --- Extract Properties Section ---
    const properties = this.extractPropertiesSection("PROPERTIES", {
      Magical: false,
    });

    data.magical = properties.Magical;

    // Tool Bonus is extracted separately as it's not a boolean
    const propertiesSection = this.findLine(/^---PROPERTIES---$/);
    if (propertiesSection) {
      const toolBonusLine = this.findLineAfter(
        propertiesSection.index,
        /^Tool Bonus:\s*(.+)$/
      );
      if (toolBonusLine) {
        const match = toolBonusLine.line.match(/^Tool Bonus:\s*(.+)$/);
        const bonusText = match[1].trim().toLowerCase();

        if (bonusText !== "blank" && bonusText !== "") {
          const bonusValue = parseInt(bonusText);
          if (!isNaN(bonusValue)) {
            data.toolBonus = bonusValue;
            ItemUtils.log(`ToolStrictParser: Tool Bonus set to ${bonusValue}`);
          } else {
            this.addWarning(`Tool Bonus "${bonusText}" is not a valid number`);
          }
        }
      }
    }

    // --- Extract Attunement Section (only if magical) ---
    if (data.magical) {
      const attunementSection = this.findLine(/^---ATTUNEMENT---$/);

      if (attunementSection) {
        ItemUtils.log("ToolStrictParser: Found ATTUNEMENT section");

        const attunementLine = this.findLineAfter(
          attunementSection.index,
          /^Attunement:\s*(.+)$/
        );
        if (attunementLine) {
          const match = attunementLine.line.match(/^Attunement:\s*(.+)$/);
          const attunementText = match[1].trim().toLowerCase();
          const validAttunements = ["none", "required", "optional"];

          if (validAttunements.includes(attunementText)) {
            data.attunement = attunementText;
            ItemUtils.log(
              `ToolStrictParser: Attunement set to "${attunementText}"`
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
          const match = attunementByLine.line.match(/^Attunement By:\s*(.+)$/);
          const attunementByText = match[1].trim();
          if (attunementByText.toLowerCase() !== "blank") {
            data.attunementBy = attunementByText;
            ItemUtils.log(
              `ToolStrictParser: Attunement By set to "${attunementByText}"`
            );
          }
        }
      }
    } else {
      // If not magical, ensure attunement is none
      data.attunement = "none";
    }

    // --- Extract Ability Check Section ---
    const abilityCheckSection = this.findLine(/^---ABILITY CHECK---$/);

    if (abilityCheckSection) {
      ItemUtils.log("ToolStrictParser: Found ABILITY CHECK section");

      // Proficiency
      const proficiencyLine = this.findLineAfter(
        abilityCheckSection.index,
        /^Proficiency:\s*(.+)$/
      );
      if (proficiencyLine) {
        const match = proficiencyLine.line.match(/^Proficiency:\s*(.+)$/);
        const profText = match[1].trim().toLowerCase();

        const proficiencyMap = {
          notproficient: 0,
          proficient: 1,
          expert: 2,
        };

        if (proficiencyMap.hasOwnProperty(profText)) {
          data.proficiency = proficiencyMap[profText];
          ItemUtils.log(
            `ToolStrictParser: Proficiency set to ${data.proficiency}`
          );
        } else {
          this.addWarning(
            `Invalid Proficiency "${profText}". Defaulting to 0 (not proficient).`
          );
        }
      }

      // Ability
      const abilityLine = this.findLineAfter(
        abilityCheckSection.index,
        /^Ability:\s*(.+)$/
      );
      if (abilityLine) {
        const match = abilityLine.line.match(/^Ability:\s*(.+)$/);
        const abilityText = match[1].trim().toLowerCase();

        if (abilityText !== "blank" && abilityText !== "") {
          const validAbilities = ["str", "dex", "con", "int", "wis", "cha"];

          if (validAbilities.includes(abilityText)) {
            data.ability = abilityText;
            ItemUtils.log(`ToolStrictParser: Ability set to "${abilityText}"`);
          } else {
            this.addWarning(
              `Invalid Ability "${abilityText}". Must be one of: ${validAbilities.join(
                ", "
              )}`
            );
          }
        }
      }
    }

    // --- Extract Usage Section ---
    const usageSection = this.findLine(/^---USAGE---$/);

    if (usageSection) {
      ItemUtils.log("ToolStrictParser: Found USAGE section");

      // Uses Current
      const usesCurrentLine = this.findLineAfter(
        usageSection.index,
        /^Uses Current:\s*(.+)$/
      );
      if (usesCurrentLine) {
        const match = usesCurrentLine.line.match(/^Uses Current:\s*(.+)$/);
        const currentText = match[1].trim();
        const currentValue = parseInt(currentText);

        if (!isNaN(currentValue) && currentValue >= 0) {
          data.usesCurrent = currentValue;
          ItemUtils.log(
            `ToolStrictParser: Uses Current set to ${currentValue}`
          );
        }
      }

      // Uses Max
      const usesMaxLine = this.findLineAfter(
        usageSection.index,
        /^Uses Max:\s*(.+)$/
      );
      if (usesMaxLine) {
        const match = usesMaxLine.line.match(/^Uses Max:\s*(.+)$/);
        const maxText = match[1].trim();
        const maxValue = parseInt(maxText);

        if (!isNaN(maxValue) && maxValue >= 0) {
          data.usesMax = maxValue;
          ItemUtils.log(`ToolStrictParser: Uses Max set to ${maxValue}`);
        }
      }
    }

    // --- Extract Recovery Blocks (only if Uses Max > 0) ---
    if (data.usesMax > 0) {
      const recoveryBlocks = this.extractRecoveryBlocks();
      if (recoveryBlocks.length > 0) {
        data.recovery = recoveryBlocks;
        ItemUtils.log(
          `ToolStrictParser: Found ${recoveryBlocks.length} recovery configuration(s)`
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
            `ToolStrictParser: Recovery Period set to "${periodText}"`
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
            `ToolStrictParser: Recovery Type set to "${config.type}"`
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
            `ToolStrictParser: Recovery Formula set to "${formulaText}"`
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
      const chargeValue = parseInt(config.formula);
      if (isNaN(chargeValue) || chargeValue < 2 || chargeValue > 6) {
        this.addWarning(
          `Recovery Period "recharge" requires Formula to be 2, 3, 4, 5, or 6`
        );
        return null;
      }
    }

    return config;
  }

  /**
   * Populates the ItemData instance with parsed tool-specific data.
   * @param {ItemData} item - The ItemData instance to populate.
   * @param {Object} toolData - The object from extractToolFields.
   */
  populateToolFields(item, toolData) {
    // Set tool type and base tool
    item.toolType = toolData.toolType;
    item.baseToolItem = toolData.baseTool;

    // Set magical property
    item.isMagical = toolData.magical;

    // Set tool bonus
    item.toolBonus = toolData.toolBonus;

    // Set attunement
    if (toolData.magical) {
      item.attunement =
        toolData.attunement === "required" ||
        toolData.attunement === "optional";
      item.attunementRequirement = toolData.attunementBy;
    } else {
      item.attunement = false;
      item.attunementRequirement = null;
    }

    // Set ability
    item.toolAbility = toolData.ability;

    // Set uses
    if (toolData.usesMax > 0) {
      item.uses = {
        value: toolData.usesCurrent,
        max: toolData.usesMax,
      };

      // Set recovery configurations
      if (toolData.recovery && toolData.recovery.length > 0) {
        item.recovery = toolData.recovery;
        ItemUtils.log(
          "ToolStrictParser: Recovery configurations set",
          item.recovery
        );
      }
    }

    ItemUtils.log("ToolStrictParser: Tool-specific fields populated", {
      toolType: item.toolType,
      baseTool: item.baseToolItem,
      isMagical: item.isMagical,
      toolBonus: item.toolBonus,
      attunement: item.attunement,
      ability: item.toolAbility,
    });
  }

  /**
   * Validates the parsed tool data.
   * @param {ItemData} item - The ItemData instance to validate.
   * @param {Object} toolData - The extracted tool data for cross-validation.
   * @returns {boolean} - True if validation passes (no critical errors).
   */
  validateTool(item, toolData) {
    let valid = true;

    // Validate tool type is set
    if (item.toolType === null && item.toolType !== "") {
      this.addError("Tool Type is required but was not set");
      valid = false;
    }

    // Validate base tool is set
    if (!item.baseToolItem) {
      this.addError("Base Tool is required but was not set");
      valid = false;
    }

    // CRITICAL: Validate Tool Type and Base Tool match
    if (item.baseToolItem && item.toolType !== null) {
      const expectedType = this.baseToolMappings[item.baseToolItem];

      if (expectedType !== undefined && expectedType !== item.toolType) {
        this.addError(
          `Base Tool "${item.baseToolItem}" does not match Tool Type "${item.toolType}". ` +
            `This base tool requires type "${expectedType || "other"}".`
        );
        valid = false;
      }
    }

    // Validate tool bonus is reasonable
    if (item.toolBonus !== null) {
      if (item.toolBonus < -5 || item.toolBonus > 10) {
        this.addWarning(
          `Tool Bonus ${item.toolBonus} is outside typical range (-5 to +10)`
        );
      }
    }

    // Validate uses
    if (item.uses) {
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

    // Log validation result
    if (valid) {
      ItemUtils.log("ToolStrictParser: Validation passed");
    } else {
      ItemUtils.warn("ToolStrictParser: Validation failed with errors");
    }

    return valid;
  }
}
