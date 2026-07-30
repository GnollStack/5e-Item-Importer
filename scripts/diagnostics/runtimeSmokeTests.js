/** Compact read-only smoke coverage shipped in the production module. */

import { ItemUtils } from "../itemUtils.js";
import { parseItemText } from "../parserRouting.js";
import { analyzeItemActivitiesText } from "../activityIntegrationDiagnostics.js";

const NATURAL_ITEM_FIXTURE = [
    "Frostbite Longsword",
    "Weapon (longsword), uncommon",
    "This +1 longsword deals 1d8 slashing damage and has the versatile property. You have a +1 bonus to attack and damage rolls made with this magic weapon."
].join("\n");

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

export async function runRuntimeSmokeTests() {
    const tests = [];
    const warnings = [];

    const check = (name, condition, data = undefined) => {
        const success = Boolean(condition);
        tests.push({
            name,
            success,
            ...(success ? {} : { message: "Assertion failed" }),
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
        check("runtime utility normalization", ItemUtils.normalize("  SWORD  OF  POWER  ") === "sword of power");
        const dice = ItemUtils.parseDice("2d6+3");
        check("runtime dice parsing", dice?.count === 2 && dice?.faces === 6 && dice?.bonus === 3, dice);
    } catch (error) {
        recordError("runtime utility coverage", error);
    }

    try {
        const parsed = parseItemText(NATURAL_ITEM_FIXTURE);
        check("runtime natural item parse", parsed?.success === true && parsed?.item?.type === "weapon", {
            name: parsed?.item?.name ?? null,
            type: parsed?.item?.type ?? null,
            errors: parsed?.errors ?? []
        });
        await parsed?.item?.buildFoundryData?.({ deterministicIcons: true });
        const foundryData = parsed?.item?.toJSON?.().foundryData;
        check("runtime generated weapon data", foundryData?.system?.type?.baseItem === "longsword"
            && foundryData?.system?.magicalBonus === 1, {
            baseItem: foundryData?.system?.type?.baseItem ?? null,
            magicalBonus: foundryData?.system?.magicalBonus ?? null
        });
    } catch (error) {
        recordError("runtime item parser coverage", error);
    }

    try {
        const api = game.modules.get("5e-item-importer")?.api;
        const required = ["parse", "import", "exportCore", "exportFull"];
        const missing = required.filter((key) => typeof api?.[key] !== "function");
        check("runtime standalone public API", missing.length === 0, { required, missing });
    } catch (error) {
        recordError("runtime standalone public API", error);
    }

    try {
        const activityImporter = game.modules.get("5e-activity-importer");
        if (activityImporter?.active) {
            const handoff = await analyzeItemActivitiesText(ACTIVITY_HANDOFF_FIXTURE, {
                parse: parseItemText,
                strict: true
            });
            check("runtime Activity Importer handoff", handoff?.success === true
                && handoff?.pendingCount === 2
                && handoff.pendingActivities?.every((entry) => entry.success), {
                pendingCount: handoff?.pendingCount ?? 0,
                results: handoff?.pendingActivities?.map((entry) => ({
                    key: entry.key,
                    success: entry.success
                })) ?? [],
                errors: handoff?.errors ?? []
            });
        } else {
            check("runtime standalone operation without Activity Importer", true, {
                activityImporterActive: false
            });
        }
    } catch (error) {
        recordError("runtime Activity Importer handoff", error);
    }

    const failed = tests.filter((test) => !test.success).length;
    return {
        success: failed === 0,
        suite: "runtime",
        passed: tests.length - failed,
        failed,
        warnings,
        tests
    };
}
