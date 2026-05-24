/**
 * 5e Item Importer - Semantic Icon Selection
 * Maps item identities (baseWeapon, baseEquipment, consumableType, etc.)
 * to relevant icon folders and returns a matching or random icon.
 *
 * Selection Priority:
 * 1. Match baseWeapon against icon filenames
 * 2. Match item name keywords against icon filenames
 * 3. Random selection from the appropriate folder
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_NAME } from "./itemConfig.js";

function chooseIcon(candidates, options = {}) {
  const sorted = [...candidates].sort((a, b) => String(a.path ?? a).localeCompare(String(b.path ?? b)));
  if (options.deterministicIcons) return sorted[0];
  return sorted[Math.floor(Math.random() * sorted.length)];
}

/**
 * Base path for Foundry core weapon icons
 * Note: These are in Foundry CORE, not the dnd5e system
 */
const WEAPON_ICON_BASE = "icons/weapons";

/**
 * Maps baseWeapon values to their corresponding icon subfolder
 * Based on Foundry core icons folder structure:
 * icons/weapons/ammunition, axes, bows, clubs, crossbows, daggers,
 * fist, guns, hammers, maces, polearms, shields, sickles, slings,
 * staves, swords, thrown, wands
 */
const WEAPON_TO_FOLDER = {
  // Swords
  longsword: "swords",
  shortsword: "swords",
  greatsword: "swords",
  rapier: "swords",
  scimitar: "swords",

  // Axes
  battleaxe: "axes",
  greataxe: "axes",
  handaxe: "axes",

  // Daggers
  dagger: "daggers",

  // Bows
  longbow: "bows",
  shortbow: "bows",

  // Crossbows
  lightcrossbow: "crossbows",
  handcrossbow: "crossbows",
  heavycrossbow: "crossbows",

  // Clubs
  club: "clubs",
  greatclub: "clubs",

  // Hammers
  warhammer: "hammers",
  lighthammer: "hammers",
  maul: "hammers",

  // Maces
  mace: "maces",
  morningstar: "maces",
  flail: "maces",

  // Polearms
  glaive: "polearms",
  halberd: "polearms",
  pike: "polearms",
  lance: "polearms",
  spear: "polearms",

  // Staves
  quarterstaff: "staves",

  // Thrown
  dart: "thrown",
  javelin: "thrown",
  net: "thrown",

  // Sickles
  sickle: "sickles",

  // Slings
  sling: "slings",

  // Misc (weapons that don't fit other categories)
  blowgun: "staves", // No blowgun folder, staves is closest
  whip: "swords", // No whip folder, swords for flexible blade
  trident: "polearms", // Trident fits with polearms
  warpick: "hammers", // War pick is hammer-like
};

/**
 * Maps weaponType values to fallback folders
 * Used when baseWeapon is not set or not recognized
 */
const WEAPON_TYPE_TO_FOLDER = {
  siege: "ammunition", // Siege weapons often fire projectiles
  natural: "fist",
  improv: "clubs", // Improvised weapons often club-like
};

/**
 * Base path for dnd5e equipment icons
 * Note: These ARE in the dnd5e system, not Foundry core
 */
const EQUIPMENT_ICON_BASE = "icons/equipment";

/**
 * Maps baseEquipment values to their corresponding icon subfolder
 * Based on Foundry core icons folder structure:
 * back, chest, feet, finger, hand, head, leg, neck, shield, shoulder, waist, wrist
 */
const EQUIPMENT_TO_FOLDER = {
  // Shields -> shield folder
  shield: "shield",

  // Light Armor -> chest (body armor)
  padded: "chest",
  leather: "chest",
  studded: "chest",

  // Medium Armor -> chest
  hide: "chest",
  chainshirt: "chest",
  scalemail: "chest",
  breastplate: "chest",
  halfplate: "chest",

  // Heavy Armor -> chest
  ringmail: "chest",
  chainmail: "chest",
  splint: "chest",
  plate: "chest",

  // Clothing/Accessories by common name
  robe: "chest",
  cloak: "back",
  cape: "back",
  mantle: "shoulder",

  helmet: "head",
  helm: "head",
  hat: "head",
  crown: "head",
  circlet: "head",
  mask: "head",
  hood: "head",
  goggles: "head",

  gloves: "hand",
  gauntlets: "hand",
  bracers: "wrist",
  vambraces: "wrist",

  boots: "feet",
  shoes: "feet",
  greaves: "leg",

  belt: "waist",
  girdle: "waist",
  sash: "waist",

  amulet: "neck",
  necklace: "neck",
  pendant: "neck",
  collar: "neck",
  gorget: "neck",
  periapt: "neck",

  ring: "finger",
};

/**
 * Maps armorType/equipmentType values to fallback folders
 * Used when baseEquipment is not set or not recognized
 */
const ARMOR_TYPE_TO_FOLDER = {
  // Armor types
  light: "chest",
  medium: "chest",
  heavy: "chest",
  natural: "chest",
  shield: "shield",

  // Accessory types from equipment parser
  clothing: "chest",
  ring: "finger",
  rod: "hand",
  trinket: null, // Search all folders
  wand: "hand",
  wondrous: null, // Search all folders
  vehicle: null, // Search all folders
};

/**
 * Base paths for consumable icons
 * Consumables span multiple Foundry core icon directories
 */
const CONSUMABLE_ICON_PATHS = {
  potion: ["icons/consumables/potions", "icons/consumables/drinks"],
  scroll: ["icons/sundries/scrolls", "icons/sundries/documents"],
  wand: ["icons/weapons/wands", "icons/magic/enchantments"],
  rod: ["icons/weapons/rods", "icons/magic/enchantments"],
  food: ["icons/consumables/food", "icons/commodities/biological"],
  poison: ["icons/consumables/potions", "icons/commodities/biological"],
  trinket: ["icons/sundries/misc", "icons/commodities/treasure"],
  ammo: ["icons/weapons/ammunition"],
};

/**
 * Maps ammunition types to specific search keywords
 */
const AMMO_TYPE_KEYWORDS = {
  arrow: ["arrow", "shaft", "flight"],
  crossbowBolt: ["bolt", "crossbow", "quarrel"],
  dart: ["dart", "throwing"],
  blowgunNeedle: ["needle", "blowgun"],
  firearmBullet: ["bullet", "cartridge", "round", "firearm"],
  slingBullet: ["bullet", "sling", "stone", "pellet"],
  energyCell: ["energy", "cell", "power", "charge"],
};

/**
 * Maps poison types to search keywords
 */
const POISON_TYPE_KEYWORDS = {
  contact: ["contact", "touch", "skin"],
  ingested: ["ingested", "drink", "food", "vial"],
  inhaled: ["inhaled", "gas", "smoke", "vapor", "cloud"],
  injury: ["injury", "blade", "weapon", "coat"],
};

/**
 * Base paths for tool icons
 * Tools span multiple Foundry core icon directories
 */
const TOOL_ICON_PATHS = {
  art: [
    "icons/tools/crafting",
    "icons/tools/smithing",
    "icons/tools/cooking",
    "icons/tools",
  ],
  game: [
    "icons/sundries/gaming",
    "icons/sundries/misc",
    "icons/commodities/treasure",
  ],
  music: ["icons/tools/instruments", "icons/sundries/misc"],
  other: ["icons/tools", "icons/sundries/survival", "icons/sundries/misc"],
};

/**
 * Maps base tool IDs to search keywords for better icon matching
 */
const BASE_TOOL_KEYWORDS = {
  // Artisan's Tools
  alchemist: ["alchemist", "alchemy", "potion", "vial", "flask", "mortar", "pestle", "chemistry"],
  alch: ["alchemist", "alchemy", "potion", "vial", "flask", "mortar", "pestle", "chemistry"],
  brewer: ["brewer", "brewing", "barrel", "keg", "beer", "ale"],
  brew: ["brewer", "brewing", "barrel", "keg", "beer", "ale"],
  calligrapher: ["calligrapher", "quill", "pen", "ink", "writing"],
  calli: ["calligrapher", "quill", "pen", "ink", "writing"],
  carpenter: ["carpenter", "woodworking", "saw", "hammer", "plane"],
  carp: ["carpenter", "woodworking", "saw", "hammer", "plane"],
  cartographer: ["cartographer", "map", "compass", "navigation", "chart"],
  carta: ["cartographer", "map", "compass", "navigation", "chart"],
  cobbler: ["cobbler", "shoe", "boot", "leather", "awl"],
  cob: ["cobbler", "shoe", "boot", "leather", "awl"],
  cook: ["cook", "cooking", "pot", "pan", "utensil", "kitchen", "ladle"],
  glassblower: ["glassblower", "glass", "blowing", "pipe", "furnace"],
  glass: ["glassblower", "glass", "blowing", "pipe", "furnace"],
  jeweler: ["jeweler", "gem", "loupe", "magnify", "precious"],
  jewel: ["jeweler", "gem", "loupe", "magnify", "precious"],
  leatherworker: ["leatherworker", "leather", "hide", "tanning", "awl"],
  leath: ["leatherworker", "leather", "hide", "tanning", "awl"],
  mason: ["mason", "stone", "chisel", "hammer", "brick"],
  maso: ["mason", "stone", "chisel", "hammer", "brick"],
  painter: ["painter", "paint", "brush", "palette", "easel", "canvas"],
  paint: ["painter", "paint", "brush", "palette", "easel", "canvas"],
  potter: ["potter", "pottery", "clay", "wheel", "kiln"],
  pott: ["potter", "pottery", "clay", "wheel", "kiln"],
  smith: ["smith", "blacksmith", "anvil", "forge", "hammer", "metal"],
  tinker: ["tinker", "repair", "gear", "clockwork", "mechanical"],
  tink: ["tinker", "repair", "gear", "clockwork", "mechanical"],
  weaver: ["weaver", "weaving", "loom", "thread", "cloth", "textile"],
  weav: ["weaver", "weaving", "loom", "thread", "cloth", "textile"],
  woodcarver: ["woodcarver", "carving", "chisel", "knife", "whittle"],
  wood: ["woodcarver", "carving", "chisel", "knife", "whittle"],

  // Gaming Sets
  dice: ["dice", "die", "gambling", "game"],
  card: ["card", "cards", "deck", "playing", "game"],
  chess: ["chess", "board", "game", "strategy"],

  // Musical Instruments
  bagpipes: ["bagpipe", "pipe", "bag"],
  drum: ["drum", "percussion", "beat"],
  dulcimer: ["dulcimer", "string", "hammer"],
  flute: ["flute", "wind", "woodwind"],
  horn: ["horn", "brass", "wind"],
  lute: ["lute", "string", "guitar"],
  lyre: ["lyre", "harp", "string"],
  panflute: ["panflute", "pan", "pipe", "flute"],
  shawm: ["shawm", "oboe", "reed", "wind"],
  viol: ["viol", "violin", "fiddle", "string", "bow"],

  // Other Tools
  disg: ["disguise", "makeup", "costume", "mask", "wig"],
  forg: ["forgery", "document", "paper", "seal", "ink", "quill"],
  herb: ["herbalism", "herb", "plant", "mortar", "pestle", "potion"],
  navg: ["navigator", "navigation", "compass", "sextant", "map", "star"],
  pois: ["poisoner", "poison", "vial", "toxic", "bottle"],
  thief: ["thieves", "lockpick", "pick", "lock", "rogue"],
};

/**
 * Base paths for container icons
 */
const CONTAINER_ICON_PATHS = [
  "icons/containers/bags",
  "icons/containers/chest",
  "icons/containers",
  "icons/sundries/survival",
  "icons/commodities/bags",
];

/**
 * Container type keywords for matching icon filenames
 * Maps common container words to search keywords
 */
const CONTAINER_KEYWORDS = {
  bag: ["bag", "sack", "pouch", "satchel"],
  backpack: ["backpack", "pack", "rucksack", "knapsack"],
  chest: ["chest", "trunk", "coffer", "strongbox"],
  box: ["box", "case", "casket", "crate"],
  pouch: ["pouch", "purse", "wallet", "pocket"],
  barrel: ["barrel", "cask", "keg", "drum"],
  basket: ["basket", "hamper", "bin"],
  bottle: ["bottle", "flask", "vial", "jar", "jug"],
  quiver: ["quiver", "arrow", "bolt"],
  holster: ["holster", "sheath", "scabbard"],
  scroll: ["scroll", "tube", "case"],
  book: ["book", "tome", "spellbook", "journal"],
  magical: [
    "magical",
    "enchanted",
    "holding",
    "portable",
    "hole",
    "haversack",
    "handy",
  ],
};

/**
 * Base paths for loot icons based on loot type
 */
const LOOT_ICON_PATHS = {
  art: [
    "icons/commodities/treasure",
    "icons/sundries/documents",
    "icons/sundries/misc",
  ],
  gear: ["icons/sundries/survival", "icons/sundries/misc", "icons/tools"],
  gem: [
    "icons/commodities/gems",
    "icons/commodities/stones",
    "icons/commodities/materials",
  ],
  junk: [
    "icons/sundries/misc",
    "icons/commodities/junk",
    "icons/commodities/materials",
  ],
  material: [
    "icons/commodities/materials",
    "icons/commodities/cloth",
    "icons/commodities/leather",
    "icons/commodities/metal",
  ],
  resource: [
    "icons/commodities/materials",
    "icons/commodities/biological",
    "icons/commodities/wood",
  ],
  treasure: [
    "icons/commodities/treasure",
    "icons/commodities/currency",
    "icons/commodities/gems",
  ],
};

/**
 * Loot type keywords for better icon matching
 */
const LOOT_TYPE_KEYWORDS = {
  art: [
    "painting",
    "sculpture",
    "statue",
    "tapestry",
    "portrait",
    "artwork",
    "masterwork",
    "canvas",
    "carving",
  ],
  gear: [
    "rope",
    "torch",
    "lantern",
    "tent",
    "bedroll",
    "rations",
    "waterskin",
    "gear",
    "kit",
    "supplies",
  ],
  gem: [
    "gem",
    "jewel",
    "ruby",
    "emerald",
    "sapphire",
    "diamond",
    "pearl",
    "opal",
    "amethyst",
    "topaz",
    "crystal",
  ],
  junk: [
    "broken",
    "rusted",
    "worn",
    "scrap",
    "junk",
    "debris",
    "refuse",
    "trash",
  ],
  material: [
    "cloth",
    "leather",
    "silk",
    "wool",
    "linen",
    "hide",
    "pelt",
    "fabric",
    "ingot",
    "ore",
    "bar",
  ],
  resource: [
    "wood",
    "stone",
    "iron",
    "copper",
    "silver",
    "gold",
    "herb",
    "plant",
    "bone",
    "scale",
    "feather",
  ],
  treasure: [
    "coin",
    "gold",
    "silver",
    "platinum",
    "treasure",
    "hoard",
    "valuable",
    "precious",
    "crown",
    "scepter",
    "goblet",
    "chalice",
  ],
};

/**
 * Get a random semantic icon for a weapon
 * @param {string} baseWeapon - The base weapon identifier (e.g., 'longsword', 'dagger')
 * @param {string} weaponType - The weapon type (e.g., 'simpleM', 'martialM', 'siege')
 * @param {string} itemName - The full item name for keyword matching (optional)
 * @returns {Promise<string|null>} Path to a matching or random icon, or null if none found
 */
export async function getRandomWeaponIcon(
  baseWeapon,
  weaponType,
  itemName = null,
  options = {}
) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  ItemUtils.log(
    `Getting semantic icon for weapon: baseWeapon=${baseWeapon}, weaponType=${weaponType}, name=${itemName}`
  );

  // Determine the target folder
  let folder = null;

  // First, try to match by baseWeapon
  if (baseWeapon) {
    const normalizedBase = baseWeapon.toLowerCase().replace(/\s+/g, "");
    folder = WEAPON_TO_FOLDER[normalizedBase];

    if (folder) {
      ItemUtils.log(`Matched baseWeapon "${baseWeapon}" to folder "${folder}"`);
    }
  }

  // If no match by baseWeapon, try weaponType for special cases
  if (!folder && weaponType) {
    folder = WEAPON_TYPE_TO_FOLDER[weaponType];

    if (folder) {
      ItemUtils.log(`Matched weaponType "${weaponType}" to folder "${folder}"`);
    }
  }

  // If still no match, return null (will fall back to other methods)
  if (!folder) {
    ItemUtils.log(
      `No folder match for baseWeapon="${baseWeapon}", weaponType="${weaponType}"`
    );
    return null;
  }

  // Build full path and get icons
  const folderPath = `${WEAPON_ICON_BASE}/${folder}`;
  const icons = await getIconsFromFolder(folderPath);

  if (!icons || icons.length === 0) {
    ItemUtils.log(`No icons found in folder: ${folderPath}`);
    return null;
  }

  // Try to find the best matching icon using priority selection
  const selectedIcon = selectBestIcon(icons, baseWeapon, itemName, options);

  ItemUtils.log(
    `Selected icon: ${selectedIcon} (from ${icons.length} options)`
  );
  return selectedIcon;
}

/**
 * Select the best matching icon from a list using priority:
 * 1. Match baseWeapon against icon filenames
 * 2. Match item name keywords against icon filenames
 * 3. Random selection
 *
 * @param {string[]} icons - Array of icon file paths
 * @param {string} baseWeapon - The base weapon identifier
 * @param {string} itemName - The full item name
 * @returns {string} The selected icon path
 */
function selectBestIcon(icons, baseWeapon, itemName, options = {}) {
  // Score all icons
  const scoredIcons = icons.map((iconPath) => {
    const filename = extractFilename(iconPath);
    let score = 0;
    let matchReason = "random";

    // Priority 1: Match baseWeapon (highest priority)
    if (baseWeapon) {
      const normalizedBase = baseWeapon.toLowerCase().replace(/\s+/g, "");

      // Exact match in filename (e.g., "halberd" in "halberd-crescent-steel.webp")
      if (filename.includes(normalizedBase)) {
        score += 100;
        matchReason = `baseWeapon exact: "${normalizedBase}"`;
      }

      // Partial match (first 4+ chars)
      if (
        normalizedBase.length >= 4 &&
        filename.includes(normalizedBase.substring(0, 4))
      ) {
        score += 50;
        if (matchReason === "random")
          matchReason = `baseWeapon partial: "${normalizedBase.substring(
            0,
            4
          )}"`;
      }
    }

    // Priority 2: Match item name keywords
    if (itemName && score < 100) {
      const keywords = extractKeywords(itemName);

      for (const keyword of keywords) {
        if (keyword.length >= 3 && filename.includes(keyword)) {
          score += 25;
          if (matchReason === "random")
            matchReason = `name keyword: "${keyword}"`;
        }
      }
    }

    return { path: iconPath, score, matchReason };
  });

  // Sort by score (highest first)
  scoredIcons.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // Log top matches for debugging
  const topMatches = scoredIcons.slice(0, 5);
  ItemUtils.log(
    "Top icon matches:",
    topMatches.map(
      (i) => `${extractFilename(i.path)}: ${i.score} (${i.matchReason})`
    )
  );

  // Get the highest score
  const topScore = scoredIcons[0].score;

  // If we have matches (score > 0), randomly select from all icons with the top score
  if (topScore > 0) {
    // Find all icons that share the top score
    const topScoringIcons = scoredIcons.filter((i) => i.score === topScore);

    // Randomly select from the top-scoring icons
    const selected = chooseIcon(topScoringIcons, options);

    ItemUtils.log(
      `Selected from ${topScoringIcons.length} top matches (score: ${topScore}): ${selected.path}`
    );
    return selected.path;
  }

  // No good match - pick random from all icons
  const selectedIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
  ItemUtils.log(
    `No keyword match, selecting ${options.deterministicIcons ? "deterministic" : "random"} icon: ${selectedIcon}`
  );
  return selectedIcon;
}

/**
 * Extract filename from a full path (without extension)
 * @param {string} path - Full file path
 * @returns {string} Lowercase filename without extension
 */
function extractFilename(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "") // Remove extension
    .toLowerCase();
}

/**
 * Extract searchable keywords from an item name
 * @param {string} name - Item name
 * @returns {string[]} Array of lowercase keywords
 */
function extractKeywords(name) {
  if (!name) return [];

  return name
    .toLowerCase()
    .replace(/\+\d+/g, "") // Remove +1, +2, etc.
    .replace(/[^a-z0-9\s]/g, " ") // Remove special chars
    .split(/\s+/)
    .filter((word) => word.length >= 3) // Only words 3+ chars
    .filter((word) => !isCommonWord(word));
}

/**
 * Check if a word is too common to be useful for matching
 * @param {string} word - Word to check
 * @returns {boolean} True if common word
 */
function isCommonWord(word) {
  const commonWords = [
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "item",
    "weapon",
    "magic",
    "magical",
    "enchanted",
    "greater",
    "lesser",
    "minor",
    "major",
    "superior",
  ];
  return commonWords.includes(word);
}

/**
 * Get all icon files from a folder
 * @param {string} folderPath - Full path to the icon folder
 * @returns {Promise<string[]>} Array of icon file paths
 */
async function getIconsFromFolder(folderPath) {
  try {
    // Try to browse the folder using "public" source for core Foundry icons
    let response;

    try {
      // Core Foundry icons are typically in the public/icons directory
      response = await foundry.applications.apps.FilePicker.implementation.browse("public", folderPath);
    } catch (e) {
      // Fallback to data source
      ItemUtils.log(
        `Public browse failed for ${folderPath}, trying data source`
      );
      response = await foundry.applications.apps.FilePicker.implementation.browse("data", folderPath);
    }

    if (!response.files || response.files.length === 0) {
      ItemUtils.log(`No files found in ${folderPath}`);
      return [];
    }

    // Filter for image files only
    const imageFiles = response.files.filter(
      (file) =>
        file.endsWith(".webp") ||
        file.endsWith(".png") ||
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg") ||
        file.endsWith(".svg")
    );

    ItemUtils.log(`Found ${imageFiles.length} icons in ${folderPath}`);
    return imageFiles;
  } catch (error) {
    ItemUtils.warn(`Error browsing folder ${folderPath}: ${error.message}`);
    return [];
  }
}

/**
 * Check if a baseWeapon value has a semantic icon mapping
 * @param {string} baseWeapon - The base weapon identifier
 * @returns {boolean} True if mapping exists
 */
export function hasWeaponMapping(baseWeapon) {
  if (!baseWeapon) return false;
  const normalized = baseWeapon.toLowerCase().replace(/\s+/g, "");
  return WEAPON_TO_FOLDER.hasOwnProperty(normalized);
}

/**
 * Get the folder name for a baseWeapon (for debugging/logging)
 * @param {string} baseWeapon - The base weapon identifier
 * @returns {string|null} Folder name or null
 */
export function getWeaponFolder(baseWeapon) {
  if (!baseWeapon) return null;
  const normalized = baseWeapon.toLowerCase().replace(/\s+/g, "");
  return WEAPON_TO_FOLDER[normalized] || null;
}

/**
 * Get all available weapon folders
 * @returns {string[]} Array of unique folder names
 */
export function getAvailableWeaponFolders() {
  return [...new Set(Object.values(WEAPON_TO_FOLDER))];
}

/**
 * Clear the icon cache (for future use when caching is enabled)
 */
export function clearIconCache() {
  ItemUtils.log("Icon cache cleared");
}

// ============================================
// Future expansion stubs for other item types
// ============================================

/**
 * Get a random semantic icon for equipment/armor
 * @param {string} baseEquipment - The base equipment identifier
 * @param {string} armorType - The armor/equipment type (light, medium, heavy, shield, clothing, ring, rod, trinket, wand, wondrous, vehicle)
 * @param {string} itemName - The full item name for keyword matching
 * @returns {Promise<string|null>} Path to a random icon, or null if none found
 */
export async function getRandomEquipmentIcon(
  baseEquipment,
  armorType,
  itemName = null,
  options = {}
) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  ItemUtils.log(
    `Getting semantic icon for equipment: baseEquipment=${baseEquipment}, armorType=${armorType}, name=${itemName}`
  );

  // Determine the target folder (if we can)
  let folder = null;

  // First, try to match by baseEquipment (for actual armor)
  if (baseEquipment) {
    const normalizedBase = baseEquipment.toLowerCase().replace(/\s+/g, "");
    folder = EQUIPMENT_TO_FOLDER[normalizedBase];

    if (folder) {
      ItemUtils.log(
        `Matched baseEquipment "${baseEquipment}" to folder "${folder}"`
      );
    }
  }

  // If no match by baseEquipment, try armorType
  if (!folder && armorType) {
    const typeFolder = ARMOR_TYPE_TO_FOLDER[armorType];
    // typeFolder could be null for types that should search all folders
    if (typeFolder !== undefined) {
      folder = typeFolder;
      if (folder) {
        ItemUtils.log(`Matched armorType "${armorType}" to folder "${folder}"`);
      } else {
        ItemUtils.log(`ArmorType "${armorType}" maps to all-folder search`);
      }
    }
  }

  // If still no folder, try to infer from item name keywords
  if (!folder && itemName) {
    folder = inferEquipmentFolderFromName(itemName);

    if (folder) {
      ItemUtils.log(`Inferred folder "${folder}" from item name "${itemName}"`);
    }
  }

  // If we have a specific folder, try that first
  if (folder) {
    const folderPath = `${EQUIPMENT_ICON_BASE}/${folder}`;
    const icons = await getIconsFromFolder(folderPath);

    if (icons && icons.length > 0) {
      const selectedIcon = selectBestIcon(icons, baseEquipment, itemName, options);
      ItemUtils.log(`Selected equipment icon from ${folder}: ${selectedIcon}`);
      return selectedIcon;
    }
  }

  // No specific folder or no icons found - search ALL equipment subfolders
  ItemUtils.log(
    "No specific folder match, searching all equipment subfolders..."
  );

  const allEquipmentFolders = [
    "back",
    "chest",
    "feet",
    "finger",
    "hand",
    "head",
    "leg",
    "neck",
    "shield",
    "shoulder",
    "waist",
    "wrist",
  ];

  // Gather icons from all folders
  let allIcons = [];
  for (const subFolder of allEquipmentFolders) {
    const folderPath = `${EQUIPMENT_ICON_BASE}/${subFolder}`;
    const icons = await getIconsFromFolder(folderPath);
    if (icons && icons.length > 0) {
      allIcons.push(...icons);
    }
  }

  if (allIcons.length === 0) {
    ItemUtils.log("No icons found in any equipment folder");
    return null;
  }

  ItemUtils.log(
    `Found ${allIcons.length} total icons across all equipment folders`
  );

  // Use keyword matching to find the best icon across all folders
  const selectedIcon = selectBestIcon(allIcons, baseEquipment, itemName, options);
  ItemUtils.log(`Selected equipment icon from all folders: ${selectedIcon}`);
  return selectedIcon;
}

/**
 * Infer equipment folder from item name keywords
 * @param {string} itemName - The item name
 * @returns {string|null} Folder name or null
 */
function inferEquipmentFolderFromName(itemName) {
  if (!itemName) return null;

  const nameLower = itemName.toLowerCase();

  // Check for slot-specific keywords
  const slotKeywords = {
    shield: ["shield", "buckler", "aegis"],
    head: [
      "helm",
      "helmet",
      "hat",
      "crown",
      "circlet",
      "mask",
      "hood",
      "cap",
      "headband",
      "tiara",
      "goggles",
      "eye",
    ],
    chest: [
      "armor",
      "armour",
      "plate",
      "mail",
      "leather",
      "robe",
      "vest",
      "tunic",
      "breastplate",
      "cuirass",
      "hauberk",
      "jerkin",
      "shirt",
    ],
    back: ["cloak", "cape", "mantle", "wings"],
    shoulder: ["pauldron", "mantle", "spaulder", "epaulette"],
    hand: ["glove", "gauntlet", "mitt", "wand", "rod"],
    wrist: ["bracer", "vambrace", "bracelet", "wristband", "cuff"],
    feet: ["boot", "shoe", "sandal", "slipper", "sabatons"],
    leg: ["greave", "legging", "pant", "chausses", "cuisses"],
    waist: ["belt", "girdle", "sash", "cord"],
    neck: [
      "amulet",
      "necklace",
      "pendant",
      "collar",
      "gorget",
      "choker",
      "torc",
      "periapt",
      "medallion",
      "scarab",
    ],
    finger: ["ring", "band", "signet"],
  };

  for (const [folder, keywords] of Object.entries(slotKeywords)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return folder;
      }
    }
  }

  return null;
}

/**
 * Get a random semantic icon for consumables
 * @param {string} consumableType - The consumable type (potion, scroll, wand, etc.)
 * @param {string} ammunitionType - For ammo, the ammunition subtype
 * @param {string} poisonType - For poison, the poison subtype
 * @param {string} itemName - The full item name for keyword matching
 * @returns {Promise<string|null>} Path to a random icon, or null if none found
 */
export async function getRandomConsumableIcon(
  consumableType,
  ammunitionType = null,
  poisonType = null,
  itemName = null,
  options = {}
) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  ItemUtils.log(
    `Getting semantic icon for consumable: type=${consumableType}, ammoType=${ammunitionType}, poisonType=${poisonType}, name=${itemName}`
  );

  // Get the folders to search based on consumable type
  const foldersToSearch = CONSUMABLE_ICON_PATHS[consumableType] || [];

  if (foldersToSearch.length === 0) {
    ItemUtils.log(
      `No icon folders mapped for consumable type: ${consumableType}`
    );
    return null;
  }

  // Gather icons from all relevant folders
  let allIcons = [];
  for (const folderPath of foldersToSearch) {
    const icons = await getIconsFromFolder(folderPath);
    if (icons && icons.length > 0) {
      allIcons.push(...icons);
    }
  }

  if (allIcons.length === 0) {
    ItemUtils.log(
      `No icons found in consumable folders for type: ${consumableType}`
    );
    return null;
  }

  ItemUtils.log(
    `Found ${allIcons.length} total icons for consumable type: ${consumableType}`
  );

  // Build additional keywords based on subtype
  let subtypeKeywords = [];

  if (consumableType === "ammo" && ammunitionType) {
    subtypeKeywords = AMMO_TYPE_KEYWORDS[ammunitionType] || [];
    ItemUtils.log(`Using ammo keywords: ${subtypeKeywords.join(", ")}`);
  } else if (consumableType === "poison" && poisonType) {
    subtypeKeywords = POISON_TYPE_KEYWORDS[poisonType] || [];
    ItemUtils.log(`Using poison keywords: ${subtypeKeywords.join(", ")}`);
  }

  // Use enhanced selection with subtype keywords
  const selectedIcon = selectBestConsumableIcon(
    allIcons,
    consumableType,
    subtypeKeywords,
    itemName,
    options
  );

  ItemUtils.log(`Selected consumable icon: ${selectedIcon}`);
  return selectedIcon;
}

/**
 * Select the best matching consumable icon
 * @param {string[]} icons - Array of icon file paths
 * @param {string} consumableType - The consumable type
 * @param {string[]} subtypeKeywords - Additional keywords from subtype
 * @param {string} itemName - The full item name
 * @returns {string} The selected icon path
 */
function selectBestConsumableIcon(
  icons,
  consumableType,
  subtypeKeywords,
  itemName,
  options = {}
) {
  // Score all icons
  const scoredIcons = icons.map((iconPath) => {
    const filename = extractFilename(iconPath);
    let score = 0;
    let matchReason = "random";

    // Priority 1: Match consumable type in filename
    if (consumableType && filename.includes(consumableType.toLowerCase())) {
      score += 50;
      matchReason = `type: "${consumableType}"`;
    }

    // Priority 2: Match subtype keywords (ammo type, poison type)
    for (const keyword of subtypeKeywords) {
      if (filename.includes(keyword.toLowerCase())) {
        score += 100; // High priority for subtype match
        matchReason = `subtype keyword: "${keyword}"`;
        break;
      }
    }

    // Priority 3: Match item name keywords
    if (itemName) {
      const keywords = extractKeywords(itemName);

      for (const keyword of keywords) {
        if (keyword.length >= 3 && filename.includes(keyword)) {
          score += 25;
          if (matchReason === "random")
            matchReason = `name keyword: "${keyword}"`;
        }
      }
    }

    return { path: iconPath, score, matchReason };
  });

  // Sort by score (highest first)
  scoredIcons.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // Log top matches
  const topMatches = scoredIcons.slice(0, 5);
  ItemUtils.log(
    "Top consumable icon matches:",
    topMatches.map(
      (i) => `${extractFilename(i.path)}: ${i.score} (${i.matchReason})`
    )
  );

  // Get the highest score
  const topScore = scoredIcons[0].score;

  // If we have matches, randomly select from all icons with the top score
  if (topScore > 0) {
    const topScoringIcons = scoredIcons.filter((i) => i.score === topScore);
    const selected = chooseIcon(topScoringIcons, options);

    ItemUtils.log(
      `Selected from ${topScoringIcons.length} top matches (score: ${topScore}): ${selected.path}`
    );
    return selected.path;
  }

  // No good match - pick random
  const selectedIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
  ItemUtils.log(
    `No keyword match, selecting ${options.deterministicIcons ? "deterministic" : "random"} icon: ${selectedIcon}`
  );
  return selectedIcon;
}

/**
 * Get a random semantic icon for tools
 * @param {string} toolType - The tool type (art, game, music, or empty for other)
 * @param {string} baseToolItem - The specific tool identifier
 * @param {string} itemName - The full item name for keyword matching
 * @returns {Promise<string|null>} Path to a random icon, or null if none found
 */
export async function getRandomToolIcon(
  toolType,
  baseToolItem,
  itemName = null,
  options = {}
) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  // Normalize toolType - empty string means "other"
  const normalizedType = toolType || "other";

  ItemUtils.log(
    `Getting semantic icon for tool: type=${normalizedType}, baseTool=${baseToolItem}, name=${itemName}`
  );

  // Get the folders to search based on tool type
  const foldersToSearch =
    TOOL_ICON_PATHS[normalizedType] || TOOL_ICON_PATHS.other;

  if (foldersToSearch.length === 0) {
    ItemUtils.log(`No icon folders mapped for tool type: ${normalizedType}`);
    return null;
  }

  // Gather icons from all relevant folders
  let allIcons = [];
  for (const folderPath of foldersToSearch) {
    const icons = await getIconsFromFolder(folderPath);
    if (icons && icons.length > 0) {
      allIcons.push(...icons);
    }
  }

  if (allIcons.length === 0) {
    ItemUtils.log(`No icons found in tool folders for type: ${normalizedType}`);
    return null;
  }

  ItemUtils.log(
    `Found ${allIcons.length} total icons for tool type: ${normalizedType}`
  );

  // Build keywords from base tool
  let toolKeywords = [];
  if (baseToolItem && BASE_TOOL_KEYWORDS[baseToolItem]) {
    toolKeywords = BASE_TOOL_KEYWORDS[baseToolItem];
    ItemUtils.log(`Using base tool keywords: ${toolKeywords.join(", ")}`);
  }

  // Use enhanced selection with tool keywords
  const selectedIcon = selectBestToolIcon(allIcons, toolKeywords, itemName, options);

  ItemUtils.log(`Selected tool icon: ${selectedIcon}`);
  return selectedIcon;
}

/**
 * Select the best matching tool icon
 * @param {string[]} icons - Array of icon file paths
 * @param {string[]} toolKeywords - Keywords from base tool type
 * @param {string} itemName - The full item name
 * @returns {string} The selected icon path
 */
function selectBestToolIcon(icons, toolKeywords, itemName, options = {}) {
  // Score all icons
  const scoredIcons = icons.map((iconPath) => {
    const filename = extractFilename(iconPath);
    let score = 0;
    let matchReason = "random";

    // Priority 1: Match base tool keywords (highest priority)
    for (const keyword of toolKeywords) {
      if (filename.includes(keyword.toLowerCase())) {
        score += 100;
        matchReason = `tool keyword: "${keyword}"`;
        break;
      }
    }

    // Priority 2: Match item name keywords
    if (itemName) {
      const keywords = extractKeywords(itemName);

      for (const keyword of keywords) {
        if (keyword.length >= 3 && filename.includes(keyword)) {
          score += 25;
          if (matchReason === "random")
            matchReason = `name keyword: "${keyword}"`;
        }
      }
    }

    return { path: iconPath, score, matchReason };
  });

  // Sort by score (highest first)
  scoredIcons.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // Log top matches
  const topMatches = scoredIcons.slice(0, 5);
  ItemUtils.log(
    "Top tool icon matches:",
    topMatches.map(
      (i) => `${extractFilename(i.path)}: ${i.score} (${i.matchReason})`
    )
  );

  // Get the highest score
  const topScore = scoredIcons[0].score;

  // If we have matches, randomly select from all icons with the top score
  if (topScore > 0) {
    const topScoringIcons = scoredIcons.filter((i) => i.score === topScore);
    const selected = chooseIcon(topScoringIcons, options);

    ItemUtils.log(
      `Selected from ${topScoringIcons.length} top matches (score: ${topScore}): ${selected.path}`
    );
    return selected.path;
  }

  // No good match - pick random
  const selectedIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
  ItemUtils.log(
    `No keyword match, selecting ${options.deterministicIcons ? "deterministic" : "random"} icon: ${selectedIcon}`
  );
  return selectedIcon;
}

/**
 * Get a random semantic icon for containers
 * @param {string} itemName - The full item name for keyword matching
 * @returns {Promise<string|null>} Path to a random icon, or null if none found
 */
export async function getRandomContainerIcon(itemName = null, options = {}) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  ItemUtils.log(`Getting semantic icon for container: name=${itemName}`);

  // Gather icons from all container folders
  let allIcons = [];
  for (const folderPath of CONTAINER_ICON_PATHS) {
    const icons = await getIconsFromFolder(folderPath);
    if (icons && icons.length > 0) {
      allIcons.push(...icons);
    }
  }

  if (allIcons.length === 0) {
    ItemUtils.log("No icons found in container folders");
    return null;
  }

  ItemUtils.log(`Found ${allIcons.length} total icons in container folders`);

  // Determine container-specific keywords from item name
  let containerKeywords = [];
  if (itemName) {
    const nameLower = itemName.toLowerCase();

    // Check each container type for matching keywords
    for (const [type, keywords] of Object.entries(CONTAINER_KEYWORDS)) {
      for (const keyword of keywords) {
        if (nameLower.includes(keyword)) {
          // Add all keywords for this container type
          containerKeywords.push(...keywords);
          ItemUtils.log(`Matched container type "${type}" from name`);
          break;
        }
      }
    }
  }

  // Use selection with container keywords
  const selectedIcon = selectBestContainerIcon(
    allIcons,
    containerKeywords,
    itemName,
    options
  );

  ItemUtils.log(`Selected container icon: ${selectedIcon}`);
  return selectedIcon;
}

/**
 * Select the best matching container icon
 * @param {string[]} icons - Array of icon file paths
 * @param {string[]} containerKeywords - Keywords based on container type
 * @param {string} itemName - The full item name
 * @returns {string} The selected icon path
 */
function selectBestContainerIcon(icons, containerKeywords, itemName, options = {}) {
  // Score all icons
  const scoredIcons = icons.map((iconPath) => {
    const filename = extractFilename(iconPath);
    const searchPath = iconPath.toLowerCase();
    let score = 0;
    let matchReason = "random";

    // Priority 1: Match container type keywords
    for (const keyword of containerKeywords) {
      if (filename.includes(keyword.toLowerCase()) || searchPath.includes(keyword.toLowerCase())) {
        score += 100;
        matchReason = `container keyword: "${keyword}"`;
        break;
      }
    }

    // Priority 2: Match item name keywords
    if (itemName) {
      const keywords = extractKeywords(itemName);

      for (const keyword of keywords) {
        if (keyword.length >= 3 && filename.includes(keyword)) {
          score += 25;
          if (matchReason === "random")
            matchReason = `name keyword: "${keyword}"`;
        }
      }
    }

    return { path: iconPath, score, matchReason };
  });

  // Sort by score (highest first)
  scoredIcons.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // Log top matches
  const topMatches = scoredIcons.slice(0, 5);
  ItemUtils.log(
    "Top container icon matches:",
    topMatches.map(
      (i) => `${extractFilename(i.path)}: ${i.score} (${i.matchReason})`
    )
  );

  // Get the highest score
  const topScore = scoredIcons[0].score;

  // If we have matches, randomly select from all icons with the top score
  if (topScore > 0) {
    const topScoringIcons = scoredIcons.filter((i) => i.score === topScore);
    const selected = chooseIcon(topScoringIcons, options);

    ItemUtils.log(
      `Selected from ${topScoringIcons.length} top matches (score: ${topScore}): ${selected.path}`
    );
    return selected.path;
  }

  // No good match - pick random
  const selectedIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
  ItemUtils.log(
    `No keyword match, selecting ${options.deterministicIcons ? "deterministic" : "random"} icon: ${selectedIcon}`
  );
  return selectedIcon;
}

/**
 * Get a random semantic icon for loot
 * @param {string} lootType - The loot type (art, gear, gem, junk, material, resource, treasure)
 * @param {string} itemName - The full item name for keyword matching
 * @returns {Promise<string|null>} Path to a random icon, or null if none found
 */
export async function getRandomLootIcon(lootType, itemName = null, options = {}) {
  // Check if feature is enabled
  if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
    ItemUtils.log("Semantic icons disabled, skipping");
    return null;
  }

  ItemUtils.log(
    `Getting semantic icon for loot: type=${lootType}, name=${itemName}`
  );

  // Get the folders to search based on loot type
  const foldersToSearch = LOOT_ICON_PATHS[lootType] || LOOT_ICON_PATHS.gear;

  if (foldersToSearch.length === 0) {
    ItemUtils.log(`No icon folders mapped for loot type: ${lootType}`);
    return null;
  }

  // Gather icons from all relevant folders
  let allIcons = [];
  for (const folderPath of foldersToSearch) {
    const icons = await getIconsFromFolder(folderPath);
    if (icons && icons.length > 0) {
      allIcons.push(...icons);
    }
  }

  if (allIcons.length === 0) {
    ItemUtils.log(`No icons found in loot folders for type: ${lootType}`);
    return null;
  }

  ItemUtils.log(
    `Found ${allIcons.length} total icons for loot type: ${lootType}`
  );

  // Get keywords for the loot type
  let lootKeywords = LOOT_TYPE_KEYWORDS[lootType] || [];
  ItemUtils.log(`Using loot type keywords: ${lootKeywords.join(", ")}`);

  // Use selection with loot keywords
  const selectedIcon = selectBestLootIcon(
    allIcons,
    lootType,
    lootKeywords,
    itemName,
    options
  );

  ItemUtils.log(`Selected loot icon: ${selectedIcon}`);
  return selectedIcon;
}

/**
 * Select the best matching loot icon
 * @param {string[]} icons - Array of icon file paths
 * @param {string} lootType - The loot type
 * @param {string[]} lootKeywords - Keywords for the loot type
 * @param {string} itemName - The full item name
 * @returns {string} The selected icon path
 */
function selectBestLootIcon(icons, lootType, lootKeywords, itemName, options = {}) {
  // Score all icons
  const scoredIcons = icons.map((iconPath) => {
    const filename = extractFilename(iconPath);
    let score = 0;
    let matchReason = "random";

    // Priority 1: Match loot type in filename
    if (lootType && filename.includes(lootType.toLowerCase())) {
      score += 50;
      matchReason = `loot type: "${lootType}"`;
    }

    // Priority 2: Match loot type keywords
    for (const keyword of lootKeywords) {
      if (filename.includes(keyword.toLowerCase())) {
        score += 75;
        matchReason = `loot keyword: "${keyword}"`;
        break;
      }
    }

    // Priority 3: Match item name keywords (highest for specific matches)
    if (itemName) {
      const keywords = extractKeywords(itemName);

      for (const keyword of keywords) {
        if (keyword.length >= 3 && filename.includes(keyword)) {
          score += 100; // High priority for name match
          matchReason = `name keyword: "${keyword}"`;
        }
      }
    }

    return { path: iconPath, score, matchReason };
  });

  // Sort by score (highest first)
  scoredIcons.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // Log top matches
  const topMatches = scoredIcons.slice(0, 5);
  ItemUtils.log(
    "Top loot icon matches:",
    topMatches.map(
      (i) => `${extractFilename(i.path)}: ${i.score} (${i.matchReason})`
    )
  );

  // Get the highest score
  const topScore = scoredIcons[0].score;

  // If we have matches, randomly select from all icons with the top score
  if (topScore > 0) {
    const topScoringIcons = scoredIcons.filter((i) => i.score === topScore);
    const selected = chooseIcon(topScoringIcons, options);

    ItemUtils.log(
      `Selected from ${topScoringIcons.length} top matches (score: ${topScore}): ${selected.path}`
    );
    return selected.path;
  }

  // No good match - pick random
  const selectedIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
  ItemUtils.log(
    `No keyword match, selecting ${options.deterministicIcons ? "deterministic" : "random"} icon: ${selectedIcon}`
  );
  return selectedIcon;
}

/**
 * Spell icon semantic mappings
 * Maps spell schools and keywords to appropriate icons
 */
const SPELL_SCHOOL_ICONS = {
    // Abjuration - protective, warding magic
    abj: [
        "icons/magic/defensive/shield-barrier-blue.webp",
        "icons/magic/defensive/shield-barrier-glowing-blue.webp",
        "icons/magic/defensive/shield-barrier-flaming-pentagon-blue.webp",
        "icons/magic/defensive/barrier-shield-dome-blue-purple.webp",
        "icons/magic/defensive/illusion-evasion-echo-purple.webp",
        "icons/magic/control/debuff-chains-ropes-purple.webp"
    ],
    // Conjuration - summoning, teleportation
    con: [
        "icons/magic/symbols/runes-star-pentagon-blue.webp",
        "icons/magic/symbols/rune-sigil-black-pink.webp",
        "icons/magic/symbols/runes-star-blue.webp",
        "icons/magic/control/silhouette-hold-beam-blue.webp",
        "icons/magic/air/air-burst-spiral-blue-gray.webp",
        "icons/magic/lightning/bolt-strike-blue.webp"
    ],
    // Divination - knowledge, scrying
    div: [
        "icons/magic/perception/eye-ringed-glow-angry-large-teal.webp",
        "icons/magic/perception/eye-ringed-glow-angry-large-red.webp",
        "icons/magic/perception/orb-crystal-ball-scrying-pink.webp",
        "icons/magic/perception/third-eye-blue-red.webp",
        "icons/magic/perception/eye-tendrils-web-purple.webp",
        "icons/magic/light/beam-rays-magenta.webp"
    ],
    // Enchantment - mind control, charm
    enc: [
        "icons/magic/control/hypnosis-mesmerism-swirl.webp",
        "icons/magic/control/debuff-chains-blue.webp",
        "icons/magic/control/fear-fright-monster-grin-purple.webp",
        "icons/magic/control/silhouette-hold-change-blue.webp",
        "icons/magic/control/buff-luck-fortune-green.webp",
        "icons/magic/light/explosion-star-pink.webp"
    ],
    // Evocation - elemental, energy manipulation
    evo: [
        "icons/magic/fire/beam-jet-stream-embers.webp",
        "icons/magic/fire/explosion-fireball-large-orange.webp",
        "icons/magic/lightning/bolt-strike-blue.webp",
        "icons/magic/lightning/bolt-strike-orange.webp",
        "icons/magic/light/explosion-star-large-blue-yellow.webp",
        "icons/magic/fire/flame-burning-hand-red.webp",
        "icons/magic/acid/projectile-bolts-green.webp",
        "icons/magic/cold/snowflake-ice-blue-white.webp"
    ],
    // Illusion - trickery, deception
    ill: [
        "icons/magic/perception/silhouette-stealth-shadow.webp",
        "icons/magic/perception/eye-ringed-glow-angry-large-teal.webp",
        "icons/magic/control/silhouette-hold-change-blue.webp",
        "icons/magic/light/beam-rays-magenta.webp",
        "icons/magic/light/swords-light-702702.webp",
        "icons/magic/perception/shadow-eyed-green.webp"
    ],
    // Necromancy - death, undead
    nec: [
        "icons/magic/death/skull-energy-light-purple.webp",
        "icons/magic/death/skull-shadow-dark-purple.webp",
        "icons/magic/death/hand-undead-skeleton-fire-gray.webp",
        "icons/magic/death/skull-humanoid-crown-white-red.webp",
        "icons/magic/unholy/strike-hand-glow-pink.webp",
        "icons/magic/death/weapon-sword-skull-purple.webp"
    ],
    // Transmutation - transformation, alteration
    trs: [
        "icons/magic/nature/root-vines-grow-green.webp",
        "icons/magic/nature/hand-nature-environment-green.webp",
        "icons/magic/control/buff-flight-wings-blue.webp",
        "icons/magic/nature/leaf-glow-triple-green.webp",
        "icons/magic/holy/yin-yang-eastern-blue.webp",
        "icons/magic/nature/tree-spirit-green.webp"
    ]
};

/**
 * Cantrip-specific icons (level 0 spells)
 */
const CANTRIP_ICONS = [
    "icons/magic/light/orbs-hand-gray.webp",
    "icons/magic/light/explosion-star-small-blue-yellow.webp",
    "icons/magic/fire/flame-burning-hand-red.webp",
    "icons/magic/cold/snowflake-ice-blue-white.webp",
    "icons/magic/lightning/bolt-strike-blue.webp"
];

/**
 * Keyword-based icon mapping for spell names
 */
const SPELL_KEYWORD_ICONS = {
    // Fire spells
    fire: ["icons/magic/fire/beam-jet-stream-embers.webp", "icons/magic/fire/explosion-fireball-large-orange.webp", "icons/magic/fire/flame-burning-hand-red.webp"],
    flame: ["icons/magic/fire/beam-jet-stream-embers.webp", "icons/magic/fire/explosion-fireball-large-orange.webp"],
    burn: ["icons/magic/fire/flame-burning-hand-red.webp"],
    fireball: ["icons/magic/fire/explosion-fireball-large-orange.webp"],
    
    // Cold/Ice spells
    cold: ["icons/magic/cold/snowflake-ice-blue-white.webp", "icons/magic/cold/ice-crystal-blue-white.webp"],
    ice: ["icons/magic/cold/snowflake-ice-blue-white.webp", "icons/magic/cold/ice-crystal-blue-white.webp"],
    frost: ["icons/magic/cold/snowflake-ice-blue-white.webp"],
    freeze: ["icons/magic/cold/ice-crystal-blue-white.webp"],
    
    // Lightning spells
    lightning: ["icons/magic/lightning/bolt-strike-blue.webp", "icons/magic/lightning/bolt-strike-orange.webp"],
    thunder: ["icons/magic/lightning/bolt-strike-orange.webp"],
    shock: ["icons/magic/lightning/bolt-strike-blue.webp"],
    
    // Light/Radiant spells
    light: ["icons/magic/light/beam-rays-magenta.webp", "icons/magic/light/explosion-star-large-blue-yellow.webp"],
    radiant: ["icons/magic/holy/beam-pillar-gold.webp", "icons/magic/light/explosion-star-large-blue-yellow.webp"],
    holy: ["icons/magic/holy/beam-pillar-gold.webp"],
    divine: ["icons/magic/holy/beam-pillar-gold.webp"],
    
    // Darkness/Necrotic spells
    dark: ["icons/magic/death/skull-shadow-dark-purple.webp"],
    shadow: ["icons/magic/perception/silhouette-stealth-shadow.webp", "icons/magic/perception/shadow-eyed-green.webp"],
    death: ["icons/magic/death/skull-energy-light-purple.webp", "icons/magic/death/skull-shadow-dark-purple.webp"],
    undead: ["icons/magic/death/hand-undead-skeleton-fire-gray.webp"],
    necrotic: ["icons/magic/death/skull-energy-light-purple.webp"],
    
    // Healing spells
    heal: ["icons/magic/life/cross-area-circle-green-white.webp", "icons/magic/life/heart-cross-strong-flame-green.webp"],
    cure: ["icons/magic/life/cross-area-circle-green-white.webp"],
    restore: ["icons/magic/life/heart-cross-strong-flame-green.webp"],
    
    // Shield/Protection spells
    shield: ["icons/magic/defensive/shield-barrier-blue.webp", "icons/magic/defensive/shield-barrier-glowing-blue.webp"],
    protect: ["icons/magic/defensive/barrier-shield-dome-blue-purple.webp"],
    ward: ["icons/magic/defensive/barrier-shield-dome-blue-purple.webp"],
    
    // Mind/Psychic spells
    mind: ["icons/magic/control/hypnosis-mesmerism-swirl.webp"],
    charm: ["icons/magic/control/hypnosis-mesmerism-swirl.webp"],
    psychic: ["icons/magic/perception/eye-ringed-glow-angry-large-teal.webp"],
    
    // Teleportation spells
    teleport: ["icons/magic/symbols/runes-star-pentagon-blue.webp"],
    dimension: ["icons/magic/symbols/runes-star-pentagon-blue.webp"],
    portal: ["icons/magic/symbols/rune-sigil-black-pink.webp"],
    
    // Nature spells
    nature: ["icons/magic/nature/root-vines-grow-green.webp", "icons/magic/nature/hand-nature-environment-green.webp"],
    plant: ["icons/magic/nature/root-vines-grow-green.webp"],
    animal: ["icons/magic/nature/wolf-paw-glow-teal-blue.webp"],
    beast: ["icons/magic/nature/wolf-paw-glow-teal-blue.webp"],
    
    // Poison/Acid spells
    poison: ["icons/magic/acid/projectile-bolts-green.webp"],
    acid: ["icons/magic/acid/projectile-bolts-green.webp"],
    venom: ["icons/magic/acid/projectile-bolts-green.webp"],
    
    // Air/Wind spells
    wind: ["icons/magic/air/air-burst-spiral-blue-gray.webp"],
    air: ["icons/magic/air/air-burst-spiral-blue-gray.webp"],
    fly: ["icons/magic/control/buff-flight-wings-blue.webp"],
    flight: ["icons/magic/control/buff-flight-wings-blue.webp"],
    
    // Water spells
    water: ["icons/magic/water/wave-water-blue.webp"],
    wave: ["icons/magic/water/wave-water-blue.webp"],
    
    // Summoning spells
    summon: ["icons/magic/symbols/runes-star-blue.webp"],
    conjure: ["icons/magic/symbols/runes-star-blue.webp"],
    
    // Divination/Vision spells
    see: ["icons/magic/perception/eye-ringed-glow-angry-large-teal.webp"],
    vision: ["icons/magic/perception/eye-ringed-glow-angry-large-teal.webp"],
    detect: ["icons/magic/perception/orb-crystal-ball-scrying-pink.webp"],
    scry: ["icons/magic/perception/orb-crystal-ball-scrying-pink.webp"]
};

/**
 * Get a random spell icon based on school, level, and name
 * @param {string} school - Spell school code (abj, con, div, enc, evo, ill, nec, trs)
 * @param {number} level - Spell level (0-9)
 * @param {string} name - Spell name for keyword matching
 * @returns {Promise<string|null>} Icon path or null
 */
export async function getRandomSpellIcon(school, level, name, options = {}) {
    // Check if semantic icons are enabled
    const MODULE_NAME = "5e-item-importer";
    if (!game.settings.get(MODULE_NAME, "useSemanticIcons")) {
        return null;
    }

    // 1. First try keyword matching from spell name
    if (name) {
        const nameLower = name.toLowerCase();
        for (const [keyword, icons] of Object.entries(SPELL_KEYWORD_ICONS)) {
            if (nameLower.includes(keyword)) {
                const randomIcon = chooseIcon(icons.map((path) => ({ path })), options).path;
                console.log(`[Item Importer] Spell icon matched by keyword "${keyword}": ${randomIcon}`);
                return randomIcon;
            }
        }
    }

    // 2. Use cantrip icons for level 0 spells
    if (level === 0) {
        const randomIcon = chooseIcon(CANTRIP_ICONS.map((path) => ({ path })), options).path;
        console.log(`[Item Importer] Cantrip icon selected: ${randomIcon}`);
        return randomIcon;
    }

    // 3. Fall back to school-based icons
    if (school && SPELL_SCHOOL_ICONS[school]) {
        const schoolIcons = SPELL_SCHOOL_ICONS[school];
        const randomIcon = chooseIcon(schoolIcons.map((path) => ({ path })), options).path;
        console.log(`[Item Importer] Spell icon matched by school "${school}": ${randomIcon}`);
        return randomIcon;
    }

    // 4. No match found
    console.log(`[Item Importer] No semantic spell icon found for: ${name}`);
    return null;
}
