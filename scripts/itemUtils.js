/**
 * 5e Item Importer - Utilities
 * Reusable utility functions for parsing, string manipulation, and data handling
 */

import { MODULE_NAME, MODULE_TITLE, getPacks, CurrencyRates } from "./itemConfig.js";

/**
 * Logging prefix for consistency
 */
const LOG_PREFIX = `${MODULE_TITLE} |`;

/**
 * Main utilities class
 */
export class ItemUtils {

    // ==========================================
    // Logging and Notifications
    // ==========================================

    /**
     * Show a notification and optionally log to console
     * @param {string} type - Notification type (info, warn, error)
     * @param {string} message - Message to display
     * @param {Array} objects - Optional objects to log
     */
    static notify(type, message, ...objects) {
        const consoleMethod = type === "info" ? "log" : type;
        const debugMode = game.settings.get(MODULE_NAME, "debug");

        // Always show warnings and errors
        if (type !== "info" || debugMode) {
            ui.notifications[type](`${LOG_PREFIX} ${message}`);
            if (objects.length) {
                console[consoleMethod](LOG_PREFIX, message, ...objects);
            }
        }
    }

    /**
     * Log info message (only in debug mode)
     */
    static log(message, ...objects) {
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.log(LOG_PREFIX, message, ...objects);
        }
    }

    /**
     * Log warning message
     */
    static warn(message, ...objects) {
        this.notify("warn", message, ...objects);
    }

    /**
     * Log error message
     */
    static error(message, ...objects) {
        this.notify("error", message, ...objects);
    }

    /**
     * Log debug information (verbose)
     */
    static debug(category, message, data) {
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.group(`${LOG_PREFIX} [${category}]`);
            console.log(message);
            if (data) console.log(data);
            console.groupEnd();
        }
    }

    // ==========================================
    // Icon Matching from D&D 5e System
    // ==========================================

    /**
     * Cache for icon file lists
     */
    static iconCache = {
        equipment: null,
        weapons: null,
        consumables: null,
        containers: null,
        tools: null
    };

    /**
     * Icon path mappings for different item types
     */
    static iconPaths = {
        weapon: [
            "icons/equipment/weapons",
            "systems/dnd5e/icons/equipment/weapons"
        ],
        equipment: [
            "icons/equipment/armor",
            "icons/equipment/shield",
            "systems/dnd5e/icons/equipment/armor"
        ],
        consumable: [
            "icons/consumables",
            "icons/items/potions",
            "systems/dnd5e/icons/consumables"
        ],
        container: [
            "icons/containers",
            "icons/equipment/bags",
            "systems/dnd5e/icons/containers"
        ],
        tool: [
            "icons/tools",
            "icons/equipment/tools",
            "systems/dnd5e/icons/tools"
        ],
        loot: [
            "icons/commodities/gems",          // Try gems first
            "icons/commodities/treasure",      // Then treasure
            "icons/equipment/neck",
            "icons/equipment/finger",
            "icons/equipment/trinkets",
            "icons/sundries",
            "icons/commodities",
            "systems/dnd5e/icons/loot"
        ]
    };

    /**
     * Get icon files from a directory (with caching)
     * @param {string} path - Directory path
     * @returns {Promise<string[]>} Array of icon file paths
     */
    static async getIconFiles(path) {
        try {
            // Try data path first (most common)
            let response = await FilePicker.browse("data", path);
            if (!response.files || response.files.length === 0) {
                // Try public path
                response = await FilePicker.browse("public", path);
            }

            const files = response.files || [];

            // Filter for image files only
            return files.filter(f =>
                f.endsWith('.webp') ||
                f.endsWith('.png') ||
                f.endsWith('.jpg') ||
                f.endsWith('.svg')
            );
        } catch (err) {
            this.debug("Icon Search", `Path not found: ${path}`, null);
            return [];
        }
    }

    /**
     * Extract keywords from item name for matching
     * @param {string} name - Item name
     * @returns {string[]} Array of keywords
     */
    static extractIconKeywords(name) {
        // Remove common prefixes/suffixes
        let cleaned = name.toLowerCase()
            .replace(/\+\d+/g, '') // Remove +1, +2, etc.
            .replace(/\bof\b/g, '') // Remove "of"
            .replace(/\bthe\b/g, '') // Remove "the"
            .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
            .trim();

        // Split into words and remove short words
        const words = cleaned.split(/\s+/)
            .filter(w => w.length > 2); // Ignore words shorter than 3 chars

        return words;
    }

    /**
     * Score how well an icon path matches the item keywords
     * @param {string} iconPath - Full path to icon file
     * @param {string[]} keywords - Keywords from item name
     * @returns {number} Match score (higher is better)
     */
    static scoreIconMatch(iconPath, keywords) {
        const filename = iconPath.toLowerCase().split('/').pop().replace(/\.[^.]+$/, '');
        let score = 0;

        for (const keyword of keywords) {
            if (filename.includes(keyword)) {
                // Exact word match
                score += 10;
            } else if (keyword.length > 3 && filename.includes(keyword.substring(0, 4))) {
                // Partial match (first 4 chars)
                score += 3;
            }
        }

        // Bonus for certain patterns
        if (keywords.some(k => k === 'ring') && filename.includes('ring')) score += 5;
        if (keywords.some(k => k === 'sword') && filename.includes('sword')) score += 5;
        if (keywords.some(k => k === 'armor') && filename.includes('armor')) score += 5;
        if (keywords.some(k => k === 'potion') && filename.includes('potion')) score += 5;

        return score;
    }

    /**
     * Find matching icon from D&D 5e system files
     * @param {string} itemName - Name of the item
     * @param {string} itemType - Type of item (weapon, equipment, etc.)
     * @returns {Promise<string|null>} Icon path or null
     */
    static async findSystemIcon(itemName, itemType, options = {}) {
        if (!itemName || !itemType) return null;

        this.log(`Searching for icon: ${itemName} (${itemType})`);

        // Get relevant paths for this item type
        const paths = this.iconPaths[itemType] || this.iconPaths.loot;

        // Extract keywords from item name
        const keywords = this.extractIconKeywords(itemName);
        this.debug("Icon Search", "Keywords", keywords);

        if (keywords.length === 0) return null;

        // Search all relevant paths
        let allIcons = [];
        for (const path of paths) {
            const icons = await this.getIconFiles(path);
            allIcons.push(...icons);
        }

        if (allIcons.length === 0) {
            this.debug("Icon Search", "No icons found in paths", paths);
            return null;
        }

        // Score all icons
        const scored = allIcons.map(icon => ({
            path: icon,
            score: this.scoreIconMatch(icon, keywords)
        }));

        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

        this.debug("Icon Search", "Top 5 matches", scored.slice(0, 5));

        // Return best match if it has a decent score
        if (scored[0].score > 5) {
            this.log(`Found matching icon: ${scored[0].path} (score: ${scored[0].score})`);
            return scored[0].path;
        }

        // If no good match, return random icon from appropriate category
        if (scored.length > 0) {
            const candidates = scored.slice(0, Math.min(5, scored.length));
            const selected = options.deterministicIcons
                ? candidates[0]
                : candidates[Math.floor(Math.random() * candidates.length)];
            this.log(`Using ${options.deterministicIcons ? "deterministic" : "random"} icon from top matches: ${selected.path}`);
            return selected.path;
        }

        return null;
    }

    /**
     * Debug helper: List all available icon directories
     * Usage: await ItemUtils.listIconDirectories()
     */
    static async listIconDirectories() {
        const basePaths = ["icons", "systems/dnd5e/icons"];

        for (const base of basePaths) {
            try {
                const response = await FilePicker.browse("data", base);
                console.log(`📁 ${base}:`);
                console.log("  Dirs:", response.dirs);
                console.log("  Files:", response.files?.length || 0);
            } catch (err) {
                console.log(`❌ ${base}: Not found`);
            }
        }
    }

    /**
     * Log a parsing step
     */
    static logParse(step, data) {
        if (game.settings.get(MODULE_NAME, "showParseResults")) {
            console.group(`${LOG_PREFIX} Parse: ${step}`);
            console.log(data);
            console.groupEnd();
        }
    }

    // ==========================================
    // Text Processing
    // ==========================================

    /**
     * Strip markdown formatting and clean up input text
     * @param {string} text - Raw input text
     * @returns {string} Cleaned text
     */
    static stripMarkdownAndCleanInput(text) {
        if (!text) return "";

        // Use showdown if available, otherwise basic cleanup
        let cleanText = text;
        if (typeof showdown !== "undefined") {
            try {
                const domParser = new DOMParser();
                const showdownConverter = new showdown.Converter();
                const html = domParser.parseFromString(showdownConverter.makeHtml(text), "text/html");
                cleanText = html.body.innerText;
            } catch (err) {
                this.warn("Showdown conversion failed, using basic cleanup", err);
            }
        }

        // Clean up the text
        return cleanText
            .split(/[\n\r]+/g)                              // Split on line breaks
            .map(str => str.trim())                         // Trim whitespace
            .map(str => str.replace("::", ""))              // Remove Homebrewery markdown
            .map(str => str.replace(/\s+/g, " "))          // Remove double spaces
            .filter(str => !str.startsWith("{{") &&
                !str.startsWith("}}") &&
                str !== ":")                      // Remove Homebrewery artifacts
            .filter(str => str)                             // Remove empty lines
            .join("\n");
    }

    /**
     * Normalize unicode characters (especially dashes and quotes)
     * @param {string} text - Text with potential unicode issues
     * @returns {string} Normalized text
     */
    static normalizeUnicode(text) {
        if (!text) return "";

        return text
            // Normalize various dash types to standard hyphen/minus
            .replace(/[‐‑‒–—―−]/g, "-")
            // Normalize quotes
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            // Normalize spaces
            .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")
            // Remove zero-width characters
            .replace(/[\u200B-\u200D\uFEFF]/g, "");
    }

    // ==========================================
    // String Manipulation
    // ==========================================

    /**
     * Convert camelCase to Title Case
     * @example camelToTitleCase("magicSword") => "Magic Sword"
     */
    static camelToTitleCase(string) {
        if (!string) return "";
        return string
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Capitalize all words
     * @example capitalizeAll("longsword of flames") => "Longsword Of Flames"
     */
    static capitalizeAll(string) {
        if (!string) return "";
        return string.toLowerCase().replace(/^\w|\s\w|\(\w/g, letter => letter.toUpperCase());
    }

    /**
     * Capitalize first letter only
     * @example capitalizeFirst("longsword of flames") => "Longsword of flames"
     */
    static capitalizeFirst(string) {
        if (!string) return "";
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @param {*} str - Value to escape (coerced to string)
     * @returns {string} Escaped string safe for innerHTML
     */
    static escapeHtml(str) {
        return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Convert to lowercase and normalize
     */
    static normalize(string) {
        if (!string) return "";
        return string.toLowerCase().trim().replace(/\s+/g, " ");
    }

    /**
     * Check if string starts with capital letter
     */
    static startsWithCapital(string) {
        if (!string) return false;
        return /[A-Z]/.test(string.charAt(0));
    }

    /**
     * Format string with tokens
     * @example format("{0} has {1} charges", "Wand", 3) => "Wand has 3 charges"
     */
    static format(stringToFormat, ...tokens) {
        return stringToFormat.replace(/{(\d+)}/g, (match, number) => {
            return typeof tokens[number] !== 'undefined' ? tokens[number] : match;
        });
    }

    /**
     * Replace string at specific index
     */
    static replaceAt(string, index, char) {
        if (index > string.length - 1) return string;
        return string.substring(0, index) + char + string.substring(index + 1);
    }

    /**
     * Trim specific string from end
     */
    static trimEnd(string, trimString) {
        if (!string || !trimString) return string;
        if (string.endsWith(trimString)) {
            return string.substring(0, string.length - trimString.length);
        }
        return string;
    }

    /**
     * Check if regex matches entire string
     */
    static exactMatch(string, regex) {
        const match = string.match(regex);
        return match && match[0] === string;
    }

    // ==========================================
    // Parsing Helpers
    // ==========================================

    /**
     * Parse a fraction string
     * @example parseFraction("1/2") => 0.5
     */
    static parseFraction(string) {
        if (!string) return null;
        const numbers = string.split("/");
        if (numbers.length === 2) {
            const numerator = parseFloat(numbers[0]);
            const denominator = parseFloat(numbers[1]);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
        return null;
    }

    /**
         * Parse currency from text (e.g., "50 gp", "10 sp")
         * Returns the total value in copper AND the best denomination to display
         * @param {string} text - Text containing currency
         * @returns {Object|null} {
         *   copperValue: number (total in copper),
         *   displayValue: number (amount in best denomination),
         *   displayDenomination: string (pp, gp, sp, ep, cp)
         * }
         */
    static parseCurrency(text) {
        if (!text) return null;

        // Match all currency mentions in the text
        const currencyPattern = /(\d+(?:,\d+)*)\s*(pp|gp|ep|sp|cp)/gi;
        const matches = [...text.matchAll(currencyPattern)];

        if (matches.length === 0) return null;

        // Store all denominations found
        const denominations = {
            pp: 0,
            gp: 0,
            ep: 0,
            sp: 0,
            cp: 0
        };

        let totalCopper = 0;

        // Sum up all currency values
        for (const match of matches) {
            const amount = parseInt(match[1].replace(/,/g, ""));
            const unit = match[2].toLowerCase();

            denominations[unit] += amount;
            totalCopper += amount * CurrencyRates[unit];
        }

        // Find the highest non-zero denomination
        const denominationOrder = ['pp', 'gp', 'ep', 'sp', 'cp'];
        let bestDenomination = 'cp';
        let bestValue = totalCopper;

        for (const denom of denominationOrder) {
            if (denominations[denom] > 0) {
                bestDenomination = denom;
                bestValue = denominations[denom];
                break;
            }
        }

        this.debug("Currency Parse", "Parsed currency", {
            text: text,
            matches: matches.map(m => ({ amount: m[1], unit: m[2] })),
            denominations: denominations,
            totalCopper: totalCopper,
            display: `${bestValue} ${bestDenomination}`
        });

        return {
            copperValue: totalCopper,
            displayValue: bestValue,
            displayDenomination: bestDenomination,
            // Legacy fields for backwards compatibility
            value: totalCopper,
            amount: bestValue,
            unit: bestDenomination
        };
    }

    /**
         * Parse weight from text (e.g., "15 lb", "2.5 kg")
         * @param {string} text - Text containing weight
         * @returns {Object|null} { value: number, unit: string (lb/tn/kg/Mg), display: string }
         */
    static parseWeight(text) {
        if (!text) return null;

        const match = text.match(/(\d+(?:\.\d+)?)\s*(lb|lbs?|pounds?|kg|kilograms?|tn|tons?|mg|megagrams?)/i);
        if (!match) return null;

        const value = parseFloat(match[1]);
        let unit = match[2].toLowerCase();

        // Normalize unit names to match dnd5e system codes
        if (unit.match(/lb|pound/)) unit = "lb";
        else if (unit.match(/kg|kilogram/)) unit = "kg";
        else if (unit.match(/tn|ton/)) unit = "tn";
        else if (unit.match(/mg|megagram/)) unit = "Mg";

        this.debug("Weight Parse", "Parsed weight", {
            text: text,
            value: value,
            unit: unit
        });

        return {
            value: value,
            unit: unit,
            display: `${value} ${unit}.`
        };
    }

    /**
     * Parse dice notation
     * @example parseDice("2d6+3") => { count: 2, faces: 6, bonus: 3, formula: "2d6+3" }
     */
    static parseDice(text) {
        if (!text) return null;

        const diceRegex = /(\d+)d(\d+)(?:\s*([+\-])\s*(\d+))?/i;
        const match = text.match(diceRegex);

        if (match) {
            const count = parseInt(match[1]);
            const faces = parseInt(match[2]);
            const operator = match[3] || "+";
            const bonus = match[4] ? parseInt(match[4]) : 0;
            const actualBonus = operator === "-" ? -bonus : bonus;

            return {
                count: count,
                faces: faces,
                bonus: actualBonus,
                formula: match[0]
            };
        }

        return null;
    }

    // ==========================================
    // Array Utilities
    // ==========================================

    /**
     * Get last element of array
     */
    static last(array) {
        if (!array || !array.length) return null;
        return array[array.length - 1];
    }

    /**
     * Skip elements while condition is true
     */
    static skipWhile(array, callback) {
        let doneSkipping = false;
        return array.filter((item) => {
            if (!doneSkipping) {
                doneSkipping = !callback(item);
            }
            return doneSkipping;
        });
    }

    /**
     * Get intersection of two arrays
     */
    static intersect(sourceArr, targetArr) {
        if (!sourceArr || !targetArr) return [];
        return sourceArr.filter(item => targetArr.indexOf(item) !== -1);
    }

    /**
     * Get elements in source not in target
     */
    static except(sourceArr, targetArr) {
        if (!sourceArr || !targetArr) return sourceArr || [];
        return sourceArr.filter(item => targetArr.indexOf(item) === -1);
    }

    /**
     * Remove duplicates from array
     */
    static unique(array) {
        return [...new Set(array)];
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // ==========================================
    // Compendium Helpers
    // ==========================================

    /**
     * Search compendiums for item by name and get its icon
     * @param {string} itemName - Name to search for
     * @param {string} itemType - Optional item type filter
     * @returns {Promise<string|null>} Icon path or null
     */
    static async getImgFromPackItemAsync(itemName, itemType = null) {
        if (!itemName || !game.settings.get(MODULE_NAME, "matchIcons")) {
            return null;
        }

        const item = await this.getItemFromPacksAsync(itemName, itemType);
        return item?.img || null;
    }

    /**
     * Search active compendiums for item
     * @param {string} itemName - Name to search for
     * @param {string} itemType - Optional item type filter
     * @returns {Promise<Object|null>} Item object or null
     */
    static async getItemFromPacksAsync(itemName, itemType = null) {
        if (!itemName) return null;

        const packs = getPacks().items.filter(p => p.active);

        for (const pack of packs) {
            const packObj = game.packs.get(pack.collection);
            if (!packObj) continue;

            const item = await this.getItemFromPackAsync(packObj, itemName);

            if (item && (!itemType || item.type === itemType)) {
                this.debug("Compendium", `Found item: ${itemName}`, { pack: pack.collection, item });
                return item;
            }
        }

        this.debug("Compendium", `Item not found: ${itemName}`, { searchedPacks: packs.length });
        return null;
    }

    /**
     * Search specific compendium pack for item
     * @param {CompendiumCollection} pack - Pack to search
     * @param {string} itemName - Name to search for
     * @returns {Promise<Object|null>} Item object or null
     */
    static async getItemFromPackAsync(pack, itemName) {
        if (!pack || !itemName) return null;

        try {
            const normalizedName = itemName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
            const indexEntry = pack.index.find(e =>
                normalizedName === e.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")
            );

            if (indexEntry) {
                const itemDoc = await pack.getDocument(indexEntry._id);
                const item = itemDoc.toObject();
                item.sourceUuid = itemDoc.uuid;
                return item;
            }
        } catch (err) {
            this.warn(`Error searching pack ${pack.collection}`, err);
        }

        return null;
    }

    // ==========================================
    // Validation
    // ==========================================

    /**
     * Validate item data against rules
     * @param {Object} itemData - Item data to validate
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateItemData(itemData) {
        const errors = [];

        if (!itemData.name || itemData.name.trim().length === 0) {
            errors.push("Item name is required");
        }

        if (itemData.name && itemData.name.length > 100) {
            errors.push("Item name too long (max 100 characters)");
        }

        if (itemData.system?.price?.value && itemData.system.price.value < 0) {
            errors.push("Item price cannot be negative");
        }

        if (itemData.system?.weight?.value < 0) {
            errors.push("Item weight cannot be negative");
        }

        if (itemData.system?.quantity && itemData.system.quantity < 0) {
            errors.push("Item quantity cannot be negative");
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ==========================================
    // Foundry Helpers
    // ==========================================

    /**
     * Safely set a property on an object using dot notation
     */
    static setProperty(obj, path, value) {
        return foundry.utils.setProperty(obj, path, value);
    }

    /**
     * Safely get a property from an object using dot notation
     */
    static getProperty(obj, path) {
        return foundry.utils.getProperty(obj, path);
    }

    /**
     * Deep clone an object
     */
    static deepClone(obj) {
        return foundry.utils.deepClone(obj);
    }

    /**
     * Generate a random ID
     */
    static randomID() {
        return foundry.utils.randomID();
    }

    /**
     * Merge two objects
     */
    static mergeObject(original, other, options = {}) {
        return foundry.utils.mergeObject(original, other, options);
    }

    // ==========================================
    // ContentEditable Helpers (from original module)
    // ==========================================

    /**
     * Get all text nodes under a DOM element
     */
    static textNodesUnder(node) {
        const all = [];
        for (node = node.firstChild; node; node = node.nextSibling) {
            if (node.nodeType === 3) {
                all.push(node);
            } else {
                all.push(...this.textNodesUnder(node));
            }
        }
        return all;
    }

    /**
     * Insert text at current cursor position
     */
    static insertTextAtSelection(txt) {
        const selectedRange = window.getSelection()?.getRangeAt(0);
        if (!selectedRange || !txt) {
            return;
        }
        selectedRange.deleteContents();
        selectedRange.insertNode(document.createTextNode(txt));
        selectedRange.setStart(selectedRange.endContainer, selectedRange.endOffset);
    }

    // ==========================================
    // Development Helpers
    // ==========================================

    /**
     * Pretty print object to console
     */
    static prettyPrint(obj, label = "Object") {
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.group(`${LOG_PREFIX} ${label}`);
            console.log(JSON.stringify(obj, null, 2));
            console.groupEnd();
        }
    }

    /**
     * Benchmark a function
     */
    static async benchmark(fn, label = "Function") {
        const start = performance.now();
        const result = await fn();
        const elapsed = performance.now() - start;

        if (game.settings.get(MODULE_NAME, "debug")) {
            console.log(`${LOG_PREFIX} Benchmark [${label}]: ${elapsed.toFixed(2)}ms`);
        }

        return { result, elapsed };
    }

    /**
     * Create a performance timer
     */
    static timer(label) {
        const start = performance.now();
        return {
            stop: () => {
                const elapsed = performance.now() - start;
                if (game.settings.get(MODULE_NAME, "debug")) {
                    console.log(`${LOG_PREFIX} Timer [${label}]: ${elapsed.toFixed(2)}ms`);
                }
                return elapsed;
            }
        };
    }
}

// Export singleton instance for convenience
export const itemUtils = ItemUtils;
