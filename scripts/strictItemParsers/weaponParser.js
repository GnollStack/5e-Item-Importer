// scripts/strictItemParsers/weaponParser.js

import { BaseStrictParser } from './baseParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Strict Parser for Weapon items.
 * Extends the BaseStrictParser and adds logic for weapon-specific fields.
 * 
 * Template Specification: Strict_Weapon_Template.md v1.0
 * 
 * Weapon Types:
 * - simpleM (Simple Melee)
 * - simpleR (Simple Ranged)
 * - martialM (Martial Melee)
 * - martialR (Martial Ranged)
 * - natural (Natural Weapon)
 * - improv (Improvised Weapon)
 * - siege (Siege Weapon)
 * 
 * Properties (17 total):
 * - Adamantine, Ammunition, Finesse, Firearm, Focus, Heavy, Light, Loading, 
 *   Magical, Reach, Reload, Returning, Silvered, Special, Thrown, Two-Handed, Versatile
 * 
 * Conditional Sections:
 * - ATTUNEMENT (if Magical is true)
 * - AMMUNITION (if Ammunition property is true)
 * - RELOAD (if Reload property is true)
 * - VERSATILE DAMAGE (if Versatile property is true)
 * - SIEGE PROPERTIES (if Weapon Type is siege)
 */

/**
 * Map template base weapon values to dnd5e system values
 * Most weapons use lowercase with no spaces, but some have hyphens
 */
const BASE_WEAPON_MAP = {
    // Simple Melee
    'club': 'club',
    'dagger': 'dagger',
    'greatclub': 'greatclub',
    'handaxe': 'handaxe',
    'javelin': 'javelin',
    'lighthammer': 'lighthammer',
    'mace': 'mace',
    'quarterstaff': 'quarterstaff',
    'sickle': 'sickle',
    'spear': 'spear',

    // Martial Melee
    'battleaxe': 'battleaxe',
    'flail': 'flail',
    'glaive': 'glaive',
    'greataxe': 'greataxe',
    'greatsword': 'greatsword',
    'halberd': 'halberd',
    'lance': 'lance',
    'longsword': 'longsword',
    'maul': 'maul',
    'morningstar': 'morningstar',
    'pike': 'pike',
    'rapier': 'rapier',
    'scimitar': 'scimitar',
    'shortsword': 'shortsword',
    'trident': 'trident',
    'warpick': 'warpick',
    'warhammer': 'warhammer',
    'whip': 'whip',

    // Simple Ranged
    'dart': 'dart',
    'lightcrossbow': 'lightcrossbow',
    'shortbow': 'shortbow',
    'sling': 'sling',

    // Martial Ranged
    'blowgun': 'blowgun',
    'handcrossbow': 'handcrossbow',
    'heavycrossbow': 'heavycrossbow',
    'longbow': 'longbow',
    'net': 'net'
};

export class WeaponStrictParser extends BaseStrictParser {
    constructor() {
        super();
    }

    /**
     * Main parse method for Weapon items.
     * @param {string} text - The full text to parse.
     * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
     */
    parse(text) {
        // 1. Parse all universal fields using the parent parser.
        const baseResult = super.parse(text);

        // Collect base parsing errors but continue with weapon-specific parsing
        if (!baseResult.success) {
            ItemUtils.warn('WeaponStrictParser: Base parsing had errors, but continuing with weapon-specific parsing');
            this.errors.push(...baseResult.errors);
            this.warnings.push(...baseResult.warnings);
        }

        const { item } = baseResult;
        ItemUtils.log('WeaponStrictParser: Base parsing successful, starting weapon-specific parsing...');

        try {
            // 2. Extract weapon-specific fields from the text.
            const weaponData = this.extractWeaponFields();

            // 3. Populate the ItemData object with the new fields.
            this.populateWeaponFields(item, weaponData);

            // 4. Perform any weapon-specific validation.
            if (!this.validateWeapon(item, weaponData)) {
                ItemUtils.warn('WeaponStrictParser: Validation found issues, but continuing with warnings');
            }

            ItemUtils.log('WeaponStrictParser: Weapon parsing completed successfully');

        } catch (error) {
            ItemUtils.error('WeaponStrictParser: Unexpected error during weapon parsing', error);
            this.addError(`Unexpected error during weapon parsing: ${error.message}`);
        }

        // 5. Return the final result.
        const success = this.errors.length === 0;
        return this.createResult(success, item);
    }

    /**
     * Extracts fields specific to Weapon items from the class's `this.lines`.
     * @returns {Object} An object containing the extracted weapon data.
     */
    extractWeaponFields() {
        const data = {
            weaponType: null,
            baseWeapon: null,

            // 17 Boolean Properties
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

            // Attunement (conditional)
            attunement: 'none',
            attunementBy: '',
            magicBonus: null,

            // Ammunition (conditional)
            ammunitionType: null,

            // Reload (conditional)
            reloadAmount: null,

            // Range
            reachValue: null,
            rangeNormal: null,
            rangeLong: null,
            rangeUnits: 'ft',

            // Damage
            damageFormula: null,
            damageType: null,

            // Versatile Damage (conditional)
            versatileFormula: null,
            versatileDamageType: null,

            // Mastery
            mastery: '',

            // Proficiency
            proficiency: 1, // Default to proficient

            // Siege Properties (conditional)
            siegeArmorClass: null,
            cover: 'none',
            hitPointsCurrent: null,
            hitPointsMax: null,
            hitPointsThreshold: null,
            healthConditions: '',

            // Uses
            usesCurrent: 0,
            usesMax: 0,
            recovery: []           // Array of recovery configurations
        };

        // --- Extract Weapon Type (REQUIRED) ---
        const weaponTypeLine = this.findLine(/^Weapon Type:\s*(.+)$/);

        if (!weaponTypeLine) {
            this.addError('Weapon Type is required but was not found');
            return data;
        }

        const typeMatch = weaponTypeLine.line.match(/^Weapon Type:\s*(.+)$/);
        const typeText = typeMatch[1].trim(); // Don't lowercase - preserve camelCase

        const validTypes = ['simpleM', 'simpleR', 'martialM', 'martialR', 'natural', 'improv', 'siege'];
        if (validTypes.includes(typeText)) {
            data.weaponType = typeText;
            ItemUtils.log(`WeaponStrictParser: Weapon Type set to "${typeText}"`);
        } else {
            this.addError(`Invalid Weapon Type "${typeText}". Must be one of: simpleM, simpleR, martialM, martialR, natural, improv, siege`);
            return data;
        }

        // --- Extract Base Weapon (required for simple/martial weapons) ---
        const baseWeaponLine = this.findLine(/^Base Weapon:\s*(.+)$/);

        if (baseWeaponLine) {
            const baseMatch = baseWeaponLine.line.match(/^Base Weapon:\s*(.+)$/);
            const baseText = baseMatch[1].trim().toLowerCase();

            if (baseText !== 'blank' && baseText !== '') {
                // Map template value to system value
                const systemValue = BASE_WEAPON_MAP[baseText];
                if (systemValue) {
                    data.baseWeapon = systemValue;
                    ItemUtils.log(`WeaponStrictParser: Base Weapon "${baseText}" mapped to system value "${systemValue}"`);
                } else {
                    // If no mapping exists, use the value as-is and warn
                    data.baseWeapon = baseText;
                    ItemUtils.warn(`WeaponStrictParser: No mapping found for base weapon "${baseText}", using as-is`);
                }
            }
        }

        // Validate base weapon for standard weapon types
        const standardTypes = ['simplem', 'simpler', 'martialm', 'martialr'];
        if (standardTypes.includes(data.weaponType) && !data.baseWeapon) {
            this.addError(`Base Weapon is required for ${data.weaponType} weapons`);
        }

        // --- Extract Properties Section (17 boolean properties) ---
        const properties = this.extractPropertiesSection('PROPERTIES', {
            Adamantine: false,
            Ammunition: false,
            Finesse: false,
            Firearm: false,
            Focus: false,
            Heavy: false,
            Light: false,
            Loading: false,
            Magical: false,
            Reach: false,
            Reload: false,
            Returning: false,
            Silvered: false,
            Special: false,
            Thrown: false,
            'Two-Handed': false,
            Versatile: false
        });

        // Map extracted properties to data object
        data.adamantine = properties.Adamantine;
        data.ammunition = properties.Ammunition;
        data.finesse = properties.Finesse;
        data.firearm = properties.Firearm;
        data.focus = properties.Focus;
        data.heavy = properties.Heavy;
        data.light = properties.Light;
        data.loading = properties.Loading;
        data.magical = properties.Magical;
        data.reach = properties.Reach;
        data.reload = properties.Reload;
        data.returning = properties.Returning;
        data.silvered = properties.Silvered;
        data.special = properties.Special;
        data.thrown = properties.Thrown;
        data.twoHanded = properties['Two-Handed'];
        data.versatile = properties.Versatile;

        ItemUtils.log('WeaponStrictParser: All 17 weapon properties extracted');

        // --- Extract Attunement Section (only if magical) ---
        if (data.magical) {
            const attunementSection = this.findLine(/^---ATTUNEMENT---$/);

            if (attunementSection) {
                ItemUtils.log('WeaponStrictParser: Found ATTUNEMENT section');

                const attunementLine = this.findLineAfter(attunementSection.index, /^Attunement:\s*(.+)$/);
                if (attunementLine) {
                    const attunementMatch = attunementLine.line.match(/^Attunement:\s*(.+)$/);
                    const attunementText = attunementMatch[1].trim().toLowerCase();
                    const validAttunements = ['none', 'required', 'optional'];

                    if (validAttunements.includes(attunementText)) {
                        data.attunement = attunementText;
                        ItemUtils.log(`WeaponStrictParser: Attunement set to "${attunementText}"`);
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
                        ItemUtils.log(`WeaponStrictParser: Attunement By set to "${attunementByText}"`);
                    }
                }

                const magicBonusLine = this.findLineAfter(attunementSection.index, /^Magic Bonus:\s*(.+)$/);
                if (magicBonusLine) {
                    const bonusMatch = magicBonusLine.line.match(/^Magic Bonus:\s*(.+)$/);
                    const bonusText = bonusMatch[1].trim().toLowerCase();

                    if (bonusText !== 'blank' && bonusText !== '') {
                        const bonusValue = parseInt(bonusText);
                        if (!isNaN(bonusValue) && bonusValue >= 0) {
                            data.magicBonus = bonusValue;
                            ItemUtils.log(`WeaponStrictParser: Magic Bonus set to +${bonusValue}`);
                        } else {
                            this.addWarning(`Invalid Magic Bonus value "${bonusText}".`);
                        }
                    }
                }
            }
        }

        // --- Extract Ammunition Section (only if ammunition property is true) ---
        if (data.ammunition) {
            const ammunitionSection = this.findLine(/^---AMMUNITION---$/);

            if (ammunitionSection) {
                ItemUtils.log('WeaponStrictParser: Found AMMUNITION section');

                const ammoTypeLine = this.findLineAfter(ammunitionSection.index, /^Ammunition Type:\s*(.+)$/);
                if (!ammoTypeLine) {
                    this.addError('Ammunition Type is required when Ammunition property is true');
                } else {
                    const ammoMatch = ammoTypeLine.line.match(/^Ammunition Type:\s*(.+)$/);
                    const ammoText = ammoMatch[1].trim();
                    const validAmmoTypes = ['arrow', 'crossbowBolt', 'firearmBullet', 'slingBullet', 'energyCell', 'blowgunNeedle'];

                    if (validAmmoTypes.includes(ammoText)) {
                        data.ammunitionType = ammoText;
                        ItemUtils.log(`WeaponStrictParser: Ammunition Type set to "${ammoText}"`);
                    } else {
                        this.addError(`Invalid Ammunition Type "${ammoText}"`);
                    }
                }
            } else {
                this.addError('AMMUNITION section is required when Ammunition property is true');
            }
        }

        // --- Extract Reload Section (only if reload property is true) ---
        if (data.reload) {
            const reloadSection = this.findLine(/^---RELOAD---$/);

            if (reloadSection) {
                ItemUtils.log('WeaponStrictParser: Found RELOAD section');

                const reloadAmountLine = this.findLineAfter(reloadSection.index, /^Reload Amount:\s*(.+)$/);
                if (!reloadAmountLine) {
                    this.addError('Reload Amount is required when Reload property is true');
                } else {
                    const reloadMatch = reloadAmountLine.line.match(/^Reload Amount:\s*(.+)$/);
                    const reloadText = reloadMatch[1].trim();
                    const reloadValue = parseInt(reloadText);

                    if (!isNaN(reloadValue) && reloadValue > 0) {
                        data.reloadAmount = reloadValue;
                        ItemUtils.log(`WeaponStrictParser: Reload Amount set to ${reloadValue}`);
                    } else {
                        this.addError(`Invalid Reload Amount "${reloadText}". Must be a positive integer.`);
                    }
                }
            } else {
                this.addError('RELOAD section is required when Reload property is true');
            }
        }

        // --- Extract Range Section ---
        const rangeSection = this.findLine(/^---RANGE---$/);

        if (rangeSection) {
            ItemUtils.log('WeaponStrictParser: Found RANGE section');

            // Reach (for melee weapons)
            const reachLine = this.findLineAfter(rangeSection.index, /^Reach:\s*(.+)$/);
            if (reachLine) {
                const reachMatch = reachLine.line.match(/^Reach:\s*(.+)$/);
                const reachText = reachMatch[1].trim().toLowerCase();

                if (reachText !== 'blank' && reachText !== '') {
                    const reachValue = parseInt(reachText);
                    if (!isNaN(reachValue) && reachValue >= 0) {
                        data.reachValue = reachValue;
                        ItemUtils.log(`WeaponStrictParser: Reach set to ${reachValue}`);
                    }
                }
            }

            // Range Normal (for ranged weapons)
            const rangeNormalLine = this.findLineAfter(rangeSection.index, /^Range Normal:\s*(.+)$/);
            if (rangeNormalLine) {
                const normalMatch = rangeNormalLine.line.match(/^Range Normal:\s*(.+)$/);
                const normalText = normalMatch[1].trim().toLowerCase();

                if (normalText !== 'blank' && normalText !== '') {
                    const normalValue = parseInt(normalText);
                    if (!isNaN(normalValue) && normalValue >= 0) {
                        data.rangeNormal = normalValue;
                        ItemUtils.log(`WeaponStrictParser: Range Normal set to ${normalValue}`);
                    }
                }
            }

            // Range Long (for ranged weapons)
            const rangeLongLine = this.findLineAfter(rangeSection.index, /^Range Long:\s*(.+)$/);
            if (rangeLongLine) {
                const longMatch = rangeLongLine.line.match(/^Range Long:\s*(.+)$/);
                const longText = longMatch[1].trim().toLowerCase();

                if (longText !== 'blank' && longText !== '') {
                    const longValue = parseInt(longText);
                    if (!isNaN(longValue) && longValue >= 0) {
                        data.rangeLong = longValue;
                        ItemUtils.log(`WeaponStrictParser: Range Long set to ${longValue}`);
                    }
                }
            }

            // Range Units
            const rangeUnitsLine = this.findLineAfter(rangeSection.index, /^Range Units:\s*(.+)$/);
            if (rangeUnitsLine) {
                const unitsMatch = rangeUnitsLine.line.match(/^Range Units:\s*(.+)$/);
                const unitsText = unitsMatch[1].trim().toLowerCase();
                const validUnits = ['ft', 'm', 'sq', 'mi'];

                if (validUnits.includes(unitsText)) {
                    data.rangeUnits = unitsText;
                    ItemUtils.log(`WeaponStrictParser: Range Units set to "${unitsText}"`);
                }
            }
        }

        // --- Extract Damage Section (REQUIRED) ---
        const damageSection = this.findLine(/^---DAMAGE---$/);

        if (!damageSection) {
            this.addError('DAMAGE section is required but was not found');
        } else {
            ItemUtils.log('WeaponStrictParser: Found DAMAGE section');

            // Damage Formula (REQUIRED)
            const damageFormulaLine = this.findLineAfter(damageSection.index, /^Damage Formula:\s*(.+)$/);
            if (!damageFormulaLine) {
                this.addError('Damage Formula is required but was not found');
            } else {
                const formulaMatch = damageFormulaLine.line.match(/^Damage Formula:\s*(.+)$/);
                data.damageFormula = formulaMatch[1].trim();
                ItemUtils.log(`WeaponStrictParser: Damage Formula set to "${data.damageFormula}"`);
            }

            // Damage Type (REQUIRED) - supports comma-separated multiple types
            const damageTypeLine = this.findLineAfter(damageSection.index, /^Damage Type:\s*(.+)$/);
            if (!damageTypeLine) {
                this.addError('Damage Type is required but was not found');
            } else {
                const typeMatch = damageTypeLine.line.match(/^Damage Type:\s*(.+)$/);
                const damageTypeText = typeMatch[1].trim().toLowerCase();
                const validDamageTypes = [
                    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
                    'necrotic', 'piercing', 'poison', 'psychic', 'radiant',
                    'slashing', 'thunder'
                ];

                // Support comma-separated damage types
                const types = damageTypeText.split(',').map(t => t.trim());
                const invalidTypes = types.filter(t => !validDamageTypes.includes(t));

                if (invalidTypes.length > 0) {
                    this.addError(`Invalid Damage Type(s): ${invalidTypes.join(', ')}`);
                } else {
                    // Store as array if multiple, or single string if one
                    data.damageType = types.length === 1 ? types[0] : types;
                    ItemUtils.log(`WeaponStrictParser: Damage Type set to ${types.length === 1 ? '"' + types[0] + '"' : 'array [' + types.join(', ') + ']'}`);
                }
            }
        }

        // --- Extract Versatile Damage Section (only if versatile property is true) ---
        if (data.versatile) {
            const versatileSection = this.findLine(/^---VERSATILE DAMAGE---$/);

            if (versatileSection) {
                ItemUtils.log('WeaponStrictParser: Found VERSATILE DAMAGE section');

                // Versatile Formula (REQUIRED for versatile weapons)
                const versatileFormulaLine = this.findLineAfter(versatileSection.index, /^Versatile Formula:\s*(.+)$/);
                if (!versatileFormulaLine) {
                    this.addError('Versatile Formula is required when Versatile property is true');
                } else {
                    const formulaMatch = versatileFormulaLine.line.match(/^Versatile Formula:\s*(.+)$/);
                    data.versatileFormula = formulaMatch[1].trim();
                    ItemUtils.log(`WeaponStrictParser: Versatile Formula set to "${data.versatileFormula}"`);
                }

                // Versatile Damage Type (REQUIRED for versatile weapons) - supports comma-separated
                const versatileTypeLine = this.findLineAfter(versatileSection.index, /^Versatile Damage Type:\s*(.+)$/);
                if (!versatileTypeLine) {
                    this.addError('Versatile Damage Type is required when Versatile property is true');
                } else {
                    const typeMatch = versatileTypeLine.line.match(/^Versatile Damage Type:\s*(.+)$/);
                    const versatileTypeText = typeMatch[1].trim().toLowerCase();
                    const validDamageTypes = [
                        'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
                        'necrotic', 'piercing', 'poison', 'psychic', 'radiant',
                        'slashing', 'thunder'
                    ];

                    // Support comma-separated damage types
                    const types = versatileTypeText.split(',').map(t => t.trim());
                    const invalidTypes = types.filter(t => !validDamageTypes.includes(t));

                    if (invalidTypes.length > 0) {
                        this.addError(`Invalid Versatile Damage Type(s): ${invalidTypes.join(', ')}`);
                    } else {
                        // Store as array if multiple, or single string if one
                        data.versatileDamageType = types.length === 1 ? types[0] : types;
                        ItemUtils.log(`WeaponStrictParser: Versatile Damage Type set to ${types.length === 1 ? '"' + types[0] + '"' : 'array [' + types.join(', ') + ']'}`);
                    }
                }
            } else {
                this.addError('VERSATILE DAMAGE section is required when Versatile property is true');
            }
        }

        // --- Extract Mastery Section ---
        const masterySection = this.findLine(/^---MASTERY---$/);

        if (masterySection) {
            ItemUtils.log('WeaponStrictParser: Found MASTERY section');

            const masteryLine = this.findLineAfter(masterySection.index, /^Mastery:\s*(.+)$/);
            if (masteryLine) {
                const masteryMatch = masteryLine.line.match(/^Mastery:\s*(.+)$/);
                const masteryText = masteryMatch[1].trim().toLowerCase();

                if (masteryText !== 'blank' && masteryText !== '') {
                    const validMasteries = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'];
                    if (validMasteries.includes(masteryText)) {
                        data.mastery = masteryText;
                        ItemUtils.log(`WeaponStrictParser: Mastery set to "${masteryText}"`);
                    } else {
                        this.addWarning(`Invalid Mastery value "${masteryText}"`);
                    }
                }
            }
        }

        // --- Extract Proficiency Section ---
        const proficiencySection = this.findLine(/^---PROFICIENCY---$/);

        if (proficiencySection) {
            ItemUtils.log('WeaponStrictParser: Found PROFICIENCY section');

            const proficiencyLine = this.findLineAfter(proficiencySection.index, /^Proficiency:\s*(.+)$/);
            if (proficiencyLine) {
                const profMatch = proficiencyLine.line.match(/^Proficiency:\s*(.+)$/);
                const profText = profMatch[1].trim().toLowerCase();

                // Map template values to system values
                const profMap = {
                    'automatic': 0,
                    'notproficient': 0,
                    'proficient': 1
                };

                if (profMap[profText] !== undefined) {
                    data.proficiency = profMap[profText];
                    ItemUtils.log(`WeaponStrictParser: Proficiency set to ${data.proficiency}`);
                }
            }
        }

        // --- Extract Siege Properties Section (only if weapon type is siege) ---
        if (data.weaponType === 'siege') {
            const siegeSection = this.findLine(/^---SIEGE PROPERTIES---$/);

            if (siegeSection) {
                ItemUtils.log('WeaponStrictParser: Found SIEGE PROPERTIES section');

                // Siege Armor Class
                const siegeACLine = this.findLineAfter(siegeSection.index, /^Siege Armor Class:\s*(.+)$/);
                if (siegeACLine) {
                    const acMatch = siegeACLine.line.match(/^Siege Armor Class:\s*(.+)$/);
                    const acValue = parseInt(acMatch[1].trim());
                    if (!isNaN(acValue)) {
                        data.siegeArmorClass = acValue;
                        ItemUtils.log(`WeaponStrictParser: Siege Armor Class set to ${acValue}`);
                    }
                }

                // Cover
                const coverLine = this.findLineAfter(siegeSection.index, /^Cover:\s*(.+)$/);
                if (coverLine) {
                    const coverMatch = coverLine.line.match(/^Cover:\s*(.+)$/);
                    const coverText = coverMatch[1].trim().toLowerCase();
                    const validCover = ['none', 'half', 'threequarters', 'total'];
                    if (validCover.includes(coverText)) {
                        data.cover = coverText;
                        ItemUtils.log(`WeaponStrictParser: Cover set to "${coverText}"`);
                    }
                }

                // Hit Points Current
                const hpCurrentLine = this.findLineAfter(siegeSection.index, /^Hit Points Current:\s*(.+)$/);
                if (hpCurrentLine) {
                    const hpMatch = hpCurrentLine.line.match(/^Hit Points Current:\s*(.+)$/);
                    const hpValue = parseInt(hpMatch[1].trim());
                    if (!isNaN(hpValue)) {
                        data.hitPointsCurrent = hpValue;
                        ItemUtils.log(`WeaponStrictParser: Hit Points Current set to ${hpValue}`);
                    }
                }

                // Hit Points Max
                const hpMaxLine = this.findLineAfter(siegeSection.index, /^Hit Points Max:\s*(.+)$/);
                if (hpMaxLine) {
                    const hpMatch = hpMaxLine.line.match(/^Hit Points Max:\s*(.+)$/);
                    const hpValue = parseInt(hpMatch[1].trim());
                    if (!isNaN(hpValue)) {
                        data.hitPointsMax = hpValue;
                        ItemUtils.log(`WeaponStrictParser: Hit Points Max set to ${hpValue}`);
                    }
                }

                // Hit Points Threshold
                const hpThresholdLine = this.findLineAfter(siegeSection.index, /^Hit Points Threshold:\s*(.+)$/);
                if (hpThresholdLine) {
                    const hpMatch = hpThresholdLine.line.match(/^Hit Points Threshold:\s*(.+)$/);
                    const hpValue = parseInt(hpMatch[1].trim());
                    if (!isNaN(hpValue)) {
                        data.hitPointsThreshold = hpValue;
                        ItemUtils.log(`WeaponStrictParser: Hit Points Threshold set to ${hpValue}`);
                    }
                }

                // Health Conditions
                const conditionsLine = this.findLineAfter(siegeSection.index, /^Health Conditions:\s*(.+)$/);
                if (conditionsLine) {
                    const condMatch = conditionsLine.line.match(/^Health Conditions:\s*(.+)$/);
                    const condText = condMatch[1].trim();
                    if (condText.toLowerCase() !== 'blank') {
                        data.healthConditions = condText;
                        ItemUtils.log(`WeaponStrictParser: Health Conditions set to "${condText}"`);
                    }
                }
            } else {
                this.addWarning('SIEGE PROPERTIES section recommended for siege weapons');
            }
        }

        // --- Extract Usage Section ---
        const usageSection = this.findLine(/^---USAGE---$/);

        if (usageSection) {
            ItemUtils.log('WeaponStrictParser: Found USAGE section');

            // Uses Current
            const usesCurrentLine = this.findLineAfter(usageSection.index, /^Uses Current:\s*(.+)$/);
            if (usesCurrentLine) {
                const currentMatch = usesCurrentLine.line.match(/^Uses Current:\s*(.+)$/);
                const currentValue = parseInt(currentMatch[1].trim());
                if (!isNaN(currentValue) && currentValue >= 0) {
                    data.usesCurrent = currentValue;
                    ItemUtils.log(`WeaponStrictParser: Uses Current set to ${currentValue}`);
                }
            }

            // Uses Max
            const usesMaxLine = this.findLineAfter(usageSection.index, /^Uses Max:\s*(.+)$/);
            if (usesMaxLine) {
                const maxMatch = usesMaxLine.line.match(/^Uses Max:\s*(.+)$/);
                const maxValue = parseInt(maxMatch[1].trim());
                if (!isNaN(maxValue) && maxValue >= 0) {
                    data.usesMax = maxValue;
                    ItemUtils.log(`WeaponStrictParser: Uses Max set to ${maxValue}`);
                }
}
        }

        // --- Extract Recovery Blocks (only if Uses Max > 0) ---
        if (data.usesMax > 0) {
            const recoveryBlocks = this.extractRecoveryBlocks();
            if (recoveryBlocks.length > 0) {
                data.recovery = recoveryBlocks;
                ItemUtils.log(`WeaponStrictParser: Found ${recoveryBlocks.length} recovery configuration(s)`);
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
                    ItemUtils.log(`WeaponStrictParser: Recovery Period set to "${periodText}"`);
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
                    ItemUtils.log(`WeaponStrictParser: Recovery Type set to "${config.type}"`);
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
                    ItemUtils.log(`WeaponStrictParser: Recovery Formula set to "${formulaText}"`);
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
     * Populates the ItemData instance with parsed weapon-specific data.
     * @param {ItemData} item - The ItemData instance to populate.
     * @param {Object} weaponData - The object from extractWeaponFields.
     */
    populateWeaponFields(item, weaponData) {
        // Set weapon type and base weapon
        item.weaponType = weaponData.weaponType;
        item.baseWeapon = weaponData.baseWeapon;

        // Set magical property
        item.isMagical = weaponData.magical;

        // Set attunement
        if (weaponData.magical) {
            item.attunement = (weaponData.attunement === 'required' || weaponData.attunement === 'optional');
            item.attunementRequirement = weaponData.attunementBy;
        } else {
            item.attunement = false;
            item.attunementRequirement = null;
        }

        // Set magic bonus
        item.magicBonus = weaponData.magicBonus;

        // Set damage
        if (weaponData.damageFormula && weaponData.damageType) {
            item.damage = {
                formula: weaponData.damageFormula,
                type: weaponData.damageType
            };
        }

        // Set versatile damage
        if (weaponData.versatile && weaponData.versatileFormula) {
            item.versatileDamage = {
                formula: weaponData.versatileFormula,
                type: weaponData.versatileDamageType || weaponData.damageType
            };
        }

        // Set range
        item.reach = weaponData.reachValue;
        item.range = {
            value: weaponData.rangeNormal,
            long: weaponData.rangeLong,
            units: weaponData.rangeUnits
        };

        // Set ammunition type
        item.ammunitionType = weaponData.ammunitionType;

        // Set reload amount
        item.reloadAmount = weaponData.reloadAmount;

        // Set mastery
        item.mastery = weaponData.mastery;

        // Set proficiency
        item.proficient = weaponData.proficiency;

        // Set uses
        if (weaponData.usesMax > 0) {
            item.uses = {
                value: weaponData.usesCurrent,
                max: weaponData.usesMax
            };
            
            // Set recovery configurations
            if (weaponData.recovery && weaponData.recovery.length > 0) {
                item.recovery = weaponData.recovery;
                ItemUtils.log('WeaponStrictParser: Recovery configurations set', item.recovery);
            }
        }

        // Set properties (all 17)
        item.properties = [];
        const propertyMap = {
            adamantine: 'ada',
            ammunition: 'amm',
            finesse: 'fin',
            firearm: 'fir',
            focus: 'foc',
            heavy: 'hvy',
            light: 'lgt',
            loading: 'lod',
            magical: 'mgc',
            reach: 'rch',
            reload: 'rel',
            returning: 'ret',
            silvered: 'sil',
            special: 'spc',
            thrown: 'thr',
            twoHanded: 'two',
            versatile: 'ver'
        };

        for (const [key, code] of Object.entries(propertyMap)) {
            if (weaponData[key]) {
                item.properties.push(code);
            }
        }

        // Set siege properties
        if (weaponData.weaponType === 'siege') {
            item.siegeArmorClass = weaponData.siegeArmorClass;
            item.cover = weaponData.cover;
            item.hitPoints = {
                value: weaponData.hitPointsCurrent,
                max: weaponData.hitPointsMax,
                dt: weaponData.hitPointsThreshold,
                conditions: weaponData.healthConditions
            };
        }

        ItemUtils.log('WeaponStrictParser: Weapon-specific fields populated', {
            weaponType: item.weaponType,
            baseWeapon: item.baseWeapon,
            damage: item.damage,
            properties: item.properties,
            isMagical: item.isMagical
        });
    }

    /**
     * Validates the parsed weapon data.
     * @param {ItemData} item - The ItemData instance to validate.
     * @param {Object} weaponData - The extracted weapon data for cross-validation.
     * @returns {boolean} - True if validation passes (no critical errors).
     */
    validateWeapon(item, weaponData) {
        let valid = true;

        // Validate weapon type is set
        if (!item.weaponType) {
            this.addError('Weapon Type is required but was not set');
            valid = false;
        }

        // Validate base weapon for standard types
        const standardTypes = ['simplem', 'simpler', 'martialm', 'martialr'];
        if (standardTypes.includes(item.weaponType) && !item.baseWeapon) {
            this.addError(`Base Weapon is required for ${item.weaponType} weapons`);
            valid = false;
        }

        // Validate damage is set
        if (!item.damage || !item.damage.formula || !item.damage.type) {
            this.addError('Damage Formula and Type are required');
            valid = false;
        }

        // Validate versatile weapons have versatile damage
        if (weaponData.versatile && !item.versatileDamage) {
            this.addError('Versatile weapons must have Versatile Damage specified');
            valid = false;
        }

        // Validate ammunition weapons have ammunition type
        if (weaponData.ammunition && !item.ammunitionType) {
            this.addError('Ammunition Type is required when Ammunition property is true');
            valid = false;
        }

        // Validate reload weapons have reload amount
        if (weaponData.reload && !item.reloadAmount) {
            this.addError('Reload Amount is required when Reload property is true');
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
            ItemUtils.log('WeaponStrictParser: Validation passed');
        } else {
            ItemUtils.warn('WeaponStrictParser: Validation failed with errors');
        }

        return valid;
    }
}