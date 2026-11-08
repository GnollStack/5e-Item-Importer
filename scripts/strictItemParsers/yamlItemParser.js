// scripts/strictItemParsers/yamlItemParser.js

import jsyaml from '../vendor/js-yaml.mjs';
import { extendExplicitItemSchema, parseExplicitItemFields, preparedState } from '../itemExplicitFields.js';
import { formulaValue, exactNumber, exactBoolean, isUnset, stringList } from '../explicitYamlFields.js';
import { createReference } from '../itemReferenceResolver.js';
import {
    ADVANCEMENT_ROOTS, ADVANCEMENT_COMMON_KEYS, ADVANCEMENT_KEYS, MULTI_LEVEL_ADVANCEMENT_TYPES,
    GRANTABLE_ITEM_TYPES, SPELL_METHODS, SCALE_VALUE_TYPES, TRAIT_MODES, TRAIT_KEY_PATTERN,
    TRAIT_CATEGORY_CORRECTIONS, CLASS_RESTRICTIONS, SORTING_MODES, ABILITY_IDS
} from '../itemAdvancement.js';
import { parseItemRarities } from '../itemRarities.js';
import { parseAutomation } from '../automationFields.js';
import { ItemData } from '../itemData.js';
import { ItemUtils } from '../itemUtils.js';
import { MODULE_NAME, isPhysicalItemType } from '../itemConfig.js';
import {
    ITEM_YAML_SCHEMA_KEY,
    migrateItemYamlDocument,
    isItemYamlMetadataKey
} from './itemSchemaVersion.js';
import {
    normalizeCustomProperties,
    customPropertiesToFlagData
} from '../itemCustomProperties.js';

// ─── Helper Utilities ───────────────────────────────────────────────────────

function asBool(val, fallback = false) {
    if (val === true || val === false) return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return fallback;
}

function isPlainMapping(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const hasKey = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

/**
 * Token lists such as trait keys (`skills:ath`) and identifiers (`feat:alert`) lose their
 * shape when written unquoted: the LLM normalizer turns `- skills:ath` into a one-key
 * mapping `{ skills: "ath" }`. Fold those back into `key:value` strings before stringList.
 */
function foldTokenList(value) {
    const items = value instanceof Set ? [...value] : value;
    if (!Array.isArray(items)) return value;
    return items.map(entry => {
        if (!isPlainMapping(entry)) return entry;
        const keys = Object.keys(entry);
        const inner = entry[keys[0]];
        if (keys.length !== 1) return entry;
        if (inner === null) return `${keys[0]}:`;
        return ['string', 'number'].includes(typeof inner) ? `${keys[0]}:${String(inner).trim()}` : entry;
    });
}

function asInt(val, fallback = 0) {
    if (val === null || val === undefined || val === "" || String(val).toLowerCase() === "n/a") return fallback;
    return exactNumber(val, "Integer field", {integer:true,nullable:false});
}

function asExactInteger(val) {
    if (typeof val === 'number') return Number.isSafeInteger(val) ? val : NaN;
    const text = String(val).trim();
    if (!/^[+\-]?\d+$/.test(text)) return NaN;
    const parsed = Number(text);
    return Number.isSafeInteger(parsed) ? parsed : NaN;
}

/** Preserve dnd5e FormulaField expressions without parseInt-style truncation. */
function asFormulaFieldValue(val, { allowDice = true } = {}) {
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    const text = String(val ?? '').trim();
    if (!text || text.length > 200 || /[\r\n;]/.test(text)) return null;
    if (/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
        const numeric = Number(text);
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (!allowDice && /\b\d*d\d+/i.test(text)) return null;
    return /(?:@|\d*d\d+|[+\-*/%()])/i.test(text) ? text : null;
}

function asNullable(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim().toLowerCase();
    if (str === 'n/a' || str === '' || str === 'null' || str === 'none') return null;
    return val;
}

function asExactFiniteNumber(val) {
    if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;
    if (typeof val !== 'string') return NaN;
    const text = val.trim();
    if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?$/i.test(text)) return NaN;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function asString(val, fallback = '') {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    if (str.toLowerCase() === 'n/a') return fallback;
    return str || fallback;
}

// Multi-pass tolerance layer for common LLM/paste mistakes. js-yaml is strict
// and tends to fail several lines past the real problem; these passes silently
// fix the most common emission errors before parsing.
//
// Passes (in order, order matters):
//   bom           - strip leading U+FEFF (whole-file)
//   smartQuotes   - “” → ", ‘’ → ' on each non-block-scalar line
//   leadingTabs   - tabs at start of a line → 2 spaces each
//   keyColonSpace - `KEY:value` → `KEY: value`
//
// Per-line passes track block-scalar regions (`|`, `>`) so HTML descriptions
// and freeform multi-line content are never modified.
// The character after the colon must not be a YAML indicator (`*` alias, `&` anchor,
// `!` tag, `%` directive, `@` and backtick reserved): `skills:*` is a plain-scalar
// trait key, and `skills: *` would be an empty alias.
const KEY_NO_SPACE_RE = /^(\s*-?\s*)([A-Za-z_](?:[A-Za-z0-9_\- ]*[A-Za-z0-9_\-])?):([^\s*&!%@`])/;
const BLOCK_SCALAR_OPENER_RE = /:\s*[|>][\d+\-]*\s*(?:#.*)?$/;
const SMART_QUOTE_RE = /[‘’“”]/;
const LEADING_TABS_RE = /^\t+/;
const BOM = '﻿';

function normalizeYamlForLlm(text) {
    const fixes = [];
    if (!text) return { text, fixes };

    let working = text;
    if (working.charCodeAt(0) === 0xFEFF) {
        working = working.slice(1);
        fixes.push({ kind: 'bom', lineNo: 1, snippet: '' });
    }

    const lines = working.split('\n');
    let blockScalarIndent = -1;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const lineNo = i + 1;
        const original = line;

        const indentMatch = line.match(/^[ \t]*\S/);
        const indent = indentMatch ? indentMatch[0].length - 1 : -1;

        if (blockScalarIndent >= 0) {
            if (indent === -1 || indent > blockScalarIndent) continue;
            blockScalarIndent = -1;
        }

        if (SMART_QUOTE_RE.test(line)) {
            line = line.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
            fixes.push({ kind: 'smartQuotes', lineNo, snippet: original.trim() });
        }

        const tabMatch = line.match(LEADING_TABS_RE);
        if (tabMatch) {
            line = '  '.repeat(tabMatch[0].length) + line.slice(tabMatch[0].length);
            fixes.push({ kind: 'leadingTabs', lineNo, snippet: original.trim() });
        }

        const colonMatch = line.match(KEY_NO_SPACE_RE);
        if (colonMatch) {
            line = line.replace(KEY_NO_SPACE_RE, '$1$2: $3');
            fixes.push({ kind: 'keyColonSpace', lineNo, snippet: original.trim() });
        }

        lines[i] = line;

        if (BLOCK_SCALAR_OPENER_RE.test(line)) {
            blockScalarIndent = indent >= 0 ? indent : 0;
        }
    }

    return { text: lines.join('\n'), fixes };
}

function summarizeNormalizationFixes(fixes) {
    if (!fixes || fixes.length === 0) return null;

    const grouped = { bom: [], smartQuotes: [], leadingTabs: [], keyColonSpace: [] };
    for (const fix of fixes) {
        if (grouped[fix.kind]) grouped[fix.kind].push(fix);
    }

    const parts = [];
    if (grouped.bom.length) parts.push('Stripped UTF-8 BOM at file start.');
    if (grouped.smartQuotes.length) {
        const ex = grouped.smartQuotes[0];
        parts.push(`Converted smart quotes to straight quotes on ${grouped.smartQuotes.length} line${grouped.smartQuotes.length === 1 ? '' : 's'} (e.g., line ${ex.lineNo}: "${ex.snippet}").`);
    }
    if (grouped.leadingTabs.length) {
        const ex = grouped.leadingTabs[0];
        parts.push(`Converted leading tabs to spaces on ${grouped.leadingTabs.length} line${grouped.leadingTabs.length === 1 ? '' : 's'} (e.g., line ${ex.lineNo}).`);
    }
    if (grouped.keyColonSpace.length) {
        const ex = grouped.keyColonSpace[0];
        parts.push(`Added missing space after colon on ${grouped.keyColonSpace.length} line${grouped.keyColonSpace.length === 1 ? '' : 's'} (e.g., line ${ex.lineNo}: "${ex.snippet}").`);
    }

    return `Normalized YAML before parse:\n  • ${parts.join('\n  • ')}\nLLMs frequently produce these; safe to ignore.`;
}

function shouldShowNormalizationWarnings() {
    if (typeof game === 'undefined') return false;
    return game.settings?.get?.(MODULE_NAME, 'showNormalizationWarnings') ?? false;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_DENOMINATIONS = ['pp', 'gp', 'ep', 'sp', 'cp'];
const WEIGHT_UNIT_MAP = { lb: 'lb', tn: 'tn', kg: 'kg', mg: 'Mg', t: 'Mg' };
const VALID_WEIGHT_UNITS = Object.keys(WEIGHT_UNIT_MAP);
const VALID_RANGE_UNITS = ['ft', 'm', 'sq', 'mi'];
const VOLUME_UNIT_MAP = {
    cubicfoot: 'cubicFoot',
    cubicfeet: 'cubicFoot',
    ft: 'cubicFoot',
    liter: 'liter',
    litre: 'liter',
    l: 'liter'
};

const VALID_DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant',
    'slashing', 'thunder'
];

const VALID_RECOVERY_PERIODS = ['lr', 'sr', 'day', 'dawn', 'dusk', 'recharge', 'initiative', 'turnStart', 'turnEnd', 'turn'];
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
    'needle': 'blowgunNeedle', 'blowgunneedle': 'blowgunNeedle',
    'bullet': 'firearmBullet', 'firearmbullet': 'firearmBullet',
    'slingbullet': 'slingBullet', 'energycell': 'energyCell'
};

const VALID_POISON_TYPES = ['contact', 'ingested', 'inhaled', 'injury'];

// ─── Tool Constants ─────────────────────────────────────────────────────────

const BASE_TOOL_MAPPINGS = {
    alchemist: 'art', brewer: 'art', calligrapher: 'art', carpenter: 'art', cartographer: 'art',
    cobbler: 'art', cook: 'art', glassblower: 'art', jeweler: 'art', leatherworker: 'art',
    mason: 'art', painter: 'art', potter: 'art', smith: 'art', tinker: 'art',
    weaver: 'art', woodcarver: 'art',
    dice: 'game', card: 'game', chess: 'game',
    bagpipes: 'music', drum: 'music', dulcimer: 'music', flute: 'music',
    horn: 'music', lute: 'music', lyre: 'music', panflute: 'music',
    shawm: 'music', viol: 'music',
    disg: '', forg: '', herb: '', navg: '', pois: '', thief: ''
};

const LEGACY_BASE_TOOL_ALIASES = {
    alch: 'alchemist',
    brew: 'brewer',
    calli: 'calligrapher',
    carp: 'carpenter',
    carta: 'cartographer',
    cob: 'cobbler',
    glass: 'glassblower',
    jewel: 'jeweler',
    leath: 'leatherworker',
    maso: 'mason',
    paint: 'painter',
    pott: 'potter',
    tink: 'tinker',
    weav: 'weaver',
    wood: 'woodcarver'
};

const VALID_TOOL_TYPES = ['art', 'game', 'music'];

function getDefaultIdentifiedSetting() {
    if (typeof game === 'undefined') return true;
    return game.settings?.get?.(MODULE_NAME, 'createIdentified') ?? true;
}

// ─── Loot Constants ─────────────────────────────────────────────────────────

const VALID_LOOT_TYPES = ['art', 'gear', 'gem', 'junk', 'material', 'resource', 'trade', 'treasure'];

// ─── Spell Constants ─────────────────────────────────────────────────────────

const VALID_SPELL_SCHOOLS = ['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs'];
const VALID_SPELL_PREP_METHODS = ['atwill', 'innate', 'ritual', 'pact', 'spell', 'prepared'];
const VALID_SPELL_ACTIVATION_TYPES = ['action', 'bonus', 'reaction', 'minute', 'hour', 'day', 'special'];
const VALID_SPELL_RANGE_UNITS = ['self', 'touch', 'spec', 'any', 'ft', 'mi', 'm', 'km'];
const VALID_DURATION_UNITS = ['inst', 'spec', 'turn', 'round', 'minute', 'hour', 'day', 'month', 'year', 'disp', 'dstr', 'perm'];
const VALID_TARGET_TYPES = ['self', 'ally', 'enemy', 'creature', 'object', 'space', 'creatureOrObject', 'any', 'willing'];
const VALID_AREA_SHAPES = ['cone', 'cube', 'cylinder', 'radius', 'line', 'sphere', 'circle', 'square', 'wall'];
const VALID_AREA_UNITS = ['ft', 'mi', 'm', 'km'];

// ─── Feat Constants ──────────────────────────────────────────────────────────
// dnd5e 6.0.6 CONFIG.DND5E.featureTypes. The system stores unknown values
// as-is and labels them "Feature", so these lists drive warnings, not errors.

const VALID_FEATURE_TYPES = [
    'background', 'class', 'monster', 'race', 'enchantment',
    'feat', 'pietyTrait', 'supernaturalGift', 'vehicle'
];
const FEATURE_SUBTYPES = {
    class: [
        'arcaneShot', 'artificerInfusion', 'channelDivinity', 'defensiveTactic',
        'eldritchInvocation', 'elementalDiscipline', 'fightingStyle', 'huntersPrey',
        'ki', 'maneuver', 'metamagic', 'multiattack', 'pact', 'psionicPower',
        'rune', 'superiorHuntersDefense'
    ],
    enchantment: ['artificerInfusion', 'rune'],
    feat: ['general', 'origin', 'fightingStyle', 'epicBoon'],
    supernaturalGift: ['blessing', 'charm', 'epicBoon']
};
const VALID_ENCHANT_PERIODS = ['sr', 'lr', 'atwill'];

const COMMON_SECTION_KEYS = {
    ITEM: ['Name', 'Rarities', 'Rarity'],
    INVENTORY: ['Quantity', 'Identified', 'Equipped', 'Container'],
    COST_AND_WEIGHT: ['Price Value', 'Price Denomination', 'Weight Value', 'Weight Units'],
    DESCRIPTION: ['Description'],
    UNIDENTIFIED_DESCRIPTION: ['Unidentified Name', 'Unidentified Description'],
    CHAT_FLAVOR: ['Chat Description']
};

const ATTUNEMENT_KEYS = ['Attunement', 'Attunement By', 'Magic Bonus'];
const USAGE_KEYS = ['Uses Spent', 'Uses Current', 'Uses Max'];
const RECOVERY_KEYS = ['Period', 'Type', 'Formula'];
// Sections and keys that only exist on physical/identifiable dnd5e item types.
// Non-physical types (spell, feat) warn about them and ignore their values.
const NON_PHYSICAL_UNSUPPORTED_SECTIONS = new Set([
    'INVENTORY', 'COST_AND_WEIGHT', 'UNIDENTIFIED_DESCRIPTION', 'ATTUNEMENT'
]);
const NON_PHYSICAL_UNSUPPORTED_ITEM_KEYS = new Set(['Rarity', 'Rarities']);
const NON_PHYSICAL_DATA_MODEL = { spell: 'SpellData', feat: 'FeatData' };
// dnd5e PhysicalItemTemplate.MAX_DEPTH: a container chain may be at most this deep.
const CONTAINER_MAX_DEPTH = 5;
// Only physical Items can sit inside a container.
const CONTENT_ROOT_KEYS = ['WEAPON', 'EQUIPMENT', 'CONSUMABLE', 'TOOL', 'LOOT', 'CONTAINER'];

// This schema is intentionally warning-only. It catches misspelled or stale
// fields without preventing forward-compatible data from being inspected.
const TYPE_SECTION_KEYS = {
    weapon: {
        ITEM: ['Weapon Type', 'Base Weapon'],
        PROPERTIES: Object.keys(WEAPON_PROPERTY_MAP),
        ATTUNEMENT: ATTUNEMENT_KEYS,
        AMMUNITION: ['Ammunition Type'],
        RELOAD: ['Reload Amount'],
        RANGE: ['Reach', 'Range Normal', 'Range Long', 'Range Units'],
        DAMAGE: ['Damage Formula', 'Damage Type'],
        VERSATILE_DAMAGE: ['Versatile Formula', 'Versatile Damage Type'],
        MASTERY: ['Mastery'],
        PROFICIENCY: ['Proficient'],
        SIEGE_PROPERTIES: ['Siege Armor Class', 'Cover', 'Hit Points Current', 'Hit Points Max', 'Hit Points Threshold', 'Health Conditions'],
        USAGE: USAGE_KEYS,
        RECOVERY: RECOVERY_KEYS
    },
    equipment: {
        ITEM: ['Equipment Type', 'Base Equipment'],
        PROPERTIES: ['Adamantine', 'Focus', 'Magical', 'Stealth Disadvantage'],
        ATTUNEMENT: ATTUNEMENT_KEYS,
        ARMOR: ['Armor Class', 'Max Dex Modifier', 'Strength Requirement'],
        VEHICLE_PROPERTIES: ['Vehicle Armor Class', 'Cover', 'Hit Points Current', 'Hit Points Max', 'Hit Points Threshold', 'Health Conditions', 'Speed', 'Speed Conditions'],
        PROFICIENCY: ['Proficient'],
        USAGE: USAGE_KEYS,
        RECOVERY: RECOVERY_KEYS
    },
    consumable: {
        ITEM: ['Consumable Type'],
        PROPERTIES: ['Magical'],
        ATTUNEMENT: ATTUNEMENT_KEYS,
        AMMUNITION_PROPERTIES: ['Ammunition Type', 'Adamantine', 'Silvered', 'Returning', 'Magic Bonus', 'Damage Formula', 'Damage Type', 'Damage Replace'],
        POISON_PROPERTIES: ['Poison Type'],
        SCROLL_PROPERTIES: ['Concentration', 'Somatic', 'Vocal', 'Verbal', 'Ritual'],
        USAGE: [...USAGE_KEYS, 'Destroy on Empty'],
        RECOVERY: RECOVERY_KEYS
    },
    tool: {
        ITEM: ['Tool Type', 'Base Tool'],
        PROPERTIES: ['Magical', 'Tool Bonus'],
        ATTUNEMENT: ATTUNEMENT_KEYS,
        ABILITY_CHECK: ['Proficient', 'Ability'],
        USAGE: USAGE_KEYS,
        RECOVERY: RECOVERY_KEYS
    },
    loot: {
        ITEM: ['Loot Type'],
        PROPERTIES: ['Magical']
    },
    container: {
        PROPERTIES: ['Magical', 'Weightless Contents'],
        ATTUNEMENT: ATTUNEMENT_KEYS,
        CAPACITY: ['Item Count', 'Weight Capacity Value', 'Weight Capacity Units', 'Volume Capacity Value', 'Volume Capacity Units'],
        CURRENCY_CONTENTS: ['Platinum', 'Gold', 'Electrum', 'Silver', 'Copper']
    },
    spell: {
        ITEM: ['Level', 'School', 'Ability'],
        COMPONENTS: ['Vocal', 'Somatic', 'Material', 'Ritual'],
        MATERIALS: ['Value', 'Cost', 'Supply', 'Consumed'],
        PREPARATION: ['Method', 'Prepared'],
        ACTIVATION: ['Type', 'Value', 'Condition'],
        RANGE: ['Value', 'Units'],
        DURATION: ['Value', 'Units', 'Concentration'],
        TARGETS: ['Type', 'Count', 'Choice', 'Special'],
        AREA: ['Shape', 'Size', 'Units', 'Count', 'Width', 'Height', 'Contiguous'],
        USAGE: USAGE_KEYS,
        RECOVERY: RECOVERY_KEYS
    },
    feat: {
        // PREREQUISITES, ENCHANTMENT, and VEHICLE_PROPERTIES are added by
        // extendExplicitItemSchema() from the explicit field descriptors.
        // ADVANCEMENT is a list validated entry by entry in extractAdvancement().
        ITEM: ['Feature Type', 'Feature Subtype', 'Requirements'],
        PROPERTIES: ['Magical', 'Passive Trait'],
        USAGE: USAGE_KEYS,
        RECOVERY: RECOVERY_KEYS,
        ADVANCEMENT: []
    }
};

// ─── Main Parser Class ──────────────────────────────────────────────────────

export class YamlItemParser {
    constructor(options = {}) {
        this.options = options;
        this.errors = [];
        this.warnings = [];
        this.trace = null;
    }

    /**
     * Main parse method. Accepts raw text (with optional code fences).
     * @param {string} text - The raw template text.
     * @returns {Object} { success, item: ItemData, errors, warnings }
     */
    parse(text) {
        this.errors = [];
        this.warnings = [];
        this.trace = {
            selectedParser: 'YamlItemParser',
            inputKind: 'strictYaml',
            inputLength: typeof text === 'string' ? text.length : 0,
            normalizationFixes: []
        };

        if (!text || !text.trim()) {
            this.addError('Empty text provided');
            this.trace.errors = [...this.errors];
            return this.createResult(false, null);
        }

        try {
            // 1. Strip code fences
            const stripped = this.stripCodeFences(text);
            this.trace.strippedText = stripped;

            // 1b. Run the LLM-tolerance pre-pass
            const { text: yamlText, fixes } = normalizeYamlForLlm(stripped);
            this.trace.normalizedText = yamlText;
            this.trace.normalizationFixes = fixes;
            if (fixes.length > 0 && shouldShowNormalizationWarnings()) {
                const summary = summarizeNormalizationFixes(fixes);
                if (summary) this.addWarning(summary);
            }

            // 2. Parse YAML
            let doc;
            try {
                doc = jsyaml.load(yamlText);
            } catch (yamlError) {
                this.addError(`YAML parse error: ${yamlError.message}`);
                this.trace.errors = [...this.errors];
                this.trace.warnings = [...this.warnings];
                return this.createResult(false, null);
            }

            if (!doc || typeof doc !== 'object') {
                this.addError('YAML document is empty or not an object');
                this.trace.errors = [...this.errors];
                this.trace.warnings = [...this.warnings];
                return this.createResult(false, null);
            }

            // 2b. Migrate legacy documents before normal field extraction.
            const schema = migrateItemYamlDocument(doc);
            this.trace.schema = {
                sourceVersion: schema.sourceVersion,
                targetVersion: schema.targetVersion,
                explicitVersion: schema.explicitVersion,
                migrations: [...schema.migrations]
            };
            for (const message of schema.warnings) this.addWarning(message);
            if (schema.migrations.length > 0) {
                this.addWarning(`Migrated Item YAML schema: ${schema.migrations.join('; ')}.`);
            }
            for (const message of schema.errors) this.addError(message);
            if (schema.errors.length > 0) {
                this.trace.errors = [...this.errors];
                this.trace.warnings = [...this.warnings];
                return this.createResult(false, null);
            }
            doc = schema.document;

            // 3. Detect item type from top-level key
            const { type, data, rootKey } = this.detectItemType(doc);
            this.trace.detectedType = type || null;
            if (!type) {
                this.addError('Could not detect item type. Expected top-level key: WEAPON, LOOT, EQUIPMENT, CONSUMABLE, TOOL, CONTAINER, SPELL, or FEAT');
                this.trace.errors = [...this.errors];
                this.trace.warnings = [...this.warnings];
                return this.createResult(false, null);
            }

            if (data === null || typeof data !== 'object' || Array.isArray(data)) {
                this.addError(`${rootKey} must contain a mapping of item sections`);
                this.trace.errors = [...this.errors];
                this.trace.warnings = [...this.warnings];
                return this.createResult(false, null);
            }

            ItemUtils.log(`YamlItemParser: Detected item type: ${type}`);

            // Warn about ignored fields before extraction so copy/paste typos
            // are visible instead of silently disappearing.
            this.validateKnownKeys(data, type, doc);

            // Nested contents create several Items; only the batch flow can do that.
            if (type === 'container' && Array.isArray(data.CONTENTS) && data.CONTENTS.length > 0 && this.options?.allowContents !== true) {
                this.addError('CONTAINER.CONTENTS imports through the batch flow (the import window or parseAll()); parse() creates one Item and cannot create the contents.');
            }

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
                case 'feat':
                    this.extractFeatFields(itemData, data);
                    break;
            }

            parseExplicitItemFields(itemData, data, message => this.addWarning(message));
            itemData.automationSource = parseAutomation(data.AUTOMATION, "item", type);

            // 5b. Extract inline activities and effects
            itemData.pendingActivities = this.extractActivities(data);

            // 5c. Normalize registered custom properties and namespaced metadata.
            const customProperties = normalizeCustomProperties(data?.CUSTOM_PROPERTIES, {
                registry: this.options.propertyRegistry,
                itemType: type
            });
            for (const message of customProperties.warnings) this.addWarning(message);
            for (const message of customProperties.errors) this.addError(message);
            itemData.customProperties = {
                registered: [...customProperties.registered],
                metadata: { ...customProperties.metadata }
            };
            const hasCustomProperties = customProperties.registered.length > 0
                || Object.keys(customProperties.metadata).length > 0;
            itemData.customPropertyFlags = hasCustomProperties
                ? customPropertiesToFlagData(customProperties)
                : null;
            if (itemData.customPropertyFlags) itemData.flags = itemData.customPropertyFlags;
            if (customProperties.registered.length > 0) {
                itemData.properties = [...new Set([
                    ...(Array.isArray(itemData.properties) ? itemData.properties : []),
                    ...customProperties.registered
                ])];
            }
            itemData.yamlSchemaVersion = schema.targetVersion;
            itemData.yamlSourceSchemaVersion = schema.sourceVersion;
            itemData.yamlSchemaMigrations = [...schema.migrations];

            // 5d. A lone Item cannot bind its container by batch name; register the
            // destination-scoped reference now. parseAll() defers this until it has
            // looked for the container among the batch.
            if (itemData.containerRef && this.options?.deferContainerBinding !== true) {
                this.registerContainerReference(itemData, itemData.containerRef);
            }

            // 6. Return result
            const success = this.errors.length === 0;
            ItemUtils.log(`YamlItemParser: Parsing ${success ? 'succeeded' : 'completed with errors'}`);
            this.trace.errors = [...this.errors];
            this.trace.warnings = [...this.warnings];
            return this.createResult(success, success ? itemData : null);

        } catch (error) {
            ItemUtils.error('YamlItemParser: Unexpected error', error);
            this.addError(`Unexpected error: ${error.message}`);
            this.trace.errors = [...this.errors];
            this.trace.warnings = [...this.warnings];
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

        const stripped = this.stripCodeFences(text);
        const validKeys = ['WEAPON', 'EQUIPMENT', 'CONSUMABLE', 'TOOL', 'LOOT', 'CONTAINER', 'SPELL', 'FEAT'];

        // Run the LLM-tolerance pre-pass so loadAll() doesn't reject the batch.
        // Per-item warnings are emitted later when each sub-document is re-parsed
        // through parse() (where the setting check + addWarning live).
        const { text: yamlText } = normalizeYamlForLlm(stripped);

        // Use loadAll to handle --- document separators
        let documents;
        try {
            documents = jsyaml.loadAll(yamlText);
        } catch (yamlError) {
            return [{
                success: false,
                item: null,
                errors: [`YAML parse error: ${yamlError.message}`],
                warnings: [],
                sourceText: stripped.trim()
            }];
        }

        // Filter out null/empty documents (trailing --- can produce these)
        documents = documents.filter(doc => doc && typeof doc === 'object');

        if (documents.length === 0) {
            return [{
                success: false,
                item: null,
                errors: ['YAML document is empty or not an object'],
                warnings: [],
                sourceText: stripped.trim()
            }];
        }

        // Single document with single key — delegate to existing parse(), unless the
        // sole Item is a container with nested CONTENTS (several Items).
        if (documents.length === 1) {
            const topKeys = Object.keys(documents[0]);
            const itemKeys = topKeys.filter(k => validKeys.includes(k));
            const nestedContents = itemKeys.length === 1 && itemKeys[0] === 'CONTAINER'
                && Array.isArray(documents[0].CONTAINER?.CONTENTS) && documents[0].CONTAINER.CONTENTS.length > 0;
            if (itemKeys.length <= 1 && !nestedContents) {
                const result = this.parse(text);
                result.sourceText = stripped.trim();
                return [result];
            }
        }

        // Process all documents, expanding multi-key documents while carrying
        // schema metadata into every per-item sub-document.
        const results = [];
        for (const originalDoc of documents) {
            const schema = migrateItemYamlDocument(originalDoc);
            if (schema.errors.length > 0) {
                results.push({
                    success: false,
                    item: null,
                    errors: [...schema.errors],
                    warnings: [...schema.warnings],
                    sourceText: jsyaml.dump(originalDoc).trim()
                });
                continue;
            }
            const doc = schema.document;
            const topKeys = Object.keys(doc).filter((key) => !isItemYamlMetadataKey(key));
            if (topKeys.length === 0) {
                results.push({
                    success: false,
                    item: null,
                    errors: ['YAML document does not contain an Item root key'],
                    warnings: [...schema.warnings],
                    schema: {
                        sourceVersion: schema.sourceVersion,
                        targetVersion: schema.targetVersion,
                        explicitVersion: schema.explicitVersion,
                        migrations: [...schema.migrations]
                    },
                    sourceText: jsyaml.dump(doc).trim()
                });
                continue;
            }

            for (const key of topKeys) {
                const subDoc = {
                    [ITEM_YAML_SCHEMA_KEY]: doc[ITEM_YAML_SCHEMA_KEY],
                    [key]: doc[key]
                };
                const subYaml = jsyaml.dump(subDoc).trim();
                if (!validKeys.includes(key)) {
                    results.push({
                        success: false,
                        item: null,
                        errors: [`Unknown item type key "${key}". Expected: ${validKeys.join(', ')}. Note: SPELL and FEAT items can be batched with other types.`],
                        warnings: [],
                        sourceText: subYaml
                    });
                    continue;
                }

                // parseAll() is the batch flow, so a container may carry CONTENTS here.
                const result = this.parseBatchEntry(subDoc, schema, { allowContents: true });
                result.sourceText = subYaml;
                results.push(result);
                // A container's CONTENTS become separate results right after it.
                if (key === 'CONTAINER' && Array.isArray(doc[key]?.CONTENTS)) {
                    this.expandContents(results, results.length - 1, doc[key], schema, 1);
                }
            }
        }

        this.bindContainerReferences(results);

        ItemUtils.log(`YamlItemParser: Batch parsed ${results.length} items from ${documents.length} document(s)`);
        return results;
    }

    /** Parse one batch sub-document with the shared schema provenance. */
    parseBatchEntry(subDoc, schema, { allowContents = false } = {}) {
        const subParser = new YamlItemParser({ ...this.options, allowContents, deferContainerBinding: true });
        const result = subParser.parse(jsyaml.dump(subDoc).trim());
        const migrationWarning = schema.migrations.length > 0
            ? `Migrated Item YAML schema: ${schema.migrations.join('; ')}.`
            : null;
        result.warnings = [...new Set([
            ...schema.warnings,
            ...(migrationWarning ? [migrationWarning] : []),
            ...(result.warnings ?? [])
        ])];
        result.schema = {
            sourceVersion: schema.sourceVersion,
            targetVersion: schema.targetVersion,
            explicitVersion: schema.explicitVersion,
            migrations: [...schema.migrations]
        };
        if (result.item) {
            result.item.yamlSourceSchemaVersion = schema.sourceVersion;
            result.item.yamlSchemaMigrations = [...schema.migrations];
        }
        if (result.trace) result.trace.schema = { ...result.schema };
        return result;
    }

    /**
     * Flatten a CONTAINER's nested CONTENTS into the results that follow it. Each child
     * carries `containerRef = { kind: "batch", parentOrder, parentName, depth }`, where
     * parentOrder is the parent's index in the parseAll() results. Children of a failed
     * container fail too; nothing is ever imported at the top level by accident.
     */
    expandContents(results, parentOrder, containerData, schema, depth) {
        const parent = results[parentOrder];
        const parentName = parent.item?.name ?? asString(containerData?.ITEM?.Name, 'Container');
        const contents = containerData?.CONTENTS;
        if (!Array.isArray(contents)) {
            parent.warnings = [...(parent.warnings ?? []), 'CONTENTS must be a list of Item documents; it was ignored.'];
            return;
        }
        const schemaKey = schema.document?.[ITEM_YAML_SCHEMA_KEY] ?? schema.targetVersion;
        contents.forEach((entry, index) => {
            const location = `"${parentName}" CONTENTS[${index}]`;
            const containerRef = { kind: 'batch', parentOrder, parentName, depth };
            const fail = (message, sourceText = '') => results.push({
                success: false, item: null, errors: [message], warnings: [], sourceText, containerRef
            });
            if (!isPlainMapping(entry)) return fail(`${location} must be a mapping with one Item root key.`);
            const keys = Object.keys(entry);
            if (keys.length !== 1) return fail(`${location} must contain exactly one Item root key; found ${keys.length}.`);
            const key = keys[0];
            const body = entry[key];
            const retryDoc = {
                [ITEM_YAML_SCHEMA_KEY]: schemaKey,
                [key]: isPlainMapping(body) ? { ...body, INVENTORY: { ...(body.INVENTORY ?? {}), Container: parentName } } : body
            };
            const retryText = jsyaml.dump(retryDoc).trim();
            if (!CONTENT_ROOT_KEYS.includes(key)) {
                return fail(`${location}: "${key}" cannot be placed in a container. Contents must be physical Items (${CONTENT_ROOT_KEYS.join(', ')}).`, retryText);
            }
            if (depth > CONTAINER_MAX_DEPTH) {
                return fail(`${location} is nested ${depth} containers deep; dnd5e allows at most ${CONTAINER_MAX_DEPTH}.`, retryText);
            }
            const result = this.parseBatchEntry({ [ITEM_YAML_SCHEMA_KEY]: schemaKey, [key]: body }, schema, { allowContents: true });
            // The retry text re-links by container name if this child is imported again later.
            result.sourceText = retryText;
            result.containerRef = containerRef;
            if (!parent.success || !parent.item) {
                result.success = false;
                result.item = null;
                result.errors = [`${location}: its container "${parentName}" did not parse.`, ...(result.errors ?? [])];
            } else if (result.item) {
                if (result.item.containerRef) {
                    result.success = false;
                    result.item = null;
                    result.errors = [...(result.errors ?? []), `${location} sets INVENTORY.Container while already nested under CONTENTS; use one form.`];
                } else {
                    result.item.containerRef = containerRef;
                }
            }
            results.push(result);
            const childOrder = results.length - 1;
            if (key === 'CONTAINER' && isPlainMapping(body) && Array.isArray(body.CONTENTS) && body.CONTENTS.length > 0) {
                this.expandContents(results, childOrder, body, schema, depth + 1);
            }
        });
    }

    /** Depth of a batch-nested item: the number of batch containers above it. */
    batchContainerDepth(results, order) {
        let depth = 0;
        let current = results[order]?.item?.containerRef ?? results[order]?.containerRef;
        while (current?.kind === 'batch' && depth <= CONTAINER_MAX_DEPTH + 1) {
            depth += 1;
            current = results[current.parentOrder]?.item?.containerRef ?? results[current.parentOrder]?.containerRef;
        }
        return depth;
    }

    /**
     * Bind INVENTORY.Container names to containers in the same batch; everything else
     * (UUIDs, names not in the batch) becomes a destination-scoped container reference.
     */
    bindContainerReferences(results) {
        const containers = results
            .map((result, order) => ({ result, order }))
            .filter(({ result }) => result.success && result.item?.type === 'container');
        results.forEach((result, order) => {
            const item = result.item;
            const ref = item?.containerRef;
            if (!item || !ref || ref.kind === 'batch' || ref.kind === 'reference') return;
            if (ref.kind === 'name') {
                const wanted = ref.value.trim().toLowerCase();
                const matches = containers.filter(candidate => candidate.order !== order
                    && String(candidate.result.item.name ?? '').trim().toLowerCase() === wanted);
                if (matches.length > 1) {
                    result.success = false;
                    result.item = null;
                    result.errors = [...(result.errors ?? []), `INVENTORY.Container "${ref.value}" matches ${matches.length} containers in this batch; give them distinct names or use a UUID.`];
                    return;
                }
                if (matches.length === 1) {
                    const parentOrder = matches[0].order;
                    item.containerRef = { kind: 'batch', parentOrder, parentName: matches[0].result.item.name, depth: this.batchContainerDepth(results, parentOrder) + 1 };
                    // A container cannot end up inside its own contents.
                    let cursor = item.containerRef;
                    let steps = 0;
                    while (cursor?.kind === 'batch' && steps <= CONTAINER_MAX_DEPTH + 1) {
                        if (cursor.parentOrder === order) {
                            result.success = false;
                            result.item = null;
                            result.errors = [...(result.errors ?? []), `INVENTORY.Container "${ref.value}" would place "${item.name}" inside itself.`];
                            return;
                        }
                        cursor = results[cursor.parentOrder]?.item?.containerRef;
                        steps += 1;
                    }
                    if (item.containerRef.depth > CONTAINER_MAX_DEPTH) {
                        result.success = false;
                        result.item = null;
                        result.errors = [...(result.errors ?? []), `"${item.name}" would be nested ${item.containerRef.depth} containers deep; dnd5e allows at most ${CONTAINER_MAX_DEPTH}.`];
                    }
                    return;
                }
            }
            this.registerContainerReference(item, ref);
        });
    }

    /** Register a destination-scoped container reference (resolved by UUID, name or drag-and-drop). */
    registerContainerReference(item, ref) {
        item.references ??= [];
        item.references.push(createReference({
            kind: 'container',
            path: 'containerRef.uuid',
            label: `Container (${ref.value})`,
            query: ref.kind === 'uuid' ? { uuid: ref.value } : { name: ref.value }
        }));
        item.containerRef = { kind: 'reference', value: ref.value, uuid: ref.kind === 'uuid' ? ref.value : null };
    }

    // ─── Utility Methods ────────────────────────────────────────────────────

    stripCodeFences(text) {
        let cleaned = text.trim();
        // Remove opening ```, ```yaml, or ```markdown
        cleaned = cleaned.replace(/^```(?:yaml|markdown)?\s*\n?/i, '');
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
            'SPELL': 'spell',
            'FEAT': 'feat'
        };

        for (const [key, type] of Object.entries(typeMap)) {
            if (Object.prototype.hasOwnProperty.call(doc, key)) {
                return { type, data: doc[key], rootKey: key };
            }
        }

        return { type: null, data: null, rootKey: null };
    }

    validateKnownKeys(data, type, doc) {
        const rootKeyByType = {
            weapon: 'WEAPON', equipment: 'EQUIPMENT', consumable: 'CONSUMABLE',
            tool: 'TOOL', loot: 'LOOT', container: 'CONTAINER', spell: 'SPELL', feat: 'FEAT'
        };
        const validRootKeys = new Set(Object.values(rootKeyByType));
        const nonPhysical = !isPhysicalItemType(type);
        const dataModel = NON_PHYSICAL_DATA_MODEL[type] ?? 'item data';
        const expectedRootKey = rootKeyByType[type];

        for (const key of Object.keys(doc || {})) {
            if (isItemYamlMetadataKey(key)) continue;
            if (key === expectedRootKey) continue;
            if (validRootKeys.has(key)) {
                this.addWarning(`Additional item key "${key}" is ignored by parse(); use parseAll() for batches.`);
            } else {
                this.addWarning(`Unknown top-level key "${key}"; it will be ignored.`);
            }
        }

        const sectionSchemas = {};
        for (const [section, keys] of Object.entries(COMMON_SECTION_KEYS)) {
            if (nonPhysical && NON_PHYSICAL_UNSUPPORTED_SECTIONS.has(section)) continue;
            sectionSchemas[section] = nonPhysical && section === 'ITEM'
                ? keys.filter((key) => !NON_PHYSICAL_UNSUPPORTED_ITEM_KEYS.has(key))
                : [...keys];
        }
        for (const [section, keys] of Object.entries(TYPE_SECTION_KEYS[type] || {})) {
            sectionSchemas[section] = [
                ...(sectionSchemas[section] || []),
                ...keys
            ];
        }

        extendExplicitItemSchema(sectionSchemas, type);
        const passthroughSections = new Set([
            'Activities', 'effects', 'Effects', 'EFFECTS', 'CUSTOM_PROPERTIES', 'AUTOMATION'
        ]);
        // List-shaped sections whose entries are validated by their own extractors.
        const extractorValidatedSections = new Set(['ADVANCEMENT']);
        const allowedSections = Object.keys(sectionSchemas);

        for (const [section, sectionData] of Object.entries(data || {})) {
            if (passthroughSections.has(section)) continue;
            if (extractorValidatedSections.has(section) && hasKey(sectionSchemas, section)) continue;
            // CONTENTS is a list of nested Item documents, validated when parseAll() expands it.
            if (section === 'CONTENTS' && type === 'container') continue;
            if (nonPhysical && NON_PHYSICAL_UNSUPPORTED_SECTIONS.has(section)) {
                this.addWarning(`Unsupported ${type} section "${section}" is ignored by current dnd5e ${dataModel}.`);
                continue;
            }
            if (!Object.prototype.hasOwnProperty.call(sectionSchemas, section)) {
                const caseMatch = allowedSections.find(
                    (allowed) => allowed.toLowerCase() === section.toLowerCase()
                );
                const suggestion = caseMatch ? ` Did you mean "${caseMatch}"?` : '';
                this.addWarning(`Unknown ${type} section "${section}"; it will be ignored.${suggestion}`);
                continue;
            }

            const isMapping = sectionData !== null
                && typeof sectionData === 'object'
                && !Array.isArray(sectionData);
            if (section === 'RECOVERY') {
                const entries = Array.isArray(sectionData) ? sectionData : [sectionData];
                const malformedIndex = entries.findIndex(
                    (entry) => entry === null || typeof entry !== 'object' || Array.isArray(entry)
                );
                if (malformedIndex >= 0) {
                    this.addWarning(`RECOVERY[${malformedIndex}] must be a mapping; the malformed entry will be ignored.`);
                }
            } else if (!isMapping) {
                this.addWarning(`${section} must be a mapping; its fields will be ignored.`);
                continue;
            }

            const allowedKeys = sectionSchemas[section];
            const entries = section === 'RECOVERY'
                ? (Array.isArray(sectionData) ? sectionData : [sectionData])
                : [sectionData];

            for (const [index, entry] of entries.entries()) {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
                for (const key of Object.keys(entry)) {
                    if (nonPhysical && section === 'ITEM' && NON_PHYSICAL_UNSUPPORTED_ITEM_KEYS.has(key)) {
                        this.addWarning(`Unsupported ${type} key "ITEM.${key}" is ignored by current dnd5e ${dataModel}.`);
                        continue;
                    }
                    if (allowedKeys.includes(key)) continue;
                    const caseMatch = allowedKeys.find(
                        (allowed) => allowed.toLowerCase() === key.toLowerCase()
                    );
                    const suggestion = caseMatch ? ` Did you mean "${caseMatch}"?` : '';
                    const location = section === 'RECOVERY'
                        ? `${section}[${index}]`
                        : section;
                    this.addWarning(`Unknown key "${key}" in ${location}; it will be ignored.${suggestion}`);
                }
            }
        }
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
        const physical = isPhysicalItemType(type);

        if (physical) {
            // Physical/identifiable fields are not part of dnd5e SpellData or FeatData.
            itemData.rarities = parseItemRarities(itemSection);
            itemData.rarity = itemData.rarities[0] ?? "";

            const inv = data?.INVENTORY || {};
            const hasQuantity = Object.prototype.hasOwnProperty.call(inv, 'Quantity');
            const parsedQuantity = hasQuantity ? asExactInteger(inv['Quantity']) : 1;
            if (!Number.isSafeInteger(parsedQuantity)) {
                this.addError(`Quantity must be an integer; received "${inv['Quantity']}"`);
                itemData.quantity = 1;
            } else {
                itemData.quantity = parsedQuantity;
            }
            itemData.identified = asBool(inv['Identified'], getDefaultIdentifiedSetting());
            itemData.equipped = asBool(inv['Equipped'], false);

            // INVENTORY.Container: a container in the same batch (by name) or an existing
            // container (UUID, or drag-and-drop onto the reference zone). parseAll() binds
            // batch names; anything else becomes a destination-scoped reference.
            const containerRaw = asNullable(inv['Container']);
            itemData.containerRef = null;
            if (containerRaw !== null) {
                const value = String(containerRaw).trim();
                itemData.containerRef = /^(?:Compendium|Item|Actor)\.[^\s]+$/.test(value)
                    ? { kind: 'uuid', value }
                    : { kind: 'name', value };
            }

            const cw = data?.COST_AND_WEIGHT || {};
            const priceRaw = asNullable(cw['Price Value']);
            if (priceRaw === null) {
                itemData.costDisplay = 0;
            } else {
                const priceValue = asExactFiniteNumber(priceRaw);
                if (!Number.isFinite(priceValue)) {
                    this.addError(`Price Value must be a finite number or n/a; received "${cw['Price Value']}"`);
                    itemData.costDisplay = 0;
                } else {
                    itemData.costDisplay = priceValue;
                }
            }
            const denom = asString(cw['Price Denomination'], 'gp').toLowerCase();
            itemData.costDenomination = VALID_DENOMINATIONS.includes(denom) ? denom : 'gp';
            if (!VALID_DENOMINATIONS.includes(denom) && denom !== '') {
                this.addWarning(`Invalid price denomination "${denom}", using default: gp`);
            }

            const weightRaw = asNullable(cw['Weight Value']);
            if (weightRaw === null) {
                itemData.weight = 0;
            } else {
                const weightValue = asExactFiniteNumber(weightRaw);
                if (!Number.isFinite(weightValue)) {
                    this.addError(`Weight Value must be a finite number or n/a; received "${cw['Weight Value']}"`);
                    itemData.weight = 0;
                } else {
                    itemData.weight = weightValue;
                }
            }
            const wUnits = asString(cw['Weight Units'], 'lb').toLowerCase();
            itemData.weightUnits = WEIGHT_UNIT_MAP[wUnits] ?? 'lb';
            if (!WEIGHT_UNIT_MAP[wUnits] && wUnits !== '') {
                this.addWarning(`Invalid weight units "${wUnits}", using default: lb`);
            }
        }

        // Description
        const descSection = data?.DESCRIPTION || {};
        itemData.description = asString(descSection['Description'], '');

        if (physical) {
            const unidentSection = data?.UNIDENTIFIED_DESCRIPTION || {};
            const unidentName = asNullable(unidentSection['Unidentified Name']);
            itemData.unidentifiedName = unidentName ? String(unidentName) : '';
            itemData.unidentifiedDescription = asString(unidentSection['Unidentified Description'], '');
        }

        // Chat Flavor
        const chatSection = data?.CHAT_FLAVOR || {};
        itemData.chatDescription = asString(chatSection['Chat Description'], '');

        // Validation
        if (physical) {
            if (itemData.quantity < 0) {
                this.addError('Quantity cannot be negative');
            }
            if (itemData.weight < 0) {
                this.addError('Weight cannot be negative');
            }
            if (itemData.costDisplay < 0) {
                this.addError('Price cannot be negative');
            }
        }

        ItemUtils.log('YamlItemParser: Universal fields extracted', {
            name: itemData.name, type: itemData.type, rarity: itemData.rarity
        });

        return itemData;
    }

    // ─── Shared Helpers ─────────────────────────────────────────────────────

    /** Parse and preserve a dnd5e FormulaField bonus. */
    extractMagicBonusValue(item, rawValue, label = 'Magic Bonus') {
        const raw = asNullable(rawValue);
        if (raw === null) return null;
        const parsed = asFormulaFieldValue(raw, { allowDice: false });
        if (parsed === null) {
            this.addError(`${label} must be a finite number or deterministic formula; received "${rawValue}".`);
            return null;
        }
        item.magicBonus = parsed;
        if (parsed !== 0) item.isMagical = true;
        if (typeof parsed === 'number' && (parsed < 0 || parsed > 3)) {
            this.addWarning(`${label} (${parsed}) is outside the typical range 0 to 3.`);
        }
        return parsed;
    }

    /**
     * Extract attunement fields from ATTUNEMENT section.
     * @param {ItemData} item
     * @param {Object} data - The type-level data object
     * @param {boolean} isMagical - Whether the item is magical
     */
    extractAttunement(item, data, isMagical) {
        const att = data?.ATTUNEMENT || {};
        const restrictionRaw = asNullable(att['Attunement By']);
        const magicBonus = this.extractMagicBonusValue(item, att['Magic Bonus']);
        const resolvedMagical = isMagical || (magicBonus !== null && magicBonus !== 0);
        if (!resolvedMagical) {
            item.attunement = '';
            item.attunementRequirement = null;
            if (restrictionRaw !== null) {
                this.addWarning('ATTUNEMENT.Attunement By is ignored because Attunement resolves to none.');
            }
            return;
        }

        const attunementVal = asString(att['Attunement'], 'none').toLowerCase();
        const validAttunements = ['none', 'required', 'optional'];

        if (!validAttunements.includes(attunementVal)) {
            this.addWarning(`Invalid Attunement value "${attunementVal}". Defaulting to "none".`);
        }

        item.attunement = (attunementVal === 'required' || attunementVal === 'optional') ? attunementVal : '';
        item.attunementRequirement = item.attunement && restrictionRaw !== null
            ? asString(restrictionRaw)
            : null;
        if (!item.attunement && restrictionRaw !== null) {
            this.addWarning('ATTUNEMENT.Attunement By is ignored because Attunement resolves to none.');
        }

    }

    /**
     * Extract attunement for equipment (uses string-based attunement values).
     */
    extractAttunementEquipment(item, data, isMagical) {
        const att = data?.ATTUNEMENT || {};
        const restrictionRaw = asNullable(att['Attunement By']);
        const magicBonus = this.extractMagicBonusValue(item, att['Magic Bonus']);
        const resolvedMagical = isMagical || (magicBonus !== null && magicBonus !== 0);
        if (!resolvedMagical) {
            item.attunement = '';
            item.attunementRequirement = null;
            if (restrictionRaw !== null) {
                this.addWarning('ATTUNEMENT.Attunement By is ignored because Attunement resolves to none.');
            }
            return;
        }

        const attunementVal = asString(att['Attunement'], 'none').toLowerCase();
        const validAttunements = ['none', 'required', 'optional'];
        if (!validAttunements.includes(attunementVal)) {
            this.addWarning(`Invalid Attunement value "${attunementVal}". Defaulting to "none".`);
        }
        item.attunement = (attunementVal === 'required' || attunementVal === 'optional') ? attunementVal : '';
        item.attunementRequirement = item.attunement && restrictionRaw !== null
            ? asString(restrictionRaw)
            : null;
        if (!item.attunement && restrictionRaw !== null) {
            this.addWarning('ATTUNEMENT.Attunement By is ignored because Attunement resolves to none.');
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
        const usesMaxRaw = asNullable(usage['Uses Max']);
        const parsedUsesMax = usesMaxRaw === null ? 0 : asExactInteger(usesMaxRaw);
        const usesMaxFormula = typeof usesMaxRaw === 'string'
            && !/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(usesMaxRaw.trim())
            && usesMaxRaw.length <= 200
            && !/[\r\n;]/.test(usesMaxRaw)
            && !/\b\d*d\d+/i.test(usesMaxRaw)
            && /(?:@|[+\-*/%()])/.test(usesMaxRaw)
            ? usesMaxRaw.trim()
            : null;
        const usesMax = Number.isSafeInteger(parsedUsesMax) ? parsedUsesMax : usesMaxFormula;
        const hasUsesSpent = Object.prototype.hasOwnProperty.call(usage, 'Uses Spent');
        const hasUsesCurrent = Object.prototype.hasOwnProperty.call(usage, 'Uses Current');
        // `Uses Current` was the old remaining-uses label. Convert it to the
        // current dnd5e spent model; canonical `Uses Spent` wins if both exist.
        const usesSpentRaw = hasUsesSpent ? usage['Uses Spent'] : usage['Uses Current'];
        // Blank/null defaults to 0 (item starts fresh/full)
        const normalizedUsesSpent = asNullable(usesSpentRaw);
        let usesSpent = normalizedUsesSpent === null
            ? 0
            : asExactInteger(normalizedUsesSpent);
        let validUses = true;

        if (hasUsesSpent && hasUsesCurrent) {
            this.addWarning('USAGE.Uses Current is ignored because Uses Spent is also present.');
        } else if (hasUsesCurrent) {
            this.addWarning('USAGE.Uses Current is deprecated and means remaining uses; use Uses Spent instead.');
        }

        if (options.hasDestroyOnEmpty) {
            item.autoDestroy = asBool(usage['Destroy on Empty'], false);
        }

        if (!Number.isSafeInteger(usesMax) && typeof usesMax !== 'string') {
            this.addError(`Uses Max must be an integer, formula, or n/a; received "${usage['Uses Max']}"`);
            validUses = false;
        } else if (Number.isSafeInteger(usesMax) && usesMax < 0) {
            this.addError('Uses Max cannot be negative');
            validUses = false;
        }
        const usesValueLabel = hasUsesCurrent && !hasUsesSpent ? 'Uses Current' : 'Uses Spent';
        if (!Number.isSafeInteger(usesSpent)) {
            this.addError(`${usesValueLabel} must be an integer or n/a; received "${usesSpentRaw}"`);
            validUses = false;
        } else if (usesSpent < 0) {
            this.addError(`${usesValueLabel} cannot be negative`);
            validUses = false;
        }
        if (validUses && hasUsesCurrent && !hasUsesSpent && normalizedUsesSpent !== null) {
            if (typeof usesMax === 'string') {
                this.addError('Uses Current cannot be converted when Uses Max is a formula; provide Uses Spent instead.');
                validUses = false;
            } else if (usesSpent > usesMax) {
                this.addError(`Uses Current (${usesSpent}) exceeds Uses Max (${usesMax})`);
                validUses = false;
            } else {
                usesSpent = usesMax - usesSpent;
            }
        } else if (validUses && Number.isSafeInteger(usesMax) && usesSpent > usesMax) {
            this.addError(`Uses Spent (${usesSpent}) exceeds Uses Max (${usesMax})`);
            validUses = false;
        }

        if (validUses && (typeof usesMax === 'string' || usesMax > 0)) {
            // ItemData maps value to dnd5e system.uses.spent, not remaining uses.
            item.uses = { value: usesSpent, max: usesMax };

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

            // Periods are matched case-insensitively and stored with their dnd5e
            // spelling (turnStart, turnEnd) rather than lowercased.
            const periodInput = asString(entry['Period'], '');
            const periodRaw = VALID_RECOVERY_PERIODS.find(p => p.toLowerCase() === periodInput.toLowerCase())
                ?? periodInput.toLowerCase();
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
                if (!/^[2-6]$/.test(String(config.formula ?? '').trim())) {
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
        // `n/a` is valid only as an omitted primary type. Callers still require
        // typed formula terms such as 1d8[slashing] when this returns null.
        if (asNullable(rawType) === null) return null;
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

    extractFormulaDamageTypes(formula) {
        const formulaText = asString(formula, '').toLowerCase();
        if (!formulaText) return [];

        const found = [];
        for (const match of formulaText.matchAll(/\[([a-z]+)\]/g)) {
            if (VALID_DAMAGE_TYPES.includes(match[1]) && !found.includes(match[1])) {
                found.push(match[1]);
            }
        }
        return found;
    }

    hasUntypedDamageDice(formula) {
        const formulaText = asString(formula, '');
        for (const match of formulaText.matchAll(/\b\d+d\d+(?:\s*[+\-]\s*\d+)?/gi)) {
            const suffix = formulaText.slice((match.index ?? 0) + match[0].length);
            const typeMatch = suffix.match(/^(?:[a-z][a-z0-9<>=!]*)?\s*\[([a-z]+)\]/i);
            if (!typeMatch || !VALID_DAMAGE_TYPES.includes(typeMatch[1].toLowerCase())) return true;
        }
        return false;
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
        if (propertyBools['Reload'] && asNullable(data?.RELOAD?.['Reload Amount']) !== null) {
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
        item.reach = reachVal !== null ? exactNumber(reachVal, 'RANGE.Reach', {min:0}) : null;
        const rangeNormal = asNullable(range['Range Normal']);
        const rangeLong = asNullable(range['Range Long']);
        const rangeUnits = asString(range['Range Units'], 'ft').toLowerCase();

        item.range = {
            value: rangeNormal !== null ? exactNumber(rangeNormal, 'RANGE.Range Normal', {min:0}) : null,
            long: rangeLong !== null ? exactNumber(rangeLong, 'RANGE.Range Long', {min:0}) : null,
            units: VALID_RANGE_UNITS.includes(rangeUnits) ? rangeUnits : 'ft'
        };

        // Damage (required)
        const dmg = data?.DAMAGE || {};
        const dmgFormula = asString(dmg['Damage Formula'], '');
        const dmgTypeProvided = asNullable(dmg['Damage Type']) !== null;
        const dmgType = this.parseDamageType(dmg['Damage Type']);
        const dmgFormulaTypes = this.extractFormulaDamageTypes(dmgFormula);

        if (!dmgFormula && !Object.hasOwn(dmg, 'DAMAGE_DATA')) {
            this.addError('Damage Formula is required but was not found');
        }
        if (!dmgType && dmgFormulaTypes.length === 0 && !dmgTypeProvided && !Object.hasOwn(dmg, 'DAMAGE_DATA')) {
            this.addError('Damage Type is required unless Damage Formula uses typed terms like 1d8[piercing]');
        }
        if (!dmgTypeProvided && dmgFormulaTypes.length > 0 && this.hasUntypedDamageDice(dmgFormula)) {
            this.addError('Damage Formula must type every dice term when Damage Type is n/a');
        }

        if (dmgFormula && (dmgType || dmgFormulaTypes.length > 0)) {
            item.damage = { formula: dmgFormula, type: dmgType || [] };
        }

        // Versatile Damage (conditional)
        if (propertyBools['Versatile']) {
            const versDmg = data?.VERSATILE_DAMAGE || {};
            const versFormula = asString(versDmg['Versatile Formula'], '');
            const versTypeProvided = asNullable(versDmg['Versatile Damage Type']) !== null;
            const versType = this.parseDamageType(versDmg['Versatile Damage Type']);
            const versFormulaTypes = this.extractFormulaDamageTypes(versFormula);

            if (!versFormula && !Object.hasOwn(versDmg, 'DAMAGE_DATA')) {
                this.addError('Versatile Formula is required when Versatile property is true');
            }
            if (!versType && versFormulaTypes.length === 0 && !versTypeProvided && !Object.hasOwn(versDmg, 'DAMAGE_DATA')) {
                this.addError('Versatile Damage Type is required unless Versatile Formula uses typed terms like 1d10[slashing]');
            }
            if (!versTypeProvided && versFormulaTypes.length > 0 && this.hasUntypedDamageDice(versFormula)) {
                this.addError('Versatile Formula must type every dice term when Versatile Damage Type is n/a');
            }

            if (versFormula && (versType || versFormulaTypes.length > 0)) {
                item.versatileDamage = { formula: versFormula, type: versType || [] };
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
            item.cover = EQUIPMENT_COVER_MAP[coverRaw] !== undefined ? EQUIPMENT_COVER_MAP[coverRaw] : exactNumber(coverRaw, "Cover", {min:0,max:1});
            if (EQUIPMENT_COVER_MAP[coverRaw] === undefined && !Number.isFinite(Number(coverRaw))) {
                this.addWarning(`Invalid Cover value "${coverRaw}". Expected: none, half, threequarters, total`);
            }

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
                item.cover = EQUIPMENT_COVER_MAP[coverRaw] !== undefined ? EQUIPMENT_COVER_MAP[coverRaw] : exactNumber(coverRaw, "Cover", {min:0,max:1});
                if (EQUIPMENT_COVER_MAP[coverRaw] === undefined && !Number.isFinite(Number(coverRaw))) {
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
                        this.addError(`Invalid Ammunition Type "${ammoTypeRaw}". Must be one of: arrow, bolt, needle, bullet, slingBullet, energyCell`);
                    }
                }

                // Ammo boolean properties
                item.adamantine = asBool(ammoProps['Adamantine'], false);
                item.silvered = asBool(ammoProps['Silvered'], false);
                item.returning = asBool(ammoProps['Returning'], false);

                // Magic Bonus
                const magicBonusRaw = asNullable(ammoProps['Magic Bonus']);
                if (magicBonusRaw !== null) {
                    this.extractMagicBonusValue(item, magicBonusRaw, 'Ammunition Magic Bonus');
                }

                // Damage Formula (optional)
                const dmgFormula = asNullable(ammoProps['Damage Formula']);
                if (dmgFormula) {
                    const dmgTypeProvided = asNullable(ammoProps['Damage Type']) !== null;
                    const dmgType = this.parseDamageType(ammoProps['Damage Type']);
                    const dmgFormulaTypes = this.extractFormulaDamageTypes(dmgFormula);
                    if (!dmgType && dmgFormulaTypes.length === 0 && !dmgTypeProvided) {
                        this.addError('Ammunition Damage Type is required unless Damage Formula uses typed terms like 1d6[piercing]');
                    } else if (!dmgTypeProvided && dmgFormulaTypes.length > 0 && this.hasUntypedDamageDice(dmgFormula)) {
                        this.addError('Ammunition Damage Formula must type every dice term when Damage Type is n/a');
                    } else {
                        item.damage = {
                            formula: String(dmgFormula),
                            type: dmgType || []
                        };
                    }
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
            const vocal = asBool(scrollProps['Vocal'] ?? scrollProps['Verbal'], false);
            item.vocal = vocal;
            // ItemData's legacy `verbal` path writes an obsolete dnd5e code.
            // Suppress it and stage the current `vocal` code via properties.
            item.verbal = false;
            if (vocal && !item.properties.includes('vocal')) {
                item.properties.push('vocal');
            }
            if (scrollProps['Verbal'] !== undefined && scrollProps['Vocal'] === undefined) {
                this.addWarning('SCROLL_PROPERTIES.Verbal is deprecated; use Vocal for current dnd5e.');
            }
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

        // Base Tool (required)
        const baseToolRaw = asString(itemSection['Base Tool'], '').toLowerCase();
        if (!baseToolRaw) {
            this.addError('Base Tool field is required but was not found');
        } else {
            const normalizedBaseTool = LEGACY_BASE_TOOL_ALIASES[baseToolRaw] ?? baseToolRaw;
            if (BASE_TOOL_MAPPINGS.hasOwnProperty(normalizedBaseTool)) {
                item.baseToolItem = normalizedBaseTool;
            } else {
                this.addError(`Invalid Base Tool "${baseToolRaw}". See template for valid base tool IDs.`);
            }
        }

        // Tool Type (optional, inferred from Base Tool when omitted)
        const toolTypeRaw = asString(itemSection['Tool Type'], '').toLowerCase();
        const normalizedToolType = toolTypeRaw === 'other' ? '' : toolTypeRaw;
        if (!toolTypeRaw) {
            item.toolType = item.baseToolItem ? (BASE_TOOL_MAPPINGS[item.baseToolItem] ?? '') : '';
        } else if (!VALID_TOOL_TYPES.includes(normalizedToolType) && normalizedToolType !== '') {
            this.addError(`Invalid Tool Type "${toolTypeRaw}". Must be one of: ${VALID_TOOL_TYPES.join(', ')} or left blank for disguise/forgery/herbalism/navigator/poisoner/thieves' tools.`);
            item.toolType = item.baseToolItem ? (BASE_TOOL_MAPPINGS[item.baseToolItem] ?? '') : '';
        } else {
            item.toolType = normalizedToolType;
        }

        // Properties
        const props = data?.PROPERTIES || {};
        const magical = asBool(props['Magical'], false);
        item.isMagical = magical;

        // Tool Bonus (in PROPERTIES section)
        const toolBonusRaw = asNullable(props['Tool Bonus']);
        if (toolBonusRaw !== null) {
            const bonusVal = asFormulaFieldValue(toolBonusRaw);
            if (bonusVal !== null) {
                item.toolBonus = bonusVal;
                if (typeof bonusVal === 'number' && (bonusVal < -5 || bonusVal > 10)) {
                    this.addWarning(`Tool Bonus ${bonusVal} is outside typical range (-5 to +10)`);
                }
            } else {
                this.addError(`Tool Bonus must be a finite number or formula; received "${props['Tool Bonus']}".`);
            }
        }

        // Attunement
        this.extractAttunement(item, data, magical);

        // Ability Check section
        const abilityCheck = data?.ABILITY_CHECK || {};
        const profRaw = String(asString(abilityCheck['Proficient'], 'Automatic')).trim().toLowerCase();
        const toolProfMap = { 'automatic': null, '0': 0, '0.5': 0.5, '1': 1, '1.5': 1.5, '2': 2 };
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
                    `This base tool requires type "${expectedType || '(blank)'}".`
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
            const val = asExactInteger(itemCount);
            if (!Number.isSafeInteger(val)) {
                this.addError(`Item Count must be an integer or n/a; received "${capacity['Item Count']}"`);
            } else if (val > 0) {
                item.itemCapacity = val;
            } else if (val < 0) {
                this.addError('Item Count cannot be negative');
            } else {
                this.addWarning('Item Capacity should be positive if specified');
            }
        }

        const weightCapVal = asNullable(capacity['Weight Capacity Value']);
        if (weightCapVal !== null) {
            const val = asExactFiniteNumber(weightCapVal);
            if (!Number.isFinite(val)) {
                this.addError(`Weight Capacity Value must be a finite number or n/a; received "${capacity['Weight Capacity Value']}"`);
            } else if (val > 0) {
                item.weightCapacity = val;
            } else if (val < 0) {
                this.addError('Weight Capacity Value cannot be negative');
            } else {
                this.addWarning('Weight Capacity should be positive if specified');
            }
        }

        const weightCapUnits = asNullable(capacity['Weight Capacity Units']);
        if (weightCapUnits) {
            const units = String(weightCapUnits).trim().toLowerCase();
            if (WEIGHT_UNIT_MAP[units]) {
                item.weightCapacityUnits = WEIGHT_UNIT_MAP[units];
            }
        }

        const volumeCapVal = asNullable(capacity['Volume Capacity Value']);
        if (volumeCapVal !== null) {
            const val = asExactFiniteNumber(volumeCapVal);
            if (!Number.isFinite(val)) {
                this.addError(`Volume Capacity Value must be a finite number or n/a; received "${capacity['Volume Capacity Value']}"`);
            } else if (val > 0) {
                item.volumeCapacity = val;
            } else if (val < 0) {
                this.addError('Volume Capacity Value cannot be negative');
            } else {
                this.addWarning('Volume Capacity should be positive if specified');
            }
        }

        const volumeCapUnits = asNullable(capacity['Volume Capacity Units']);
        if (volumeCapUnits) {
            const units = String(volumeCapUnits).trim().toLowerCase();
            if (VOLUME_UNIT_MAP[units]) {
                item.volumeCapacityUnits = VOLUME_UNIT_MAP[units];
            } else {
                this.addWarning(`Invalid Volume Capacity Units "${units}". Expected "cubicfoot" or "liter".`);
            }
        }

        // Currency Contents (optional)
        const currency = data?.CURRENCY_CONTENTS || {};
        if (!data?.CURRENCY_CONTENTS) {
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
        if (!schoolRaw && !Object.hasOwn(itemSection, 'School')) {
            this.addError('School is required but was not found');
        } else if (schoolRaw && !VALID_SPELL_SCHOOLS.includes(schoolRaw)) {
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
        if (item.material || data?.MATERIALS) {
            const mat = data?.MATERIALS || {};
            item.materialValue = asString(mat['Value'], '');

            for (const [field, property] of [['Cost', 'materialCost'], ['Supply', 'materialSupply']]) {
                const raw = mat[field];
                if (raw == null || (typeof raw === 'string' && asNullable(raw) === null)) {
                    item[property] = null;
                    continue;
                }
                const value = asExactFiniteNumber(raw);
                if (!Number.isFinite(value) || value < 0) {
                    this.addError(`Materials ${field} must be a finite non-negative number or n/a; received "${mat[field]}"`);
                } else {
                    item[property] = value;
                }
            }

            item.materialConsumed = asBool(mat['Consumed'], false);
        }

        // Preparation
        const prep = data?.PREPARATION || {};
        const methodRaw = asString(prep['Method'], 'spell').toLowerCase();
        const normalizedMethod = methodRaw === 'prepared' ? 'spell' : methodRaw;
        if (!VALID_SPELL_PREP_METHODS.includes(methodRaw)) {
            this.addWarning(`Invalid Preparation Method "${prep['Method']}", defaulting to "spell"`);
            item.preparationMode = 'spell';
        } else {
            item.preparationMode = normalizedMethod;
        }
        // Ritual eligibility is independent of the preparation method. Retain
        // the legacy Method: ritual shorthand when no Ritual value is supplied.
        item.ritual = asBool(asNullable(comp['Ritual']), item.preparationMode === 'ritual');
        item.prepared = preparedState(prep['Prepared']);

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
        item.activationValue = actValueRaw !== null ? exactNumber(actValueRaw, 'ACTIVATION.Value', {integer:true,min:0}) : 1;

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
            value: rangeValueRaw !== null ? formulaValue(rangeValueRaw, 'Spell formula') : null,
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
            value: durValueRaw !== null ? formulaValue(durValueRaw, 'Spell formula') : null,
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
                count: tgtCountRaw !== null ? formulaValue(tgtCountRaw, 'Spell formula') : null,
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
                    size: sizeRaw !== null ? formulaValue(sizeRaw, 'Spell formula') : null,
                    units: VALID_AREA_UNITS.includes(areaUnitsRaw) ? areaUnitsRaw : 'ft',
                    count: countRaw !== null ? formulaValue(countRaw, 'Spell formula') : null,
                    width: widthRaw !== null ? formulaValue(widthRaw, 'Spell formula') : null,
                    height: heightRaw !== null ? formulaValue(heightRaw, 'Spell formula') : null,
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

    // ─── FEAT ───────────────────────────────────────────────────────────────

    extractFeatFields(item, data) {
        const itemSection = data?.ITEM || {};

        // Feature Type (optional). dnd5e stores unknown values as-is and labels
        // them "Feature", so mismatches are warnings rather than errors.
        const featureTypeRaw = asNullable(itemSection['Feature Type']);
        if (featureTypeRaw === null) {
            item.featureType = '';
        } else {
            const text = String(featureTypeRaw).trim();
            const canonical = VALID_FEATURE_TYPES.find(t => t.toLowerCase() === text.toLowerCase());
            if (canonical) {
                item.featureType = canonical;
            } else {
                this.addWarning(`Unknown Feature Type "${text}"; dnd5e displays it as a generic Feature.`);
                item.featureType = text;
            }
        }

        // Feature Subtype (optional; meaningful only for types that define subtypes)
        const subtypeRaw = asNullable(itemSection['Feature Subtype']);
        if (subtypeRaw === null) {
            item.featureSubtype = '';
        } else {
            const text = String(subtypeRaw).trim();
            const knownType = VALID_FEATURE_TYPES.includes(item.featureType);
            const known = FEATURE_SUBTYPES[item.featureType] || [];
            const canonical = known.find(s => s.toLowerCase() === text.toLowerCase());
            item.featureSubtype = canonical ?? text;
            if (!canonical && knownType) {
                if (!item.featureType) {
                    this.addWarning(`Feature Subtype "${text}" is set without a Feature Type; dnd5e shows no subtype label.`);
                } else if (!known.length) {
                    this.addWarning(`Feature Type "${item.featureType}" has no subtypes in dnd5e; Feature Subtype "${text}" is stored but not labeled.`);
                } else {
                    this.addWarning(`Unknown Feature Subtype "${text}" for Feature Type "${item.featureType}". Known: ${known.join(', ')}.`);
                }
            }
        }

        // Properties (dnd5e validProperties.feat: mgc, trait)
        const props = data?.PROPERTIES || {};
        item.isMagical = asBool(props['Magical'], false);
        item.passiveTrait = asBool(props['Passive Trait'], false);

        // Features have no attunement
        item.attunement = '';
        item.attunementRequirement = null;

        // ENCHANTMENT.Period is stored by its explicit descriptor; warn on unknown values.
        const period = asNullable(data?.ENCHANTMENT?.['Period']);
        if (period !== null && !VALID_ENCHANT_PERIODS.includes(String(period).trim())) {
            this.addWarning(`Unknown ENCHANTMENT.Period "${period}". Known: ${VALID_ENCHANT_PERIODS.join(', ')}.`);
        }

        // Usage and Recovery
        this.extractUsageAndRecovery(item, data);

        // Advancement (ability score improvements, granted items, choices, item changes, scale values, traits)
        this.extractAdvancement(item, data);

        ItemUtils.log('YamlItemParser: Feat fields extracted', {
            featureType: item.featureType, featureSubtype: item.featureSubtype,
            isMagical: item.isMagical, passiveTrait: item.passiveTrait,
            advancement: item.advancement?.length ?? 0
        });
    }

    // ─── ADVANCEMENT (feat) ──────────────────────────────────────────────────

    /**
     * ADVANCEMENT is a list of one-root entries (ABILITY_SCORE_IMPROVEMENT, GRANT_ITEMS,
     * CHOOSE_ITEMS, MODIFY_ITEMS, SCALE_VALUE, TRAIT). Each becomes a native-shaped
     * `{ _id?, type, level?, name?, hint?, img?, classRestriction?, configuration }` on
     * `item.advancement`; the builder keys them by `_id`. Document references (granted
     * Items, choice pools, the recommendation, ModifyItem effects) are registered on
     * `item.references` and must resolve before import; an authored UUID is kept as the
     * initial configuration value so offline round trips stay exact.
     */
    extractAdvancement(item, data) {
        item.advancement = [];
        item.references ??= [];
        if (!hasKey(data, 'ADVANCEMENT')) return;
        const section = data.ADVANCEMENT;
        if (section === null || (typeof section === 'string' && isUnset(section))) return;
        if (!Array.isArray(section)) {
            this.addError('ADVANCEMENT must be a list; start each entry with one root key such as "- GRANT_ITEMS:".');
            return;
        }
        const roots = Object.keys(ADVANCEMENT_ROOTS).join(', ');
        section.forEach((entry, index) => {
            const location = `ADVANCEMENT[${index}]`;
            if (!isPlainMapping(entry)) {
                this.addError(`${location} must be a mapping with one advancement root key (${roots}).`);
                return;
            }
            const keys = Object.keys(entry);
            if (keys.length !== 1) {
                this.addError(`${location} must contain exactly one root key (${roots}); found ${keys.length}.`);
                return;
            }
            const root = keys[0];
            const type = ADVANCEMENT_ROOTS[root];
            if (!type) {
                this.addError(`${location}: "${root}" is not an advancement that feats support (${roots}). HitPoints, Size and Subclass belong to classes and species.`);
                return;
            }
            const body = entry[root];
            const where = `${location}.${root}`;
            if (!isPlainMapping(body)) {
                this.addError(`${where} must be a mapping.`);
                return;
            }
            for (const key of Object.keys(body)) {
                if (!ADVANCEMENT_COMMON_KEYS.includes(key) && !ADVANCEMENT_KEYS[root].includes(key)) {
                    this.addWarning(`Unknown key "${key}" in ${where}; it will be ignored.`);
                }
            }
            const advancement = this.extractAdvancementCommon(body, type, where);
            const path = `advancement[${item.advancement.length}]`;
            advancement.configuration = this.extractAdvancementConfiguration(root, body, where, item, path);
            item.advancement.push(advancement);
        });
    }

    /** Run a strict value parser; a thrown message becomes a parse error and the value is dropped. */
    attemptValue(parse) {
        try {
            return parse();
        } catch (error) {
            this.addError(error.message);
            return undefined;
        }
    }

    extractAdvancementCommon(body, type, where) {
        const advancement = { type };
        const id = asNullable(body['Advancement ID']);
        if (id !== null) {
            if (/^[A-Za-z0-9]{16}$/.test(id)) advancement._id = id;
            else this.addError(`${where}.Advancement ID must be exactly 16 alphanumeric characters.`);
        }
        if (hasKey(body, 'Level') && !isUnset(body.Level)) {
            const level = this.attemptValue(() => exactNumber(body.Level, `${where}.Level`, { integer: true, min: 0, nullable: false }));
            if (MULTI_LEVEL_ADVANCEMENT_TYPES.includes(type)) {
                this.addWarning(`${where}.Level is ignored; ${type} takes its levels from its CHOICES or SCALE entries.`);
            } else if (level !== undefined) {
                advancement.level = level;
            }
        }
        const name = asNullable(body.Name);
        if (name !== null) advancement.name = name;
        const hint = asNullable(body.Hint);
        if (hint !== null) advancement.hint = hint;
        const icon = asNullable(body.Icon);
        if (icon !== null) advancement.img = icon;
        const restriction = asNullable(body['Class Restriction']);
        if (restriction !== null) {
            if (CLASS_RESTRICTIONS.includes(restriction)) advancement.classRestriction = restriction;
            else this.addError(`${where}.Class Restriction must be primary, secondary or n/a.`);
        }
        return advancement;
    }

    extractAdvancementConfiguration(root, body, where, item, path) {
        let configuration = {};
        switch (root) {
            case 'ABILITY_SCORE_IMPROVEMENT': configuration = this.extractAsiConfiguration(body, where, item, path); break;
            case 'GRANT_ITEMS': configuration = this.extractItemGrantConfiguration(body, where, item, path); break;
            case 'CHOOSE_ITEMS': configuration = this.extractItemChoiceConfiguration(body, where, item, path); break;
            case 'MODIFY_ITEMS': configuration = this.extractModifyItemConfiguration(body, where, item, path); break;
            case 'SCALE_VALUE': configuration = this.extractScaleValueConfiguration(body, where); break;
            case 'TRAIT': configuration = this.extractTraitConfiguration(body, where); break;
        }
        return Object.fromEntries(Object.entries(configuration).filter(([, value]) => value !== undefined));
    }

    /**
     * Register a document reference for an ITEMS/POOL/RECOMMENDATION/EFFECT entry.
     * Returns the authored UUID (or null); the resolver writes the final UUID to `path`.
     */
    registerAdvancementReference(item, entry, { kind, path, label, where, itemTypes = [], extraKeys = [] }) {
        if (!isPlainMapping(entry)) {
            this.addError(`${where} must be a mapping with UUID, Name or Identifier.`);
            return null;
        }
        const allowed = [...(kind === 'item' ? ['UUID', 'Name', 'Identifier', 'Type'] : ['UUID', 'Name']), ...extraKeys];
        for (const key of Object.keys(entry)) {
            if (!allowed.includes(key)) this.addWarning(`Unknown key "${key}" in ${where}; it will be ignored.`);
        }
        let types = [...itemTypes];
        const type = asNullable(entry.Type);
        if (kind === 'item' && type !== null) {
            if (GRANTABLE_ITEM_TYPES.includes(type)) types = [type];
            else this.addError(`${where}.Type must be one of ${GRANTABLE_ITEM_TYPES.join(', ')}.`);
        }
        const query = { uuid: asNullable(entry.UUID), name: asNullable(entry.Name), identifier: asNullable(entry.Identifier), itemTypes: types };
        if (!query.uuid && !query.name && !query.identifier) {
            this.addError(`${where} needs a UUID, Name or Identifier.`);
            return null;
        }
        item.references.push(createReference({ kind, path, label, query }));
        return query.uuid;
    }

    extractAsiConfiguration(body, where, item, path) {
        const configuration = {};
        if (hasKey(body, 'Points') && !isUnset(body.Points)) {
            configuration.points = this.attemptValue(() => exactNumber(body.Points, `${where}.Points`, { integer: true, min: 0, nullable: false }));
        }
        if (hasKey(body, 'Cap') && !isUnset(body.Cap)) {
            configuration.cap = this.attemptValue(() => exactNumber(body.Cap, `${where}.Cap`, { integer: true, min: 1, nullable: false }));
        }
        if (hasKey(body, 'Max') && !isUnset(body.Max)) {
            configuration.max = this.attemptValue(() => exactNumber(body.Max, `${where}.Max`, { integer: true, min: 1, nullable: false }));
        }
        if (hasKey(body, 'Locked') && !isUnset(body.Locked)) {
            const locked = this.attemptValue(() => stringList(foldTokenList(body.Locked), `${where}.Locked`));
            if (locked) {
                for (const ability of locked) if (!ABILITY_IDS.includes(ability)) this.addWarning(`${where}.Locked: "${ability}" is not a dnd5e ability identifier (${ABILITY_IDS.join(', ')}).`);
                configuration.locked = locked;
            }
        }
        if (hasKey(body, 'FIXED') && !isUnset(body.FIXED)) {
            const fixed = {};
            const entries = body.FIXED;
            const assign = (ability, value, entryWhere) => {
                if (!ability) { this.addError(`${entryWhere} needs an Ability identifier.`); return; }
                if (!ABILITY_IDS.includes(ability)) this.addWarning(`${entryWhere}: "${ability}" is not a dnd5e ability identifier (${ABILITY_IDS.join(', ')}).`);
                const amount = this.attemptValue(() => exactNumber(value, `${entryWhere}.Value`, { integer: true, nullable: false }));
                if (amount !== undefined) fixed[ability] = amount;
            };
            if (Array.isArray(entries)) {
                entries.forEach((entry, index) => {
                    const entryWhere = `${where}.FIXED[${index}]`;
                    if (!isPlainMapping(entry)) { this.addError(`${entryWhere} must be a mapping with Ability and Value.`); return; }
                    for (const key of Object.keys(entry)) if (!['Ability', 'Value'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere}; it will be ignored.`);
                    assign(asNullable(entry.Ability), entry.Value, entryWhere);
                });
            } else if (isPlainMapping(entries)) {
                // Compact form: { str: 1 }
                for (const [ability, value] of Object.entries(entries)) assign(ability, value, `${where}.FIXED.${ability}`);
            } else {
                this.addError(`${where}.FIXED must be a list of { Ability, Value } entries.`);
            }
            configuration.fixed = fixed;
        }
        if (hasKey(body, 'RECOMMENDATION') && !isUnset(body.RECOMMENDATION)) {
            configuration.recommendation = this.registerAdvancementReference(item, body.RECOMMENDATION, {
                kind: 'item', path: `${path}.configuration.recommendation`, label: 'Recommended feat',
                where: `${where}.RECOMMENDATION`, itemTypes: ['feat']
            });
        }
        return configuration;
    }

    extractSpellConfiguration(section, where) {
        if (!isPlainMapping(section)) {
            this.addError(`${where} must be a mapping (Ability, Method, Prepared, Uses Max, Uses Per, Require Slot).`);
            return undefined;
        }
        const allowed = ['Ability', 'Method', 'Prepared', 'Uses Max', 'Uses Per', 'Require Slot'];
        for (const key of Object.keys(section)) if (!allowed.includes(key)) this.addWarning(`Unknown key "${key}" in ${where}; it will be ignored.`);
        const spell = {};
        if (hasKey(section, 'Ability') && !isUnset(section.Ability)) {
            const abilities = this.attemptValue(() => stringList(foldTokenList(section.Ability), `${where}.Ability`));
            if (abilities) {
                for (const ability of abilities) if (!ABILITY_IDS.includes(ability)) this.addWarning(`${where}.Ability: "${ability}" is not a dnd5e ability identifier (${ABILITY_IDS.join(', ')}).`);
                spell.ability = abilities;
            }
        }
        const method = asNullable(section.Method);
        if (method !== null) {
            if (SPELL_METHODS.includes(method)) spell.method = method;
            else this.addError(`${where}.Method must be one of ${SPELL_METHODS.join(', ')} or n/a.`);
        }
        if (hasKey(section, 'Prepared') && !isUnset(section.Prepared)) {
            spell.prepared = this.attemptValue(() => preparedState(section.Prepared));
        }
        if (['Uses Max', 'Uses Per', 'Require Slot'].some(key => hasKey(section, key))) {
            const uses = {};
            if (hasKey(section, 'Uses Max')) uses.max = this.attemptValue(() => formulaValue(section['Uses Max'], `${where}.Uses Max`));
            const per = asNullable(section['Uses Per']);
            if (hasKey(section, 'Uses Per')) {
                if (per !== null && !VALID_RECOVERY_PERIODS.includes(per)) this.addWarning(`${where}.Uses Per "${per}" is not a dnd5e recovery period (${VALID_RECOVERY_PERIODS.join(', ')}); it is stored as written.`);
                uses.per = per ?? '';
            }
            if (hasKey(section, 'Require Slot') && !isUnset(section['Require Slot'])) {
                uses.requireSlot = this.attemptValue(() => exactBoolean(section['Require Slot'], `${where}.Require Slot`));
            }
            spell.uses = Object.fromEntries(Object.entries(uses).filter(([, value]) => value !== undefined));
        }
        return spell;
    }

    extractItemGrantConfiguration(body, where, item, path) {
        const configuration = { items: [] };
        if (hasKey(body, 'Optional') && !isUnset(body.Optional)) {
            configuration.optional = this.attemptValue(() => exactBoolean(body.Optional, `${where}.Optional`));
        }
        const sorting = asNullable(body.Sorting);
        if (sorting !== null) {
            if (SORTING_MODES.includes(sorting)) configuration.sorting = sorting;
            else this.addError(`${where}.Sorting must be a (alphabetical) or m (manual).`);
        }
        if (hasKey(body, 'ITEMS') && !isUnset(body.ITEMS)) {
            if (!Array.isArray(body.ITEMS)) {
                this.addError(`${where}.ITEMS must be a list of granted Item references.`);
            } else {
                body.ITEMS.forEach((entry, index) => {
                    const entryWhere = `${where}.ITEMS[${index}]`;
                    const uuid = this.registerAdvancementReference(item, entry, {
                        kind: 'item', path: `${path}.configuration.items[${configuration.items.length}].uuid`,
                        label: `Granted item ${index + 1}${isPlainMapping(entry) && asNullable(entry.Name) ? ` (${asNullable(entry.Name)})` : ''}`,
                        where: entryWhere, itemTypes: GRANTABLE_ITEM_TYPES, extraKeys: ['Optional', 'Sort']
                    });
                    if (!isPlainMapping(entry)) return;
                    const record = { uuid };
                    if (hasKey(entry, 'Optional') && !isUnset(entry.Optional)) record.optional = this.attemptValue(() => exactBoolean(entry.Optional, `${entryWhere}.Optional`));
                    if (hasKey(entry, 'Sort') && !isUnset(entry.Sort)) record.sort = this.attemptValue(() => exactNumber(entry.Sort, `${entryWhere}.Sort`, { integer: true, nullable: false }));
                    configuration.items.push(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)));
                });
            }
        }
        if (hasKey(body, 'SPELL') && !isUnset(body.SPELL)) configuration.spell = this.extractSpellConfiguration(body.SPELL, `${where}.SPELL`);
        return configuration;
    }

    extractItemChoiceConfiguration(body, where, item, path) {
        const configuration = { pool: [] };
        if (hasKey(body, 'Allow Drops') && !isUnset(body['Allow Drops'])) {
            configuration.allowDrops = this.attemptValue(() => exactBoolean(body['Allow Drops'], `${where}.Allow Drops`));
        }
        const sorting = asNullable(body.Sorting);
        if (sorting !== null) {
            if (SORTING_MODES.includes(sorting)) configuration.sorting = sorting;
            else this.addError(`${where}.Sorting must be a (alphabetical) or m (manual).`);
        }
        if (hasKey(body, 'Type')) {
            const type = asNullable(body.Type);
            if (type === null) configuration.type = null;
            else if (GRANTABLE_ITEM_TYPES.includes(type)) configuration.type = type;
            else this.addError(`${where}.Type must be one of ${GRANTABLE_ITEM_TYPES.join(', ')} or n/a.`);
        }
        if (hasKey(body, 'CHOICES') && !isUnset(body.CHOICES)) {
            const choices = {};
            const addChoice = (levelValue, entry, entryWhere) => {
                const level = this.attemptValue(() => exactNumber(levelValue, `${entryWhere}.Level`, { integer: true, min: 0, nullable: false }));
                if (level === undefined) return;
                if (hasKey(choices, String(level))) { this.addError(`${entryWhere}: level ${level} is listed more than once.`); return; }
                const choice = {};
                if (hasKey(entry, 'Count') && !isUnset(entry.Count)) choice.count = this.attemptValue(() => exactNumber(entry.Count, `${entryWhere}.Count`, { integer: true, min: 0, nullable: false }));
                if (hasKey(entry, 'Replacement') && !isUnset(entry.Replacement)) choice.replacement = this.attemptValue(() => exactBoolean(entry.Replacement, `${entryWhere}.Replacement`));
                choices[String(level)] = Object.fromEntries(Object.entries(choice).filter(([, value]) => value !== undefined));
            };
            if (Array.isArray(body.CHOICES)) {
                body.CHOICES.forEach((entry, index) => {
                    const entryWhere = `${where}.CHOICES[${index}]`;
                    if (!isPlainMapping(entry)) { this.addError(`${entryWhere} must be a mapping with Level, Count and Replacement.`); return; }
                    for (const key of Object.keys(entry)) if (!['Level', 'Count', 'Replacement'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere}; it will be ignored.`);
                    addChoice(entry.Level, entry, entryWhere);
                });
            } else if (isPlainMapping(body.CHOICES)) {
                for (const [level, entry] of Object.entries(body.CHOICES)) {
                    if (!isPlainMapping(entry)) { this.addError(`${where}.CHOICES.${level} must be a mapping with Count and Replacement.`); continue; }
                    addChoice(level, entry, `${where}.CHOICES.${level}`);
                }
            } else {
                this.addError(`${where}.CHOICES must be a list of { Level, Count, Replacement } entries.`);
            }
            configuration.choices = choices;
        }
        if (hasKey(body, 'POOL') && !isUnset(body.POOL)) {
            if (!Array.isArray(body.POOL)) {
                this.addError(`${where}.POOL must be a list of Item references.`);
            } else {
                body.POOL.forEach((entry, index) => {
                    const entryWhere = `${where}.POOL[${index}]`;
                    const uuid = this.registerAdvancementReference(item, entry, {
                        kind: 'item', path: `${path}.configuration.pool[${configuration.pool.length}].uuid`,
                        label: `Choice pool item ${index + 1}${isPlainMapping(entry) && asNullable(entry.Name) ? ` (${asNullable(entry.Name)})` : ''}`,
                        where: entryWhere, itemTypes: configuration.type ? [configuration.type] : GRANTABLE_ITEM_TYPES, extraKeys: ['Sort']
                    });
                    if (!isPlainMapping(entry)) return;
                    const record = { uuid };
                    if (hasKey(entry, 'Sort') && !isUnset(entry.Sort)) record.sort = this.attemptValue(() => exactNumber(entry.Sort, `${entryWhere}.Sort`, { integer: true, nullable: false }));
                    configuration.pool.push(Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)));
                });
            }
        }
        if (hasKey(body, 'RESTRICTION') && !isUnset(body.RESTRICTION)) {
            const section = body.RESTRICTION;
            if (!isPlainMapping(section)) {
                this.addError(`${where}.RESTRICTION must be a mapping (Level, List, School, Type, Subtype).`);
            } else {
                const restriction = {};
                for (const key of Object.keys(section)) if (!['Level', 'List', 'School', 'Type', 'Subtype'].includes(key)) this.addWarning(`Unknown key "${key}" in ${where}.RESTRICTION; it will be ignored.`);
                if (hasKey(section, 'Level')) restriction.level = asNullable(section.Level) ?? '';
                if (hasKey(section, 'List')) restriction.list = this.attemptValue(() => stringList(foldTokenList(section.List), `${where}.RESTRICTION.List`));
                if (hasKey(section, 'School')) restriction.school = this.attemptValue(() => stringList(foldTokenList(section.School), `${where}.RESTRICTION.School`));
                if (hasKey(section, 'Type')) restriction.type = asNullable(section.Type) ?? '';
                if (hasKey(section, 'Subtype')) restriction.subtype = asNullable(section.Subtype) ?? '';
                configuration.restriction = Object.fromEntries(Object.entries(restriction).filter(([, value]) => value !== undefined));
            }
        }
        if (hasKey(body, 'SPELL') && !isUnset(body.SPELL)) configuration.spell = this.extractSpellConfiguration(body.SPELL, `${where}.SPELL`);
        return configuration;
    }

    extractModifyItemConfiguration(body, where, item, path) {
        const configuration = { changes: [] };
        if (!hasKey(body, 'CHANGES') || isUnset(body.CHANGES)) return configuration;
        if (!Array.isArray(body.CHANGES)) {
            this.addError(`${where}.CHANGES must be a list of { Effect ID | EFFECT, Identifiers } entries.`);
            return configuration;
        }
        body.CHANGES.forEach((entry, index) => {
            const entryWhere = `${where}.CHANGES[${index}]`;
            if (!isPlainMapping(entry)) { this.addError(`${entryWhere} must be a mapping.`); return; }
            for (const key of Object.keys(entry)) if (!['Effect ID', 'EFFECT', 'Identifiers'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere}; it will be ignored.`);
            const change = {};
            const effectId = asNullable(entry['Effect ID']);
            if (effectId !== null) {
                if (/^[A-Za-z0-9]{16}$/.test(effectId)) change._id = effectId;
                else this.addError(`${entryWhere}.Effect ID must be exactly 16 alphanumeric characters.`);
            }
            if (hasKey(entry, 'EFFECT') && !isUnset(entry.EFFECT)) {
                change.uuid = this.registerAdvancementReference(item, entry.EFFECT, {
                    kind: 'activeEffect', path: `${path}.configuration.changes[${configuration.changes.length}].uuid`,
                    label: `Modify Items effect ${index + 1}${isPlainMapping(entry.EFFECT) && asNullable(entry.EFFECT.Name) ? ` (${asNullable(entry.EFFECT.Name)})` : ''}`,
                    where: `${entryWhere}.EFFECT`
                });
            }
            if (change._id === undefined && !hasKey(change, 'uuid')) {
                this.addError(`${entryWhere} needs an Effect ID (an enchantment effect on this feature) or an EFFECT reference (a standalone ActiveEffect).`);
            }
            if (hasKey(entry, 'Identifiers') && !isUnset(entry.Identifiers)) {
                const identifiers = this.attemptValue(() => stringList(foldTokenList(entry.Identifiers), `${entryWhere}.Identifiers`));
                if (identifiers) {
                    for (const identifier of identifiers) {
                        if (!/^(?:[a-z0-9_-]+:)?[a-z0-9_-]+$/i.test(identifier)) this.addError(`${entryWhere}.Identifiers entries must be "identifier" or "type:identifier"; found "${identifier}".`);
                    }
                    change.identifiers = identifiers;
                }
            }
            configuration.changes.push(change);
        });
        return configuration;
    }

    extractScaleValueConfiguration(body, where) {
        const configuration = {};
        const identifier = asNullable(body.Identifier);
        if (identifier === null) this.addError(`${where}.Identifier is required (the @scale key, e.g. storm-dice).`);
        else if (!/^[a-z0-9_-]+$/i.test(identifier)) this.addError(`${where}.Identifier "${identifier}" must contain only letters, digits, dashes and underscores.`);
        else configuration.identifier = identifier;
        const type = asNullable(body.Type) ?? 'string';
        if (SCALE_VALUE_TYPES.includes(type)) configuration.type = type;
        else this.addError(`${where}.Type must be one of ${SCALE_VALUE_TYPES.join(', ')}.`);
        const units = asNullable(body['Distance Units']);
        if (units !== null) configuration.distance = { units };
        if (hasKey(body, 'SCALE') && !isUnset(body.SCALE)) {
            const scale = {};
            const addStep = (levelValue, entry, entryWhere) => {
                const level = this.attemptValue(() => exactNumber(levelValue, `${entryWhere}.Level`, { integer: true, min: 0, nullable: false }));
                if (level === undefined) return;
                if (hasKey(scale, String(level))) { this.addError(`${entryWhere}: level ${level} is listed more than once.`); return; }
                const step = {};
                if (type === 'dice') {
                    for (const key of Object.keys(entry)) if (!['Level', 'Dice Count', 'Die Denomination', 'Modifiers'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere} for a dice scale; it will be ignored.`);
                    if (hasKey(entry, 'Dice Count')) step.number = this.attemptValue(() => exactNumber(entry['Dice Count'], `${entryWhere}.Dice Count`, { integer: true, min: 0 }));
                    if (hasKey(entry, 'Die Denomination') && !isUnset(entry['Die Denomination'])) step.faces = this.attemptValue(() => exactNumber(entry['Die Denomination'], `${entryWhere}.Die Denomination`, { integer: true, min: 1, nullable: false }));
                    if (hasKey(entry, 'Modifiers') && !isUnset(entry.Modifiers)) step.modifiers = this.attemptValue(() => stringList(foldTokenList(entry.Modifiers), `${entryWhere}.Modifiers`));
                } else if (type === 'usage') {
                    for (const key of Object.keys(entry)) if (!['Level', 'Value', 'Period'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere} for a usage scale; it will be ignored.`);
                    if (hasKey(entry, 'Value')) step.value = this.attemptValue(() => exactNumber(entry.Value, `${entryWhere}.Value`, { integer: true, min: 0 }));
                    const period = asNullable(entry.Period);
                    if (period !== null) {
                        if (!VALID_RECOVERY_PERIODS.includes(period)) this.addWarning(`${entryWhere}.Period "${period}" is not a dnd5e recovery period (${VALID_RECOVERY_PERIODS.join(', ')}); it is stored as written.`);
                        step.period = period;
                    }
                } else {
                    for (const key of Object.keys(entry)) if (!['Level', 'Value'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere} for a ${type} scale; it will be ignored.`);
                    if (type === 'string') step.value = asNullable(entry.Value) ?? '';
                    else if (hasKey(entry, 'Value') && !isUnset(entry.Value)) step.value = this.attemptValue(() => exactNumber(entry.Value, `${entryWhere}.Value`, { nullable: false, ...(type === 'cr' ? { min: 0 } : {}) }));
                    else this.addError(`${entryWhere}.Value is required for a ${type} scale.`);
                }
                scale[String(level)] = Object.fromEntries(Object.entries(step).filter(([, value]) => value !== undefined));
            };
            if (Array.isArray(body.SCALE)) {
                body.SCALE.forEach((entry, index) => {
                    const entryWhere = `${where}.SCALE[${index}]`;
                    if (!isPlainMapping(entry)) { this.addError(`${entryWhere} must be a mapping with Level and its scale values.`); return; }
                    addStep(entry.Level, entry, entryWhere);
                });
            } else if (isPlainMapping(body.SCALE)) {
                for (const [level, entry] of Object.entries(body.SCALE)) {
                    if (!isPlainMapping(entry)) { this.addError(`${where}.SCALE.${level} must be a mapping of scale values.`); continue; }
                    addStep(level, entry, `${where}.SCALE.${level}`);
                }
            } else {
                this.addError(`${where}.SCALE must be a list of { Level, ... } entries.`);
            }
            configuration.scale = scale;
        }
        return configuration;
    }

    validateTraitKey(key, where) {
        if (typeof key !== 'string' || !TRAIT_KEY_PATTERN.test(key)) {
            this.addError(`${where}: "${key}" is not a trait key. Use <trait>:<category>[:<child>] such as skills:ath, weapon:mar, armor:hvy or languages:*.`);
            return;
        }
        const correction = TRAIT_CATEGORY_CORRECTIONS[key.toLowerCase()];
        if (correction) this.addWarning(`${where}: dnd5e names that category "${correction}", not "${key}"; the key is stored as written.`);
    }

    extractTraitConfiguration(body, where) {
        const configuration = {};
        const mode = asNullable(body.Mode);
        if (mode !== null) {
            if (TRAIT_MODES.includes(mode)) configuration.mode = mode;
            else this.addError(`${where}.Mode must be one of ${TRAIT_MODES.join(', ')}.`);
        }
        if (hasKey(body, 'Allow Replacements') && !isUnset(body['Allow Replacements'])) {
            configuration.allowReplacements = this.attemptValue(() => exactBoolean(body['Allow Replacements'], `${where}.Allow Replacements`));
        }
        if (hasKey(body, 'Grants') && !isUnset(body.Grants)) {
            const grants = this.attemptValue(() => stringList(foldTokenList(body.Grants), `${where}.Grants`));
            if (grants) {
                for (const key of grants) this.validateTraitKey(key, `${where}.Grants`);
                configuration.grants = grants;
            }
        }
        if (hasKey(body, 'CHOICES') && !isUnset(body.CHOICES)) {
            if (!Array.isArray(body.CHOICES)) {
                this.addError(`${where}.CHOICES must be a list of { Count, Pool } entries.`);
            } else {
                configuration.choices = [];
                body.CHOICES.forEach((entry, index) => {
                    const entryWhere = `${where}.CHOICES[${index}]`;
                    if (!isPlainMapping(entry)) { this.addError(`${entryWhere} must be a mapping with Count and Pool.`); return; }
                    for (const key of Object.keys(entry)) if (!['Count', 'Pool'].includes(key)) this.addWarning(`Unknown key "${key}" in ${entryWhere}; it will be ignored.`);
                    const choice = {};
                    if (hasKey(entry, 'Count') && !isUnset(entry.Count)) choice.count = this.attemptValue(() => exactNumber(entry.Count, `${entryWhere}.Count`, { integer: true, min: 1, nullable: false }));
                    if (hasKey(entry, 'Pool') && !isUnset(entry.Pool)) {
                        const pool = this.attemptValue(() => stringList(foldTokenList(entry.Pool), `${entryWhere}.Pool`));
                        if (pool) {
                            for (const key of pool) this.validateTraitKey(key, `${entryWhere}.Pool`);
                            choice.pool = pool;
                        }
                    }
                    configuration.choices.push(Object.fromEntries(Object.entries(choice).filter(([, value]) => value !== undefined)));
                });
            }
        }
        return configuration;
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
