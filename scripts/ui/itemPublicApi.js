import { parseItemText, parseItemTextWithInsights } from "../parserRouting.js";
import {
    beginImportSession,
    completeImportSession,
    copyText,
    deletePreset,
    downloadText,
    findDestinationDuplicate,
    formatImportReport,
    getImportHistory,
    getLastUndoableSession,
    listActorDestinations,
    listCompendiumDestinations,
    listSavedPresets,
    normalizeDestination,
    recordImportResult,
    resolveDestination,
    savePreset,
    snapshotItemForUndo,
    undoImportSession
} from "./itemWorkflowServices.js";
import {
    exportCoreItemYaml,
    exportCoreItemYamlBatch,
    exportFullItemYaml,
    exportFullItemYamlBatch,
    exportItemYaml,
    exportItemYamlBatch,
    getActivityCapabilities,
    getItemFeatureCapabilities,
    getItemYamlSchemaVersion
} from "./itemFeatureAdapters.js";

export const ITEM_PUBLIC_API_SCHEMA_VERSION = 3;
export const ITEM_PUBLIC_API_CAPABILITIES = Object.freeze({
    strictYamlExport: true,
    strictYamlBatchExport: true,
    strictYamlCoreExport: true,
    strictYamlFullExport: true,
    exportModes: Object.freeze(["core", "full"]),
    parseInsights: true,
    destinations: Object.freeze(["world", "actor", "compendium"]),
    duplicatePolicies: Object.freeze(["create", "update", "merge", "skip"]),
    clientPresets: true,
    sessionHistory: true,
    confirmedUndo: true,
    activityIntegration: true,
    activityIntegrationOptional: true
});

const ATTACHMENT_EXPORT_OPTION_KEYS = Object.freeze([
    "includeActivities",
    "includeEffects",
    "includeAttachments",
    "includeEmbeddedEffects"
]);

function normalizePublicExportOptions(options = {}) {
    const normalized = { ...options };
    const mode = normalized.mode;
    delete normalized.mode;
    if (mode === "full") {
        return { ...normalized, includeActivities: true, includeEffects: true };
    }
    if (mode === "core") {
        return { ...normalized, includeActivities: false, includeEffects: false };
    }
    if (ATTACHMENT_EXPORT_OPTION_KEYS.some(key => Object.hasOwn(normalized, key))) {
        return normalized;
    }
    return { ...normalized, includeActivities: false, includeEffects: false };
}

function safeFilename(item, fallback = "5e-item") {
    return `${String(item?.name || fallback).trim() || fallback}.yaml`;
}

function normalizeImportOptions(folderOrOptions) {
    if (typeof folderOrOptions === "string" || folderOrOptions == null) {
        return { destination: { kind: "world", folderId: folderOrOptions || null } };
    }
    const options = { ...folderOrOptions };
    if (!options.destination && Object.hasOwn(options, "folderId")) {
        options.destination = { kind: "world", folderId: options.folderId || null };
    }
    options.destination ??= { kind: "world", folderId: null };
    return options;
}

async function importTextDetailed(text, folderOrOptions = {}) {
    const options = normalizeImportOptions(folderOrOptions);
    const parsed = parseItemText(text, {
        trace: options.trace ?? true,
        synthesizeAutomation: options.synthesizeAutomation === true
    });
    if (parsed?.success !== true || !parsed.item) {
        return { success: false, item: null, issues: [...(parsed?.errors || []), ...(parsed?.warnings || [])] };
    }

    const destination = await resolveDestination(normalizeDestination(options.destination));
    const duplicateMode = ITEM_PUBLIC_API_CAPABILITIES.duplicatePolicies.includes(options.duplicateMode)
        ? options.duplicateMode
        : "create";
    let session;
    try {
        session = beginImportSession({ destination, duplicateMode, sourceText: text });
    } catch (error) {
        return { success: false, item: null, issues: [error?.message || String(error)] };
    }
    let result;
    try {
        const existingItem = duplicateMode === "create"
            ? null
            : await findDestinationDuplicate(destination, { name: parsed.item.name, type: parsed.item.type });
        const operation = existingItem ? duplicateMode : "create";
        const beforeData = existingItem && ["update", "merge"].includes(operation)
            ? snapshotItemForUndo(existingItem)
            : null;
        result = await parsed.item.createItem5e(null, {
            ...options,
            destination,
            existingItem,
            operation,
            importSessionId: session.id,
            parsedActivityResults: parsed.item._parsedActivityResults || null,
            confirmOperation: options.confirmOperation
                ?? (async () => options.confirmExisting === true)
        });
        recordImportResult(session, {
            name: parsed.item.name,
            type: parsed.item.type,
            success: result?.success === true,
            skipped: result?.skipped === true,
            cancelled: result?.cancelled === true,
            operation: result?.operation ?? operation,
            document: result?.item,
            issues: result?.issues,
            beforeData,
            activityResults: result?.activityResults
        });
        return result;
    } catch (error) {
        recordImportResult(session, {
            name: parsed.item.name,
            type: parsed.item.type,
            success: false,
            operation: duplicateMode,
            issues: [error?.message || String(error)]
        });
        return { success: false, item: null, issues: [error?.message || String(error)] };
    } finally {
        completeImportSession(session);
    }
}

async function importText(text, folderOrOptions = null) {
    const legacy = typeof folderOrOptions === "string" || folderOrOptions == null;
    const result = await importTextDetailed(text, folderOrOptions);
    return legacy ? (result?.success === true ? result.item ?? null : null) : result;
}

async function undoSession(id, { confirmed = false } = {}) {
    if (confirmed !== true) throw new Error("Undo requires { confirmed: true }.");
    const session = getLastUndoableSession();
    if (!session || (id && session.id !== id)) {
        throw new Error("The requested session is not the latest undoable import session.");
    }
    return undoImportSession(session);
}

export function createItemImporterApi({ utils, openWindow, diagnostics, version, info }) {
    const exportDefault = (item, options = {}) => exportItemYaml(item, normalizePublicExportOptions(options));
    const exportBatchDefault = (items, options = {}) => exportItemYamlBatch(items, normalizePublicExportOptions(options));
    const api = {
        schemaVersion: ITEM_PUBLIC_API_SCHEMA_VERSION,
        capabilities: ITEM_PUBLIC_API_CAPABILITIES,
        utils,
        parse: (text, options = {}) => parseItemText(text, options),
        parseWithInsights: (text, options = {}) => parseItemTextWithInsights(text, options),
        import: importText,
        importDetailed: (text, options = {}) => importTextDetailed(text, options),
        export: exportDefault,
        exportCore: (item, options = {}) => exportCoreItemYaml(item, options),
        exportFull: (item, options = {}) => exportFullItemYaml(item, options),
        exportBatch: exportBatchDefault,
        exportCoreBatch: (items, options = {}) => exportCoreItemYamlBatch(items, options),
        exportFullBatch: (items, options = {}) => exportFullItemYamlBatch(items, options),
        copyExport: async (item, options = {}) => copyText(await exportDefault(item, options)),
        copyCoreExport: async (item, options = {}) => copyText(await exportCoreItemYaml(item, options)),
        copyFullExport: async (item, options = {}) => copyText(await exportFullItemYaml(item, options)),
        downloadExport: async (item, options = {}) => {
            const yaml = await exportDefault(item, options);
            downloadText(yaml, options.filename || safeFilename(item));
            return yaml;
        },
        downloadCoreExport: async (item, options = {}) => {
            const yaml = await exportCoreItemYaml(item, options);
            downloadText(yaml, options.filename || safeFilename(item));
            return yaml;
        },
        downloadFullExport: async (item, options = {}) => {
            const yaml = await exportFullItemYaml(item, options);
            downloadText(yaml, options.filename || safeFilename(item));
            return yaml;
        },
        presets: Object.freeze({
            list: () => listSavedPresets(),
            save: (name, text, options = {}) => savePreset(name, text, options),
            remove: id => deletePreset(id)
        }),
        destinations: Object.freeze({
            normalize: destination => normalizeDestination(destination),
            validate: destination => resolveDestination(destination),
            actors: () => listActorDestinations(),
            compendiums: () => listCompendiumDestinations()
        }),
        history: Object.freeze({
            list: () => getImportHistory(),
            latest: () => getImportHistory()[0] ?? null,
            report: session => formatImportReport(session ?? getImportHistory()[0]),
            undo: (id, options = {}) => undoSession(id, options)
        }),
        features: Object.freeze({
            item: () => getItemFeatureCapabilities(),
            activity: () => getActivityCapabilities(),
            yamlSchemaVersion: () => getItemYamlSchemaVersion()
        }),
        openWindow,
        diagnostics,
        version,
        info
    };
    return Object.freeze(api);
}
