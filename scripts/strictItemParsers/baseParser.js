/**
 * 5e Item Importer - Base Strict Parser
 * Base parser for extracting universal fields from strict template format
 * All specific parsers (weapon, tool, loot, etc.) extend this base class
 */

import { ItemData } from "../itemData.js";
import { ItemUtils } from "../itemUtils.js";
import { MODULE_NAME } from "../itemConfig.js";

/**
 * Base Strict Parser - Handles universal fields common to all items
 * This is the foundation that all specific parsers extend
 */
export class BaseStrictParser {

    constructor() {
        this.errors = [];
        this.warnings = [];
        this.text = "";
        this.itemType = null;
        this.lines = [];
        this.currentLineIndex = 0;
    }

    /**
     * Main entry point - Parse text into ItemData
     * @param {string} text - Text to parse in strict format
     * @returns {Object} { success: boolean, itemData: ItemData|null, errors: string[], warnings: string[] }
     */
    parse(text) {
        this.reset();
        this.text = text.trim();

        if (!this.text) {
            this.addError("Empty text provided");
            return this.createResult(false, null);
        }

        // Split into lines for processing
        this.lines = this.text.split('\n').map(line => line.trimEnd());
        this.currentLineIndex = 0;

        try {
            // Step 1: Validate template structure
            const structureValidation = this.validateTemplateStructure();
            if (!structureValidation.valid) {
                structureValidation.errors.forEach(err => this.addError(err));
                this.addError("Template structure is invalid. Please check the format and try again.");
                return this.createResult(false, null);
            }

            // Step 2: Detect item type
            this.itemType = this.detectItemType();
            if (!this.itemType) {
                this.addError("Could not detect item type. Expected format: ===ITEM_TYPE===");
                return this.createResult(false, null);
            }

            ItemUtils.log(`Detected item type: ${this.itemType}`);

            // Step 3: Extract universal fields (always returns data, may have errors)
            const universalData = this.extractUniversalFields();

            // Step 4: Create ItemData instance
            const itemData = new ItemData(universalData.name);
            itemData.type = this.itemType;

            // Step 5: Populate universal fields
            this.populateUniversalFields(itemData, universalData);

            // Step 6: Validate (collect errors but don't stop)
            this.validateUniversal(itemData);

            ItemUtils.log("Universal parsing completed successfully");
            // Success only if no errors were collected
            const success = this.errors.length === 0;
            return this.createResult(success, itemData);

        } catch (error) {
            ItemUtils.error("Error during parsing", error);
            this.addError(`Parse error: ${error.message}`);
            return this.createResult(false, null);
        }
    }

    /**
     * Reset parser state
     */
    reset() {
        this.errors = [];
        this.warnings = [];
        this.text = "";
        this.itemType = null;
        this.lines = [];
        this.currentLineIndex = 0;
    }

    /**
     * Detect item type from opening marker
     * @returns {string|null} Item type (weapon, loot, tool, etc.) or null
     */
    detectItemType() {
        // Look for opening marker: ===ITEM_TYPE===
        const openingMarker = this.findLine(/^===([A-Z]+)===$/);

        if (!openingMarker) {
            return null;
        }

        const match = openingMarker.line.match(/^===([A-Z]+)===$/);
        if (!match) {
            return null;
        }

        const typeText = match[1];

        // Map to Foundry item types
        const typeMap = {
            'WEAPON': 'weapon',
            'EQUIPMENT': 'equipment',
            'CONSUMABLE': 'consumable',
            'TOOL': 'tool',
            'LOOT': 'loot',
            'CONTAINER': 'container',
            'BACKPACK': 'backpack'
        };

        return typeMap[typeText] || null;
    }

    /**
     * Validate template structure before attempting to parse
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateTemplateStructure() {
        const structureErrors = [];

        // Check for item type marker
        if (!this.findLine(/^===([A-Z]+)===$/)) {
            structureErrors.push("Missing item type marker. Expected format: ===WEAPON===, ===LOOT===, etc.");
        }

        // Check for description section structure
        const descSection = this.findLine(/^---DESCRIPTION---$/);
        if (!descSection) {
            structureErrors.push("Missing '---DESCRIPTION---' section marker.");
        } else {
            // If section exists, check for field label and end marker
            if (!this.findLineAfter(descSection.index, /^Description:$/)) {
                structureErrors.push("Missing 'Description:' field label in DESCRIPTION section.");
            }
            if (!this.findLineAfter(descSection.index, /^===END DESCRIPTION===$/)) {
                structureErrors.push("Missing '===END DESCRIPTION===' end marker.");
            }
        }

        // Check for matching end markers for optional sections
        const unidentifiedSection = this.findLine(/^---UNIDENTIFIED DESCRIPTION---$/);
        if (unidentifiedSection && !this.findLineAfter(unidentifiedSection.index, /^===END UNIDENTIFIED DESCRIPTION===$/)) {
            structureErrors.push("UNIDENTIFIED DESCRIPTION section is missing '===END UNIDENTIFIED DESCRIPTION===' end marker.");
        }

        const chatSection = this.findLine(/^---CHAT FLAVOR---$/);
        if (chatSection && !this.findLineAfter(chatSection.index, /^===END CHAT FLAVOR===$/)) {
            structureErrors.push("CHAT FLAVOR section is missing '===END CHAT FLAVOR===' end marker.");
        }

        return {
            valid: structureErrors.length === 0,
            errors: structureErrors
        };
    }

    /**
     * Extract all universal fields from the template
     * @returns {Object|null} Object containing all universal field values
     */
    extractUniversalFields() {
        const data = {
            name: null,
            rarity: "common",
            quantity: 1,
            identified: true,
            equipped: false,
            priceValue: 0,
            priceDenomination: "gp",
            weightValue: 0,
            weightUnits: "lb",
            description: "",
            unidentifiedName: "",
            unidentifiedDescription: "",
            chatDescription: ""
        };

        try {
            // Extract Name (required)
            data.name = this.extractName();
            if (!data.name) {
                this.addError("Name field is required but was not found or is empty");
                data.name = "Unnamed Item"; // Fallback to allow continued parsing
            }

            // Extract Rarity
            data.rarity = this.extractRarity();

            // Extract Inventory section
            const inventory = this.extractInventorySection();
            if (inventory) {
                data.quantity = inventory.quantity;
                data.identified = inventory.identified;
                data.equipped = inventory.equipped;
            }

            // Extract Cost and Weight section
            const costWeight = this.extractCostAndWeightSection();
            if (costWeight) {
                data.priceValue = costWeight.priceValue;
                data.priceDenomination = costWeight.priceDenomination;
                data.weightValue = costWeight.weightValue;
                data.weightUnits = costWeight.weightUnits;
            }

            // Extract Description
            data.description = this.extractDescription();

            // Extract Unidentified Section (Name + Description)
            const unidentData = this.extractUnidentifiedData();
            data.unidentifiedName = unidentData.name;
            data.unidentifiedDescription = unidentData.description;

            // Extract Chat Flavor
            data.chatDescription = this.extractChatDescription();

            return data;

        } catch (error) {
            this.addError(`Error extracting universal fields: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract Name field
     * @returns {string|null}
     */
    extractName() {
        const nameLine = this.findLine(/^Name:\s*(.+)$/);

        if (!nameLine) {
            return null;
        }

        const match = nameLine.line.match(/^Name:\s*(.+)$/);
        const name = match ? match[1].trim() : null;

        if (!name || name.length === 0) {
            return null;
        }

        if (name.length > 100) {
            this.addWarning(`Name is very long (${name.length} characters). Max recommended: 100`);
        }

        return name;
    }

    /**
     * Extract Rarity field
     * @returns {string}
     */
    extractRarity() {
        const rarityLine = this.findLine(/^Rarity:\s*(.+)$/);

        if (!rarityLine) {
            return "common"; // Default
        }

        const match = rarityLine.line.match(/^Rarity:\s*(.+)$/);
        const rarityText = match ? match[1].trim().toLowerCase() : "";

        // Handle blank or empty
        if (!rarityText || rarityText === "blank") {
            return "common";
        }

        // Map rarity values
        const rarityMap = {
            'common': 'common',
            'uncommon': 'uncommon',
            'rare': 'rare',
            'veryrare': 'veryRare',
            'very rare': 'veryRare',
            'legendary': 'legendary',
            'artifact': 'artifact'
        };

        const normalized = rarityText.replace(/\s+/g, '').toLowerCase();
        const rarity = rarityMap[normalized];

        if (!rarity) {
            this.addWarning(`Unknown rarity "${rarityText}", defaulting to common`);
            return "common";
        }

        return rarity;
    }

    /**
     * Extract Inventory section (Quantity, Identified, Equipped)
     * @returns {Object|null}
     */
    extractInventorySection() {
        // Find the ---INVENTORY--- marker
        const sectionStart = this.findLine(/^---INVENTORY---$/);
        if (!sectionStart) {
            this.addWarning("INVENTORY section not found, using defaults");
            return null;
        }

        const data = {
            quantity: 1,
            identified: true,
            equipped: false
        };

        // Extract Quantity
        const quantityLine = this.findLineAfter(sectionStart.index, /^Quantity:\s*(.+)$/);
        if (quantityLine) {
            const match = quantityLine.line.match(/^Quantity:\s*(.+)$/);
            const value = parseInt(match[1].trim(), 10);
            if (!isNaN(value) && value >= 0) {
                data.quantity = value;
            } else {
                this.addWarning(`Invalid quantity value "${match[1]}", using default: 1`);
            }
        }

        // Extract Identified
        const identifiedLine = this.findLineAfter(sectionStart.index, /^Identified:\s*(.+)$/);
        if (identifiedLine) {
            const match = identifiedLine.line.match(/^Identified:\s*(.+)$/);
            const value = match[1].trim().toLowerCase();
            data.identified = value === "true";
        }

        // Extract Equipped
        const equippedLine = this.findLineAfter(sectionStart.index, /^Equipped:\s*(.+)$/);
        if (equippedLine) {
            const match = equippedLine.line.match(/^Equipped:\s*(.+)$/);
            const value = match[1].trim().toLowerCase();
            data.equipped = value === "true";
        }

        return data;
    }

    /**
     * Extract Cost and Weight section
     * @returns {Object|null}
     */
    extractCostAndWeightSection() {
        // Find the ---COST AND WEIGHT--- marker
        const sectionStart = this.findLine(/^---COST AND WEIGHT---$/);
        if (!sectionStart) {
            this.addWarning("COST AND WEIGHT section not found, using defaults");
            return null;
        }

        const data = {
            priceValue: 0,
            priceDenomination: "gp",
            weightValue: 0,
            weightUnits: "lb"
        };

        // Extract Price Value
        const priceValueLine = this.findLineAfter(sectionStart.index, /^Price Value:\s*(.+)$/);
        if (priceValueLine) {
            const match = priceValueLine.line.match(/^Price Value:\s*(.+)$/);
            const value = parseFloat(match[1].trim());
            if (!isNaN(value) && value >= 0) {
                data.priceValue = value;
            } else {
                this.addWarning(`Invalid price value "${match[1]}", using default: 0`);
            }
        }

        // Extract Price Denomination
        const priceDenomLine = this.findLineAfter(sectionStart.index, /^Price Denomination:\s*(.+)$/);
        if (priceDenomLine) {
            const match = priceDenomLine.line.match(/^Price Denomination:\s*(.+)$/);
            const denom = match[1].trim().toLowerCase();
            const validDenoms = ['pp', 'gp', 'ep', 'sp', 'cp'];
            if (validDenoms.includes(denom)) {
                data.priceDenomination = denom;
            } else {
                this.addWarning(`Invalid price denomination "${denom}", using default: gp`);
            }
        }

        // Extract Weight Value
        const weightValueLine = this.findLineAfter(sectionStart.index, /^Weight Value:\s*(.+)$/);
        if (weightValueLine) {
            const match = weightValueLine.line.match(/^Weight Value:\s*(.+)$/);
            const value = parseFloat(match[1].trim());
            if (!isNaN(value) && value >= 0) {
                data.weightValue = value;
            } else {
                this.addWarning(`Invalid weight value "${match[1]}", using default: 0`);
            }
        }

        // Extract Weight Units
        const weightUnitsLine = this.findLineAfter(sectionStart.index, /^Weight Units:\s*(.+)$/);
        if (weightUnitsLine) {
            const match = weightUnitsLine.line.match(/^Weight Units:\s*(.+)$/);
            const units = match[1].trim().toLowerCase();
            const validUnits = ['lb', 'tn', 'kg', 't'];
            if (validUnits.includes(units)) {
                data.weightUnits = units;
            } else {
                this.addWarning(`Invalid weight units "${units}", using default: lb`);
            }
        }

        return data;
    }

    /**
     * Generic property section extractor for boolean properties
     * Used by specialized parsers to extract their PROPERTIES sections
     * @param {string} sectionName - Name of the section (e.g., "PROPERTIES")
     * @param {Object} propertyDefinitions - Object mapping property names to their default values
     *   Example: { magical: false, adamantine: false }
     * @returns {Object} Object with extracted property values
     */
    extractPropertiesSection(sectionName, propertyDefinitions) {
        const properties = { ...propertyDefinitions }; // Start with defaults

        // Find the section marker (e.g., ---PROPERTIES---)
        const sectionMarker = new RegExp(`^---${sectionName}---$`);
        const sectionStart = this.findLine(sectionMarker);

        if (!sectionStart) {
            ItemUtils.log(`BaseStrictParser: ${sectionName} section not found, using defaults`);
            return properties;
        }

        ItemUtils.log(`BaseStrictParser: Found ${sectionName} section at line ${sectionStart.index + 1}`);

        // Find the end of this section (next --- marker or end of file)
        let sectionEnd = this.lines.length;
        for (let i = sectionStart.index + 1; i < this.lines.length; i++) {
            if (this.lines[i].match(/^---[A-Z\s]+---$/)) {
                sectionEnd = i;
                break;
            }
        }

        // Extract each property
        for (const [propertyName, defaultValue] of Object.entries(propertyDefinitions)) {
            const propertyPattern = new RegExp(`^${propertyName}:\\s*(true|false)$`, 'i');

            // Search only within this section
            for (let i = sectionStart.index + 1; i < sectionEnd; i++) {
                const match = this.lines[i].match(propertyPattern);
                if (match) {
                    const value = match[1].toLowerCase() === 'true';
                    properties[propertyName] = value;
                    ItemUtils.log(`BaseStrictParser: ${propertyName} set to ${value}`);
                    break;
                }
            }
        }

        return properties;
    }

    /**
     * Extract Description field (multiline)
     * @returns {string}
     */
    extractDescription() {
        return this.extractMultilineField(
            /^---DESCRIPTION---$/,
            /^Description:$/,
            /^===END DESCRIPTION===$/
        );
    }

    /**
     * Extract Unidentified Name and Description from the specific block.
     * @returns {Object} { name: string, description: string }
     */
    extractUnidentifiedData() {
        const data = {
            name: "",
            description: ""
        };

        const startLine = this.findLine(/^---UNIDENTIFIED DESCRIPTION---$/);
        const endLine = this.findLine(/^===END UNIDENTIFIED DESCRIPTION===$/);

        if (!startLine || !endLine) return data;

        let capturingDescription = false;
        const descLines = [];

        for (let i = startLine.index + 1; i < endLine.index; i++) {
            const line = this.lines[i].trim();

            // 1. Check for Name
            const nameMatch = line.match(/^Unidentified Name:\s*(.+)$/i);
            if (nameMatch) {
                const nameText = nameMatch[1].trim();
                // If it's not "blank", capture it
                if (nameText.toLowerCase() !== "blank" && nameText !== "") {
                    data.name = nameText;
                    ItemUtils.log(`BaseStrictParser: Found Unidentified Name "${data.name}"`);
                }
                capturingDescription = false; // Reset to ensure we don't bleed into desc
                continue;
            }

            // 2. Check for Description Header
            if (line.match(/^Unidentified Description:$/i)) {
                capturingDescription = true;
                continue;
            }

            // 3. Capture Description Content
            if (capturingDescription) {
                // Skip "blank" content
                if (line.trim().toLowerCase() === "blank") continue;
                descLines.push(this.lines[i]); // Keep original formatting
            }
        }

        // Join description lines
        data.description = descLines.join("\n").trim();
        
        return data;
    }

    /**
     * Extract Chat Description field (multiline)
     * @returns {string}
     */
    extractChatDescription() {
        return this.extractMultilineField(
            /^---CHAT FLAVOR---$/,
            /^Chat Description:$/,
            /^===END CHAT FLAVOR===$/
        );
    }

    /**
     * Generic multiline field extractor
     * @param {RegExp} sectionMarker - Regex for section start marker
     * @param {RegExp} fieldMarker - Regex for field label
     * @param {RegExp} endMarker - Regex for end marker
     * @returns {string}
     */
    extractMultilineField(sectionMarker, fieldMarker, endMarker) {
        // Find section start
        const sectionStart = this.findLine(sectionMarker);
        if (!sectionStart) {
            return "";
        }

        // Find field label
        const fieldStart = this.findLineAfter(sectionStart.index, fieldMarker);
        if (!fieldStart) {
            return "";
        }

        // Find end marker
        const fieldEnd = this.findLineAfter(fieldStart.index, endMarker);
        if (!fieldEnd) {
            this.addWarning(`End marker not found for multiline field at line ${fieldStart.index + 1}`);
            return "";
        }

        // Extract lines between field label and end marker
        const contentLines = [];
        for (let i = fieldStart.index + 1; i < fieldEnd.index; i++) {
            const line = this.lines[i];
            // Skip "blank" as content
            if (line.trim().toLowerCase() === "blank") {
                continue;
            }
            contentLines.push(line);
        }

        // Join with newlines and trim
        const content = contentLines.join('\n').trim();

        return content;
    }

    /**
     * Populate ItemData instance with universal fields
     * @param {ItemData} itemData - ItemData instance to populate
     * @param {Object} universalData - Extracted universal data
     */
    populateUniversalFields(itemData, universalData) {
        // Basic fields
        itemData.rarity = universalData.rarity;
        itemData.quantity = universalData.quantity;
        itemData.identified = universalData.identified;

        // Cost (store as display value and denomination)
        itemData.costDisplay = universalData.priceValue;
        itemData.costDenomination = universalData.priceDenomination;

        // Weight
        itemData.weight = universalData.weightValue;
        itemData.weightUnits = universalData.weightUnits;

        // Descriptions
        itemData.description = universalData.description;
        itemData.unidentifiedName = universalData.unidentifiedName;
        itemData.unidentifiedDescription = universalData.unidentifiedDescription;
        itemData.chatDescription = universalData.chatDescription;

        // Equipped status (not used by all items, but we store it)
        // Will be handled by specific parsers if needed

        ItemUtils.log("Universal fields populated", {
            name: itemData.name,
            type: itemData.type,
            rarity: itemData.rarity,
            quantity: itemData.quantity,
            cost: `${universalData.priceValue} ${universalData.priceDenomination}`,
            weight: `${universalData.weightValue} ${universalData.weightUnits}`
        });
    }

    /**
     * Validate universal fields
     * @param {ItemData} itemData - ItemData instance to validate
     * @returns {boolean}
     */
    validateUniversal(itemData) {
        let valid = true;

        // Name is required
        if (!itemData.name || itemData.name.trim().length === 0) {
            this.addError("Item name is required");
            valid = false;
        }

        // Name length
        if (itemData.name && itemData.name.length > 100) {
            this.addError("Item name exceeds maximum length of 100 characters");
            valid = false;
        }

        // Quantity must be non-negative
        if (itemData.quantity < 0) {
            this.addError("Quantity cannot be negative");
            valid = false;
        }

        // Weight must be non-negative
        if (itemData.weight < 0) {
            this.addError("Weight cannot be negative");
            valid = false;
        }

        // Cost must be non-negative
        if (itemData.costDisplay < 0) {
            this.addError("Price cannot be negative");
            valid = false;
        }

        return valid;
    }

    /**
     * Find a line matching a pattern
     * @param {RegExp} pattern - Pattern to match
     * @param {number} startIndex - Optional start index
     * @returns {Object|null} { line: string, index: number } or null
     */
    findLine(pattern, startIndex = 0) {
        for (let i = startIndex; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (pattern.test(line)) {
                return { line, index: i };
            }
        }
        return null;
    }

    /**
     * Find a line matching a pattern after a specific index
     * @param {number} afterIndex - Search after this index
     * @param {RegExp} pattern - Pattern to match
     * @returns {Object|null} { line: string, index: number } or null
     */
    findLineAfter(afterIndex, pattern) {
        return this.findLine(pattern, afterIndex + 1);
    }

    /**
     * Get remaining text starting from current line index
     * Used by specific parsers to process their type-specific sections
     * @returns {string}
     */
    getRemainingText() {
        return this.lines.slice(this.currentLineIndex).join('\n');
    }

    /**
     * Set current line index
     * Used by specific parsers to mark where they've parsed up to
     * @param {number} index
     */
    setCurrentLineIndex(index) {
        this.currentLineIndex = index;
    }

    /**
     * Add an error message
     * @param {string} message
     */
    addError(message) {
        this.errors.push(message);
        ItemUtils.error(`Parse Error: ${message}`);
    }

    /**
     * Add a warning message
     * @param {string} message
     */
    addWarning(message) {
        this.warnings.push(message);
        ItemUtils.warn(`Parse Warning: ${message}`);
    }

    /**
     * Create result object
     * @param {boolean} success
     * @param {ItemData|null} itemData
     * @returns {Object}
     */
    createResult(success, itemData) {
        return {
            success,
            item: itemData, // <-- Corrected line
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }

    /**
     * Get all lines in the template
     * Used by specific parsers to access the full text
     * @returns {string[]}
     */
    getLines() {
        return this.lines;
    }

    /**
     * Get detected item type
     * @returns {string|null}
     */
    getItemType() {
        return this.itemType;
    }
}

/**
 * Parse utility function - Quick access to parse text
 * @param {string} text - Text to parse
 * @returns {Object} Parse result
 */
export function parseStrictFormat(text) {
    const parser = new BaseStrictParser();
    return parser.parse(text);
}

/**
 * Export for specific parsers to extend
 */
export default BaseStrictParser;