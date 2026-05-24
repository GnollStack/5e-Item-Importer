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
    const clean = issues.warnings.length === 0
        && issues.errors.length === 0
        && issues.droppedPaths.length === 0;

    return {
        index,
        key: pending?.key ?? null,
        name: pending?.name ?? null,
        success: !!analysis?.success && (!strict || clean),
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

    const pendingActivities = [];
    for (let index = 0; index < pending.length; index += 1) {
        const entry = pending[index];
        try {
            const yamlText = jsyaml.dump(entry.rawData);
            const analysis = await analyzeText({ text: yamlText, trace });
            pendingActivities.push(summarizePendingAnalysis(index, entry, yamlText, analysis, strict));
        } catch (error) {
            pendingActivities.push(summarizePendingError(index, entry, error));
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
