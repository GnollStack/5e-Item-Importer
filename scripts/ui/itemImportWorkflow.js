/**
 * Destination-aware Item import workflow.
 *
 * Cancellation is cooperative: it stops before the next document mutation and
 * never attempts to interrupt an in-flight Foundry create/update transaction.
 */

import { ItemUtils } from "../itemUtils.js";
import {
    beginImportSession,
    completeImportSession,
    findDestinationDuplicate,
    getLastUndoableSession,
    localize,
    recordImportResult,
    resolveDestination,
    snapshotItemForUndo
} from "./itemWorkflowServices.js";
import { extractExpectedItemProps, extractActualItemProps } from "./itemComparisonExtractor.js";
import { compareProperties } from "./itemComparisonEngine.js";
import { ItemComparisonWindow } from "./itemComparisonWindow.js";

const esc = value => ItemUtils.escapeHtml(value);

function getIssues(result) {
    return Array.isArray(result?.issues)
        ? result.issues.filter(issue => typeof issue === "string" && issue.trim())
        : [];
}

function rebuildRemainingBatchSource(parseState) {
    const entries = [
        ...(parseState?.successes || []),
        ...(parseState?.failures || [])
    ].map(entry => ({ order: entry?._batchSourceOrder, text: entry?._batchSourceText }));
    if (entries.some(entry => !Number.isInteger(entry.order) || typeof entry.text !== "string" || !entry.text.trim())) {
        return null;
    }
    entries.sort((left, right) => left.order - right.order);
    return entries.map(entry => entry.text.trim()).join(parseState?._batchSourceSeparator || "\n\n");
}

async function confirmDialog({ title, content, yes = "Continue", no = "Cancel" }) {
    const DialogV2 = foundry.applications.api.DialogV2;
    if (typeof DialogV2?.confirm === "function") {
        return DialogV2.confirm({
            window: { title },
            content,
            yes: { label: yes, icon: "fas fa-check" },
            no: { label: no, icon: "fas fa-times" },
            modal: true
        });
    }

    return new Promise(resolve => {
        Dialog.confirm({
            title,
            content,
            yes: () => resolve(true),
            no: () => resolve(false),
            close: () => resolve(false)
        });
    });
}

function renderPathList(title, paths) {
    const visible = (paths || []).slice(0, 40);
    const remaining = Math.max(0, (paths?.length || 0) - visible.length);
    return `<section class="ii-conflict-paths">
      <h4>${esc(title)} (${paths?.length || 0})</h4>
      ${visible.length
        ? `<ul>${visible.map(path => `<li><code>${esc(path)}</code></li>`).join("")}</ul>`
        : `<p class="hint">None</p>`}
      ${remaining ? `<p class="hint">…and ${remaining} more paths.</p>` : ""}
    </section>`;
}

async function confirmOperationPlan(plan) {
    const operation = plan?.operation === "merge" ? "merge" : "update";
    const title = localize(
        "II.Confirm.DuplicateTitle",
        "Confirm {operation}: {name}",
        { operation, name: plan?.itemName || "Item" }
    );
    const targetUuid = String(plan?.itemUuid ?? "").trim();
    const content = `<div class="ii-conflict-preview">
      <p>${esc(localize("II.Confirm.DuplicateIntro", "Review the exact path policy before changing the existing Item."))}</p>
      ${targetUuid ? `<p class="ii-conflict-target"><strong>${esc(localize("II.Confirm.DuplicateTarget", "Exact target"))}:</strong> <code>${esc(targetUuid)}</code></p>` : ""}
      ${renderPathList(localize("II.Confirm.ReplacePaths", "Paths update will replace"), plan?.replacedPaths)}
      ${renderPathList(localize("II.Confirm.PreservePaths", "Paths merge/update preserves"), plan?.preservedPaths)}
      ${renderPathList(localize("II.Confirm.AddPaths", "Paths merge/update adds"), plan?.addedPaths)}
    </div>`;
    return confirmDialog({ title, content, yes: operation === "merge" ? "Merge" : "Update" });
}

function getEntryDuplicateMode(window, index = null) {
    if (index !== null) {
        const parseResult = window.currentParseResult?.successes?.[index];
        const entryMode = window.element.querySelector(`.ii-entry-mode[data-index="${index}"]`)?.value;
        const selectedMode = entryMode ?? parseResult?._duplicateMode;
        if (["create", "update", "merge", "skip"].includes(selectedMode)) return selectedMode;
    }
    const globalMode = window.element.querySelector("#ii-duplicate-mode")?.value;
    return ["create", "update", "merge", "skip"].includes(globalMode) ? globalMode : "create";
}

/** Snapshot the reviewed per-entry policy before any asynchronous import work begins. */
export function buildBatchImportQueue(window, parseState = window.currentParseResult) {
    const allItems = Array.isArray(parseState?.successes) ? parseState.successes : [];
    return [...(window.selectedBatchItems || [])]
        .sort((left, right) => left - right)
        .map(index => ({
            index,
            parseResult: allItems[index],
            duplicateMode: getEntryDuplicateMode(window, index)
        }))
        .filter(entry => entry.parseResult?.success === true && entry.parseResult.item);
}

function getBuildOptions(window) {
    return {
        generateAnimations: !!window.element.querySelector("#ii-use-autoanimations")?.checked,
        compendiumImageMode: window.element.querySelector("#ii-icon-mode")?.value || "deterministic",
        compendiumImageSeed: window.element.querySelector("#ii-icon-seed")?.value?.trim() || undefined
    };
}

async function importOne(window, parseResult, {
    destination,
    duplicateMode,
    session,
    buildOptions
}) {
    const parsedItem = parseResult?.item;
    let existingItem = null;
    let operation = duplicateMode;
    let beforeData = null;
    let result;
    try {
        if (duplicateMode !== "create") {
            existingItem = await findDestinationDuplicate(destination, {
                name: parsedItem?.name,
                type: parsedItem?.type
            });
        }
        operation = existingItem ? duplicateMode : "create";
        beforeData = (operation === "update" || operation === "merge")
            ? snapshotItemForUndo(existingItem)
            : null;
        result = await parsedItem.createItem5e(null, {
            ...buildOptions,
            destination,
            existingItem,
            operation,
            importSessionId: session.id,
            shouldCancel: () => window.importCancelled === true,
            parsedActivityResults: parsedItem._parsedActivityResults || null,
            confirmOperation: confirmOperationPlan
        });
    } catch (error) {
        result = {
            success: false,
            operation,
            item: null,
            issues: [error?.message || String(error)],
            activityResults: null
        };
    }

    recordImportResult(session, {
        name: parsedItem?.name,
        type: parsedItem?.type,
        success: result?.success === true,
        skipped: result?.skipped === true,
        cancelled: result?.cancelled === true,
        operation: result?.operation ?? operation,
        document: result?.item,
        issues: getIssues(result),
        beforeData,
        activityResults: result?.activityResults
    });
    return result;
}

function addComparison(comparisons, parseResult, document, label) {
    try {
        const expectedProps = extractExpectedItemProps(parseResult);
        const actualProps = extractActualItemProps(document);
        comparisons.push({
            label,
            diffReport: compareProperties(expectedProps, actualProps),
            expectedProps,
            actualProps
        });
    } catch (error) {
        ItemUtils.warn(`Comparison failed after ${label} persisted: ${error?.message || error}`);
        ui.notifications.warn(`${label} persisted successfully, but its comparison could not be generated.`);
    }
}

function setImportControls(window, { running, progress = null } = {}) {
    const importButton = window.element?.querySelector?.("[data-action='import']");
    const cancelButton = window.element?.querySelector?.("[data-action='cancelImport']");
    const undoButton = window.element?.querySelector?.("[data-action='undoLast']");
    if (importButton) {
        importButton.disabled = !!running;
        if (progress) importButton.innerHTML = `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${esc(progress)}`;
    }
    if (cancelButton) cancelButton.hidden = !running;
    if (undoButton) undoButton.disabled = !!running || !getLastUndoableSession();
}

export async function runItemImportWorkflow(window) {
    const parseState = window.currentParseResult;
    if (window.importInProgress) return;
    const isBatch = Array.isArray(parseState?.successes);
    const isSingle = parseState?.success === true && !!parseState.item;
    if (!isBatch && !isSingle) {
        ui.notifications.warn("Parse the current input successfully before importing.");
        return;
    }

    // Policy controls remain interactive for accessibility while a workflow is
    // running, so capture their reviewed values before the first await.
    const duplicateMode = getEntryDuplicateMode(window);
    const batchQueue = isBatch ? buildBatchImportQueue(window, parseState) : null;
    if (isBatch && batchQueue.length === 0) {
        ui.notifications.warn("No items selected for import.");
        return;
    }

    const sourceInput = window.element.querySelector("#ii-input");
    const reviewedSourceText = sourceInput?.value ?? "";
    const wantsComparison = !!window.element.querySelector("#ii-compare-checkbox")?.checked;
    const buildOptions = getBuildOptions(window);
    const importGeneration = window.parseGeneration;
    const importButton = window.element.querySelector("[data-action='import']");
    const originalButtonHtml = importButton?.innerHTML ?? "";
    window.importInProgress = true;
    setImportControls(window, { running: true, progress: localize("II.Import.Preparing", "Preparing\u2026") });
    let destination;
    try {
        destination = await resolveDestination(window._getDestination());
        await window._persistDestination();
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
        const closeRequested = window.closeRequestedDuringImport === true;
        window.importInProgress = false;
        setImportControls(window, { running: false });
        if (importButton) importButton.innerHTML = originalButtonHtml;
        if (closeRequested) {
            window.closeRequestedDuringImport = false;
            await window.close();
        }
        return;
    }
    let session;
    try {
        session = beginImportSession({
            destination,
            duplicateMode,
            sourceText: reviewedSourceText
        });
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
        const closeRequested = window.closeRequestedDuringImport === true;
        window.importInProgress = false;
        setImportControls(window, { running: false });
        if (importButton) importButton.innerHTML = originalButtonHtml;
        if (closeRequested) {
            window.closeRequestedDuringImport = false;
            await window.close();
        }
        return;
    }
    window.lastImportSessionId = session.id;
    window.importCancelled = false;
    const comparisons = [];
    let cancelled = false;

    try {
        if (isBatch) {
            const allItems = parseState.successes;
            const queue = batchQueue;

            const handledIndices = new Set();
            const failedIndices = new Set();
            let successCount = 0;
            let skippedCount = 0;

            for (let position = 0; position < queue.length; position++) {
                if (window.importCancelled) {
                    cancelled = true;
                    for (const pending of queue.slice(position)) failedIndices.add(pending.index);
                    break;
                }

                const { index, parseResult, duplicateMode: mode } = queue[position];
                setImportControls(window, {
                    running: true,
                    progress: `Importing ${position + 1}/${queue.length}`
                });
                const result = await importOne(window, parseResult, {
                    destination,
                    duplicateMode: mode,
                    session,
                    buildOptions
                });

                if (result?.cancelled === true) {
                    failedIndices.add(index);
                    ui.notifications.info(`${parseResult.item.name}: no changes were made; the Item remains available for retry.`);
                } else if (result?.success === true) {
                    handledIndices.add(index);
                    if (result.skipped) skippedCount++;
                    else successCount++;
                    const issues = getIssues(result);
                    if (issues.length) ui.notifications.warn(`${parseResult.item.name}: ${issues.join("; ")}`);
                    if (wantsComparison && !result.skipped && result.item) {
                        addComparison(comparisons, parseResult, result.item, parseResult.item.name);
                    }
                } else {
                    failedIndices.add(index);
                    const issues = getIssues(result);
                    ui.notifications.error(`Failed to import ${parseResult.item.name}${issues.length ? `: ${issues.join("; ")}` : ""}`);
                }
            }

            if (successCount) ui.notifications.info(`Successfully persisted ${successCount} item${successCount === 1 ? "" : "s"}.`);
            if (skippedCount) ui.notifications.info(`Skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"} by policy.`);
            if (failedIndices.size) ui.notifications.warn(`${failedIndices.size} item${failedIndices.size === 1 ? "" : "s"} remain available for retry.`);

            if (window.parseGeneration === importGeneration && window.currentParseResult === parseState) {
                const remaining = allItems
                    .map((parseResult, index) => ({ parseResult, index }))
                    .filter(entry => !handledIndices.has(entry.index));
                parseState.successes = remaining.map(entry => entry.parseResult);
                window.selectedBatchItems = new Set(
                    remaining
                        .map((entry, newIndex) => failedIndices.has(entry.index) ? newIndex : null)
                        .filter(index => index !== null)
                );
                if (handledIndices.size > 0) {
                    const remainingSource = rebuildRemainingBatchSource(parseState);
                    if (remainingSource !== null && sourceInput) sourceInput.value = remainingSource;
                }
                if (parseState.successes.length === 0 && parseState.failures.length === 0) {
                    window.currentParseResult = null;
                    sourceInput.value = "";
                    window._invalidateParseResult();
                } else {
                    const Renderer = await import("./itemWindowRenderer.js");
                    const output = window.element.querySelector("#ii-parse-output");
                    if (output) output.innerHTML = Renderer.renderBatchSummary(parseState, window.selectedBatchItems);
                    window._setupCollapsibleSections();
                    window._updateBatchSelection();
                }
            }
        } else {
            if (window.importCancelled) {
                cancelled = true;
                return;
            }
            setImportControls(window, { running: true, progress: "Importing…" });
            const result = await importOne(window, parseState, {
                destination,
                duplicateMode,
                session,
                buildOptions
            });
            if (result?.cancelled === true) {
                ui.notifications.info(`${parseState.item.name}: no changes were made; the Item remains available for retry.`);
            } else if (result?.success === true) {
                if (wantsComparison && !result.skipped && result.item) {
                    addComparison(comparisons, parseState, result.item, parseState.item.name);
                }
                window.currentParseResult = null;
                if (sourceInput) sourceInput.value = "";
                window._invalidateParseResult();
            } else {
                const issues = getIssues(result);
                ui.notifications.error(`Failed to import ${parseState.item.name}${issues.length ? `: ${issues.join("; ")}` : ""}`);
            }
        }

        if (wantsComparison && comparisons.length) {
            try {
                await ItemComparisonWindow.show(comparisons, isBatch);
            } catch (error) {
                ItemUtils.warn(`Comparison window failed: ${error?.message || error}`);
            }
        }
    } finally {
        completeImportSession(session, { cancelled: cancelled || window.importCancelled });
        const closeRequested = window.closeRequestedDuringImport === true;
        window.importInProgress = false;
        setImportControls(window, { running: false });
        if (importButton) importButton.innerHTML = originalButtonHtml;
        if (window.element) {
            window._renderHistory();
            if (window.currentParseResult?.successes) window._updateBatchSelection();
            else if (window.currentParseResult?.success && importButton) importButton.disabled = false;
        }
        if (closeRequested) {
            window.closeRequestedDuringImport = false;
            await window.close();
        }
    }
}

export { confirmDialog };
