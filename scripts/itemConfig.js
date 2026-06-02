/**
 * 5e Item Importer - Configuration
 * Handles module settings, constants, and configuration options
 */

export const MODULE_ID = "5e-item-importer";
export const MODULE_NAME = MODULE_ID;
export const MODULE_TITLE = "5e Item Importer";

/** Valid YAML top-level item type keys for strict parser detection */
export const YAML_ITEM_KEYS = ['WEAPON', 'EQUIPMENT', 'CONSUMABLE', 'TOOL', 'LOOT', 'CONTAINER', 'SPELL'];

/** Pre-compiled regexes for YAML key detection (avoids re-compilation per parse) */
export const YAML_KEY_REGEXES = Object.fromEntries(
    YAML_ITEM_KEYS.map(key => [key, new RegExp(`^${key}:`, 'm')])
);

/**
 * Register all module settings
 */
export function registerSettings() {
    // Debug Mode - Show detailed logging and parsing information
    game.settings.register(MODULE_ID, "debug", {
        name: "Debug Logging",
        hint: "Advanced troubleshooting logs for parser and MCP diagnostics workflows. Leave this disabled unless you are intentionally debugging or reporting an issue.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            console.log(`${MODULE_TITLE} | Debug mode ${value ? 'enabled' : 'disabled'}`);
        }
    });

    game.settings.register(MODULE_ID, "enableMcpDiagnostics", {
        name: "Enable MCP Diagnostics",
        hint: "Advanced GM-only diagnostics for Foundry MCP Bridge workflows, including confirmed test fixture automation. Leave this disabled during normal play unless you are intentionally debugging or testing this module.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    // Show Parse Results - Display parsed data before import
    game.settings.register(MODULE_ID, "showParseResults", {
        name: "Show Parse Results",
        hint: "Display the parsed item data in console before importing. Helpful for debugging parsing issues.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    // Show YAML Normalization Warnings - Surface auto-fix diagnostics
    game.settings.register(MODULE_ID, "showNormalizationWarnings", {
        name: "Show YAML Normalization Warnings",
        hint: "When enabled, warnings appear whenever the parser auto-fixes common YAML mistakes (smart quotes, leading tabs, missing space after colon, BOM). Useful for debugging template or LLM-prompt issues. Off by default since fix-ups are silent and safe.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    // Auto-parse - Automatically parse text as user types
    game.settings.register(MODULE_ID, "autoParse", {
        name: "Auto-Parse on Input",
        hint: "Automatically parse the item text as you type (with a short delay). Disable if you prefer manual parsing.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Auto-parse delay
    game.settings.register(MODULE_ID, "autoParseDelay", {
        name: "Auto-Parse Delay (ms)",
        hint: "Milliseconds to wait after typing stops before auto-parsing. Higher values reduce CPU usage.",
        scope: "client",
        config: true,
        type: Number,
        default: 1000,
        range: {
            min: 250,
            max: 3000,
            step: 250
        }
    });

    // Compendium Priority - For looking up similar items
    game.settings.register(MODULE_ID, "compendiums", {
        name: "Compendium Priority",
        hint: "Internal setting for compendium search priority",
        scope: "client",
        config: false,
        type: Object,
        default: { items: [] },
    });

    // Default item type when not detected
    game.settings.register(MODULE_ID, "defaultItemType", {
        name: "Default Item Type",
        hint: "The item type to use when the parser can't determine it from the text.",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "loot": "Adventuring Gear",
            "consumable": "Consumable",
            "weapon": "Weapon",
            "equipment": "Equipment/Armor",
            "tool": "Tool",
            "container": "Container"
        },
        default: "loot"
    });

    // Icon matching - Try to find matching icons from compendiums
    game.settings.register(MODULE_ID, "matchIcons", {
        name: "Match Icons from Compendiums",
        hint: "Automatically search compendiums for matching item icons based on item name.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Create identified items by default
    game.settings.register(MODULE_ID, "createIdentified", {
        name: "Create Items as Identified",
        hint: "Mark imported items as identified by default.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Use Semantic Random Icons
    game.settings.register(MODULE_ID, "useSemanticIcons", {
        name: "Use Semantic Random Icons",
        hint: "Assign random icons from dnd5e system folders based on item identity (e.g., a longsword gets a random sword icon). Takes priority over compendium icon matching.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Parse currency from descriptions
    game.settings.register(MODULE_ID, "parseCurrency", {
        name: "Parse Currency Values",
        hint: "Attempt to extract currency values (gp, sp, cp, etc.) from item descriptions.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Parse weight from descriptions
    game.settings.register(MODULE_ID, "parseWeight", {
        name: "Parse Weight Values",
        hint: "Attempt to extract weight values from item descriptions.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Strict parsing mode
    game.settings.register(MODULE_ID, "strictParsing", {
        name: "Strict Parsing Mode",
        hint: "Require more precise formatting. Disable for more lenient parsing of homebrew or non-standard formats.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    // Store the last imported item type for quick re-use
    game.settings.register(MODULE_ID, "lastImportedType", {
        name: "Last Imported Type",
        scope: "client",
        config: false,
        type: String,
        default: ""
    });

    // Preserve formatting in descriptions
    game.settings.register(MODULE_ID, "preserveFormatting", {
        name: "Preserve Description Formatting",
        hint: "Maintain paragraph breaks and basic formatting in item descriptions.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Integrate with 5e Activity Importer
    game.settings.register(MODULE_ID, "integrateWithActivityImporter", {
        name: "Merge with Activity Importer Dropdown",
        hint: "When enabled and the 5e Activity Importer module is active, the 'Import Item' button will appear as an option inside the Activity Importer's dropdown instead of as a separate button.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_ID, "replaceGeneratedDefaultActivities", {
        name: "Replace Generated Default Activities",
        hint: "When importing inline activities, prevent dnd5e from adding its generated weapon/tool default if the imported activities already include that same primary activity type. Disable this to keep both the generated default and imported activities.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    // Track if welcome message has been shown (internal)
    game.settings.register(MODULE_ID, "hasShownWelcome", {
        name: "Has Shown Welcome",
        scope: "client",
        config: false,
        type: Boolean,
        default: false
    });
}

/**
 * Get active compendium packs for item lookup
 * @returns {Object} Object containing prioritized compendium packs
 */
export function getPacks() {
    const compendiumsSetting = game.settings.get(MODULE_NAME, "compendiums");

    const compendiums = game.packs
        .filter(p => p.documentName === "Item")
        .map(p => ({ collection: p.collection, title: p.title }));

    const itemCompendiums = compendiums
        .map(p => {
            const settingInfo = compendiumsSetting.items.find(s => s.collection === p.collection);
            const priority = settingInfo?.priority ?? 999;
            const active = settingInfo?.active ?? true;
            return { active, priority, ...p };
        })
        .sort((s1, s2) => {
            if (s1.active === s2.active) return s1.priority - s2.priority;
            if (s1.active) return -1;
            return 1;
        });

    return { items: itemCompendiums };
}

/**
 * Item type mappings for D&D 5e
 */
export const ItemTypes = {
    WEAPON: "weapon",
    EQUIPMENT: "equipment",
    CONSUMABLE: "consumable",
    TOOL: "tool",
    LOOT: "loot",
    CONTAINER: "container",
    SPELL: "spell",
    FEAT: "feat",
    CLASS: "class",
    SUBCLASS: "subclass",
    BACKGROUND: "background",
    RACE: "race"
};

/**
 * Item rarity values
 */
export const ItemRarity = {
    COMMON: "common",
    UNCOMMON: "uncommon",
    RARE: "rare",
    VERY_RARE: "veryRare",
    LEGENDARY: "legendary",
    ARTIFACT: "artifact"
};

/**
 * Item rarity to text mapping
 */
export const RarityText = {
    [ItemRarity.COMMON]: "Common",
    [ItemRarity.UNCOMMON]: "Uncommon",
    [ItemRarity.RARE]: "Rare",
    [ItemRarity.VERY_RARE]: "Very Rare",
    [ItemRarity.LEGENDARY]: "Legendary",
    [ItemRarity.ARTIFACT]: "Artifact"
};

/**
 * Weapon types
 */
export const WeaponTypes = {
    SIMPLE_MELEE: "simpleM",
    SIMPLE_RANGED: "simpleR",
    MARTIAL_MELEE: "martialM",
    MARTIAL_RANGED: "martialR",
    NATURAL: "natural",
    IMPROVISED: "improv",
    SIEGE: "siege"
};

/**
 * Armor types
 */
export const ArmorTypes = {
    LIGHT: "light",
    MEDIUM: "medium",
    HEAVY: "heavy",
    NATURAL: "natural",
    SHIELD: "shield"
};

/**
 * Tool types
 */
export const ToolTypes = {
    ARTISAN: "art",
    GAMING: "game",
    MUSICAL: "music"
};

/**
 * Base tool mappings (must match dnd5e system exactly)
 */
export const BaseTools = {
    // Other Tools (no type)
    DISGUISE: "disg",
    FORGERY: "forg",
    HERBALISM: "herb",
    NAVIGATOR: "navg",
    POISONER: "pois",
    THIEVES: "thief",

    // Artisan's Tools (type: "art")
    ALCHEMIST: "alchemist",
    BREWER: "brewer",
    CALLIGRAPHER: "calligrapher",
    CARPENTER: "carpenter",
    CARTOGRAPHER: "cartographer",
    COBBLER: "cobbler",
    COOK: "cook",
    GLASSBLOWER: "glassblower",
    JEWELER: "jeweler",
    LEATHERWORKER: "leatherworker",
    MASON: "mason",
    PAINTER: "painter",
    POTTER: "potter",
    SMITH: "smith",
    TINKER: "tinker",
    WEAVER: "weaver",
    WOODCARVER: "woodcarver",

    // Gaming Sets (type: "game")
    DICE: "dice",
    CARD: "card",
    CHESS: "chess",

    // Musical Instruments (type: "music")
    BAGPIPES: "bagpipes",
    DRUM: "drum",
    DULCIMER: "dulcimer",
    FLUTE: "flute",
    HORN: "horn",
    LUTE: "lute",
    LYRE: "lyre",
    PAN_FLUTE: "panflute",
    SHAWM: "shawm",
    VIOL: "viol"
};

/**
 * Map base tools to their required tool types
 */
export const BaseToolToType = {
    // Other tools have no type (empty string)
    "disg": "",
    "forg": "",
    "herb": "",
    "navg": "",
    "pois": "",
    "thief": "",

    // Artisan tools
    "alchemist": "art",
    "brewer": "art",
    "calligrapher": "art",
    "carpenter": "art",
    "cartographer": "art",
    "cobbler": "art",
    "cook": "art",
    "glassblower": "art",
    "jeweler": "art",
    "leatherworker": "art",
    "mason": "art",
    "painter": "art",
    "potter": "art",
    "smith": "art",
    "tinker": "art",
    "weaver": "art",
    "woodcarver": "art",

    // Legacy artisan IDs remain supported for backwards compatibility
    "alch": "art",
    "brew": "art",
    "calli": "art",
    "carp": "art",
    "carta": "art",
    "cob": "art",
    "glass": "art",
    "jewel": "art",
    "leath": "art",
    "maso": "art",
    "paint": "art",
    "pott": "art",
    "tink": "art",
    "weav": "art",
    "wood": "art",

    // Gaming sets
    "dice": "game",
    "card": "game",
    "chess": "game",

    // Musical instruments
    "bagpipes": "music",
    "drum": "music",
    "dulcimer": "music",
    "flute": "music",
    "horn": "music",
    "lute": "music",
    "lyre": "music",
    "panflute": "music",
    "shawm": "music",
    "viol": "music"
};

/**
 * Consumable types matches dnd5e system exactly
 */
export const ConsumableTypes = {
    AMMO: "ammo",
    FOOD: "food",
    POISON: "poison",
    POTION: "potion",
    ROD: "rod",
    SCROLL: "scroll",
    TRINKET: "trinket",
    WAND: "wand"
};

/**
 * Ammunition subtypes
 */
export const AmmunitionTypes = {
    ARROW: "arrow",
    BOLT: "crossbowBolt",
    BULLET_FIREARM: "firearmBullet",
    BULLET_SLING: "slingBullet",
    ENERGY_CELL: "energyCell",
    NEEDLE: "blowgunNeedle"
};

/**
 * Loot types
 */
export const LootTypes = {
    ART: "art",
    GEAR: "gear",
    GEMSTONE: "gem",
    JUNK: "junk",
    MATERIAL: "material",
    RESOURCE: "resource",
    TREASURE: "treasure"
};

/**
 * Activation types
 */
export const ActivationTypes = {
    ACTION: "action",
    BONUS: "bonus",
    REACTION: "reaction",
    MINUTE: "minute",
    HOUR: "hour",
    DAY: "day",
    SPECIAL: "special",
    LEGENDARY: "legendary",
    LAIR: "lair",
    CREW: "crew",
    NONE: "none"
};

/**
 * Duration types
 */
export const DurationTypes = {
    INSTANT: "inst",
    TURN: "turn",
    ROUND: "round",
    MINUTE: "minute",
    HOUR: "hour",
    DAY: "day",
    MONTH: "month",
    YEAR: "year",
    PERMANENT: "perm",
    SPECIAL: "special"
};

/**
 * Default parsing blocks for items
 */
export const ItemBlocks = {
    name: { id: "name", name: "Name", required: true },
    type: { id: "type", name: "Type/Category", required: true },
    rarity: { id: "rarity", name: "Rarity" },
    attunement: { id: "attunement", name: "Attunement" },
    description: { id: "description", name: "Description", required: true },
    cost: { id: "cost", name: "Cost" },
    weight: { id: "weight", name: "Weight" },
    damage: { id: "damage", name: "Damage" },
    properties: { id: "properties", name: "Properties" },
    range: { id: "range", name: "Range" },
    armor: { id: "armor", name: "Armor Class" },
    charges: { id: "charges", name: "Charges" },
    capacity: { id: "capacity", name: "Capacity" }
};

/**
 * Currency conversion rates to copper pieces
 */
export const CurrencyRates = {
    cp: 1,
    sp: 10,
    ep: 50,
    gp: 100,
    pp: 1000
};

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
    constructor(name) {
        this.name = name;
        this.start = null;
        this.marks = new Map();
    }

    begin() {
        this.start = performance.now();
        return this;
    }

    mark(label) {
        if (!this.start) return this;
        const elapsed = performance.now() - this.start;
        this.marks.set(label, elapsed);
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.log(`${MODULE_TITLE} | Performance [${this.name}] - ${label}: ${elapsed.toFixed(2)}ms`);
        }
        return this;
    }

    end() {
        if (!this.start) return;
        const total = performance.now() - this.start;
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.log(`${MODULE_TITLE} | Performance [${this.name}] - Total: ${total.toFixed(2)}ms`);
            console.log(`${MODULE_TITLE} | Marks:`, Object.fromEntries(this.marks));
        }
        return total;
    }
}

/**
 * Feature flags for experimental features
 */
export const FeatureFlags = {
    EXPORT_TO_TEXT: false,        // Export items back to text format
    TEMPLATE_SYSTEM: false,       // Planned: Save and reuse item templates
    AI_SUGGESTIONS: false,        // Planned: AI-powered parsing suggestions
    CUSTOM_PROPERTIES: false      // Planned: Support for custom item properties
};

/**
 * Check if a feature flag is enabled
 * @param {string} flag - Feature flag name
 * @returns {boolean}
 */
export function isFeatureEnabled(flag) {
    return FeatureFlags[flag] === true;
}

/**
 * Validation rules for item data
 */
export const ValidationRules = {
    name: {
        minLength: 1,
        maxLength: 100,
        required: true
    },
    cost: {
        min: 0,
        max: 999999999
    },
    weight: {
        min: 0,
        max: 10000
    },
    quantity: {
        min: 0,
        max: 9999
    }
};
