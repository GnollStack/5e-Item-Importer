import yaml from "../../scripts/vendor/js-yaml.mjs";
import { automationSchema, automationFieldEntries, parseAutomation, exportAutomation, automationRows } from "../../scripts/automationFields.js";
import { readPath, writePath } from "../../scripts/explicitYamlFields.js";
import { validateAutomationReferences } from "../../scripts/automationReferences.js";

const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function sample(spec, empty = false) {
    if (spec.kind === "object") return Object.fromEntries(Object.entries(spec.fields).map(([key, child]) => [key, sample(child, empty)]));
    if (spec.kind === "array") return empty ? [] : [sample(spec.element, empty)];
    if (spec.kind === "ownership" || spec.kind === "metadata") return {};
    if (empty && spec.nullable) return null;
    if (spec.choices) return spec.choices[empty ? 0 : spec.choices.length - 1];
    if (spec.kind === "boolean") return !empty;
    if (spec.kind === "number") return Math.max(spec.min ?? 0, empty ? 0 : 0.5);
    return empty ? "" : "stored expression @mod";
}

export async function runAutomationContractTests({ itemModule = false } = {}) {
    const results = [];
    const test = async (name, run) => { try { await run(); results.push({ name, passed: true }); }
        catch (error) { results.push({ name, passed: false, details: { error: error.message } }); } };
    const types = itemModule ? ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"]
        : ["attack", "save", "damage", "heal", "utility", "check", "cast", "enchant", "summon", "transform", "forward"];
    const kind = itemModule ? "item" : "activity";
    const { prepareRecipeText } = await import("../../scripts/ui/recipeEditor.js");
    const applicationsBefore = foundry.applications;
    const fromUuidBefore = globalThis.fromUuid;
    try {
        let prompts = 0;
        foundry.applications = { api: { DialogV2: { confirm: async () => false,
            prompt: async () => { prompts++; return null; } } } };
        const recipe = { text: "EFFECT: {}", data: { EFFECT: {} }, links: [{ documentName: "ActiveEffect", standalone: true, path: "EFFECT.UUID" }] };
        await test("Recipe cancellation keeps the draft and skips reference prompts", async () => {
            assert(await prepareRecipeText(recipe, "existing draft") === null && prompts === 0, "Draft replacement was not cancelled.");
        });
        await test("Recipe reference cancellation keeps the draft", async () => {
            assert(await prepareRecipeText(recipe) === null && prompts === 1, "Reference cancellation failed.");
        });
        foundry.applications.api.DialogV2.prompt = async () => "ActiveEffect.Example000000001";
        await test("Recipe rejects the wrong document and embedded external references", async () => {
            globalThis.fromUuid = async () => ({ documentName: "Item" });
            assert(await prepareRecipeText(recipe) === null, "Wrong reference type accepted.");
            globalThis.fromUuid = async () => ({ documentName: "ActiveEffect", isEmbedded: true });
            assert(await prepareRecipeText(recipe) === null, "Embedded reference accepted as standalone.");
        });
        await test("Recipe resolves references without mutating the reusable recipe", async () => {
            globalThis.fromUuid = async () => ({ documentName: "ActiveEffect" });
            const prepared = yaml.load(await prepareRecipeText(recipe));
            assert(prepared.EFFECT.UUID === "ActiveEffect.Example000000001" && !recipe.data.EFFECT.UUID, "Recipe reference staging failed.");
        });
    } finally { foundry.applications = applicationsBefore; globalThis.fromUuid = fromUuidBefore; }
    const midiBefore = game.modules.get("midi-qol");
    game.modules.set("midi-qol", { active: true });
    await test("Automation references reject missing targets and recursive local chains", async () => {
        const make = (name, id, target) => ({ activityType: "utility", activityData: { type: "utility", name,
            midiProperties: { identifier: id, triggeredActivityId: target } } });
        const missing = await validateAutomationReferences([make("A", "a", "missing")], null);
        assert(missing.some(row => row.code === "automation-link-invalid"), "Missing reference accepted.");
        const cycle = await validateAutomationReferences([make("A", "a", "b"), make("B", "b", "a")], null);
        assert(cycle.some(row => row.code === "automation-link-cycle"), "Recursive chain accepted.");
        const valid = await validateAutomationReferences([make("A", "a", "b"), make("B", "b", "none")], null);
        assert(!valid.length, "Valid identifier chain rejected.");
        game.modules.set("midi-qol", { active: false });
        const disabled = await validateAutomationReferences([make("A", "a", "none")], null);
        assert(disabled.some(row => row.code === "automation-dependency"), "Missing provider accepted.");
        game.modules.set("midi-qol", { active: true });
    });
    const recipeApi = await import(itemModule ? "../../scripts/ui/itemRecipes.js" : "../../scripts/ui/activityRecipes.js");
    const recipes = itemModule ? recipeApi.getItemRecipes() : recipeApi.getActivityRecipes();
    for (const recipe of recipes) await test(`Recipe parses without data loss: ${recipe.id}`, async () => {
        if (itemModule) {
            const { YamlItemParser } = await import("../../scripts/strictItemParsers/yamlItemParser.js");
            const parsed = new YamlItemParser().parse(recipe.text);
            assert(parsed.success, parsed.errors.join("; "));
            await parsed.item.buildFoundryData({ deterministicIcons: true });
            assert(parsed.item.itemData.system.rarities.length === 2, "Recipe rarities lost.");
            if (recipe.id === "recipe-dawn" || recipe.id === "recipe-dusk")
                assert(parsed.item.itemData.system.uses.recovery[0].period === recipe.id.slice(7), "Recovery period lost.");
        } else {
            const { parseAllBlocksYaml } = await import("../../scripts/activityParsers/yamlParser.js");
            const parsed = parseAllBlocksYaml(recipe.text);
            assert(parsed.length && parsed.every(row => row.success), parsed.flatMap(row => row.errors ?? []).join("; "));
            assert(!parsed.some(row => row.warnings?.length), parsed.flatMap(row => row.warnings ?? []).join("; "));
            if (recipe.id === "recipe-midi-overtime") assert(parsed[0].activityData.healing.number === 1 && parsed[0].activityData.healing.denomination === 4, "Healing formula lost.");
            if (recipe.id === "recipe-terrain") assert(parsed[0].activityData.target.template.size === "10", "Template size lost.");
            if (recipe.id === "recipe-form") assert(parsed[0].activityData.transform.mode === "form", "Transform mode lost.");
        }
    });
    if (midiBefore) game.modules.set("midi-qol", midiBefore); else game.modules.delete("midi-qol");
    for (const type of types) for (const empty of [true, false]) {
        await test(`${type}: automation preserves ${empty ? "inactive and empty" : "populated"} stored fields`, async () => {
            const section = sample(automationSchema(kind, type), empty);
            const patch = parseAutomation(section, kind, type);
            const before = JSON.stringify(patch);
            const exported = exportAutomation({ _source: patch, macroData: { command: "prepared value" } }, kind, type);
            const restored = parseAutomation(yaml.load(yaml.dump(exported)), kind, type);
            assert(same(patch, restored), "Automation storage differs after round trip.");
            assert(JSON.stringify(patch) === before, "Export changed the source.");
            const rows = automationRows(patch, kind, type);
            assert(rows.length > 0 && !rows.some(row => row.label === "Unsupported data"), "Automation preview failed.");
        });
    }
    for (const type of ["base", "enchantment"]) for (const empty of [true, false]) {
        await test(`${type}: DAE application and expiry controls round trip (${empty})`, () => {
            const section = sample(automationSchema("effect", type), empty);
            const patch = parseAutomation(section, "effect", type);
            assert(same(patch, parseAutomation(exportAutomation(patch, "effect", type), "effect", type)), "Effect automation changed.");
        });
    }
    const type = itemModule ? "weapon" : "utility";
    for (const entry of automationFieldEntries(kind, type)) {
        await test(`${kind}: rejects wrong value type at ${entry.path}`, () => {
            if (["metadata", "ownership"].includes(entry.spec.kind)) return;
            const section = {};
            writePath(section, entry.yamlPath.replace(/^AUTOMATION\./, ""), { invalid: true });
            let rejected = false; try { parseAutomation(section, kind, type); } catch { rejected = true; }
            assert(rejected, "Invalid value was accepted.");
        });
    }
    await test("Unknown authored integration fields fail closed", () => {
        for (const section of [{ unexpected: {} }, { dae: { unknown: false } }, { "midi-qol": { flags: { unknown: 0 } } }]) {
            let rejected = false; try { parseAutomation(section, kind, type); } catch { rejected = true; }
            assert(rejected, "Unknown field was accepted.");
        }
    });
    await test("Macro text is inert in parse/export/preview", () => {
        const command = "globalThis.__automationCanary = true; throw new Error('must not execute')";
        delete globalThis.__automationCanary;
        const section = itemModule ? { dae: { macro: { name: "Canary", type: "script", command } } }
            : { "midi-qol": { fields: { macroData: { name: "Canary", command } } } };
        const patch = parseAutomation(section, kind, type);
        exportAutomation(patch, kind, type); automationRows(patch, kind, type);
        assert(globalThis.__automationCanary === undefined, "Macro text was executed.");
    });
    if (itemModule) {
        const { YamlItemParser } = await import("../../scripts/strictItemParsers/yamlItemParser.js");
        const { itemToStrictYamlDocument } = await import("../../scripts/itemYamlExporter.js");
        const { extractExpectedItemProps, extractActualItemProps } = await import("../../scripts/ui/itemComparisonExtractor.js");
        for (const type of types) await test(`${type}: full Item integration import/export without companion`, async () => {
            const input = { SCHEMA_VERSION: 4, [type.toUpperCase()]: { ITEM: { Name: "Automation fixture" },
                AUTOMATION: { "midi-qol": { flags: { onUseMacroName: "[postActiveEffects]Canary", noProvokeReaction: false } },
                    dae: { macro: { name: "Stored name", command: "// stored only", type: "script", scope: "global" } } } } };
            if (type === "tool") input.TOOL.ABILITY_CHECK = { Proficient: 1.5 };
            const root = input[type.toUpperCase()];
            Object.assign(root.ITEM, { weapon: { "Weapon Type": "simpleM", "Base Weapon": "club" },
                equipment: { "Equipment Type": "wondrous" }, consumable: { "Consumable Type": "potion" },
                tool: { "Tool Type": "art", "Base Tool": "alchemist" }, loot: { "Loot Type": "gear" },
                spell: { Level: 1, School: "evo" } }[type] ?? {});
            if (type === "weapon") root.DAMAGE = { "Damage Formula": "1d4", "Damage Type": "bludgeoning" };
            if (type === "spell") root.ACTIVATION = { Type: "action", Value: 1 };
            const result = new YamlItemParser().parse(yaml.dump(input));
            assert(result.success, result.errors.join("; "));
            await result.item.buildFoundryData({ deterministicIcons: true });
            const source = result.item.itemData;
            if (type === "tool") assert(source.system.proficient === 1.5, "Fractional proficiency lost.");
            const output = itemToStrictYamlDocument(source);
            assert(output.SCHEMA_VERSION === 4, "Wrong output version.");
            assert(same(input[type.toUpperCase()].AUTOMATION, output[type.toUpperCase()].AUTOMATION), "Item integration data lost.");
            const rows = automationRows(source, "item", type);
            assert(same(rows, extractExpectedItemProps(result).filter(row => row.section === "Automation")), "Item expected comparison lost automation.");
            assert(same(rows, extractActualItemProps({ ...source, _source: source }, result).filter(row => row.section === "Automation")), "Item actual comparison lost automation.");
        });
    } else {
        const { serializeActivityToStrictYaml, serializeEffectToStrictYaml } = await import("../../scripts/activityStrictSerializer.js");
        const { parseAllBlocksYaml } = await import("../../scripts/activityParsers/yamlParser.js");
        const { explicitActivitySource } = await import("../../scripts/explicitImportFixtures.js");
        const { activityExplicitRows } = await import("../../scripts/activityExplicitFields.js");
        const { extractExpectedActivityProps, extractActualActivityProps } = await import("../../scripts/ui/activityComparisonExtractor.js");
        for (const type of types) await test(`${type}: preview and comparison retain typed automation from source`, () => {
            const source = { name: "Comparison fixture", ...parseAutomation(sample(automationSchema("activity", type), true), "activity", type) };
            const expected = automationRows(source, "activity", type);
            const onlyAutomation = rows => rows.filter(row => row.section === "Automation");
            assert(same(expected, onlyAutomation(activityExplicitRows(source, type))), "Preview omitted typed automation fields.");
            assert(same(expected, onlyAutomation(extractExpectedActivityProps({ activityType: type, activityData: source }))), "Expected comparison omitted fields.");
            assert(same(expected, onlyAutomation(extractActualActivityProps({ type, _source: { ...source, type }, macroData: { command: "prepared" } }))), "Actual comparison used prepared data or omitted fields.");
        });
        for (const type of types) await test(`${type}: native serializer carries MIDI inactive settings`, () => {
            const source = explicitActivitySource(type);
            source.macroData = { name: "Custom macro name", command: "// inert" };
            source.otherActivityId = null;
            source.isOverTimeFlag = false;
            source.overTimeProperties = { turnChoice: "end", saveRemoves: false, rollAs: "source", preRemoveConditionText: "", postRemoveConditionText: "false" };
            source.regionLight = { enabled: false, dim: 0, bright: 0, color: null, alpha: 0, luminosity: 0, animationType: null, animationSpeed: 0, animationIntensity: 1 };
            // These profiles are unrelated reference fixtures; this test isolates the automation serializer.
            const descriptor = serializeActivityToStrictYaml(source, { includeLinkedEffects: false });
            const parsed = parseAllBlocksYaml(yaml.dump(descriptor.rawData))[0];
            assert(parsed.success, parsed.errors.join("; "));
            for (const path of ["macroData", "otherActivityId", "isOverTimeFlag", "overTimeProperties", "regionLight"])
                assert(same(readPath(source, path), readPath(parsed.activityData, path)), "Lost " + path);
        });
        await test("Complete DAE effect serialization and legacy alias conflict", () => {
            const source = { type: "base", name: "DAE fixture", system: { changes: [] }, flags: {
                dae: { applicationMode: "legacy", expiryMode: "suppress", stackable: "multi", enableCondition: "", disableCondition: "false", specialDuration: [], selfTarget: false }, core: { overlay: false } } };
            const descriptor = serializeEffectToStrictYaml(source);
            const parsed = parseAllBlocksYaml(yaml.dump(descriptor.rawData))[0];
            assert(parsed.success && same(parsed.effectData.flags, source.flags), parsed.errors.join("; ") || "DAE flags lost.");
            descriptor.rawData.EFFECT["DAE Details"] = { Stackable: "multi" };
            assert(!parseAllBlocksYaml(yaml.dump(descriptor.rawData))[0].success, "Conflicting legacy/canonical fields were accepted.");
        });
    }
    return { results, passed: results.filter(row => row.passed).length, failed: results.filter(row => !row.passed).length };
}
