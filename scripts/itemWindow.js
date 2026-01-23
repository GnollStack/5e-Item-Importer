/**
 * 5e Item Importer - UI Window
 * ApplicationV2-based interface for importing items
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_NAME } from "./itemConfig.js";
import { ITEM_TEMPLATES } from "./ui/itemTemplates.js";
import * as Actions from "./ui/itemWindowActions.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ItemWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.parseTimeout = null;
    this.currentParseResult = null;
    this.parseState = "empty";
    this.selectedBatchItems = new Set();
  }

  static DEFAULT_OPTIONS = {
    id: "ii-window",
    position: { width: 700, height: 600 },
    classes: ["ii-window"],
    tag: "form",
    window: {
      resizable: true,
      title: "5e Item Importer"
    },
    actions: {
      parse: Actions.parse,
      import: Actions.importItems,
      reset: Actions.reset,
      insertTemplate: Actions.insertTemplate,
      selectAll: Actions.selectAllBatch,
      selectNone: Actions.selectNoneBatch,
      toggleBatchItem: Actions.toggleBatchItem
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_NAME}/templates/itemWindow.hbs`
    }
  };

  /** Singleton instance */
  static instance = null;

  /** Render the window */
  static async renderWindow() {
    if (ItemWindow.instance) {
      ItemWindow.instance.render(true);
    } else {
      ItemWindow.instance = new ItemWindow();
      ItemWindow.instance.render(true);
    }
  }

  /** Prepare context data for rendering */
  _prepareContext(options) {
    return {
      autoParse: game.settings.get(MODULE_NAME, "autoParse"),
      placeholder: "Paste your item text here, or select a template to get started...",
      templates: ITEM_TEMPLATES,
      isAutoAnimationsActive: game.modules.get("autoanimations")?.active
    };
  }

  /** Called after render */
  _onRender(context, options) {
    const input = this.element.querySelector("#ii-input");
    const autoParseCheckbox = this.element.querySelector("#ii-auto-parse-checkbox");
    const templateSelect = this.element.querySelector("#ii-template-select");

    // Paste handler
    input.addEventListener("paste", (e) => {
      setTimeout(() => {
        input.value = input.value.replace(/\p{Cf}/gu, "");
      }, 0);
    });

    // Keyboard shortcuts
    this.element.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        Actions.parse.call(this);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        const importBtn = this.element.querySelector("[data-action='import']");
        if (!importBtn.disabled) {
          Actions.importItems.call(this);
        }
      }
      if (e.key === "Escape" && document.activeElement !== input) {
        e.preventDefault();
        Actions.reset.call(this);
      }
    });

    // Auto-parse checkbox
    if (autoParseCheckbox) {
      autoParseCheckbox.checked = game.settings.get(MODULE_NAME, "autoParse");
      autoParseCheckbox.addEventListener("change", (e) => {
        game.settings.set(MODULE_NAME, "autoParse", e.target.checked);
      });
    }

    // Template dropdown
    if (templateSelect) {
      templateSelect.addEventListener("change", (e) => {
        const templateId = e.target.value;
        if (templateId) {
          Actions.insertTemplate.call(this, null, { templateId });
          e.target.value = "";
        }
      });
    }

    // Quick settings
    this._setupQuickSettings();

    // Auto-parse on input
    input.addEventListener("input", () => {
      this._updateParseState("empty");
      
      if (game.settings.get(MODULE_NAME, "autoParse")) {
        const delay = game.settings.get(MODULE_NAME, "autoParseDelay");

        if (this.parseTimeout) {
          clearTimeout(this.parseTimeout);
        }

        const stateTimeout = setTimeout(() => {
          if (input.value.trim()) {
            this._updateParseState("parsing");
          }
        }, 200);

        this.parseTimeout = setTimeout(() => {
          clearTimeout(stateTimeout);
          Actions.parse.call(this);
        }, delay);
      }
    });

    // Parse on blur
    input.addEventListener("blur", () => {
      if (game.settings.get(MODULE_NAME, "autoParse") && input.value.trim()) {
        if (this.parseTimeout) {
          clearTimeout(this.parseTimeout);
        }
        Actions.parse.call(this);
      }
    });

    // Folder select
    this.populateFolderSelect();

    // Initial state
    this._updateParseState("empty");

    ItemUtils.log("Item window rendered");
  }

  /** Set up quick settings toggle handlers */
  _setupQuickSettings() {
    const settings = [
      { id: "ii-setting-semantic", key: "useSemanticIcons" },
      { id: "ii-setting-identified", key: "createIdentified" },
      { id: "ii-setting-match-icons", key: "matchIcons" }
    ];

    settings.forEach(({ id, key }) => {
      const el = this.element.querySelector(`#${id}`);
      if (el) {
        el.checked = game.settings.get(MODULE_NAME, key);
        el.addEventListener("change", (e) => {
          game.settings.set(MODULE_NAME, key, e.target.checked);
        });
      }
    });
  }

  /** Populate folder selection dropdown */
  populateFolderSelect() {
    const select = this.element.querySelector("#ii-folder-select");
    if (!select) return;

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "None (Root Level)";
    select.appendChild(defaultOption);

    const folders = game.folders
      .filter((f) => f.type === "Item")
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const folder of folders) {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = folder.name;
      select.appendChild(option);
    }
  }

  /** Update the visual parse state indicator */
  _updateParseState(state) {
    this.parseState = state;
    const inputGroup = this.element.querySelector(".ii-input-group");
    const stateIndicator = this.element.querySelector(".ii-state-indicator");
    
    if (inputGroup) {
      inputGroup.classList.remove("state-empty", "state-parsing", "state-valid", "state-error");
      inputGroup.classList.add(`state-${state}`);
    }

    if (stateIndicator) {
      const icons = {
        empty: '<i class="fas fa-edit"></i> Ready',
        parsing: '<i class="fas fa-spinner fa-spin"></i> Parsing...',
        valid: '<i class="fas fa-check-circle"></i> Valid',
        error: '<i class="fas fa-exclamation-circle"></i> Error'
      };
      stateIndicator.innerHTML = icons[state] || icons.empty;
      stateIndicator.className = `ii-state-indicator state-${state}`;
    }
  }

  /** Update visual state of batch selection */
  _updateBatchSelection() {
    const items = this.element.querySelectorAll(".ii-batch-item.selectable");
    const countEl = this.element.querySelector("#ii-selected-count");
    const importBtn = this.element.querySelector("[data-action='import']");

    items.forEach(item => {
      const index = parseInt(item.dataset.index);
      const checkbox = item.querySelector(".ii-batch-checkbox");
      const isSelected = this.selectedBatchItems.has(index);

      item.classList.toggle("selected", isSelected);
      if (checkbox) checkbox.checked = isSelected;
    });

    if (countEl) {
      countEl.textContent = this.selectedBatchItems.size;
    }

    if (importBtn) {
      const hasSelection = this.selectedBatchItems.size > 0;
      importBtn.disabled = !hasSelection;
      
      if (hasSelection) {
        importBtn.classList.add("has-selection");
        importBtn.dataset.count = this.selectedBatchItems.size;
      } else {
        importBtn.classList.remove("has-selection");
        delete importBtn.dataset.count;
      }
    }
  }

  /** Set up click handlers for collapsible sections and batch items */
  _setupCollapsibleSections() {
    // Collapsible headers
    this.element.querySelectorAll(".ii-section-header").forEach(header => {
      header.addEventListener("click", () => {
        header.closest(".ii-section").classList.toggle("collapsed");
      });
    });

    // Batch checkboxes
    this.element.querySelectorAll(".ii-batch-checkbox").forEach(checkbox => {
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(checkbox.dataset.index);
        
        if (checkbox.checked) {
          this.selectedBatchItems.add(index);
        } else {
          this.selectedBatchItems.delete(index);
        }
        
        this._updateBatchSelection();
      });
    });

    // Batch item cards
    this.element.querySelectorAll(".ii-batch-item.selectable").forEach(item => {
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("ii-batch-checkbox")) return;
        
        const index = parseInt(item.dataset.index);
        
        if (this.selectedBatchItems.has(index)) {
          this.selectedBatchItems.delete(index);
        } else {
          this.selectedBatchItems.add(index);
        }
        
        this._updateBatchSelection();
      });
    });
  }
}