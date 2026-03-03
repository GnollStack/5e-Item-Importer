/**
 * 5e Item Importer - Comparison Window
 * A dedicated ApplicationV2 window that shows side-by-side comparison
 * of the original template vs the created Foundry item.
 */

import { MODULE_NAME } from "../itemConfig.js";
import { renderComparisonView, renderBatchComparisonSummary } from "./itemComparisonRenderer.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ItemComparisonWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(comparisons, isBatch = false, options = {}) {
        super(options);
        this.comparisons = comparisons;
        this.isBatch = isBatch;
    }

    static DEFAULT_OPTIONS = {
        id: "ii-comparison-window",
        position: { width: 850, height: 700 },
        classes: ["ii-comparison-window"],
        window: {
            resizable: true,
            title: "Item Import Comparison"
        },
        actions: {
            closeComparison: ItemComparisonWindow.closeWindow
        }
    };

    static PARTS = {
        content: {
            template: `modules/${MODULE_NAME}/templates/comparisonWindow.hbs`
        }
    };

    async _prepareContext(options) {
        const html = this.isBatch
            ? renderBatchComparisonSummary(this.comparisons)
            : renderComparisonView(this.comparisons);
        return { comparisonHtml: html };
    }

    _onRender(context, options) {
        // Set up collapsible sections
        this.element.querySelectorAll(".ii-section-header").forEach(header => {
            header.addEventListener("click", () => {
                header.closest(".ii-section").classList.toggle("collapsed");
            });
        });
    }

    static closeWindow() {
        this.close();
    }

    /**
     * Open the comparison window with the given comparisons.
     * @param {Array} comparisons - Array of { label, diffReport, expectedProps, actualProps }
     * @param {boolean} isBatch - Whether this is a batch comparison
     */
    static async show(comparisons, isBatch = false) {
        const window = new ItemComparisonWindow(comparisons, isBatch);
        window.render(true);
        return window;
    }
}
