// scripts/strictItemParsers/yamlItemParser.js

import jsyaml from '../vendor/js-yaml.mjs';
import { ItemData } from '../itemData.js';
import { ItemUtils } from '../itemUtils.js';

// ─── Helper Utilities ───────────────────────────────────────────────────────

function asBool(val, fallback = false) {
    if (val === true || val === false) return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return fallback;
}

function asInt(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
}

function asFloat(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
}

function asNullable(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim().toLowerCase();
    if (str === 'n/a' || str === '' || str === 'null' || str === 'none') return null;
    return val;
}

function asString(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    if (str.toLowerCase() === 'n/a') return fallback;
    return str || fallback;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RARITY_MAP = {
    'common': 'common',
    'uncommon': 'uncommon',
    'rare': 'rare',
    'veryrare': 'veryRare',
    'very rare': 'veryRare',
    'legendary': 'legendary',
    'artifact': 'artifact'
};

const VALID_DENOMINATIONS = ['pp', 'gp', 'ep', 'sp', 'cp'];
const VALID_WEIGHT_UNITS = ['lb', 'tn', 'kg', 't'];
const VALID_RANGE_UNITS = ['ft', 'm', 'sq', 'mi'];

const VALID_DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant',
    'slashing', 'thunder'
];

const VALID_RECOVERY_PERIODS = ['lr', 'sr', 'day', 'dawn', 'dusk', 'recharge'];
const VALID_RECOVERY_TYPES = ['recoverAll', 'loseAll', 'formula'];
const RECOVERY_TYPE_MAP = {
    'recoverall': 'recoverAll',
    'loseall': 'loseAll',
    'formula': 'formula'
};

// ─── Weapon Constants ───────────────────────────────────────────────────────

const BASE_WEAPON_MAP = {
    'club': 'club', 'dagger': 'dagger', 'greatclub': 'greatclub',
    'handaxe': 'handaxe', 'javelin': 'javelin', 'lighthammer': 'lighthammer',
    'mace': 'mace', 'quarterstaff': 'quarterstaff', 'sickle': 'sickle',
    'spear': 'spear', 'battleaxe': 'battleaxe', 'flail': 'flail',
    'glaive': 'glaive', 'greataxe': 'greataxe', 'greatsword': 'greatsword',
    'halberd': 'halberd', 'lance': 'lance', 'longsword': 'longsword',
    'maul': 'maul', 'morningstar': 'morningstar', 'pike': 'pike',
    'rapier': 'rapier', 'scimitar': 'scimitar', 'shortsword': 'shortsword',
    'trident': 'trident', 'warpick': 'warpick', 'warhammer': 'warhammer',
    'whip': 'whip', 'dart': 'dart', 'lightcrossbow': 'lightcrossbow',
    'shortbow': 'shortbow', 'sling': 'sling', 'blowgun': 'blowgun',
    'handcrossbow': 'handcrossbow', 'heavycrossbow': 'heavycrossbow',
    'longbow': 'longbow', 'net': 'net'
};

const VALID_WEAPON_TYPES = ['simpleM', 'simpleR', 'martialM', 'martialR', 'natural', 'improv', 'siege'];

const WEAPON_PROPERTY_MAP = {
    'Adamantine': 'ada', 'Ammunition': 'amm', 'Finesse': 'fin',
    'Firearm': 'fir', 'Focus': 'foc', 'Heavy': 'hvy',
    'Light': 'lgt', 'Loading': 'lod', 'Magical': 'mgc',
    'Reach': 'rch', 'Reload': 'rel', 'Returning': 'ret',
    'Silvered': 'sil', 'Special': 'spc', 'Thrown': 'thr',
    'Two-Handed': 'two', 'Versatile': 'ver'
};

const VALID_AMMO_TYPES = ['arrow', 'crossbowBolt', 'firearmBullet', 'slingBullet', 'energyCell', 'blowgunNeedle'];
const VALID_MASTERIES = ['cleave', 'graze', 'nick', 'push', 'sap', 'slow', 'topple', 'vex'];

// ─── Equipment Constants ────────────────────────────────────────────────────

const BASE_EQUIPMENT_MAP = {
    'leather': 'leather', 'padded': 'padded', 'studdedleather': 'studded',
    'breastplate': 'breastplate', 'chainshirt': 'chainshirt',
    'halfplate': 'halfplate', 'hide': 'hide', 'scalemail': 'scalemail',
    'chainmail': 'chainmail', 'plate': 'plate', 'ringmail': 'ringmail',
    'splint': 'splint', 'shield': 'shield'
};

const VALID_EQUIPMENT_TYPES = [
    'light', 'medium', 'heavy', 'natural', 'shield',
    'clothing', 'ring', 'rod', 'trinket', 'wand', 'wondrous', 'vehicle'
];

const EQUIPMENT_COVER_MAP = {
    'none': 0, 'half': 0.5, 'threequarters': 0.75, 'total': 1
};

// ─── Consumable Constants ───────────────────────────────────────────────────

const VALID_CONSUMABLE_TYPES = ['ammo', 'food', 'poison', 'potion', 'rod', 'scroll', 'trinket', 'wand'];

const CONSUMABLE_AMMO_TYPE_MAP = {
    'arrow': 'arrow', 'bolt': 'crossbowBolt', 'crossbowbolt': 'crossbowBolt',
    'dart': 'dart', 'needle': 'blowgunNeedle', 'blowgunneedle': 'blowgunNeedle',
    'bullet': 'firearmBullet', 'firearmbullet': 'firearmBullet',
    'slingbullet': 'slingBullet', 'energycell': 'energyCell'
};

const VALID_POISON_TYPES = ['contact', 'ingested', 'inhaled', 'injury'];

// ─── Tool Constants ─────────────────────────────────────────────────────────

const BASE_TOOL_MAPPINGS = {
    alch: 'art', brew: 'art', calli: 'art', carp: 'art', carta: 'art',
    cob: 'art', cook: 'art', glass: 'art', jewel: 'art', leath: 'art',
    maso: 'art', paint: 'art', pott: 'art', smith: 'art', tink: 'art',
    weav: 'art', wood: 'art',
    dice: 'game', card: 'game', chess: 'game',
    bagpipes: 'music', drum: 'music', dulcimer: 'music', flute: 'music',
    horn: 'music', lute: 'music', lyre: 'music', panflute: 'music',
    shawm: 'music', viol: 'music',
    disg: '', forg: '', herb: '', navg: '', pois: '', thief: ''
};

const VALID_TOOL_TYPES = ['art', 'game', 'music', 'other'];

// ─── Loot Constants ─────────────────────────────────────────────────────────

const VALID_LOOT_TYPES = ['art', 'gear', 'gem', 'junk', 'material', 'resource', 'trade', 'treasure'];

// ─── Spell Constants ─────────────────────────────────────────────────────────

const VALID_SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs'];
const VALID_SPELL_PREP_METHODS = ['atwill', 'innate', 'ritual', 'pact', 'prepared'];
const VALID_SPELL_ACTIVATION_TYPES = ['action', 'bonus', 'reaction', 'minute', 'hour', 'day', 'special'];
const VALID_SPELL_RANGE_UNITS = ['self', 'touch', 'spec', 'any', 'ft', 'mi', 'm', 'km'];
const VALID_DURATION_UNITS = ['inst', 'spec', 'turn', 'round', 'minute', 'hour', 'day', 'month', 'year', 'disp', 'dstr', 'perm'];
const VALID_TARGET_TYPES = ['self', 'ally', 'enemy', 'creature', 'object', 'space', 'creatureOrObject', 'any', 'willing'];
const VALID_AREA_SHAPES = ['cone', 'cube', 'cylinder', 'radius', 'line', 'sphere', 'circle', 'square', 'wall'];
const VALID_AREA_UNITS = ['ft', 'mi', 'm', 'km'];

// ─── Main Parser Class ──────────────────────────────────────────────────────

export class YamlItemParser {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Main parse method. Accepts raw text (with optional code fences).
     * @param {string} text - The raw template text.
     * @returns {Object} { success, item: ItemData, errors, warnings }
     */
    parse(text) {
        this.errors = [];
        this.warnings = [];

        if (!text || !text.trim()) {
            this.addError('Empty text provided');
            return this.createResult(false, null);
        }

        try {
            // 1. Strip code fences
            const yamlText = this.stripCodeFences(text);

            // 2. Parse YAML
            let doc;
            try {
                doc = jsyaml.load(yamlText);
            } catch (yamlError) {
                this.addError(`YAML parse error: ${yamlError.message}`);
                return this.createResult(false, null);
            }

            if (!doc || typeof doc !== 'object') {
                this.addError('YAML document is empty or not an object');
                return this.createResult(false, null);
            }

            // 3. Detect item type from top-level key
            const { type, data } = this.detectItemType(doc);
            if (!type) {
                this.addError('Could not detect item type. Expected top-level key: WEAPON, LOOT, EQUIPMENT, CONSUMABLE, TOOL, CONTAINER, or SPELL');
                return this.createResult(false, null);
            }

            ItemUtils.log(`YamlItemParser: Detected item type: ${type}`);

            // 4. Extract universal fields
            const itemData = this.extractUniversalFields(data, type);

            // 5. Extract type-specific fields
            switch (type) {
                case 'weapon':
                    this.extractWeaponFields(itemData, data);
                    break;
                case 'equipment':
                    this.extractEquipmentFields(itemData, data);
                    break;
                case 'consumable':
                    this.extractConsumableFields(itemData, data);
                    break;
                case 'tool':
                    this.extractToolFields(itemData, data);
                    break;
                case 'loot':
                    this.extractLootFields(itemData, data);
                    break;
                case 'container':
                    this.extractContainerFields(itemData, data);
                    break;
                case 'spell':
                    this.extractSpellFields(itemData, data);
                    break;
            }

            // 5b. Extract inline activities and effects
            itemData.pendingActivities = this.extractActivities(data);

            // 6. Return result
            const success = this.errors.length === 0;
            ItemUtils.log(`YamlItemParser: Parsing ${success ? 'succeeded' : 'completed with errors'}`);
            return this.createResult(success, itemData);

        } catch (error) {
            ItemUtils.error('YamlItemParser: Unexpected error', error);
            this.addError(`Unexpected error: ${error.message}`);
            return this.createResult(false, null);
        }
    }

    /**
     * Parse YAML text containing one or more item blocks.
     * Supports two batching methods:
     *   1. Multiple top-level keys in one document (WEAPON + EQUIPMENT + LOOT)
     *   2. YAML document separators (---) for same-type batching (WEAPON --- WEAPON)
     *
     * @param {string} text - Raw YAML text
     * @returns {Array} Array of parse result objects: { success, item, errors, warnings }
     */
    parseAll(text) {
        if (!text || !text.trim()) return [];

        const yamlText = this.stripCodeFences(text);
        const validKeys = ['WEAPON', 'EQUIPMENT', 'CONSUMABLE', 'TOOL', 'LOOT', 'CONTAINER', 'SPELL'];

        // Use loadAll to handle --- document separators
        let documents;
        try {
            documents = jsyaml.loadAll(yamlText);
        } catch (yamlError) {
            return [{
                success: false,
                item: null,
                errors: [`YAML parse error: ${yamlError.message}`],
                warnings: []
            }];
        }

        // Filter out null/empty documents (trailing --- can produce these)
        documents = documents.filter(doc => doc && typeof doc === 'object');

        if (documents.length === 0) {
            return [{
                success: false,
                item: null,
                errors: ['YAML document is empty or not an object'],
                warnings: []
            }];
        }

        // Single document with single key — delegate to existing parse()
        if (documents.length === 1) {
            const topKeys = Object.keys(documents[0]);
            const itemKeys = topKeys.filter(k => validKeys.includes(k));
            if (itemKeys.length <= 1) {
                return [this.parse(text)];
            }
        }

        // Process all documents, expanding multi-key documents
        const results = [];
        for (const doc of documents) {
            const topKeys = Object.keys(doc);

            for (const key of topKeys) {
                if (!validKeys.includes(key)) {
                    results.push({
                        success: false,
                        item: null,
                        errors: [`Unknown item type key "${key}". Expected: ${validKeys.join(', ')}. Note: SPELL items can be batched with other types.`],
                        warnings: []
                    });
                    continue;
                }

                const subDoc = { [key]: doc[key] };
                const subYaml = jsyaml.dump(subDoc);

                const subParser = new YamlItemParser();
                results.push(subParser.parse(subYaml));
            }
        }

        ItemUtils.log(`YamlItemParser: Batch parsed ${results.length} items from ${documents.length} document(s)`);
        return results;
    }

    // ─── Utility Methods ────────────────────────────────────────────────────

    stripCodeFences(text) {
        let cleaned = text.trim();
        // Remove opening ```yaml or ```markdown
        cleaned = cleaned.replace(/^```(?:yaml|markdown)\s*\n?/i, '');
        // Remove closing ```
        cleaned = cleaned.replace(/\n?```\s*$/, '');
        return cleaned.trim();
    }

    detectItemType(doc) {
        const typeMap = {
            'WEAPON': 'weapon',
            'EQUIPMENT': 'equipment',
            'CONSUMABLE': 'consumable',
            'TOOL': 'tool',
            'LOOT': 'loot',
            'CONTAINER': 'container',
            'SPELL': 'spell'
        };

        for (const [key, type] of Object.entries(typeMap)) {
            if (doc[key]) {
                return { type, data: doc[key] };
            }
        }

        return { type: null, data: null };
    }

    addError(message) {
        this.errors.push(message);
        ItemUtils.error(`Parse Error: ${message}`);
    }

    addWarning(message) {
        this.warnings.push(message);
        ItemUtils.warn(`Parse Warning: ${message}`);
    }

    createResult(success, itemData) {
        return {
            success,
            item: itemData,
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }

    // ─── Universal Field Extraction ─────────────────────────────────────────

    extractUniversalFields(data, type) {
        const itemSection = data?.ITEM || {};

        // Name (required)
        const name = asString(itemSection['Name'], '');
        if (!name) {
            this.addError('Name field is required but was not found or is empty');
        }
        if (name && name.length > 100) {
            this.addWarning(`Name is very long (${name.length} characters). Max recommended: 100`);
        }

        const itemData = new ItemData(name || 'Unnamed Item');
        itemData.type = type;

        // Rarity
        const rarityRaw = asString(itemSection['Rarity'], 'common').toLowerCase().replace(/\s+/g, '');
        itemData.rarity = RARITY_MAP[rarityRaw] || 'common';
        if (!RARITY_MAP[rarityRaw] && rarityRaw !== 'n/a' && rarityRaw !== '') {
            this.addWarning(`Unknown rarity "${itemSection['Rarity']}", defaulting to common`);
        }

        // Inventory
        const inv = data?.INVENTORY || {};
        itemData.quantity = asInt(inv['Quantity'], 1);
        itemData.identified = asBool(inv['Identified'], true);
        itemData.equipped = asBool(inv['Equipped'], false);

        // Cost and Weight
        const cw = data?.COST_AND_WEIGHT || {};
        itemData.costDisplay = asFloat(cw['Price Value'], 0);
        const denom = asString(cw['Price Denomination'], 'gp').toLowerCase();
        itemData.costDenomination = VALID_DENOMINATIONS.includes(denom) ? denom : 'gp';
        if (!VALID_DENOMINATIONS.includes(denom) && denom !== '') {
            this.addWarning(`Invalid price denomination "${denom}", using default: gp`);
        }

        itemData.weight = asFloat(cw['Weight Value'], 0);
        const wUnits = asString(cw['Weight Units'], 'lb').toLowerCase();
        itemData.weightUnits = VALID_WEIGHT_UNITS.includes(wUnits) ? wUnits : 'lb';
        if (!VALID_WEIGHT_UNITS.includes(wUnits) && wUnits !== '') {
            this.addWarning(`Invalid weight units "${wUnits}", using default: lb`);
        }

        // Description
        const descSection = data?.DESCRIPTION || {};
        itemData.description = asString(descSection['Description'], '');

        // Unidentified Description
        const unidentSection = data?.UNIDENTIFIED_DESCRIPTION || {};
        const unidentName = asNullable(unidentSection['Unidentified Name']);
        itemData.unidentifiedName = unidentName ? String(unidentName) : '';
        itemData.unidentifiedDescription = asString(unidentSection['Unidentified Description'], '');

        // Chat Flavor
        const chatSection = data?.CHAT_FLAVOR || {};
        itemData.chatDescription = asString(chatSection['Chat Description'], '');

        // Validation
        if (itemData.quantity < 0) {
            this.addError('Quantity cannot be negative');
        }
        if (itemData.weight < 0) {
            this.addError('Weight cannot be negative');
        }
        if (itemData.costDisplay < 0) {
            this.addError('Price cannot be negative');
        }

        ItemUtils.log('YamlItemParser: Universal fields extracted', {
            name: itemData.name, type: itemData.type, rarity: itemData.rarity
        });

        return itemData;
    }

    // ─── Shared Helpers ─────────────────────────────────────────────────────

    /**
     * Extract attunement fields from ATTUNEMENT section.
     * @param {ItemData} item
     * @param {Object} data - The type-level data object
     * @param {boolean} isMagical - Whether the item is magical
     */
    extractAttunement(item, data, isMagical) {
        if (!isMagical) {
            item.attunement = '';
            item.attunementRequirement = null;
            return;
        }

        const att = data?.ATTUNEMENT || {};
        const attunementVal = asString(att['Attunement'], 'none').toLowerCase();
        const validAttunements = ['none', 'required', 'optional'];

        if (!validAttunements.includes(attunementVal)) {
            this.addWarning(`Invalid Attunement value "${attunementVal}". Defaulting to "none".`);
        }

        item.attunement = (attunementVal === 'required' || attunementVal === 'optional') ? attunementVal : '';
        item.attunementRequirement = asNullable(att['Attunement By']) ? asString(att['Attunement By']) : null;

        const magicBonusRaw = asNullable(att['Magic Bonus']);
        if (magicBonusRaw !== null) {
            const magicBonus = asInt(magicBonusRaw, -1);
            if (magicBonus >= 0) {
                item.magicBonus = magicBonus;
                if (magicBonus > 3) {
                    this.addWarning(`Magic Bonus (${magicBonus}) should typically be between 0 and 3`);
                }
            } else {
                this.addWarning(`Invalid Magic Bonus value "${att['Magic Bonus']}".`);
            }
        }
    }

    /**
     * Extract attunement for equipment (uses string-based attunement values).
     */
    extractAttunementEquipment(item, data, isMagical) {
        if (!isMagical) {
            item.attunement = '';
            item.attunementRequirement = null;
            return;
        }

        const att = data?.ATTUNEMENT || {};
        const attunementVal = asString(att['Attunement'], 'none').toLowerCase();
        item.attunement = attunementVal === 'none' ? '' : attunementVal;
        item.attunementRequirement = asNullable(att['Attunement By']) ? asString(att['Attunement By']) : null;

        const magicBonusRaw = asNullable(att['Magic Bonus']);
        if (magicBonusRaw !== null) {
            const magicBonus = asInt(magicBonusRaw, -1);
            if (magicBonus >= 0) {
                item.magicBonus = magicBonus;
                if (magicBonus > 3) {
                    this.addWarning(`Magic Bonus (${magicBonus}) should typically be between 0 and 3`);
                }
            }
        }
    }

    /**
     * Extract USAGE and RECOVERY sections.
     * @param {ItemData} item
     * @param {Object} data - The type-level data object
     * @param {Object} [options] - Optional config
     * @param {boolean} [options.hasDestroyOnEmpty] - Whether to look for Destroy on Empty
     */
    extractUsageAndRecovery(item, data, options = {}) {
        const usage = data?.USAGE || {};
        const usesMax = asInt(usage['Uses Max'], 0);
        // Accept 'Uses Spent' (preferred) or 'Uses Current' (legacy fallback)
        const usesSpentRaw = usage['Uses Spent'] ?? usage['Uses Current'];
        // Blank/null defaults to 0 (item starts fresh/full)
        const usesSpent = (usesSpentRaw === null || usesSpentRaw === undefined)
            ? 0
            : asInt(usesSpentRaw, 0);

        if (options.hasDestroyOnEmpty) {
            item.autoDestroy = asBool(usage['Destroy on Empty'], false);
        }

        if (usesMax > 0) {
            item.uses = { value: usesSpent, max: usesMax };

            // Validate
            if (usesSpent < 0) this.addWarning('Uses Spent cannot be negative');
            if (usesMax < 0) this.addError('Uses Max cannot be negative');
            if (usesSpent > usesMax) {
                this.addWarning(`Uses Spent (${usesSpent}) exceeds Uses Max (${usesMax})`);
            }

            // Recovery
            const recoveryArr = data?.RECOVERY;
            if (recoveryArr) {
                const configs = this.parseRecoveryArray(recoveryArr);
                if (configs.length > 0) {
                    item.recovery = configs;
                    ItemUtils.log(`YamlItemParser: ${configs.length} recovery configuration(s) extracted`);
                }
            }
        }
    }

    /**
     * Parse RECOVERY YAML array into recovery config objects.
     * YAML allows arrays natively, so RECOVERY is expected as an array of objects.
     */
    parseRecoveryArray(recoveryData) {
        const configs = [];

        // Handle both single object and array
        const items = Array.isArray(recoveryData) ? recoveryData : [recoveryData];

        for (const entry of items) {
            if (!entry || typeof entry !== 'object') continue;

            const periodRaw = asString(entry['Period'], '').toLowerCase();
            const typeRaw = asString(entry['Type'], '').toLowerCase();
            const formulaRaw = asNullable(entry['Formula']);

            // Validate period
            if (!VALID_RECOVERY_PERIODS.includes(periodRaw)) {
                this.addWarning(`Invalid Recovery Period "${periodRaw}". Must be one of: ${VALID_RECOVERY_PERIODS.join(', ')}`);
                continue;
            }

            // Validate type
            const mappedType = RECOVERY_TYPE_MAP[typeRaw];
            if (!mappedType) {
                this.addWarning(`Invalid Recovery Type "${entry['Type']}". Must be one of: ${VALID_RECOVERY_TYPES.join(', ')}`);
                continue;
            }

            const config = {
                period: periodRaw,
                type: mappedType,
                formula: formulaRaw ? String(formulaRaw) : null
            };

            // Validate formula requirements
            if (config.type === 'formula' && !config.formula) {
                this.addWarning('Recovery Type "formula" requires a Formula value');
                continue;
            }

            // Validate recharge period
            if (config.period === 'recharge') {
                const rechargeValue = parseInt(config.formula);
                if (isNaN(rechargeValue) || rechargeValue < 2 || rechargeValue > 6) {
                    this.addWarning('Recovery Period "recharge" requires Formula to be 2, 3, 4, 5, or 6');
                    continue;
                }
            }

            configs.push(config);
        }

        return configs;
    }

    /**
     * Parse a damage type string (possibly comma-separated).
     * Returns a single string or array of strings.
     */
    parseDamageType(rawType) {
        if (!rawType) return null;
        const typeText = asString(rawType, '').toLowerCase();
        if (!typeText) return null;

        const types = typeText.split(',').map(t => t.trim());
        const invalidTypes = types.filter(t => !VALID_DAMAGE_TYPES.includes(t));

        if (invalidTypes.length > 0) {
            this.addError(`Invalid Damage Type(s): ${invalidTypes.join(', ')}`);
            return null;
        }

        return types.length === 1 ? types[0] : types;
    }

    // ─── WEAPON ─────────────────────────────────────────────────────────────

    extractWeaponFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Weapon Type (required)
        const weaponTypeRaw = asString(itemSection['Weapon Type'], '');
        if (!weaponTypeRaw) {
            this.addError('Weapon Type is required but was not found');
            return;
        }
        if (!VALID_WEAPON_TYPES.includes(weaponTypeRaw)) {
            this.addError(`Invalid Weapon Type "${weaponTypeRaw}". Must be one of: ${VALID_WEAPON_TYPES.join(', ')}`);
            return;
        }
        item.weaponType = weaponTypeRaw;

        // Base Weapon
        const baseWeaponRaw = asNullable(itemSection['Base Weapon']);
        if (baseWeaponRaw) {
            const baseKey = String(baseWeaponRaw).trim().toLowerCase();
            const systemValue = BASE_WEAPON_MAP[baseKey];
            if (systemValue) {
                item.baseWeapon = systemValue;
            } else {
                item.baseWeapon = baseKey;
                ItemUtils.warn(`YamlItemParser: No mapping for base weapon "${baseKey}", using as-is`);
            }
        }

        // Validate base weapon for standard types
        const standardTypes = ['simpleM', 'simpleR', 'martialM', 'martialR'];
        if (standardTypes.includes(item.weaponType) && !item.baseWeapon) {
            this.addError(`Base Weapon is required for ${item.weaponType} weapons`);
        }

        // Properties (17 booleans)
        const props = data?.PROPERTIES || {};
        item.properties = [];
        const propertyBools = {};

        for (const [propName, propCode] of Object.entries(WEAPON_PROPERTY_MAP)) {
            const val = asBool(props[propName], false);
            propertyBools[propName] = val;
            if (val) {
                item.properties.push(propCode);
            }
        }

        item.isMagical = propertyBools['Magical'];

        // Attunement (conditional on magical)
        this.extractAttunement(item, data, propertyBools['Magical']);

        // Ammunition (conditional)
        if (propertyBools['Ammunition']) {
            const ammoSection = data?.AMMUNITION || {};
            const ammoType = asString(ammoSection['Ammunition Type'], '');
            if (!ammoType) {
                this.addError('Ammunition Type is required when Ammunition property is true');
            } else if (!VALID_AMMO_TYPES.includes(ammoType)) {
                this.addError(`Invalid Ammunition Type "${ammoType}"`);
            } else {
                item.ammunitionType = ammoType;
            }
        }

        // Reload (conditional)
        if (propertyBools['Reload']) {
            const reloadSection = data?.RELOAD || {};
            const reloadAmount = asNullable(reloadSection['Reload Amount']);
            if (reloadAmount === null) {
                this.addError('Reload Amount is required when Reload property is true');
            } else {
                const val = asInt(reloadAmount, 0);
                if (val > 0) {
                    item.reloadAmount = val;
                } else {
                    this.addError(`Invalid Reload Amount "${reloadSection['Reload Amount']}". Must be a positive integer.`);
                }
            }
        }

        // Range
        const range = data?.RANGE || {};
        const reachVal = asNullable(range['Reach']);
        item.reach = reachVal !== null ? asInt(reachVal, null) : null;
        const rangeNormal = asNullable(range['Range Normal']);
        const rangeLong = asNullable(range['Range Long']);
        const rangeUnits = asString(range['Range Units'], 'ft').toLowerCase();

        item.range = {
            value: rangeNormal !== null ? asInt(rangeNormal) : null,
            long: rangeLong !== null ? asInt(rangeLong) : null,
            units: VALID_RANGE_UNITS.includes(rangeUnits) ? rangeUnits : 'ft'
        };

        // Damage (required)
        const dmg = data?.DAMAGE || {};
        const dmgFormula = asString(dmg['Damage Formula'], '');
        const dmgType = this.parseDamageType(dmg['Damage Type']);

        if (!dmgFormula) {
            this.addError('Damage Formula is required but was not found');
        }
        if (!dmgType) {
            this.addError('Damage Type is required but was not found');
        }

        if (dmgFormula && dmgType) {
            item.damage = { formula: dmgFormula, type: dmgType };
        }

        // Versatile Damage (conditional)
        if (propertyBools['Versatile']) {
            const versDmg = data?.VERSATILE_DAMAGE || {};
            const versFormula = asString(versDmg['Versatile Formula'], '');
            const versType = this.parseDamageType(versDmg['Versatile Damage Type']);

            if (!versFormula) {
                this.addError('Versatile Formula is required when Versatile property is true');
            }
            if (!versType) {
                this.addError('Versatile Damage Type is required when Versatile property is true');
            }

            if (versFormula && versType) {
                item.versatileDamage = { formula: versFormula, type: versType };
            } else if (versFormula && dmgType) {
                item.versatileDamage = { formula: versFormula, type: dmgType };
            }
        }

        // Mastery
        const masterySection = data?.MASTERY || {};
        const masteryRaw = asNullable(masterySection['Mastery']);
        if (masteryRaw) {
            const masteryVal = String(masteryRaw).trim().toLowerCase();
            if (VALID_MASTERIES.includes(masteryVal)) {
                item.mastery = masteryVal;
            } else {
                this.addWarning(`Invalid Mastery value "${masteryVal}"`);
            }
        }

        // Proficiency
        const profSection = data?.PROFICIENCY || {};
        const profRaw = String(asString(profSection['Proficient'], 'Automatic')).trim().toLowerCase();
        const weaponProfMap = { 'automatic': null, '0': 0, '1': 1 };
        item.proficient = weaponProfMap[profRaw] !== undefined ? weaponProfMap[profRaw] : null;

        // Siege Properties (conditional)
        if (item.weaponType === 'siege') {
            const siege = data?.SIEGE_PROPERTIES || {};
            const siegeAC = asNullable(siege['Siege Armor Class']);
            if (siegeAC !== null) item.siegeArmorClass = asInt(siegeAC);

            const coverRaw = asString(siege['Cover'], 'none').toLowerCase();
            item.cover = coverRaw;

            const hpCurrent = asNullable(siege['Hit Points Current']);
            const hpMax = asNullable(siege['Hit Points Max']);
            const hpThreshold = asNullable(siege['Hit Points Threshold']);
            const hpConditions = asNullable(siege['Health Conditions']);

            item.hitPoints = {
                value: hpCurrent !== null ? asInt(hpCurrent) : null,
                max: hpMax !== null ? asInt(hpMax) : null,
                dt: hpThreshold !== null ? asInt(hpThreshold) : null,
                conditions: hpConditions ? String(hpConditions) : ''
            };
        }

        // Usage and Recovery
        this.extractUsageAndRecovery(item, data);

        ItemUtils.log('YamlItemParser: Weapon fields extracted', {
            weaponType: item.weaponType, baseWeapon: item.baseWeapon,
            properties: item.properties, damage: item.damage
        });
    }

    // ─── EQUIPMENT ──────────────────────────────────────────────────────────

    extractEquipmentFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Equipment Type (required)
        const eqTypeRaw = asString(itemSection['Equipment Type'], '').toLowerCase();
        if (!eqTypeRaw) {
            this.addError('Equipment Type is required but was not found');
            return;
        }
        if (!VALID_EQUIPMENT_TYPES.includes(eqTypeRaw)) {
            this.addError(`Invalid Equipment Type "${eqTypeRaw}". Must be one of: ${VALID_EQUIPMENT_TYPES.join(', ')}`);
            return;
        }
        item.armorType = eqTypeRaw;

        // Base Equipment
        const baseRaw = asNullable(itemSection['Base Equipment']);
        if (baseRaw) {
            const baseKey = String(baseRaw).trim().toLowerCase().replace(/\s+/g, '');
            const systemValue = BASE_EQUIPMENT_MAP[baseKey];
            if (systemValue) {
                item.baseEquipment = systemValue;
            } else {
                item.baseEquipment = baseKey;
                ItemUtils.warn(`YamlItemParser: No mapping for base equipment "${baseKey}", using as-is`);
            }
        }

        // Validate base equipment for armor/shield types
        const armorTypesRequiringBase = ['light', 'medium', 'heavy', 'shield'];
        if (armorTypesRequiringBase.includes(eqTypeRaw) && !item.baseEquipment) {
            this.addWarning(`Base Equipment is recommended for ${eqTypeRaw} equipment`);
        }

        // Properties (4 booleans)
        const props = data?.PROPERTIES || {};
        const magical = asBool(props['Magical'], false);
        const adamantine = asBool(props['Adamantine'], false);
        const focus = asBool(props['Focus'], false);
        const stealthDisadvantage = asBool(props['Stealth Disadvantage'], false);

        item.isMagical = magical;
        item.properties = [];
        if (adamantine) item.properties.push('ada');
        if (focus) item.properties.push('foc');
        if (magical) item.properties.push('mgc');
        if (stealthDisadvantage) {
            item.properties.push('stealthDisadvantage');
            item.stealthDisadvantage = true;
        }

        // Attunement (equipment uses string-based)
        this.extractAttunementEquipment(item, data, magical);

        // Armor section (conditional)
        const armorTypes = ['light', 'medium', 'heavy', 'natural', 'shield'];
        if (armorTypes.includes(eqTypeRaw)) {
            const armor = data?.ARMOR || {};
            if (!data?.ARMOR) {
                this.addError('ARMOR section is required for armor and shield equipment');
            } else {
                const acRaw = asNullable(armor['Armor Class']);
                if (acRaw === null) {
                    this.addError('Armor Class is required for armor and shield equipment');
                } else {
                    const acVal = asInt(acRaw, -1);
                    if (acVal >= 0) {
                        item.armorClass = acVal;
                    } else {
                        this.addError(`Invalid Armor Class value "${armor['Armor Class']}". Must be a non-negative integer.`);
                    }
                }

                const maxDex = asNullable(armor['Max Dex Modifier']);
                if (maxDex !== null) {
                    item.maxDexModifier = asInt(maxDex, null);
                    item.armorAddDex = true;
                } else {
                    item.armorAddDex = item.maxDexModifier !== null;
                }

                const strReq = asNullable(armor['Strength Requirement']);
                if (strReq !== null) {
                    item.strengthRequirement = asInt(strReq);
                }
            }
        }

        // Vehicle Properties (conditional)
        if (eqTypeRaw === 'vehicle') {
            const vehicle = data?.VEHICLE_PROPERTIES || {};
            if (!data?.VEHICLE_PROPERTIES) {
                this.addWarning('VEHICLE PROPERTIES section recommended for vehicle equipment');
            } else {
                const vAC = asNullable(vehicle['Vehicle Armor Class']);
                if (vAC !== null) item.vehicleArmorClass = asInt(vAC);

                const coverRaw = asString(vehicle['Cover'], 'none').toLowerCase();
                item.cover = EQUIPMENT_COVER_MAP[coverRaw] !== undefined ? EQUIPMENT_COVER_MAP[coverRaw] : 0;
                if (EQUIPMENT_COVER_MAP[coverRaw] === undefined) {
                    this.addWarning(`Invalid Cover value "${coverRaw}". Expected: none, half, threequarters, total`);
                }

                const hpCurrent = asNullable(vehicle['Hit Points Current']);
                const hpMax = asNullable(vehicle['Hit Points Max']);
                const hpThreshold = asNullable(vehicle['Hit Points Threshold']);
                const hpConditions = asNullable(vehicle['Health Conditions']);

                item.hitPoints = {
                    value: hpCurrent !== null ? asInt(hpCurrent) : null,
                    max: hpMax !== null ? asInt(hpMax) : null,
                    dt: hpThreshold !== null ? asInt(hpThreshold) : null,
                    conditions: hpConditions ? String(hpConditions) : ''
                };

                const speedRaw = asNullable(vehicle['Speed']);
                if (speedRaw !== null) item.speed = asInt(speedRaw);

                const speedCond = asNullable(vehicle['Speed Conditions']);
                if (speedCond) item.speedConditions = String(speedCond);
            }
        }

        // Proficiency
        const profSection = data?.PROFICIENCY || {};
        const profRaw = String(asString(profSection['Proficient'], 'Automatic')).trim().toLowerCase();
        const equipProfMap = { 'automatic': null, '0': 0, '1': 1 };
        item.proficient = equipProfMap[profRaw] !== undefined ? equipProfMap[profRaw] : null;

        // Usage and Recovery
        this.extractUsageAndRecovery(item, data);

        ItemUtils.log('YamlItemParser: Equipment fields extracted', {
            armorType: item.armorType, baseEquipment: item.baseEquipment,
            armorClass: item.armorClass, properties: item.properties
        });
    }

    // ─── CONSUMABLE ─────────────────────────────────────────────────────────

    extractConsumableFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Consumable Type (required)
        const conTypeRaw = asString(itemSection['Consumable Type'], '').toLowerCase();
        if (!conTypeRaw) {
            this.addError('Consumable Type is required but was not found');
            return;
        }
        if (!VALID_CONSUMABLE_TYPES.includes(conTypeRaw)) {
            this.addError(`Invalid Consumable Type "${conTypeRaw}". Must be one of: ${VALID_CONSUMABLE_TYPES.join(', ')}`);
            return;
        }
        item.consumableType = conTypeRaw;

        // Properties
        const props = data?.PROPERTIES || {};
        const magical = asBool(props['Magical'], false);
        item.isMagical = magical;

        // Attunement
        this.extractAttunement(item, data, magical);

        // Ammunition Properties (conditional on type=ammo)
        if (conTypeRaw === 'ammo') {
            const ammoProps = data?.AMMUNITION_PROPERTIES || {};
            if (!data?.AMMUNITION_PROPERTIES) {
                this.addError('AMMUNITION PROPERTIES section is required for ammo consumables');
            } else {
                // Ammunition Type (required for ammo)
                const ammoTypeRaw = asString(ammoProps['Ammunition Type'], '').toLowerCase();
                if (!ammoTypeRaw) {
                    this.addError('Ammunition Type is required for ammo consumables');
                } else {
                    const systemVal = CONSUMABLE_AMMO_TYPE_MAP[ammoTypeRaw];
                    if (systemVal) {
                        item.ammunitionType = systemVal;
                    } else {
                        this.addError(`Invalid Ammunition Type "${ammoTypeRaw}". Must be one of: arrow, bolt, dart, needle, bullet, slingBullet, energyCell`);
                    }
                }

                // Ammo boolean properties
                item.adamantine = asBool(ammoProps['Adamantine'], false);
                item.silvered = asBool(ammoProps['Silvered'], false);
                item.returning = asBool(ammoProps['Returning'], false);

                // Magic Bonus
                const magicBonusRaw = asNullable(ammoProps['Magic Bonus']);
                if (magicBonusRaw !== null) {
                    const bonusVal = asInt(magicBonusRaw, -1);
                    if (bonusVal >= 0) {
                        item.magicBonus = bonusVal;
                    } else {
                        this.addWarning(`Invalid Magic Bonus value "${ammoProps['Magic Bonus']}". Must be a positive integer.`);
                    }
                }

                // Damage Formula (optional)
                const dmgFormula = asNullable(ammoProps['Damage Formula']);
                if (dmgFormula) {
                    const dmgType = this.parseDamageType(ammoProps['Damage Type']);
                    item.damage = {
                        formula: String(dmgFormula),
                        type: dmgType
                    };
                }

                // Damage Replace
                item.damageReplace = asBool(ammoProps['Damage Replace'], false);
            }
        }

        // Poison Properties (conditional on type=poison)
        if (conTypeRaw === 'poison') {
            const poisonProps = data?.POISON_PROPERTIES || {};
            if (!data?.POISON_PROPERTIES) {
                this.addError('POISON PROPERTIES section is required for poison consumables');
            } else {
                const poisonType = asString(poisonProps['Poison Type'], '').toLowerCase();
                if (!poisonType) {
                    this.addError('Poison Type is required for poison consumables but was not found');
                } else if (!VALID_POISON_TYPES.includes(poisonType)) {
                    this.addError(`Invalid Poison Type "${poisonType}". Must be one of: ${VALID_POISON_TYPES.join(', ')}`);
                } else {
                    item.poisonType = poisonType;
                }
            }
        }

        // Scroll Properties (conditional on type=scroll)
        if (conTypeRaw === 'scroll') {
            const scrollProps = data?.SCROLL_PROPERTIES || {};
            item.concentration = asBool(scrollProps['Concentration'], false);
            item.somatic = asBool(scrollProps['Somatic'], false);
            item.verbal = asBool(scrollProps['Verbal'], false);
            item.ritual = asBool(scrollProps['Ritual'], false);
        }

        // Usage and Recovery (with Destroy on Empty)
        this.extractUsageAndRecovery(item, data, { hasDestroyOnEmpty: true });

        // Validation
        if (conTypeRaw === 'ammo' && !item.ammunitionType) {
            this.addError('Ammunition Type is required for ammo consumables');
        }
        if (conTypeRaw === 'poison' && !item.poisonType) {
            this.addError('Poison Type is required for poison consumables');
        }

        ItemUtils.log('YamlItemParser: Consumable fields extracted', {
            consumableType: item.consumableType, isMagical: item.isMagical,
            ammunitionType: item.ammunitionType, poisonType: item.poisonType
        });
    }

    // ─── TOOL ───────────────────────────────────────────────────────────────

    extractToolFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Tool Type (required)
        const toolTypeRaw = asString(itemSection['Tool Type'], '').toLowerCase();
        if (!toolTypeRaw) {
            this.addError('Tool Type field is required but was not found');
            item.toolType = '';
        } else if (!VALID_TOOL_TYPES.includes(toolTypeRaw)) {
            this.addError(`Invalid Tool Type "${toolTypeRaw}". Must be one of: ${VALID_TOOL_TYPES.join(', ')}`);
            item.toolType = '';
        } else {
            // Map "other" to empty string for system compatibility
            item.toolType = toolTypeRaw === 'other' ? '' : toolTypeRaw;
        }

        // Base Tool (required)
        const baseToolRaw = asString(itemSection['Base Tool'], '').toLowerCase();
        if (!baseToolRaw) {
            this.addError('Base Tool field is required but was not found');
        } else if (BASE_TOOL_MAPPINGS.hasOwnProperty(baseToolRaw)) {
            item.baseToolItem = baseToolRaw;
        } else {
            this.addError(`Invalid Base Tool "${baseToolRaw}". See template for valid base tool IDs.`);
        }

        // Properties
        const props = data?.PROPERTIES || {};
        const magical = asBool(props['Magical'], false);
        item.isMagical = magical;

        // Tool Bonus (in PROPERTIES section)
        const toolBonusRaw = asNullable(props['Tool Bonus']);
        if (toolBonusRaw !== null) {
            const bonusVal = asInt(toolBonusRaw, NaN);
            if (!isNaN(bonusVal)) {
                item.toolBonus = bonusVal;
                if (bonusVal < -5 || bonusVal > 10) {
                    this.addWarning(`Tool Bonus ${bonusVal} is outside typical range (-5 to +10)`);
                }
            } else {
                this.addWarning(`Tool Bonus "${props['Tool Bonus']}" is not a valid number`);
            }
        }

        // Attunement
        this.extractAttunement(item, data, magical);

        // Ability Check section
        const abilityCheck = data?.ABILITY_CHECK || {};
        const profRaw = String(asString(abilityCheck['Proficient'], 'Automatic')).trim().toLowerCase();
        const toolProfMap = { 'automatic': null, '0': 0, '0.5': 0.5, '1': 1, '2': 2 };
        if (toolProfMap.hasOwnProperty(profRaw)) {
            item.proficient = toolProfMap[profRaw];
        } else {
            this.addWarning(`Invalid Proficient "${profRaw}". Defaulting to Automatic.`);
            item.proficient = null;
        }

        const abilityRaw = asNullable(abilityCheck['Ability']);
        if (abilityRaw) {
            const ability = String(abilityRaw).trim().toLowerCase();
            const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            if (validAbilities.includes(ability)) {
                item.toolAbility = ability;
            } else {
                this.addWarning(`Invalid Ability "${ability}". Must be one of: ${validAbilities.join(', ')}`);
            }
        }

        // Usage and Recovery
        this.extractUsageAndRecovery(item, data);

        // Validate Tool Type and Base Tool match
        if (item.baseToolItem && item.toolType !== null) {
            const expectedType = BASE_TOOL_MAPPINGS[item.baseToolItem];
            if (expectedType !== undefined && expectedType !== item.toolType) {
                this.addError(
                    `Base Tool "${item.baseToolItem}" does not match Tool Type "${item.toolType}". ` +
                    `This base tool requires type "${expectedType || 'other'}".`
                );
            }
        }

        ItemUtils.log('YamlItemParser: Tool fields extracted', {
            toolType: item.toolType, baseTool: item.baseToolItem,
            isMagical: item.isMagical, toolBonus: item.toolBonus
        });
    }

    // ─── LOOT ───────────────────────────────────────────────────────────────

    extractLootFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Loot Type (required)
        const lootTypeRaw = asString(itemSection['Loot Type'], '').toLowerCase();
        if (!lootTypeRaw) {
            this.addError('Loot Type field is required but was not found. Using fallback: gear');
            item.lootType = 'gear';
        } else if (!VALID_LOOT_TYPES.includes(lootTypeRaw)) {
            this.addError(`Invalid Loot Type "${lootTypeRaw}". Must be one of: ${VALID_LOOT_TYPES.join(', ')}`);
            item.lootType = 'gear';
        } else {
            item.lootType = lootTypeRaw;
        }

        // Properties
        const props = data?.PROPERTIES || {};
        item.isMagical = asBool(props['Magical'], false);

        // Loot items do NOT have attunement
        item.attunement = '';
        item.attunementRequirement = null;

        ItemUtils.log('YamlItemParser: Loot fields extracted', {
            lootType: item.lootType, isMagical: item.isMagical
        });
    }

    // ─── CONTAINER ──────────────────────────────────────────────────────────

    extractContainerFields(item, data) {
        // Properties
        const props = data?.PROPERTIES || {};
        const magical = asBool(props['Magical'], false);
        const weightlessContents = asBool(props['Weightless Contents'], false);

        item.isMagical = magical;
        item.weightlessContents = weightlessContents;

        // Attunement
        this.extractAttunement(item, data, magical);

        // Capacity
        const capacity = data?.CAPACITY || {};
        const itemCount = asNullable(capacity['Item Count']);
        if (itemCount !== null) {
            const val = asInt(itemCount, 0);
            if (val > 0) {
                item.itemCapacity = val;
            } else {
                this.addWarning('Item Capacity should be positive if specified');
            }
        }

        const weightCapVal = asNullable(capacity['Weight Capacity Value']);
        if (weightCapVal !== null) {
            const val = asFloat(weightCapVal, 0);
            if (val > 0) {
                item.weightCapacity = val;
            } else {
                this.addWarning('Weight Capacity should be positive if specified');
            }
        }

        const weightCapUnits = asNullable(capacity['Weight Capacity Units']);
        if (weightCapUnits) {
            const units = String(weightCapUnits).trim().toLowerCase();
            if (VALID_WEIGHT_UNITS.includes(units)) {
                item.weightCapacityUnits = units;
            }
        }

        const volumeCapVal = asNullable(capacity['Volume Capacity Value']);
        if (volumeCapVal !== null) {
            const val = asFloat(volumeCapVal, 0);
            if (val > 0) {
                item.volumeCapacity = val;
            } else {
                this.addWarning('Volume Capacity should be positive if specified');
            }
        }

        const volumeCapUnits = asNullable(capacity['Volume Capacity Units']);
        if (volumeCapUnits) {
            const units = String(volumeCapUnits).trim().toLowerCase();
            if (units === 'cubicfoot') {
                item.volumeCapacityUnits = 'cubicFoot';
            } else if (units === 'liter') {
                item.volumeCapacityUnits = 'liter';
            } else {
                this.addWarning(`Invalid Volume Capacity Units "${units}". Expected "cubicfoot" or "liter".`);
            }
        }

        // Currency Contents (required)
        const currency = data?.CURRENCY_CONTENTS || {};
        if (!data?.CURRENCY_CONTENTS) {
            this.addError('CURRENCY CONTENTS section is required but was not found');
            item.currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
        } else {
            const currencyTypes = [
                { name: 'Platinum', field: 'pp' },
                { name: 'Gold', field: 'gp' },
                { name: 'Electrum', field: 'ep' },
                { name: 'Silver', field: 'sp' },
                { name: 'Copper', field: 'cp' }
            ];

            const currencyObj = {};
            for (const ct of currencyTypes) {
                const rawVal = currency[ct.name];
                if (rawVal === undefined || rawVal === null) {
                    this.addError(`${ct.name} currency field is required but was not found`);
                    currencyObj[ct.field] = 0;
                } else {
                    const val = asInt(rawVal, -1);
                    if (val < 0) {
                        this.addError(`Invalid ${ct.name} value "${rawVal}". Must be a non-negative integer.`);
                        currencyObj[ct.field] = 0;
                    } else {
                        currencyObj[ct.field] = val;
                    }
                }
            }

            item.currency = currencyObj;
        }

        ItemUtils.log('YamlItemParser: Container fields extracted', {
            isMagical: item.isMagical, weightlessContents: item.weightlessContents,
            currency: item.currency
        });
    }

    // ─── SPELL ──────────────────────────────────────────────────────────────

    extractSpellFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Level (required, 0–9)
        const levelRaw = asNullable(itemSection['Level']);
        if (levelRaw === null) {
            this.addError('Level is required but was not found');
        } else {
            const level = asInt(levelRaw, -1);
            if (level < 0 || level > 9) {
                this.addError(`Invalid Level "${levelRaw}". Must be an integer from 0 to 9.`);
            } else {
                item.spellLevel = level;
            }
        }

        // School (required)
        const schoolRaw = asString(itemSection['School'], '').toLowerCase();
        if (!schoolRaw) {
            this.addError('School is required but was not found');
        } else if (!VALID_SPELL_SCHOOLS.includes(schoolRaw)) {
            this.addError(`Invalid School "${itemSection['School']}". Must be one of: ${VALID_SPELL_SCHOOLS.join(', ')}`);
        } else {
            item.spellSchool = schoolRaw;
        }

        // Spellcasting ability override (optional)
        const abilityRaw = asNullable(itemSection['Ability']);
        if (abilityRaw) {
            const VALID_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
            const abilityStr = String(abilityRaw).trim().toLowerCase();
            if (VALID_ABILITIES.includes(abilityStr)) {
                item.spellAbility = abilityStr;
            } else {
                this.addWarning(`Invalid Ability override "${abilityRaw}". Must be one of: ${VALID_ABILITIES.join(', ')}`);
            }
        }

        // Components
        const comp = data?.COMPONENTS || {};
        item.vocal = asBool(comp['Vocal'], false);
        item.somatic = asBool(comp['Somatic'], false);
        item.material = asBool(comp['Material'], false);

        // Materials (conditional on material component)
        if (item.material) {
            const mat = data?.MATERIALS || {};
            item.materialValue = asString(mat['Value'], '');

            const costRaw = asNullable(mat['Cost']);
            item.materialCost = costRaw !== null ? asInt(costRaw, 0) : null;

            const supplyRaw = asNullable(mat['Supply']);
            item.materialSupply = supplyRaw !== null ? asInt(supplyRaw, 0) : null;

            item.materialConsumed = asBool(mat['Consumed'], false);
        }

        // Preparation
        const prep = data?.PREPARATION || {};
        const methodRaw = asString(prep['Method'], 'prepared').toLowerCase();
        if (!VALID_SPELL_PREP_METHODS.includes(methodRaw)) {
            this.addWarning(`Invalid Preparation Method "${prep['Method']}", defaulting to "prepared"`);
            item.preparationMode = 'prepared';
        } else {
            item.preparationMode = methodRaw;
            item.ritual = (methodRaw === 'ritual');
        }
        item.prepared = asBool(prep['Prepared'], false);

        // Activation (required)
        const act = data?.ACTIVATION || {};
        const actTypeRaw = asString(act['Type'], '').toLowerCase();
        if (!actTypeRaw) {
            this.addError('Activation Type is required but was not found');
        } else if (!VALID_SPELL_ACTIVATION_TYPES.includes(actTypeRaw)) {
            this.addError(`Invalid Activation Type "${act['Type']}". Must be one of: ${VALID_SPELL_ACTIVATION_TYPES.join(', ')}`);
        } else {
            item.activationType = actTypeRaw;
        }

        const actValueRaw = asNullable(act['Value']);
        item.activationValue = actValueRaw !== null ? asInt(actValueRaw, 1) : 1;

        const actCondition = asNullable(act['Condition']);
        if (actCondition) item.activationCondition = String(actCondition);

        // Range
        const rng = data?.RANGE || {};
        const rangeUnitsRaw = asString(rng['Units'], 'ft').toLowerCase();
        const validRangeUnits = VALID_SPELL_RANGE_UNITS.includes(rangeUnitsRaw) ? rangeUnitsRaw : 'ft';
        if (!VALID_SPELL_RANGE_UNITS.includes(rangeUnitsRaw)) {
            this.addWarning(`Invalid Range Units "${rng['Units']}", defaulting to "ft"`);
        }
        const rangeValueRaw = asNullable(rng['Value']);
        item.range = {
            value: rangeValueRaw !== null ? asInt(rangeValueRaw, 0) : null,
            units: validRangeUnits
        };

        // Duration
        const dur = data?.DURATION || {};
        const durUnitsRaw = asString(dur['Units'], 'inst').toLowerCase();
        const validDurUnits = VALID_DURATION_UNITS.includes(durUnitsRaw) ? durUnitsRaw : 'inst';
        if (!VALID_DURATION_UNITS.includes(durUnitsRaw)) {
            this.addWarning(`Invalid Duration Units "${dur['Units']}", defaulting to "inst"`);
        }
        const durValueRaw = asNullable(dur['Value']);
        item.duration = {
            value: durValueRaw !== null ? asInt(durValueRaw, 0) : null,
            units: validDurUnits
        };
        item.concentration = asBool(dur['Concentration'], false);

        // Targets
        const tgt = data?.TARGETS || {};
        const tgtTypeRaw = asNullable(tgt['Type']);
        if (tgtTypeRaw) {
            const tgtTypeStr = String(tgtTypeRaw).trim();
            const matchedType = VALID_TARGET_TYPES.find(t => t.toLowerCase() === tgtTypeStr.toLowerCase());
            if (!matchedType) {
                this.addWarning(`Invalid Target Type "${tgtTypeRaw}". Must be one of: ${VALID_TARGET_TYPES.join(', ')}`);
            }
            const tgtCountRaw = asNullable(tgt['Count']);
            const tgtSpecialRaw = asNullable(tgt['Special']);
            item.target = {
                type: matchedType || tgtTypeStr,
                count: tgtCountRaw !== null ? asInt(tgtCountRaw, 0) : null,
                choice: asBool(tgt['Choice'], false),
                special: tgtSpecialRaw ? String(tgtSpecialRaw) : null
            };
        }

        // Area of Effect (conditional)
        if (data?.AREA) {
            const area = data.AREA;
            const shapeRaw = asString(area['Shape'], '').toLowerCase();
            const sizeRaw = asNullable(area['Size']);
            const areaUnitsRaw = asString(area['Units'], 'ft').toLowerCase();

            if (!VALID_AREA_SHAPES.includes(shapeRaw)) {
                this.addWarning(`Invalid Area Shape "${area['Shape']}". Must be one of: ${VALID_AREA_SHAPES.join(', ')}`);
            } else {
                const countRaw = asNullable(area['Count']);
                const widthRaw = asNullable(area['Width']);
                const heightRaw = asNullable(area['Height']);
                const contiguousRaw = asNullable(area['Contiguous']);

                item.area = {
                    type: shapeRaw,
                    size: sizeRaw !== null ? asInt(sizeRaw, 0) : null,
                    units: VALID_AREA_UNITS.includes(areaUnitsRaw) ? areaUnitsRaw : 'ft',
                    count: countRaw !== null ? asInt(countRaw, 0) : null,
                    width: widthRaw !== null ? asInt(widthRaw, 0) : null,
                    height: heightRaw !== null ? asInt(heightRaw, 0) : null,
                    contiguous: contiguousRaw !== null ? asBool(contiguousRaw, false) : undefined
                };
            }
        }

        // Usage and Recovery
        this.extractUsageAndRecovery(item, data);

        ItemUtils.log('YamlItemParser: Spell fields extracted', {
            level: item.spellLevel, school: item.spellSchool,
            vocal: item.vocal, somatic: item.somatic, material: item.material,
            preparationMode: item.preparationMode, activationType: item.activationType
        });
    }

    // ─── ACTIVITIES & EFFECTS ────────────────────────────────────────────────

    /**
     * Extract inline activity and effect blocks from Activities and effects sections.
     * Validates structure and extracts names for preview display.
     * Full parsing is deferred to import time (async) via the activity importer.
     *
     * Supports two separate sections:
     *   - Activities: array of ACTIVITY_* entries (activities with optional APPLIED_EFFECTS)
     *   - effects: array of standalone Active Effect definitions (passive item effects)
     *
     * @param {Object} data - The type-level data object (e.g., WEAPON contents)
     * @returns {Array} Array of { key, name, rawData } objects
     */
    extractActivities(data) {
        let activities = data?.Activities;

        // ── Normalize: dict → array ──
        // LLMs sometimes produce { ACTIVITY_HEAL: {...} } instead of [{ ACTIVITY_HEAL: {...} }]
        if (activities && typeof activities === 'object' && !Array.isArray(activities)) {
            this.addWarning('Activities should be a YAML array (use "- ACTIVITY_*:" with dashes). Auto-converting from dict.');
            activities = Object.entries(activities).map(([k, v]) => ({ [k]: v }));
        }

        if (!activities || !Array.isArray(activities)) activities = [];

        // ── Standalone effects: section (passive item effects) ──
        // Supports case variations: effects, Effects, EFFECTS
        const standaloneEffects = data?.effects ?? data?.Effects ?? data?.EFFECTS;
        if (standaloneEffects && Array.isArray(standaloneEffects)) {
            for (const eff of standaloneEffects) {
                activities.push({ EFFECT: eff });
            }
        }

        if (activities.length === 0) return [];

        const pending = [];

        for (let i = 0; i < activities.length; i++) {
            const entry = activities[i];
            if (!entry || typeof entry !== 'object') {
                this.addWarning(`Activities[${i}]: entry is not an object, skipping`);
                continue;
            }

            const keys = Object.keys(entry);
            if (keys.length !== 1) {
                this.addWarning(`Activities[${i}]: expected exactly one key (ACTIVITY_* or EFFECT), found ${keys.length}`);
                continue;
            }

            const key = keys[0];
            if (!key.startsWith('ACTIVITY_') && key !== 'EFFECT') {
                this.addWarning(`Activities[${i}]: unknown key "${key}", expected ACTIVITY_* or EFFECT`);
                continue;
            }

            const entryData = entry[key];
            const name = key === 'EFFECT'
                ? asString(entryData?.DETAILS?.Name, '(unnamed effect)')
                : asString(entryData?.ACTIVITY?.Name, '(unnamed activity)');

            pending.push({ key, name, rawData: entry });
        }

        if (pending.length > 0) {
            ItemUtils.log(`YamlItemParser: ${pending.length} inline activity/effect block(s) found`);
        }

        return pending;
    }
}
