/**
 * 5e Item Importer - Test Suite
 * Demonstrates and tests utility functions
 * 
 * To run these tests, enable Debug Mode in module settings
 * and call ItemImporterTests.runAll() from the console
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_TITLE } from "./itemConfig.js";

export class ItemImporterTests {
    
    /**
     * Run all tests
     */
    static async runAll() {
        console.group(`${MODULE_TITLE} | Running Test Suite`);
        
        this.testStringFunctions();
        this.testParsingFunctions();
        this.testArrayFunctions();
        await this.testCompendiumFunctions();
        
        console.groupEnd();
        console.log(`${MODULE_TITLE} | All tests completed!`);
    }

    /**
     * Test string manipulation functions
     */
    static testStringFunctions() {
        console.group("String Functions");
        
        // Test camelToTitleCase
        console.assert(
            ItemUtils.camelToTitleCase("magicSword") === "Magic Sword",
            "camelToTitleCase failed"
        );
        
        // Test capitalizeAll
        console.assert(
            ItemUtils.capitalizeAll("longsword of flames") === "Longsword Of Flames",
            "capitalizeAll failed"
        );
        
        // Test capitalizeFirst
        console.assert(
            ItemUtils.capitalizeFirst("longsword of flames") === "Longsword of flames",
            "capitalizeFirst failed"
        );
        
        // Test normalize
        console.assert(
            ItemUtils.normalize("  SWORD  OF  POWER  ") === "sword of power",
            "normalize failed"
        );
        
        // Test startsWithCapital
        console.assert(
            ItemUtils.startsWithCapital("Longsword") === true,
            "startsWithCapital failed"
        );
        
        // Test format
        console.assert(
            ItemUtils.format("{0} has {1} charges", "Wand", 3) === "Wand has 3 charges",
            "format failed"
        );
        
        // Test trimEnd
        console.assert(
            ItemUtils.trimEnd("Hello World!", "!") === "Hello World",
            "trimEnd failed"
        );
        
        // Test normalizeUnicode
        const unicodeText = "Test–with—various−dashes";
        const normalized = ItemUtils.normalizeUnicode(unicodeText);
        console.assert(
            normalized.match(/^[Test\-with]+$/),
            "normalizeUnicode failed"
        );
        
        console.log("✅ String functions passed");
        console.groupEnd();
    }

    /**
     * Test parsing functions
     */
    static testParsingFunctions() {
        console.group("Parsing Functions");
        
        // Test parseFraction
        const fraction = ItemUtils.parseFraction("1/2");
        console.assert(fraction === 0.5, "parseFraction failed");
        
        // Test parseCurrency
        const currency = ItemUtils.parseCurrency("50 gp");
        console.assert(
            currency && currency.value === 5000 && currency.unit === "gp",
            "parseCurrency failed"
        );
        console.log("Currency parse result:", currency);
        
        // Test parseWeight
        const weight = ItemUtils.parseWeight("15 lb.");
        console.assert(
            weight && weight.value === 15 && weight.unit === "lb",
            "parseWeight failed"
        );
        console.log("Weight parse result:", weight);
        
        // Test parseDice
        const dice = ItemUtils.parseDice("2d6+3");
        console.assert(
            dice && dice.count === 2 && dice.faces === 6 && dice.bonus === 3,
            "parseDice failed"
        );
        console.log("Dice parse result:", dice);
        
        // Test more complex currency
        const complexCurrency = ItemUtils.parseCurrency("1,500 gp");
        console.assert(
            complexCurrency && complexCurrency.amount === 1500,
            "Complex currency parse failed"
        );
        
        console.log("✅ Parsing functions passed");
        console.groupEnd();
    }

    /**
     * Test array functions
     */
    static testArrayFunctions() {
        console.group("Array Functions");
        
        // Test last
        console.assert(
            ItemUtils.last([1, 2, 3]) === 3,
            "last failed"
        );
        
        // Test unique
        const uniqueResult = ItemUtils.unique([1, 2, 2, 3, 3, 3]);
        console.assert(
            uniqueResult.length === 3 && uniqueResult.includes(1) && uniqueResult.includes(2) && uniqueResult.includes(3),
            "unique failed"
        );
        
        // Test intersect
        const intersection = ItemUtils.intersect([1, 2, 3], [2, 3, 4]);
        console.assert(
            intersection.length === 2 && intersection.includes(2) && intersection.includes(3),
            "intersect failed"
        );
        
        // Test except
        const exception = ItemUtils.except([1, 2, 3], [2, 3]);
        console.assert(
            exception.length === 1 && exception.includes(1),
            "except failed"
        );
        
        // Test chunk
        const chunks = ItemUtils.chunk([1, 2, 3, 4, 5], 2);
        console.assert(
            chunks.length === 3 && chunks[0].length === 2 && chunks[2].length === 1,
            "chunk failed"
        );
        
        console.log("✅ Array functions passed");
        console.groupEnd();
    }

    /**
     * Test compendium functions
     */
    static async testCompendiumFunctions() {
        console.group("Compendium Functions");
        
        // Test if compendiums are accessible
        const packs = game.packs.filter(p => p.documentName === "Item");
        console.log(`Found ${packs.size} item compendiums`);
        
        // Try to find a common item (Longsword should exist in SRD)
        if (packs.size > 0) {
            console.log("Testing item search for 'Longsword'...");
            const longsword = await ItemUtils.getItemFromPacksAsync("Longsword", "weapon");
            
            if (longsword) {
                console.log("✅ Found Longsword:", longsword.name);
                console.log("  - Type:", longsword.type);
                console.log("  - Icon:", longsword.img);
            } else {
                console.log("⚠️  Could not find Longsword (may not be in active compendiums)");
            }
        } else {
            console.log("⚠️  No item compendiums found");
        }
        
        console.groupEnd();
    }

    /**
     * Test validation
     */
    static testValidation() {
        console.group("Validation");
        
        // Test valid item
        const validItem = {
            name: "Test Item",
            system: {
                price: { value: 100 },
                weight: 5,
                quantity: 1
            }
        };
        
        const validResult = ItemUtils.validateItemData(validItem);
        console.assert(validResult.valid === true, "Valid item validation failed");
        
        // Test invalid item (no name)
        const invalidItem = {
            name: "",
            system: {}
        };
        
        const invalidResult = ItemUtils.validateItemData(invalidItem);
        console.assert(
            invalidResult.valid === false && invalidResult.errors.length > 0,
            "Invalid item validation failed"
        );
        console.log("Validation errors:", invalidResult.errors);
        
        console.log("✅ Validation tests passed");
        console.groupEnd();
    }

    /**
     * Test performance monitoring
     */
    static testPerformance() {
        console.group("Performance Monitoring");
        
        // Test timer
        const timer = ItemUtils.timer("Test Operation");
        
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
            sum += i;
        }
        
        const elapsed = timer.stop();
        console.assert(elapsed >= 0, "Timer failed");
        
        console.log("✅ Performance monitoring works");
        console.groupEnd();
    }

    /**
     * Benchmark example
     */
    static async benchmarkExample() {
        console.group("Benchmark Example");
        
        const { result, elapsed } = await ItemUtils.benchmark(async () => {
            // Simulate async work
            return new Promise(resolve => {
                setTimeout(() => resolve("Done!"), 100);
            });
        }, "Async Operation");
        
        console.log("Result:", result);
        console.log(`Time: ${elapsed.toFixed(2)}ms`);
        
        console.groupEnd();
    }
}

// Make tests available globally for console access
if (typeof window !== "undefined") {
    window.ItemImporterTests = ItemImporterTests;
}

/**
 * Example usage scenarios
 */
export const ExampleUsage = {
    
    /**
     * Example: Parse item text
     */
    parseExample() {
        const itemText = `
Longsword +1
Weapon (longsword), uncommon
Cost: 500 gp
Weight: 3 lb.

You have a +1 bonus to attack and damage rolls made with this magic weapon.
        `.trim();
        
        console.log("Item Text:", itemText);
        
        // This is what the parser will do (to be implemented)
        const lines = itemText.split('\n');
        console.log("Lines:", lines);
        
        // Extract name
        const name = lines[0];
        console.log("Name:", name);
        
        // Extract type line
        const typeLine = lines[1];
        console.log("Type Line:", typeLine);
        
        // Extract cost
        const costMatch = ItemUtils.parseCurrency(itemText);
        console.log("Cost:", costMatch);
        
        // Extract weight
        const weightMatch = ItemUtils.parseWeight(itemText);
        console.log("Weight:", weightMatch);
    },
    
    /**
     * Example: Validate item data
     */
    validateExample() {
        const itemData = {
            name: "Potion of Healing",
            type: "consumable",
            system: {
                price: { value: 50 },
                weight: 0.5,
                quantity: 1
            }
        };
        
        const validation = ItemUtils.validateItemData(itemData);
        console.log("Validation:", validation);
        
        if (validation.valid) {
            console.log("✅ Item is valid!");
        } else {
            console.log("❌ Item has errors:", validation.errors);
        }
    },
    
    /**
     * Example: Search compendiums
     */
    async searchExample() {
        console.log("Searching for 'Potion of Healing'...");
        const item = await ItemUtils.getItemFromPacksAsync("Potion of Healing");
        
        if (item) {
            console.log("Found item:", item);
            console.log("  Name:", item.name);
            console.log("  Type:", item.type);
            console.log("  Rarity:", item.system?.rarity);
        } else {
            console.log("Item not found");
        }
    }
};

// Make examples available globally
if (typeof window !== "undefined") {
    window.ItemImporterExamples = ExampleUsage;
}