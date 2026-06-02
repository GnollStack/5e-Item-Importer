/**
 * Mutating MCP diagnostics for dedicated test worlds.
 *
 * All fixture cleanup requires both a visible fixture name prefix and a
 * module-owned fixture flag.
 */

import { MODULE_NAME } from "./itemConfig.js";
import { ItemUtils } from "./itemUtils.js";
import { parseItemText } from "./parserRouting.js";

export const FIXTURE_PREFIX = "5E-ITEM-IMPORTER-MCP-FIXTURE";
export const FIXTURE_FLAG = "mcpAutomationFixture";

const FIXTURE_ITEM_TEXT = [
    "name: MCP Fixture Longsword",
    "type: weapon",
    "rarity: common",
    "weaponType: martialM",
    "baseWeapon: longsword",
    "damage: 1d8 slashing",
    "properties: versatile",
    "versatileFormula: 1d10",
    "price: 1 gp",
    "weight: 3 lb",
    "description: Temporary MCP diagnostics fixture."
].join("\n");

export function getFixtureCounts(runId = null) {
    const fixtures = findFixtureItems(runId);
    return {
        total: fixtures.length,
        itemIds: fixtures.map(item => item.id),
        names: fixtures.map(item => item.name)
    };
}

export async function runItemImporterAutomation(args = {}) {
    if (args.confirmMutation !== true) {
        return {
            success: false,
            error: "confirmMutation: true is required."
        };
    }

    const runId = normalizeRunId(args.runId);
    const cleanupBefore = args.cleanupBefore !== false;
    const cleanupAfter = args.cleanupAfter !== false;
    const steps = [];
    const countsBefore = getWorldDocumentCounts();

    if (cleanupBefore) {
        steps.push({
            step: "cleanupBefore",
            ...(await cleanupItemImporterFixtures({ confirmMutation: true, runId }))
        });
    }

    const marker = createFixtureMarker(runId, "Item");
    const createdItem = await createFixtureItem(marker);
    steps.push({
        step: "createItemFixture",
        success: Boolean(createdItem),
        item: summarizeItem(createdItem)
    });

    let cleanupAfterResult = null;
    if (cleanupAfter) {
        cleanupAfterResult = await cleanupItemImporterFixtures({ confirmMutation: true, runId });
        steps.push({
            step: "cleanupAfter",
            ...cleanupAfterResult
        });
    }

    const countsAfter = getWorldDocumentCounts();
    const remainingFixtures = getFixtureCounts(runId);

    return {
        success: Boolean(createdItem) && (!cleanupAfter || remainingFixtures.total === 0),
        runId,
        cleanupBefore,
        cleanupAfter,
        counts: {
            before: countsBefore,
            after: countsAfter
        },
        created: summarizeItem(createdItem),
        cleanupAfterResult,
        remainingFixtures,
        steps
    };
}

export async function cleanupItemImporterFixtures(args = {}) {
    if (args.confirmMutation !== true) {
        return {
            success: false,
            error: "confirmMutation: true is required."
        };
    }

    const runId = normalizeRunId(args.runId, { allowEmpty: true });
    const before = getFixtureCounts(runId);
    const fixtures = findFixtureItems(runId);
    const itemIds = fixtures.map(item => item.id).filter(Boolean);

    if (itemIds.length > 0) {
        await CONFIG.Item.documentClass.deleteDocuments(itemIds);
    }

    const after = getFixtureCounts(runId);

    return {
        success: true,
        runId: runId || null,
        fixturePrefix: FIXTURE_PREFIX,
        fixtureFlag: FIXTURE_FLAG,
        before,
        after,
        deleted: itemIds.length,
        deletedIds: itemIds
    };
}

async function createFixtureItem(marker) {
    const parsed = parseItemText(FIXTURE_ITEM_TEXT);
    if (!parsed?.success || !parsed.item) {
        throw new Error(`Fixture parse failed: ${(parsed?.errors ?? ["Unknown parser error"]).join("; ")}`);
    }

    await parsed.item.buildFoundryData({ deterministicIcons: true });
    const itemData = ItemUtils.deepClone(parsed.item.toJSON?.().foundryData ?? parsed.item.itemData ?? {});
    itemData.name = marker.fixtureName;
    itemData.flags = {
        ...(itemData.flags ?? {}),
        [MODULE_NAME]: {
            ...(itemData.flags?.[MODULE_NAME] ?? {}),
            [FIXTURE_FLAG]: marker
        }
    };

    return CONFIG.Item.documentClass.create(itemData);
}

function findFixtureItems(runId = null) {
    return collectionValues(game.items).filter(item => isFixtureItem(item, runId));
}

function isFixtureItem(item, runId = null) {
    const marker = getFixtureMarker(item);
    const name = String(item?.name ?? "");
    const markerName = String(marker?.fixtureName ?? "");
    const requestedRunId = normalizeRunId(runId, { allowEmpty: true });

    if (!name.startsWith(FIXTURE_PREFIX)) return false;
    if (!marker || typeof marker !== "object") return false;
    if (!markerName.startsWith(FIXTURE_PREFIX)) return false;
    if (marker.worldId !== getWorldId()) return false;
    if (requestedRunId && marker.runId !== requestedRunId) return false;

    return true;
}

function getFixtureMarker(document) {
    if (typeof document?.getFlag === "function") {
        return document.getFlag(MODULE_NAME, FIXTURE_FLAG) ?? null;
    }
    return document?.flags?.[MODULE_NAME]?.[FIXTURE_FLAG] ?? null;
}

function createFixtureMarker(runId, fixtureName) {
    const fullName = `${FIXTURE_PREFIX} ${runId} ${fixtureName}`;
    return {
        runId,
        fixtureName: fullName,
        worldId: getWorldId(),
        sceneId: canvas?.scene?.id ?? null,
        createdAt: new Date().toISOString()
    };
}

function normalizeRunId(value, { allowEmpty = false } = {}) {
    if (typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value.trim())) {
        return value.trim();
    }
    if (allowEmpty) return "";
    return ItemUtils.randomID();
}

function getWorldId() {
    return game.world?.id ?? null;
}

function getWorldDocumentCounts() {
    return {
        actors: Number(game.actors?.size ?? game.actors?.length ?? 0),
        items: Number(game.items?.size ?? game.items?.length ?? 0),
        scenes: Number(game.scenes?.size ?? game.scenes?.length ?? 0),
        activeSceneTokens: Number(canvas?.scene?.tokens?.size ?? canvas?.scene?.tokens?.length ?? 0)
    };
}

function collectionValues(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (typeof collection.values === "function") return Array.from(collection.values());
    if (Array.isArray(collection.contents)) return collection.contents;
    if (typeof collection === "object") return Object.values(collection);
    return [];
}

function summarizeItem(item) {
    if (!item) return null;
    return {
        id: item.id ?? null,
        uuid: item.uuid ?? null,
        name: item.name ?? null,
        type: item.type ?? null,
        img: item.img ?? null
    };
}
