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
    this._setupFolderBrowser();

    // Initial state
    this._updateParseState("empty");

    ItemUtils.log("Item window rendered");
  }

  /** Set up folder browser event listeners */
  _setupFolderBrowser() {
    const searchInput = this.element.querySelector(".ii-folder-search");
    const container = this.element.querySelector(".ii-folder-list");

    if (!searchInput || !container) return;

    // Search functionality
    searchInput.addEventListener("input", (event) => {
      const query = event.target.value.toLowerCase().trim();

      const rootOptions = container.querySelectorAll(".ii-folder-option");
      const folders = container.querySelectorAll(".ii-folder-item");

      // Case A: Search is empty - Show everything and restore collapsed state
      if (query === "") {
        rootOptions.forEach((el) => el.classList.remove("hidden"));
        folders.forEach((el) => {
          el.classList.remove("search-hidden", "search-match");
          // Restore collapsed state when search is cleared
          if (!el.classList.contains("collapsed") && !el.classList.contains("ii-folder-leaf")) {
            el.classList.add("collapsed");
            // Update folder icon back to closed
            const icon = el.querySelector(".ii-folder-icon");
            if (icon && icon.dataset.openIcon && icon.dataset.closedIcon) {
              icon.classList.remove(icon.dataset.openIcon);
              icon.classList.add(icon.dataset.closedIcon);
            }
          }
        });
        return;
      }

      // Case B: Filter the root options (like "None (Root Level)")
      rootOptions.forEach((el) => {
        const matches = el.dataset.searchText.includes(query);
        el.classList.toggle("hidden", !matches);
      });

      // Case C: Handle the folders
      [...folders].reverse().forEach((folder) => {
        const folderHeader = folder.querySelector(".ii-folder-header");
        const headerMatches = folderHeader && folderHeader.dataset.searchText.includes(query);

        // Check if this folder or any child folders match
        const childFolders = folder.querySelectorAll(".ii-folder-item");
        const hasMatchingChildren = Array.from(childFolders).some((child) => {
          const childHeader = child.querySelector(".ii-folder-header");
          return childHeader && childHeader.dataset.searchText.includes(query);
        });

        const hasMatch = headerMatches || hasMatchingChildren;

        folder.classList.toggle("search-hidden", !hasMatch);
        folder.classList.toggle("search-match", hasMatch);

        // Update folder icon when expanding via search
        if (hasMatch && !folder.classList.contains("ii-folder-leaf")) {
          const icon = folder.querySelector(".ii-folder-icon");
          if (icon && icon.dataset.openIcon && icon.dataset.closedIcon) {
            icon.classList.remove(icon.dataset.closedIcon);
            icon.classList.add(icon.dataset.openIcon);
          }
        }
      });
    });

    // Helper function to toggle folder and update icon
    const toggleFolder = (folderItem) => {
      const isCollapsed = folderItem.classList.contains("collapsed");
      folderItem.classList.toggle("collapsed");

      // Update folder icon
      const icon = folderItem.querySelector(".ii-folder-icon");
      if (icon && icon.dataset.openIcon && icon.dataset.closedIcon) {
        if (isCollapsed) {
          // Was collapsed, now opening
          icon.classList.remove(icon.dataset.closedIcon);
          icon.classList.add(icon.dataset.openIcon);
        } else {
          // Was open, now collapsing
          icon.classList.remove(icon.dataset.openIcon);
          icon.classList.add(icon.dataset.closedIcon);
        }
      }
    };

    // Folder toggle (arrow) functionality - only for folders with children
    container.querySelectorAll(".ii-folder-toggle").forEach((element) => {
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        const folderItem = element.closest(".ii-folder-item");
        toggleFolder(folderItem);
      });
    });

    // Folder icon toggle for folders with children
    container.querySelectorAll(".ii-folder-item:not(.ii-folder-leaf) .ii-folder-icon").forEach((icon) => {
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        const folderItem = icon.closest(".ii-folder-item");
        toggleFolder(folderItem);
      });
    });

    // Folder name selection functionality (all folders)
    container.querySelectorAll(".ii-folder-name").forEach((nameElement) => {
      nameElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const header = nameElement.closest(".ii-folder-header");

        // Remove previous selection
        container.querySelectorAll(".ii-folder-header").forEach((h) => {
          h.classList.remove("selected");
        });
        container.querySelectorAll(".ii-folder-option").forEach((opt) => {
          opt.classList.remove("selected");
        });

        // Add selection to clicked folder
        header.classList.add("selected");

        // Store the selected folder ID
        this.selectedFolderId = header.dataset.folderId;

        ItemUtils.log(`Folder selected: ${this.selectedFolderId || "Root Level"}`);
      });
    });

    // Make entire header clickable for leaf folders (no children)
    container.querySelectorAll(".ii-folder-leaf .ii-folder-icon").forEach((icon) => {
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        // Trigger the name click handler
        const nameElement = icon.nextElementSibling;
        if (nameElement && nameElement.classList.contains("ii-folder-name")) {
          nameElement.click();
        }
      });
    });

    // Root level selection functionality
    container.querySelectorAll(".ii-folder-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();

        // Remove previous selection
        container.querySelectorAll(".ii-folder-header").forEach((h) => {
          h.classList.remove("selected");
        });
        container.querySelectorAll(".ii-folder-option").forEach((opt) => {
          opt.classList.remove("selected");
        });

        // Add selection to clicked option
        option.classList.add("selected");

        // Store the selected folder ID
        this.selectedFolderId = option.dataset.folderId;

        ItemUtils.log(`Folder selected: ${this.selectedFolderId || "Root Level"}`);
      });
    });

    // Set initial selection to root level
    const rootOption = container.querySelector('.ii-folder-option[data-folder-id=""]');
    if (rootOption) {
      rootOption.classList.add("selected");
    }
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

  /** Populate folder selection browser with nested structure */
  populateFolderSelect() {
    const container = this.element.querySelector("#ii-folder-select");
    if (!container) return;

    container.innerHTML = "";

    // Add "None (Root Level)" option at the top
    const rootOption = document.createElement("div");
    rootOption.className = "ii-folder-option";
    rootOption.dataset.folderId = "";
    rootOption.dataset.searchText = "none root level";
    rootOption.innerHTML = '<i class="fas fa-home"></i> None (Root Level)';
    container.appendChild(rootOption);

    // Get all Item folders
    const folders = game.folders.filter((f) => f.type === "Item");

    // Build a folder hierarchy
    const folderMap = new Map();
    const rootFolders = [];

    // First pass: create map of all folders
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        folder: folder,
        children: []
      });
    });

    // Second pass: organize into hierarchy
    folders.forEach((folder) => {
      const folderData = folderMap.get(folder.id);
      if (folder.folder) {
        // This folder has a parent
        const parent = folderMap.get(folder.folder.id);
        if (parent) {
          parent.children.push(folderData);
        } else {
          rootFolders.push(folderData);
        }
      } else {
        // Root level folder
        rootFolders.push(folderData);
      }
    });

    // Sort folders alphabetically at each level
    const sortFolders = (folderList) => {
      folderList.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
      folderList.forEach((f) => sortFolders(f.children));
    };
    sortFolders(rootFolders);

    // Render the folder hierarchy
    const renderFolder = (folderData, container) => {
      const hasChildren = folderData.children.length > 0;

      const folderItem = document.createElement("div");
      folderItem.className = hasChildren ? "ii-folder-item collapsed" : "ii-folder-item ii-folder-leaf";

      const folderHeader = document.createElement("div");
      folderHeader.className = "ii-folder-header";
      folderHeader.dataset.folderId = folderData.folder.id;
      folderHeader.dataset.searchText = folderData.folder.name.toLowerCase();

      // Only add toggle arrow if folder has children
      if (hasChildren) {
        folderHeader.innerHTML = `
          <i class="fas fa-chevron-down ii-folder-toggle"></i>
          <i class="fas fa-folder ii-folder-icon" data-open-icon="fa-folder-open" data-closed-icon="fa-folder"></i>
          <span class="ii-folder-name">${folderData.folder.name}</span>
        `;
      } else {
        folderHeader.innerHTML = `
          <i class="fas fa-folder ii-folder-icon ii-folder-leaf-icon"></i>
          <span class="ii-folder-name">${folderData.folder.name}</span>
        `;
      }

      // Only create contents container if there are children
      if (hasChildren) {
        const folderContents = document.createElement("div");
        folderContents.className = "ii-folder-contents";

        // Recursively add child folders
        folderData.children.forEach((child) => {
          renderFolder(child, folderContents);
        });

        folderItem.appendChild(folderHeader);
        folderItem.appendChild(folderContents);
      } else {
        folderItem.appendChild(folderHeader);
      }

      container.appendChild(folderItem);
    };

    rootFolders.forEach((folderData) => {
      renderFolder(folderData, container);
    });

    // Store the selected folder ID
    this.selectedFolderId = "";
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