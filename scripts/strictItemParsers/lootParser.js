// scripts/strictItemParsers/lootParser.js

import { BaseStrictParser } from './baseParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Strict Parser for Loot items.
 * Extends the BaseStrictParser and adds logic for loot-specific fields.
 * 
 * Template Specification: Strict_Loot_Template.md v1.0
 * - Loot Type (required): art|gear|gem|junk|material|resource|treasure
 * - Magical (optional): true|false
 * - No attunement fields (loot items don't have attunement)
 */
export class LootStrictParser extends BaseStrictParser {
    constructor() {
        super();
    }

    /**
     * Main parse method for Loot items.
     * @param {string} text - The full text to parse.
     * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
     */
    parse(text) {
        // 1. Parse all universal fields using the parent parser.
        const baseResult = super.parse(text);

        // Collect base parsing errors but continue with tool-specific parsing
        if (!baseResult.success) {
            ItemUtils.warn('ToolStrictParser: Base parsing had errors, but continuing with tool-specific parsing');
            this.errors.push(...baseResult.errors);
            this.warnings.push(...baseResult.warnings);
        }

        const { item } = baseResult;
        ItemUtils.log('LootStrictParser: Base parsing successful, starting loot-specific parsing...');

        try {
            // 2. Extract loot-specific fields from the text.
            const lootData = this.extractLootFields();

            // 3. Populate the ItemData object with the new fields.
            this.populateLootFields(item, lootData);

            // 4. Perform any loot-specific validation.
            if (!this.validateLoot(item)) {
                ItemUtils.warn('LootStrictParser: Validation found issues, but continuing with warnings');
            }

            ItemUtils.log('LootStrictParser: Loot parsing completed successfully');

        } catch (error) {
            ItemUtils.error('LootStrictParser: Unexpected error during loot parsing', error);
            this.addError(`Unexpected error during loot parsing: ${error.message}`);
        }

        // 5. Return the final result.
        // Success is true only if there are no errors
        const success = this.errors.length === 0;
        return this.createResult(success, item);
    }

    /**
     * Extracts fields specific to Loot items from the class's `this.lines`.
     * @returns {Object} An object containing the extracted loot data.
     */
    extractLootFields() {
        const data = {
            lootType: null,  // Required field - start as null to detect if missing
            magical: false   // Optional field - defaults to false
        };

        // --- Extract Loot Type (REQUIRED) ---
        const lootTypeLine = this.findLine(/^Loot Type:\s*(.+)$/);

        if (!lootTypeLine) {
            this.addError('Loot Type field is required but was not found. Using fallback: gear');
            data.lootType = 'gear'; // Fallback default
        } else {
            const match = lootTypeLine.line.match(/^Loot Type:\s*(.+)$/);
            const lootTypeText = match[1].trim().toLowerCase();

            // Valid loot types from template specification
            const validLootTypes = ['art', 'gear', 'gem', 'junk', 'material', 'resource', 'treasure'];

            if (validLootTypes.includes(lootTypeText)) {
                data.lootType = lootTypeText;
                ItemUtils.log(`LootStrictParser: Loot Type set to "${lootTypeText}"`);
            } else {
                this.addError(`Invalid Loot Type "${lootTypeText}". Must be one of: ${validLootTypes.join(', ')}`);
                data.lootType = 'gear'; // Fallback default
            }
        }

        // --- Extract Properties Section (for Magical status) ---
        const properties = this.extractPropertiesSection('PROPERTIES', {
            Magical: false
        });

        data.magical = properties.Magical;

        return data;
    }

    /**
     * Populates the ItemData instance with parsed loot-specific data.
     * @param {ItemData} item - The ItemData instance to populate.
     * @param {Object} lootData - The object from extractLootFields.
     */
    populateLootFields(item, lootData) {
        // Set loot type
        item.lootType = lootData.lootType;

        // Set magical property
        item.isMagical = lootData.magical;

        // Loot items do NOT have attunement (per template specification)
        item.attunement = false;
        item.attunementRequirement = null;

        ItemUtils.log('LootStrictParser: Loot-specific fields populated', {
            lootType: item.lootType,
            isMagical: item.isMagical,
            attunement: item.attunement
        });
    }

    /**
     * Validates the parsed loot data.
     * @param {ItemData} item - The ItemData instance to validate.
     * @returns {boolean} - True if validation passes (no critical errors).
     */
    validateLoot(item) {
        let valid = true;

        // Validate loot type is set
        if (!item.lootType) {
            this.addError('Loot Type is required but was not set');
            valid = false;
        }

        // Validate loot type is in valid list
        const validLootTypes = ['art', 'gear', 'gem', 'junk', 'material', 'resource', 'treasure'];
        if (item.lootType && !validLootTypes.includes(item.lootType)) {
            this.addError(`Invalid loot type "${item.lootType}". Must be one of: ${validLootTypes.join(', ')}`);
            valid = false;
        }

        // Validate magical is boolean
        if (typeof item.isMagical !== 'boolean') {
            this.addWarning('Magical property should be a boolean value');
        }

        // Log validation result
        if (valid) {
            ItemUtils.log('LootStrictParser: Validation passed');
        } else {
            ItemUtils.warn('LootStrictParser: Validation failed with errors');
        }

        return valid;
    }
}