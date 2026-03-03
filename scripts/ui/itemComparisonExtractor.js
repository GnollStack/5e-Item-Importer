/**
 * 5e Item Importer - Comparison Extractor
 * Extracts flat property arrays from parse results (expected) and Foundry items (actual).
 * Property format: { section, label, value } — mirrors the renderer's display logic.
 */

// ==========================================
// Formatting helpers (mirrors itemWindowRenderer.js)
// ==========================================

const WEAPON_TYPES = {
    simpleM: "Simple Melee", simpleR: "Simple Ranged",
    martialM: "Martial Melee", martialR: "Martial Ranged",
    natural: "Natural", improv: "Improvised", siege: "Siege"
};

const ARMOR_TYPES = {
    light: "Light Armor", medium: "Medium Armor", heavy: "Heavy Armor",
    shield: "Shield", natural: "Natural Armor"
};

const CONSUMABLE_TYPES = {
    ammo: "Ammunition", food: "Food", poison: "Poison", potion: "Potion",
    rod: "Rod", scroll: "Scroll", trinket: "Trinket", wand: "Wand"
};

const TOOL_TYPES = {
    "": "Other Tools", art: "Artisan's Tools", game: "Gaming Set", music: "Musical Instrument"
};

const LOOT_TYPES = {
    art: "Art Object", gear: "Adventuring Gear", gem: "Gemstone",
    treasure: "Treasure", material: "Material", resource: "Resource", junk: "Junk"
};

const RARITY_NAMES = {
    common: "Common", uncommon: "Uncommon", rare: "Rare",
    veryRare: "Very Rare", legendary: "Legendary", artifact: "Artifact"
};

const TYPE_NAMES = {
    weapon: "Weapon", equipment: "Equipment", consumable: "Consumable",
    tool: "Tool", loot: "Loot", container: "Container", spell: "Spell"
};

const SPELL_SCHOOLS = {
    abj: "Abjuration", con: "Conjuration", div: "Divination",
    enc: "Enchantment", evo: "Evocation", ill: "Illusion",
    nec: "Necromancy", trs: "Transmutation"
};

// ==========================================
// Extract from ItemData (parse result) — Expected side
// ==========================================

/**
 * Extract expected properties from a parse result's ItemData instance.
 * @param {Object} parseResult - Parse result with .item (ItemData)
 * @returns {Array<{section: string, label: string, value: string}>}
 */
export function extractExpectedItemProps(parseResult) {
    const item = parseResult.item;
    const props = [];

    // Header
    props.push({ section: "Header", label: "Name", value: item.name || "" });
    props.push({ section: "Header", label: "Type", value: TYPE_NAMES[item.type] || item.type || "" });
    props.push({ section: "Header", label: "Rarity", value: RARITY_NAMES[item.rarity] || item.rarity || "Common" });

    if (item.isMagical) props.push({ section: "Header", label: "Magical", value: "Yes" });
    if (item.attunement && item.attunement !== "none" && item.attunement !== "") {
        props.push({ section: "Header", label: "Attunement", value: "Yes" });
    }

    // Quick Stats
    if (item.cost > 0) {
        const costDisplay = item.costDisplay || item.cost;
        const denom = item.costDenomination || "gp";
        props.push({ section: "Quick Stats", label: "Cost", value: `${costDisplay} ${denom}` });
    }
    if (item.weight > 0) {
        const unitDisplay = item.weightUnits === "lb" ? "lb." : item.weightUnits;
        props.push({ section: "Quick Stats", label: "Weight", value: `${item.weight} ${unitDisplay}` });
    }
    if (item.quantity > 1) {
        props.push({ section: "Quick Stats", label: "Quantity", value: String(item.quantity) });
    }

    // Basic Properties (type-specific)
    if (item.type === "weapon" && item.weaponType) {
        props.push({ section: "Basic Properties", label: "Weapon Type", value: WEAPON_TYPES[item.weaponType] || item.weaponType });
    }
    if (item.baseWeapon) {
        props.push({ section: "Basic Properties", label: "Base Weapon", value: item.baseWeapon });
    }
    if (item.type === "equipment" && item.armorType) {
        props.push({ section: "Basic Properties", label: "Armor Type", value: ARMOR_TYPES[item.armorType] || item.armorType });
    }
    if (item.baseEquipment) {
        props.push({ section: "Basic Properties", label: "Base Equipment", value: item.baseEquipment });
    }
    if (item.consumableType) {
        props.push({ section: "Basic Properties", label: "Consumable Type", value: CONSUMABLE_TYPES[item.consumableType] || item.consumableType });
    }
    if (item.toolType !== null && item.toolType !== undefined) {
        props.push({ section: "Basic Properties", label: "Tool Type", value: TOOL_TYPES[item.toolType] || "Unknown" });
    }
    if (item.baseToolItem) {
        props.push({ section: "Basic Properties", label: "Base Tool", value: item.baseToolItem });
    }
    if (item.lootType) {
        props.push({ section: "Basic Properties", label: "Loot Type", value: LOOT_TYPES[item.lootType] || item.lootType });
    }

    // Combat Statistics
    if (item.damage?.type) {
        const types = Array.isArray(item.damage.type) ? item.damage.type.join(", ") : item.damage.type;
        props.push({ section: "Combat Statistics", label: "Damage Type", value: types });
    }
    if (item.damage?.formula) {
        props.push({ section: "Combat Statistics", label: "Damage", value: item.damage.formula });
    }
    if (item.versatileDamage?.formula) {
        props.push({ section: "Combat Statistics", label: "Versatile", value: item.versatileDamage.formula });
    }
    if (item.range) {
        let rangeText = "";
        if (item.range.value) rangeText = `${item.range.value}`;
        if (item.range.long) rangeText += `/${item.range.long}`;
        if (item.range.units) rangeText += ` ${item.range.units}`;
        if (rangeText) props.push({ section: "Combat Statistics", label: "Range", value: rangeText.trim() });
    }
    if (item.reach) {
        props.push({ section: "Combat Statistics", label: "Reach", value: `${item.reach} ft.` });
    }
    if (item.magicBonus) {
        props.push({ section: "Combat Statistics", label: "Magic Bonus", value: `+${item.magicBonus}` });
    }
    if (item.armorClass) {
        props.push({ section: "Combat Statistics", label: "AC", value: String(item.armorClass) });
    }
    if (item.maxDexModifier !== null && item.maxDexModifier !== undefined) {
        props.push({ section: "Combat Statistics", label: "Max Dex", value: `+${item.maxDexModifier}` });
    }
    if (item.strengthRequirement) {
        props.push({ section: "Combat Statistics", label: "Str Required", value: String(item.strengthRequirement) });
    }
    if (item.stealthDisadvantage) {
        props.push({ section: "Combat Statistics", label: "Stealth", value: "Disadvantage" });
    }

    // Spell properties
    extractSpellProps(item, props);

    // Special Properties
    if (item.properties?.length > 0) {
        props.push({ section: "Special Properties", label: "Properties", value: [...item.properties].sort().join(", ") });
    }
    if (item.uses?.max) {
        props.push({ section: "Special Properties", label: "Uses", value: `${item.uses.value ?? 0}/${item.uses.max}` });
    }
    if (item.recovery?.length > 0) {
        const recoveryText = item.recovery.map(r => r.period).join(", ");
        props.push({ section: "Special Properties", label: "Recovery", value: recoveryText });
    }
    if (item.attunementRequirement) {
        props.push({ section: "Special Properties", label: "Attunement Req", value: item.attunementRequirement });
    }
    if (item.mastery) {
        props.push({ section: "Special Properties", label: "Mastery", value: item.mastery });
    }

    // Container
    if (item.itemCapacity) props.push({ section: "Special Properties", label: "Item Capacity", value: `${item.itemCapacity} items` });
    if (item.weightCapacity) {
        const unit = item.weightCapacityUnits === "lb" ? "lb." : item.weightCapacityUnits;
        props.push({ section: "Special Properties", label: "Weight Capacity", value: `${item.weightCapacity} ${unit}` });
    }
    if (item.volumeCapacity) {
        const unit = item.volumeCapacityUnits === "ft" ? "cu. ft." : "L";
        props.push({ section: "Special Properties", label: "Volume Capacity", value: `${item.volumeCapacity} ${unit}` });
    }
    if (item.weightlessContents) props.push({ section: "Special Properties", label: "Weightless Contents", value: "Yes" });

    return props;
}

/**
 * Extract spell-specific properties from an item.
 */
function extractSpellProps(item, props) {
    if (item.type !== "spell") return;

    if (item.spellLevel !== undefined) {
        const levelText = item.spellLevel === 0 ? "Cantrip" : `Level ${item.spellLevel}`;
        props.push({ section: "Combat Statistics", label: "Spell Level", value: levelText });
    }
    if (item.spellSchool) {
        props.push({ section: "Combat Statistics", label: "School", value: SPELL_SCHOOLS[item.spellSchool] || item.spellSchool });
    }
    if (item.activationType) {
        props.push({ section: "Combat Statistics", label: "Casting Time", value: item.activationType });
    }
    if (item.duration) {
        let durText = item.duration.value || "";
        if (item.duration.units) durText += ` ${item.duration.units}`;
        if (durText.trim()) props.push({ section: "Combat Statistics", label: "Duration", value: durText.trim() });
    }

    const components = [];
    if (item.vocal) components.push("V");
    if (item.somatic) components.push("S");
    if (item.material) components.push("M");
    if (components.length > 0) props.push({ section: "Combat Statistics", label: "Components", value: components.join(", ") });

    if (item.concentration) props.push({ section: "Combat Statistics", label: "Concentration", value: "Yes" });
    if (item.ritual) props.push({ section: "Combat Statistics", label: "Ritual", value: "Yes" });

    if (item.material && item.materialValue) {
        props.push({ section: "Special Properties", label: "Material", value: item.materialValue });
    }
}

// ==========================================
// Extract from Foundry Item — Actual side
// ==========================================

/**
 * Extract actual properties from a created Foundry Item document.
 * @param {Object} foundryItem - Foundry Item document
 * @returns {Array<{section: string, label: string, value: string}>}
 */
export function extractActualItemProps(foundryItem) {
    const props = [];
    const sys = foundryItem.system;

    // Header
    props.push({ section: "Header", label: "Name", value: foundryItem.name || "" });
    props.push({ section: "Header", label: "Type", value: TYPE_NAMES[foundryItem.type] || foundryItem.type || "" });
    props.push({ section: "Header", label: "Rarity", value: RARITY_NAMES[sys.rarity] || sys.rarity || "Common" });

    const hasMagic = sys.properties instanceof Set ? sys.properties.has("mgc") : sys.properties?.includes?.("mgc");
    if (hasMagic) props.push({ section: "Header", label: "Magical", value: "Yes" });
    if (sys.attunement && sys.attunement !== "none" && sys.attunement !== "") {
        props.push({ section: "Header", label: "Attunement", value: "Yes" });
    }

    // Quick Stats
    if (sys.price?.value > 0) {
        props.push({ section: "Quick Stats", label: "Cost", value: `${sys.price.value} ${sys.price.denomination || "gp"}` });
    }
    if (sys.weight?.value > 0) {
        const unitDisplay = sys.weight.units === "lb" ? "lb." : sys.weight.units;
        props.push({ section: "Quick Stats", label: "Weight", value: `${sys.weight.value} ${unitDisplay}` });
    }
    if (sys.quantity > 1) {
        props.push({ section: "Quick Stats", label: "Quantity", value: String(sys.quantity) });
    }

    // Basic Properties (type-specific)
    const itemType = foundryItem.type;
    if (itemType === "weapon" && sys.type?.value) {
        props.push({ section: "Basic Properties", label: "Weapon Type", value: WEAPON_TYPES[sys.type.value] || sys.type.value });
    }
    if (itemType === "weapon" && sys.type?.baseItem) {
        props.push({ section: "Basic Properties", label: "Base Weapon", value: sys.type.baseItem });
    }
    if (itemType === "equipment" && sys.type?.value) {
        props.push({ section: "Basic Properties", label: "Armor Type", value: ARMOR_TYPES[sys.type.value] || sys.type.value });
    }
    if (itemType === "equipment" && sys.type?.baseItem) {
        props.push({ section: "Basic Properties", label: "Base Equipment", value: sys.type.baseItem });
    }
    if (itemType === "consumable" && sys.type?.value) {
        props.push({ section: "Basic Properties", label: "Consumable Type", value: CONSUMABLE_TYPES[sys.type.value] || sys.type.value });
    }
    if (itemType === "tool" && sys.type?.value !== undefined) {
        props.push({ section: "Basic Properties", label: "Tool Type", value: TOOL_TYPES[sys.type.value] || "Unknown" });
    }
    if (itemType === "tool" && sys.type?.baseItem) {
        props.push({ section: "Basic Properties", label: "Base Tool", value: sys.type.baseItem });
    }
    if (itemType === "loot" && sys.type?.value) {
        props.push({ section: "Basic Properties", label: "Loot Type", value: LOOT_TYPES[sys.type.value] || sys.type.value });
    }

    // Combat Statistics
    extractActualCombatProps(foundryItem, props);

    // Special Properties
    extractActualSpecialProps(foundryItem, props);

    return props;
}

/**
 * Extract combat/mechanical properties from Foundry item.
 */
function extractActualCombatProps(foundryItem, props) {
    const sys = foundryItem.system;
    const type = foundryItem.type;

    // Damage
    if (sys.damage?.base) {
        const base = sys.damage.base;
        if (base.types) {
            const types = Array.isArray(base.types) ? base.types : (base.types instanceof Set ? Array.from(base.types) : []);
            if (types.length > 0) props.push({ section: "Combat Statistics", label: "Damage Type", value: types.join(", ") });
        }
        // Reconstruct formula
        let formula = "";
        if (base.custom?.enabled && base.custom?.formula) {
            formula = base.custom.formula;
        } else if (base.number && base.denomination) {
            formula = `${base.number}d${base.denomination}`;
            if (base.bonus) formula += ` + ${base.bonus}`;
        }
        if (formula) props.push({ section: "Combat Statistics", label: "Damage", value: formula });
    }

    // Versatile
    if (sys.damage?.versatile) {
        const v = sys.damage.versatile;
        let formula = "";
        if (v.custom?.enabled && v.custom?.formula) formula = v.custom.formula;
        else if (v.number && v.denomination) {
            formula = `${v.number}d${v.denomination}`;
            if (v.bonus) formula += ` + ${v.bonus}`;
        }
        if (formula) props.push({ section: "Combat Statistics", label: "Versatile", value: formula });
    }

    // Range
    if (sys.range) {
        let rangeText = "";
        if (sys.range.value) rangeText = `${sys.range.value}`;
        if (sys.range.long) rangeText += `/${sys.range.long}`;
        if (sys.range.units) rangeText += ` ${sys.range.units}`;
        if (sys.range.reach) rangeText = `${sys.range.reach} ft.`; // Reach overrides for melee
        if (rangeText.trim()) props.push({ section: "Combat Statistics", label: "Range", value: rangeText.trim() });
    }

    // Magic bonus
    if (sys.magicalBonus) {
        props.push({ section: "Combat Statistics", label: "Magic Bonus", value: `+${sys.magicalBonus}` });
    }

    // Armor
    if (sys.armor?.value) {
        props.push({ section: "Combat Statistics", label: "AC", value: String(sys.armor.value) });
    }
    if (sys.armor?.dex !== undefined && sys.armor?.dex !== null) {
        props.push({ section: "Combat Statistics", label: "Max Dex", value: `+${sys.armor.dex}` });
    }
    if (sys.strength) {
        props.push({ section: "Combat Statistics", label: "Str Required", value: String(sys.strength) });
    }

    // Stealth disadvantage
    const propsSet = sys.properties instanceof Set ? sys.properties : new Set(sys.properties || []);
    if (propsSet.has("stealthDisadvantage")) {
        props.push({ section: "Combat Statistics", label: "Stealth", value: "Disadvantage" });
    }

    // Spell properties
    if (type === "spell") {
        if (sys.level !== undefined) {
            const levelText = sys.level === 0 ? "Cantrip" : `Level ${sys.level}`;
            props.push({ section: "Combat Statistics", label: "Spell Level", value: levelText });
        }
        if (sys.school) {
            props.push({ section: "Combat Statistics", label: "School", value: SPELL_SCHOOLS[sys.school] || sys.school });
        }
        if (sys.activation?.type) {
            props.push({ section: "Combat Statistics", label: "Casting Time", value: sys.activation.type });
        }
        if (sys.duration) {
            let durText = sys.duration.value || "";
            if (sys.duration.units) durText += ` ${sys.duration.units}`;
            if (durText.trim()) props.push({ section: "Combat Statistics", label: "Duration", value: durText.trim() });
        }

        const components = [];
        if (propsSet.has("vocal")) components.push("V");
        if (propsSet.has("somatic")) components.push("S");
        if (propsSet.has("material")) components.push("M");
        if (components.length > 0) props.push({ section: "Combat Statistics", label: "Components", value: components.join(", ") });

        if (propsSet.has("concentration")) props.push({ section: "Combat Statistics", label: "Concentration", value: "Yes" });
        if (propsSet.has("ritual")) props.push({ section: "Combat Statistics", label: "Ritual", value: "Yes" });

        if (sys.materials?.value) {
            props.push({ section: "Special Properties", label: "Material", value: sys.materials.value });
        }
    }
}

/**
 * Extract special properties from Foundry item.
 */
function extractActualSpecialProps(foundryItem, props) {
    const sys = foundryItem.system;

    // Properties (as sorted array, excluding spell components and stealth which are handled elsewhere)
    const propsSet = sys.properties instanceof Set ? sys.properties : new Set(sys.properties || []);
    const spellComponentKeys = new Set(["vocal", "somatic", "material", "concentration", "ritual", "stealthDisadvantage"]);
    const displayProps = [...propsSet].filter(p => !spellComponentKeys.has(p)).sort();
    if (displayProps.length > 0) {
        props.push({ section: "Special Properties", label: "Properties", value: displayProps.join(", ") });
    }

    // Uses
    if (sys.uses?.max) {
        const spent = sys.uses.spent ?? 0;
        props.push({ section: "Special Properties", label: "Uses", value: `${sys.uses.max - spent}/${sys.uses.max}` });
    }

    // Recovery
    if (sys.uses?.recovery?.length > 0) {
        const recoveryText = sys.uses.recovery.map(r => r.period).join(", ");
        props.push({ section: "Special Properties", label: "Recovery", value: recoveryText });
    }

    // Attunement requirement
    if (sys.attunement === "required") {
        props.push({ section: "Special Properties", label: "Attunement Req", value: "Required" });
    }

    // Mastery
    if (sys.mastery) {
        props.push({ section: "Special Properties", label: "Mastery", value: sys.mastery });
    }

    // Container properties
    if (sys.capacity?.count) props.push({ section: "Special Properties", label: "Item Capacity", value: `${sys.capacity.count} items` });
    if (sys.capacity?.weight?.value) {
        const unit = sys.capacity.weight.units === "lb" ? "lb." : sys.capacity.weight.units;
        props.push({ section: "Special Properties", label: "Weight Capacity", value: `${sys.capacity.weight.value} ${unit}` });
    }
    if (sys.capacity?.volume?.value) {
        const unit = sys.capacity.volume.units === "cubicFoot" ? "cu. ft." : "L";
        props.push({ section: "Special Properties", label: "Volume Capacity", value: `${sys.capacity.volume.value} ${unit}` });
    }
    const hasWeightless = propsSet.has("weightlessContents");
    if (hasWeightless) props.push({ section: "Special Properties", label: "Weightless Contents", value: "Yes" });
}
