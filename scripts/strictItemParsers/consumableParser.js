// scripts/strictItemParsers/consumableParser.js

import { BaseStrictParser } from './baseParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Strict Parser for Consumable items.
 * Extends the BaseStrictParser and adds logic for consumable-specific fields.
 * 
 * Template Specification: Strict_Consumable_Template.md v1.0
 * 
 * Consumable Types:
 * - ammo (requires Ammunition Type)
 * - food
 * - poison (requires Poison Type)
 * - potion
 * - rod
 * - scroll (has spell component flags)
 * - trinket
 * - wand
 * 
 * Conditional Sections:
 * - AMMUNITION PROPERTIES (if type is ammo)
 * - POISON PROPERTIES (if type is poison)
 * - SCROLL PROPERTIES (if type is scroll)
 * - ATTUNEMENT (if magical)
 */
export class ConsumableStrictParser extends BaseStrictParser {
    constructor() {
        super();
    }

    /**
     * Main parse method for Consumable items.
     * @param {string} text - The full text to parse.
     * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
     */
    parse(text) {
        // 1. Parse all universal fields using the parent parser.
        const baseResult = super.parse(text);

        if (!baseResult.success) {
            ItemUtils.warn('ConsumableStrictParser: Base parsing had errors, but continuing with consumable-specific parsing');
            this.errors.push(...baseResult.errors);
            this.warnings.push(...baseResult.warnings);
        }

        const { item } = baseResult;
        ItemUtils.log('ConsumableStrictParser: Base parsing successful, starting consumable-specific parsing...');

        try {
            // 2. Extract consumable-specific fields from the text.
            const consumableData = this.extractConsumableFields();

            // 3. Populate the ItemData object with the new fields.
            this.populateConsumableFields(item, consumableData);

            // 4. Perform any consumable-specific validation.
            if (!this.validateConsumable(item, consumableData)) {
                ItemUtils.warn('ConsumableStrictParser: Validation found issues, but continuing with warnings');
            }

            ItemUtils.log('ConsumableStrictParser: Consumable parsing completed successfully');

        } catch (error) {
            ItemUtils.error('ConsumableStrictParser: Unexpected error during consumable parsing', error);
            this.addError(`Unexpected error during consumable parsing: ${error.message}`);
        }

        // 5. Return the final result.
        const success = this.errors.length === 0;
        return this.createResult(success, item);
    }

    /**
     * Extracts fields specific to Consumable items from the class's `this.lines`.
     * @returns {Object} An object containing the extracted consumable data.
     */
    extractConsumableFields() {
        const data = {
            consumableType: null,
            magical: false,
            attunement: 'none',
            attunementBy: '',

            // Usage fields
            usesCurrent: 0,
            usesMax: 0,
            destroyOnEmpty: false,
            recovery: [],          // Array of recovery configurations

            // Ammunition properties (conditional)
            ammunitionType: null,
            adamantine: false,
            silvered: false,
            returning: false,
            magicBonus: null,

            // Poison properties (conditional)
            poisonType: null,

            // Scroll properties (conditional)
            concentration: false,
            somatic: false,
            verbal: false,
            ritual: false
        };

        // --- Extract Consumable Type (REQUIRED) ---
        const consumableTypeLine = this.findLine(/^Consumable Type:\s*(.+)$/);

        if (!consumableTypeLine) {
            this.addError('Consumable Type is required but was not found');
            return data; // Return early, can't proceed without type
        }

        const match = consumableTypeLine.line.match(/^Consumable Type:\s*(.+)$/);
        const typeText = match[1].trim().toLowerCase();

        const validTypes = ['ammo', 'food', 'poison', 'potion', 'rod', 'scroll', 'trinket', 'wand'];
        if (validTypes.includes(typeText)) {
            data.consumableType = typeText;
            ItemUtils.log(`ConsumableStrictParser: Consumable Type set to "${typeText}"`);
        } else {
            this.addError(`Invalid Consumable Type "${typeText}". Must be one of: ${validTypes.join(', ')}`);
            return data; // Can't proceed with invalid type
        }

        // --- Extract Properties Section ---
        const properties = this.extractPropertiesSection('PROPERTIES', {
            Magical: false
        });

        data.magical = properties.Magical;

        // --- Extract Attunement Section (only if magical) ---
        if (data.magical) {
            const attunementSection = this.findLine(/^---ATTUNEMENT---$/);

            if (attunementSection) {
                ItemUtils.log('ConsumableStrictParser: Found ATTUNEMENT section');

                const attunementLine = this.findLineAfter(attunementSection.index, /^Attunement:\s*(.+)$/);
                if (attunementLine) {
                    const attunementMatch = attunementLine.line.match(/^Attunement:\s*(.+)$/);
                    const attunementText = attunementMatch[1].trim().toLowerCase();
                    const validAttunements = ['none', 'required', 'optional'];

                    if (validAttunements.includes(attunementText)) {
                        data.attunement = attunementText;
                        ItemUtils.log(`ConsumableStrictParser: Attunement set to "${attunementText}"`);
                    } else {
                        this.addWarning(`Invalid Attunement value "${attunementText}". Defaulting to "none".`);
                    }
                }

                const attunementByLine = this.findLineAfter(attunementSection.index, /^Attunement By:\s*(.+)$/);
                if (attunementByLine) {
                    const attunementByMatch = attunementByLine.line.match(/^Attunement By:\s*(.+)$/);
                    const attunementByText = attunementByMatch[1].trim();
                    if (attunementByText.toLowerCase() !== 'blank') {
                        data.attunementBy = attunementByText;
                        ItemUtils.log(`ConsumableStrictParser: Attunement By set to "${attunementByText}"`);
                    }
                }
            }
        }

        // --- Extract Ammunition Properties (only if type is ammo) ---
        if (data.consumableType === 'ammo') {
            const ammoSection = this.findLine(/^---AMMUNITION PROPERTIES---$/);

            if (ammoSection) {
                ItemUtils.log('ConsumableStrictParser: Found AMMUNITION PROPERTIES section');

                // Ammunition Type (REQUIRED for ammo)
                const ammoTypeLine = this.findLineAfter(ammoSection.index, /^Ammunition Type:\s*(.+)$/);
                if (!ammoTypeLine) {
                    this.addError('Ammunition Type is required for ammo consumables');
                } else {
                    const ammoTypeMatch = ammoTypeLine.line.match(/^Ammunition Type:\s*(.+)$/);
                    const ammoTypeText = ammoTypeMatch[1].trim().toLowerCase();

                    // Map template values to exact dnd5e system values (from screenshot)
                    const ammoTypeMap = {
                        'arrow': 'arrow',
                        'bolt': 'crossbowBolt',           // Fixed: not just 'bolt'
                        'crossbowbolt': 'crossbowBolt',   // Accept either format
                        'dart': 'dart',
                        'needle': 'blowgunNeedle',        // Fixed: needles are blowgun needles
                        'blowgunneedle': 'blowgunNeedle',
                        'bullet': 'firearmBullet',        // Fixed: not just 'bullet'
                        'firearmbullet': 'firearmBullet',
                        'slingbullet': 'slingBullet',     // Added: from screenshot
                        'energycell': 'energyCell'        // Added: from screenshot
                    };

                    const systemValue = ammoTypeMap[ammoTypeText];
                    if (systemValue) {
                        data.ammunitionType = systemValue;
                        ItemUtils.log(`ConsumableStrictParser: Ammunition Type "${ammoTypeText}" mapped to "${systemValue}"`);
                    } else {
                        this.addError(`Invalid Ammunition Type "${ammoTypeText}". Must be one of: arrow, bolt, dart, needle, bullet, slingBullet, energyCell`);
                    }
                }

                // Extract ammunition boolean properties using helper
                const ammoProperties = this.extractPropertiesSection('AMMUNITION PROPERTIES', {
                    Adamantine: false,
                    Silvered: false,
                    Returning: false
                });

                data.adamantine = ammoProperties.Adamantine;
                data.silvered = ammoProperties.Silvered;
                data.returning = ammoProperties.Returning;

                // Magic Bonus (optional)
                const magicBonusLine = this.findLineAfter(ammoSection.index, /^Magic Bonus:\s*(.+)$/);
                if (magicBonusLine) {
                    const magicBonusMatch = magicBonusLine.line.match(/^Magic Bonus:\s*(.+)$/);
                    const bonusText = magicBonusMatch[1].trim().toLowerCase();

                    if (bonusText !== 'blank' && bonusText !== '') {
                        const bonusValue = parseInt(bonusText);
                        if (!isNaN(bonusValue) && bonusValue >= 0) {
                            data.magicBonus = bonusValue;
                            ItemUtils.log(`ConsumableStrictParser: Magic Bonus set to +${bonusValue}`);
                        } else {
                            this.addWarning(`Invalid Magic Bonus value "${bonusText}". Must be a positive integer.`);
                        }
                    }
                }

                // Damage Formula (optional for ammunition)
                const damageFormulaLine = this.findLineAfter(ammoSection.index, /^Damage Formula:\s*(.+)$/);
                if (damageFormulaLine) {
                    const formulaMatch = damageFormulaLine.line.match(/^Damage Formula:\s*(.+)$/);
                    const formulaText = formulaMatch[1].trim().toLowerCase();

                    if (formulaText !== 'blank' && formulaText !== '') {
                        data.damageFormula = formulaText;
                        ItemUtils.log(`ConsumableStrictParser: Damage Formula set to "${formulaText}"`);
                    }
                }

                // Damage Type (optional, but recommended if formula is provided)
                const damageTypeLine = this.findLineAfter(ammoSection.index, /^Damage Type:\s*(.+)$/);
                if (damageTypeLine) {
                    const typeMatch = damageTypeLine.line.match(/^Damage Type:\s*(.+)$/);
                    const damageTypeText = typeMatch[1].trim().toLowerCase();

                    if (damageTypeText !== 'blank' && damageTypeText !== '') {
                        // Support comma-separated damage types
                        const types = damageTypeText.split(',').map(t => t.trim());
                        const validDamageTypes = [
                            'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
                            'necrotic', 'piercing', 'poison', 'psychic', 'radiant',
                            'slashing', 'thunder'
                        ];

                        const invalidTypes = types.filter(t => !validDamageTypes.includes(t));
                        if (invalidTypes.length > 0) {
                            this.addWarning(`Invalid Damage Type(s): ${invalidTypes.join(', ')}`);
                        } else {
                            // Store as array if multiple, or single string if one
                            data.damageType = types.length === 1 ? types[0] : types;
                            ItemUtils.log(`ConsumableStrictParser: Damage Type set to ${types.length === 1 ? '"' + types[0] + '"' : 'array [' + types.join(', ') + ']'}`);
                        }
                    }
                }

                // Damage Replace (optional, defaults to false)
                const damageReplaceLine = this.findLineAfter(ammoSection.index, /^Damage Replace:\s*(true|false)$/i);
                if (damageReplaceLine) {
                    const replaceMatch = damageReplaceLine.line.match(/^Damage Replace:\s*(true|false)$/i);
                    data.damageReplace = (replaceMatch[1].toLowerCase() === 'true');
                    ItemUtils.log(`ConsumableStrictParser: Damage Replace set to ${data.damageReplace}`);
                } else {
                    data.damageReplace = false; // Default to false
                }
            } else {
                // Ammunition type requires this section
                this.addError('AMMUNITION PROPERTIES section is required for ammo consumables');
            }
        }

        // --- Extract Poison Properties (only if type is poison) ---
        if (data.consumableType === 'poison') {
            const poisonSection = this.findLine(/^---POISON PROPERTIES---$/);

            if (poisonSection) {
                ItemUtils.log('ConsumableStrictParser: Found POISON PROPERTIES section');

                // Poison Type (REQUIRED for poison)
                const poisonTypeLine = this.findLineAfter(poisonSection.index, /^Poison Type:\s*(.+)$/);
                if (!poisonTypeLine) {
                    this.addError('Poison Type is required for poison consumables but was not found');
                } else {
                    const poisonTypeMatch = poisonTypeLine.line.match(/^Poison Type:\s*(.+)$/);
                    const poisonTypeText = poisonTypeMatch[1].trim().toLowerCase();
                    const validPoisonTypes = ['contact', 'ingested', 'inhaled', 'injury'];

                    if (validPoisonTypes.includes(poisonTypeText)) {
                        data.poisonType = poisonTypeText;
                        ItemUtils.log(`ConsumableStrictParser: Poison Type set to "${poisonTypeText}"`);
                    } else {
                        this.addError(`Invalid Poison Type "${poisonTypeText}". Must be one of: contact, ingested, inhaled, injury`);
                    }
                }
            } else {
                // Poison type requires this section
                this.addError('POISON PROPERTIES section is required for poison consumables');
            }
        }

        // --- Extract Scroll Properties (only if type is scroll) ---
        if (data.consumableType === 'scroll') {
            const scrollSection = this.findLine(/^---SCROLL PROPERTIES---$/);

            if (scrollSection) {
                ItemUtils.log('ConsumableStrictParser: Found SCROLL PROPERTIES section');

                // Extract scroll boolean properties using helper
                const scrollProperties = this.extractPropertiesSection('SCROLL PROPERTIES', {
                    Concentration: false,
                    Somatic: false,
                    Verbal: false,
                    Ritual: false
                });

                data.concentration = scrollProperties.Concentration;
                data.somatic = scrollProperties.Somatic;
                data.verbal = scrollProperties.Verbal;
                data.ritual = scrollProperties.Ritual;
            }
            // Note: SCROLL PROPERTIES section is optional for scrolls
        }

        // --- Extract Usage Section ---
        const usageSection = this.findLine(/^---USAGE---$/);

        if (usageSection) {
            ItemUtils.log('ConsumableStrictParser: Found USAGE section');

            // Uses Current
            const usesCurrentLine = this.findLineAfter(usageSection.index, /^Uses Current:\s*(.+)$/);
            if (usesCurrentLine) {
                const currentMatch = usesCurrentLine.line.match(/^Uses Current:\s*(.+)$/);
                const currentText = currentMatch[1].trim();
                const currentValue = parseInt(currentText);

                if (!isNaN(currentValue) && currentValue >= 0) {
                    data.usesCurrent = currentValue;
                    ItemUtils.log(`ConsumableStrictParser: Uses Current set to ${currentValue}`);
                } else {
                    this.addWarning(`Invalid Uses Current value "${currentText}". Must be a non-negative integer.`);
                }
            }

            // Uses Max
            const usesMaxLine = this.findLineAfter(usageSection.index, /^Uses Max:\s*(.+)$/);
            if (usesMaxLine) {
                const maxMatch = usesMaxLine.line.match(/^Uses Max:\s*(.+)$/);
                const maxText = maxMatch[1].trim();
                const maxValue = parseInt(maxText);

                if (!isNaN(maxValue) && maxValue >= 0) {
                    data.usesMax = maxValue;
                    ItemUtils.log(`ConsumableStrictParser: Uses Max set to ${maxValue}`);
                } else {
                    this.addWarning(`Invalid Uses Max value "${maxText}". Must be a non-negative integer.`);
                }
            }

            // Destroy on Empty
            const destroyLine = this.findLineAfter(usageSection.index, /^Destroy on Empty:\s*(true|false)$/i);
            if (destroyLine) {
                const destroyMatch = destroyLine.line.match(/^Destroy on Empty:\s*(true|false)$/i);
                data.destroyOnEmpty = (destroyMatch[1].toLowerCase() === 'true');
                ItemUtils.log(`ConsumableStrictParser: Destroy on Empty set to ${data.destroyOnEmpty}`);
            }
        }

        // --- Extract Recovery Blocks (only if Uses Max > 0) ---
        if (data.usesMax > 0) {
            const recoveryBlocks = this.extractRecoveryBlocks();
            if (recoveryBlocks.length > 0) {
                data.recovery = recoveryBlocks;
                ItemUtils.log(`ConsumableStrictParser: Found ${recoveryBlocks.length} recovery configuration(s)`);
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
                if (this.lines[i].trim() === '---RECOVERY---') {
                    recoveryStart = i;
                    break;
                }
            }
            
            if (recoveryStart === null) break; // No more recovery blocks
            
            // Find the end marker
            let recoveryEnd = null;
            for (let i = recoveryStart + 1; i < this.lines.length; i++) {
                if (this.lines[i].trim() === '===END RECOVERY===') {
                    recoveryEnd = i;
                    break;
                }
            }
            
            if (recoveryEnd === null) {
                this.addWarning('Found ---RECOVERY--- without matching ===END RECOVERY===');
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
            formula: null
        };
        
        // Valid values
        const validPeriods = ['lr', 'sr', 'day', 'dawn', 'dusk', 'recharge'];
        const validTypes = ['recoverAll', 'loseAll', 'formula'];
        
        // Search within the block for each field
        for (let i = startIndex + 1; i < endIndex; i++) {
            const line = this.lines[i].trim();
            
            // Period
            const periodMatch = line.match(/^Period:\s*(.+)$/i);
            if (periodMatch) {
                const periodText = periodMatch[1].trim().toLowerCase();
                if (validPeriods.includes(periodText)) {
                    config.period = periodText;
                    ItemUtils.log(`ConsumableStrictParser: Recovery Period set to "${periodText}"`);
                } else {
                    this.addWarning(`Invalid Recovery Period "${periodText}". Must be one of: ${validPeriods.join(', ')}`);
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
                    'recoverall': 'recoverAll',
                    'loseall': 'loseAll',
                    'formula': 'formula'
                };
                
                if (typeMap[typeLower]) {
                    config.type = typeMap[typeLower];
                    ItemUtils.log(`ConsumableStrictParser: Recovery Type set to "${config.type}"`);
                } else {
                    this.addWarning(`Invalid Recovery Type "${typeText}". Must be one of: ${validTypes.join(', ')}`);
                }
                continue;
            }
            
            // Formula
            const formulaMatch = line.match(/^Formula:\s*(.+)$/i);
            if (formulaMatch) {
                const formulaText = formulaMatch[1].trim();
                if (formulaText.toLowerCase() !== 'blank' && formulaText !== '') {
                    config.formula = formulaText;
                    ItemUtils.log(`ConsumableStrictParser: Recovery Formula set to "${formulaText}"`);
                }
                continue;
            }
        }
        
        // Validate required fields
        if (!config.period) {
            this.addWarning('Recovery block missing Period field');
            return null;
        }
        if (!config.type) {
            this.addWarning('Recovery block missing Type field');
            return null;
        }
        
        // Validate formula requirements
        if (config.type === 'formula' && !config.formula) {
            this.addWarning(`Recovery Type "formula" requires a Formula value`);
            return null;
        }
        
        // Validate recharge period has valid formula (2-6)
        if (config.period === 'recharge') {
            const rechargeValue = parseInt(config.formula);
            if (isNaN(rechargeValue) || rechargeValue < 2 || rechargeValue > 6) {
                this.addWarning(`Recovery Period "recharge" requires Formula to be 2, 3, 4, 5, or 6`);
                return null;
            }
        }
        
        return config;
    }

    /**
     * Populates the ItemData instance with parsed consumable-specific data.
     * @param {ItemData} item - The ItemData instance to populate.
     * @param {Object} consumableData - The object from extractConsumableFields.
     */
    populateConsumableFields(item, consumableData) {
        // Set consumable type
        item.consumableType = consumableData.consumableType;

        // Set magical property
        item.isMagical = consumableData.magical;

        // Set attunement
        if (consumableData.magical) {
            item.attunement = (consumableData.attunement === 'required' || consumableData.attunement === 'optional');
            item.attunementRequirement = consumableData.attunementBy;
        } else {
            item.attunement = false;
            item.attunementRequirement = null;
        }

        // Set usage fields
        if (consumableData.usesMax > 0) {
            item.uses = {
                value: consumableData.usesCurrent,
                max: consumableData.usesMax
            };
            
            // Set recovery configurations
            if (consumableData.recovery && consumableData.recovery.length > 0) {
                item.recovery = consumableData.recovery;
                ItemUtils.log('ConsumableStrictParser: Recovery configurations set', item.recovery);
            }
        }
        item.autoDestroy = consumableData.destroyOnEmpty;

        // Set ammunition properties (if ammo)
        if (consumableData.consumableType === 'ammo') {
            item.ammunitionType = consumableData.ammunitionType;
            item.adamantine = consumableData.adamantine;
            item.silvered = consumableData.silvered;
            item.returning = consumableData.returning;
            item.magicBonus = consumableData.magicBonus;

            // Set ammunition damage and replace flag
            if (consumableData.damageFormula) {
                item.damage = {
                    formula: consumableData.damageFormula,
                    type: consumableData.damageType
                };
                ItemUtils.log('ConsumableStrictParser: Ammunition damage set', item.damage);
            }
            item.damageReplace = consumableData.damageReplace;
        }

        // Set poison type (if poison)
        if (consumableData.consumableType === 'poison') {
            item.poisonType = consumableData.poisonType;
        }

        // Set scroll properties (if scroll)
        if (consumableData.consumableType === 'scroll') {
            item.concentration = consumableData.concentration;
            item.somatic = consumableData.somatic;
            item.verbal = consumableData.verbal;
            item.ritual = consumableData.ritual;
        }

        ItemUtils.log('ConsumableStrictParser: Consumable-specific fields populated', {
            consumableType: item.consumableType,
            isMagical: item.isMagical,
            attunement: item.attunement,
            uses: item.uses,
            autoDestroy: item.autoDestroy,
            ammunitionType: item.ammunitionType,
            poisonType: item.poisonType
        });
    }

    /**
     * Validates the parsed consumable data.
     * @param {ItemData} item - The ItemData instance to validate.
     * @param {Object} consumableData - The extracted consumable data for cross-validation.
     * @returns {boolean} - True if validation passes (no critical errors).
     */
    validateConsumable(item, consumableData) {
        let valid = true;

        // Validate consumable type is set
        if (!item.consumableType) {
            this.addError('Consumable Type is required but was not set');
            valid = false;
        }

        // Validate ammunition has ammunition type
        if (item.consumableType === 'ammo' && !item.ammunitionType) {
            this.addError('Ammunition Type is required for ammo consumables');
            valid = false;
        }

        // Validate poison has poison type
        if (item.consumableType === 'poison' && !item.poisonType) {
            this.addError('Poison Type is required for poison consumables');
            valid = false;
        }

        // Validate uses
        if (item.uses) {
            if (item.uses.value < 0) {
                this.addWarning('Uses Current cannot be negative');
            }
            if (item.uses.max < 0) {
                this.addError('Uses Max cannot be negative');
                valid = false;
            }
            if (item.uses.value > item.uses.max) {
                this.addWarning(`Uses Current (${item.uses.value}) exceeds Uses Max (${item.uses.max})`);
            }
        }

        // Validate recovery configurations
        if (item.recovery && item.recovery.length > 0) {
            if (!item.uses || item.uses.max <= 0) {
                this.addWarning('Recovery configurations specified but Uses Max is 0 or not set');
            }
            
            for (let i = 0; i < item.recovery.length; i++) {
                const rec = item.recovery[i];
                if (rec.type === 'formula' && !rec.formula) {
                    this.addWarning(`Recovery configuration ${i + 1}: Type "formula" requires a formula`);
                }
            }
        }

        // Validate magic bonus range
        if (item.magicBonus !== null) {
            if (item.magicBonus < 0 || item.magicBonus > 3) {
                this.addWarning(`Magic Bonus (${item.magicBonus}) should typically be between 0 and 3`);
            }
        }

        // Log validation result
        if (valid) {
            ItemUtils.log('ConsumableStrictParser: Validation passed');
        } else {
            ItemUtils.warn('ConsumableStrictParser: Validation failed with errors');
        }

        return valid;
    }
}