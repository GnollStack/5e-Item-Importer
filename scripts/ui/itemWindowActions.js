/**
 * 5e Item Importer - Window Actions
 * Handles all action callbacks for the item window
 */

import jsyaml from "../vendor/js-yaml.mjs";
import { ItemUtils } from "../itemUtils.js";
import { MODULE_NAME, YAML_ITEM_KEYS } from "../itemConfig.js";
import { parseAllItemsYaml } from "../strictItemParsers/strictParserDispatcher.js";
import {
    isStrictYamlFormat,
    isYamlMultiItem,
    normalizeItemInput,
    normalizeParsedItemResult,
    parseItemText,
    stripItemCodeFences
} from "../parserRouting.js";
import { ITEM_TEMPLATES } from "./itemTemplates.js";
import * as Renderer from "./itemWindowRenderer.js";
import { extractExpectedItemProps, extractActualItemProps } from "./itemComparisonExtractor.js";
import { compareProperties } from "./itemComparisonEngine.js";
import { runItemImportWorkflow, confirmDialog } from "./itemImportWorkflow.js";
import {
    copyText,
    deletePreset,
    downloadText,
    formatImportReport,
    getImportHistory,
    getLastUndoableSession,
    hasStructuredDragData,
    isWorkflowMutationBusy,
    listSavedPresets,
    localize,
    normalizeCapturedAttachmentValues,
    savePreset,
    undoImportSession
} from "./itemWorkflowServices.js";
import {
    buildItemFeaturePreview,
    exportCoreItemYaml,
    exportFullItemYaml,
    exportItemYaml,
    getActivityCapabilities,
    getNormalizedItemText,
    openActivityBuilder,
    resolveActivityReferences
} from "./itemFeatureAdapters.js";

export async function importItemsWorkflow() {
    return runItemImportWorkflow(this);
}

import { ItemComparisonWindow } from "./itemComparisonWindow.js";

/** Shorthand for HTML escaping */
const esc = (str) => ItemUtils.escapeHtml(str);

function collectionHasEntries(value) {
    if (!value) return false;
    if (typeof value.size === "number") return value.size > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value.values === "function") return !value.values().next().done;
    return typeof value === "object" && Object.keys(value).length > 0;
}

function itemHasAttachments(item) {
    return collectionHasEntries(item?.system?.activities) || collectionHasEntries(item?.effects);
}

function getImportIssues(result) {
    if (!Array.isArray(result?.issues)) return [];
    return result.issues.filter(issue => typeof issue === "string" && issue.trim());
}

/** Rebuild batch input from only entries that remain retryable after persistence. */
export function buildRemainingBatchSource(parseState) {
    const entries = [
        ...(parseState?.successes || []),
        ...(parseState?.failures || [])
    ].map(entry => ({
        order: entry?._batchSourceOrder,
        text: entry?._batchSourceText
    }));
    if (entries.some(entry => !Number.isInteger(entry.order) || typeof entry.text !== "string" || !entry.text.trim())) {
        return null;
    }
    entries.sort((a, b) => a.order - b.order);
    return entries.map(entry => entry.text.trim()).join(parseState?._batchSourceSeparator || "\n\n");
}

const ITEM_MARKER_LINE = new RegExp(
    `^===\\s*(?:${YAML_ITEM_KEYS.join("|")})\\s*===\\s*$`,
    "gmi"
);
const ITEM_MARKER_SPLIT = new RegExp(
    `(?=^===\\s*(?:${YAML_ITEM_KEYS.join("|")})\\s*===\\s*$)`,
    "gmi"
);

function isCurrentParse(window, input, text, generation) {
    return window.parseGeneration === generation && input.value.trim() === text;
}

function beginParse(window, importBtn) {
    if (window.parseTimeout) clearTimeout(window.parseTimeout);
    if (window.parseStateTimeout) clearTimeout(window.parseStateTimeout);
    window.parseTimeout = null;
    window.parseStateTimeout = null;
    window.parseGeneration = (window.parseGeneration ?? 0) + 1;
    window.currentParseResult = null;
    window.selectedBatchItems = new Set();
    importBtn.disabled = true;
    importBtn.classList.remove("has-selection");
    delete importBtn.dataset.count;
    importBtn.removeAttribute("title");
    window._updateParseState("parsing");
    return window.parseGeneration;
}

function parseWorkflowOptions(window) {
    return {
        trace: true,
        synthesizeAutomation: !!window.element.querySelector("#ii-suggest-automation")?.checked
    };
}

function pendingSignature(entry) {
    return `${entry?.key || ""}|${entry?.name || ""}|${JSON.stringify(entry?.rawData ?? null)}`;
}

function markSynthesizedActivities(result) {
    const synthesized = new Set((result?.trace?.automation?.pendingActivities || []).map(pendingSignature));
    for (const entry of result?.item?.pendingActivities || []) entry._synthesized = synthesized.has(pendingSignature(entry));
}

async function decorateWorkflowPreview(window, text, result, {
    updateEditor = true,
    includeIconCandidates = true
} = {}) {
    if (!result?.item) return result;
    markSynthesizedActivities(result);
    result._workflow = await buildItemFeaturePreview(result.item, {
        text,
        result,
        generateAnimations: !!window.element.querySelector("#ii-use-autoanimations")?.checked,
        compendiumImageMode: window.element.querySelector("#ii-icon-mode")?.value || "deterministic",
        compendiumImageSeed: window.element.querySelector("#ii-icon-seed")?.value?.trim() || undefined,
        includeIconCandidates: includeIconCandidates
            && !!window.element.querySelector("#ii-setting-match-icons")?.checked
    });
    result._workflow.normalizedText = getNormalizedItemText(text, result);
    if (result.item.pendingActivities?.length) {
        try {
            result._workflow.normalizedText = await exportItemYaml(result.item, {
                includeActivities: true,
                includeEffects: true
            });
        } catch (error) {
            ItemUtils.warn(`Could not include attachments in normalized YAML: ${error?.message || error}`);
        }
    }
    if (updateEditor) {
        window.normalizedText = result._workflow.normalizedText;
        const editor = window.element.querySelector("#ii-normalized-input");
        if (editor) editor.value = window.normalizedText;
    }
    return result;
}

/** Cached reference to the Activity Importer's public UUID helper API. */
let _uuidHelper = null;

/**
 * Load the UUID drop zone helper exposed by the Activity Importer's public API.
 * Returns null if the activity importer is not active.
 * @returns {Promise<Object|null>}
 */
async function loadUuidHelper() {
    if (_uuidHelper) return _uuidHelper;

    const activityImporter = typeof game !== "undefined"
        ? game.modules?.get?.("5e-activity-importer")
        : null;
    if (!activityImporter?.active) return null;

    const requiredExports = [
        "preParseActivities",
        "hasUnresolvedUuids",
        "renderActivityUuidZones",
        "setupUuidDropZones",
        "scrollToFirstDropZone"
    ];

    const useHelper = (candidate, source) => {
        const missing = requiredExports.filter(name => typeof candidate?.[name] !== "function");
        if (missing.length > 0) {
            ItemUtils.warn(`${source} UUID drop zone helper is missing expected export(s): ${missing.join(", ")}.`);
            return null;
        }
        _uuidHelper = candidate;
        Renderer.setActivityRenderer(_uuidHelper.renderActivityUuidZones);
        return _uuidHelper;
    };

    const publicHelper = activityImporter.api?.uuidDropZones;
    if (publicHelper) {
        const helper = useHelper(publicHelper, "Public Activity Importer");
        if (helper) return helper;
    }

    ItemUtils.warn("The active 5e Activity Importer does not expose the public uuidDropZones API.");
    Renderer.setActivityRenderer(null);
    return null;
}

/**
 * Pre-parse activities for an item and attach results to it.
 * Sets item._parsedActivityResults and item._hasUnresolvedUuids.
 * @param {Object} item - Parsed item data with pendingActivities
 * @param {Object} helper - The UUID helper module
 */
function preParseItemActivities(item, helper) {
    if (!item?.pendingActivities?.length || !helper) return;

    try {
        item._parsedActivityResults = helper.preParseActivities(item.pendingActivities);
        item._hasUnresolvedUuids = helper.hasUnresolvedUuids(item._parsedActivityResults);
    } catch (err) {
        ItemUtils.warn(`Could not pre-parse inline activities. Falling back to basic preview: ${err.message}`);
        delete item._parsedActivityResults;
        item._hasUnresolvedUuids = false;
    }
}

function refreshItemUuidState(item, helper) {
    if (!item?._parsedActivityResults || !helper) return false;
    try {
        item._hasUnresolvedUuids = helper.hasUnresolvedUuids(item._parsedActivityResults);
        return item._hasUnresolvedUuids;
    } catch (err) {
        ItemUtils.warn(`Could not refresh inline UUID state: ${err.message}`);
        item._hasUnresolvedUuids = false;
        return false;
    }
}

function updateSingleImportEligibility(window, item, helper) {
    const importBtn = window.element.querySelector("[data-action='import']");
    if (!importBtn) return;
    const unresolved = refreshItemUuidState(item, helper);
    importBtn.disabled = unresolved;
    if (unresolved) {
        importBtn.title = "Resolve all inline activity UUIDs before importing.";
    } else {
        importBtn.removeAttribute("title");
    }
}

function removeUnresolvedBatchSelections(window, helper) {
    const successes = window.currentParseResult?.successes || [];
    const unresolvedIndices = new Set();
    successes.forEach((result, index) => {
        if (refreshItemUuidState(result.item, helper)) unresolvedIndices.add(index);
    });
    for (const index of unresolvedIndices) window.selectedBatchItems.delete(index);
    return unresolvedIndices;
}

/**
 * Set up UUID drop zones on the output container for pre-parsed activity results.
 * Handles both single items and batch items.
 * @this {ItemWindow}
 * @param {Object} helper - The UUID helper module
 */
function setupItemUuidDropZones(helper) {
    const output = this.element.querySelector("#ii-parse-output");
    if (!output || !helper) return;

    // Collect all parse results that need UUID zones
    // Single item mode
    if (this.currentParseResult?.item?._parsedActivityResults) {
        const results = this.currentParseResult.item._parsedActivityResults;
        const onReRender = () => reRenderItemActivities.call(this, helper);
        helper.setupUuidDropZones(output, results, onReRender);
        helper.scrollToFirstDropZone(output);
    }

    // Batch mode
    if (this.currentParseResult?.successes) {
        for (let i = 0; i < this.currentParseResult.successes.length; i++) {
            const res = this.currentParseResult.successes[i];
            if (res.item?._parsedActivityResults) {
                const results = res.item._parsedActivityResults;
                const onReRender = () => reRenderItemActivities.call(this, helper);
                helper.setupUuidDropZones(output, results, onReRender, i);
            }
        }
        helper.scrollToFirstDropZone(output);
    }
}

/**
 * Re-render the item preview after a UUID clear, then re-bind drop zones.
 * @this {ItemWindow}
 * @param {Object} helper - The UUID helper module
 */
async function syncParsedAttachmentsAndNormalized(window) {
    const entries = window.currentParseResult?.successes
        ?? (window.currentParseResult?.item ? [window.currentParseResult] : []);
    const normalized = [];
    for (const entry of entries) {
        const item = entry?.item;
        const parsed = item?._parsedActivityResults;
        const pending = item?.pendingActivities;
        if (Array.isArray(parsed) && Array.isArray(pending) && parsed.length === pending.length) {
            parsed.forEach((result, index) => {
                if (result?.rawData) pending[index].rawData = ItemUtils.deepClone(result.rawData);
            });
        }
        const yaml = await exportItemYaml(item, { includeActivities: true, includeEffects: true });
        if (entry?._workflow) entry._workflow.normalizedText = yaml;
        normalized.push(yaml);
    }
    window.normalizedText = normalized.join("\n---\n");
    const editor = window.element.querySelector("#ii-normalized-input");
    if (editor) editor.value = window.normalizedText;
}

async function reRenderItemActivities(helper) {
    try {
        await syncParsedAttachmentsAndNormalized(this);
    } catch (error) {
        ItemUtils.warn(`Could not synchronize resolved attachment YAML: ${error?.message || error}`);
    }
    // Trigger a full re-render of the parse preview
    const output = this.element.querySelector("#ii-parse-output");
    if (!output) return;

    if (this.currentParseResult?.successes) {
        // Batch mode
        removeUnresolvedBatchSelections(this, helper);
        output.innerHTML = Renderer.renderBatchSummary(this.currentParseResult, this.selectedBatchItems);
    } else if (this.currentParseResult?.item) {
        // Single item mode
        refreshItemUuidState(this.currentParseResult.item, helper);
        output.innerHTML = Renderer.renderItemCard(this.currentParseResult.item, this.currentParseResult);
        updateSingleImportEligibility(this, this.currentParseResult.item, helper);
    }

    this._setupCollapsibleSections();
    if (this.currentParseResult?.successes) this._updateBatchSelection();
    setupItemUuidDropZones.call(this, helper);
}

/**
 * Parse the item text
 * @this {ItemWindow}
 */
export async function parse() {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");
    if (!input || !output || !importBtn) return;

    const text = input.value.trim();

    if (!text) {
        this._invalidateParseResult();
        output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
        return;
    }

    const generation = beginParse(this, importBtn);

    ItemUtils.log("Parsing item text...");

    // Detect batch: Look for multiple strict template markers
    const itemMarkers = stripItemCodeFences(text).match(ITEM_MARKER_LINE);

    if (itemMarkers && itemMarkers.length > 1) {
        ItemUtils.log(`Batch import detected with ${itemMarkers.length} items (marker-based).`);
        await handleBatchParse.call(this, text, generation);
        return;
    }

    // Detect YAML multi-item batch (multiple top-level type keys)
    if (isStrictYamlFormat(text) && isYamlMultiItem(text)) {
        ItemUtils.log("YAML multi-item batch detected.");
        await handleYamlBatchParse.call(this, text, generation);
        return;
    }

    try {
        const result = parseItemText(text, parseWorkflowOptions(this));

        if (!isCurrentParse(this, input, text, generation)) return;

        if (!result?.success || !result.item) {
            const allErrors = [...(result?.errors || []), ...(result?.warnings || [])];
            output.innerHTML = `<div class="ii-parse-error">
        <p><strong>⚠️ Parse Failed</strong></p>
        <ul>${allErrors.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      </div>`;
            importBtn.disabled = true;
            this._updateParseState("error");
            return;
        }

        // Pre-parse activities for UUID resolution
        const helper = await loadUuidHelper();
        if (!isCurrentParse(this, input, text, generation)) return;
        if (helper && result.item.pendingActivities?.length > 0) {
            preParseItemActivities(result.item, helper);
        }

        if (!isCurrentParse(this, input, text, generation)) return;
        await decorateWorkflowPreview(this, text, result);
        if (!isCurrentParse(this, input, text, generation)) return;
        this.currentParseResult = result;

        // Generate card-based preview
        const item = result.item;
        const html = Renderer.renderItemCard(item, result);

        output.innerHTML = html;
        updateSingleImportEligibility(this, item, helper);
        this._updateParseState("valid");

        // Set up collapsible section handlers
        this._setupCollapsibleSections();

        // Set up UUID drop zones if activities were pre-parsed
        if (helper && result.item._parsedActivityResults) {
            setupItemUuidDropZones.call(this, helper);
        }

        ItemUtils.log("Parse successful", result);
    } catch (error) {
        if (!isCurrentParse(this, input, text, generation)) return;
        ItemUtils.error("Parse error", error);
        output.innerHTML = `<div class="ii-parse-error">
      <p><strong>❌ Error</strong></p>
      <p>${esc(error.message)}</p>
    </div>`;
        importBtn.disabled = true;
        this.currentParseResult = null;
        this._updateParseState("error");
    }
}

/**
 * Handle batch parsing of multiple items
 * @this {ItemWindow}
 * @param {string} text - Full input text
 * @param {number} generation - Parse generation that owns this work
 */
export async function handleBatchParse(text, generation = this.parseGeneration) {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");
    if (!input || !output || !importBtn) return;

    // Split the text before each delimiter
    const itemChunks = stripItemCodeFences(text)
        .split(ITEM_MARKER_SPLIT)
        .filter((chunk) => chunk.trim());

    const results = {
        successes: [],
        failures: []
    };

    // Loop and parse each chunk
    for (const [sourceOrder, chunk] of itemChunks.entries()) {
        try {
            const result = parseItemText(chunk, parseWorkflowOptions(this));
            if (result.success && result.item) {
                result._batchSourceOrder = sourceOrder;
                result._batchSourceText = chunk.trim();
                results.successes.push(result);
            } else {
                results.failures.push({
                    text: chunk,
                    errors: [...(result.errors || []), ...(result.warnings || [])],
                    _batchSourceOrder: sourceOrder,
                    _batchSourceText: chunk.trim()
                });
            }
        } catch (error) {
            results.failures.push({
                text: chunk,
                errors: [error.message],
                _batchSourceOrder: sourceOrder,
                _batchSourceText: chunk.trim()
            });
        }
    }
    results._batchSourceSeparator = "\n\n";

    // Pre-parse activities for UUID resolution
    const helper = await loadUuidHelper();
    if (!isCurrentParse(this, input, text, generation)) return;
    if (helper) {
        for (const res of results.successes) {
            preParseItemActivities(res.item, helper);
        }
    }

    if (!isCurrentParse(this, input, text, generation)) return;
    for (const result of results.successes) {
        await decorateWorkflowPreview(this, result._batchSourceText, result, { updateEditor: false, includeIconCandidates: false });
        if (!isCurrentParse(this, input, text, generation)) return;
    }
    this.normalizedText = results.successes.map(result => result._workflow?.normalizedText).filter(Boolean).join("\n---\n");
    const normalizedEditor = this.element.querySelector("#ii-normalized-input");
    if (normalizedEditor) normalizedEditor.value = this.normalizedText;

    // Store results and initialize selection
    this.currentParseResult = results;
    this.selectedBatchItems = new Set(
        results.successes
            .map((result, index) => refreshItemUuidState(result.item, helper) ? null : index)
            .filter(index => index !== null)
    );

    ItemUtils.log("Batch parse complete", results);

    // Render batch summary
    output.innerHTML = Renderer.renderBatchSummary(results, this.selectedBatchItems);

    // Update state and set up handlers
    this._updateParseState(results.successes.length > 0 ? "valid" : "error");
    this._setupCollapsibleSections();
    this._setupBatchFilter();

    // Set up UUID drop zones for batch items
    if (helper) {
        setupItemUuidDropZones.call(this, helper);
    }
    this._updateBatchSelection();
}

/**
 * Handle YAML multi-item batch parsing.
 * Uses the YAML parser's parseAll() to split multiple top-level keys.
 * @this {ItemWindow}
 * @param {string} text - Full YAML input text
 * @param {number} generation - Parse generation that owns this work
 */
async function handleYamlBatchParse(text, generation = this.parseGeneration) {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");
    if (!input || !output || !importBtn) return;

    const allResults = parseAllItemsYaml(normalizeItemInput(text))
        .map(normalizeParsedItemResult)
        .map((result, sourceOrder) => ({
            ...result,
            _batchSourceOrder: sourceOrder,
            _batchSourceText: result.sourceText || ""
        }));

    const results = {
        successes: allResults.filter(r => r.success && r.item),
        failures: allResults
            .filter(r => !r.success || !r.item)
            .map(r => ({
                text: "(YAML block)",
                errors: [...(r.errors || []), ...(r.warnings || [])],
                _batchSourceOrder: r._batchSourceOrder,
                _batchSourceText: r._batchSourceText
            }))
    };
    results._batchSourceSeparator = "\n---\n";

    // Pre-parse activities for UUID resolution
    const helper = await loadUuidHelper();
    if (!isCurrentParse(this, input, text, generation)) return;
    if (helper) {
        for (const res of results.successes) {
            preParseItemActivities(res.item, helper);
        }
    }

    if (!isCurrentParse(this, input, text, generation)) return;
    for (const result of results.successes) {
        await decorateWorkflowPreview(this, result._batchSourceText || text, result, { updateEditor: false, includeIconCandidates: false });
        if (!isCurrentParse(this, input, text, generation)) return;
    }
    this.normalizedText = results.successes.map(result => result._workflow?.normalizedText).filter(Boolean).join("\n---\n");
    const normalizedEditor = this.element.querySelector("#ii-normalized-input");
    if (normalizedEditor) normalizedEditor.value = this.normalizedText;

    // Store results and initialize selection
    this.currentParseResult = results;
    this.selectedBatchItems = new Set(
        results.successes
            .map((result, index) => refreshItemUuidState(result.item, helper) ? null : index)
            .filter(index => index !== null)
    );

    ItemUtils.log("YAML batch parse complete", results);

    // Render batch summary using the same UI as marker-based batches
    output.innerHTML = Renderer.renderBatchSummary(results, this.selectedBatchItems);

    // Update state and set up handlers
    this._updateParseState(results.successes.length > 0 ? "valid" : "error");
    this._setupCollapsibleSections();
    this._setupBatchFilter();

    // Set up UUID drop zones for batch items
    if (helper) {
        setupItemUuidDropZones.call(this, helper);
    }
    this._updateBatchSelection();
}

/**
 * Import the parsed item(s)
 * @this {ItemWindow}
 */
export async function importItems() {
    const parseState = this.currentParseResult;
    const isBatch = Array.isArray(parseState?.successes);
    const isValidSingle = parseState?.success === true && !!parseState.item;

    if (!parseState || (!isBatch && !isValidSingle)) {
        ItemUtils.warn("No item to import");
        ui.notifications.warn("Parse the current input successfully before importing.");
        return;
    }

    if (_uuidHelper) {
        if (isBatch) {
            const requestedIndices = new Set(this.selectedBatchItems);
            const unresolvedIndices = removeUnresolvedBatchSelections(this, _uuidHelper);
            const blockedCount = [...unresolvedIndices].filter(index => requestedIndices.has(index)).length;
            if (blockedCount > 0) {
                ui.notifications.warn(`${blockedCount} selected item${blockedCount === 1 ? " has" : "s have"} unresolved inline activity UUIDs and will not be imported.`);
                this._updateBatchSelection();
            }
        } else if (refreshItemUuidState(parseState.item, _uuidHelper)) {
            updateSingleImportEligibility(this, parseState.item, _uuidHelper);
            _uuidHelper.scrollToFirstDropZone(this.element.querySelector("#ii-parse-output"));
            ui.notifications.warn("Resolve all inline activity UUIDs before importing this item.");
            return;
        }
    }

    const importGeneration = this.parseGeneration;

    // Get selected folder ID from the browser (set by folder selection)
    const folderId = this.selectedFolderId || null;

    // Get the checkbox state
    const aaCheckbox = this.element.querySelector("#ii-use-autoanimations");
    const generateAnimations = aaCheckbox ? aaCheckbox.checked : false;

    // Create options object
    const importOptions = { generateAnimations };

    const importBtn = this.element.querySelector("[data-action='import']");
    const originalText = importBtn.innerHTML;
    importBtn.disabled = true;

    const compareCheckbox = this.element.querySelector("#ii-compare-checkbox");
    const wantsComparison = compareCheckbox?.checked;
    let shouldReset = false;

    // Check if this is a batch import
    if (isBatch) {
        // BATCH IMPORT - Only import selected items
        const allItems = parseState.successes;
        const selectedIndices = Array.from(this.selectedBatchItems).sort((a, b) => a - b);
        const itemsToCreate = selectedIndices
            .map(index => ({ index, parseResult: allItems[index] }))
            .filter(entry => entry.parseResult?.success === true && entry.parseResult.item);

        const total = itemsToCreate.length;

        if (total === 0) {
            ui.notifications.warn("No items selected for import.");
            importBtn.innerHTML = originalText;
            this._updateBatchSelection();
            return;
        }

        ItemUtils.log(`Importing ${total} selected items to folder:`, folderId);

        let successCount = 0;
        let failCount = 0;
        const successfulIndices = new Set();
        const failedIndices = new Set();
        const batchComparisons = [];

        for (let i = 0; i < total; i++) {
            const { index, parseResult } = itemsToCreate[i];
            importBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importing (${i + 1}/${total})...`;

            let result;
            try {
                // Include pre-parsed activity results with resolved UUIDs
                const itemImportOptions = {
                    ...importOptions,
                    parsedActivityResults: parseResult.item._parsedActivityResults || null
                };
                result = await parseResult.item.createItem5e(folderId, itemImportOptions);
            } catch (err) {
                failCount++;
                failedIndices.add(index);
                ui.notifications.error(`Failed to import ${parseResult.item.name}: ${err.message}`);
                continue;
            }

            if (result?.success !== true || !result.item) {
                failCount++;
                failedIndices.add(index);
                const issues = getImportIssues(result);
                ui.notifications.error(`Failed to import ${parseResult.item.name}${issues.length ? `: ${issues.join("; ")}` : ""}`);
                continue;
            }

            // Persistence succeeded. Count and remove this entry even if optional
            // comparison extraction or rendering fails afterward.
            successCount++;
            successfulIndices.add(index);
            const issues = getImportIssues(result);
            if (issues.length > 0) {
                ui.notifications.warn(`${parseResult.item.name} imported with issues: ${issues.join("; ")}`);
            }

            if (wantsComparison) {
                try {
                    const expectedProps = extractExpectedItemProps(parseResult);
                    const actualProps = extractActualItemProps(result.item);
                    const diffReport = compareProperties(expectedProps, actualProps);
                    batchComparisons.push({
                        label: parseResult.item.name || `Item ${i + 1}`,
                        diffReport,
                        expectedProps,
                        actualProps
                    });
                } catch (err) {
                    reportComparisonFailure(parseResult.item.name, err);
                }
            }
        }

        if (successCount > 0) {
            ui.notifications.info(`Successfully imported ${successCount} item${successCount !== 1 ? 's' : ''}.`);
        }
        if (failCount > 0) {
            ui.notifications.warn(`Failed to import ${failCount} item${failCount !== 1 ? 's' : ''}.`);
        }

        // Show batch comparison in a separate window if requested
        if (wantsComparison && batchComparisons.length > 0) {
            try {
                await ItemComparisonWindow.show(batchComparisons, true);
            } catch (err) {
                reportComparisonFailure("Imported batch", err);
            }
        }

        if (this.parseGeneration === importGeneration && this.currentParseResult === parseState) {
            const remainingEntries = allItems
                .map((parseResult, index) => ({ parseResult, index }))
                .filter(entry => !successfulIndices.has(entry.index));

            parseState.successes = remainingEntries.map(entry => entry.parseResult);
            this.selectedBatchItems = new Set(
                remainingEntries
                    .map((entry, newIndex) => failedIndices.has(entry.index) ? newIndex : null)
                    .filter(index => index !== null)
            );

            if (successfulIndices.size > 0) {
                const remainingSource = buildRemainingBatchSource(parseState);
                const input = this.element.querySelector("#ii-input");
                if (remainingSource != null && input) {
                    input.value = remainingSource;
                } else if (remainingSource == null) {
                    ItemUtils.warn("Imported entries were removed from preview, but the remaining batch source could not be reconstructed safely.");
                    ui.notifications.warn("Some items imported, but retry text could not be rewritten safely. Use the current preview without reparsing.");
                }
            }

            shouldReset = parseState.successes.length === 0 && parseState.failures.length === 0;
            if (!shouldReset) {
                const output = this.element.querySelector("#ii-parse-output");
                if (output) output.innerHTML = Renderer.renderBatchSummary(parseState, this.selectedBatchItems);
                this._updateParseState(parseState.successes.length > 0 ? "valid" : "error");
                this._setupCollapsibleSections();
                this._updateBatchSelection();
                if (_uuidHelper) setupItemUuidDropZones.call(this, _uuidHelper);
            }
        }

    } else if (isValidSingle) {
        // SINGLE ITEM IMPORT
        ItemUtils.log("Importing single item to folder:", folderId);
        importBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importing...`;

        let result;
        try {
            // Include pre-parsed activity results with resolved UUIDs
            const singleImportOptions = {
                ...importOptions,
                parsedActivityResults: parseState.item._parsedActivityResults || null
            };
            result = await parseState.item.createItem5e(folderId, singleImportOptions);
        } catch (err) {
            ItemUtils.error("Import failed", err);
            ui.notifications.error(`Failed to import: ${err.message}`);
        }

        if (result?.success !== true || !result.item) {
            if (result) {
                const issues = getImportIssues(result);
                ui.notifications.error(`Failed to import ${parseState.item.name}${issues.length ? `: ${issues.join("; ")}` : ""}`);
            }
        } else {
            shouldReset = true;
            const issues = getImportIssues(result);
            if (issues.length > 0) {
                ui.notifications.warn(`${parseState.item.name} imported with issues: ${issues.join("; ")}`);
            }

            if (wantsComparison) {
                try {
                    await showItemComparison.call(this, parseState, result.item);
                } catch (err) {
                    reportComparisonFailure(parseState.item.name, err);
                }
            }
        }
    }

    importBtn.innerHTML = originalText;
    if (this.parseGeneration !== importGeneration || this.currentParseResult !== parseState) return;

    if (shouldReset) {
        reset.call(this);
    } else if (isBatch) {
        this._updateBatchSelection();
    } else {
        importBtn.disabled = false;
    }
}

/**
 * Show the comparison view after importing a single item.
 * @this {ItemWindow}
 * @param {Object} parseResult - The parse result with .item (ItemData)
 * @param {Object} createdItem - The created Foundry Item document
 */
async function showItemComparison(parseResult, createdItem) {
    const expectedProps = extractExpectedItemProps(parseResult);
    const actualProps = extractActualItemProps(createdItem);
    const diffReport = compareProperties(expectedProps, actualProps);

    const comparisons = [{
        label: parseResult.item.name || "Imported Item",
        diffReport,
        expectedProps,
        actualProps
    }];

    await ItemComparisonWindow.show(comparisons);
    ItemUtils.log("Comparison window opened", comparisons);
}

/** Report optional comparison failures without changing persisted import success. */
function reportComparisonFailure(label, error) {
    const detail = error?.message || String(error);
    try {
        ItemUtils.warn(`Comparison failed after ${label} was imported: ${detail}`);
    } catch {
        // Comparison reporting must never change the committed import state.
    }
    try {
        ui.notifications.warn(`${label} imported successfully, but its comparison could not be generated.`);
    } catch {
        // Comparison reporting must never change the committed import state.
    }
}

/**
 * Reset the form
 * @this {ItemWindow}
 */
export function reset() {
    this.droppedItemUuid = null;
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    if (input) {
        input.value = "";
    }

    this._invalidateParseResult();

    if (output) {
        output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
    }

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.classList.remove("has-selection");
        delete importBtn.dataset.count;
    }

    ItemUtils.log("Form reset");
}

/**
 * Insert a template example into the input
 * @this {ItemWindow}
 * @param {Event} event - Click event
 * @param {Object} data - Contains templateId
 */
export function insertTemplate(event, targetOrOptions = {}) {
    const { templateId } = targetOrOptions?.dataset ?? targetOrOptions;
    this.droppedItemUuid = null;
    const template = ITEM_TEMPLATES.find(t => t.id === templateId);

    if (!template) return;

    const input = this.element.querySelector("#ii-input");
    if (input) {
        const createIdentified = game.settings.get(MODULE_NAME, "createIdentified");
        const templateText = template.text.replace(
            /(^\s*Identified:\s*)(true|false)/im,
            `$1${createIdentified}`
        );
        input.value = templateText;
        this._invalidateParseResult();
        input.focus();

        // Trigger parse if auto-parse is enabled
        if (game.settings.get(MODULE_NAME, "autoParse")) {
            if (this.parseTimeout) {
                clearTimeout(this.parseTimeout);
            }
            this.parseTimeout = setTimeout(() => {
                parse.call(this);
            }, 100);
        }
    }

    ItemUtils.log("Template inserted:", templateId);
}

/**
 * Select all batch items
 * @this {ItemWindow}
 */
export function selectAllBatch() {
    if (!this.currentParseResult?.successes) return;

    this.selectedBatchItems = new Set(
        this.currentParseResult.successes
            .map((result, index) => result.item?._hasUnresolvedUuids ? null : index)
            .filter(index => index !== null)
    );

    this._updateBatchSelection();
}

/**
 * Deselect all batch items
 * @this {ItemWindow}
 */
export function selectNoneBatch() {
    this.selectedBatchItems = new Set();
    this._updateBatchSelection();
}

/**
 * Toggle a single batch item selection
 * @this {ItemWindow}
 * @param {Event} event - Click event
 * @param {Object} data - Contains index
 */
export function toggleBatchItem(event, targetOrOptions = {}) {
    const { index } = targetOrOptions?.dataset ?? targetOrOptions;
    const idx = parseInt(index);
    if (this.currentParseResult?.successes?.[idx]?.item?._hasUnresolvedUuids) {
        this.selectedBatchItems.delete(idx);
        this._updateBatchSelection();
        return;
    }

    // Don't toggle if clicking directly on checkbox (it handles itself)
    if (event?.target?.classList?.contains("ii-batch-checkbox")) {
        const isChecked = event.target.checked;
        if (isChecked) {
            this.selectedBatchItems.add(idx);
        } else {
            this.selectedBatchItems.delete(idx);
        }
    } else {
        // Card click - toggle
        if (this.selectedBatchItems.has(idx)) {
            this.selectedBatchItems.delete(idx);
        } else {
            this.selectedBatchItems.add(idx);
        }
    }

    this._updateBatchSelection();
}

function refreshSavedPresetOptions(window) {
    const select = window.element.querySelector("#ii-template-select");
    if (!select) return;
    select.querySelector('optgroup[data-saved-presets="true"]')?.remove();
    const presets = listSavedPresets();
    if (!presets.length) return;
    const group = document.createElement("optgroup");
    group.label = localize("II.Presets.Saved", "My presets");
    group.dataset.savedPresets = "true";
    for (const preset of presets) {
        const option = document.createElement("option");
        option.value = `saved:${preset.id}`;
        option.textContent = preset.name;
        group.appendChild(option);
    }
    select.appendChild(group);
    if (window.activePresetId) select.value = `saved:${window.activePresetId}`;
}

export function insertSavedPreset(presetId) {
    this.droppedItemUuid = null;
    const preset = listSavedPresets().find(candidate => candidate.id === presetId);
    if (!preset) return;
    const input = this.element.querySelector("#ii-input");
    if (!input) return;
    input.value = preset.text;
    this.activePresetId = preset.id;
    this._invalidateParseResult();
    parse.call(this);
}

export async function saveCurrentPreset() {
    const input = this.element.querySelector("#ii-input");
    const nameInput = this.element.querySelector("#ii-preset-name");
    try {
        const preset = await savePreset(nameInput?.value, input?.value, { id: this.activePresetId });
        this.activePresetId = preset.id;
        if (nameInput) nameInput.value = preset.name;
        refreshSavedPresetOptions(this);
        ui.notifications.info(localize("II.Notifications.PresetSaved", "Saved preset: {name}", { name: preset.name }));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

export async function deleteCurrentPreset() {
    if (!this.activePresetId) {
        ui.notifications.warn("Select a saved preset before deleting it.");
        return;
    }
    const preset = listSavedPresets().find(candidate => candidate.id === this.activePresetId);
    const confirmed = await confirmDialog({
        title: "Delete Saved Preset?",
        content: `<p>Delete <strong>${esc(preset?.name || "this preset")}</strong> from this client?</p>`,
        yes: "Delete"
    });
    if (!confirmed) return;
    if (await deletePreset(this.activePresetId)) {
        this.activePresetId = null;
        const nameInput = this.element.querySelector("#ii-preset-name");
        if (nameInput) nameInput.value = "";
        refreshSavedPresetOptions(this);
        this.element.querySelector("#ii-template-select").value = "";
        ui.notifications.info(localize("II.Notifications.PresetDeleted", "Deleted preset."));
    }
}

export async function copyNormalized() {
    const editor = this.element.querySelector("#ii-normalized-input");
    try {
        if (!editor?.value.trim()) throw new Error("Parse an Item before copying normalized YAML.");
        await copyText(editor.value);
        ui.notifications.info(localize("II.Notifications.Copied", "Copied normalized YAML."));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

export function downloadNormalized() {
    const editor = this.element.querySelector("#ii-normalized-input");
    if (!editor?.value.trim()) {
        ui.notifications.warn("Parse an Item before downloading normalized YAML.");
        return;
    }
    const name = this.currentParseResult?.item?.name
        ?? this.currentParseResult?.successes?.[0]?.item?.name
        ?? "5e-items";
    downloadText(editor.value, `${name}.yaml`);
}

export async function reparseNormalized() {
    this.droppedItemUuid = null;
    const editor = this.element.querySelector("#ii-normalized-input");
    const input = this.element.querySelector("#ii-input");
    if (!editor?.value.trim() || !input) return;
    input.value = editor.value;
    this._invalidateParseResult();
    await parse.call(this);
}

export function cancelImport() {
    if (!this.importInProgress) return;
    this.importCancelled = true;
    ui.notifications.warn(localize(
        "II.Notifications.CancelRequested",
        "Import will stop after the current Item."
    ));
}

export async function undoLastImport(_event, targetOrOptions) {
    const undoButton = targetOrOptions?.closest?.("[data-action='undoLast']")
        ?? this.element?.querySelector?.("[data-action='undoLast']")
        ?? null;
    const importButton = this.element?.querySelector?.("[data-action='import']") ?? null;
    const importWasDisabled = importButton?.disabled === true;
    if (undoButton?.disabled) return;
    if (undoButton) undoButton.disabled = true;
    if (importButton) importButton.disabled = true;
    try {
        if (isWorkflowMutationBusy()) {
            throw new Error(localize(
                "II.Errors.WorkflowMutationBusy",
                "Another import or undo operation is already in progress. Wait for it to finish before changing Items."
            ));
        }
        const session = getLastUndoableSession();
        if (!session) {
            ui.notifications.warn(localize("II.Notifications.NoUndo", "There is no undoable import session."));
            return;
        }
        const confirmed = await confirmDialog({
            title: localize("II.Confirm.UndoTitle", "Undo Last Item Import?"),
            content: `<p>${esc(localize(
                "II.Confirm.UndoBody",
                "This removes Items created by the last session and restores updated/merged Items from session-only snapshots. Continue?"
            ))}</p>`,
            yes: "Undo Import"
        });
        if (!confirmed) return;
        const report = await undoImportSession(session);
        this._renderHistory();
        ui.notifications[report.failed ? "warn" : "info"](localize(
            "II.Notifications.UndoResult",
            "Undo complete: {undone} restored/removed, {failed} failed.",
            report
        ));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    } finally {
        if (undoButton?.isConnected !== false) undoButton.disabled = false;
        if (importButton?.isConnected !== false) importButton.disabled = importWasDisabled;
    }
}

export function downloadLastReport() {
    const session = getImportHistory()[0];
    if (!session) {
        ui.notifications.warn(localize("II.Notifications.NoHistory", "There is no import session to report."));
        return;
    }
    downloadText(formatImportReport(session), `5e-item-import-${session.id}.txt`, "text/plain");
}

function getAttachmentRawValues(payload) {
    const parsedRaw = (Array.isArray(payload?.parseResults) ? payload.parseResults : [])
        .flatMap(result => Array.isArray(result?.rawData)
            ? result.rawData
            : result?.rawData && typeof result.rawData === "object"
                ? [result.rawData]
                : []);
    if (parsedRaw.length) return parsedRaw;
    const raw = payload?.rawData;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") return [raw];
    return [];
}

export function addCapturedAttachmentsToYaml(source, payload) {
    const document = jsyaml.load(normalizeItemInput(source));
    if (!document || typeof document !== "object" || Array.isArray(document)) {
        throw new Error("Parse or normalize a strict Item before adding captured Activities.");
    }
    const topKey = YAML_ITEM_KEYS.find(key => document[key] && typeof document[key] === "object");
    if (!topKey) throw new Error("The normalized input does not contain a supported strict Item.");
    const body = document[topKey];
    const mode = payload?.mode === "effect" ? "effect" : "activity";
    const listKey = mode === "effect" ? "effects" : "Activities";
    body[listKey] = Array.isArray(body[listKey]) ? body[listKey] : [];
    body[listKey].push(...normalizeCapturedAttachmentValues(getAttachmentRawValues(payload), { mode }));
    return jsyaml.dump(document, { lineWidth: -1 });
}

export async function openInlineActivityBuilder() {
    const hasSingleItem = this.currentParseResult?.success === true && !!this.currentParseResult.item;
    if (Array.isArray(this.currentParseResult?.successes) || !hasSingleItem) {
        ui.notifications.warn(localize(
            "II.Notifications.BuilderBatchUnsupported",
            "Open Activity Builder only when exactly one Item is parsed."
        ));
        return;
    }
    try {
        await openActivityBuilder({
            mode: "activity",
            text: "",
            itemUuid: this.droppedItemUuid || null,
            autoParse: true,
            captureOnly: true,
            onResult: async payload => {
                const rawValues = getAttachmentRawValues(payload);
                if (!rawValues.length) {
                    ui.notifications.warn("Activity Builder returned no strict rawData to attach.");
                    return;
                }
                const input = this.element.querySelector("#ii-input");
                const normalizedEditor = this.element.querySelector("#ii-normalized-input");
                const base = normalizedEditor?.value?.trim()
                    ? normalizedEditor.value
                    : this.normalizedText || input?.value || "";
                input.value = addCapturedAttachmentsToYaml(base, payload);
                this._invalidateParseResult();
                await parse.call(this);
            }
        });
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

export async function resolveInlineReferences() {
    const parseState = this.currentParseResult;
    const items = parseState?.successes
        ? parseState.successes.map(result => result.item)
        : parseState?.item ? [parseState.item] : [];
    const parseResults = items.flatMap(item => item?._parsedActivityResults || []);
    if (!parseResults.length) {
        ui.notifications.info("No parsed inline Activity references need resolution.");
        return;
    }
    try {
        const report = await resolveActivityReferences(parseResults, { apply: true });
        if (_uuidHelper) await reRenderItemActivities.call(this, _uuidHelper);
        const count = value => Array.isArray(value)
            ? value.length
            : Number.isFinite(Number(value)) ? Number(value) : 0;
        ui.notifications.info(localize(
            "II.Notifications.ReferencesResolved",
            "Resolved {resolved} exact reference(s); {unresolved} remain unresolved and {ambiguous} are ambiguous.",
            {
                resolved: count(report?.resolved),
                unresolved: count(report?.unresolved),
                ambiguous: count(report?.ambiguous)
            }
        ));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

export async function removeSuggestedAutomation(event, targetOrOptions = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const { itemIndex = "", pendingIndex = "" } = targetOrOptions?.dataset ?? targetOrOptions;
    const parsedIndex = Number.parseInt(pendingIndex, 10);
    const batchIndex = itemIndex === "" ? null : Number.parseInt(itemIndex, 10);
    const result = batchIndex === null
        ? this.currentParseResult
        : this.currentParseResult?.successes?.[batchIndex];
    const item = result?.item;
    if (!item || !Number.isInteger(parsedIndex) || !item.pendingActivities?.[parsedIndex]?._synthesized) return;

    item.pendingActivities.splice(parsedIndex, 1);
    if (Array.isArray(item._parsedActivityResults)) item._parsedActivityResults.splice(parsedIndex, 1);
    const normalizedEditor = this.element.querySelector("#ii-normalized-input");
    try {
        const items = batchIndex === null
            ? [item]
            : this.currentParseResult.successes.map(entry => entry.item);
        const yaml = [];
        for (const parsedItem of items) {
            yaml.push(await exportItemYaml(parsedItem, { includeActivities: true, includeEffects: true }));
        }
        this.normalizedText = yaml.join("\n---\n");
        if (normalizedEditor) normalizedEditor.value = this.normalizedText;
    } catch (error) {
        this.normalizedText = "";
        if (normalizedEditor) normalizedEditor.value = "";
        ItemUtils.warn(`Normalized YAML was cleared after removing automation: ${error?.message || error}`);
    }
    const output = this.element.querySelector("#ii-parse-output");
    if (!output) return;
    if (batchIndex === null) {
        output.innerHTML = Renderer.renderItemCard(item, result);
    } else {
        output.innerHTML = Renderer.renderBatchSummary(this.currentParseResult, this.selectedBatchItems);
    }
    this._setupCollapsibleSections();
    this._setupBatchFilter();
    if (_uuidHelper) {
        refreshItemUuidState(item, _uuidHelper);
        setupItemUuidDropZones.call(this, _uuidHelper);
    }
    if (batchIndex === null) updateSingleImportEligibility(this, item, _uuidHelper);
    else this._updateBatchSelection();
    ui.notifications.info(localize(
        "II.Notifications.SuggestionRemoved",
        "Removed the suggested automation from this import preview."
    ));
}

const HTML_TEXT_BLOCK_ELEMENTS = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "CAPTION", "DD", "DETAILS", "DIALOG",
    "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM",
    "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HGROUP", "LI", "MAIN",
    "NAV", "OL", "P", "PRE", "SECTION", "SUMMARY", "TABLE", "TBODY", "TFOOT",
    "THEAD", "TR", "UL"
]);
const HTML_TEXT_IGNORED_ELEMENTS = new Set(["NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE"]);

/**
 * Convert rich HTML drop/Journal content to parser-friendly plain text.
 * DOM textContent alone joins adjacent block elements (and table rows), which can
 * turn otherwise valid strict item fields into one unparseable line.
 */
export function plainTextFromHtml(html) {
    if (!String(html ?? "").trim()) return "";
    const parsed = new DOMParser().parseFromString(String(html), "text/html");
    if (!parsed.body) return "";

    const chunks = [];
    const visit = (node, preserveWhitespace = false) => {
        if (node?.nodeType === 3) {
            const value = String(node.nodeValue ?? "");
            chunks.push({
                type: "text",
                value: preserveWhitespace ? value : value.replace(/[\t\r\n\f ]+/g, " "),
                preserveWhitespace
            });
            return;
        }
        if (node?.nodeType !== 1) return;

        const tag = String(node.tagName ?? "").toUpperCase();
        if (HTML_TEXT_IGNORED_ELEMENTS.has(tag)) return;
        if (tag === "BR" || tag === "HR") {
            chunks.push({ type: "break", preserveWhitespace });
            return;
        }

        const isBlock = HTML_TEXT_BLOCK_ELEMENTS.has(tag);
        if (isBlock && !preserveWhitespace) chunks.push({ type: "break", preserveWhitespace: false });
        const preserveChildren = preserveWhitespace || tag === "PRE";
        for (const child of Array.from(node.childNodes ?? [])) visit(child, preserveChildren);
        if ((tag === "TD" || tag === "TH") && !preserveWhitespace) chunks.push({ type: "cell" });
        if (isBlock && !preserveWhitespace) chunks.push({ type: "break", preserveWhitespace: false });
    };
    visit(parsed.body);

    let text = "";
    let trimNextCollapsibleSpace = false;
    for (const chunk of chunks) {
        if (chunk.type === "text") {
            let value = chunk.value;
            if (trimNextCollapsibleSpace && !chunk.preserveWhitespace) value = value.replace(/^ /, "");
            text += value;
            if (value) trimNextCollapsibleSpace = false;
            continue;
        }
        if (chunk.type === "cell") {
            text = text.replace(/[ \t]+$/, "");
            if (text && !/[\s\u00a0\u2007\u202f]$/.test(text)) text += " ";
            trimNextCollapsibleSpace = true;
            continue;
        }

        if (!chunk.preserveWhitespace) text = text.replace(/[ \t]+$/, "");
        const trailingNewlines = text.match(/\n+$/)?.[0].length ?? 0;
        if (chunk.preserveWhitespace || trailingNewlines < 2) text += "\n";
        trimNextCollapsibleSpace = !chunk.preserveWhitespace;
    }

    return text
        .replace(/\r\n?/g, "\n")
        .replace(/[\u00a0\u2007\u202f]/g, " ")
        .replace(/\n[ \t]+(?=\n)/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function journalText(document) {
    const pages = document?.documentName === "JournalEntryPage" ? [document] : Array.from(document?.pages ?? []);
    return pages.map(page => {
        const source = page?.text?.content ?? page?.system?.text?.content ?? page?.content ?? "";
        return plainTextFromHtml(source);
    }).filter(Boolean).join("\n\n");
}

async function readDroppedFiles(files) {
    const accepted = [];
    for (const file of Array.from(files || [])) {
        if (file.size > 2_000_000) throw new Error(`${file.name} exceeds the 2 MB text-file limit.`);
        if (!/\.(?:txt|md|markdown|ya?ml|json)$/i.test(file.name)) continue;
        accepted.push(await file.text());
    }
    return accepted.join("\n---\n");
}

function selectDroppedDocumentDestination(window, document) {
    const kind = window.element.querySelector("#ii-destination-kind");
    if (!kind) return;
    const actor = document?.documentName === "Actor"
        ? document
        : document?.parent?.documentName === "Actor" ? document.parent : null;
    if (actor) {
        const actorSelect = window.element.querySelector("#ii-actor-select");
        if (actorSelect && Array.from(actorSelect.options).some(option => option.value === actor.uuid)) {
            kind.value = "actor";
            actorSelect.value = actor.uuid;
            kind.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            ui.notifications.warn(localize(
                "II.Notifications.ActorDropUnavailable",
                "That Actor is not available as a writable import destination."
            ));
        }
    } else if (document.pack) {
        const packSelect = window.element.querySelector("#ii-pack-select");
        if (packSelect && Array.from(packSelect.options).some(option => option.value === document.pack)) {
            kind.value = "compendium";
            packSelect.value = document.pack;
            kind.dispatchEvent(new Event("change", { bubbles: true }));
        }
    } else {
        const worldOption = kind.querySelector('option[value="world"]');
        if (worldOption?.disabled) return;
        kind.value = "world";
        window.selectedFolderId = document.folder?.id ?? document.folder ?? null;
        kind.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

export async function handleInputDrop(event) {
    const input = this.element.querySelector("#ii-input");
    if (!input) return;
    try {
        const useText = async text => {
            if (text.length > 2_000_000) throw new Error("Dropped text exceeds the 2 MB limit.");
            input.value = text;
            this.droppedItemUuid = null;
            this._invalidateParseResult();
            await parse.call(this);
        };
        const fileText = await readDroppedFiles(event.dataTransfer?.files);
        if (fileText.trim()) {
            await useText(fileText);
            return;
        }

        let dragData = null;
        try {
            dragData = TextEditor.getDragEventData(event);
        } catch {
            dragData = null;
        }
        const uuid = dragData?.uuid
            ?? (dragData?.pack && dragData?.id ? `Compendium.${dragData.pack}.${dragData.id}` : null);
        const dropped = uuid ? await fromUuid(uuid) : null;
        if (dropped?.documentName === "Actor") {
            selectDroppedDocumentDestination(this, dropped);
            return;
        }
        if (dropped?.documentName === "Item") {
            const canExportFull = getActivityCapabilities().fullSerialization;
            input.value = canExportFull
                ? await exportFullItemYaml(dropped)
                : await exportCoreItemYaml(dropped);
            if (!canExportFull && itemHasAttachments(dropped)) {
                ui.notifications.warn(localize(
                    "II.Notifications.CoreItemDrop",
                    "Loaded core Item YAML. Activities and Active Effects were omitted because 5e Activity Importer serialization is unavailable."
                ));
            }
            this.droppedItemUuid = dropped.uuid;
            selectDroppedDocumentDestination(this, dropped);
            this._invalidateParseResult();
            await parse.call(this);
            return;
        }
        if (["JournalEntry", "JournalEntryPage"].includes(dropped?.documentName)) {
            const text = journalText(dropped);
            if (!text) throw new Error("The dropped Journal document has no usable text pages.");
            await useText(text);
            return;
        }

        const plain = event.dataTransfer?.getData("text/plain") ?? "";
        if (plain.trim() && !hasStructuredDragData(dragData)) {
            await useText(plain);
            return;
        }
        const html = event.dataTransfer?.getData("text/html") ?? "";
        const sanitized = plainTextFromHtml(html);
        if (sanitized) {
            await useText(sanitized);
            return;
        }
        ui.notifications.warn(localize("II.Notifications.DropUnsupported", "That drop does not contain a supported Item, Actor, Journal page, or text file."));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}
