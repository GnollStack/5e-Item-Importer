/**
 * 5e Item Importer - Test Suite
 * Demonstrates and tests utility functions
 * 
 * To run these tests, enable Debug Mode in module settings
 * and call ItemImporterTests.runAll() from the console
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_TITLE } from "./itemConfig.js";
import { ItemData } from "./itemData.js";
import { parseItemText } from "./parserRouting.js";
import { ITEM_TEMPLATES } from "./ui/itemTemplates.js";
import { analyzeItemActivitiesText } from "./activityIntegrationDiagnostics.js";

const ACTIVITY_HANDOFF_FIXTURE = `WEAPON:
  ITEM:
    Name: "Cross Module Test Blade"
    Rarity: "uncommon"
    Weapon Type: "martialM"
    Base Weapon: "longsword"
  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false
  COST_AND_WEIGHT:
    Price Value: 25
    Price Denomination: "gp"
    Weight Value: 3
    Weight Units: "lb"
  PROPERTIES:
    Adamantine: false
    Ammunition: false
    Finesse: false
    Firearm: false
    Focus: false
    Heavy: false
    Light: false
    Loading: false
    Magical: true
    Reach: false
    Reload: false
    Returning: false
    Silvered: false
    Special: false
    Thrown: false
    Two-Handed: false
    Versatile: true
  ATTUNEMENT:
    Attunement: "none"
    Attunement By: "n/a"
    Magic Bonus: 1
  VERSATILE_DAMAGE:
    Versatile Formula: "1d10"
    Versatile Damage Type: "slashing"
  RANGE:
    Reach: 5
    Range Normal: "n/a"
    Range Long: "n/a"
    Range Units: "ft"
  DAMAGE:
    Damage Formula: "1d8"
    Damage Type: "slashing"
  MASTERY:
    Mastery: "sap"
  PROFICIENCY:
    Proficient: "Automatic"
  USAGE:
    Uses Spent: 0
    Uses Max: "n/a"
  RECOVERY: []
  DESCRIPTION:
    Description: |
      <p>A blade used to test Item Importer and Activity Importer handoff.</p>
  Activities:
    - ACTIVITY_DAMAGE:
        ACTIVITY:
          Name: "Cross Module Fire Damage"
          Icon: "icons/svg/fire.svg"
        DAMAGE_DETAILS:
          Allow Critical: false
          Extra Critical Damage Formula: "n/a"
        DAMAGE:
          DAMAGE_PARTS:
            - Damage Formula: "1d6"
              Damage Type: "fire"
              Scaling: "whole"
              Dice: 6
              Formula: "1d6"
    - EFFECT:
        DETAILS:
          Name: "Cross Module Passive Effect"
          Icon Tint Color: "n/a"
          Effect Suspended: false
          Apply Effect to Actor: true
          Status Conditions: "n/a"
          Separate Status Conditions: "n/a"
        EFFECT_DESCRIPTION:
          Effect Description: |
            <p>Cross-module passive test effect.</p>
        CHANGES:
          - Attribute Key: "system.attributes.ac.bonus"
            Change Mode: 2
            Value: "1"
            Priority: 20`;

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
     * Run a compact structured smoke test suite for MCP Server Diagnostics.
     * This does not create items.
     */
    static async runStructured() {
        const tests = [];
        const warnings = [];

        const check = (name, condition, data = undefined) => {
            const passed = !!condition;
            tests.push({
                name,
                success: passed,
                ...(passed ? {} : { message: "Assertion failed" }),
                ...(data === undefined ? {} : { data })
            });
        };

        const recordError = (name, error) => {
            tests.push({
                name,
                success: false,
                message: error instanceof Error ? error.message : String(error)
            });
        };

        try {
            check("camelToTitleCase", ItemUtils.camelToTitleCase("magicSword") === "Magic Sword");
            check("capitalizeAll", ItemUtils.capitalizeAll("longsword of flames") === "Longsword Of Flames");
            check("capitalizeFirst", ItemUtils.capitalizeFirst("longsword of flames") === "Longsword of flames");
            check("normalize", ItemUtils.normalize("  SWORD  OF  POWER  ") === "sword of power");
            check("format", ItemUtils.format("{0} has {1} charges", "Wand", 3) === "Wand has 3 charges");
        } catch (error) {
            recordError("String utilities", error);
        }

        try {
            const currency = ItemUtils.parseCurrency("50 gp");
            const weight = ItemUtils.parseWeight("15 lb.");
            const dice = ItemUtils.parseDice("2d6+3");

            check("parseCurrency", currency?.value === 5000 && currency?.unit === "gp", currency);
            check("parseWeight", weight?.value === 15 && weight?.unit === "lb", weight);
            check("parseDice", dice?.count === 2 && dice?.faces === 6 && dice?.bonus === 3, dice);
        } catch (error) {
            recordError("Parsing utilities", error);
        }

        try {
            check("unique", ItemUtils.unique([1, 2, 2, 3]).length === 3);
            check("intersect", ItemUtils.intersect([1, 2, 3], [2, 3, 4]).join(",") === "2,3");
            check("except", ItemUtils.except([1, 2, 3], [2, 3]).join(",") === "1");
            check("chunk", ItemUtils.chunk([1, 2, 3, 4, 5], 2).length === 3);
        } catch (error) {
            recordError("Array utilities", error);
        }

        try {
            const validResult = ItemUtils.validateItemData({
                name: "Test Item",
                system: {
                    price: { value: 100 },
                    weight: { value: 5 },
                    quantity: 1
                }
            });
            const invalidResult = ItemUtils.validateItemData({ name: "", system: {} });

            check("validate valid item data", validResult.valid === true, validResult);
            check("validate invalid item data", invalidResult.valid === false && invalidResult.errors.length > 0, invalidResult);
        } catch (error) {
            recordError("Validation utilities", error);
        }

        try {
            const itemPacks = game.packs?.filter?.((pack) => pack.documentName === "Item") ?? [];
            const packCount = itemPacks.length ?? itemPacks.size ?? 0;
            check("item compendium access", packCount >= 0, { packCount });

            if (packCount > 0) {
                const longsword = await ItemUtils.getItemFromPacksAsync("Longsword", "weapon");
                if (longsword) {
                    check("sample compendium lookup", true, {
                        name: longsword.name,
                        type: longsword.type,
                        img: longsword.img
                    });
                } else {
                    warnings.push("Sample item lookup did not find Longsword in active item compendiums.");
                    check("sample compendium lookup", true, { found: false });
                }
            } else {
                warnings.push("No item compendiums are available.");
            }
        } catch (error) {
            recordError("Compendium access", error);
        }

        try {
            const naturalMagicWeapon = [
                "Frostbite Longsword",
                "Weapon (longsword), uncommon",
                "This +1 longsword deals 1d8 slashing damage and has the versatile property. You have a +1 bonus to attack and damage rolls made with this magic weapon."
            ].join("\n");
            const parsed = parseItemText(naturalMagicWeapon, { trace: true });
            check("parser fixture natural +1 longsword parses", parsed.success === true, parsed.trace);

            if (parsed.item) {
                await parsed.item.buildFoundryData({ deterministicIcons: true });
                const foundryData = parsed.item.toJSON?.().foundryData;
                check("parser fixture natural +1 longsword builds correctly",
                    foundryData?.system?.type?.baseItem === "longsword"
                    && foundryData?.system?.damage?.versatile?.custom?.formula === "1d10"
                    && foundryData?.system?.magicalBonus === 1,
                    {
                        baseItem: foundryData?.system?.type?.baseItem,
                        versatile: foundryData?.system?.damage?.versatile?.custom?.formula,
                        magicalBonus: foundryData?.system?.magicalBonus
                    }
                );
            }

            const lightYamlWeapon = [
                "name: Gnollish Can Opener",
                "type: weapon",
                "rarity: common",
                "weaponType: martialM",
                "baseWeapon: longsword",
                "damage: 1d8 slashing",
                "properties: versatile",
                "versatileFormula: 1d10",
                "price: 12 gp",
                "weight: 3 lb",
                "description: A hooked blade for stubborn tins."
            ].join("\n");
            const lightParsed = parseItemText(lightYamlWeapon, { trace: true });
            check("parser fixture lightweight yaml parses", lightParsed.success === true && lightParsed.item?.name === "Gnollish Can Opener", lightParsed.trace);

            const unsupported = parseItemText("name: Bad Key Test\nmysteryField: nope\ntype: weapon", { trace: true });
            check("parser fixture lightweight yaml rejects unsupported keys",
                unsupported.success === false && unsupported.errors?.some((error) => error.includes("Unsupported lightweight field")),
                unsupported
            );

            const aliasWeapon = parseItemText([
                "Gnollish Cleaver",
                "Weapon, common",
                "This cleaver deals 1d6 slashing damage."
            ].join("\n"));
            check("parser fixture weapon alias resolves base weapon",
                aliasWeapon.success === true && aliasWeapon.item?.baseWeapon === "handaxe",
                {
                    success: aliasWeapon.success,
                    baseWeapon: aliasWeapon.item?.baseWeapon,
                    errors: aliasWeapon.errors
                }
            );

            const typedDamageWeapon = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Typed Damage Test Blade",
                "    Rarity: uncommon",
                "    Weapon Type: martialM",
                "    Base Weapon: longsword",
                "  INVENTORY:",
                "    Quantity: 1",
                "    Identified: true",
                "    Equipped: false",
                "  PROPERTIES:",
                "    Magical: true",
                "    Versatile: true",
                "  RANGE:",
                "    Reach: 5",
                "  DAMAGE:",
                "    Damage Formula: \"1d8[slashing] + 1d6[fire]\"",
                "    Damage Type: slashing",
                "  VERSATILE_DAMAGE:",
                "    Versatile Formula: \"1d10[slashing] + 1d6[fire]\"",
                "    Versatile Damage Type: slashing",
                "  DESCRIPTION:",
                "    Description: Typed damage fixture."
            ].join("\n"));
            await typedDamageWeapon.item?.buildFoundryData({ deterministicIcons: true });
            const typedDamageData = typedDamageWeapon.item?.toJSON?.().foundryData;
            check("parser fixture typed custom damage keeps primary weapon damage type",
                typedDamageWeapon.success === true
                && typedDamageData?.system?.damage?.base?.custom?.formula === "1d8[slashing] + 1d6[fire]"
                && typedDamageData?.system?.damage?.base?.types?.includes("slashing")
                && typedDamageData?.system?.damage?.versatile?.custom?.formula === "1d10[slashing] + 1d6[fire]"
                && typedDamageData?.system?.damage?.versatile?.types?.includes("slashing"),
                {
                    success: typedDamageWeapon.success,
                    errors: typedDamageWeapon.errors,
                    base: typedDamageData?.system?.damage?.base,
                    versatile: typedDamageData?.system?.damage?.versatile
                }
            );

            const deterministicA = parseItemText(lightYamlWeapon);
            const deterministicB = parseItemText(lightYamlWeapon);
            await deterministicA.item?.buildFoundryData({ deterministicIcons: true });
            await deterministicB.item?.buildFoundryData({ deterministicIcons: true });
            const imgA = deterministicA.item?.toJSON?.().foundryData?.img;
            const imgB = deterministicB.item?.toJSON?.().foundryData?.img;
            check("diagnostic deterministic icons are stable", !!imgA && imgA === imgB, { imgA, imgB });

            const traced = parseItemText(lightYamlWeapon, { trace: true });
            const compact = parseItemText(lightYamlWeapon);
            check("parser trace is opt-in", !!traced.trace && compact.trace === undefined, {
                tracedInputKind: traced.trace?.inputKind,
                compactHasTrace: Object.prototype.hasOwnProperty.call(compact, "trace")
            });
        } catch (error) {
            recordError("Parser regression fixtures", error);
        }

        try {
            const splitTopLevelItems = (text) => {
                const marker = /^(WEAPON|EQUIPMENT|CONSUMABLE|TOOL|LOOT|CONTAINER|SPELL):\s*$/gm;
                const matches = [...text.matchAll(marker)];
                if (matches.length <= 1) return [text];
                return matches.map((match, index) => {
                    const next = matches[index + 1];
                    return text.slice(match.index, next ? next.index : text.length).trim();
                });
            };

            const normalizeProperties = (properties) => {
                if (!properties) return [];
                if (properties instanceof Set) return [...properties];
                if (Array.isArray(properties)) return properties;
                if (typeof properties === "object") return Object.keys(properties);
                return [String(properties)];
            };

            const templateResults = new Map();

            for (const template of ITEM_TEMPLATES) {
                const parts = splitTopLevelItems(template.text);
                for (let index = 0; index < parts.length; index++) {
                    const testId = parts.length > 1 ? `${template.id}#${index + 1}` : template.id;
                    const parsed = parseItemText(parts[index]);
                    check(`template ${testId} parses`, parsed.success === true && !!parsed.item, {
                        errors: parsed.errors,
                        warnings: parsed.warnings
                    });

                    if (!parsed.item) continue;

                    await parsed.item.buildFoundryData({ deterministicIcons: true });
                    const foundryData = parsed.item.toJSON?.().foundryData;
                    const validation = ItemUtils.validateItemData(foundryData ?? {});
                    check(`template ${testId} builds valid dnd5e item data`, validation.valid === true, {
                        name: foundryData?.name,
                        type: foundryData?.type,
                        validation
                    });

                    templateResults.set(testId, {
                        parsed,
                        foundryData,
                        properties: normalizeProperties(foundryData?.system?.properties)
                    });
                }
            }

            const weapon = templateResults.get("weapon");
            check("template magic weapon uses base item, mastery, and magic bonus",
                weapon?.foundryData?.system?.type?.baseItem === "longsword"
                && weapon?.foundryData?.system?.mastery === "sap"
                && weapon?.foundryData?.system?.magicalBonus === 1
                && weapon?.properties.includes("mgc")
                && weapon?.properties.includes("ver"),
                {
                    baseItem: weapon?.foundryData?.system?.type?.baseItem,
                    mastery: weapon?.foundryData?.system?.mastery,
                    magicalBonus: weapon?.foundryData?.system?.magicalBonus,
                    properties: weapon?.properties
                }
            );

            const cloak = templateResults.get("armor");
            check("template cloak matches dnd5e wondrous equipment shape",
                cloak?.foundryData?.type === "equipment"
                && cloak?.foundryData?.system?.type?.value === "wondrous"
                && cloak?.parsed?.item?.pendingActivities?.length === 0,
                {
                    type: cloak?.foundryData?.type,
                    equipmentType: cloak?.foundryData?.system?.type?.value,
                    pendingActivities: cloak?.parsed?.item?.pendingActivities?.length
                }
            );

            const potion = templateResults.get("potion");
            check("template healing potion models one item use without inline activities",
                potion?.foundryData?.system?.uses?.max === 1
                && potion?.foundryData?.system?.uses?.autoDestroy === true
                && potion?.parsed?.item?.pendingActivities?.length === 0,
                {
                    uses: potion?.foundryData?.system?.uses,
                    pendingActivities: potion?.parsed?.item?.pendingActivities?.length
                }
            );

            const tool = templateResults.get("tool");
            check("template alchemist tool matches dnd5e baseline fields",
                tool?.foundryData?.system?.type?.baseItem === "alchemist"
                && tool?.foundryData?.system?.price?.value === 50
                && tool?.foundryData?.system?.weight?.value === 8,
                {
                    baseItem: tool?.foundryData?.system?.type?.baseItem,
                    price: tool?.foundryData?.system?.price,
                    weight: tool?.foundryData?.system?.weight
                }
            );

            const container = templateResults.get("container");
            check("template bag of holding retains capacity and container properties",
                container?.foundryData?.system?.capacity?.weight?.value === 500
                && container?.properties.includes("mgc")
                && container?.properties.includes("weightlessContents"),
                {
                    capacity: container?.foundryData?.system?.capacity,
                    properties: container?.properties
                }
            );

            const loot = templateResults.get("loot");
            check("template loot remains mundane treasure data",
                loot?.foundryData?.type === "loot"
                && loot?.foundryData?.system?.type?.value === "gem"
                && !loot?.properties.includes("mgc"),
                {
                    type: loot?.foundryData?.type,
                    lootType: loot?.foundryData?.system?.type?.value,
                    properties: loot?.properties
                }
            );

            const attackTypes = new Set(["attack"]);
            const damageTypes = new Set(["damage"]);
            const checkTypes = new Set(["check"]);
            check("generated default suppression only replaces matching primary activities",
                ItemData.shouldSuppressGeneratedDefaultActivity("weapon", attackTypes)
                && !ItemData.shouldSuppressGeneratedDefaultActivity("weapon", damageTypes)
                && ItemData.shouldSuppressGeneratedDefaultActivity("tool", checkTypes),
                {
                    weaponAttack: ItemData.shouldSuppressGeneratedDefaultActivity("weapon", attackTypes),
                    weaponDamage: ItemData.shouldSuppressGeneratedDefaultActivity("weapon", damageTypes),
                    toolCheck: ItemData.shouldSuppressGeneratedDefaultActivity("tool", checkTypes)
                }
            );

            const source = { type: "weapon", system: {} };
            const prevented = ItemData.preventGeneratedDefaultActivity(source, attackTypes);
            check("generated default suppression marks current dnd5e source",
                prevented
                && source._stats?.systemId === game.system.id
                && source._stats?.systemVersion === game.system.version
                && source.system?.activities
                && Object.keys(source.system.activities).length === 0,
                {
                    prevented,
                    stats: source._stats,
                    activities: source.system?.activities
                }
            );
        } catch (error) {
            recordError("Template regression fixtures", error);
        }

        try {
            if (game.modules?.get?.("5e-activity-importer")?.active) {
                const handoff = await analyzeItemActivitiesText(ACTIVITY_HANDOFF_FIXTURE, {
                    parse: parseItemText,
                    trace: true,
                    strict: true
                });

                check("activity importer handoff validates pending activities", handoff.success
                    && handoff.parse?.item?.pendingActivities === 2
                    && handoff.pendingCount === 2
                    && handoff.pendingActivities?.every((entry) => entry.success)
                    && handoff.pendingActivities?.some((entry) => entry.key === "ACTIVITY_DAMAGE")
                    && handoff.pendingActivities?.some((entry) => entry.key === "EFFECT"), handoff);
            } else {
                warnings.push("5e-activity-importer is inactive; skipped activity handoff diagnostics fixture.");
            }
        } catch (error) {
            recordError("Activity importer handoff diagnostics", error);
        }

        const passed = tests.filter((test) => test.success).length;
        const failed = tests.length - passed;

        return {
            success: failed === 0,
            passed,
            failed,
            warnings,
            tests
        };
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
