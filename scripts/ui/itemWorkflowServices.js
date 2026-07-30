/**
 * Item importer workflow services.
 *
 * These helpers deliberately keep persistent state small:
 * - presets are client-local Foundry settings;
 * - import history and undo snapshots live only for the current browser session.
 */

import { MODULE_NAME } from "../itemConfig.js";
import { ItemUtils } from "../itemUtils.js";

export const ITEM_WORKFLOW_SCHEMA_VERSION = 2;
export const MAX_PRESET_TEXT_LENGTH = 250_000;
export const MAX_SAVED_PRESETS = 50;
export const MAX_PRESET_STORAGE_LENGTH = 750_000;
export const MAX_IMPORT_HISTORY = 25;

const importHistory = [];
const undoInProgress = new Set();

function nowIso() {
    return new Date().toISOString();
}

function randomId() {
    try {
        return foundry.utils.randomID();
    } catch {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
}

function clone(value) {
    try {
        return foundry.utils.deepClone(value);
    } catch {
        return ItemUtils.deepClone(value);
    }
}

export function localize(key, fallback, data = null) {
    try {
        const translated = data
            ? game.i18n.format(key, data)
            : game.i18n.localize(key);
        if (translated && translated !== key) return translated;
    } catch {
        // A plain English fallback keeps diagnostics and isolated tests usable.
    }
    if (!data) return fallback;
    return String(fallback).replace(/\{([^}]+)\}/g, (_match, token) => data[token] ?? `{${token}}`);
}

export function normalizeCapturedAttachmentValues(values, { mode = "activity" } = {}) {
    const normalizedMode = mode === "effect" ? "effect" : "activity";
    return Array.from(values ?? []).map((value, index) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error(`Captured ${normalizedMode} ${index + 1} is not a strict object.`);
        }
        const roots = Object.keys(value);
        const expectedRoot = normalizedMode === "effect"
            ? roots.length === 1 && roots[0] === "EFFECT"
            : roots.length === 1 && /^ACTIVITY_[A-Z0-9_]+$/.test(roots[0]);
        const body = expectedRoot ? value[roots[0]] : null;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            throw new Error(localize(
                "II.Errors.CapturedAttachmentRoot",
                "Captured {mode} {index} does not have one canonical strict root.",
                { mode: normalizedMode, index: index + 1 }
            ));
        }
        return clone(normalizedMode === "effect" ? body : value);
    });
}

/** Foundry returns an empty object for ordinary non-JSON text drags. */
export function hasStructuredDragData(value) {
    return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

function isSafePresetId(id) {
    return typeof id === "string"
        && /^[A-Za-z0-9_-]{1,128}$/.test(id)
        && !["__proto__", "prototype", "constructor"].includes(id.toLowerCase());
}

export function getPresetStorageLength(presets) {
    try {
        return JSON.stringify(presets ?? {}).length;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

export function isPresetStorageWithinLimit(presets) {
    return getPresetStorageLength(presets) <= MAX_PRESET_STORAGE_LENGTH;
}

function assertPresetStorageWithinLimit(presets) {
    if (isPresetStorageWithinLimit(presets)) return;
    throw new Error(localize(
        "II.Errors.PresetStorageLimit",
        "Saved presets exceed the {max} character storage limit.",
        { max: MAX_PRESET_STORAGE_LENGTH }
    ));
}

function getPresetSetting() {
    try {
        const stored = game.settings.get(MODULE_NAME, "savedPresets");
        if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
        if (getPresetStorageLength(stored) > MAX_PRESET_STORAGE_LENGTH) return {};
        const result = Object.create(null);
        let count = 0;
        for (const [id, value] of Object.entries(stored)) {
            if (count >= MAX_SAVED_PRESETS) break;
            if (!isSafePresetId(id)) continue;
            const normalized = normalizePreset(id, value);
            if (!normalized) continue;
            result[id] = normalized;
            count++;
        }
        assertPresetStorageWithinLimit(result);
        return clone(result);
    } catch {
        return {};
    }
}

function normalizePreset(id, value) {
    if (!isSafePresetId(id) || !value || typeof value !== "object") return null;
    const text = typeof value.text === "string" ? value.text : "";
    const name = typeof value.name === "string" ? value.name.trim() : "";
    if (!name || name.length > 100 || !text.trim() || text.length > MAX_PRESET_TEXT_LENGTH) return null;
    return {
        id,
        name,
        text,
        createdAt: value.createdAt || nowIso(),
        updatedAt: value.updatedAt || value.createdAt || nowIso()
    };
}

export function listSavedPresets() {
    return Object.entries(getPresetSetting())
        .map(([id, value]) => normalizePreset(id, value))
        .filter(Boolean)
        .sort((left, right) => left.name.localeCompare(right.name));
}

export async function savePreset(name, text, { id = null } = {}) {
    const cleanName = String(name ?? "").trim();
    const cleanText = String(text ?? "");
    if (!cleanName) throw new Error(localize("II.Errors.PresetNameRequired", "Enter a preset name."));
    if (cleanName.length > 100) {
        throw new Error(localize("II.Errors.PresetNameTooLong", "Preset names are limited to 100 characters."));
    }
    if (!cleanText.trim()) throw new Error(localize("II.Errors.PresetTextRequired", "Paste or generate item text before saving a preset."));
    if (cleanText.length > MAX_PRESET_TEXT_LENGTH) {
        throw new Error(localize(
            "II.Errors.PresetTooLarge",
            "Preset text exceeds the {max} character limit.",
            { max: MAX_PRESET_TEXT_LENGTH }
        ));
    }

    const rawStored = game.settings.get(MODULE_NAME, "savedPresets");
    assertPresetStorageWithinLimit(rawStored);
    const presets = getPresetSetting();
    const updatingExisting = id && Object.hasOwn(presets, id);
    if (!updatingExisting && Object.keys(presets).length >= MAX_SAVED_PRESETS) {
        throw new Error(localize(
            "II.Errors.PresetLimitReached",
            "You can save up to {max} presets.", { max: MAX_SAVED_PRESETS }
        ));
    }
    const presetId = id || randomId();
    if (!isSafePresetId(presetId)) {
        throw new Error(localize("II.Errors.PresetIdInvalid", "The preset identifier is invalid."));
    }
    const duplicate = Object.entries(presets)
        .map(([candidateId, value]) => normalizePreset(candidateId, value))
        .filter(Boolean)
        .find(preset =>
            preset.id !== presetId
            && preset.name.localeCompare(cleanName, undefined, { sensitivity: "accent" }) === 0
        );
    if (duplicate) {
        throw new Error(localize("II.Errors.PresetNameDuplicate", "A preset with that name already exists."));
    }
    const existing = normalizePreset(presetId, presets[presetId]);
    presets[presetId] = {
        name: cleanName,
        text: cleanText,
        createdAt: existing?.createdAt || nowIso(),
        updatedAt: nowIso()
    };
    assertPresetStorageWithinLimit(presets);
    await game.settings.set(MODULE_NAME, "savedPresets", presets);
    return normalizePreset(presetId, presets[presetId]);
}

export async function deletePreset(id) {
    if (!isSafePresetId(id)) return false;
    const presets = getPresetSetting();
    if (!Object.hasOwn(presets, id)) return false;
    delete presets[id];
    await game.settings.set(MODULE_NAME, "savedPresets", presets);
    return true;
}

function canOwnDocument(document) {
    if (!document || !game?.user) return false;
    try {
        if (typeof document.testUserPermission === "function") {
            return document.testUserPermission(game.user, "OWNER");
        }
    } catch {
        return false;
    }
    return document.isOwner === true || game.user.isGM === true;
}

function canUseActor(actor) {
    if (!actor) return false;
    try {
        if (typeof actor.canUserModify === "function") return actor.canUserModify(game.user, "update");
    } catch {
        return false;
    }
    return canOwnDocument(actor);
}

function canWritePack(pack) {
    if (!pack || pack.documentName !== "Item" || pack.locked) return false;
    try {
        const isOwner = typeof pack.testUserPermission === "function"
            ? pack.testUserPermission(game.user, "OWNER")
            : game?.user?.isGM === true;
        const documentClass = pack.documentClass ?? CONFIG?.Item?.documentClass;
        const canCreate = typeof documentClass?.canUserCreate === "function"
            ? documentClass.canUserCreate(game.user)
            : game?.user?.isGM === true;
        return isOwner && canCreate;
    } catch {
        return false;
    }
}

export function listActorDestinations() {
    const actors = Array.from(game?.actors ?? [])
        .filter(canUseActor)
        .map(actor => ({
            id: actor.id,
            uuid: actor.uuid,
            name: actor.name,
            img: actor.img
        }));
    return actors.sort((left, right) => left.name.localeCompare(right.name));
}

export function listCompendiumDestinations() {
    return Array.from(game?.packs ?? [])
        .filter(canWritePack)
        .map(pack => ({
            id: pack.collection,
            collection: pack.collection,
            name: pack.title,
            packageName: pack.metadata?.packageName ?? null
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeDestination(destination = {}) {
    const kind = ["world", "actor", "compendium"].includes(destination?.kind)
        ? destination.kind
        : "world";
    if (kind === "actor") {
        return { kind, actorUuid: String(destination.actorUuid ?? "") };
    }
    if (kind === "compendium") {
        return { kind, pack: String(destination.pack ?? "") };
    }
    return {
        kind: "world",
        folderId: destination.folderId ? String(destination.folderId) : null
    };
}

export function describeDestination(destination = {}) {
    const normalized = normalizeDestination(destination);
    if (normalized.kind === "actor") {
        const actor = game?.actors?.get?.(normalized.actorUuid)
            ?? Array.from(game?.actors ?? []).find(candidate => candidate.uuid === normalized.actorUuid);
        return actor?.name
            ? localize("II.Destination.ActorNamed", "Actor: {name}", { name: actor.name })
            : localize("II.Destination.Actor", "Actor");
    }
    if (normalized.kind === "compendium") {
        const pack = game?.packs?.get?.(normalized.pack);
        return pack?.title
            ? localize("II.Destination.CompendiumNamed", "Compendium: {name}", { name: pack.title })
            : localize("II.Destination.Compendium", "Compendium");
    }
    if (normalized.folderId) {
        const folder = game?.folders?.get?.(normalized.folderId);
        return folder?.name
            ? localize("II.Destination.FolderNamed", "Folder: {name}", { name: folder.name })
            : localize("II.Destination.World", "World Items");
    }
    return localize("II.Destination.World", "World Items");
}

export async function resolveDestination(destination = {}) {
    const normalized = normalizeDestination(destination);
    if (normalized.kind === "actor") {
        const actor = await fromUuid(normalized.actorUuid);
        if (!actor || actor.documentName !== "Actor") {
            throw new Error(localize("II.Errors.ActorDestinationMissing", "The selected Actor destination is unavailable."));
        }
        if (!canUseActor(actor)) {
            throw new Error(localize("II.Errors.ActorDestinationPermission", "You do not have permission to add Items to that Actor."));
        }
        return { ...normalized, actor };
    }
    if (normalized.kind === "compendium") {
        const pack = game.packs.get(normalized.pack);
        if (!pack) throw new Error(localize("II.Errors.PackDestinationMissing", "The selected Item compendium is unavailable."));
        if (!canWritePack(pack)) {
            throw new Error(localize("II.Errors.PackDestinationPermission", "The selected Item compendium is locked or not writable."));
        }
        return { ...normalized, packDocument: pack };
    }
    if (!game.user.hasPermission("ITEM_CREATE")) {
        throw new Error(localize("II.Errors.WorldDestinationPermission", "You do not have permission to create World Items."));
    }
    if (normalized.folderId) {
        const folder = game.folders.get(normalized.folderId);
        if (!folder || folder.type !== "Item") {
            throw new Error(localize("II.Errors.FolderDestinationMissing", "The selected Item folder is unavailable."));
        }
    }
    return normalized;
}

function normalizeName(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
}

function itemFolderId(item) {
    return item?.folder?.id ?? item?.folder ?? null;
}

export async function findDestinationDuplicate(destination, { name, type } = {}) {
    const normalized = await resolveDestination(destination);
    const targetName = normalizeName(name);
    if (!targetName) return null;

    const requireUniqueMatch = matches => {
        if (matches.length > 1) {
            throw new Error(localize(
                "II.Errors.AmbiguousDuplicate",
                "Found {count} matching Items named {name} in {destination}. Update, merge, and skip require a unique target; rename or remove duplicates first.",
                {
                    count: matches.length,
                    name: String(name ?? "Item"),
                    destination: describeDestination(normalized)
                }
            ));
        }
        return matches[0] ?? null;
    };

    if (normalized.kind === "actor") {
        const matches = Array.from(normalized.actor.items ?? []).filter(item =>
            normalizeName(item.name) === targetName && (!type || item.type === type)
        );
        return requireUniqueMatch(matches);
    }

    if (normalized.kind === "compendium") {
        const index = await normalized.packDocument.getIndex({ fields: ["name", "type"] });
        const matches = Array.from(index ?? []).filter(entry =>
            normalizeName(entry.name) === targetName && (!type || entry.type === type)
        );
        const match = requireUniqueMatch(matches);
        return match ? normalized.packDocument.getDocument(match._id) : null;
    }

    const matches = Array.from(game.items ?? []).filter(item =>
        normalizeName(item.name) === targetName
        && (!type || item.type === type)
        && itemFolderId(item) === normalized.folderId
    );
    return requireUniqueMatch(matches);
}

export async function createDestinationItem(source, destination) {
    const normalized = await resolveDestination(destination);
    const data = clone(source);
    if (normalized.kind !== "world") delete data.folder;

    const options = normalized.kind === "actor"
        ? { parent: normalized.actor }
        : normalized.kind === "compendium"
            ? { pack: normalized.pack }
            : {};

    if (normalized.kind === "world" && normalized.folderId) data.folder = normalized.folderId;
    const documents = await CONFIG.Item.documentClass.createDocuments([data], options);
    const created = Array.from(documents ?? [])[0] ?? null;
    if (!created) throw new Error(localize("II.Errors.DestinationCreateFailed", "Foundry did not return the created Item."));
    return created;
}

export function snapshotItemForUndo(item) {
    const source = item?.toObject?.() ?? item ?? {};
    const snapshot = {
        ...source,
        system: source.system && typeof source.system === "object"
            ? { ...source.system }
            : source.system
    };
    delete snapshot._id;
    delete snapshot.type;
    delete snapshot.folder;
    delete snapshot.effects;
    delete snapshot.ownership;
    delete snapshot._stats;
    if (snapshot.system && typeof snapshot.system === "object") {
        delete snapshot.system.activities;
    }
    return clone(snapshot);
}

function snapshotItemVerificationState(item) {
    const source = item?.toObject?.() ?? item ?? {};
    const snapshot = {
        ...source,
        system: source.system && typeof source.system === "object"
            ? { ...source.system }
            : source.system
    };
    delete snapshot.effects;
    delete snapshot._stats;
    if (snapshot.system && typeof snapshot.system === "object") {
        delete snapshot.system.activities;
    }
    return clone(snapshot);
}

function embeddedDocumentSnapshot(document) {
    if (!document) return null;
    const snapshot = clone(document?.toObject?.() ?? document);
    if (!snapshot || typeof snapshot !== "object") return null;
    delete snapshot._stats;
    return snapshot;
}

function collectionDocuments(collection) {
    if (!collection) return [];
    if (typeof collection.values === "function") return Array.from(collection.values());
    return Array.from(collection);
}

function collectionDocument(collection, id) {
    if (typeof collection?.get === "function") return collection.get(id) ?? null;
    return collectionDocuments(collection).find(document => (document?.id ?? document?._id) === id) ?? null;
}

function snapshotEmbeddedForUndo(item, {
    all = false,
    activityIds = [],
    effectIds = []
} = {}) {
    const activities = item?.system?.activities;
    const effects = item?.effects;
    const selectedActivityIds = all
        ? collectionDocuments(activities).map(document => document?.id ?? document?._id).filter(Boolean)
        : [...activityIds];
    const selectedEffectIds = all
        ? collectionDocuments(effects).map(document => document?.id ?? document?._id).filter(Boolean)
        : [...effectIds];
    return {
        activities: Object.fromEntries(selectedActivityIds.map(id => [id, embeddedDocumentSnapshot(collectionDocument(activities, id))])),
        effects: Object.fromEntries(selectedEffectIds.map(id => [id, embeddedDocumentSnapshot(collectionDocument(effects, id))]))
    };
}

export function beginImportSession({ destination, duplicateMode = "create", sourceText = "" } = {}) {
    if (isWorkflowMutationBusy()) {
        throw new Error(localize(
            "II.Errors.WorkflowMutationBusy",
            "Another import or undo operation is already in progress. Wait for it to finish before changing Items."
        ));
    }
    const session = {
        id: randomId(),
        schemaVersion: ITEM_WORKFLOW_SCHEMA_VERSION,
        startedAt: nowIso(),
        completedAt: null,
        destination: normalizeDestination(destination),
        destinationLabel: describeDestination(destination),
        duplicateMode,
        sourceText: String(sourceText ?? ""),
        status: "running",
        cancelled: false,
        entries: []
    };
    importHistory.unshift(session);
    if (importHistory.length > MAX_IMPORT_HISTORY) importHistory.length = MAX_IMPORT_HISTORY;
    return session;
}

export function recordImportResult(session, result = {}) {
    if (!session || !importHistory.includes(session)) return null;
    const createdActivityIds = [...(result.activityResults?.createdActivityIds ?? [])];
    const createdEffectIds = [...(result.activityResults?.createdEffectIds ?? [])];
    const shouldCaptureAfterState = result.success === true && result.skipped !== true && !!result.document;
    const operation = result.operation ?? "create";
    const afterEmbeddedScope = operation === "create" ? "all" : "created";
    const entry = {
        name: String(result.name ?? result.document?.name ?? "Unnamed Item"),
        type: result.type ?? result.document?.type ?? null,
        success: result.success === true,
        skipped: result.skipped === true,
        cancelled: result.cancelled === true,
        operation,
        uuid: result.document?.uuid ?? result.uuid ?? null,
        issues: Array.isArray(result.issues) ? [...result.issues] : [],
        beforeData: result.beforeData ? clone(result.beforeData) : null,
        afterData: shouldCaptureAfterState ? snapshotItemVerificationState(result.document) : null,
        afterEmbeddedScope: shouldCaptureAfterState ? afterEmbeddedScope : null,
        afterEmbeddedData: shouldCaptureAfterState
            ? snapshotEmbeddedForUndo(result.document, {
                all: afterEmbeddedScope === "all",
                activityIds: createdActivityIds,
                effectIds: createdEffectIds
            })
            : null,
        createdActivityIds,
        createdEffectIds,
        undoStatus: null
    };
    session.entries.push(entry);
    return entry;
}

export function completeImportSession(session, { cancelled = false } = {}) {
    if (!session || !importHistory.includes(session)) return null;
    session.completedAt = nowIso();
    session.cancelled = cancelled === true;
    session.status = cancelled ? "cancelled" : "complete";
    return session;
}

export function getImportHistory() {
    return clone(importHistory);
}

export function isWorkflowMutationBusy() {
    return undoInProgress.size > 0 || importHistory.some(session => session.status === "running");
}

export function getLastUndoableSession() {
    if (isWorkflowMutationBusy()) return null;
    return importHistory.find(session =>
        ["complete", "cancelled"].includes(session.status)
        && session.entries.some(entry => entry.success && !entry.skipped && entry.uuid
            && !["undone", "already-missing"].includes(entry.undoStatus))
    ) ?? null;
}

async function resolveSessionDocument(uuid) {
    try {
        return await fromUuid(uuid);
    } catch {
        return null;
    }
}

function snapshotSubsetMatches(actual, expected) {
    if (expected instanceof Map) {
        const actualEntries = actual instanceof Map
            ? [...actual.entries()]
            : actual && typeof actual === "object" ? Object.entries(actual) : [];
        const expectedEntries = [...expected.entries()];
        return snapshotSubsetMatches(actualEntries, expectedEntries);
    }
    if (expected instanceof Set) {
        const actualValues = actual instanceof Set ? [...actual] : Array.isArray(actual) ? actual : [];
        return JSON.stringify([...expected].sort()) === JSON.stringify([...actualValues].sort());
    }
    if (Array.isArray(expected)) {
        return Array.isArray(actual)
            && expected.length === actual.length
            && expected.every((value, index) => snapshotSubsetMatches(actual[index], value));
    }
    if (expected && typeof expected === "object") {
        if (!actual || typeof actual !== "object") return false;
        return Object.entries(expected).every(([key, value]) => snapshotSubsetMatches(actual[key], value));
    }
    return Object.is(actual, expected);
}

function snapshotsMatch(left, right) {
    return snapshotSubsetMatches(left, right) && snapshotSubsetMatches(right, left);
}

function assertUnchangedSinceImport(document, entry) {
    if (!entry.afterData) {
        throw new Error(localize("II.Errors.UndoAfterSnapshotMissing", "the verified post-import snapshot is unavailable"));
    }
    const currentData = snapshotItemVerificationState(document);
    if (!snapshotsMatch(currentData, entry.afterData)) {
        throw new Error(localize(
            "II.Errors.UndoItemChanged",
            "the Item changed after import; undo was refused to protect those edits"
        ));
    }
    if (entry.afterEmbeddedData) {
        const currentEmbedded = snapshotEmbeddedForUndo(document, {
            all: entry.afterEmbeddedScope === "all",
            activityIds: entry.createdActivityIds,
            effectIds: entry.createdEffectIds
        });
        if (!snapshotsMatch(currentEmbedded, entry.afterEmbeddedData)) {
            throw new Error(localize(
                "II.Errors.UndoEmbeddedChanged",
                "an imported Activity or Active Effect changed after import; undo was refused to protect those edits"
            ));
        }
    }
}

function assertRemainingEmbeddedUnchanged(document, entry) {
    if (!entry.afterEmbeddedData) {
        throw new Error(localize("II.Errors.UndoAfterSnapshotMissing", "the verified post-import snapshot is unavailable"));
    }
    const groups = [
        ["activities", document?.system?.activities, entry.createdActivityIds],
        ["effects", document?.effects, entry.createdEffectIds]
    ];
    for (const [group, collection, ids] of groups) {
        for (const id of ids) {
            const currentDocument = collectionDocument(collection, id);
            if (!currentDocument) continue;
            const expected = entry.afterEmbeddedData?.[group]?.[id];
            const current = embeddedDocumentSnapshot(currentDocument);
            if (!expected || !snapshotsMatch(current, expected)) {
                throw new Error(localize(
                    "II.Errors.UndoEmbeddedChanged",
                    "an imported Activity or Active Effect changed after import; undo was refused to protect those edits"
                ));
            }
        }
    }
}

function isPlainRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Set || value instanceof Map) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function buildRestorationPatch(before, current) {
    const patch = {};
    for (const key of Object.keys(current || {})) {
        if (!Object.hasOwn(before || {}, key)) patch[`-=${key}`] = null;
    }
    for (const [key, value] of Object.entries(before || {})) {
        if (isPlainRecord(value) && isPlainRecord(current?.[key])) {
            patch[key] = buildRestorationPatch(value, current[key]);
        } else {
            patch[key] = clone(value);
        }
    }
    return patch;
}

export async function undoImportSession(session) {
    if (!session || !importHistory.includes(session)) {
        throw new Error(localize("II.Errors.HistorySessionMissing", "That import session is no longer available."));
    }
    if (isWorkflowMutationBusy()) {
        throw new Error(localize(
            "II.Errors.WorkflowMutationBusy",
            "Another import or undo operation is already in progress. Wait for it to finish before changing Items."
        ));
    }
    undoInProgress.add(session.id);
    try {
        return await performUndoImportSession(session);
    } finally {
        undoInProgress.delete(session.id);
    }
}

async function performUndoImportSession(session) {
    const report = { undone: 0, failed: 0, skipped: 0, issues: [] };
    for (const entry of [...session.entries].reverse()) {
        if (!entry.success || entry.skipped || !entry.uuid || entry.undoStatus === "undone") {
            report.skipped++;
            continue;
        }

        const document = await resolveSessionDocument(entry.uuid);
        if (!document) {
            if (entry.operation === "create") {
                entry.undoStatus = "already-missing";
                report.skipped++;
            } else {
                entry.undoStatus = "missing";
                report.failed++;
                report.issues.push(`${entry.name}: the updated Item no longer exists`);
            }
            continue;
        }
        if (!canOwnDocument(document)) {
            entry.undoStatus = "permission";
            report.failed++;
            report.issues.push(`${entry.name}: ${localize("II.Errors.UndoPermission", "permission denied")}`);
            continue;
        }

        try {
            if (entry.operation === "create") {
                const marker = document.getFlag?.(MODULE_NAME, "importSessionId");
                if (marker !== session.id) {
                    throw new Error(localize("II.Errors.UndoMarkerMismatch", "the Item is not marked as created by this import session"));
                }
                assertUnchangedSinceImport(document, entry);
                await document.delete();
                if (await resolveSessionDocument(entry.uuid)) {
                    throw new Error("Foundry still resolves the Item after deletion");
                }
            } else {
                if (!entry.beforeData) {
                    throw new Error(localize("II.Errors.UndoSnapshotMissing", "the pre-import snapshot is unavailable"));
                }
                let restoredDocument = document;
                const currentSnapshot = snapshotItemForUndo(document);
                if (!snapshotsMatch(currentSnapshot, entry.beforeData)) {
                    assertUnchangedSinceImport(document, entry);
                    await document.update(buildRestorationPatch(entry.beforeData, currentSnapshot));
                    const refreshed = await resolveSessionDocument(entry.uuid);
                    restoredDocument = refreshed ?? document;
                    const actual = snapshotItemForUndo(restoredDocument);
                    if (!snapshotsMatch(actual, entry.beforeData)) {
                        throw new Error("restored Item data did not match the pre-import snapshot");
                    }
                }
                assertRemainingEmbeddedUnchanged(restoredDocument, entry);
                for (const id of [...entry.createdActivityIds].reverse()) {
                    if (restoredDocument.system?.activities?.has?.(id)) {
                        await restoredDocument.deleteActivity(id);
                    }
                }
                const effectIds = entry.createdEffectIds.filter(id => restoredDocument.effects?.has?.(id));
                if (effectIds.length > 0) {
                    await restoredDocument.deleteEmbeddedDocuments("ActiveEffect", effectIds);
                }
                const remainingActivities = entry.createdActivityIds.filter(id => restoredDocument.system?.activities?.has?.(id));
                const remainingEffects = entry.createdEffectIds.filter(id => restoredDocument.effects?.has?.(id));
                if (remainingActivities.length || remainingEffects.length) {
                    throw new Error(`embedded undo verification failed (activities: ${remainingActivities.join(", ") || "none"}; effects: ${remainingEffects.join(", ") || "none"})`);
                }
            }
            entry.undoStatus = "undone";
            report.undone++;
        } catch (error) {
            entry.undoStatus = "failed";
            report.failed++;
            report.issues.push(`${entry.name}: ${error?.message || String(error)}`);
        }
    }
    session.undoCompletedAt = nowIso();
    return report;
}

export function formatImportReport(session) {
    if (!session) return "";
    const lines = [
        "5e Item Importer - Session Report",
        `Session: ${session.id}`,
        `Started: ${session.startedAt}`,
        `Completed: ${session.completedAt || "in progress"}`,
        `Destination: ${session.destinationLabel}`,
        `Duplicate policy: ${session.duplicateMode}`,
        `Status: ${session.status}`,
        ""
    ];
    for (const entry of session.entries) {
        const status = entry.cancelled ? "CANCELLED" : entry.skipped ? "SKIPPED" : entry.success ? "OK" : "FAILED";
        lines.push(`[${status}] ${entry.name} (${entry.operation})${entry.uuid ? ` - ${entry.uuid}` : ""}`);
        for (const issue of entry.issues) lines.push(`  - ${issue}`);
    }
    return lines.join("\n");
}

export async function copyText(text) {
    const value = String(text ?? "");
    if (!value) return false;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
}

export function downloadText(text, filename, mime = "text/yaml") {
    const safeName = String(filename || "5e-item-export.yaml").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
    const blob = new Blob([String(text ?? "")], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function clearSessionHistoryForTests() {
    importHistory.length = 0;
    undoInProgress.clear();
}
