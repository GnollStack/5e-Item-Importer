// scripts/strictItemParsers/containerParser.js

import { BaseStrictParser } from './baseParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Strict Parser for Container items.
 * Extends the BaseStrictParser and adds logic for container-specific fields.
 * 
 * Template Specification: Strict_Container_Template.md v1.0
 * - Currency Contents (required): All 5 types must be specified
 * - Capacity (optional): Item count, weight capacity, and/or volume capacity
 * - Weightless Contents (optional): Contents don't add to weight
 * - Magical (optional): Determines if attunement section is parsed
 */
export class ContainerStrictParser extends BaseStrictParser {
    constructor() {
        super();
    }

    /**
     * Main parse method for Container items.
     * @param {string} text - The full text to parse.
     * @returns {Object} - The standard parser result object { success, item, errors, warnings }.
     */
    parse(text) {
        // 1. Parse all universal fields using the parent parser.
        const baseResult = super.parse(text);

        // If the base parsing failed, we can't continue. Return the errors.
        if (!baseResult.success) {
            ItemUtils.warn('ContainerStrictParser: Base parsing had errors, but continuing with container-specific parsing');
            this.errors.push(...baseResult.errors);
            this.warnings.push(...baseResult.warnings);
        }

        const { item } = baseResult;
        ItemUtils.log('ContainerStrictParser: Base parsing successful, starting container-specific parsing...');

        try {
            // 2. Extract container-specific fields from the text.
            const containerData = this.extractContainerFields();

            // 3. Populate the ItemData object with the new fields.
            this.populateContainerFields(item, containerData);

            // 4. Perform any container-specific validation.
            if (!this.validateContainer(item, containerData)) {
                ItemUtils.warn('ContainerStrictParser: Validation found issues, but continuing with warnings');
            }

            ItemUtils.log('ContainerStrictParser: Container parsing completed successfully');

        } catch (error) {
            ItemUtils.error('ContainerStrictParser: Unexpected error during container parsing', error);
            this.addError(`Unexpected error during container parsing: ${error.message}`);
        }

        // 5. Return the final result.
        const success = this.errors.length === 0;
        return this.createResult(success, item);
    }

    /**
     * Extracts fields specific to Container items from the class's `this.lines`.
     * @returns {Object} An object containing the extracted container data.
     */
    extractContainerFields() {
        const data = {
            magical: false,
            weightlessContents: false,
            attunement: 'none',
            attunementBy: '',

            // Capacity fields (all optional)
            itemCount: null,
            weightCapacityValue: null,
            weightCapacityUnits: 'lb',
            volumeCapacityValue: null,
            volumeCapacityUnits: 'ft',  // Default to cubic feet (system value)

            // Currency fields (all required)
            platinum: 0,
            gold: 0,
            electrum: 0,
            silver: 0,
            copper: 0
        };

        // --- Extract Properties Section ---
        const properties = this.extractPropertiesSection('PROPERTIES', {
            Magical: false,
            'Weightless Contents': false
        });

        data.magical = properties.Magical;
        data.weightlessContents = properties['Weightless Contents'];

        // --- Extract Attunement Section (only if magical) ---
        if (data.magical) {
            const attunementSection = this.findLine(/^---ATTUNEMENT---$/);

            if (attunementSection) {
                ItemUtils.log('ContainerStrictParser: Found ATTUNEMENT section');

                const attunementLine = this.findLineAfter(attunementSection.index, /^Attunement:\s*(.+)$/);
                if (attunementLine) {
                    const match = attunementLine.line.match(/^Attunement:\s*(.+)$/);
                    const attunementText = match[1].trim().toLowerCase();
                    const validAttunements = ['none', 'required', 'optional'];

                    if (validAttunements.includes(attunementText)) {
                        data.attunement = attunementText;
                        ItemUtils.log(`ContainerStrictParser: Attunement set to "${attunementText}"`);
                    } else {
                        this.addWarning(`Invalid Attunement value "${attunementText}". Defaulting to "none".`);
                    }
                }

                const attunementByLine = this.findLineAfter(attunementSection.index, /^Attunement By:\s*(.+)$/);
                if (attunementByLine) {
                    const match = attunementByLine.line.match(/^Attunement By:\s*(.+)$/);
                    const attunementByText = match[1].trim();
                    if (attunementByText.toLowerCase() !== 'blank') {
                        data.attunementBy = attunementByText;
                        ItemUtils.log(`ContainerStrictParser: Attunement By set to "${attunementByText}"`);
                    }
                }
            }
        } else {
            // If not magical, ensure attunement is none
            data.attunement = 'none';
        }

        // --- Extract Capacity Section ---
        const capacitySection = this.findLine(/^---CAPACITY---$/);

        if (capacitySection) {
            ItemUtils.log('ContainerStrictParser: Found CAPACITY section');

            // Item Count
            const itemCountLine = this.findLineAfter(capacitySection.index, /^Item Count:\s*(.+)$/);
            if (itemCountLine) {
                const match = itemCountLine.line.match(/^Item Count:\s*(.+)$/);
                const countText = match[1].trim().toLowerCase();

                if (countText !== 'blank' && countText !== '') {
                    const countValue = parseInt(countText);
                    if (!isNaN(countValue) && countValue > 0) {
                        data.itemCount = countValue;
                        ItemUtils.log(`ContainerStrictParser: Item Count set to ${countValue}`);
                    }
                }
            }

            // Weight Capacity Value
            const weightCapValueLine = this.findLineAfter(capacitySection.index, /^Weight Capacity Value:\s*(.+)$/);
            if (weightCapValueLine) {
                const match = weightCapValueLine.line.match(/^Weight Capacity Value:\s*(.+)$/);
                const weightText = match[1].trim().toLowerCase();

                if (weightText !== 'blank' && weightText !== '') {
                    const weightValue = parseFloat(weightText);
                    if (!isNaN(weightValue) && weightValue > 0) {
                        data.weightCapacityValue = weightValue;
                        ItemUtils.log(`ContainerStrictParser: Weight Capacity Value set to ${weightValue}`);
                    }
                }
            }

            // Weight Capacity Units
            const weightCapUnitsLine = this.findLineAfter(capacitySection.index, /^Weight Capacity Units:\s*(.+)$/);
            if (weightCapUnitsLine) {
                const match = weightCapUnitsLine.line.match(/^Weight Capacity Units:\s*(.+)$/);
                const unitsText = match[1].trim().toLowerCase();

                if (unitsText !== 'blank' && unitsText !== '') {
                    const validUnits = ['lb', 'tn', 'kg', 't'];
                    if (validUnits.includes(unitsText)) {
                        data.weightCapacityUnits = unitsText;
                        ItemUtils.log(`ContainerStrictParser: Weight Capacity Units set to "${unitsText}"`);
                    }
                }
            }

            // Volume Capacity Value
            const volumeCapValueLine = this.findLineAfter(capacitySection.index, /^Volume Capacity Value:\s*(.+)$/);
            if (volumeCapValueLine) {
                const match = volumeCapValueLine.line.match(/^Volume Capacity Value:\s*(.+)$/);
                const volumeText = match[1].trim().toLowerCase();

                if (volumeText !== 'blank' && volumeText !== '') {
                    const volumeValue = parseFloat(volumeText);
                    if (!isNaN(volumeValue) && volumeValue > 0) {
                        data.volumeCapacityValue = volumeValue;
                        ItemUtils.log(`ContainerStrictParser: Volume Capacity Value set to ${volumeValue}`);
                    }
                }
            }

            // Volume Capacity Units
            const volumeCapUnitsLine = this.findLineAfter(capacitySection.index, /^Volume Capacity Units:\s*(.+)$/);
            if (volumeCapUnitsLine) {
                const match = volumeCapUnitsLine.line.match(/^Volume Capacity Units:\s*(.+)$/);
                const unitsText = match[1].trim().toLowerCase();

                if (unitsText !== 'blank' && unitsText !== '') {
                    const validUnits = ['cubicfoot', 'liter'];
                    if (validUnits.includes(unitsText)) {
                        // Map template values to system values
                        data.volumeCapacityUnits = unitsText === 'cubicfoot' ? 'cubicFoot' : 'liter';
                        ItemUtils.log(`ContainerStrictParser: Volume Capacity Units set to "${data.volumeCapacityUnits}"`);
                    } else {
                        this.addWarning(`Invalid Volume Capacity Units "${unitsText}". Expected "cubicFoot" or "liter".`);
                    }
                }
            }
        }

        // --- Extract Currency Contents Section (REQUIRED) ---
        const currencySection = this.findLine(/^---CURRENCY CONTENTS---$/);

        if (!currencySection) {
            this.addError('CURRENCY CONTENTS section is required but was not found');
        } else {
            ItemUtils.log('ContainerStrictParser: Found CURRENCY CONTENTS section');

            const currencyTypes = [
                { name: 'Platinum', field: 'platinum' },
                { name: 'Gold', field: 'gold' },
                { name: 'Electrum', field: 'electrum' },
                { name: 'Silver', field: 'silver' },
                { name: 'Copper', field: 'copper' }
            ];

            for (const currency of currencyTypes) {
                const currencyLine = this.findLineAfter(currencySection.index, new RegExp(`^${currency.name}:\\s*(.+)$`));

                if (!currencyLine) {
                    this.addError(`${currency.name} currency field is required but was not found`);
                } else {
                    const match = currencyLine.line.match(new RegExp(`^${currency.name}:\\s*(.+)$`));
                    const valueText = match[1].trim();
                    const value = parseInt(valueText);

                    if (isNaN(value) || value < 0) {
                        this.addError(`Invalid ${currency.name} value "${valueText}". Must be a non-negative integer.`);
                    } else {
                        data[currency.field] = value;
                        ItemUtils.log(`ContainerStrictParser: ${currency.name} set to ${value}`);
                    }
                }
            }
        }

        return data;
    }

    /**
     * Populates the ItemData instance with parsed container-specific data.
     * @param {ItemData} item - The ItemData instance to populate.
     * @param {Object} containerData - The object from extractContainerFields.
     */
    populateContainerFields(item, containerData) {
        // Set magical property
        item.isMagical = containerData.magical;

        // Set weightless contents property
        item.weightlessContents = containerData.weightlessContents;

        // Set attunement
        if (containerData.magical) {
            item.attunement = (containerData.attunement === 'required' || containerData.attunement === 'optional');
            item.attunementRequirement = containerData.attunementBy;
        } else {
            item.attunement = false;
            item.attunementRequirement = null;
        }

        // Set capacity fields
        item.itemCapacity = containerData.itemCount;
        item.weightCapacity = containerData.weightCapacityValue;
        item.weightCapacityUnits = containerData.weightCapacityUnits;
        item.volumeCapacity = containerData.volumeCapacityValue;
        item.volumeCapacityUnits = containerData.volumeCapacityUnits;

        // Set currency contents
        // Note: These are stored in the container, not the item's price
        item.currency = {
            pp: containerData.platinum,
            gp: containerData.gold,
            ep: containerData.electrum,
            sp: containerData.silver,
            cp: containerData.copper
        };

        ItemUtils.log('ContainerStrictParser: Container-specific fields populated', {
            isMagical: item.isMagical,
            weightlessContents: item.weightlessContents,
            attunement: item.attunement,
            itemCapacity: item.itemCapacity,
            weightCapacity: item.weightCapacity,
            volumeCapacity: item.volumeCapacity,
            currency: item.currency
        });
    }

    /**
     * Validates the parsed container data.
     * @param {ItemData} item - The ItemData instance to validate.
     * @param {Object} containerData - The extracted container data for cross-validation.
     * @returns {boolean} - True if validation passes (no critical errors).
     */
    validateContainer(item, containerData) {
        let valid = true;

        // Validate currency fields are non-negative
        const currencyTypes = ['pp', 'gp', 'ep', 'sp', 'cp'];
        for (const type of currencyTypes) {
            if (item.currency[type] < 0) {
                this.addError(`Currency ${type} cannot be negative (got ${item.currency[type]})`);
                valid = false;
            }
        }

        // Validate capacity values are positive if set
        if (item.itemCapacity !== null && item.itemCapacity <= 0) {
            this.addWarning('Item Capacity should be positive if specified');
        }

        if (item.weightCapacity !== null && item.weightCapacity <= 0) {
            this.addWarning('Weight Capacity should be positive if specified');
        }

        if (item.volumeCapacity !== null && item.volumeCapacity <= 0) {
            this.addWarning('Volume Capacity should be positive if specified');
        }

        // Log validation result
        if (valid) {
            ItemUtils.log('ContainerStrictParser: Validation passed');
        } else {
            ItemUtils.warn('ContainerStrictParser: Validation failed with errors');
        }

        return valid;
    }
}