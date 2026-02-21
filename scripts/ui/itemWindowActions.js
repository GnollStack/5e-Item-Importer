/**
 * 5e Item Importer - Window Actions
 * Handles all action callbacks for the item window
 */

import { ItemUtils } from "../itemUtils.js";
import { MODULE_NAME } from "../itemConfig.js";
import { getParserForText, parseAllItemsYaml } from "../strictItemParsers/strictParserDispatcher.js";
import { ITEM_TEMPLATES } from "./itemTemplates.js";
import * as Renderer from "./itemWindowRenderer.js";

/** Valid YAML top-level item type keys */
const YAML_ITEM_KEYS = ['WEAPON', 'EQUIPMENT', 'CONSUMABLE', 'TOOL', 'LOOT', 'CONTAINER'];

/**
 * Detect whether text contains multiple YAML items.
 * Checks for: multiple different top-level keys, OR --- document separators.
 * @param {string} text
 * @returns {boolean}
 */
function isYamlMultiItem(text) {
    // Check for YAML document separators (handles same-type batching)
    const stripped = text.replace(/^```(?:yaml|markdown)\s*\n?/i, '').replace(/\n?```\s*$/, '');
    if (/^---\s*$/m.test(stripped)) return true;

    // Check for multiple different top-level type keys
    let count = 0;
    for (const key of YAML_ITEM_KEYS) {
        if (new RegExp(`^${key}:`, 'm').test(text)) count++;
    }
    return count > 1;
}

/**
 * Parse the item text
 * @this {ItemWindow}
 */
export function parse() {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    const text = input.value.trim();

    if (!text) {
        output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
        importBtn.disabled = true;
        this.currentParseResult = null;
        this._updateParseState("empty");
        return;
    }

    ItemUtils.log("Parsing item text...");

    // Detect batch: Look for multiple strict template markers
    const itemMarkers = text.match(/^===([A-Z]+)===$/gm);

    if (itemMarkers && itemMarkers.length > 1) {
        ItemUtils.log(`Batch import detected with ${itemMarkers.length} items (marker-based).`);
        handleBatchParse.call(this, text);
        return;
    }

    // Detect YAML multi-item batch (multiple top-level type keys)
    if (isYamlMultiItem(text)) {
        ItemUtils.log("YAML multi-item batch detected.");
        handleYamlBatchParse.call(this, text);
        return;
    }

    try {
        const parser = getParserForText(text);
        const result = parser.parse(text);

        this.currentParseResult = result;

        if (!result.item) {
            const allErrors = [...(result.errors || []), ...(result.warnings || [])];
            output.innerHTML = `<div class="ii-parse-error">
        <p><strong>⚠️ Parse Failed</strong></p>
        <ul>${allErrors.map((i) => `<li>${i}</li>`).join("")}</ul>
      </div>`;
            importBtn.disabled = true;
            this._updateParseState("error");
            return;
        }

        // Generate card-based preview
        const item = result.item;
        const html = Renderer.renderItemCard(item, result);

        output.innerHTML = html;
        importBtn.disabled = false;
        this._updateParseState("valid");

        // Set up collapsible section handlers
        this._setupCollapsibleSections();

        ItemUtils.log("Parse successful", result);
    } catch (error) {
        ItemUtils.error("Parse error", error);
        output.innerHTML = `<div class="ii-parse-error">
      <p><strong>❌ Error</strong></p>
      <p>${error.message}</p>
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
 */
export function handleBatchParse(text) {
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    // Split the text before each delimiter
    const itemChunks = text
        .split(/(?=^===[A-Z]+===$)/m)
        .filter((chunk) => chunk.trim());

    const results = {
        successes: [],
        failures: []
    };

    // Loop and parse each chunk
    for (const chunk of itemChunks) {
        try {
            const parser = getParserForText(chunk);
            const result = parser.parse(chunk);
            if (result.success && result.item) {
                results.successes.push(result);
            } else {
                results.failures.push({
                    text: chunk,
                    errors: [...result.errors, ...result.warnings]
                });
            }
        } catch (error) {
            results.failures.push({ text: chunk, errors: [error.message] });
        }
    }

    // Store results and initialize selection
    this.currentParseResult = results;
    this.selectedBatchItems = new Set(
        results.successes.map((_, index) => index)
    );

    ItemUtils.log("Batch parse complete", results);

    // Render batch summary
    output.innerHTML = Renderer.renderBatchSummary(results, this.selectedBatchItems);

    // Update state and set up handlers
    importBtn.disabled = results.successes.length === 0;
    this._updateParseState(results.successes.length > 0 ? "valid" : "error");
    this._setupCollapsibleSections();
}

/**
 * Handle YAML multi-item batch parsing.
 * Uses the YAML parser's parseAll() to split multiple top-level keys.
 * @this {ItemWindow}
 * @param {string} text - Full YAML input text
 */
function handleYamlBatchParse(text) {
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    const allResults = parseAllItemsYaml(text);

    const results = {
        successes: allResults.filter(r => r.success && r.item),
        failures: allResults
            .filter(r => !r.success || !r.item)
            .map(r => ({
                text: "(YAML block)",
                errors: [...(r.errors || []), ...(r.warnings || [])]
            }))
    };

    // Store results and initialize selection
    this.currentParseResult = results;
    this.selectedBatchItems = new Set(
        results.successes.map((_, index) => index)
    );

    ItemUtils.log("YAML batch parse complete", results);

    // Render batch summary using the same UI as marker-based batches
    output.innerHTML = Renderer.renderBatchSummary(results, this.selectedBatchItems);

    // Update state and set up handlers
    importBtn.disabled = results.successes.length === 0;
    this._updateParseState(results.successes.length > 0 ? "valid" : "error");
    this._setupCollapsibleSections();
}

/**
 * Import the parsed item(s)
 * @this {ItemWindow}
 */
export async function importItems() {
    if (!this.currentParseResult) {
        ItemUtils.warn("No item to import");
        return;
    }

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

    // Check if this is a batch import
    if (this.currentParseResult.successes) {
        // BATCH IMPORT - Only import selected items
        const allItems = this.currentParseResult.successes;
        const selectedIndices = Array.from(this.selectedBatchItems).sort((a, b) => a - b);
        const itemsToCreate = selectedIndices.map(idx => allItems[idx].item);

        const total = itemsToCreate.length;

        if (total === 0) {
            ui.notifications.warn("No items selected for import.");
            importBtn.disabled = false;
            importBtn.innerHTML = originalText;
            return;
        }

        ItemUtils.log(`Importing ${total} selected items to folder:`, folderId);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < total; i++) {
            const item = itemsToCreate[i];
            importBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importing (${i + 1}/${total})...`;

            try {
                // Pass importOptions here
                await item.createItem5e(folderId, importOptions);
                successCount++;
            } catch (err) {
                failCount++;
                ui.notifications.error(`Failed to import ${item.name}: ${err.message}`);
            }
        }

        if (successCount > 0) {
            ui.notifications.info(`Successfully imported ${successCount} item${successCount !== 1 ? 's' : ''}.`);
        }
        if (failCount > 0) {
            ui.notifications.warn(`Failed to import ${failCount} item${failCount !== 1 ? 's' : ''}.`);
        }

    } else if (this.currentParseResult.item) {
        // SINGLE ITEM IMPORT
        ItemUtils.log("Importing single item to folder:", folderId);
        importBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Importing...`;

        // Pass importOptions here
        await this.currentParseResult.item.createItem5e(folderId, importOptions);
    }

    // Reset the form
    importBtn.innerHTML = originalText;
    reset.call(this);
}

/**
 * Reset the form
 * @this {ItemWindow}
 */
export function reset() {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    if (input) {
        input.value = "";
    }

    if (output) {
        output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
    }

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.classList.remove("has-selection");
        delete importBtn.dataset.count;
    }

    this.currentParseResult = null;
    this.selectedBatchItems = new Set();
    this._updateParseState("empty");

    ItemUtils.log("Form reset");
}

/**
 * Insert a template example into the input
 * @this {ItemWindow}
 * @param {Event} event - Click event
 * @param {Object} data - Contains templateId
 */
export function insertTemplate(event, { templateId }) {
    const template = ITEM_TEMPLATES.find(t => t.id === templateId);

    if (!template) return;

    const input = this.element.querySelector("#ii-input");
    if (input) {
        input.value = template.text;
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
        this.currentParseResult.successes.map((_, index) => index)
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
export function toggleBatchItem(event, { index }) {
    // Don't toggle if clicking directly on checkbox (it handles itself)
    if (event?.target?.classList?.contains("ii-batch-checkbox")) {
        const isChecked = event.target.checked;
        if (isChecked) {
            this.selectedBatchItems.add(parseInt(index));
        } else {
            this.selectedBatchItems.delete(parseInt(index));
        }
    } else {
        // Card click - toggle
        const idx = parseInt(index);
        if (this.selectedBatchItems.has(idx)) {
            this.selectedBatchItems.delete(idx);
        } else {
            this.selectedBatchItems.add(idx);
        }
    }

    this._updateBatchSelection();
}