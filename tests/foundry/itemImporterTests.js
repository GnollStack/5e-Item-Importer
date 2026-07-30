/**
 * 5e Item Importer - Test Suite
 * Demonstrates and tests utility functions
 *
 * Load this source-only suite from the Foundry browser console as documented
 * in tests/README.md, then call ItemImporterTests.runAll().
 */

import { ItemUtils } from "../../scripts/itemUtils.js";
import { MODULE_TITLE } from "../../scripts/itemConfig.js";
import { ItemData } from "../../scripts/itemData.js";
import { parseItemText } from "../../scripts/parserRouting.js";
import { NaturalItemParser } from "../../scripts/naturalItemParser.js";
import { ITEM_TEMPLATES } from "../../scripts/ui/itemTemplates.js";
import { analyzeItemActivitiesText } from "../../scripts/activityIntegrationDiagnostics.js";
import { buildRemainingBatchSource } from "../../scripts/ui/itemWindowActions.js";
import { renderAttunementRequirement } from "../../scripts/ui/itemAttunementNote.js";

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
              Damage Scaling: "whole"
              Scaling Dice Count: 1
              Scaling Formula: "1d6"
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

            const naturalScroll = parseItemText([
                "Scroll of Frost",
                "Scroll, uncommon",
                "This scroll contains a spell with Components: V, S."
            ].join("\n"));
            check("natural scroll keeps scroll consumable subtype",
                naturalScroll.success === true
                && naturalScroll.item?.type === "consumable"
                && naturalScroll.item?.consumableType === "scroll"
                && naturalScroll.item?.properties?.includes("vocal"),
                naturalScroll
            );

            const naturalAmmunition = parseItemText([
                "Silvered Arrows (20)",
                "Ammunition, uncommon",
                "These silvered arrows count as magical ammunition."
            ].join("\n"));
            check("natural ammunition keeps ammo and arrow subtypes",
                naturalAmmunition.success === true
                && naturalAmmunition.item?.consumableType === "ammo"
                && naturalAmmunition.item?.ammunitionType === "arrow"
                && naturalAmmunition.item?.quantity === 20,
                naturalAmmunition
            );

            const zeroQuantityAmmunition = parseItemText([
                "Empty Arrows (0)",
                "Ammunition, common",
                "This bundle has no arrows remaining."
            ].join("\n"));
            check("natural quantity suffix preserves zero",
                zeroQuantityAmmunition.success === true
                && zeroQuantityAmmunition.item?.quantity === 0,
                zeroQuantityAmmunition
            );

            const fractionalNaturalQuantity = parseItemText([
                "Odd Arrows (1.5)",
                "Ammunition, common",
                "An oddly labeled bundle of arrows."
            ].join("\n"));
            check("natural quantity suffix rejects fractional values without truncating",
                fractionalNaturalQuantity.success === true
                && fractionalNaturalQuantity.item?.quantity === 1
                && fractionalNaturalQuantity.warnings?.some((warning) => warning.includes("quantity must be a non-negative integer")),
                fractionalNaturalQuantity
            );

            const genericBullets = parseItemText([
                "Bullets (10)",
                "Ammunition, common",
                "These are ordinary firearm bullets."
            ].join("\n"));
            check("natural generic bullets use firearm ammunition subtype",
                genericBullets.success === true
                && genericBullets.item?.ammunitionType === "firearmBullet",
                genericBullets
            );

            const declaredWandSubtype = parseItemText([
                "Poison Wand",
                "Wand, rare",
                "This wand can deliver poison."
            ].join("\n"));
            check("natural declared consumable subtype outranks name keywords",
                declaredWandSubtype.success === true
                && declaredWandSubtype.item?.consumableType === "wand",
                declaredWandSubtype
            );

            const fractionalNaturalCharges = parseItemText([
                "Odd Wand",
                "Wand, rare",
                "This wand has 1.5 charges, to a maximum of 5."
            ].join("\n"));
            check("natural charges reject fractional counts without partial matching",
                fractionalNaturalCharges.success === true
                && fractionalNaturalCharges.item?.uses === null
                && fractionalNaturalCharges.warnings?.some((warning) => warning.includes("non-negative integers")),
                fractionalNaturalCharges
            );

            const reusableNaturalParser = new NaturalItemParser();
            const reusableFirst = reusableNaturalParser.parse([
                "Arrows (20)",
                "Ammunition, common",
                "A bundle of arrows."
            ].join("\n"));
            const reusableSecond = reusableNaturalParser.parse([
                "Single Arrow",
                "Ammunition, common",
                "One arrow."
            ].join("\n"));
            check("natural parser reuse resets cached quantity",
                reusableFirst.success === true
                && reusableFirst.item?.quantity === 20
                && reusableSecond.success === true
                && reusableSecond.item?.quantity === 1,
                { reusableFirst, reusableSecond }
            );

            const naturalWand = parseItemText([
                "Wand of Web",
                "Wand, rare (requires attunement by a spellcaster)",
                "This wand has 7 charges. It regains 1d6 + 1 expended charges daily at dawn."
            ].join("\n"));
            check("natural charged wand preserves uses and attunement restriction",
                naturalWand.success === true
                && naturalWand.item?.consumableType === "wand"
                && naturalWand.item?.uses?.value === 0
                && naturalWand.item?.uses?.max === 7
                && naturalWand.item?.attunementRequirement === "a spellcaster",
                naturalWand
            );

            const naturalWondrous = parseItemText([
                "Cloak of Guarding",
                "Wondrous Item, uncommon (requires attunement)",
                "While wearing this cloak, you gain a protective ward."
            ].join("\n"));
            check("natural wondrous item routes to wondrous equipment",
                naturalWondrous.success === true
                && naturalWondrous.item?.type === "equipment"
                && naturalWondrous.item?.armorType === "wondrous",
                naturalWondrous
            );

            const naturalFlameTongue = parseItemText([
                "Flame Tongue",
                "Weapon (longsword), rare (requires attunement)",
                "While the sword is ablaze, it deals an extra 2d6 fire damage and sheds bright light."
            ].join("\n"));
            check("natural magic weapon keeps base damage and ignores prose properties",
                naturalFlameTongue.success === true
                && naturalFlameTongue.item?.damage?.formula === "1d8"
                && naturalFlameTongue.item?.damage?.type === "slashing"
                && !naturalFlameTongue.item?.properties?.includes("lgt")
                && naturalFlameTongue.item?.properties?.includes("ver"),
                naturalFlameTongue
            );

            const naturalEffectDamage = parseItemText([
                "Spark Claw",
                "Natural Weapon, rare",
                "On a hit, the target takes an extra 2d6 damage."
            ].join("\n"));
            check("natural untyped effect damage does not become base damage",
                naturalEffectDamage.success === true
                && naturalEffectDamage.item?.weaponType === "natural"
                && naturalEffectDamage.item?.damage?.formula === "1d4",
                naturalEffectDamage
            );

            const typedNoPrimaryType = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Self-Contained Typed Blade",
                "    Weapon Type: martialM",
                "    Base Weapon: longsword",
                "  PROPERTIES:",
                "    Magical: false",
                "  DAMAGE:",
                '    Damage Formula: 1d8[slashing]',
                "    Damage Type: n/a"
            ].join("\n"));
            check("typed damage formula accepts n/a primary type",
                typedNoPrimaryType.success === true
                && typedNoPrimaryType.item?.damage?.formula === "1d8[slashing]",
                typedNoPrimaryType
            );

            const partiallyTypedDamage = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Partially Typed Blade",
                "    Weapon Type: martialM",
                "    Base Weapon: longsword",
                "  DAMAGE:",
                "    Damage Formula: 1d8[slashing] + 1d6",
                "    Damage Type: n/a"
            ].join("\n"));
            check("n/a damage type requires every dice term to be typed",
                partiallyTypedDamage.success === false
                && partiallyTypedDamage.item === null
                && partiallyTypedDamage.errors?.some((error) => error.includes("type every dice term")),
                partiallyTypedDamage
            );

            const invalidDamageType = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Invalid Damage Type Blade",
                "    Weapon Type: martialM",
                "    Base Weapon: longsword",
                "  DAMAGE:",
                "    Damage Formula: 1d8",
                "    Damage Type: banana"
            ].join("\n"));
            check("invalid damage type reports one primary validation error",
                invalidDamageType.success === false
                && invalidDamageType.item === null
                && invalidDamageType.errors?.filter((error) => error.includes("Damage Type")).length === 1,
                invalidDamageType
            );

            const legacyUsesCurrent = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Legacy Charge Fixture",
                "    Consumable Type: wand",
                "  PROPERTIES:",
                "    Magical: true",
                "  USAGE:",
                "    Uses Current: 2",
                "    Uses Max: 5"
            ].join("\n"));
            check("legacy Uses Current converts remaining uses to spent",
                legacyUsesCurrent.success === true
                && legacyUsesCurrent.item?.uses?.value === 3
                && legacyUsesCurrent.item?.uses?.max === 5
                && legacyUsesCurrent.warnings?.some((warning) => warning.includes("deprecated")),
                legacyUsesCurrent
            );

            const invalidUses = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Invalid Charge Fixture",
                "    Consumable Type: potion",
                "  PROPERTIES:",
                "    Magical: false",
                "  USAGE:",
                "    Uses Spent: 0",
                "    Uses Max: -1"
            ].join("\n"));
            check("strict parse errors never expose an importable item",
                invalidUses.success === false
                && invalidUses.item === null
                && invalidUses.errors?.some((error) => error.includes("Uses Max cannot be negative")),
                invalidUses
            );

            const fractionalUses = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Fractional Charge Fixture",
                "    Consumable Type: potion",
                "  USAGE:",
                "    Uses Spent: 0",
                "    Uses Max: 1.5"
            ].join("\n"));
            check("strict uses reject fractional values",
                fractionalUses.success === false
                && fractionalUses.item === null
                && fractionalUses.errors?.some((error) => error.includes("must be an integer")),
                fractionalUses
            );

            const negativeLegacyCurrent = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Negative Legacy Current",
                "    Consumable Type: wand",
                "  USAGE:",
                "    Uses Current: -1",
                "    Uses Max: 5"
            ].join("\n"));
            check("legacy current validates before remaining-to-spent conversion",
                negativeLegacyCurrent.success === false
                && negativeLegacyCurrent.item === null
                && negativeLegacyCurrent.errors?.length === 1
                && negativeLegacyCurrent.errors[0].includes("Uses Current cannot be negative"),
                negativeLegacyCurrent
            );

            const negativeLegacyMax = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Negative Legacy Maximum",
                "    Consumable Type: wand",
                "  USAGE:",
                "    Uses Current: 0",
                "    Uses Max: -1"
            ].join("\n"));
            check("invalid legacy maximum does not produce duplicate range errors",
                negativeLegacyMax.success === false
                && negativeLegacyMax.item === null
                && negativeLegacyMax.errors?.length === 1
                && negativeLegacyMax.errors[0].includes("Uses Max cannot be negative"),
                negativeLegacyMax
            );

            const invalidEquipmentAttunement = parseItemText([
                "EQUIPMENT:",
                "  ITEM:",
                "    Name: Invalid Attunement Equipment",
                "    Equipment Type: wondrous",
                "  PROPERTIES:",
                "    Magical: true",
                "  ATTUNEMENT:",
                "    Attunement: bespoke",
                "    Attunement By: a wizard"
            ].join("\n"));
            check("equipment attunement normalizes invalid values and clears restrictions",
                invalidEquipmentAttunement.success === true
                && invalidEquipmentAttunement.item?.attunement === ""
                && invalidEquipmentAttunement.item?.attunementRequirement === null
                && invalidEquipmentAttunement.warnings?.some((warning) => warning.includes("Invalid Attunement value"))
                && invalidEquipmentAttunement.warnings?.some((warning) => warning.includes("Attunement By is ignored")),
                invalidEquipmentAttunement
            );

            const unattunedWeaponRestriction = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Unattuned Restricted Blade",
                "    Weapon Type: martialM",
                "    Base Weapon: longsword",
                "  PROPERTIES:",
                "    Magical: true",
                "  ATTUNEMENT:",
                "    Attunement: none",
                "    Attunement By: a fighter",
                "  DAMAGE:",
                "    Damage Formula: 1d8",
                "    Damage Type: slashing"
            ].join("\n"));
            check("none attunement clears restrictions in the shared helper",
                unattunedWeaponRestriction.success === true
                && unattunedWeaponRestriction.item?.attunement === ""
                && unattunedWeaponRestriction.item?.attunementRequirement === null
                && unattunedWeaponRestriction.warnings?.some((warning) => warning.includes("Attunement By is ignored")),
                unattunedWeaponRestriction
            );

            const fractionalQuantity = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Fractional Stack",
                "    Loot Type: gear",
                "  INVENTORY:",
                "    Quantity: 1.5"
            ].join("\n"));
            check("strict quantity rejects fractional values instead of truncating",
                fractionalQuantity.success === false
                && fractionalQuantity.item === null
                && fractionalQuantity.errors?.some((error) => error.includes("Quantity must be an integer")),
                fractionalQuantity
            );

            const negativeQuantity = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Negative Stack",
                "    Loot Type: gear",
                "  INVENTORY:",
                "    Quantity: -1"
            ].join("\n"));
            check("strict quantity rejects negative integers",
                negativeQuantity.success === false
                && negativeQuantity.item === null
                && negativeQuantity.errors?.some((error) => error.includes("Quantity cannot be negative")),
                negativeQuantity
            );

            const invalidDecimalPrefixes = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Invalid Numeric Prefixes",
                "    Loot Type: gear",
                "  COST_AND_WEIGHT:",
                "    Price Value: 12abc",
                "    Price Denomination: gp",
                "    Weight Value: 3lb",
                "    Weight Units: lb"
            ].join("\n"));
            check("strict price and weight reject numeric prefixes",
                invalidDecimalPrefixes.success === false
                && invalidDecimalPrefixes.item === null
                && invalidDecimalPrefixes.errors?.some((error) => error.includes("Price Value must be a finite number"))
                && invalidDecimalPrefixes.errors?.some((error) => error.includes("Weight Value must be a finite number")),
                invalidDecimalPrefixes
            );

            const validDecimalValues = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Valid Decimal Values",
                "    Loot Type: gear",
                "  COST_AND_WEIGHT:",
                "    Price Value: 12.5",
                "    Price Denomination: gp",
                "    Weight Value: 0.25",
                "    Weight Units: lb"
            ].join("\n"));
            check("strict price and weight preserve valid decimals",
                validDecimalValues.success === true
                && validDecimalValues.item?.costDisplay === 12.5
                && validDecimalValues.item?.weight === 0.25,
                validDecimalValues
            );

            const invalidContainerCapacity = parseItemText([
                "CONTAINER:",
                "  ITEM:",
                "    Name: Invalid Capacity Container",
                "  PROPERTIES:",
                "    Magical: false",
                "  CAPACITY:",
                "    Item Count: n/a",
                "    Weight Capacity Value: 12abc",
                "    Weight Capacity Units: lb",
                "    Volume Capacity Value: n/a",
                "    Volume Capacity Units: cubicfoot"
            ].join("\n"));
            check("strict container capacities reject numeric prefixes",
                invalidContainerCapacity.success === false
                && invalidContainerCapacity.item === null
                && invalidContainerCapacity.errors?.some((error) => error.includes("Weight Capacity Value must be a finite number")),
                invalidContainerCapacity
            );

            const negativeContainerCapacity = parseItemText([
                "CONTAINER:",
                "  ITEM:",
                "    Name: Negative Capacity Container",
                "  PROPERTIES:",
                "    Magical: false",
                "  CAPACITY:",
                "    Item Count: -1",
                "    Weight Capacity Value: -2.5",
                "    Volume Capacity Value: -3"
            ].join("\n"));
            check("strict container capacities reject negative values",
                negativeContainerCapacity.success === false
                && negativeContainerCapacity.item === null
                && negativeContainerCapacity.errors?.some((error) => error.includes("Item Count cannot be negative"))
                && negativeContainerCapacity.errors?.some((error) => error.includes("Weight Capacity Value cannot be negative"))
                && negativeContainerCapacity.errors?.some((error) => error.includes("Volume Capacity Value cannot be negative")),
                negativeContainerCapacity
            );

            const unknownStrictKey = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Unknown Key Fixture",
                "    Loot Type: gear",
                "  PROPERTIES:",
                "    Magical: false",
                "    Magic Bonsu: 1"
            ].join("\n"));
            check("strict parser warns about ignored unknown keys",
                unknownStrictKey.success === true
                && unknownStrictKey.warnings?.some((warning) => warning.includes("Magic Bonsu")),
                unknownStrictKey
            );

            const malformedSection = parseItemText([
                "LOOT:",
                "  ITEM:",
                "    Name: Scalar Description Fixture",
                "    Loot Type: gear",
                "  DESCRIPTION: ignored scalar"
            ].join("\n"));
            check("strict parser warns when a known section is not a mapping",
                malformedSection.success === true
                && malformedSection.warnings?.some((warning) => warning.includes("DESCRIPTION must be a mapping")),
                malformedSection
            );

            const malformedRoot = parseItemText([
                "LOOT: ignored scalar"
            ].join("\n"));
            check("strict parser rejects a scalar item root cleanly",
                malformedRoot.success === false
                && malformedRoot.item === null
                && malformedRoot.errors?.length === 1
                && malformedRoot.errors[0].includes("LOOT must contain a mapping"),
                malformedRoot
            );

            const legacySpellPhysicalFields = parseItemText([
                "SPELL:",
                "  ITEM:",
                "    Name: Legacy Physical Spell",
                "    Rarity: legendary",
                "    Level: 1",
                "    School: evo",
                "  ACTIVATION:",
                "    Type: action",
                "    Value: 1",
                "  INVENTORY:",
                "    Quantity: 99",
                "    Identified: false",
                "  COST_AND_WEIGHT:",
                "    Price Value: 999",
                "    Weight Value: 10",
                "  UNIDENTIFIED_DESCRIPTION:",
                "    Unidentified Name: Hidden Spell"
            ].join("\n"));
            check("strict spell warns and ignores unsupported physical fields",
                legacySpellPhysicalFields.success === true
                && legacySpellPhysicalFields.item?.rarity === "common"
                && legacySpellPhysicalFields.item?.quantity === 1
                && legacySpellPhysicalFields.item?.costDisplay === null
                && legacySpellPhysicalFields.item?.unidentifiedName === ""
                && legacySpellPhysicalFields.warnings?.filter(
                    (warning) => warning.includes("current dnd5e SpellData")
                ).length === 4,
                legacySpellPhysicalFields
            );

            const unsupportedDartAmmo = parseItemText([
                "CONSUMABLE:",
                "  ITEM:",
                "    Name: Unsupported Dart Ammo",
                "    Consumable Type: ammo",
                "  PROPERTIES:",
                "    Magical: false",
                "  AMMUNITION_PROPERTIES:",
                "    Ammunition Type: dart"
            ].join("\n"));
            check("strict consumable ammo rejects unsupported dnd5e dart subtype",
                unsupportedDartAmmo.success === false
                && unsupportedDartAmmo.item === null,
                unsupportedDartAmmo
            );

            const deterministicA = parseItemText(lightYamlWeapon);
            const deterministicB = parseItemText(lightYamlWeapon);
            await deterministicA.item?.buildFoundryData({ deterministicIcons: true });
            await deterministicB.item?.buildFoundryData({ deterministicIcons: true });
            const imgA = deterministicA.item?.toJSON?.().foundryData?.img;
            const imgB = deterministicB.item?.toJSON?.().foundryData?.img;
            check("diagnostic deterministic icons are stable", !!imgA && imgA === imgB, { imgA, imgB });

            const animationsOff = parseItemText(lightYamlWeapon);
            const animationsOn = parseItemText(lightYamlWeapon);
            await animationsOff.item?.buildFoundryData({ deterministicIcons: true, generateAnimations: false });
            await animationsOn.item?.buildFoundryData({ deterministicIcons: true, generateAnimations: true });
            const animationsOffFlags = animationsOff.item?.toJSON?.().foundryData?.flags?.autoanimations;
            const animationsOnFlags = animationsOn.item?.toJSON?.().foundryData?.flags?.autoanimations;
            const autoAnimationsActive = game.modules?.get?.("autoanimations")?.active === true;
            check("diagnostic generateAnimations false omits AutoAnimations flags", !animationsOffFlags, {
                applied: !!animationsOffFlags
            });
            check("diagnostic generateAnimations true respects AutoAnimations active state",
                autoAnimationsActive ? !!animationsOnFlags : !animationsOnFlags,
                {
                    autoAnimationsActive,
                    applied: !!animationsOnFlags,
                    primary: animationsOnFlags?.primary?.video ?? null
                }
            );

            const pikeAnimation = parseItemText([
                "WEAPON:",
                "  ITEM:",
                "    Name: Greek Sarissa",
                "    Rarity: n/a",
                "    Weapon Type: martialM",
                "    Base Weapon: pike",
                "  PROPERTIES:",
                "    Heavy: true",
                "    Reach: true",
                "    Special: true",
                "    Two-Handed: true",
                "  RANGE:",
                "    Reach: 10",
                "    Range Units: ft",
                "  DAMAGE:",
                "    Damage Formula: \"1d10 + @mod\"",
                "    Damage Type: piercing",
                "  DESCRIPTION:",
                "    Description: Pike animation fixture."
            ].join("\n"));
            await pikeAnimation.item?.buildFoundryData({ deterministicIcons: true, generateAnimations: true });
            const pikeAnimationFlags = pikeAnimation.item?.toJSON?.().foundryData?.flags?.autoanimations;
            check("diagnostic pike animation prefers spear over fallback sword",
                autoAnimationsActive ? pikeAnimationFlags?.primary?.video?.animation === "spear" : !pikeAnimationFlags,
                {
                    autoAnimationsActive,
                    applied: !!pikeAnimationFlags,
                    primary: pikeAnimationFlags?.primary?.video ?? null
                }
            );

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
                    const unknownKeyWarnings = (parsed.warnings || []).filter(
                        (warning) => /^(?:Unknown (?:key|\w+ section|top-level key)|Unsupported spell)/.test(warning)
                    );
                    check(`template ${testId} has no unknown schema keys`, unknownKeyWarnings.length === 0, {
                        unknownKeyWarnings
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
            const harness = Object.create(ItemData.prototype);
            const attackResult = {
                success: true,
                resultType: "activity",
                activityType: "attack",
                activityData: { _id: "planned-attack", name: "Planned Attack" },
                embeddedEffectResults: []
            };
            const effectResult = {
                success: true,
                resultType: "effect",
                effectData: { name: "Standalone Effect" }
            };

            let unsupportedWrites = 0;
            const unsupportedResult = await harness.applyActivities({
                type: "loot",
                name: "Unsupported Attachment Target",
                uuid: "Item.unsupported",
                system: {},
                effects: new Map(),
                async createEmbeddedDocuments() {
                    unsupportedWrites++;
                    return [];
                }
            }, [effectResult, attackResult]);
            check("mixed attachment batch aborts before effects on activity-incompatible items",
                unsupportedResult.addedActivities === 0
                && unsupportedResult.addedEffects === 0
                && unsupportedWrites === 0
                && unsupportedResult.issues.some(issue => issue.includes("entire inline attachment batch")),
                { unsupportedResult, unsupportedWrites }
            );

            const capableContext = {
                type: "weapon",
                system: { activities: new Map([["existing-activity", {}]]) },
                createActivity() {}
            };
            const invalidAttachmentPlan = [
                attackResult,
                { success: false, resultType: "effect", errors: ["Invalid effect fixture"] }
            ];
            const invalidAttachmentIssues = await harness.preflightInlineActivityPlan(
                invalidAttachmentPlan,
                capableContext,
                { resolveUuid: null }
            );
            const invalidAttachmentSource = { type: "weapon", system: {} };
            const invalidAttachmentSuppressed = invalidAttachmentIssues.length === 0
                && ItemData.preventGeneratedDefaultActivity(
                    invalidAttachmentSource,
                    ItemData.getSuccessfulActivityTypes(invalidAttachmentPlan)
                );
            check("invalid attachment retains generated baseline behavior",
                invalidAttachmentIssues.length > 0
                && !invalidAttachmentSuppressed
                && !invalidAttachmentSource._stats,
                { invalidAttachmentIssues, invalidAttachmentSource }
            );

            const invalidLinkedPlan = [
                attackResult,
                {
                    success: true,
                    resultType: "activity",
                    activityType: "cast",
                    activityData: { name: "Invalid Linked Cast", spell: { uuid: "Item.not-a-spell" } },
                    embeddedEffectResults: []
                }
            ];
            const invalidLinkedIssues = await harness.preflightInlineActivityPlan(
                invalidLinkedPlan,
                capableContext,
                { resolveUuid: async () => null }
            );
            const invalidLinkedSource = { type: "weapon", system: {} };
            const invalidLinkedSuppressed = invalidLinkedIssues.length === 0
                && ItemData.preventGeneratedDefaultActivity(
                    invalidLinkedSource,
                    ItemData.getSuccessfulActivityTypes(invalidLinkedPlan)
                );
            check("invalid linked UUID retains generated baseline behavior",
                invalidLinkedIssues.some(issue => issue.includes("spell Item"))
                && !invalidLinkedSuppressed
                && !invalidLinkedSource._stats,
                { invalidLinkedIssues, invalidLinkedSource }
            );

            const actorReferenceIssues = await harness.preflightInlineActivityPlan([
                {
                    success: true,
                    resultType: "activity",
                    activityType: "summon",
                    activityData: {
                        name: "Invalid Summon",
                        summon: { mode: "" },
                        profiles: [{ uuid: "Item.not-an-actor" }]
                    },
                    embeddedEffectResults: []
                },
                {
                    success: true,
                    resultType: "activity",
                    activityType: "transform",
                    activityData: {
                        name: "Invalid Transform",
                        transform: { mode: "" },
                        profiles: [{ uuid: "Item.not-an-actor" }]
                    },
                    embeddedEffectResults: []
                }
            ], capableContext, {
                resolveUuid: async () => ({ documentName: "Item", type: "npc" })
            });
            check("direct-link summon and transform profiles require Actor documents",
                actorReferenceIssues.filter(issue => issue.includes("does not resolve to an Actor")).length === 2,
                actorReferenceIssues
            );

            const validForwardIssues = await harness.preflightInlineActivityPlan([
                attackResult,
                {
                    success: true,
                    resultType: "activity",
                    activityType: "forward",
                    activityData: { name: "Forward Planned", activity: { id: "planned-attack" } },
                    embeddedEffectResults: []
                },
                {
                    success: true,
                    resultType: "activity",
                    activityType: "forward",
                    activityData: { name: "Forward Existing", activity: { id: "existing-activity" } },
                    embeddedEffectResults: []
                }
            ], capableContext, { resolveUuid: null });
            const invalidForwardIssues = await harness.preflightInlineActivityPlan([{
                success: true,
                resultType: "activity",
                activityType: "forward",
                activityData: { name: "Forward Missing", activity: { id: "missing-id" } },
                embeddedEffectResults: []
            }], capableContext, { resolveUuid: null });
            check("Forward preflight accepts existing/planned IDs and rejects unknown targets",
                validForwardIssues.length === 0
                && invalidForwardIssues.some(issue => issue.includes("not on the Item or in this inline batch")),
                { validForwardIssues, invalidForwardIssues }
            );

            const persistedActivities = new Map();
            const undefinedReturnItem = {
                type: "weapon",
                name: "Undefined Return Item",
                uuid: "Item.activity-success",
                system: { activities: persistedActivities },
                effects: new Map(),
                async createActivity(activityType, activityData) {
                    persistedActivities.set(activityData._id, { id: activityData._id, type: activityType });
                    return undefined;
                },
                async deleteActivity(id) {
                    persistedActivities.delete(id);
                }
            };
            const undefinedReturnResult = await harness.applyActivities(
                undefinedReturnItem,
                [{ ...attackResult, activityData: { name: "Undefined Return Attack" } }]
            );
            check("createActivity undefined return succeeds after collection verification",
                undefinedReturnResult.addedActivities === 1 && persistedActivities.size === 1,
                { undefinedReturnResult, ids: Array.from(persistedActivities.keys()) }
            );

            const thrownActivities = new Map();
            const persistedThenThrownItem = {
                type: "weapon",
                name: "Thrown Activity Item",
                uuid: "Item.activity-throw",
                system: { activities: thrownActivities },
                effects: new Map(),
                async createActivity(activityType, activityData) {
                    thrownActivities.set(activityData._id, { id: activityData._id, type: activityType });
                    throw new Error("persisted then threw");
                },
                async deleteActivity(id) {
                    thrownActivities.delete(id);
                }
            };
            const thrownActivityResult = await harness.applyActivities(
                persistedThenThrownItem,
                [{ ...attackResult, activityData: { name: "Thrown Attack" } }]
            );
            check("persisted-then-thrown activity rolls back its preallocated ID",
                thrownActivityResult.addedActivities === 0
                && thrownActivities.size === 0
                && thrownActivityResult.issues.some(issue => issue.includes("rolled back")),
                { thrownActivityResult, remaining: thrownActivities.size }
            );

            const thrownEffects = new Map();
            let sawKeepId = false;
            const persistedThenThrownEffectItem = {
                type: "loot",
                name: "Thrown Effect Item",
                uuid: "Item.effect-throw",
                system: {},
                effects: thrownEffects,
                async createEmbeddedDocuments(documentName, payloads, options) {
                    sawKeepId = documentName === "ActiveEffect" && options?.keepId === true;
                    thrownEffects.set(payloads[0]._id, { id: payloads[0]._id });
                    throw new Error("effect persisted then threw");
                },
                async deleteEmbeddedDocuments(documentName, ids) {
                    for (const id of ids) thrownEffects.delete(id);
                }
            };
            const thrownEffectResult = await harness.applyActivities(
                persistedThenThrownEffectItem,
                [effectResult]
            );
            check("persisted-then-thrown effect uses keepId and rolls back",
                sawKeepId
                && thrownEffectResult.addedEffects === 0
                && thrownEffects.size === 0,
                { thrownEffectResult, sawKeepId, remaining: thrownEffects.size }
            );

            const partialEffects = new Map();
            const partialEffectItem = {
                type: "weapon",
                name: "Partial Effect Item",
                uuid: "Item.effect-partial",
                system: { activities: new Map() },
                effects: partialEffects,
                async createEmbeddedDocuments(documentName, payloads, options) {
                    sawKeepId = sawKeepId && documentName === "ActiveEffect" && options?.keepId === true;
                    partialEffects.set(payloads[0]._id, { id: payloads[0]._id });
                    return [{ id: payloads[0]._id }];
                },
                async deleteEmbeddedDocuments(documentName, ids) {
                    for (const id of ids) partialEffects.delete(id);
                },
                async createActivity() {
                    throw new Error("activity creation must not run after partial effects");
                },
                async deleteActivity() {}
            };
            const partialEffectResult = await harness.applyActivities(partialEffectItem, [{
                ...attackResult,
                activityData: { name: "Attack With Partial Effects" },
                embeddedEffectResults: [
                    { success: true, effectData: { name: "Effect One" } },
                    { success: true, effectData: { name: "Effect Two" } }
                ]
            }]);
            check("partial effect creation rolls back every persisted payload",
                partialEffectResult.addedActivities === 0
                && partialEffectResult.addedEffects === 0
                && partialEffects.size === 0,
                { partialEffectResult, remaining: partialEffects.size }
            );

            const warningCollection = await harness.collectActivityResults([{
                ...attackResult,
                warnings: ["Top warning", "Top warning"],
                embeddedEffectResults: [{
                    success: true,
                    effectData: { name: "Warned Effect" },
                    warnings: ["Embedded warning"]
                }]
            }]);
            check("provided activity results preserve and deduplicate parser warnings",
                warningCollection.blockingIssues.length === 0
                && warningCollection.issues.filter(issue => issue.includes("Top warning")).length === 1
                && warningCollection.issues.some(issue => issue.includes("Warned Effect: Embedded warning")),
                warningCollection
            );

            const rewrittenBatch = buildRemainingBatchSource({
                successes: [{
                    _batchSourceOrder: 2,
                    _batchSourceText: "LOOT:\n  ITEM:\n    Name: Remaining"
                }],
                failures: [{
                    _batchSourceOrder: 0,
                    _batchSourceText: "WEAPON:\n  ITEM:\n    Name: Failed"
                }],
                _batchSourceSeparator: "\n---\n"
            });
            check("partial-batch retry source contains only remaining entries in source order",
                rewrittenBatch === "WEAPON:\n  ITEM:\n    Name: Failed\n---\nLOOT:\n  ITEM:\n    Name: Remaining",
                { rewrittenBatch }
            );

            const softBoundaryHarness = Object.create(ItemData.prototype);
            softBoundaryHarness.applyActivities = async () => {
                throw new Error("simulated post-create attachment failure");
            };
            const softBoundaryResult = await softBoundaryHarness.applyActivitiesSafely(
                { id: "persisted-item" },
                [attackResult]
            );
            check("unexpected attachment exception produces a zeroed soft result",
                softBoundaryResult.addedActivities === 0
                && softBoundaryResult.addedEffects === 0
                && softBoundaryResult.issues.some(issue => issue.includes("Item was created")),
                softBoundaryResult
            );
        } catch (error) {
            recordError("Inline attachment transaction regressions", error);
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
                check("Item Importer core diagnostics run without Activity Importer", true, {
                    activityImporterActive: false
                });
            }
        } catch (error) {
            recordError("Activity importer handoff diagnostics", error);
        }

        try {
            const root = document.createElement("form");
            root.innerHTML = [
                '<div class="form-group split-group" data-test-attunement-row>',
                '  <div class="form-fields"><div class="form-group label-top">',
                '    <select name="system.attunement"></select>',
                '  </div></div>',
                '</div>'
            ].join("");
            const longRequirement = "A creature that has survived being reduced to 0 hit points by lightning or thunder damage and completed a long rest.";
            const app = {
                document: {
                    system: { attunement: "required" },
                    getFlag: () => longRequirement
                }
            };

            renderAttunementRequirement(app, root);
            const row = root.querySelector("[data-test-attunement-row]");
            const note = root.querySelector(".ii-attunement-note");
            check("long attunement requirement renders as a collapsed full-row disclosure",
                note?.tagName === "DETAILS"
                && note.previousElementSibling === row
                && note.open === false
                && note.querySelector(".ii-attunement-note__preview")?.textContent === longRequirement
                && note.querySelector(".ii-attunement-note__content")?.textContent === longRequirement,
                { tagName: note?.tagName, open: note?.open, fullRow: note?.previousElementSibling === row }
            );

            note.open = true;
            renderAttunementRequirement(app, root);
            check("attunement disclosure preserves its open state during rerender",
                root.querySelector(".ii-attunement-note")?.open === true
            );

            app.document.getFlag = () => "a spellcaster";
            renderAttunementRequirement(app, root);
            check("short attunement requirements open automatically",
                root.querySelector(".ii-attunement-note")?.open === true
            );

            app.document.system.attunement = "none";
            renderAttunementRequirement(app, root);
            check("attunement disclosure is removed when attunement no longer applies",
                !root.querySelector(".ii-attunement-note")
            );
        } catch (error) {
            recordError("Attunement requirement disclosure", error);
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
