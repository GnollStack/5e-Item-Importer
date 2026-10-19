import yaml from "../vendor/js-yaml.mjs";
import { getActivitySchemaCompatibility } from "../activityCompanionCapabilities.js";

const item = (name, extra = {}) => ({ SCHEMA_VERSION: 4, EQUIPMENT: {
    ITEM: { Name: name, "Equipment Type": "wondrous", Rarities: ["uncommon", "rare"] }, ...extra } });
const core = [
    { id: "recipe-rarities", label: "Native: multiple rarities", description: "An Item with two native rarity categories.",
        data: item("Prismatic Charm") },
    { id: "recipe-dawn", label: "Native: dawn recovery", description: "Charges recover at dawn using the world's native calendar.",
        data: item("Dawn Charm", { USAGE: { "Uses Spent": 0, "Uses Max": "3" }, RECOVERY: [{ Period: "dawn", Type: "recoverAll" }] }) },
    { id: "recipe-dusk", label: "Native: dusk recovery", description: "Charges recover at dusk using the world's native calendar.",
        data: item("Dusk Charm", { USAGE: { "Uses Spent": 0, "Uses Max": "3" }, RECOVERY: [{ Period: "dusk", Type: "recoverAll" }] }) }
];

/** Premium recipe bodies stay in the companion and are requested only through its compatible API. */
export function getItemRecipes() {
    const recipes = core.map(entry => ({ ...entry, data: structuredClone(entry.data), links: [] }));
    if (globalThis.game?.modules?.get?.("midi-qol")?.active) recipes.push({ id: "recipe-midi-item", label: "MIDI: Item automation settings",
        description: "Stores MIDI Item settings without running a macro.", links: [],
        data: item("Automated Charm", { AUTOMATION: { "midi-qol": { flags: { noProvokeReaction: false, onUseMacroName: "" } } } }) });
    const companion = globalThis.game?.modules?.get?.("5e-activity-importer");
    if (companion?.active && getActivitySchemaCompatibility(companion.api).compatible) {
        for (const recipe of companion.api.recipes?.list?.({ availableOnly: true }) ?? []) {
            const blocks = Array.isArray(recipe.data) ? recipe.data : [recipe.data];
            const data = item(recipe.label.replace(/^[^:]+: /, ""), { Activities: blocks });
            recipes.push({ ...recipe, id: "companion-" + recipe.id, label: "Activity Importer: " + recipe.label,
                data, links: recipe.links.map(link => ({ ...link, path: "EQUIPMENT.Activities.0." + link.path })) });
        }
    }
    return recipes.map(recipe => ({ ...recipe, text: yaml.dump(recipe.data, { lineWidth: -1, noRefs: true }).trim() }));
}
