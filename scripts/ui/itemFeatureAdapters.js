/**
 * Defensive adapters for optional Item and Activity feature services.
 *
 * Item workflows remain usable when a companion module is absent or when a
 * newer service has not been exposed by an older compatible release.
 */

import { ItemUtils } from "../itemUtils.js";

let itemCorePromise = null;

async function loadItemCoreFeatures() {
    if (!itemCorePromise) {
        itemCorePromise = import("../itemCoreFeatures.js").catch(error => {
            ItemUtils.warn(`Item core feature facade is unavailable: ${error?.message || error}`);
            return null;
        });
    }
    return itemCorePromise;
}

export async function getItemFeatureCapabilities() {
    const core = await loadItemCoreFeatures();
    return Object.freeze({
        export: typeof core?.exportStrictItemYaml === "function",
        exportBatch: typeof core?.exportStrictItemYamlBatch === "function",
        insights: typeof core?.buildItemParseInsights === "function",
        schema: Number.isInteger(core?.ITEM_YAML_SCHEMA_VERSION),
        customProperties: typeof core?.customPropertiesToFlagData === "function",
        iconCandidates: typeof core?.collectCompendiumImageCandidates === "function",
        animationPreview: typeof core?.getAutoAnimationPreview === "function"
    });
}

export async function exportItemYaml(item, options = {}) {
    const core = await loadItemCoreFeatures();
    const exporter = core?.exportStrictItemYaml ?? core?.itemToStrictYamlDocument;
    if (typeof exporter !== "function") {
        throw new Error("Strict YAML export is unavailable in this module build.");
    }
    return Promise.resolve(exporter(item, options));
}

/** Export only Item-owned fields, excluding Activities and Active Effects. */
export async function exportCoreItemYaml(item, options = {}) {
    return exportItemYaml(item, {
        ...options,
        includeActivities: false,
        includeEffects: false
    });
}

/** Export the complete Item graph through the optional companion serializers. */
export async function exportFullItemYaml(item, options = {}) {
    return exportItemYaml(item, {
        ...options,
        includeActivities: true,
        includeEffects: true
    });
}

export async function exportItemYamlBatch(items, options = {}) {
    const core = await loadItemCoreFeatures();
    if (typeof core?.exportStrictItemYamlBatch === "function") {
        return Promise.resolve(core.exportStrictItemYamlBatch(items, options));
    }
    const documents = [];
    for (const item of items ?? []) documents.push(await exportItemYaml(item, options));
    return documents.join("\n---\n");
}

export async function exportCoreItemYamlBatch(items, options = {}) {
    return exportItemYamlBatch(items, {
        ...options,
        includeActivities: false,
        includeEffects: false
    });
}

export async function exportFullItemYamlBatch(items, options = {}) {
    return exportItemYamlBatch(items, {
        ...options,
        includeActivities: true,
        includeEffects: true
    });
}

export async function buildParseInsights({ text, result, trace = null, parser = null } = {}) {
    const core = await loadItemCoreFeatures();
    if (typeof core?.buildItemParseInsights === "function") {
        try {
            return await Promise.resolve(core.buildItemParseInsights({
                text,
                result,
                trace: trace ?? result?.trace ?? null,
                parser
            }));
        } catch (error) {
            ItemUtils.warn(`Local parse insights failed: ${error?.message || error}`);
        }
    }

    const issues = [
        ...(Array.isArray(result?.errors) ? result.errors : []),
        ...(Array.isArray(result?.warnings) ? result.warnings : [])
    ];
    return {
        source: "local-fallback",
        suggestions: issues.map(issue => ({
            severity: "warning",
            message: String(issue)
        }))
    };
}

export function getNormalizedItemText(sourceText, result) {
    const trace = result?.trace ?? {};
    const normalized = trace.normalizedStrictTemplate
        ?? trace.normalizedYaml
        ?? trace.normalizedText
        ?? result?.normalizedStrictTemplate
        ?? result?.normalizedText;
    return typeof normalized === "string" && normalized.trim()
        ? normalized.trim()
        : String(sourceText ?? "").trim();
}

export async function buildItemFeaturePreview(item, {
    text = "",
    result = null,
    generateAnimations = false,
    compendiumImageMode = "deterministic",
    compendiumImageSeed = undefined,
    includeIconCandidates = true
} = {}) {
    const core = await loadItemCoreFeatures();
    const preview = {
        insights: await buildParseInsights({ text, result, trace: result?.trace }),
        animation: null,
        iconCandidates: [],
        customProperties: null
    };

    if (typeof core?.getAutoAnimationPreview === "function") {
        try {
            preview.animation = await Promise.resolve(core.getAutoAnimationPreview(item, {
                enabled: generateAnimations
            }));
        } catch (error) {
            preview.animation = { available: false, issues: [error?.message || String(error)] };
        }
    }

    if (includeIconCandidates && typeof core?.collectCompendiumImageCandidates === "function" && item?.name) {
        try {
            const candidates = await Promise.resolve(core.collectCompendiumImageCandidates(item.name, {
                type: item.type,
            })) ?? [];
            preview.iconCandidates = candidates.slice(0, 5);
            if (typeof core?.selectCompendiumImageCandidate === "function") {
                preview.selectedIconCandidate = core.selectCompendiumImageCandidate(candidates, {
                    deterministic: compendiumImageMode !== "random",
                    seed: compendiumImageSeed,
                    itemName: item.name
                });
            }
        } catch (error) {
            ItemUtils.warn(`Icon candidate preview failed: ${error?.message || error}`);
        }
    }

    if (item?.customProperties && typeof core?.normalizeCustomProperties === "function") {
        try {
            const customProperties = item.customProperties.Registered || item.customProperties.Metadata
                ? item.customProperties
                : {
                    Registered: item.customProperties.registered,
                    Metadata: item.customProperties.metadata
                };
            preview.customProperties = core.normalizeCustomProperties(customProperties, {
                registeredOnly: true,
                itemType: item.type
            });
        } catch (error) {
            preview.customProperties = { values: {}, issues: [error?.message || String(error)] };
        }
    }

    return preview;
}

export async function customPropertiesToFlags(input, options = {}) {
    const core = await loadItemCoreFeatures();
    if (typeof core?.customPropertiesToFlagData !== "function") return {};
    return Promise.resolve(core.customPropertiesToFlagData(input, options));
}

export async function getItemYamlSchemaVersion() {
    const core = await loadItemCoreFeatures();
    return Number.isInteger(core?.ITEM_YAML_SCHEMA_VERSION)
        ? core.ITEM_YAML_SCHEMA_VERSION
        : 1;
}

export function getActivityApi() {
    const module = typeof game !== "undefined"
        ? game.modules?.get?.("5e-activity-importer")
        : null;
    return module?.active ? module.api ?? null : null;
}

export function getActivityCapabilities() {
    const api = getActivityApi();
    const activitySerialization = typeof api?.serializeActivity === "function";
    const effectSerialization = typeof api?.serializeEffect === "function";
    return {
        available: !!api,
        schemaVersion: api?.schemaVersion ?? 1,
        capabilities: api?.capabilities ?? {},
        builder: typeof api?.openBuilder === "function",
        serialization: activitySerialization,
        activitySerialization,
        effectSerialization,
        fullSerialization: activitySerialization && effectSerialization,
        featureEnvelopeSerialization: typeof api?.serialize === "function",
        lookup: typeof api?.lookup?.search === "function",
        resolveAll: typeof api?.lookup?.resolveAll === "function",
        uuidDropZones: !!api?.uuidDropZones
    };
}

export async function openActivityBuilder(options = {}) {
    const api = getActivityApi();
    if (typeof api?.openBuilder !== "function") {
        throw new Error("The active 5e Activity Importer does not expose its builder API.");
    }
    return api.openBuilder(options);
}

export async function searchActivityReferences(options = {}) {
    const api = getActivityApi();
    if (typeof api?.lookup?.search !== "function") return [];
    return api.lookup.search(options);
}

export async function resolveActivityReferences(parseResults, options = {}) {
    const api = getActivityApi();
    if (typeof api?.lookup?.resolveAll !== "function") {
        return { results: parseResults, resolved: 0, unresolved: 0, ambiguous: 0, unavailable: true };
    }
    return api.lookup.resolveAll(parseResults, { apply: true, ...options });
}

export async function parseActivities(text, options = {}) {
    const api = getActivityApi();
    const parseAll = api?.parseAll ?? api?.parse;
    if (typeof parseAll !== "function") {
        throw new Error("The active 5e Activity Importer does not expose a compatible parseAll API.");
    }
    return Promise.resolve(parseAll.call(api, text, options));
}
