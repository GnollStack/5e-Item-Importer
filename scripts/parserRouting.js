/**
 * Shared parser routing for strict YAML, lightweight key/value input, and
 * natural language text.
 */

import jsyaml from "./vendor/js-yaml.mjs";
import { YAML_ITEM_KEYS, YAML_KEY_REGEXES } from "./itemConfig.js";
import { getParserForText } from "./strictItemParsers/strictParserDispatcher.js";
import { NaturalItemParser } from "./naturalItemParser.js";
import { ItemUtils } from "./itemUtils.js";
import { buildItemParseInsights } from "./itemParseInsights.js";
import { ITEM_YAML_SCHEMA_KEY, ITEM_YAML_SCHEMA_VERSION } from "./strictItemParsers/itemSchemaVersion.js";

const LIGHT_KEYS = {
    name: "name",
    itemname: "name",
    type: "type",
    itemtype: "type",
    rarity: "rarity",
    weapontype: "weaponType",
    baseweapon: "baseWeapon",
    equipmenttype: "equipmentType",
    armortype: "equipmentType",
    baseequipment: "baseEquipment",
    basearmor: "baseEquipment",
    armorclass: "armorClass",
    ac: "armorClass",
    maxdexmodifier: "maxDexModifier",
    strengthrequirement: "strengthRequirement",
    consumabletype: "consumableType",
    ammunitiontype: "ammunitionType",
    ammotype: "ammunitionType",
    poisontype: "poisonType",
    tooltype: "toolType",
    basetool: "baseTool",
    toolability: "toolAbility",
    ability: "ability",
    toolproficiency: "toolProficiency",
    proficiency: "toolProficiency",
    toolbonus: "toolBonus",
    loottype: "lootType",
    itemcapacity: "itemCapacity",
    weightcapacity: "weightCapacity",
    weightcapacityunits: "weightCapacityUnits",
    volumecapacity: "volumeCapacity",
    volumecapacityunits: "volumeCapacityUnits",
    weightlesscontents: "weightlessContents",
    level: "spellLevel",
    spelllevel: "spellLevel",
    school: "spellSchool",
    spellschool: "spellSchool",
    spellability: "spellAbility",
    activation: "activationType",
    activationtype: "activationType",
    activationvalue: "activationValue",
    preparationmethod: "preparationMethod",
    prepared: "prepared",
    components: "components",
    vocal: "vocal",
    verbal: "vocal",
    somatic: "somatic",
    material: "material",
    range: "range",
    rangevalue: "rangeValue",
    rangeunits: "rangeUnits",
    duration: "duration",
    durationvalue: "durationValue",
    durationunits: "durationUnits",
    concentration: "concentration",
    damage: "damage",
    damageformula: "damageFormula",
    damagetype: "damageType",
    versatileformula: "versatileFormula",
    versatiledamage: "versatileFormula",
    versatiledamagetype: "versatileDamageType",
    properties: "properties",
    price: "price",
    cost: "price",
    pricevalue: "priceValue",
    pricedenomination: "priceDenomination",
    weight: "weight",
    weightvalue: "weightValue",
    weightunits: "weightUnits",
    description: "description",
    magicbonus: "magicBonus"
};

const SUPPORTED_LIGHT_KEYS = [
    "name",
    "type",
    "rarity",
    "weaponType",
    "baseWeapon",
    "equipmentType",
    "baseEquipment",
    "armorClass",
    "maxDexModifier",
    "strengthRequirement",
    "consumableType",
    "ammunitionType",
    "poisonType",
    "toolType",
    "baseTool",
    "toolAbility",
    "toolProficiency",
    "toolBonus",
    "lootType",
    "itemCapacity",
    "weightCapacity",
    "weightCapacityUnits",
    "volumeCapacity",
    "volumeCapacityUnits",
    "weightlessContents",
    "spellLevel",
    "spellSchool",
    "spellAbility",
    "ability",
    "activationType",
    "activationValue",
    "preparationMethod",
    "prepared",
    "components",
    "vocal",
    "somatic",
    "material",
    "range",
    "rangeValue",
    "rangeUnits",
    "duration",
    "durationValue",
    "durationUnits",
    "concentration",
    "damage",
    "damageFormula",
    "damageType",
    "versatileFormula",
    "versatileDamageType",
    "properties",
    "price",
    "priceValue",
    "priceDenomination",
    "weight",
    "weightValue",
    "weightUnits",
    "description",
    "magicBonus"
];

const TYPE_TO_TOP_KEY = {
    weapon: "WEAPON",
    equipment: "EQUIPMENT",
    armor: "EQUIPMENT",
    armour: "EQUIPMENT",
    consumable: "CONSUMABLE",
    potion: "CONSUMABLE",
    scroll: "CONSUMABLE",
    tool: "TOOL",
    loot: "LOOT",
    container: "CONTAINER",
    spell: "SPELL"
};

const WEAPON_TYPE_ALIASES = {
    simplem: "simpleM",
    simplemelee: "simpleM",
    simpler: "simpleR",
    simpleranged: "simpleR",
    martialm: "martialM",
    martialmelee: "martialM",
    martialr: "martialR",
    martialranged: "martialR",
    natural: "natural",
    improv: "improv",
    improvised: "improv",
    siege: "siege"
};

const DEFAULT_BASE_WEAPONS = {
    simpleM: "club",
    simpleR: "dart",
    martialM: "longsword",
    martialR: "longbow"
};

const EQUIPMENT_TYPE_ALIASES = {
    light: "light",
    lightarmor: "light",
    lightarmour: "light",
    medium: "medium",
    mediumarmor: "medium",
    mediumarmour: "medium",
    heavy: "heavy",
    heavyarmor: "heavy",
    heavyarmour: "heavy",
    natural: "natural",
    naturalarmor: "natural",
    naturalarmour: "natural",
    shield: "shield",
    clothing: "clothing",
    clothes: "clothing",
    ring: "ring",
    rod: "rod",
    trinket: "trinket",
    wand: "wand",
    wondrous: "wondrous",
    wondrousitem: "wondrous",
    vehicle: "vehicle"
};

const DEFAULT_ARMOR = {
    light: { base: "leather", armorClass: 11 },
    medium: { base: "hide", armorClass: 12 },
    heavy: { base: "chainmail", armorClass: 16 },
    natural: { base: null, armorClass: 10 },
    shield: { base: "shield", armorClass: 2 }
};

const CONSUMABLE_TYPE_ALIASES = {
    ammo: "ammo",
    ammunition: "ammo",
    food: "food",
    poison: "poison",
    potion: "potion",
    rod: "rod",
    scroll: "scroll",
    trinket: "trinket",
    wand: "wand"
};

const TOOL_TYPE_ALIASES = {
    art: "art",
    artisan: "art",
    artisanstool: "art",
    artisanstools: "art",
    game: "game",
    gaming: "game",
    gamingset: "game",
    music: "music",
    musical: "music",
    musicalinstrument: "music",
    other: ""
};

const BASE_TOOL_ALIASES = {
    alchemistssupplies: "alchemist",
    brewerssupplies: "brewer",
    calligrapherssupplies: "calligrapher",
    carpenterssupplies: "carpenter",
    cartographerstools: "cartographer",
    cobblerstools: "cobbler",
    cookutensils: "cook",
    cooksutensils: "cook",
    glassblowerstools: "glassblower",
    jewelerssupplies: "jeweler",
    leatherworkerstools: "leatherworker",
    masonstools: "mason",
    painterssupplies: "painter",
    potterstools: "potter",
    smithstools: "smith",
    tinkerstools: "tinker",
    weaverstools: "weaver",
    woodcarverstools: "woodcarver",
    dicesset: "dice",
    playingcardset: "card",
    dragonchessset: "chess",
    panpipes: "panflute",
    disguisekit: "disg",
    forgerykit: "forg",
    herbalismkit: "herb",
    navigatorstools: "navg",
    poisonerskit: "pois",
    thievestools: "thief"
};

const BASE_TOOL_TYPES = {
    alchemist: "art", brewer: "art", calligrapher: "art", carpenter: "art",
    cartographer: "art", cobbler: "art", cook: "art", glassblower: "art",
    jeweler: "art", leatherworker: "art", mason: "art", painter: "art",
    potter: "art", smith: "art", tinker: "art", weaver: "art", woodcarver: "art",
    dice: "game", card: "game", chess: "game",
    bagpipes: "music", drum: "music", dulcimer: "music", flute: "music",
    horn: "music", lute: "music", lyre: "music", panflute: "music",
    shawm: "music", viol: "music",
    disg: "", forg: "", herb: "", navg: "", pois: "", thief: ""
};

const LOOT_TYPE_ALIASES = {
    art: "art", artwork: "art", gear: "gear", gem: "gem", gemstone: "gem",
    junk: "junk", material: "material", resource: "resource", trade: "trade",
    tradegood: "trade", tradegoods: "trade", treasure: "treasure"
};

const SPELL_SCHOOL_ALIASES = {
    abj: "abj", abjuration: "abj",
    con: "con", conjuration: "con",
    div: "div", divination: "div",
    enc: "enc", enchantment: "enc",
    evo: "evo", evocation: "evo",
    ill: "ill", illusion: "ill",
    nec: "nec", necromancy: "nec",
    trs: "trs", transmutation: "trs"
};

const ACTIVATION_TYPE_ALIASES = {
    action: "action",
    bonus: "bonus",
    bonusaction: "bonus",
    reaction: "reaction",
    minute: "minute",
    minutes: "minute",
    hour: "hour",
    hours: "hour",
    day: "day",
    days: "day",
    special: "special"
};

const PROPERTY_KEYS = {
    adamantine: "Adamantine",
    ammunition: "Ammunition",
    finesse: "Finesse",
    firearm: "Firearm",
    focus: "Focus",
    heavy: "Heavy",
    light: "Light",
    loading: "Loading",
    magical: "Magical",
    magic: "Magical",
    reach: "Reach",
    reload: "Reload",
    returning: "Returning",
    silvered: "Silvered",
    special: "Special",
    thrown: "Thrown",
    twohanded: "Two-Handed",
    "two-handed": "Two-Handed",
    versatile: "Versatile"
};

const LIGHT_BASE_FIELDS = new Set(["name", "type", "description"]);
const LIGHT_PHYSICAL_FIELDS = new Set([
    "rarity", "price", "priceValue", "priceDenomination",
    "weight", "weightValue", "weightUnits"
]);
const LIGHT_TYPE_FIELDS = Object.freeze({
    WEAPON: new Set([
        "weaponType", "baseWeapon", "damage", "damageFormula", "damageType",
        "versatileFormula", "versatileDamageType", "properties", "magicBonus"
    ]),
    EQUIPMENT: new Set([
        "equipmentType", "baseEquipment", "armorClass", "maxDexModifier",
        "strengthRequirement", "properties", "magicBonus"
    ]),
    CONSUMABLE: new Set(["consumableType", "properties", "magicBonus"]),
    TOOL: new Set([
        "toolType", "baseTool", "toolAbility", "ability", "toolProficiency",
        "toolBonus", "properties", "magicBonus"
    ]),
    LOOT: new Set(["lootType", "properties"]),
    CONTAINER: new Set([
        "itemCapacity", "weightCapacity", "weightCapacityUnits", "volumeCapacity",
        "volumeCapacityUnits", "weightlessContents", "properties", "magicBonus"
    ]),
    SPELL: new Set([
        "spellLevel", "spellSchool", "spellAbility", "ability", "activationType",
        "activationValue", "preparationMethod", "prepared", "components", "vocal",
        "somatic", "material", "range", "rangeValue", "rangeUnits", "duration",
        "durationValue", "durationUnits", "concentration"
    ])
});
const LIGHT_PROPERTY_FIELDS = Object.freeze({
    WEAPON: new Set(Object.values(PROPERTY_KEYS)),
    EQUIPMENT: new Set(["Adamantine", "Focus", "Magical"]),
    CONSUMABLE: new Set(["Magical"]),
    TOOL: new Set(["Magical"]),
    LOOT: new Set(["Magical"]),
    CONTAINER: new Set(["Magical"])
});
const LIGHT_BOOLEAN_VALUES = new Set([
    "true", "yes", "y", "1", "on", "false", "no", "n", "0", "off"
]);

function lightPropertyEntries(value) {
    return String(value ?? "").split(/[,|]/).map(raw => {
        const label = raw.trim();
        const normalized = label.toLowerCase().replace(/\s+/g, "");
        return {
            label,
            property: PROPERTY_KEYS[normalized] || PROPERTY_KEYS[label.toLowerCase()] || null
        };
    }).filter(entry => entry.label);
}

function validateLightYamlFields(fields) {
    const errors = [];
    const inferredType = inferType(fields);
    const topKey = TYPE_TO_TOP_KEY[inferredType] || "LOOT";
    const allowed = new Set([
        ...LIGHT_BASE_FIELDS,
        ...(topKey === "SPELL" ? [] : LIGHT_PHYSICAL_FIELDS),
        ...(LIGHT_TYPE_FIELDS[topKey] || [])
    ]);

    if (topKey === "CONSUMABLE") {
        const subtype = normalizeAliasedValue(
            fields.consumableType,
            CONSUMABLE_TYPE_ALIASES,
            inferredType === "potion" || inferredType === "scroll" ? inferredType : "potion"
        );
        if (subtype === "ammo") allowed.add("ammunitionType");
        if (subtype === "poison") allowed.add("poisonType");
        if (subtype === "scroll") {
            for (const field of ["components", "vocal", "somatic", "material", "concentration"]) {
                allowed.add(field);
            }
        }
    }

    for (const key of Object.keys(fields)) {
        if (!allowed.has(key)) {
            errors.push(`Lightweight field "${key}" is not supported for ${topKey.toLowerCase()} Items; use strict YAML to preserve that field.`);
        }
    }

    for (const [combined, explicit] of [
        ["price", ["priceValue", "priceDenomination"]],
        ["weight", ["weightValue", "weightUnits"]],
        ["range", ["rangeValue", "rangeUnits"]],
        ["duration", ["durationValue", "durationUnits"]]
    ]) {
        if (fields[combined] !== undefined && explicit.some(key => fields[key] !== undefined)) {
            errors.push(`Lightweight field "${combined}" cannot be combined with ${explicit.join("/")}; choose one representation.`);
        }
    }
    if (fields.damage !== undefined && fields.damageFormula !== undefined) {
        errors.push('Lightweight field "damage" cannot be combined with damageFormula; choose one formula representation.');
    }
    if (fields.spellAbility !== undefined && fields.ability !== undefined) {
        errors.push('Lightweight fields "spellAbility" and "ability" are aliases in a spell; provide only one.');
    }
    if (fields.toolAbility !== undefined && fields.ability !== undefined) {
        errors.push('Lightweight fields "toolAbility" and "ability" are aliases in a tool; provide only one.');
    }

    const numericField = (key, label = key) => {
        if (fields[key] !== undefined && !Number.isFinite(Number(fields[key]))) {
            errors.push(`Lightweight field "${label}" must be a finite number; received "${fields[key]}".`);
        }
    };
    for (const key of ["priceValue", "weightValue", "magicBonus"]) numericField(key);
    if (fields.price !== undefined
        && !/^-?\d+(?:\.\d+)?\s*(?:pp|gp|ep|sp|cp)?$/i.test(String(fields.price).trim())) {
        errors.push(`Lightweight field "price" must be a number with an optional pp/gp/ep/sp/cp denomination; received "${fields.price}".`);
    }
    if (fields.priceDenomination !== undefined
        && !/^(?:pp|gp|ep|sp|cp)$/i.test(String(fields.priceDenomination).trim())) {
        errors.push(`Unsupported lightweight price denomination "${fields.priceDenomination}".`);
    }
    if (fields.weight !== undefined
        && !/^-?\d+(?:\.\d+)?\s*[A-Za-z]*$/.test(String(fields.weight).trim())) {
        errors.push(`Lightweight field "weight" must be a number with optional units; received "${fields.weight}".`);
    }
    if (fields.damage !== undefined
        && !/^\d+d\d+(?:\s*[+-]\s*\d+)?(?:\s+[A-Za-z]+)?$/i.test(String(fields.damage).trim())) {
        errors.push(`Lightweight field "damage" must contain a simple dice formula and optional damage type; received "${fields.damage}".`);
    }

    for (const key of ["weightlessContents", "prepared", "vocal", "somatic", "material", "concentration"]) {
        if (fields[key] !== undefined && !LIGHT_BOOLEAN_VALUES.has(String(fields[key]).trim().toLowerCase())) {
            errors.push(`Lightweight field "${key}" must be true or false; received "${fields[key]}".`);
        }
    }
    if (fields.components !== undefined) {
        const unknown = String(fields.components).split(/[,|/\s]+/)
            .map(normalizeIdentifier)
            .filter(token => token && !["v", "vocal", "verbal", "s", "somatic", "m", "material"].includes(token));
        if (unknown.length) errors.push(`Unsupported lightweight spell component(s): ${[...new Set(unknown)].join(", ")}.`);
    }

    if (fields.properties !== undefined) {
        const allowedProperties = LIGHT_PROPERTY_FIELDS[topKey] || new Set();
        for (const entry of lightPropertyEntries(fields.properties)) {
            if (!entry.property) {
                errors.push(`Unknown lightweight property "${entry.label}".`);
            } else if (!allowedProperties.has(entry.property)) {
                errors.push(`Lightweight property "${entry.label}" is not supported for ${topKey.toLowerCase()} Items.`);
            }
        }
    }

    if (fields.versatileDamageType !== undefined) {
        const requestedVersatile = lightPropertyEntries(fields.properties)
            .some(entry => entry.property === "Versatile");
        const baseWeapon = normalizeIdentifier(fields.baseWeapon);
        const baseIsVersatile = !!NaturalItemParser.BASE_WEAPON_DATA[baseWeapon]?.versatile;
        if (fields.versatileFormula === undefined && !requestedVersatile && !baseIsVersatile) {
            errors.push("Lightweight versatileDamageType requires versatileFormula, the Versatile property, or a versatile baseWeapon.");
        }
    }

    return errors;
}

export function stripItemCodeFences(text) {
    return String(text ?? "")
        .replace(/^```(?:yaml|markdown)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
}

const ITEM_MARKER_PREFIX = new RegExp(
    `^===\\s*(?:${YAML_ITEM_KEYS.join("|")})\\s*===\\s*(?:\\r?\\n)?`,
    "i"
);

/**
 * Remove wrappers used by generated templates before routing an individual item.
 * Batch marker splitting is handled by the window before each chunk reaches here.
 */
export function normalizeItemInput(text) {
    return stripItemCodeFences(text).replace(ITEM_MARKER_PREFIX, "").trim();
}

export function isStrictYamlFormat(text) {
    const stripped = normalizeItemInput(text);
    return YAML_ITEM_KEYS.some((key) => YAML_KEY_REGEXES[key].test(stripped));
}

export function isYamlMultiItem(text) {
    const stripped = normalizeItemInput(text);
    const yamlDocuments = stripped
        .split(/^---\s*$/m)
        .map(document => document.trim())
        .filter(Boolean);
    if (yamlDocuments.length > 1) return true;

    const topLevelItemPattern = new RegExp(
        `^(?:${YAML_ITEM_KEYS.join("|")}):`,
        "gm"
    );
    return (stripped.match(topLevelItemPattern) || []).length > 1;
}

function normalizeLightKey(key) {
    return String(key ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeIdentifier(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseLightYaml(text) {
    const stripped = normalizeItemInput(text);
    const lines = stripped.split(/\r?\n/);
    const fields = {};
    const rawKeys = [];
    const errors = [];
    const warnings = [];
    let lastKey = null;
    let sawKeyValue = false;

    for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/);
        if (!match) {
            if (lastKey === "description") {
                fields.description = `${fields.description ? `${fields.description}\n` : ""}${line.trim()}`;
                continue;
            }
            return { isLightYaml: false };
        }

        sawKeyValue = true;
        const rawKey = match[1].trim();
        const canonical = LIGHT_KEYS[normalizeLightKey(rawKey)];
        rawKeys.push(rawKey);

        if (!canonical) {
            errors.push(
                `Unsupported lightweight field "${rawKey}". Supported fields: ${SUPPORTED_LIGHT_KEYS.join(", ")}.`
            );
            lastKey = null;
            continue;
        }

        const value = match[2].trim();
        fields[canonical] = canonical === "description" && fields.description
            ? `${fields.description}\n${value}`
            : value;
        lastKey = canonical;
    }

    const explicitType = normalizeIdentifier(fields.type);
    if (explicitType && !TYPE_TO_TOP_KEY[explicitType]) {
        errors.push(
            `Unsupported lightweight Item type "${fields.type}". Supported types: weapon, equipment, consumable, tool, loot, container, spell.`
        );
    }
    if (errors.length === 0) errors.push(...validateLightYamlFields(fields));

    return {
        isLightYaml: sawKeyValue,
        fields,
        rawKeys,
        errors,
        warnings
    };
}

function parsePrice(value, fields) {
    if (fields.priceValue !== undefined || fields.priceDenomination !== undefined) {
        return {
            value: Number(fields.priceValue ?? 0) || 0,
            denomination: fields.priceDenomination || "gp"
        };
    }

    const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)?/i);
    return {
        value: match ? Number(match[1]) : 0,
        denomination: match?.[2]?.toLowerCase() || "gp"
    };
}

function parseWeight(value, fields) {
    if (fields.weightValue !== undefined || fields.weightUnits !== undefined) {
        return {
            value: Number(fields.weightValue ?? 0) || 0,
            units: fields.weightUnits || "lb"
        };
    }

    const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)?/);
    return {
        value: match ? Number(match[1]) : 0,
        units: match?.[2] || "lb"
    };
}

function parseDamage(fields, baseData = {}) {
    const combined = fields.damage || fields.damageFormula || "";
    const match = String(combined).match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([A-Za-z]+)?/i);
    return {
        formula: fields.damageFormula || match?.[1]?.replace(/\s+/g, "") || baseData.damage || "1d4",
        type: fields.damageType || match?.[2]?.toLowerCase() || baseData.damageType || "bludgeoning"
    };
}

function inferVersatileFormula(formula) {
    const match = String(formula ?? "").match(/^1d(4|6|8|10)$/i);
    if (!match) return null;
    const nextDie = { 4: 6, 6: 8, 8: 10, 10: 12 }[match[1]];
    return nextDie ? `1d${nextDie}` : null;
}

function parseProperties(value) {
    const properties = {};
    for (const part of String(value ?? "").split(/[,|]/)) {
        const normalized = part.trim().toLowerCase().replace(/\s+/g, "");
        if (!normalized) continue;
        const key = PROPERTY_KEYS[normalized] || PROPERTY_KEYS[part.trim().toLowerCase()];
        if (key) properties[key] = true;
    }
    return properties;
}

function parseLightBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "yes", "y", "1", "on"].includes(normalized)) return true;
    if (["false", "no", "n", "0", "off"].includes(normalized)) return false;
    return fallback;
}

function normalizeAliasedValue(value, aliases, fallback) {
    if (value === undefined || value === null || String(value).trim() === "") return fallback;
    return aliases[normalizeIdentifier(value)] ?? String(value).trim();
}

function numberOrInput(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : String(value).trim();
}

function normalizeBaseTool(value) {
    const normalized = normalizeIdentifier(value);
    return BASE_TOOL_ALIASES[normalized] ?? normalized;
}

function parseComponents(fields) {
    const listed = new Set(
        String(fields.components ?? "")
            .split(/[,|/\s]+/)
            .map(normalizeIdentifier)
            .filter(Boolean)
    );
    return {
        vocal: parseLightBoolean(fields.vocal,
            listed.has("v") || listed.has("vocal") || listed.has("verbal")),
        somatic: parseLightBoolean(fields.somatic,
            listed.has("s") || listed.has("somatic")),
        material: parseLightBoolean(fields.material,
            listed.has("m") || listed.has("material"))
    };
}

function parseMeasurement(value, explicitValue, explicitUnits, defaults, unitAliases = {}) {
    if (explicitValue !== undefined || explicitUnits !== undefined) {
        return {
            value: numberOrInput(explicitValue, defaults.value),
            units: normalizeAliasedValue(explicitUnits, unitAliases, defaults.units)
        };
    }

    const text = String(value ?? "").trim();
    if (!text) return { ...defaults };
    const unitsOnly = unitAliases[normalizeIdentifier(text)];
    if (unitsOnly) return { value: "n/a", units: unitsOnly };

    const match = text.match(/^(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)?$/);
    if (!match) return { value: text, units: defaults.units };
    return {
        value: Number(match[1]),
        units: normalizeAliasedValue(match[2], unitAliases, defaults.units)
    };
}

function addMagicAttunement(data, magicBonus) {
    if (!Number.isFinite(magicBonus)) return;
    data.ATTUNEMENT = {
        Attunement: "none",
        "Attunement By": "n/a",
        "Magic Bonus": magicBonus
    };
}

function inferType(fields) {
    const explicit = normalizeIdentifier(fields.type);
    if (explicit && TYPE_TO_TOP_KEY[explicit]) return explicit;
    if (fields.weaponType || fields.baseWeapon || fields.damage || fields.damageFormula) return "weapon";
    if (fields.equipmentType || fields.baseEquipment || fields.armorClass) return "equipment";
    if (fields.consumableType || fields.ammunitionType || fields.poisonType) return "consumable";
    if (fields.toolType || fields.baseTool || fields.toolBonus || fields.toolProficiency) return "tool";
    if (fields.lootType) return "loot";
    if (fields.itemCapacity || fields.weightCapacity || fields.volumeCapacity || fields.weightlessContents) return "container";
    if (fields.spellLevel || fields.spellSchool || fields.activationType || fields.components) return "spell";
    return explicit || "loot";
}

function buildLightYamlStrictTemplate(fields) {
    const type = inferType(fields);
    const topKey = TYPE_TO_TOP_KEY[type] || "LOOT";
    const price = parsePrice(fields.price, fields);
    const weight = parseWeight(fields.weight, fields);
    const magicBonus = fields.magicBonus === undefined || fields.magicBonus === ""
        ? null
        : Number(String(fields.magicBonus).replace(/^\+/, ""));
    const requestedProperties = parseProperties(fields.properties);
    const magical = (Number.isFinite(magicBonus) && magicBonus > 0) || !!requestedProperties.Magical;

    const data = {
        ITEM: {
            Name: fields.name || "Unnamed Item"
        },
        DESCRIPTION: {
            Description: fields.description || "No description available."
        }
    };

    if (topKey !== "SPELL") {
        data.ITEM.Rarity = fields.rarity || "common";
        data.INVENTORY = {
            Quantity: 1,
            Identified: true,
            Equipped: false
        };
        data.COST_AND_WEIGHT = {
            "Price Value": price.value,
            "Price Denomination": price.denomination,
            "Weight Value": weight.value,
            "Weight Units": weight.units
        };
    }

    if (topKey === "WEAPON") {
        let baseWeapon = fields.baseWeapon ? normalizeIdentifier(fields.baseWeapon) : null;
        let baseData = baseWeapon ? NaturalItemParser.BASE_WEAPON_DATA[baseWeapon] || {} : {};
        const requestedWeaponType = normalizeAliasedValue(fields.weaponType, WEAPON_TYPE_ALIASES, null);
        const weaponType = requestedWeaponType || baseData.weaponType || "improv";
        if (!baseWeapon && DEFAULT_BASE_WEAPONS[weaponType]) {
            baseWeapon = DEFAULT_BASE_WEAPONS[weaponType];
            baseData = NaturalItemParser.BASE_WEAPON_DATA[baseWeapon] || {};
        }
        baseWeapon ||= "n/a";

        const damage = parseDamage(fields, baseData);
        const properties = {
            ...parseProperties((baseData.properties || []).join(",")),
            ...requestedProperties
        };
        if (fields.versatileFormula) properties["Versatile"] = true;

        data.ITEM["Weapon Type"] = weaponType;
        data.ITEM["Base Weapon"] = baseWeapon;
        data.PROPERTIES = {
            Adamantine: false,
            Ammunition: !!properties.Ammunition,
            Finesse: !!properties.Finesse,
            Firearm: !!properties.Firearm,
            Focus: !!properties.Focus,
            Heavy: !!properties.Heavy,
            Light: !!properties.Light,
            Loading: !!properties.Loading,
            Magical: magical || !!properties.Magical,
            Reach: !!properties.Reach,
            Reload: !!properties.Reload,
            Returning: !!properties.Returning,
            Silvered: !!properties.Silvered,
            Special: !!properties.Special,
            Thrown: !!properties.Thrown,
            "Two-Handed": !!properties["Two-Handed"],
            Versatile: !!properties.Versatile
        };
        data.DAMAGE = {
            "Damage Formula": damage.formula,
            "Damage Type": damage.type
        };
        data.RANGE = {
            Reach: properties.Reach ? 10 : 5,
            "Range Normal": baseData.range?.normal ?? "n/a",
            "Range Long": baseData.range?.long ?? "n/a",
            "Range Units": "ft"
        };
        data.VERSATILE_DAMAGE = {
            "Versatile Formula": fields.versatileFormula || baseData.versatile || (properties.Versatile ? inferVersatileFormula(damage.formula) : null) || "n/a",
            "Versatile Damage Type": fields.versatileDamageType || damage.type || "n/a"
        };
        data.MASTERY = { Mastery: "n/a" };
        data.PROFICIENCY = { Proficient: "Automatic" };
        if (properties.Ammunition) {
            const ammunitionType = baseWeapon.includes("crossbow") ? "crossbowBolt"
                : baseWeapon === "blowgun" ? "blowgunNeedle"
                    : baseWeapon === "sling" ? "slingBullet" : "arrow";
            data.AMMUNITION = { "Ammunition Type": ammunitionType };
        }
        addMagicAttunement(data, magicBonus);
    } else if (topKey === "EQUIPMENT") {
        const equipmentType = normalizeAliasedValue(
            fields.equipmentType,
            EQUIPMENT_TYPE_ALIASES,
            type === "armor" || type === "armour" ? "light" : "wondrous"
        );
        const armorDefaults = DEFAULT_ARMOR[equipmentType];
        const baseEquipment = fields.baseEquipment
            ? normalizeIdentifier(fields.baseEquipment)
            : armorDefaults?.base;
        data.ITEM["Equipment Type"] = equipmentType;
        if (baseEquipment) data.ITEM["Base Equipment"] = baseEquipment;
        data.PROPERTIES = {
            Adamantine: !!requestedProperties.Adamantine,
            Focus: !!requestedProperties.Focus,
            Magical: magical,
            "Stealth Disadvantage": false
        };
        if (armorDefaults) {
            data.ARMOR = {
                "Armor Class": numberOrInput(fields.armorClass, armorDefaults.armorClass),
                "Max Dex Modifier": numberOrInput(fields.maxDexModifier, "n/a"),
                "Strength Requirement": numberOrInput(fields.strengthRequirement, "n/a")
            };
        }
        data.PROFICIENCY = { Proficient: "Automatic" };
        addMagicAttunement(data, magicBonus);
    } else if (topKey === "CONSUMABLE") {
        const consumableType = normalizeAliasedValue(
            fields.consumableType,
            CONSUMABLE_TYPE_ALIASES,
            type === "potion" || type === "scroll" ? type : "potion"
        );
        data.ITEM["Consumable Type"] = consumableType;
        data.PROPERTIES = { Magical: magical };
        if (consumableType === "ammo") {
            data.AMMUNITION_PROPERTIES = {
                "Ammunition Type": normalizeIdentifier(fields.ammunitionType) || "arrow"
            };
        } else if (consumableType === "poison") {
            data.POISON_PROPERTIES = {
                "Poison Type": normalizeIdentifier(fields.poisonType) || "ingested"
            };
        } else if (consumableType === "scroll") {
            const components = parseComponents(fields);
            data.SCROLL_PROPERTIES = {
                Concentration: parseLightBoolean(fields.concentration),
                Somatic: components.somatic,
                Vocal: components.vocal,
                Ritual: false
            };
        }
        addMagicAttunement(data, magicBonus);
    } else if (topKey === "TOOL") {
        let baseTool = fields.baseTool ? normalizeBaseTool(fields.baseTool) : null;
        let toolType = normalizeAliasedValue(fields.toolType, TOOL_TYPE_ALIASES, null);
        if (!baseTool) {
            baseTool = toolType === "art" ? "smith"
                : toolType === "game" ? "dice"
                    : toolType === "music" ? "lute" : "thief";
        }
        if (toolType === null) toolType = BASE_TOOL_TYPES[baseTool] ?? "";
        data.ITEM["Base Tool"] = baseTool;
        if (toolType) data.ITEM["Tool Type"] = toolType;
        data.PROPERTIES = {
            Magical: magical,
            "Tool Bonus": numberOrInput(fields.toolBonus, "n/a")
        };
        data.ABILITY_CHECK = {
            Proficient: fields.toolProficiency || "Automatic",
            Ability: normalizeIdentifier(fields.toolAbility || fields.ability) || "n/a"
        };
        addMagicAttunement(data, magicBonus);
    } else if (topKey === "LOOT") {
        data.ITEM["Loot Type"] = normalizeAliasedValue(fields.lootType, LOOT_TYPE_ALIASES, "gear");
        data.PROPERTIES = { Magical: magical };
    } else if (topKey === "CONTAINER") {
        data.PROPERTIES = {
            Magical: magical,
            "Weightless Contents": parseLightBoolean(fields.weightlessContents)
        };
        const hasCapacity = [
            fields.itemCapacity, fields.weightCapacity, fields.volumeCapacity
        ].some(value => value !== undefined && value !== "");
        if (hasCapacity) {
            data.CAPACITY = {
                "Item Count": numberOrInput(fields.itemCapacity, "n/a"),
                "Weight Capacity Value": numberOrInput(fields.weightCapacity, "n/a"),
                "Weight Capacity Units": fields.weightCapacityUnits || "lb",
                "Volume Capacity Value": numberOrInput(fields.volumeCapacity, "n/a"),
                "Volume Capacity Units": fields.volumeCapacityUnits || "cubicfoot"
            };
        }
        addMagicAttunement(data, magicBonus);
    } else if (topKey === "SPELL") {
        const components = parseComponents(fields);
        const range = parseMeasurement(
            fields.range,
            fields.rangeValue,
            fields.rangeUnits,
            { value: "n/a", units: "self" },
            {
                self: "self", touch: "touch", special: "spec", spec: "spec", any: "any",
                ft: "ft", foot: "ft", feet: "ft", mi: "mi", mile: "mi", miles: "mi",
                m: "m", meter: "m", meters: "m", km: "km", kilometer: "km", kilometers: "km"
            }
        );
        const duration = parseMeasurement(
            fields.duration,
            fields.durationValue,
            fields.durationUnits,
            { value: "n/a", units: "inst" },
            {
                instantaneous: "inst", instant: "inst", inst: "inst", special: "spec", spec: "spec",
                turn: "turn", turns: "turn", round: "round", rounds: "round",
                minute: "minute", minutes: "minute", hour: "hour", hours: "hour",
                day: "day", days: "day", month: "month", months: "month",
                year: "year", years: "year", permanent: "perm", perm: "perm"
            }
        );
        data.ITEM.Level = numberOrInput(fields.spellLevel, 0);
        data.ITEM.School = normalizeAliasedValue(fields.spellSchool, SPELL_SCHOOL_ALIASES, "evo");
        const spellAbility = normalizeIdentifier(fields.spellAbility || fields.ability);
        if (spellAbility) data.ITEM.Ability = spellAbility;
        data.COMPONENTS = {
            Vocal: components.vocal,
            Somatic: components.somatic,
            Material: components.material
        };
        data.PREPARATION = {
            Method: normalizeIdentifier(fields.preparationMethod) || "spell",
            Prepared: parseLightBoolean(fields.prepared)
        };
        data.ACTIVATION = {
            Type: normalizeAliasedValue(fields.activationType, ACTIVATION_TYPE_ALIASES, "action"),
            Value: numberOrInput(fields.activationValue, 1)
        };
        data.RANGE = { Value: range.value, Units: range.units };
        data.DURATION = {
            Value: duration.value,
            Units: duration.units,
            Concentration: parseLightBoolean(fields.concentration)
        };
    }

    return jsyaml.dump({
        [ITEM_YAML_SCHEMA_KEY]: ITEM_YAML_SCHEMA_VERSION,
        [topKey]: data
    }, { lineWidth: -1 });
}

export function normalizeParsedItemResult(result) {
    const item = result?.item;
    if (!item || item.type !== "container" || item.quantity === 1) return result;

    const originalQuantity = item.quantity;
    item.quantity = 1;
    result.warnings = Array.isArray(result.warnings) ? result.warnings : [];

    const warning = `Container quantity "${originalQuantity}" was normalized to 1 because dnd5e containers cannot have another quantity.`;
    if (!result.warnings.includes(warning)) result.warnings.push(warning);
    return result;
}

function withTrace(result, trace, enabled, sourceText = "") {
    normalizeParsedItemResult(result);
    result.insights = buildItemParseInsights({
        text: sourceText,
        result,
        trace,
        parser: trace.selectedParser
    });
    if (enabled) {
        trace.errors = result.errors ?? [];
        trace.warnings = result.warnings ?? [];
        result.trace = trace;
    }
    return result;
}

export function parseItemText(text, options = {}) {
    const traceEnabled = !!options.trace;
    const trace = {
        inputLength: typeof text === "string" ? text.length : 0,
        inputKind: "natural",
        selectedParser: "NaturalItemParser"
    };

    try {
        const stripped = normalizeItemInput(text);

        if (isStrictYamlFormat(stripped)) {
            trace.inputKind = "strictYaml";
            trace.selectedParser = "YamlItemParser";
            const parser = getParserForText(stripped);
            const result = parser.parse(stripped);
            trace.yaml = parser.trace ?? null;
            trace.errors = result.errors ?? [];
            trace.warnings = result.warnings ?? [];
            return withTrace(result, trace, traceEnabled, stripped);
        }

        const lightYaml = parseLightYaml(stripped);
        if (lightYaml.isLightYaml) {
            trace.inputKind = "lightYaml";
            trace.selectedParser = "YamlItemParser";
            trace.lightYaml = {
                keys: lightYaml.rawKeys,
                fields: lightYaml.fields
            };

            if (lightYaml.errors.length > 0) {
                const result = {
                    success: false,
                    item: null,
                    errors: lightYaml.errors,
                    warnings: lightYaml.warnings
                };
                trace.errors = result.errors;
                trace.warnings = result.warnings;
                return withTrace(result, trace, traceEnabled, stripped);
            }

            const strictTemplate = buildLightYamlStrictTemplate(lightYaml.fields);
            trace.normalizedStrictTemplate = strictTemplate;
            const parser = getParserForText(strictTemplate);
            const result = parser.parse(strictTemplate);
            trace.yaml = parser.trace ?? null;
            trace.errors = result.errors ?? [];
            trace.warnings = result.warnings ?? [];
            return withTrace(result, trace, traceEnabled, stripped);
        }

        const parser = new NaturalItemParser({
            synthesizeAutomation: options.synthesizeAutomation === true
        });
        const result = parser.parse(stripped);
        Object.assign(trace, parser.trace ?? {});
        trace.errors = result.errors ?? [];
        trace.warnings = result.warnings ?? [];
        return withTrace(result, trace, traceEnabled, stripped);
    } catch (error) {
        ItemUtils.error("Parser routing error", error);
        const result = {
            success: false,
            item: null,
            errors: [error.message],
            warnings: []
        };
        trace.errors = result.errors;
        trace.warnings = [];
        return withTrace(result, trace, traceEnabled, text);
    }
}

/** Parse with trace and deterministic local insights enabled explicitly. */
export function parseItemTextWithInsights(text, options = {}) {
    return parseItemText(text, { ...options, trace: options.trace ?? true, insights: true });
}
