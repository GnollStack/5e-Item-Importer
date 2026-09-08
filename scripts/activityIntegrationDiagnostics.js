/**
 * No-create diagnostics for the optional 5e Activity Importer handoff.
 *
 * Item Importer owns item parsing and pendingActivities staging. Activity
 * Importer owns activity/effect parsing, live dnd5e validation, and UUID
 * preview helpers. These diagnostics verify the handoff without creating Items,
 * Activities, Effects, or other world documents.
 */

import jsyaml from "./vendor/js-yaml.mjs";

function getActivityImporterSnapshot() {
    const activityImporter = game.modules.get("5e-activity-importer");
    const diagnostics = activityImporter?.api?.diagnostics;
    const analyzeText = diagnostics?.actions?.analyzeText ?? diagnostics?.analyzeText;

    return {
        installed: !!activityImporter,
        active: !!activityImporter?.active,
        version: activityImporter?.version ?? null,
        diagnosticsAvailable: typeof analyzeText === "function"
    };
}

function getActivityAnalyzeTextAction() {
    const diagnostics = game.modules.get("5e-activity-importer")?.api?.diagnostics;
    const action = diagnostics?.actions?.analyzeText ?? diagnostics?.analyzeText;
    return typeof action === "function" ? action.bind(diagnostics?.actions ?? diagnostics) : null;
}

function summarizeItemParse(result, includeTrace = false) {
    const item = result?.item;
    return {
        success: !!result?.success,
        errors: result?.errors ?? [],
        warnings: result?.warnings ?? [],
        item: item ? {
            name: item.name ?? null,
            type: item.type ?? null,
            rarity: item.rarity ?? null,
            pendingActivities: item.pendingActivities?.length ?? 0
        } : null,
        ...(includeTrace ? { trace: result?.trace ?? null } : {})
    };
}

function collectAnalysisIssues(analysis) {
    const warnings = [];
    const errors = [];
    const droppedPaths = [];

    if (Array.isArray(analysis?.errors)) errors.push(...analysis.errors);
    if (Array.isArray(analysis?.warnings)) warnings.push(...analysis.warnings);

    for (const result of analysis?.results ?? []) {
        warnings.push(...(result?.parse?.warnings ?? []));
        warnings.push(...(result?.validation?.warnings ?? []));
        errors.push(...(result?.parse?.errors ?? []));
        errors.push(...(result?.validation?.errors ?? []));
        droppedPaths.push(...(result?.validation?.droppedPaths ?? []));
    }

    return { warnings, errors, droppedPaths };
}

function summarizePendingAnalysis(index, pending, yamlText, analysis, strict) {
    const issues = collectAnalysisIssues(analysis);
    const hasSingleMappedResult = analysis?.count === 1
        && Array.isArray(analysis?.results)
        && analysis.results.length === 1;
    if (!hasSingleMappedResult) {
        issues.errors.push(`Planner did not return exactly one mapped result for pending attachment ${index + 1}.`);
    }
    const clean = issues.warnings.length === 0
        && issues.errors.length === 0
        && issues.droppedPaths.length === 0;

    return {
        index,
        key: pending?.key ?? null,
        name: pending?.name ?? null,
        success: hasSingleMappedResult && !!analysis?.success && (!strict || clean),
        yamlLength: yamlText.length,
        resultCount: analysis?.count ?? 0,
        activityTypes: (analysis?.results ?? []).map((entry) => entry?.parse?.activityType ?? null),
        resultTypes: (analysis?.results ?? []).map((entry) => entry?.parse?.resultType ?? null),
        dataKeys: (analysis?.results ?? []).map((entry) => entry?.parse?.dataKeys ?? []),
        warnings: issues.warnings,
        errors: issues.errors,
        droppedPaths: issues.droppedPaths,
        analysis
    };
}

function matchesPendingResultType(pending, result) {
    const key = String(pending?.key ?? "");
    const resultType = result?.parse?.resultType ?? null;
    if (key === "EFFECT") return resultType === "effect";
    if (!key.startsWith("ACTIVITY_")) return false;
    return resultType === "activity"
        && result?.parse?.activityType === key.slice("ACTIVITY_".length).toLowerCase();
}

function summarizePendingError(index, pending, error) {
    return {
        index,
        key: pending?.key ?? null,
        name: pending?.name ?? null,
        success: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)],
        droppedPaths: []
    };
}

export async function analyzeItemActivitiesText(text, options = {}) {
    const {
        parse,
        trace = false,
        strict = true
    } = options;

    const activityImporter = getActivityImporterSnapshot();

    if (typeof parse !== "function") {
        return {
            success: false,
            activityImporter,
            strict,
            errors: ["Item parser function is required."],
            parse: null,
            pendingCount: 0,
            pendingActivities: []
        };
    }

    if (typeof text !== "string" || !text.trim()) {
        return {
            success: false,
            activityImporter,
            strict,
            errors: ["text is required"],
            parse: null,
            pendingCount: 0,
            pendingActivities: []
        };
    }

    let parsed;
    try {
        parsed = parse(text, { trace });
    } catch (error) {
        return {
            success: false,
            activityImporter,
            strict,
            errors: [`Item parse error: ${error.message}`],
            parse: null,
            pendingCount: 0,
            pendingActivities: []
        };
    }

    const pending = Array.isArray(parsed?.item?.pendingActivities)
        ? parsed.item.pendingActivities
        : [];

    if (!parsed?.success || !parsed?.item) {
        return {
            success: false,
            activityImporter,
            strict,
            parse: summarizeItemParse(parsed, trace),
            pendingCount: pending.length,
            pendingActivities: []
        };
    }

    if (pending.length === 0) {
        return {
            success: true,
            activityImporter,
            strict,
            parse: summarizeItemParse(parsed, trace),
            pendingCount: 0,
            pendingActivities: []
        };
    }

    const analyzeText = getActivityAnalyzeTextAction();
    if (!activityImporter.active || typeof analyzeText !== "function") {
        return {
            success: false,
            activityImporter,
            strict,
            parse: summarizeItemParse(parsed, trace),
            pendingCount: pending.length,
            pendingActivities: [],
            errors: ["5e-activity-importer diagnostics are unavailable; pending activities cannot be validated."]
        };
    }

    const yamlTexts = pending.map(entry => jsyaml.dump(entry.rawData));
    const pendingActivities = [];
    try {
        // Analyze the complete attachment batch so the companion planner can
        // resolve Forward targets by ID, identifier, or unique exact name and
        // validate dependency order/cycles just as the write path does.
        const batchAnalysis = await analyzeText({
            text: yamlTexts.join("\n---\n"),
            trace,
            plan: true
        });
        const planEntries = Array.isArray(batchAnalysis?.plan?.entries)
            ? batchAnalysis.plan.entries
            : [];
        for (let index = 0; index < pending.length; index += 1) {
            const batchShapeValid = planEntries.length === pending.length
                && (batchAnalysis?.results?.length ?? 0) === pending.length;
            const matchingEntries = planEntries.filter(entry => entry?.originalIndex === index);
            const plannedEntry = matchingEntries.length === 1 ? matchingEntries[0] : null;
            const resultIndex = Number.isInteger(plannedEntry?.plannedIndex)
                ? plannedEntry.plannedIndex
                : -1;
            const mappingValid = batchShapeValid
                && resultIndex >= 0
                && resultIndex < (batchAnalysis?.results?.length ?? 0)
                && planEntries.filter(entry => entry?.plannedIndex === resultIndex).length === 1;
            const result = mappingValid ? batchAnalysis.results[resultIndex] : null;
            const typeValid = mappingValid && matchesPendingResultType(pending[index], result);
            const scopedAnalysis = {
                ...batchAnalysis,
                success: !!batchAnalysis?.success && mappingValid && typeValid,
                count: result ? 1 : 0,
                results: result ? [result] : [],
                errors: [
                    ...(Array.isArray(batchAnalysis?.errors) ? batchAnalysis.errors : []),
                    ...(mappingValid ? [] : [`Planner result mapping is missing or invalid for pending attachment ${index + 1}.`]),
                    ...(mappingValid && !typeValid ? [`Planner result type does not match pending attachment ${index + 1}.`] : [])
                ]
            };
            pendingActivities.push(summarizePendingAnalysis(
                index,
                pending[index],
                yamlTexts[index],
                scopedAnalysis,
                strict
            ));
        }
    } catch (error) {
        for (let index = 0; index < pending.length; index += 1) {
            pendingActivities.push(summarizePendingError(index, pending[index], error));
        }
    }

    return {
        success: pendingActivities.every((entry) => entry.success),
        activityImporter,
        strict,
        parse: summarizeItemParse(parsed, trace),
        pendingCount: pending.length,
        pendingActivities
    };
}
