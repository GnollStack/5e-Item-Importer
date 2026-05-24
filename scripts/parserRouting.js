/**
 * Shared parser routing for strict YAML, lightweight key/value input, and
 * natural language text.
 */

import jsyaml from "./vendor/js-yaml.mjs";
import { YAML_ITEM_KEYS, YAML_KEY_REGEXES } from "./itemConfig.js";
import { getParserForText } from "./strictItemParsers/strictParserDispatcher.js";
import { NaturalItemParser } from "./naturalItemParser.js";
import { ItemUtils } from "./itemUtils.js";

const LIGHT_KEYS = {
    name: "name",
    itemname: "name",
    type: "type",
    itemtype: "type",
    rarity: "rarity",
    weapontype: "weaponType",
    baseweapon: "baseWeapon",
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
    "damage",
    "damageFormula",
    "damageType",
    "versatileFormula",
    "versatileDamageType",
    "properties",
    "price",
    "weight",
    "description",
    "magicBonus"
];

const TYPE_TO_TOP_KEY = {
    weapon: "WEAPON",
    equipment: "EQUIPMENT",
    armor: "EQUIPMENT",
    consumable: "CONSUMABLE",
    potion: "CONSUMABLE",
    scroll: "CONSUMABLE",
    tool: "TOOL",
    loot: "LOOT",
    container: "CONTAINER",
    spell: "SPELL"
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

function stripCodeFences(text) {
    return String(text ?? "")
        .replace(/^```(?:yaml|markdown)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
}

export function isStrictYamlFormat(text) {
    const stripped = stripCodeFences(text);
    return YAML_ITEM_KEYS.some((key) => YAML_KEY_REGEXES[key].test(stripped));
}

export function isYamlMultiItem(text) {
    const stripped = stripCodeFences(text);
    if (/^---\s*$/m.test(stripped)) return true;

    let count = 0;
    for (const key of YAML_ITEM_KEYS) {
        if (YAML_KEY_REGEXES[key].test(stripped)) count++;
    }
    return count > 1;
}

function normalizeLightKey(key) {
    return String(key ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeIdentifier(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseLightYaml(text) {
    const stripped = stripCodeFences(text);
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

function parseDamage(fields) {
    const combined = fields.damage || fields.damageFormula || "";
    const match = String(combined).match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([A-Za-z]+)?/i);
    return {
        formula: fields.damageFormula || match?.[1]?.replace(/\s+/g, "") || "1d4",
        type: fields.damageType || match?.[2]?.toLowerCase() || "bludgeoning"
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

function inferType(fields) {
    const explicit = normalizeIdentifier(fields.type);
    if (explicit && TYPE_TO_TOP_KEY[explicit]) return explicit;
    if (fields.weaponType || fields.baseWeapon || fields.damage || fields.damageFormula) return "weapon";
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
    const magical = Number.isFinite(magicBonus) && magicBonus > 0;

    const data = {
        ITEM: {
            Name: fields.name || "Unnamed Item",
            Rarity: fields.rarity || "common"
        },
        INVENTORY: {
            Quantity: 1,
            Identified: true,
            Equipped: false
        },
        COST_AND_WEIGHT: {
            "Price Value": price.value,
            "Price Denomination": price.denomination,
            "Weight Value": weight.value,
            "Weight Units": weight.units
        },
        DESCRIPTION: {
            Description: fields.description || "No description available."
        }
    };

    if (topKey === "WEAPON") {
        const baseWeapon = fields.baseWeapon ? normalizeIdentifier(fields.baseWeapon) : "n/a";
        const baseData = baseWeapon !== "n/a" ? NaturalItemParser.BASE_WEAPON_DATA[baseWeapon] || {} : {};
        const damage = parseDamage(fields);
        const properties = parseProperties(fields.properties);
        if (fields.versatileFormula) properties["Versatile"] = true;

        data.ITEM["Weapon Type"] = fields.weaponType || baseData.weaponType || "simpleM";
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
            Reach: 5,
            "Range Normal": "n/a",
            "Range Long": "n/a",
            "Range Units": "ft"
        };
        data.VERSATILE_DAMAGE = {
            "Versatile Formula": fields.versatileFormula || baseData.versatile || (properties.Versatile ? inferVersatileFormula(damage.formula) : null) || "n/a",
            "Versatile Damage Type": fields.versatileDamageType || damage.type || "n/a"
        };
        data.MASTERY = { Mastery: "n/a" };
        data.PROFICIENCY = { Proficient: "Automatic" };
        if (Number.isFinite(magicBonus)) {
            data.ATTUNEMENT = {
                Attunement: "none",
                "Attunement By": "n/a",
                "Magic Bonus": magicBonus
            };
        }
    } else if (topKey === "LOOT") {
        data.ITEM["Loot Type"] = "gear";
        data.PROPERTIES = { Magical: magical };
    } else {
        data.PROPERTIES = { Magical: magical };
    }

    return jsyaml.dump({ [topKey]: data }, { lineWidth: -1 });
}

function withTrace(result, trace, enabled) {
    if (enabled) {
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
        const stripped = stripCodeFences(text);

        if (isStrictYamlFormat(stripped)) {
            trace.inputKind = "strictYaml";
            trace.selectedParser = "YamlItemParser";
            const parser = getParserForText(text);
            const result = parser.parse(text);
            trace.yaml = parser.trace ?? null;
            trace.errors = result.errors ?? [];
            trace.warnings = result.warnings ?? [];
            return withTrace(result, trace, traceEnabled);
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
                return withTrace(result, trace, traceEnabled);
            }

            const strictTemplate = buildLightYamlStrictTemplate(lightYaml.fields);
            trace.normalizedStrictTemplate = strictTemplate;
            const parser = getParserForText(strictTemplate);
            const result = parser.parse(strictTemplate);
            trace.yaml = parser.trace ?? null;
            trace.errors = result.errors ?? [];
            trace.warnings = result.warnings ?? [];
            return withTrace(result, trace, traceEnabled);
        }

        const parser = new NaturalItemParser();
        const result = parser.parse(text);
        Object.assign(trace, parser.trace ?? {});
        trace.errors = result.errors ?? [];
        trace.warnings = result.warnings ?? [];
        return withTrace(result, trace, traceEnabled);
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
        return withTrace(result, trace, traceEnabled);
    }
}
