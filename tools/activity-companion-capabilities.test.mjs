import test from "node:test";
import assert from "node:assert/strict";
import { ItemData } from "../scripts/itemData.js";
import { getActivityCapabilities, parseActivities, openActivityBuilder } from "../scripts/ui/itemFeatureAdapters.js";
import { withCompatibleActivityCompanion } from "../tests/helpers/compatibleActivityCompanion.js";

const rawData = { ACTIVITY_CHECK: {
    ACTIVITY: { Name: "Schema 4 Check", Description: "Keep this description" },
    CHECK_DETAILS: { "Check Ability": "wis", "Roll Bonus": "@prof", "Visible to All": true }
} };
function item() {
    const value = new ItemData("Schema compatibility fixture");
    value.pendingActivities = [{ key: "ACTIVITY_CHECK", name: "Schema 4 Check", rawData: structuredClone(rawData) }];
    return value;
}
function api(version = 4) {
    return {
        schemaVersion: 2,
        capabilities: { serialization: { strictActivity: { schemaVersion: version }, strictEffect: { schemaVersion: version } } },
        parseAll: () => [{ success: true, activityType: "check", activityData: {
            name: "Schema 4 Check", description: { value: "Keep this description" },
            check: { ability: "wis", bonus: "@prof", visible: true }
        } }],
        serializeActivity() {}, serializeEffect() {}, openBuilder() { return "builder"; }
    };
}
async function withCompanion(companion, callback) {
    const previous = globalThis.game;
    globalThis.game = { modules: new Map(companion ? [["5e-activity-importer", companion]] : []) };
    try { return await callback(); } finally {
        if (previous === undefined) delete globalThis.game;
        else globalThis.game = previous;
    }
}

test("old, unknown, and future strict schemas cannot silently discard new attachment fields", async () => {
    for (const version of [2, 3, null, 5]) {
        const companionApi = api(version);
        let parses = 0;
        companionApi.parseAll = () => { parses++; return [{ success: true, activityData: { check: { ability: "wis" } } }]; };
        await withCompanion({ active: true, api: companionApi }, async () => {
            const result = await item().collectActivityResults();
            assert.equal(result.results, null);
            assert.match(result.blockingIssues[0], /schema 4 Activity and Effect support/);
            assert.equal(parses, 0);
            assert.equal(getActivityCapabilities().fullSerialization, false);
            assert.equal(getActivityCapabilities().builder, false);
            await assert.rejects(parseActivities("schema 4 source"), /schema 4/);
            await assert.rejects(openActivityBuilder(), /schema 4/);
        });
    }
});

test("pre-parsed attachments cannot bypass the schema capability gate", async () => {
    const results = api().parseAll();
    await withCompanion({ active: true, api: api(2) }, async () => {
        const result = await item().collectActivityResults(results);
        assert.equal(result.results, null);
        assert.match(result.blockingIssues[0], /entire inline attachment batch was blocked/);
    });
});

test("both strict descriptors are required independently of the feature envelope version", async () => {
    const companionApi = api();
    companionApi.capabilities.serialization.strictEffect.schemaVersion = 2;
    await withCompanion({ active: true, api: companionApi }, async () => {
        assert.equal((await item().collectActivityResults()).results, null);
        assert.equal(getActivityCapabilities().compatible, false);
    });
    await withCompanion({ active: true, api: api() }, async () => {
        const result = await item().collectActivityResults();
        assert.deepEqual(result.blockingIssues, []);
        assert.equal(result.results[0].activityData.description.value, "Keep this description");
        assert.equal(result.results[0].activityData.check.bonus, "@prof");
        assert.equal(result.results[0].activityData.check.visible, true);
        const capabilities = getActivityCapabilities();
        assert.equal(capabilities.schemaVersion, 2);
        assert.equal(capabilities.compatible, true);
        assert.equal(capabilities.fullSerialization, true);
        assert.equal((await parseActivities("schema 4 source"))[0].activityData.check.visible, true);
        assert.equal(await openActivityBuilder(), "builder");
    });
});

test("standalone core Items do not require a companion or attachment capabilities", async () => {
    for (const companion of [null, { active: false, api: api() }, { active: true, api: api(2) }]) {
        await withCompanion(companion, async () => {
            assert.deepEqual(await new ItemData("Core only").collectActivityResults(), { results: [], issues: [], blockingIssues: [] });
        });
    }
});

test("isolated current-companion fixtures work without changing the live inactive companion", async () => {
    const inactive = { active: false, api: api() };
    await withCompanion(inactive, async () => {
        const fixture = withCompatibleActivityCompanion(item());
        const prepared = await fixture.collectActivityResults(api().parseAll());
        assert.deepEqual(prepared.blockingIssues, []);
        assert.equal(prepared.results.length, 1);
        const blocked = await item().collectActivityResults(api().parseAll());
        assert.equal(blocked.results, null);
        assert.match(blocked.blockingIssues[0], /not active/);
        assert.equal(globalThis.game.modules.get("5e-activity-importer"), inactive);
        assert.equal(inactive.active, false);
    });
});
