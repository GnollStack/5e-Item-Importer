/**
 * MCP Server Diagnostics for 5e Item Importer.
 *
 * These helpers are intentionally small and allowlisted. Read-only diagnostics
 * stay read-only; mutating fixture automation is separately gated.
 */

import { MODULE_ID, MODULE_NAME, MODULE_TITLE, getPacks } from "./itemConfig.js";
import { ItemUtils } from "./itemUtils.js";
import { analyzeItemActivitiesText } from "./activityIntegrationDiagnostics.js";
import {
    FIXTURE_FLAG,
    FIXTURE_PREFIX,
    cleanupItemImporterFixtures,
    getFixtureCounts,
    runItemImporterAutomation
} from "./diagnosticsAutomation.js";

const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const SOCKET_REQUEST = "diagnostics.collect.request";
const SOCKET_RESPONSE = "diagnostics.collect.response";
const READ_ONLY_ACTIONS = [
    "getStatus",
    "validateSettings",
    "validateAssets",
    "collectClientDiagnostics",
    "runSmokeTests",
    "refreshClient",
    "parseText",
    "validateText",
    "analyzeActivities",
    "inspectWorldItem",
    "inspectWindow",
    "openWindow"
];
const MUTATING_ACTIONS = ["runAutomation", "cleanupFixtures"];
const ACTION_NAMES = [...READ_ONLY_ACTIONS, ...MUTATING_ACTIONS];
const SETTINGS_SCHEMA = Object.freeze({
    debug: { type: "boolean" },
    enableMcpDiagnostics: { type: "boolean" },
    showParseResults: { type: "boolean" },
    showNormalizationWarnings: { type: "boolean" },
    autoParse: { type: "boolean" },
    autoParseDelay: { type: "number" },
    compendiums: { type: "object" },
    defaultItemType: { type: "string" },
    matchIcons: { type: "boolean" },
    createIdentified: { type: "boolean" },
    useSemanticIcons: { type: "boolean" },
    parseCurrency: { type: "boolean" },
    parseWeight: { type: "boolean" },
    strictParsing: { type: "boolean" },
    lastImportedType: { type: "string" },
    preserveFormatting: { type: "boolean" },
    integrateWithActivityImporter: { type: "boolean" },
    replaceGeneratedDefaultActivities: { type: "boolean" },
    hasShownWelcome: { type: "boolean" }
});
const MODULE_ASSETS = Object.freeze([
    "module.json",
    "README.md",
    "scripts/itemImporter.js",
    "scripts/ui/itemAttunementNote.js",
    "scripts/itemWindow.js",
    "scripts/itemConfig.js",
    "scripts/debugApi.js",
    "scripts/diagnosticsAutomation.js",
    "scripts/diagnostics/runtimeSmokeTests.js",
    "scripts/parserRouting.js",
    "scripts/itemData.js",
    "scripts/itemUtils.js",
    "templates/itemWindow.hbs",
    "lang/en.json",
    "styles/item-importer-card.css",
    "styles/item-importer-components.css",
    "styles/item-importer.css"
]);

const pendingClientCollections = new Map();
let socketListenerRegistered = false;

function getSetting(key, fallback = null) {
    try {
        return game.settings.get(MODULE_NAME, key);
    } catch {
        return fallback;
    }
}

function getAvailability() {
    const gates = {
        activeGMUser: Boolean(game.user?.isGM && game.user?.active !== false),
        debugLogging: getSetting("debug", false) === true,
        enableMcpDiagnostics: getSetting("enableMcpDiagnostics", false) === true,
        mutationEnabled: getSetting("enableMcpDiagnostics", false) === true,
        refreshEnabled: true
    };
    const missing = [];

    if (!gates.activeGMUser) missing.push("active GM user");
    if (!gates.debugLogging) missing.push("Debug Logging setting");
    if (!gates.enableMcpDiagnostics) missing.push("Enable MCP Diagnostics setting");

    return {
        available: missing.length === 0,
        reason: missing.length ? `Missing ${missing.join(", ")}` : "Available",
        gates
    };
}

function getMutationAvailability(args = {}) {
    const base = getAvailability();
    const mutationConfirmed = args.confirmMutation === true;
    const missing = [];

    if (!base.gates.activeGMUser) missing.push("active GM user");
    if (!base.gates.debugLogging) missing.push("Debug Logging setting");
    if (!base.gates.enableMcpDiagnostics) missing.push("Enable MCP Diagnostics setting");
    if (!mutationConfirmed) missing.push("confirmMutation: true");

    return {
        available: missing.length === 0,
        reason: missing.length ? `Missing ${missing.join(", ")}` : "Available",
        gates: {
            ...base.gates,
            mutationConfirmed
        }
    };
}

function getRefreshAvailability(args = {}) {
    const base = getAvailability();
    const refreshConfirmed = args.confirmRefresh === true;
    const missing = [];

    if (!base.gates.activeGMUser) missing.push("active GM user");
    if (!base.gates.debugLogging) missing.push("Debug Logging setting");
    if (!base.gates.enableMcpDiagnostics) missing.push("Enable MCP Diagnostics setting");
    if (!refreshConfirmed) missing.push("confirmRefresh: true");

    return {
        available: missing.length === 0,
        reason: missing.length ? `Missing ${missing.join(", ")}` : "Available",
        gates: {
            ...base.gates,
            refreshConfirmed
        }
    };
}

function unavailableResult(action, availability = getAvailability()) {
    return {
        success: false,
        available: false,
        action,
        reason: availability.reason,
        diagnostics: {
            version: 1,
            available: false,
            gates: availability.gates
        },
        checks: {
            gm: availability.gates.activeGMUser,
            debug: availability.gates.debugLogging,
            enableMcpDiagnostics: availability.gates.enableMcpDiagnostics
        }
    };
}

function getSettingSnapshot() {
    const settingKeys = [
        "debug",
        "enableMcpDiagnostics",
        "showParseResults",
        "showNormalizationWarnings",
        "autoParse",
        "autoParseDelay",
        "compendiums",
        "defaultItemType",
        "matchIcons",
        "createIdentified",
        "useSemanticIcons",
        "parseCurrency",
        "parseWeight",
        "strictParsing",
        "lastImportedType",
        "preserveFormatting",
        "integrateWithActivityImporter",
        "replaceGeneratedDefaultActivities",
        "hasShownWelcome"
    ];

    return Object.fromEntries(settingKeys.map((key) => {
        try {
            return [key, game.settings.get(MODULE_NAME, key)];
        } catch (error) {
            return [key, `[Unavailable: ${error.message}]`];
        }
    }));
}

function getIntegrationSnapshot() {
    const activityImporter = game.modules.get("5e-activity-importer");
    const autoAnimations = game.modules.get("autoanimations");
    const activityDiagnostics = activityImporter?.api?.diagnostics;
    const activityAnalyzeText = activityDiagnostics?.actions?.analyzeText ?? activityDiagnostics?.analyzeText;

    return {
        activityImporter: {
            installed: !!activityImporter,
            active: !!activityImporter?.active,
            version: activityImporter?.version,
            diagnosticsAvailable: typeof activityAnalyzeText === "function"
        },
        autoAnimations: {
            installed: !!autoAnimations,
            active: !!autoAnimations?.active,
            version: autoAnimations?.version
        }
    };
}

function getCompendiumSnapshot() {
    const itemPacks = game.packs?.filter?.((pack) => pack.documentName === "Item") ?? [];
    const configured = getPacks().items;

    return {
        itemPacks: {
            available: itemPacks.length ?? itemPacks.size ?? 0,
            active: configured.filter((pack) => pack.active).length,
            configured
        }
    };
}

function safeSerialize(value, options = {}) {
    const {
        maxDepth = 5,
        maxArrayLength = 50,
        maxStringLength = 2000,
        maxObjectKeys = 80
    } = options;
    const seen = new WeakSet();

    function serialize(current, depth) {
        if (current === null || current === undefined) return current;

        if (typeof current === "string") {
            return current.length > maxStringLength
                ? `${current.slice(0, maxStringLength)}...`
                : current;
        }

        if (typeof current === "number" || typeof current === "boolean") return current;
        if (typeof current === "bigint") return Number(current);
        if (typeof current === "function") return `[Function ${current.name || "anonymous"}]`;

        if (current instanceof Error) {
            return {
                name: current.name,
                message: current.message,
                stack: current.stack?.split("\n").slice(0, 8).join("\n")
            };
        }

        if (current instanceof Date) return current.toISOString();
        if (typeof current !== "object") return String(current);

        if (current instanceof Set) {
            if (seen.has(current)) return "[Circular]";
            if (depth >= maxDepth) return `[Set size=${current.size}]`;

            seen.add(current);
            const items = Array.from(current)
                .slice(0, maxArrayLength)
                .map((item) => serialize(item, depth + 1));
            if (current.size > maxArrayLength) {
                items.push(`[${current.size - maxArrayLength} more items]`);
            }
            seen.delete(current);
            return items;
        }

        if (current instanceof Map) {
            if (seen.has(current)) return "[Circular]";
            if (depth >= maxDepth) return `[Map size=${current.size}]`;

            seen.add(current);
            const output = {};
            const entries = Array.from(current.entries()).slice(0, maxObjectKeys);
            for (const [key, value] of entries) {
                output[String(key)] = serialize(value, depth + 1);
            }
            if (current.size > maxObjectKeys) {
                output.__truncatedKeys = current.size - maxObjectKeys;
            }
            seen.delete(current);
            return output;
        }

        if (seen.has(current)) return "[Circular]";

        if (depth >= maxDepth) {
            return summarizeObject(current);
        }

        seen.add(current);

        if (Array.isArray(current)) {
            const items = current
                .slice(0, maxArrayLength)
                .map((item) => serialize(item, depth + 1));
            if (current.length > maxArrayLength) {
                items.push(`[${current.length - maxArrayLength} more items]`);
            }
            seen.delete(current);
            return items;
        }

        const output = {};
        const keys = Object.keys(current).slice(0, maxObjectKeys);
        for (const key of keys) {
            try {
                output[key] = serialize(current[key], depth + 1);
            } catch (error) {
                output[key] = `[Error reading property: ${error.message}]`;
            }
        }

        const allKeyCount = Object.keys(current).length;
        if (allKeyCount > maxObjectKeys) {
            output.__truncatedKeys = allKeyCount - maxObjectKeys;
        }

        seen.delete(current);
        return output;
    }

    return serialize(value, 0);
}

function summarizeObject(value) {
    const type = value?.constructor?.name || "Object";
    const id = value?.id ?? value?._id;
    const name = value?.name ?? value?.title;
    return `[${[type, id ? `id=${id}` : "", name ? `name=${name}` : ""].filter(Boolean).join(" ")}]`;
}

function summarizeParseResult(result) {
    const item = result?.item;
    const itemJson = item?.toJSON ? safeSerialize(item.toJSON()) : null;

    if (itemJson && Object.prototype.hasOwnProperty.call(itemJson, "foundryData")) {
        delete itemJson.foundryData;
    }

    return {
        success: !!result?.success,
        errors: safeSerialize(result?.errors ?? []),
        warnings: safeSerialize(result?.warnings ?? []),
        item: item ? {
            name: item.name,
            type: item.type,
            ...(item.type === "spell" ? {} : { rarity: item.rarity }),
            pendingActivities: item.pendingActivities?.length ?? 0,
            data: itemJson
        } : null
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

function summarizeDamageParts(parts) {
    if (!Array.isArray(parts)) return [];
    return parts.map((part) => ({
        number: part?.number,
        denomination: part?.denomination,
        bonus: part?.bonus,
        types: collectionValues(part?.types),
        custom: part?.custom,
        scaling: part?.scaling
    }));
}

function summarizeActivitySource(activity) {
    return {
        id: activity?._id ?? activity?.id ?? null,
        name: activity?.name ?? null,
        type: activity?.type ?? null,
        img: activity?.img ?? null,
        keys: Object.keys(activity ?? {}).sort(),
        activation: safeSerialize(activity?.activation ?? null),
        consumption: safeSerialize(activity?.consumption ?? null),
        uses: safeSerialize(activity?.uses ?? null),
        range: safeSerialize(activity?.range ?? null),
        target: safeSerialize(activity?.target ?? null),
        attack: safeSerialize(activity?.attack ?? null),
        save: safeSerialize(activity?.save ?? null),
        damage: activity?.damage ? {
            critical: safeSerialize(activity.damage.critical ?? null),
            includeBase: activity.damage.includeBase,
            onSave: activity.damage.onSave,
            parts: summarizeDamageParts(activity.damage.parts)
        } : null,
        healing: safeSerialize(activity?.healing ?? null),
        midi: {
            topLevel: safeSerialize({
                useConditionText: activity?.useConditionText,
                useConditionReason: activity?.useConditionReason,
                effectConditionText: activity?.effectConditionText,
                ignoreTraits: activity?.ignoreTraits,
                isOverTimeFlag: activity?.isOverTimeFlag,
                overTimeProperties: activity?.overTimeProperties,
                macroData: activity?.macroData,
                otherActivityId: activity?.otherActivityId,
                otherActivityAsParentType: activity?.otherActivityAsParentType,
                attackMode: activity?.attackMode,
                fumbleThreshold: activity?.fumbleThreshold,
                attackRollPerTarget: activity?.attackRollPerTarget,
                friendlySave: activity?.friendlySave
            }),
            midiProperties: safeSerialize(activity?.midiProperties ?? {})
        }
    };
}

function summarizeEffectSource(effect) {
    const source = effect?.toObject?.(false) ?? effect?.toJSON?.() ?? effect;
    return {
        id: source?._id ?? source?.id ?? null,
        name: source?.name ?? null,
        disabled: source?.disabled,
        transfer: source?.transfer,
        statuses: safeSerialize(source?.statuses ?? []),
        duration: safeSerialize(source?.duration ?? null),
        changes: safeSerialize((source?.changes ?? []).map((change) => ({
            key: change?.key,
            mode: change?.mode,
            value: change?.value,
            priority: change?.priority
        })))
    };
}

function summarizeWorldItem(item) {
    const source = item?.toObject?.(false) ?? item?.toJSON?.() ?? {};
    const system = source.system ?? {};
    const activities = collectionValues(system.activities).map(summarizeActivitySource);
    const effects = collectionValues(source.effects ?? item?.effects).map(summarizeEffectSource);

    return {
        id: item?.id ?? source?._id ?? null,
        uuid: item?.uuid ?? null,
        name: item?.name ?? source?.name ?? null,
        type: item?.type ?? source?.type ?? null,
        img: item?.img ?? source?.img ?? null,
        systemKeys: Object.keys(system).sort(),
        rarity: system?.rarity,
        attunement: safeSerialize(system?.attunement ?? null),
        equipped: system?.equipped,
        identified: system?.identified,
        price: safeSerialize(system?.price ?? null),
        weight: safeSerialize(system?.weight ?? null),
        activities: {
            count: activities.length,
            entries: activities
        },
        effects: {
            count: effects.length,
            entries: effects
        }
    };
}

function inspectWorldItem(input = {}) {
    const id = typeof input.id === "string" ? input.id.trim() : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const query = typeof input.query === "string" ? input.query.trim() : "";
    const search = name || query;
    const worldItems = collectionValues(game.items);

    if (!id && !search) {
        return {
            success: false,
            errors: ["Provide id, name, or query."],
            item: null,
            matches: []
        };
    }

    let item = id ? game.items?.get?.(id) : null;
    if (!item && name) item = game.items?.getName?.(name);

    const normalized = search.toLocaleLowerCase();
    const matches = worldItems
        .filter((entry) => {
            if (id && entry?.id === id) return true;
            if (!normalized) return false;
            return entry?.name?.toLocaleLowerCase?.().includes(normalized);
        })
        .slice(0, 20)
        .map((entry) => ({
            id: entry.id,
            uuid: entry.uuid,
            name: entry.name,
            type: entry.type,
            img: entry.img
        }));

    if (!item && matches.length === 1) {
        item = game.items?.get?.(matches[0].id);
    }

    return {
        success: !!item,
        query: { id: id || null, name: name || null, search: search || null },
        item: item ? summarizeWorldItem(item) : null,
        matches,
        errors: item ? [] : [`No world Item matched ${id || search}.`]
    };
}

function normalizeBuildOptions(input = {}) {
    return {
        deterministicIcons: input.deterministicIcons !== false,
        generateAnimations: input.generateAnimations === true
    };
}

function summarizeAutoAnimationsBuild(generatedItemData, buildOptions) {
    const flags = generatedItemData?.flags?.autoanimations ?? null;
    const meleeSwitch = flags?.meleeSwitch ?? null;

    return {
        requested: buildOptions.generateAnimations === true,
        moduleActive: !!game.modules.get("autoanimations")?.active,
        applied: !!flags,
        id: flags?.id ?? null,
        menu: flags?.menu ?? null,
        primary: flags?.primary?.video ?? null,
        meleeSwitch: meleeSwitch ? {
            switchType: meleeSwitch.options?.switchType ?? null,
            isReturning: meleeSwitch.options?.isReturning ?? null,
            returning: meleeSwitch.options?.returning ?? null,
            video: meleeSwitch.video ?? null
        } : null
    };
}

async function buildGeneratedData(item, options = {}) {
    const buildOptions = normalizeBuildOptions(options);
    await item.buildFoundryData(buildOptions);
    const exported = item.toJSON ? item.toJSON() : {};
    const generatedItemData = exported.foundryData ?? null;
    const validation = ItemUtils.validateItemData(generatedItemData ?? {});

    return {
        buildOptions,
        autoAnimations: summarizeAutoAnimationsBuild(generatedItemData, buildOptions),
        generatedItemData: safeSerialize(generatedItemData, { maxDepth: 7 }),
        validation: safeSerialize(validation)
    };
}

function withGate(action, fn) {
    const availability = getAvailability();
    if (!availability.available) return unavailableResult(action, availability);
    return fn(availability);
}

function withMutationGate(action, args, fn) {
    const availability = getMutationAvailability(args);
    if (!availability.available) return unavailableResult(action, availability);
    return fn(availability);
}

function withRefreshGate(action, args, fn) {
    const availability = getRefreshAvailability(args);
    if (!availability.available) return unavailableResult(action, availability);
    return fn(availability);
}

function registerSocketListener() {
    if (socketListenerRegistered || !game.socket?.on) return false;

    game.socket.on(SOCKET_CHANNEL, async (payload) => {
        if (!payload || payload.moduleId !== MODULE_ID) return;

        if (payload.type === SOCKET_REQUEST) {
            await handleClientDiagnosticsRequest(payload);
            return;
        }

        if (payload.type === SOCKET_RESPONSE) {
            handleClientDiagnosticsResponse(payload);
        }
    });

    socketListenerRegistered = true;
    return true;
}

function scheduleSocketListener() {
    if (registerSocketListener()) return;
    if (typeof Hooks !== "undefined") {
        Hooks.once("ready", registerSocketListener);
    }
}

async function handleClientDiagnosticsRequest(payload) {
    if (!payload.requestId || !payload.requesterId || payload.requesterId === game.user?.id) return;
    if (getSetting("enableMcpDiagnostics", false) !== true) return;
    if (!resolveActiveGMSender(payload.requesterId)) return;

    game.socket.emit(SOCKET_CHANNEL, {
        moduleId: MODULE_ID,
        type: SOCKET_RESPONSE,
        requestId: payload.requestId,
        requesterId: payload.requesterId,
        responderId: game.user?.id ?? null,
        snapshot: createClientSnapshot({ requestId: payload.requestId })
    });
}

function handleClientDiagnosticsResponse(payload) {
    if (!payload.requestId || payload.requesterId !== game.user?.id) return;
    const pending = pendingClientCollections.get(payload.requestId);
    if (!pending || !payload.responderId || !pending.expectedUserIds.has(payload.responderId)) return;

    pending.responses.set(payload.responderId, toPlainObject(payload.snapshot));
    if (pending.responses.size >= pending.expectedUserIds.size) {
        pending.resolve();
    }
}

export function createDiagnosticsApi({ parse, openWindow }) {
    scheduleSocketListener();

    const actions = {
        getStatus() {
            return withGate("getStatus", (availability) => {
                const modulePackage = game.modules.get(MODULE_NAME);
                return {
                    success: true,
                    available: true,
                    reason: null,
                    module: {
                        id: MODULE_NAME,
                        title: MODULE_TITLE,
                        version: modulePackage?.version,
                        active: !!modulePackage?.active
                    },
                    diagnostics: {
                        version: 1,
                        available: availability.available,
                        gates: availability.gates,
                        availableActions: [...ACTION_NAMES],
                        readOnlyActions: [...READ_ONLY_ACTIONS],
                        mutatingActions: [...MUTATING_ACTIONS],
                        bridge: "call-module-debug-action",
                        fixturePrefix: FIXTURE_PREFIX,
                        fixtureFlag: FIXTURE_FLAG,
                        mutation: {
                            confirmMutationRequired: true,
                            gates: getMutationAvailability({ confirmMutation: false }).gates
                        },
                        refresh: {
                            confirmRefreshRequired: true,
                            gates: getRefreshAvailability({ confirmRefresh: false }).gates
                        }
                    },
                    runtime: summarizeRuntime(),
                    settings: getSettingSnapshot(),
                    worldData: getWorldDocumentCounts(),
                    fixtures: getFixtureCounts(),
                    integrations: getIntegrationSnapshot(),
                    compendiums: getCompendiumSnapshot(),
                    publicApiKeys: Object.keys(game.modules.get(MODULE_NAME)?.api ?? {}).sort(),
                    actions: Object.keys(actions)
                };
            });
        },

        validateSettings() {
            return withGate("validateSettings", () => {
                const settings = getSettingSnapshot();
                const errors = [];
                const warnings = [];

                for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
                    const value = settings[key];
                    if (typeof value === "string" && value.startsWith("[Unavailable:")) {
                        errors.push(issue("setting-read-error", `Could not read setting "${key}".`, { key, value }));
                        continue;
                    }

                    if (schema.type === "boolean" && typeof value !== "boolean") {
                        errors.push(issue("invalid-boolean-setting", `Setting "${key}" must be a boolean.`, { key, value }));
                    } else if (schema.type === "number" && typeof value !== "number") {
                        errors.push(issue("invalid-number-setting", `Setting "${key}" must be a number.`, { key, value }));
                    } else if (schema.type === "string" && typeof value !== "string") {
                        errors.push(issue("invalid-string-setting", `Setting "${key}" must be a string.`, { key, value }));
                    } else if (schema.type === "object" && (!value || typeof value !== "object" || Array.isArray(value))) {
                        errors.push(issue("invalid-object-setting", `Setting "${key}" must be an object.`, { key, value }));
                    }
                }

                if (settings.enableMcpDiagnostics === true) {
                    warnings.push(issue("mcp-diagnostics-enabled", "Enable MCP Diagnostics is on; disable it during normal play unless you are actively debugging or testing.", { key: "enableMcpDiagnostics" }));
                }

                return {
                    success: errors.length === 0,
                    available: true,
                    checked: Object.keys(SETTINGS_SCHEMA).length,
                    errors,
                    warnings,
                    settings
                };
            });
        },

        async validateAssets(input = {}) {
            return withGate("validateAssets", async () => {
                const maxChecks = Math.max(1, Math.min(Number(input.maxChecks) || MODULE_ASSETS.length, MODULE_ASSETS.length));
                const assets = [];
                const errors = [];

                for (const path of MODULE_ASSETS.slice(0, maxChecks)) {
                    const url = `modules/${MODULE_ID}/${path}`;
                    let ok = false;
                    let status = null;
                    try {
                        const response = await fetch(url, { method: "GET", cache: "no-store" });
                        ok = response.ok;
                        status = response.status;
                    } catch (error) {
                        errors.push(issue("asset-fetch-error", `Could not fetch ${path}.`, { path, error: error.message }));
                    }

                    assets.push({ path, ok, status });
                    if (!ok && status !== null) {
                        errors.push(issue("asset-missing", `Asset ${path} returned HTTP ${status}.`, { path, status }));
                    }
                }

                return {
                    success: errors.length === 0,
                    available: true,
                    checked: assets.length,
                    assets,
                    errors
                };
            });
        },

        async collectClientDiagnostics(input = {}) {
            return withGate("collectClientDiagnostics", async () => {
                const timeoutMs = normalizeTimeout(input.timeoutMs, 3000, 500, 10000);
                const includeSelf = input.includeSelf !== false;
                const requestId = ItemUtils.randomID();
                const activeUsers = collectionValues(game.users).filter(user => user?.active !== false);
                const expectedUserIds = new Set(activeUsers
                    .filter(user => user.id !== game.user?.id)
                    .map(user => user.id));
                const responses = new Map();

                if (includeSelf && game.user?.id) {
                    responses.set(game.user.id, createClientSnapshot({ requestId }));
                }

                const pending = {
                    responses,
                    expectedUserIds,
                    resolve: null
                };
                const promise = new Promise(resolve => {
                    pending.resolve = resolve;
                });
                pendingClientCollections.set(requestId, pending);

                game.socket?.emit?.(SOCKET_CHANNEL, {
                    moduleId: MODULE_ID,
                    type: SOCKET_REQUEST,
                    requestId,
                    requesterId: game.user?.id ?? null
                });

                try {
                    await Promise.race([promise, wait(timeoutMs)]);
                } finally {
                    pendingClientCollections.delete(requestId);
                }

                const clients = Array.from(responses.values());
                const respondedUserIds = new Set(clients.map(client => client.user?.id).filter(Boolean));
                const missingActiveUsers = activeUsers
                    .filter(user => !respondedUserIds.has(user.id))
                    .map(summarizeUser);

                return {
                    success: true,
                    available: true,
                    requestId,
                    timeoutMs,
                    includeSelf,
                    responded: clients.length,
                    activeUsers: activeUsers.map(summarizeUser),
                    missingActiveUsers,
                    clients
                };
            });
        },

        async runSmokeTests(input = {}) {
            return withGate("runSmokeTests", async () => {
                const tests = [];
                const beforeCounts = getWorldDocumentCounts();
                const requestedSuite = input.suite === "full" ? "full" : "runtime";

                record(tests, "diagnostics action allowlist matches contract", () => {
                    const actual = Object.keys(game.modules.get(MODULE_NAME)?.api?.diagnostics?.actions ?? {}).sort();
                    const expected = [...ACTION_NAMES].sort();
                    return actual.length === expected.length && actual.every((name, index) => name === expected[index]);
                });
                record(tests, "settings gate is currently open", () => getAvailability().available === true);

                let runSuite;
                try {
                    if (requestedSuite === "full") {
                        const { ItemImporterTests } = await import("../tests/foundry/itemImporterTests.js");
                        runSuite = ItemImporterTests?.runStructured?.bind(ItemImporterTests);
                    } else {
                        const { runRuntimeSmokeTests } = await import("./diagnostics/runtimeSmokeTests.js");
                        runSuite = runRuntimeSmokeTests;
                    }
                } catch (error) {
                    return {
                        success: false,
                        available: true,
                        suite: requestedSuite,
                        sourceOnly: requestedSuite === "full",
                        errors: [requestedSuite === "full"
                            ? "The full source test suite is not included in production release archives."
                            : "Runtime smoke tests are unavailable."],
                        detail: error.message,
                        tests
                    };
                }

                if (typeof runSuite !== "function") {
                    return {
                        success: false,
                        available: true,
                        suite: requestedSuite,
                        sourceOnly: requestedSuite === "full",
                        errors: [`${requestedSuite === "full" ? "Full source" : "Runtime"} smoke tests are unavailable.`],
                        tests
                    };
                }

                const structured = await runSuite();
                const afterCounts = getWorldDocumentCounts();
                record(tests, "smoke tests created no world documents", () =>
                    JSON.stringify(beforeCounts) === JSON.stringify(afterCounts)
                );

                const normalizedStructuredTests = (structured.tests ?? []).map(test => ({
                    ...test,
                    pass: test.pass ?? test.success
                }));
                const combinedTests = [...tests, ...normalizedStructuredTests];
                const failed = combinedTests.filter(test => !(test.pass ?? test.success));

                return {
                    available: true,
                    ...structured,
                    suite: requestedSuite,
                    success: structured.success === true && failed.length === 0,
                    passed: combinedTests.length - failed.length,
                    failed: failed.length,
                    tests: combinedTests,
                    noCreateCounts: {
                        before: beforeCounts,
                        after: afterCounts
                    }
                };
            });
        },

        refreshClient(input = {}) {
            return withRefreshGate("refreshClient", input, () => {
                const delayMs = Math.max(0, Math.min(Number(input.delayMs) || 250, 5000));
                window.setTimeout(() => window.location.reload(), delayMs);
                return {
                    success: true,
                    available: true,
                    initiated: true,
                    delayMs
                };
            });
        },

        async parseText(input = {}) {
            return withGate("parseText", async () => {
                const text = typeof input.text === "string" ? input.text : "";
                const buildItemData = !!input.buildItemData;
                const buildOptions = normalizeBuildOptions(input);
                if (!text.trim()) {
                    return {
                        success: false,
                        available: true,
                        errors: ["text is required"],
                        warnings: []
                    };
                }

                try {
                    const result = parse(text, { trace: !!input.trace });
                    const response = {
                        success: !!result?.success,
                        available: true,
                        parse: summarizeParseResult(result)
                    };

                    if (input.trace) {
                        response.trace = safeSerialize(result?.trace ?? null, { maxDepth: 7, maxStringLength: 8000 });
                    }

                    if (buildItemData && result?.item) {
                        response.build = await buildGeneratedData(result.item, buildOptions);
                    }

                    return response;
                } catch (error) {
                    return {
                        success: false,
                        available: true,
                        errors: [error.message],
                        detail: safeSerialize(error)
                    };
                }
            });
        },

        async validateText(input = {}) {
            return withGate("validateText", async () => {
                const parsed = await actions.parseText({
                    text: input.text,
                    buildItemData: true,
                    deterministicIcons: input.deterministicIcons,
                    generateAnimations: input.generateAnimations === true,
                    trace: !!input.trace
                });

                if (!parsed.success || !parsed.parse?.item) {
                    return {
                        ...parsed,
                        validation: {
                            valid: false,
                            errors: parsed.parse?.errors ?? parsed.errors ?? ["Unable to parse item text"]
                        }
                    };
                }

                return {
                    success: !!parsed.build?.validation?.valid,
                    available: true,
                    parse: parsed.parse,
                    validation: parsed.build?.validation ?? { valid: false, errors: ["Validation did not run"] },
                    generatedItemData: parsed.build?.generatedItemData ?? null,
                    ...(input.trace ? { trace: parsed.trace ?? null } : {})
                };
            });
        },

        async analyzeActivities(input = {}) {
            return withGate("analyzeActivities", async () => {
                try {
                    return {
                        available: true,
                        ...safeSerialize(await analyzeItemActivitiesText(input.text, {
                            parse,
                            trace: !!input.trace,
                            strict: input.strict !== false
                        }), {
                            maxDepth: 10,
                            maxArrayLength: 80,
                            maxStringLength: 3000,
                            maxObjectKeys: 160
                        })
                    };
                } catch (error) {
                    return {
                        success: false,
                        available: true,
                        errors: [error.message],
                        detail: safeSerialize(error)
                    };
                }
            });
        },

        inspectWorldItem(input = {}) {
            return withGate("inspectWorldItem", () => {
                try {
                    return {
                        available: true,
                        ...safeSerialize(inspectWorldItem(input), {
                            maxDepth: 10,
                            maxArrayLength: 80,
                            maxStringLength: 3000,
                            maxObjectKeys: 160
                        })
                    };
                } catch (error) {
                    return {
                        success: false,
                        available: true,
                        errors: [error.message],
                        detail: safeSerialize(error)
                    };
                }
            });
        },

        inspectWindow() {
            return withGate("inspectWindow", () => {
                const application = document.querySelector(".ii-window");
                const content = application?.querySelector?.(".window-content") ?? null;
                const form = application?.querySelector?.(".ii-form") ?? null;
                const options = form?.querySelector?.(".ii-options-panel") ?? null;
                const presetPanel = form?.querySelector?.(".ii-preset-panel") ?? null;
                const quickSettings = options?.querySelector?.(".ii-quick-settings") ?? null;
                const sourceInput = form?.querySelector?.("#ii-input") ?? null;
                const disclosureSummary = options?.querySelector?.(":scope > summary") ?? null;
                const select = form?.querySelector?.("select") ?? null;
                const destination = form?.querySelector?.(".ii-destination-fieldset") ?? null;
                const actionBar = form?.querySelector?.(".ii-button-group") ?? null;
                const contentStyle = content ? getComputedStyle(content) : null;
                const disclosureChevronStyle = disclosureSummary ? getComputedStyle(disclosureSummary, "::after") : null;
                const selectStyle = select ? getComputedStyle(select) : null;
                const formText = form?.textContent ?? "";
                const unresolvedKeys = Array.from(new Set(formText.match(/\bII\.[A-Za-z0-9_.]+/g) ?? [])).sort();

                return {
                    success: !!(application && content && form),
                    available: true,
                    opened: !!application,
                    localization: {
                        language: game.i18n?.lang ?? null,
                        sample: game.i18n?.localize?.("II.Input.Label") ?? null,
                        unresolvedKeys
                    },
                    scrolling: content ? {
                        overflowX: contentStyle?.overflowX ?? null,
                        overflowY: contentStyle?.overflowY ?? null,
                        clientHeight: content.clientHeight,
                        scrollHeight: content.scrollHeight,
                        hasVerticalOverflow: content.scrollHeight > content.clientHeight,
                        scrollTop: content.scrollTop
                    } : null,
                    layout: {
                        optionsCollapsed: options ? !options.open : null,
                        presetsCollapsed: presetPanel ? !presetPanel.open : null,
                        optionsLayout: quickSettings ? {
                            display: getComputedStyle(quickSettings).display,
                            gridTemplateColumns: getComputedStyle(quickSettings).gridTemplateColumns
                        } : null,
                        sourceHeight: sourceInput?.getBoundingClientRect?.().height ?? null,
                        destinationVisible: !!destination && !destination.hidden,
                        actionBarVisible: !!actionBar && getComputedStyle(actionBar).display !== "none",
                        width: application?.getBoundingClientRect?.().width ?? null,
                        height: application?.getBoundingClientRect?.().height ?? null,
                        chevrons: {
                            disclosure: disclosureChevronStyle ? {
                                content: disclosureChevronStyle.content,
                                borderRightWidth: disclosureChevronStyle.borderRightWidth,
                                borderBottomWidth: disclosureChevronStyle.borderBottomWidth
                            } : null,
                            select: selectStyle ? {
                                appearance: selectStyle.appearance,
                                backgroundImage: selectStyle.backgroundImage
                            } : null
                        }
                    }
                };
            });
        },

        openWindow() {
            return withGate("openWindow", () => {
                openWindow();

                return {
                    success: true,
                    available: true,
                    opened: true
                };
            });
        },

        async runAutomation(input = {}) {
            return withMutationGate("runAutomation", input, () => runItemImporterAutomation(input));
        },

        async cleanupFixtures(input = {}) {
            return withMutationGate("cleanupFixtures", input, () => cleanupItemImporterFixtures(input));
        }
    };

    const diagnostics = {
        version: 1,
        socketChannel: SOCKET_CHANNEL,
        actions,
        getAvailability,
        getMutationAvailability,
        getRefreshAvailability,
        getStatus: actions.getStatus,
        validateSettings: actions.validateSettings,
        validateAssets: actions.validateAssets,
        collectClientDiagnostics: actions.collectClientDiagnostics,
        runSmokeTests: actions.runSmokeTests,
        refreshClient: actions.refreshClient,
        parseText: actions.parseText,
        validateText: actions.validateText,
        analyzeActivities: actions.analyzeActivities,
        inspectWorldItem: actions.inspectWorldItem,
        inspectWindow: actions.inspectWindow,
        openWindow: actions.openWindow,
        runAutomation: actions.runAutomation,
        cleanupFixtures: actions.cleanupFixtures
    };

    return diagnostics;
}

function summarizeRuntime() {
    return {
        foundry: {
            version: game.version ?? null,
            generation: game.release?.generation ?? null,
            build: game.release?.build ?? null
        },
        world: {
            id: game.world?.id ?? null,
            title: game.world?.title ?? null
        },
        system: {
            id: game.system?.id ?? null,
            title: game.system?.title ?? null,
            version: game.system?.version ?? null
        },
        user: summarizeUser(game.user),
        canvas: {
            ready: Boolean(canvas?.ready),
            sceneId: canvas?.scene?.id ?? null,
            sceneName: canvas?.scene?.name ?? null,
            controlledTokens: Number(canvas?.tokens?.controlled?.length ?? 0)
        },
        sockets: {
            channel: SOCKET_CHANNEL,
            listenerRegistered: socketListenerRegistered
        }
    };
}

function createClientSnapshot({ requestId = null } = {}) {
    return {
        requestId,
        capturedAt: new Date().toISOString(),
        user: summarizeUser(game.user),
        scene: {
            id: canvas?.scene?.id ?? null,
            name: canvas?.scene?.name ?? null,
            ready: Boolean(canvas?.ready)
        },
        runtime: summarizeRuntime(),
        settings: {
            debugLogging: getSetting("debug", false),
            enableMcpDiagnostics: getSetting("enableMcpDiagnostics", false),
            mutationEnabled: getSetting("enableMcpDiagnostics", false),
            refreshEnabled: true
        },
        moduleState: {
            integrations: getIntegrationSnapshot(),
            compendiums: {
                itemPacks: getCompendiumSnapshot().itemPacks?.available ?? 0
            }
        }
    };
}

function getWorldDocumentCounts() {
    return {
        actors: Number(game.actors?.size ?? game.actors?.length ?? 0),
        items: Number(game.items?.size ?? game.items?.length ?? 0),
        scenes: Number(game.scenes?.size ?? game.scenes?.length ?? 0),
        activeSceneTokens: Number(canvas?.scene?.tokens?.size ?? canvas?.scene?.tokens?.length ?? 0)
    };
}

function summarizeUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        active: user.active !== false,
        isGM: Boolean(user.isGM),
        role: user.role ?? null
    };
}

function resolveActiveGMSender(userId) {
    const user = game.users?.get?.(userId);
    if (!user?.isGM || user.active === false) return null;
    return user;
}

function issue(code, message, details = null) {
    return { code, message, details };
}

function record(tests, name, fn) {
    try {
        tests.push({ name, pass: fn() === true });
    } catch (error) {
        tests.push({
            name,
            pass: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

function normalizeTimeout(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(Math.floor(num), max));
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toPlainObject(value) {
    if (!value || typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
}
