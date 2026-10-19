import test from "node:test";
import assert from "node:assert/strict";
import { ImportViewLayout, normalizeViewPreferences } from "../scripts/ui/importViewLayout.js";
import { restoreImportSettingDefaults } from "../scripts/ui/importWindowDefaults.js";

const root = { addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] };
const createStorage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const create = (storage, overrides = {}) => new ImportViewLayout(root, { moduleId: "importer", prefix: "ii", userId: "user", worldId: "world", storage, ...overrides });

test("Invalid or old preferences fail open to the original full preview", () => {
    for (const value of [undefined, null, false, [], 0, { preview: "hidden" }, { preview: "FULL" }]) {
        assert.equal(normalizeViewPreferences(value).preview, "full");
    }
    assert.deepEqual(normalizeViewPreferences({ panels: { options: false, history: true, bad: "false" }, compact: { Detail: true }, text: "private" }), {
        preview: "full", showYaml: false, showHelp: false, showHistory: false, panels: { options: false, history: true }, full: {}, compact: { Detail: true }
    });
});

test("Preference persistence is isolated by module, world, and user", () => {
    const storage = createStorage();
    const first = create(storage);
    first.preferences.preview = "compact";
    first.preferences.showYaml = true;
    first.preferences.showHelp = true;
    first.preferences.showHistory = true;
    first.preferences.panels.history = true;
    first.preferences.compact.Detail = false;
    first.save();
    assert.deepEqual(create(storage).preferences, first.preferences);
    for (const override of [{ moduleId: "companion" }, { worldId: "other" }, { userId: "other" }]) {
        assert.deepEqual(create(storage, override).preferences, normalizeViewPreferences());
    }
});

test("Unavailable or corrupt local storage never blocks an importer", () => {
    const storage = { getItem() { throw new Error("unavailable"); }, setItem() { throw new Error("quota"); } };
    const layout = create(storage);
    assert.equal(layout.preferences.preview, "full");
    assert.doesNotThrow(() => layout.save());
    assert.equal(create({ getItem: () => "{broken" }).preferences.preview, "full");
});

test("Saved section preferences are bounded and contain only booleans", () => {
    const compact = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`Section ${i}`, true]));
    compact["X".repeat(300)] = true;
    compact.private = { source: "should not persist" };
    const normalized = normalizeViewPreferences({ compact });
    assert.equal(Object.keys(normalized.compact).length, 100);
    assert.equal(normalized.compact.private, undefined);
});

test("Restore uses registered defaults and leaves stored content untouched", async () => {
    const values = { autoParse: true, presets: { draft: "keep" }, lastDestination: { kind: "actor" } };
    const settings = {
        settings: new Map([["importer.autoParse", { scope: "client", default: false }]]),
        get: (_module, key) => values[key],
        set: async (_module, key, value) => { values[key] = value; }
    };
    assert.deepEqual(await restoreImportSettingDefaults("importer", "ai", settings), { autoParse: false });
    assert.deepEqual(values, { autoParse: false, presets: { draft: "keep" }, lastDestination: { kind: "actor" } });
});

test("A failed settings write restores preferences already changed", async () => {
    const keys = ["autoParse", "useSemanticIcons", "createIdentified", "matchIcons", "compendiumImageMode"];
    const values = Object.fromEntries(keys.map(key => [key, false]));
    const settings = {
        settings: new Map(keys.map(key => [`importer.${key}`, { scope: "client", default: true }])),
        get: (_module, key) => values[key],
        set: async (_module, key, value) => {
            if (key === "matchIcons" && value === true) throw new Error("Storage unavailable");
            values[key] = value;
        }
    };
    await assert.rejects(restoreImportSettingDefaults("importer", "ii", settings), /Storage unavailable/);
    assert.ok(Object.values(values).every(value => value === false));
});
