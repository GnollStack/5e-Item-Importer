// scripts/strictItemParsers/spellParser.js

import { BaseStrictParser } from './baseParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Strict Parser for Spell items.
 * Extends the BaseStrictParser and adds logic for spell-specific fields.
 * 
 * Template Specification: Strict_Spell_Template.md v2.0
 * 
 * Schools:
 * - abj (Abjuration), con (Conjuration), div (Divination), enc (Enchantment)
 * - evo (Evocation), ill (Illusion), nec (Necromancy), trs (Transmutation)
 * 
 * Preparation Modes:
 * - atwill, innate, ritual, pact, prepared
 */

const VALID_SCHOOLS = ['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs'];

const VALID_RANGE_UNITS = ['self', 'touch', 'spec', 'any', 'ft', 'mi', 'm', 'km'];

const VALID_DURATION_UNITS = [
    'inst', 'spec', 'turn', 'round', 'minute', 'hour',
    'day', 'month', 'year', 'disp', 'dstr', 'perm'
];

const VALID_TARGET_TYPES = [
    'self', 'ally', 'enemy', 'creature', 'object', 'space',
    'creatureOrObject', 'any', 'willing'
];

const VALID_AREA_SHAPES = [
    'cone', 'cube', 'cylinder', 'radius', 'line', 'sphere',
    'circle', 'square', 'wall'
];

const VALID_RECOVERY_PERIODS = [
    'lr', 'sr', 'day', 'dawn', 'dusk', 'recharge'
];

const VALID_RECOVERY_TYPES = ['recoverAll', 'loseAll', 'formula'];

export class SpellStrictParser extends BaseStrictParser {

    /**
     * Spells don't have physical inventory properties or cost/weight.
     * They do have descriptions, unidentified states (for scroll identification), 
     * and chat flavor text.
     */
    static SECTIONS = {
        inventory: false,
        costWeight: false,
        description: true,
        unidentified: true,
        chatFlavor: true
    };

    constructor() {
        super();
    }

    /**
     * Main parse method for Spell items.
     * @param {string} text - The full text to parse.
     * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
     */
    parse(text) {
        const baseResult = super.parse(text);

        if (!baseResult.success) {
            ItemUtils.warn('SpellStrictParser: Base parsing had errors, but continuing with spell-specific parsing');
            this.errors.push(...baseResult.errors);
            this.warnings.push(...baseResult.warnings);
        }

        const { item } = baseResult;

        if (item) {
            item.type = 'spell';
        }

        ItemUtils.log('SpellStrictParser: Base parsing complete, starting spell-specific parsing...');

        try {
            const spellData = this.extractSpellFields();
            this.populateSpellFields(item, spellData);

            if (!this.validateSpell(item, spellData)) {
                ItemUtils.warn('SpellStrictParser: Validation found issues, but continuing with warnings');
            }

            ItemUtils.log('SpellStrictParser: Spell parsing completed successfully');

        } catch (error) {
            ItemUtils.error('SpellStrictParser: Unexpected error during spell parsing', error);
            this.addError(`Unexpected error during spell parsing: ${error.message}`);
        }

        const success = this.errors.length === 0;
        return this.createResult(success, item);
    }

    /**
     * Extracts fields specific to Spell items from the class's `this.lines`.
     * @returns {Object} An object containing the extracted spell data.
     */
    extractSpellFields() {
        const data = {
            level: 0,
            school: null,
            vocal: false,
            somatic: false,
            material: false,
            materialValue: '',
            materialCost: null,
            materialSupply: null,
            materialConsumed: false,
            preparationMode: 'prepared',
            prepared: false,
            activationType: 'action',
            activationValue: null,
            activationCondition: '',
            rangeUnits: 'ft',
            rangeValue: null,
            rangeSpecial: '',
            durationUnits: 'inst',
            durationValue: null,
            targetType: null,
            targetCount: null,
            targetChoice: false,
            targetSpecial: '',
            areaShape: null,
            areaSize: null,
            areaUnits: 'ft',
            usesCurrent: 0,
            usesMax: 0,
            recovery: []
        };

        // --- Extract Level (REQUIRED) ---
        const levelLine = this.findLine(/^Level:\s*(.+)$/);
        if (!levelLine) {
            this.addError('Spell Level is required but was not found');
        } else {
            const levelMatch = levelLine.line.match(/^Level:\s*(.+)$/);
            const levelText = levelMatch[1].trim();
            const levelValue = parseInt(levelText);

            if (!isNaN(levelValue) && levelValue >= 0 && levelValue <= 9) {
                data.level = levelValue;
                ItemUtils.log(`SpellStrictParser: Level set to ${levelValue}`);
            } else {
                this.addError(`Invalid spell level "${levelText}". Must be 0-9.`);
            }
        }

        // --- Extract School (REQUIRED) ---
        const schoolLine = this.findLine(/^School:\s*(.*)$/);
        if (!schoolLine) {
            this.addError('Spell School is required but was not found');
        } else {
            const schoolMatch = schoolLine.line.match(/^School:\s*(.*)$/);
            const schoolText = schoolMatch[1].trim().toLowerCase();

            if (schoolText === '') {
                this.addWarning('School is empty, defaulting to evocation');
                data.school = 'evo';
            } else if (VALID_SCHOOLS.includes(schoolText)) {
                data.school = schoolText;
                ItemUtils.log(`SpellStrictParser: School set to "${schoolText}"`);
            } else {
                this.addError(`Invalid spell school "${schoolText}". Must be one of: ${VALID_SCHOOLS.join(', ')}`);
            }
        }

        // --- Extract Components Section ---
        const componentsSection = this.findLine(/^---COMPONENTS---$/);
        if (componentsSection) {
            ItemUtils.log('SpellStrictParser: Found COMPONENTS section');

            const vocalLine = this.findLineAfter(componentsSection.index, /^Vocal:\s*(true|false)$/i);
            if (vocalLine) {
                data.vocal = vocalLine.line.match(/^Vocal:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                ItemUtils.log(`SpellStrictParser: Vocal component set to ${data.vocal}`);
            }

            const somaticLine = this.findLineAfter(componentsSection.index, /^Somatic:\s*(true|false)$/i);
            if (somaticLine) {
                data.somatic = somaticLine.line.match(/^Somatic:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                ItemUtils.log(`SpellStrictParser: Somatic component set to ${data.somatic}`);
            }

            const materialLine = this.findLineAfter(componentsSection.index, /^Material:\s*(true|false)$/i);
            if (materialLine) {
                data.material = materialLine.line.match(/^Material:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                ItemUtils.log(`SpellStrictParser: Material component set to ${data.material}`);
            }
        }

        // --- Extract Materials Section (only if material component is true) ---
        if (data.material) {
            const materialsSection = this.findLine(/^---MATERIALS---$/);
            if (materialsSection) {
                ItemUtils.log('SpellStrictParser: Found MATERIALS section');

                const materialValueLine = this.findLineAfter(materialsSection.index, /^Value:\s*(.*)$/);
                if (materialValueLine) {
                    const valueText = materialValueLine.line.match(/^Value:\s*(.*)$/)[1].trim();
                    if (valueText) {
                        data.materialValue = valueText;
                        ItemUtils.log(`SpellStrictParser: Material value set to "${valueText}"`);
                    }
                }

                const materialCostLine = this.findLineAfter(materialsSection.index, /^Cost:\s*(.*)$/);
                if (materialCostLine) {
                    const costText = materialCostLine.line.match(/^Cost:\s*(.*)$/)[1].trim();
                    if (costText) {
                        const costValue = parseInt(costText);
                        if (!isNaN(costValue) && costValue >= 0) {
                            data.materialCost = costValue;
                            ItemUtils.log(`SpellStrictParser: Material cost set to ${costValue}`);
                        }
                    }
                }

                const materialSupplyLine = this.findLineAfter(materialsSection.index, /^Supply:\s*(.*)$/);
                if (materialSupplyLine) {
                    const supplyText = materialSupplyLine.line.match(/^Supply:\s*(.*)$/)[1].trim();
                    if (supplyText) {
                        const supplyValue = parseInt(supplyText);
                        if (!isNaN(supplyValue) && supplyValue >= 0) {
                            data.materialSupply = supplyValue;
                            ItemUtils.log(`SpellStrictParser: Material supply set to ${supplyValue}`);
                        }
                    }
                }

                const consumedLine = this.findLineAfter(materialsSection.index, /^Consumed:\s*(true|false)$/i);
                if (consumedLine) {
                    data.materialConsumed = consumedLine.line.match(/^Consumed:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                    ItemUtils.log(`SpellStrictParser: Material consumed set to ${data.materialConsumed}`);
                }
            }
        }

        // --- Extract Preparation Section ---
        const preparationSection = this.findLine(/^---PREPARATION---$/);
        if (preparationSection) {
            ItemUtils.log('SpellStrictParser: Found PREPARATION section');

            const methodLine = this.findLineAfter(preparationSection.index, /^Method:\s*(.*)$/);
            if (methodLine) {
                const methodText = methodLine.line.match(/^Method:\s*(.*)$/)[1].trim().toLowerCase();
                const validMethods = ['atwill', 'innate', 'ritual', 'pact', 'prepared'];

                if (methodText === '') {
                    data.preparationMode = 'prepared';
                } else if (validMethods.includes(methodText)) {
                    data.preparationMode = methodText;
                    ItemUtils.log(`SpellStrictParser: Preparation mode set to "${methodText}"`);
                } else {
                    this.addWarning(`Invalid preparation method "${methodText}", defaulting to prepared`);
                    data.preparationMode = 'prepared';
                }
            }

            const preparedLine = this.findLineAfter(preparationSection.index, /^Prepared:\s*(true|false)$/i);
            if (preparedLine) {
                data.prepared = preparedLine.line.match(/^Prepared:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                ItemUtils.log(`SpellStrictParser: Prepared set to ${data.prepared}`);
            }
        }

        // --- Extract Activation Section ---
        const activationSection = this.findLine(/^---ACTIVATION---$/);
        if (activationSection) {
            ItemUtils.log('SpellStrictParser: Found ACTIVATION section');

            const typeLine = this.findLineAfter(activationSection.index, /^Type:\s*(.*)$/);
            if (typeLine) {
                const typeText = typeLine.line.match(/^Type:\s*(.*)$/)[1].trim().toLowerCase();

                const typeMap = {
                    'action': 'action',
                    'bonus': 'bonus',
                    'reaction': 'reaction',
                    'minute': 'minute',
                    'hour': 'hour',
                    'day': 'day',
                    'special': 'special'
                };

                if (typeMap[typeText]) {
                    data.activationType = typeMap[typeText];
                    ItemUtils.log(`SpellStrictParser: Activation type set to "${typeMap[typeText]}"`);
                } else if (typeText) {
                    this.addWarning(`Invalid activation type "${typeText}", defaulting to action`);
                }
            }

            const valueLine = this.findLineAfter(activationSection.index, /^Value:\s*(.*)$/);
            if (valueLine) {
                const valueText = valueLine.line.match(/^Value:\s*(.*)$/)[1].trim();
                if (valueText) {
                    const value = parseInt(valueText);
                    if (!isNaN(value) && value > 0) {
                        data.activationValue = value;
                        ItemUtils.log(`SpellStrictParser: Activation value set to ${value}`);
                    }
                }
            }

            const conditionLine = this.findLineAfter(activationSection.index, /^Condition:\s*(.*)$/);
            if (conditionLine) {
                const condText = conditionLine.line.match(/^Condition:\s*(.*)$/)[1].trim();
                if (condText) {
                    data.activationCondition = condText;
                    ItemUtils.log(`SpellStrictParser: Activation condition set to "${condText}"`);
                }
            }
        }

        // --- Extract Range Section ---
        const rangeSection = this.findLine(/^---RANGE---$/);
        if (rangeSection) {
            ItemUtils.log('SpellStrictParser: Found RANGE section');

            const unitsLine = this.findLineAfter(rangeSection.index, /^Units:\s*(.*)$/);
            if (unitsLine) {
                const unitsText = unitsLine.line.match(/^Units:\s*(.*)$/)[1].trim().toLowerCase();
                if (VALID_RANGE_UNITS.includes(unitsText)) {
                    data.rangeUnits = unitsText;
                    ItemUtils.log(`SpellStrictParser: Range units set to "${unitsText}"`);
                }
            }

            const valueLine = this.findLineAfter(rangeSection.index, /^Value:\s*(.*)$/);
            if (valueLine) {
                const valueText = valueLine.line.match(/^Value:\s*(.*)$/)[1].trim();
                if (valueText) {
                    const value = parseInt(valueText);
                    if (!isNaN(value) && value >= 0) {
                        data.rangeValue = value;
                        ItemUtils.log(`SpellStrictParser: Range value set to ${value}`);
                    }
                }
            }

            const specialLine = this.findLineAfter(rangeSection.index, /^Special:\s*(.*)$/);
            if (specialLine) {
                const specText = specialLine.line.match(/^Special:\s*(.*)$/)[1].trim();
                if (specText) {
                    data.rangeSpecial = specText;
                    ItemUtils.log(`SpellStrictParser: Range special set to "${specText}"`);
                }
            }
        }

        // --- Extract Duration Section ---
        const durationSection = this.findLine(/^---DURATION---$/);
        if (durationSection) {
            ItemUtils.log('SpellStrictParser: Found DURATION section');

            const unitsLine = this.findLineAfter(durationSection.index, /^Units:\s*(.*)$/);
            if (unitsLine) {
                const unitsText = unitsLine.line.match(/^Units:\s*(.*)$/)[1].trim().toLowerCase();
                if (VALID_DURATION_UNITS.includes(unitsText)) {
                    data.durationUnits = unitsText;
                    ItemUtils.log(`SpellStrictParser: Duration units set to "${unitsText}"`);
                }
            }

            const valueLine = this.findLineAfter(durationSection.index, /^Value:\s*(.*)$/);
            if (valueLine) {
                const valueText = valueLine.line.match(/^Value:\s*(.*)$/)[1].trim();
                if (valueText) {
                    const value = parseInt(valueText);
                    if (!isNaN(value) && value >= 0) {
                        data.durationValue = value;
                        ItemUtils.log(`SpellStrictParser: Duration value set to ${value}`);
                    }
                }
            }
        }

        // --- Extract Targets Section ---
        const targetsSection = this.findLine(/^---TARGETS---$/);
        if (targetsSection) {
            ItemUtils.log('SpellStrictParser: Found TARGETS section');

            const typeLine = this.findLineAfter(targetsSection.index, /^Type:\s*(.*)$/);
            if (typeLine) {
                const typeText = typeLine.line.match(/^Type:\s*(.*)$/)[1].trim().toLowerCase();

                const typeMap = {
                    'self': 'self',
                    'ally': 'ally',
                    'enemy': 'enemy',
                    'creature': 'creature',
                    'object': 'object',
                    'space': 'space',
                    'creatureorobject': 'creatureOrObject',
                    'any': 'any',
                    'willing': 'willing'
                };

                if (typeMap[typeText]) {
                    data.targetType = typeMap[typeText];
                    ItemUtils.log(`SpellStrictParser: Target type set to "${typeMap[typeText]}"`);
                }
            }

            const countLine = this.findLineAfter(targetsSection.index, /^Count:\s*(.*)$/);
            if (countLine) {
                const countText = countLine.line.match(/^Count:\s*(.*)$/)[1].trim();
                if (countText) {
                    const count = parseInt(countText);
                    if (!isNaN(count) && count > 0) {
                        data.targetCount = count;
                        ItemUtils.log(`SpellStrictParser: Target count set to ${count}`);
                    }
                }
            }

            const choiceLine = this.findLineAfter(targetsSection.index, /^Choice:\s*(true|false)$/i);
            if (choiceLine) {
                data.targetChoice = choiceLine.line.match(/^Choice:\s*(true|false)$/i)[1].toLowerCase() === 'true';
                ItemUtils.log(`SpellStrictParser: Target choice set to ${data.targetChoice}`);
            }

            const specialLine = this.findLineAfter(targetsSection.index, /^Special:\s*(.*)$/);
            if (specialLine) {
                const specText = specialLine.line.match(/^Special:\s*(.*)$/)[1].trim();
                if (specText) {
                    data.targetSpecial = specText;
                    ItemUtils.log(`SpellStrictParser: Target special set to "${specText}"`);
                }
            }
        }

        // --- Extract Area Section ---
        const areaSection = this.findLine(/^---AREA---$/);
        if (areaSection) {
            ItemUtils.log('SpellStrictParser: Found AREA section');

            const shapeLine = this.findLineAfter(areaSection.index, /^Shape:\s*(.*)$/);
            if (shapeLine) {
                const shapeText = shapeLine.line.match(/^Shape:\s*(.*)$/)[1].trim().toLowerCase();
                if (VALID_AREA_SHAPES.includes(shapeText)) {
                    data.areaShape = shapeText;
                    ItemUtils.log(`SpellStrictParser: Area shape set to "${shapeText}"`);
                }
            }

            const sizeLine = this.findLineAfter(areaSection.index, /^Size:\s*(.*)$/);
            if (sizeLine) {
                const sizeText = sizeLine.line.match(/^Size:\s*(.*)$/)[1].trim();
                if (sizeText) {
                    const size = parseInt(sizeText);
                    if (!isNaN(size) && size > 0) {
                        data.areaSize = size;
                        ItemUtils.log(`SpellStrictParser: Area size set to ${size}`);
                    }
                }
            }

            const unitsLine = this.findLineAfter(areaSection.index, /^Units:\s*(.*)$/);
            if (unitsLine) {
                const unitsText = unitsLine.line.match(/^Units:\s*(.*)$/)[1].trim().toLowerCase();
                const validUnits = ['ft', 'mi', 'm', 'km'];
                if (validUnits.includes(unitsText)) {
                    data.areaUnits = unitsText;
                    ItemUtils.log(`SpellStrictParser: Area units set to "${unitsText}"`);
                }
            }
        }

        // --- Extract Usage Section ---
        const usageSection = this.findLine(/^---USAGE---$/);
        if (usageSection) {
            ItemUtils.log('SpellStrictParser: Found USAGE section');

            const usesCurrentLine = this.findLineAfter(usageSection.index, /^Uses Current:\s*(.*)$/);
            if (usesCurrentLine) {
                const currentText = usesCurrentLine.line.match(/^Uses Current:\s*(.*)$/)[1].trim();
                if (currentText) {
                    const currentValue = parseInt(currentText);
                    if (!isNaN(currentValue) && currentValue >= 0) {
                        data.usesCurrent = currentValue;
                        ItemUtils.log(`SpellStrictParser: Uses current set to ${currentValue}`);
                    }
                }
            }

            const usesMaxLine = this.findLineAfter(usageSection.index, /^Uses Max:\s*(.*)$/);
            if (usesMaxLine) {
                const maxText = usesMaxLine.line.match(/^Uses Max:\s*(.*)$/)[1].trim();
                if (maxText) {
                    const maxValue = parseInt(maxText);
                    if (!isNaN(maxValue) && maxValue >= 0) {
                        data.usesMax = maxValue;
                        ItemUtils.log(`SpellStrictParser: Uses max set to ${maxValue}`);
                    }
                }
            }
        }

        // --- Extract Recovery Blocks (only if Uses Max > 0) ---
        if (data.usesMax > 0) {
            const recoveryBlocks = this.extractRecoveryBlocks();
            if (recoveryBlocks.length > 0) {
                data.recovery = recoveryBlocks;
                ItemUtils.log(`SpellStrictParser: Found ${recoveryBlocks.length} recovery configuration(s)`);
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

            if (recoveryStart === null) break;

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

        for (let i = startIndex + 1; i < endIndex; i++) {
            const line = this.lines[i].trim();

            // Period
            const periodMatch = line.match(/^Period:\s*(.+)$/i);
            if (periodMatch) {
                const periodText = periodMatch[1].trim().toLowerCase();
                if (VALID_RECOVERY_PERIODS.includes(periodText)) {
                    config.period = periodText;
                    ItemUtils.log(`SpellStrictParser: Recovery Period set to "${periodText}"`);
                } else {
                    this.addWarning(`Invalid Recovery Period "${periodText}". Must be one of: ${VALID_RECOVERY_PERIODS.join(', ')}`);
                }
                continue;
            }

            // Type
            const typeMatch = line.match(/^Type:\s*(.+)$/i);
            if (typeMatch) {
                const typeText = typeMatch[1].trim();
                const typeLower = typeText.toLowerCase();
                const typeMap = {
                    'recoverall': 'recoverAll',
                    'loseall': 'loseAll',
                    'formula': 'formula'
                };

                if (typeMap[typeLower]) {
                    config.type = typeMap[typeLower];
                    ItemUtils.log(`SpellStrictParser: Recovery Type set to "${config.type}"`);
                } else {
                    this.addWarning(`Invalid Recovery Type "${typeText}". Must be one of: ${VALID_RECOVERY_TYPES.join(', ')}`);
                }
                continue;
            }

            // Formula
            const formulaMatch = line.match(/^Formula:\s*(.*)$/i);
            if (formulaMatch) {
                const formulaText = formulaMatch[1].trim();
                if (formulaText) {
                    config.formula = formulaText;
                    ItemUtils.log(`SpellStrictParser: Recovery Formula set to "${formulaText}"`);
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
            this.addWarning('Recovery Type "formula" requires a Formula value');
            return null;
        }

        // Validate recharge period has valid formula (2-6)
        if (config.period === 'recharge') {
            const rechargeValue = parseInt(config.formula);
            if (isNaN(rechargeValue) || rechargeValue < 2 || rechargeValue > 6) {
                this.addWarning('Recovery Period "recharge" requires Formula to be 2, 3, 4, 5, or 6');
                return null;
            }
        }

        return config;
    }

    /**
     * Populates the ItemData instance with parsed spell-specific data.
     * @param {ItemData} item - The ItemData instance to populate.
     * @param {Object} spellData - The object from extractSpellFields.
     */
    populateSpellFields(item, spellData) {
        item.spellLevel = spellData.level;
        item.spellSchool = spellData.school;

        item.vocal = spellData.vocal;
        item.somatic = spellData.somatic;
        item.material = spellData.material;

        item.materialValue = spellData.materialValue;
        item.materialCost = spellData.materialCost;
        item.materialSupply = spellData.materialSupply;
        item.materialConsumed = spellData.materialConsumed;

        item.preparationMode = spellData.preparationMode;
        item.prepared = spellData.prepared;
        item.ritual = spellData.preparationMode === 'ritual';

        item.activationType = spellData.activationType;
        item.activationValue = spellData.activationValue || 1;
        item.activationCondition = spellData.activationCondition;

        item.range = {
            value: spellData.rangeValue,
            units: spellData.rangeUnits
        };

        item.duration = {
            value: spellData.durationValue,
            units: spellData.durationUnits
        };

        item.target = {
            type: spellData.targetType,
            count: spellData.targetCount,
            choice: spellData.targetChoice,
            special: spellData.targetSpecial
        };

        if (spellData.areaShape) {
            item.area = {
                type: spellData.areaShape,
                size: spellData.areaSize,
                units: spellData.areaUnits
            };
        }

        if (spellData.usesMax > 0) {
            item.uses = {
                value: spellData.usesCurrent,
                max: spellData.usesMax
            };

            if (spellData.recovery && spellData.recovery.length > 0) {
                item.recovery = spellData.recovery;
                ItemUtils.log('SpellStrictParser: Recovery configurations set', item.recovery);
            }
        }

        ItemUtils.log('SpellStrictParser: Spell-specific fields populated', {
            level: item.spellLevel,
            school: item.spellSchool,
            components: { v: item.vocal, s: item.somatic, m: item.material },
            activation: item.activationType,
            range: item.range,
            duration: item.duration
        });
    }

    /**
     * Validates the parsed spell data.
     * @param {ItemData} item - The ItemData instance to validate.
     * @param {Object} spellData - The extracted spell data for cross-validation.
     * @returns {boolean} - True if validation passes (no critical errors).
     */
    validateSpell(item, spellData) {
        let valid = true;

        if (item.spellLevel === null || item.spellLevel === undefined) {
            this.addError('Spell level is required');
            valid = false;
        }

        if (!item.spellSchool) {
            this.addError('Spell school is required');
            valid = false;
        }

        if (spellData.material && !spellData.materialValue) {
            this.addWarning('Material component is true but no material description provided');
        }

        if (item.uses && item.uses.max > 0) {
            if (!item.recovery || item.recovery.length === 0) {
                this.addWarning('Uses specified but no recovery configuration provided');
            }
        }

        if (item.recovery && item.recovery.length > 0) {
            for (const rec of item.recovery) {
                if (rec.type === 'formula' && !rec.formula) {
                    this.addWarning('Recovery type is "formula" but no formula provided');
                }
            }
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

        if (valid) {
            ItemUtils.log('SpellStrictParser: Validation passed');
        } else {
            ItemUtils.warn('SpellStrictParser: Validation failed with errors');
        }

        return valid;
    }
}