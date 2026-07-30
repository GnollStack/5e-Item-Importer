/**
 * Focused non-mutating regressions for the destination/workflow integration.
 * Run in a browser console with:
 *   (await import("/modules/5e-item-importer/tests/foundry/itemPlatformFeatureTests.js")).runItemPlatformFeatureTests()
 */

import { ItemData } from "../../scripts/itemData.js";
import { parseItemText } from "../../scripts/parserRouting.js";
import { exportStrictItemYaml } from "../../scripts/itemYamlExporter.js";
import { ITEM_TEMPLATES } from "../../scripts/ui/itemTemplates.js";
import { renderBatchComparisonSummary } from "../../scripts/ui/itemComparisonRenderer.js";
import { getQuickStats, getSpecialProperties } from "../../scripts/ui/itemWindowRenderer.js";
import { buildBatchImportQueue } from "../../scripts/ui/itemImportWorkflow.js";
import {
    beginImportSession,
    clearSessionHistoryForTests,
    completeImportSession,
    formatImportReport,
    getImportHistory,
    hasStructuredDragData,
    isPresetStorageWithinLimit,
    isWorkflowMutationBusy,
    MAX_PRESET_STORAGE_LENGTH,
    MAX_PRESET_TEXT_LENGTH,
    normalizeCapturedAttachmentValues,
    recordImportResult
} from "../../scripts/ui/itemWorkflowServices.js";

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function castRaw(uuid = "n/a", name = "Cast Fireball") {
    return {
        ACTIVITY_CAST: {
            ACTIVITY: { Name: name, Icon: "n/a" },
            CASTING_DETAILS: { "Item Name": "Fireball", "Item UUID": uuid }
        }
    };
}

async function testResolvedUuidProvenance() {
    const item = new ItemData("Resolved UUID");
    item.pendingActivities = [{ key: "ACTIVITY_CAST", name: "Cast Fireball", rawData: castRaw() }];
    const resolved = castRaw("Compendium.dnd5e.spells.Item.fireball");
    const prepared = await item.collectActivityResults([{
        success: true,
        resultType: "activity",
        activityType: "cast",
        activityData: { name: "Cast Fireball", spell: { uuid: "Compendium.dnd5e.spells.Item.fireball" } },
        rawData: resolved
    }]);
    assert(prepared.blockingIssues.length === 0, "Resolved UUID-only rawData changes must remain importable.");
    assert(
        item.pendingActivities[0].rawData.ACTIVITY_CAST.CASTING_DETAILS["Item UUID"]
            === "Compendium.dnd5e.spells.Item.fireball",
        "Resolved UUID rawData should synchronize back to the Item attachment source."
    );

    const tampered = castRaw("Compendium.dnd5e.spells.Item.fireball", "Cast Lightning Bolt");
    const rejected = await item.collectActivityResults([{
        success: true,
        resultType: "activity",
        activityType: "cast",
        activityData: { name: "Cast Lightning Bolt" },
        rawData: tampered
    }]);
    assert(rejected.blockingIssues.length === 1, "Non-UUID provenance changes must fail closed.");
}

function testInlineIdCollisionFailsClosed() {
    const item = new ItemData("Collision");
    const createdItem = {
        system: { activities: new Map([["existing-id", { id: "existing-id" }]]) },
        effects: new Map()
    };
    let threw = false;
    try {
        item.prepareInlineAttachmentPlan([{
            success: true,
            resultType: "activity",
            activityType: "utility",
            activityData: { _id: "existing-id", name: "Collision" },
            embeddedEffectResults: []
        }], createdItem);
    } catch {
        threw = true;
    }
    assert(threw, "Requested Activity IDs colliding with existing embedded documents must fail closed.");

    const effectItem = new ItemData("Effect Collision");
    let existingEffectThrew = false;
    try {
        effectItem.prepareInlineAttachmentPlan([{
            success: true,
            resultType: "effect",
            effectData: { _id: "existing-effect", name: "Existing Collision" }
        }], {
            system: { activities: new Map() },
            effects: new Map([["existing-effect", { id: "existing-effect" }]])
        });
    } catch {
        existingEffectThrew = true;
    }
    assert(existingEffectThrew, "Requested Active Effect IDs colliding with existing effects must fail closed.");

    let duplicateEffectThrew = false;
    try {
        effectItem.prepareInlineAttachmentPlan([
            { success: true, resultType: "effect", effectData: { _id: "shared-effect", name: "First" } },
            { success: true, resultType: "effect", effectData: { _id: "shared-effect", name: "Second" } }
        ], {
            system: { activities: new Map() },
            effects: new Map()
        });
    } catch {
        duplicateEffectThrew = true;
    }
    assert(duplicateEffectThrew, "Duplicate requested Active Effect IDs must fail the complete attachment batch.");
}

function testRecursiveMergeSignatures() {
    const existingItem = {
        uuid: "Item.existing",
        name: "Nested Merge",
        toObject: () => ({
            name: "Nested Merge",
            type: "weapon",
            system: {
                recovery: [{ period: "day", details: { formula: "1" } }],
                markers: new Set([{ nested: { value: 1 } }]),
                activities: new Map()
            },
            effects: []
        })
    };
    const incoming = {
        name: "Nested Merge",
        type: "weapon",
        system: {
            recovery: [
                { period: "day", details: { formula: "1" } },
                { period: "day", details: { formula: "2" } }
            ],
            markers: new Set([
                { nested: { value: 1 } },
                { nested: { value: 2 } }
            ])
        }
    };
    const plan = ItemData.buildExistingOperationPlan(existingItem, incoming, "merge");
    assert(plan.updateData.system.recovery.length === 2, "Nested array objects must not collapse during merge.");
    assert(plan.updateData.system.markers.size === 2, "Nested Set objects must not collapse during merge.");
}

function testExistingAttachmentDedupe() {
    const item = new ItemData("Dedupe");
    const rawData = castRaw("Compendium.dnd5e.spells.Item.fireball");
    const existing = {
        system: {
            activities: new Map([["cast-id", {
                flags: { "5e-item-importer": { strictYaml: rawData } }
            }]])
        },
        effects: new Map()
    };
    const signatures = item.existingInlineAttachmentSignatures(existing);
    assert(signatures.has(ItemData.inlineAttachmentSignature(rawData)), "Existing strict attachment provenance must dedupe reimports.");
}

function testUpdateClearsStaleAttunementQualifier() {
    const existingItem = {
        uuid: "Item.attunement",
        name: "Attunement Test",
        toObject: () => ({
            name: "Attunement Test",
            type: "weapon",
            system: { attunement: "required", activities: new Map() },
            flags: { "5e-item-importer": { attunementRequirement: "by a spellcaster" } },
            effects: []
        })
    };
    const incoming = {
        name: "Attunement Test",
        type: "weapon",
        system: { attunement: "" }
    };
    const update = ItemData.buildExistingOperationPlan(existingItem, incoming, "update");
    const merge = ItemData.buildExistingOperationPlan(existingItem, incoming, "merge");
    assert(
        update.updateData.flags?.["5e-item-importer"]?.["-=attunementRequirement"] === null,
        "Update should explicitly remove a stale module attunement qualifier."
    );
    assert(
        !Object.hasOwn(merge.updateData.flags?.["5e-item-importer"] ?? {}, "-=attunementRequirement"),
        "Conservative merge should not delete an existing attunement qualifier."
    );
}

function testNormalizedAttachmentRoundTrip() {
    const parsed = parseItemText(ITEM_TEMPLATES.find(template => template.id === "weapon").text);
    assert(parsed.success && parsed.item, "Quick weapon template should parse.");
    parsed.item.pendingActivities.push({
        key: "ACTIVITY_CAST",
        name: "Cast Fireball",
        rawData: castRaw("Compendium.dnd5e.spells.Item.fireball")
    });
    const normalized = exportStrictItemYaml(parsed.item, { includeActivities: true, includeEffects: true });
    const reparsed = parseItemText(normalized);
    assert(reparsed.success && reparsed.item?.pendingActivities?.length === 1, "Normalized YAML must retain pending automation on reparse.");
}

function testPresetStorageBoundary() {
    const make = count => Object.fromEntries(Array.from({ length: count }, (_, index) => [
        `preset-${index}`,
        {
            name: `Preset ${index}`,
            text: "x".repeat(MAX_PRESET_TEXT_LENGTH),
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        }
    ]));
    assert(isPresetStorageWithinLimit(make(2)), "Two maximum-sized presets should remain readable.");
    assert(!isPresetStorageWithinLimit(make(3)), `A write beyond the ${MAX_PRESET_STORAGE_LENGTH} character total cap must be rejected.`);
}

function testPlainTextDragClassification() {
    assert(!hasStructuredDragData({}), "Foundry's empty drag payload must be treated as ordinary text.");
    assert(hasStructuredDragData({ type: "Item", uuid: "Item.example" }), "Document drag payloads must remain structured.");
}

function testBatchPolicySnapshot() {
    const entryModes = [{ value: "update" }, { value: "skip" }];
    const window = {
        selectedBatchItems: new Set([0, 1]),
        element: {
            querySelector(selector) {
                const match = selector.match(/data-index="(\d+)"/);
                if (match) return entryModes[Number(match[1])];
                if (selector === "#ii-duplicate-mode") return { value: "create" };
                return null;
            }
        }
    };
    const parseState = {
        successes: [
            { success: true, item: { name: "First" } },
            { success: true, item: { name: "Second" } }
        ]
    };
    const queue = buildBatchImportQueue(window, parseState);
    entryModes[0].value = "merge";
    entryModes[1].value = "create";
    assert(queue.map(entry => entry.duplicateMode).join(",") === "update,skip",
        "Batch duplicate policies must remain fixed after the reviewed queue is built.");
}

async function testCancellationBeforeAttachmentWrites() {
    const fixture = ITEM_TEMPLATES.find(template => template.id === "loot")?.text;
    const parsed = parseItemText(fixture);
    assert(parsed.success && parsed.item, "Cancellation fixture must parse.");
    parsed.item.pendingActivities = [{
        key: "EFFECT",
        name: "Deferred Effect",
        rawData: { EFFECT: { DETAILS: { Name: "Deferred Effect" } } }
    }];

    const originalCreate = ItemData.createDocumentAtDestination;
    let cancelled = false;
    let attachmentWrites = 0;
    ItemData.createDocumentAtDestination = async () => {
        cancelled = true;
        return { uuid: "Item.cancel-after-core", name: parsed.item.name, type: parsed.item.type };
    };
    parsed.item.applyActivitiesSafely = async () => {
        attachmentWrites++;
        return { addedActivities: 0, addedEffects: 1, createdActivityIds: [], createdEffectIds: ["should-not-exist"], issues: [] };
    };
    try {
        const result = await parsed.item.createItem5e(null, {
            destination: { kind: "world", folderId: null },
            shouldCancel: () => cancelled,
            parsedActivityResults: [{
                success: true,
                resultType: "effect",
                effectData: { name: "Deferred Effect" }
            }]
        });
        assert(result.success === true && result.item?.uuid === "Item.cancel-after-core",
            "A completed core Item write must still be reported as successful.");
        assert(attachmentWrites === 0 && result.activityResults?.createdEffectIds?.length === 0,
            "Cancellation during the core write must stop before embedded attachment mutations.");
        assert(result.issues?.some(issue => issue.includes("skipped inline Activities and Active Effects")),
            "The successful partial result must clearly explain why attachments were skipped.");
    } finally {
        ItemData.createDocumentAtDestination = originalCreate;
    }
}

function testCancelledOperationHistory() {
    clearSessionHistoryForTests();
    const session = beginImportSession({
        destination: { kind: "world", folderId: null },
        duplicateMode: "update",
        sourceText: "test"
    });
    recordImportResult(session, {
        name: "Cancelled Update",
        type: "weapon",
        success: false,
        skipped: true,
        cancelled: true,
        operation: "update",
        issues: ["Duplicate operation cancelled before persistence."]
    });
    completeImportSession(session);
    const recorded = getImportHistory()[0]?.entries?.[0];
    assert(recorded?.cancelled === true && recorded?.success === false, "Cancelled mutations must remain distinct from successful skips.");
    assert(formatImportReport(getImportHistory()[0]).includes("[CANCELLED]"), "Session reports must label cancelled operations.");
    clearSessionHistoryForTests();
}

function testVerifiedUndoSnapshotCapture() {
    clearSessionHistoryForTests();
    const activity = {
        id: "activity-new",
        toObject: () => ({ _id: "activity-new", type: "utility", name: "Imported Activity", _stats: { modifiedTime: 1 } })
    };
    const effect = {
        id: "effect-new",
        toObject: () => ({ _id: "effect-new", name: "Imported Effect", changes: [], _stats: { modifiedTime: 1 } })
    };
    const document = {
        uuid: "Item.verifiedUndo",
        name: "Verified Undo",
        type: "weapon",
        system: { activities: new Map([[activity.id, activity]]) },
        effects: new Map([[effect.id, effect]]),
        toObject: () => ({
            _id: "verifiedUndo",
            name: "Verified Undo",
            type: "weapon",
            folder: "folder-a",
            ownership: { default: 0 },
            system: { quantity: 2, activities: new Map([[activity.id, activity]]) },
            effects: [effect.toObject()],
            _stats: { modifiedTime: 1 }
        })
    };
    const session = beginImportSession({ destination: { kind: "world", folderId: "folder-a" }, duplicateMode: "update" });
    recordImportResult(session, {
        success: true,
        operation: "update",
        document,
        beforeData: { name: "Verified Undo", system: { quantity: 1 } },
        activityResults: { createdActivityIds: [activity.id], createdEffectIds: [effect.id] }
    });
    completeImportSession(session);
    const recorded = getImportHistory()[0]?.entries?.[0];
    assert(recorded?.afterData?.folder === "folder-a", "Undo verification must capture post-import Item identity and location state.");
    assert(recorded?.afterData?.system?.quantity === 2, "Undo verification must capture the post-import core state.");
    assert(recorded?.afterEmbeddedData?.activities?.[activity.id]?.name === "Imported Activity", "Undo verification must capture imported Activity state.");
    assert(recorded?.afterEmbeddedData?.effects?.[effect.id]?.name === "Imported Effect", "Undo verification must capture imported Active Effect state.");
    assert(!Object.hasOwn(recorded.afterEmbeddedData.activities[activity.id], "_stats"), "Volatile embedded stats must not invalidate verified undo.");
    clearSessionHistoryForTests();
}

function testWorkflowMutationSerialization() {
    clearSessionHistoryForTests();
    const first = beginImportSession({ destination: { kind: "world", folderId: null }, duplicateMode: "create" });
    assert(isWorkflowMutationBusy(), "A running import session must reserve the workflow mutation lock.");
    let rejected = false;
    try {
        beginImportSession({ destination: { kind: "world", folderId: null }, duplicateMode: "create" });
    } catch {
        rejected = true;
    }
    assert(rejected, "A second import must be rejected while another mutation session is running.");
    completeImportSession(first);
    assert(!isWorkflowMutationBusy(), "Completing the import session must release the workflow mutation lock.");
    clearSessionHistoryForTests();
}

function testCapturedAttachmentRootNormalization() {
    const effect = normalizeCapturedAttachmentValues([{
        EFFECT: { DETAILS: { Name: "Captured Effect" } }
    }], { mode: "effect" });
    assert(effect[0]?.DETAILS?.Name === "Captured Effect" && !effect[0]?.EFFECT,
        "Captured effects must be unwrapped before insertion into the Item effects list.");
    const activity = normalizeCapturedAttachmentValues([{
        ACTIVITY_UTILITY: { ACTIVITY: { Name: "Captured Utility" } }
    }], { mode: "activity" });
    assert(activity[0]?.ACTIVITY_UTILITY?.ACTIVITY?.Name === "Captured Utility",
        "Captured Activities must retain their canonical ACTIVITY_* root.");
    let rejected = false;
    try {
        normalizeCapturedAttachmentValues([{ EFFECT: { EFFECT: {} } }], { mode: "activity" });
    } catch {
        rejected = true;
    }
    assert(rejected, "Captured attachment roots must be validated before normalized YAML is rewritten.");
}

function testPreviewAndComparisonAccounting() {
    const previewItem = {
        type: "weapon",
        costDisplay: 5,
        costDenomination: "sp",
        weight: 0,
        quantity: 1,
        uses: { value: 2, max: 5 },
        properties: [],
        recovery: []
    };
    const quickStats = getQuickStats(previewItem);
    const special = getSpecialProperties(previewItem);
    assert(quickStats.some(entry => entry.label === "Cost" && entry.value === "5 sp"), "Preview cards must show modern costDisplay prices.");
    assert(special.some(entry => entry.label === "Uses" && entry.value === "3/5"), "Preview cards must show remaining uses, not spent uses.");

    const itemData = new ItemData("Price");
    itemData.costDisplay = 5;
    itemData.costDenomination = "sp";
    assert(itemData.costInGold() === 0.5 && itemData.toJSON().cost === 0.5, "Diagnostics must convert modern denomination prices to gold.");

    const html = renderBatchComparisonSummary([{
        label: "Extra Field",
        diffReport: {
            matches: 1,
            mismatches: [],
            missing: [],
            extra: [{ label: "Unexpected", actual: "present" }]
        }
    }]);
    assert(html.includes("1 Extra") && html.includes("1 issue") && html.includes("not in template") && !html.includes("All Items Match"),
        "Batch comparison summaries must count and render extra properties.");
}

export async function runItemPlatformFeatureTests() {
    const tests = [
        ["resolved UUID provenance", testResolvedUuidProvenance],
        ["Activity ID collision", testInlineIdCollisionFailsClosed],
        ["recursive merge signatures", testRecursiveMergeSignatures],
        ["existing attachment dedupe", testExistingAttachmentDedupe],
        ["stale attunement qualifier update", testUpdateClearsStaleAttunementQualifier],
        ["normalized attachment round-trip", testNormalizedAttachmentRoundTrip],
        ["preset storage boundary", testPresetStorageBoundary],
        ["plain-text drag classification", testPlainTextDragClassification],
        ["batch policy snapshot", testBatchPolicySnapshot],
        ["cancellation before attachment writes", testCancellationBeforeAttachmentWrites],
        ["cancelled operation history", testCancelledOperationHistory],
        ["verified undo snapshot capture", testVerifiedUndoSnapshotCapture],
        ["workflow mutation serialization", testWorkflowMutationSerialization],
        ["captured attachment root normalization", testCapturedAttachmentRootNormalization],
        ["preview and comparison accounting", testPreviewAndComparisonAccounting]
    ];
    const results = [];
    for (const [name, test] of tests) {
        try {
            await test();
            results.push({ name, success: true });
        } catch (error) {
            results.push({ name, success: false, error: error?.message || String(error) });
        }
    }
    return {
        success: results.every(result => result.success),
        passed: results.filter(result => result.success).length,
        total: results.length,
        results
    };
}
