/**
 * MCP Server Diagnostics for 5e Item Importer.
 *
 * These helpers are intentionally small and allowlisted. They expose parser and
 * status checks for a connected MCP server without creating items.
 */

import { MODULE_NAME, MODULE_TITLE, getPacks } from "./itemConfig.js";
import { ItemUtils } from "./itemUtils.js";
import { analyzeItemActivitiesText } from "./activityIntegrationDiagnostics.js";

const UNAVAILABLE_REASON = "MCP Server Diagnostics require Debug Mode and a GM account.";

function hasGMAccess() {
    return !!game.user?.isGM;
}

function isDebugEnabled() {
    try {
        return !!game.settings.get(MODULE_NAME, "debug");
    } catch {
        return false;
    }
}

function isAvailable() {
    return hasGMAccess() && isDebugEnabled();
}

function unavailableResult(action) {
    return {
        success: false,
        available: false,
        action,
        reason: UNAVAILABLE_REASON,
        checks: {
            gm: hasGMAccess(),
            debug: isDebugEnabled()
        }
    };
}

function getSettingSnapshot() {
    const settingKeys = [
        "debug",
        "showParseResults",
        "showNormalizationWarnings",
        "autoParse",
        "autoParseDelay",
        "defaultItemType",
        "matchIcons",
        "createIdentified",
        "useSemanticIcons",
        "parseCurrency",
        "parseWeight",
        "strictParsing",
        "preserveFormatting",
        "integrateWithActivityImporter",
        "replaceGeneratedDefaultActivities"
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
            rarity: item.rarity,
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

async function buildGeneratedData(item) {
    await item.buildFoundryData({ deterministicIcons: true });
    const exported = item.toJSON ? item.toJSON() : {};
    const generatedItemData = exported.foundryData ?? null;
    const validation = ItemUtils.validateItemData(generatedItemData ?? {});

    return {
        generatedItemData: safeSerialize(generatedItemData, { maxDepth: 7 }),
        validation: safeSerialize(validation)
    };
}

export function createDiagnosticsApi({ parse, openWindow }) {
    const actions = {
        getStatus() {
            const available = isAvailable();
            return {
                success: available,
                available,
                reason: available ? null : UNAVAILABLE_REASON,
                module: {
                    id: MODULE_NAME,
                    title: MODULE_TITLE,
                    version: game.modules.get(MODULE_NAME)?.version,
                    active: !!game.modules.get(MODULE_NAME)?.active
                },
                checks: {
                    gm: hasGMAccess(),
                    debug: isDebugEnabled()
                },
                actions: available ? Object.keys(actions) : [],
                settings: available ? getSettingSnapshot() : { debug: isDebugEnabled() },
                integrations: available ? getIntegrationSnapshot() : {},
                compendiums: available ? getCompendiumSnapshot() : {}
            };
        },

        async parseText(input = {}) {
            if (!isAvailable()) return unavailableResult("parseText");

            const text = typeof input.text === "string" ? input.text : "";
            const buildItemData = !!input.buildItemData;
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
                    response.build = await buildGeneratedData(result.item);
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
        },

        async validateText(input = {}) {
            if (!isAvailable()) return unavailableResult("validateText");

            const parsed = await actions.parseText({
                text: input.text,
                buildItemData: true,
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
        },

        async analyzeActivities(input = {}) {
            if (!isAvailable()) return unavailableResult("analyzeActivities");

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
        },

        inspectWorldItem(input = {}) {
            if (!isAvailable()) return unavailableResult("inspectWorldItem");

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
        },

        openWindow() {
            if (!isAvailable()) return unavailableResult("openWindow");

            openWindow();

            return {
                success: true,
                available: true,
                opened: true
            };
        },

        async runSmokeTests() {
            if (!isAvailable()) return unavailableResult("runSmokeTests");

            const { ItemImporterTests } = await import("./itemTests.js");
            if (typeof ItemImporterTests.runStructured !== "function") {
                return {
                    success: false,
                    available: true,
                    errors: ["Structured smoke tests are unavailable"]
                };
            }

            return {
                available: true,
                ...(await ItemImporterTests.runStructured())
            };
        }
    };

    return {
        getStatus: actions.getStatus,
        parseText: actions.parseText,
        validateText: actions.validateText,
        analyzeActivities: actions.analyzeActivities,
        inspectWorldItem: actions.inspectWorldItem,
        openWindow: actions.openWindow,
        runSmokeTests: actions.runSmokeTests,
        actions
    };
}
