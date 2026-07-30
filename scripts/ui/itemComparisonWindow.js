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
        this.element.querySelectorAll(".ii-section-header").forEach((header, index) => {
            const section = header.closest(".ii-section");
            const content = section?.querySelector(":scope > .ii-section-content");
            if (!section || !content) return;
            const contentId = content.id || `${this.id}-section-${index}`;
            content.id = contentId;
            header.setAttribute("role", "button");
            header.tabIndex = 0;
            header.setAttribute("aria-controls", contentId);
            const updateState = () => header.setAttribute("aria-expanded", String(!section.classList.contains("collapsed")));
            const toggle = () => {
                section.classList.toggle("collapsed");
                updateState();
            };
            updateState();
            header.addEventListener("click", toggle);
            header.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggle();
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
        await window.render(true);
        return window;
    }
}
