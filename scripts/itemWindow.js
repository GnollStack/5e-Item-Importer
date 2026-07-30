/**
 * 5e Item Importer - UI Window
 * ApplicationV2-based interface for importing items
 */

import { ItemUtils } from "./itemUtils.js";
import { MODULE_NAME } from "./itemConfig.js";
import { ITEM_TEMPLATES } from "./ui/itemTemplates.js";
import * as Actions from "./ui/itemWindowActions.js";
import {
  getImportHistory,
  listActorDestinations,
  listCompendiumDestinations,
  listSavedPresets,
  localize,
  normalizeDestination
} from "./ui/itemWorkflowServices.js";
import { getActivityCapabilities } from "./ui/itemFeatureAdapters.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function inputHasText(window) {
  return !!window.element?.querySelector?.("#ii-input")?.value?.trim();
}

let localizationFallbackPromise = null;

async function ensureItemImporterLocalization() {
  const sampleKey = "II.Input.Label";
  if (game.i18n?.localize?.(sampleKey) !== sampleKey) return true;
  if (localizationFallbackPromise) return localizationFallbackPromise;

  localizationFallbackPromise = (async () => {
    try {
      const response = await fetch(`modules/${MODULE_NAME}/lang/en.json`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const translations = await response.json();
      foundry.utils.mergeObject(game.i18n.translations, translations, {
        inplace: true,
        insertKeys: true,
        insertValues: true,
        overwrite: false
      });
      return game.i18n.localize(sampleKey) !== sampleKey;
    } catch (error) {
      console.warn(`5e Item Importer | Could not load localization fallback: ${error.message}`);
      return false;
    }
  })();

  return localizationFallbackPromise;
}

export class ItemWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.parseTimeout = null;
    this.parseStateTimeout = null;
    this.parseGeneration = 0;
    this.currentParseResult = null;
    this.parseState = "empty";
    this.selectedBatchItems = new Set();
    this.comparisonActive = false;
    this.normalizedText = "";
    this.activePresetId = null;
    this.importCancelled = false;
    this.importInProgress = false;
    this.closeRequestedDuringImport = false;
    this.lastImportSessionId = null;
    this.droppedItemUuid = null;
    this.selectedFolderId = null;
  }

  static DEFAULT_OPTIONS = {
    id: "ii-window",
    position: { width: 820, height: 700 },
    classes: ["ii-window"],
    tag: "form",
    window: {
      resizable: true,
      title: "5e Item Importer"
    },
    actions: {
      parse: Actions.parse,
      import: Actions.importItemsWorkflow,
      reset: Actions.reset,
      insertTemplate: Actions.insertTemplate,
      selectAll: Actions.selectAllBatch,
      selectNone: Actions.selectNoneBatch,
      toggleBatchItem: Actions.toggleBatchItem,
      savePreset: Actions.saveCurrentPreset,
      deletePreset: Actions.deleteCurrentPreset,
      copyNormalized: Actions.copyNormalized,
      downloadNormalized: Actions.downloadNormalized,
      reparseNormalized: Actions.reparseNormalized,
      cancelImport: Actions.cancelImport,
      undoLast: Actions.undoLastImport,
      downloadReport: Actions.downloadLastReport,
      openActivityBuilder: Actions.openInlineActivityBuilder,
      resolveReferences: Actions.resolveInlineReferences,
      removeSuggestedAutomation: Actions.removeSuggestedAutomation
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
    await ensureItemImporterLocalization();

    if (!ItemWindow.instance) {
      ItemWindow.instance = new ItemWindow();
      await ItemWindow.instance.render(true);
      return ItemWindow.instance;
    }
    const instance = ItemWindow.instance;
    if (instance.rendered === false || !instance.element) await instance.render(true);
    if (instance.minimized && typeof instance.maximize === "function") await instance.maximize();
    instance.bringToFront?.();
    return instance;
  }

  /** Clean up timers and singleton reference on close */
  async close(options) {
    if (this.importInProgress) {
      this.importCancelled = true;
      if (!this.closeRequestedDuringImport) {
        ui.notifications.warn(localize(
          "II.Notifications.CloseDeferred",
          "The import will stop after its current Item, then this window will close."
        ));
      }
      this.closeRequestedDuringImport = true;
      return this;
    }
    this.parseGeneration++;
    if (this.parseTimeout) clearTimeout(this.parseTimeout);
    if (this.parseStateTimeout) clearTimeout(this.parseStateTimeout);
    this.parseTimeout = null;
    this.parseStateTimeout = null;
    this.currentParseResult = null;
    this.parseState = "empty";
    this.selectedBatchItems = new Set();
    this.comparisonActive = false;
    this.normalizedText = "";
    this.importCancelled = true;
    this.importInProgress = false;
    this.closeRequestedDuringImport = false;
    this.droppedItemUuid = null;
    ItemWindow.instance = null;
    return super.close(options);
  }

  /** Prepare context data for rendering */
  _prepareContext(options) {
    let destination;
    try {
      destination = normalizeDestination(game.settings.get(MODULE_NAME, "lastDestination"));
    } catch {
      destination = { kind: "world", folderId: null };
    }
    const actorDestinations = listActorDestinations();
    const compendiumDestinations = listCompendiumDestinations();
    if (destination.kind === "actor" && !actorDestinations.some(actor => actor.uuid === destination.actorUuid)) {
      destination = { kind: "world", folderId: null };
    }
    if (destination.kind === "compendium" && !compendiumDestinations.some(pack => pack.collection === destination.pack)) {
      destination = { kind: "world", folderId: null };
    }
    const canCreateWorld = game.user.hasPermission("ITEM_CREATE");
    if (!canCreateWorld && destination.kind === "world" && actorDestinations.length) {
      destination = { kind: "actor", actorUuid: actorDestinations[0].uuid };
    }
    this.selectedFolderId = destination.kind === "world" ? destination.folderId : null;
    for (const actor of actorDestinations) actor.selected = actor.uuid === destination.actorUuid;
    for (const pack of compendiumDestinations) pack.selected = pack.collection === destination.pack;

    return {
      autoParse: game.settings.get(MODULE_NAME, "autoParse"),
      placeholder: localize("II.Input.Placeholder", "Paste item text here, select a template, or drop a document/file..."),
      templates: ITEM_TEMPLATES,
      savedPresets: listSavedPresets(),
      actorDestinations,
      compendiumDestinations,
      destinationWorld: destination.kind === "world",
      destinationActor: destination.kind === "actor",
      destinationCompendium: destination.kind === "compendium",
      canCreateWorld,
      activityCapabilities: getActivityCapabilities(),
      isAutoAnimationsActive: game.modules.get("autoanimations")?.active
    };
  }

  /** Called after render */
  _onRender(context, options) {
    const input = this.element.querySelector("#ii-input");
    const autoParseCheckbox = this.element.querySelector("#ii-auto-parse-checkbox");
    const templateSelect = this.element.querySelector("#ii-template-select");
    if (!input) return;

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
          Actions.importItemsWorkflow.call(this);
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
        if (!e.target.checked) {
          this.parseGeneration++;
          if (this.parseTimeout) clearTimeout(this.parseTimeout);
          if (this.parseStateTimeout) clearTimeout(this.parseStateTimeout);
          this.parseTimeout = null;
          this.parseStateTimeout = null;
        }
      });
    }

    // Template dropdown
    if (templateSelect) {
      templateSelect.addEventListener("change", (e) => {
        const value = e.target.value;
        if (value.startsWith("builtin:")) {
          this.activePresetId = null;
          Actions.insertTemplate.call(this, null, { templateId: value.slice(8) });
        } else if (value.startsWith("saved:")) {
          this.activePresetId = value.slice(6);
          Actions.insertSavedPreset.call(this, this.activePresetId);
          const presetName = this.element.querySelector("#ii-preset-name");
          const preset = listSavedPresets().find(candidate => candidate.id === this.activePresetId);
          if (presetName && preset) presetName.value = preset.name;
        } else {
          this.activePresetId = null;
        }
      });
    }

    // Quick settings
    this._setupQuickSettings();

    // Auto-parse on input
    input.addEventListener("input", () => {
      this.droppedItemUuid = null;
      this._invalidateParseResult();

      if (game.settings.get(MODULE_NAME, "autoParse")) {
        const delay = game.settings.get(MODULE_NAME, "autoParseDelay");

        const generation = this.parseGeneration;
        this.parseStateTimeout = setTimeout(() => {
          if (generation !== this.parseGeneration) return;
          if (input.value.trim()) {
            this._updateParseState("parsing");
          }
        }, 200);

        this.parseTimeout = setTimeout(() => {
          if (this.parseStateTimeout) clearTimeout(this.parseStateTimeout);
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

    this._setupDestinationControls();
    this._setupDragAndDrop();

    // Folder select
    this.populateFolderSelect();
    this._setupFolderBrowser();

    this._renderHistory();
    const normalizedInput = this.element.querySelector("#ii-normalized-input");
    if (normalizedInput) normalizedInput.value = this.normalizedText;

    // Initial state
    this._updateParseState("empty");

    ItemUtils.log("Item window rendered");
  }

  /** Set up folder browser event listeners */

  _getDestination() {
    const kind = this.element.querySelector("#ii-destination-kind")?.value ?? "world";
    if (kind === "actor") {
      return normalizeDestination({ kind, actorUuid: this.element.querySelector("#ii-actor-select")?.value ?? "" });
    }
    if (kind === "compendium") {
      return normalizeDestination({ kind, pack: this.element.querySelector("#ii-pack-select")?.value ?? "" });
    }
    return normalizeDestination({ kind: "world", folderId: this.selectedFolderId || null });
  }

  async _persistDestination() {
    try {
      await game.settings.set(MODULE_NAME, "lastDestination", this._getDestination());
    } catch (error) {
      ItemUtils.warn(`Could not remember import destination: ${error?.message || error}`);
    }
  }

  _setupDestinationControls() {
    const kindSelect = this.element.querySelector("#ii-destination-kind");
    if (!kindSelect) return;
    const refresh = () => {
      const kind = kindSelect.value;
      for (const panel of this.element.querySelectorAll(".ii-destination-panel")) panel.hidden = true;
      const active = this.element.querySelector(`.ii-destination-${kind}`);
      if (active) active.hidden = false;
      this._persistDestination();
    };
    kindSelect.addEventListener("change", refresh);
    this.element.querySelector("#ii-actor-select")?.addEventListener("change", () => this._persistDestination());
    this.element.querySelector("#ii-pack-select")?.addEventListener("change", () => this._persistDestination());
  }

  _setupDragAndDrop() {
    const inputGroup = this.element.querySelector(".ii-input-group");
    if (!inputGroup) return;
    inputGroup.addEventListener("dragover", event => {
      event.preventDefault();
      inputGroup.classList.add("is-dragover");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    });
    inputGroup.addEventListener("dragleave", event => {
      if (!inputGroup.contains(event.relatedTarget)) inputGroup.classList.remove("is-dragover");
    });
    inputGroup.addEventListener("drop", async event => {
      event.preventDefault();
      inputGroup.classList.remove("is-dragover");
      await Actions.handleInputDrop.call(this, event);
    });
  }

  _renderHistory() {
    const container = this.element.querySelector("#ii-history-list");
    if (!container) return;
    const sessions = getImportHistory();
    if (sessions.length === 0) {
      container.innerHTML = `<p class="hint">${ItemUtils.escapeHtml(localize("II.History.Empty", "No imports in this browser session."))}</p>`;
      return;
    }
    container.innerHTML = sessions.slice(0, 8).map(session => {
      const successes = session.entries.filter(entry => entry.success && !entry.skipped).length;
      const failures = session.entries.filter(entry => !entry.success && !entry.cancelled).length;
      const skipped = session.entries.filter(entry => entry.skipped && !entry.cancelled).length;
      const cancelled = session.entries.filter(entry => entry.cancelled).length;
      return `<div class="ii-history-entry" data-session-id="${ItemUtils.escapeHtml(session.id)}">
        <strong>${ItemUtils.escapeHtml(session.destinationLabel)}</strong>
        <span>${ItemUtils.escapeHtml(session.status)}</span>
        <small>${successes} ok &middot; ${failures} failed &middot; ${skipped} skipped${cancelled ? ` &middot; ${cancelled} cancelled` : ""}</small>
      </div>`;
    }).join("");
  }

  _setupBatchFilter() {
    const search = this.element.querySelector("#ii-batch-filter");
    const type = this.element.querySelector("#ii-batch-type-filter");
    const count = this.element.querySelector("#ii-batch-filter-count");
    if (!search || !type) return;
    const apply = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const selectedType = type.value;
      let visible = 0;
      const cards = this.element.querySelectorAll(".ii-batch-item.success");
      for (const card of cards) {
        const matches = (!query || card.dataset.searchName.includes(query))
          && (!selectedType || card.dataset.itemType === selectedType);
        card.hidden = !matches;
        if (matches) visible++;
      }
      if (count) count.textContent = localize("II.Batch.FilterCount", "{visible} of {total} shown", {
        visible,
        total: cards.length
      });
    };
    if (search.dataset.iiFilterBound !== "true") {
      search.dataset.iiFilterBound = "true";
      search.addEventListener("input", apply);
    }
    if (type.dataset.iiFilterBound !== "true") {
      type.dataset.iiFilterBound = "true";
      type.addEventListener("change", apply);
    }
    this.element.querySelectorAll(".ii-entry-mode").forEach(select => {
      if (select.dataset.iiModeBound === "true") return;
      select.dataset.iiModeBound = "true";
      select.addEventListener("click", event => event.stopPropagation());
      select.addEventListener("change", event => {
        event.stopPropagation();
        const result = this.currentParseResult?.successes?.[Number.parseInt(select.dataset.index, 10)];
        if (result) result._duplicateMode = select.value;
      });
    });
    apply();
  }

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
          if (!el.classList.contains("ii-folder-leaf")) {
            el.querySelector(":scope > .ii-folder-header .ii-folder-toggle")?.setAttribute("aria-expanded", "false");
          }
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
          folder.querySelector(":scope > .ii-folder-header .ii-folder-toggle")?.setAttribute("aria-expanded", "true");
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
      folderItem.querySelector(":scope > .ii-folder-header .ii-folder-toggle")
        ?.setAttribute("aria-expanded", String(isCollapsed));

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
      element.addEventListener("keydown", (event) => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        element.click();
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
          h.setAttribute("aria-selected", "false");
        });
        container.querySelectorAll(".ii-folder-option").forEach((opt) => {
          opt.classList.remove("selected");
          opt.setAttribute("aria-selected", "false");
        });

        // Add selection to clicked folder
        header.classList.add("selected");
        header.setAttribute("aria-selected", "true");

        // Store the selected folder ID
        this.selectedFolderId = header.dataset.folderId;
        this._persistDestination();

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
          h.setAttribute("aria-selected", "false");
        });
        container.querySelectorAll(".ii-folder-option").forEach((opt) => {
          opt.classList.remove("selected");
          opt.setAttribute("aria-selected", "false");
        });

        // Add selection to clicked option
        option.classList.add("selected");
        option.setAttribute("aria-selected", "true");

        // Store the selected folder ID
        this.selectedFolderId = option.dataset.folderId;
        this._persistDestination();

        ItemUtils.log(`Folder selected: ${this.selectedFolderId || "Root Level"}`);
      });
    });

    // Restore persisted folder selection and expand its ancestors.
    const selectedHeader = this.selectedFolderId
      ? container.querySelector(`.ii-folder-header[data-folder-id="${CSS.escape(this.selectedFolderId)}"]`)
      : null;
    const rootOption = selectedHeader ?? container.querySelector('.ii-folder-option[data-folder-id=""]');
    if (rootOption) {
      rootOption.classList.add("selected");
      rootOption.setAttribute("aria-selected", "true");
      let ancestor = selectedHeader?.closest(".ii-folder-item")?.parentElement?.closest(".ii-folder-item");
      while (ancestor) {
        ancestor.classList.remove("collapsed");
        ancestor.querySelector(":scope > .ii-folder-header .ii-folder-toggle")?.setAttribute("aria-expanded", "true");
        ancestor = ancestor.parentElement?.closest(".ii-folder-item");
      }
    }
    const folderOptions = container.querySelectorAll(".ii-folder-option, .ii-folder-header");
    folderOptions.forEach(option => {
      option.setAttribute("role", "option");
      option.tabIndex = 0;
      option.setAttribute("aria-selected", option.classList.contains("selected") ? "true" : "false");
      option.addEventListener("keydown", event => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        const name = option.querySelector(".ii-folder-name");
        (name || option).click();
      });
    });
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
          if (["useSemanticIcons", "matchIcons"].includes(key) && inputHasText(this)) Actions.parse.call(this);
        });
      }
    });

    const iconMode = this.element.querySelector("#ii-icon-mode");
    if (iconMode) {
      iconMode.value = game.settings.get(MODULE_NAME, "compendiumImageMode") || "deterministic";
      iconMode.addEventListener("change", event => {
        game.settings.set(MODULE_NAME, "compendiumImageMode", event.target.value);
        if (inputHasText(this)) Actions.parse.call(this);
      });
    }
    const previewControls = ["#ii-icon-seed", "#ii-suggest-automation", "#ii-use-autoanimations"];
    for (const selector of previewControls) {
      const control = this.element.querySelector(selector);
      control?.addEventListener("change", () => {
        if (inputHasText(this)) Actions.parse.call(this);
      });
    }
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
    const rootIcon = document.createElement("i");
    rootIcon.className = "fas fa-home";
    rootOption.append(rootIcon, document.createTextNode(" None (Root Level)"));
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
        const toggle = document.createElement("i");
        toggle.className = "fas fa-chevron-down ii-folder-toggle";
        toggle.setAttribute("role", "button");
        toggle.tabIndex = 0;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `Expand or collapse ${folderData.folder.name}`);

        const icon = document.createElement("i");
        icon.className = "fas fa-folder ii-folder-icon";
        icon.dataset.openIcon = "fa-folder-open";
        icon.dataset.closedIcon = "fa-folder";

        const name = document.createElement("span");
        name.className = "ii-folder-name";
        name.textContent = folderData.folder.name;

        folderHeader.append(toggle, icon, name);
      } else {
        const icon = document.createElement("i");
        icon.className = "fas fa-folder ii-folder-icon ii-folder-leaf-icon";

        const name = document.createElement("span");
        name.className = "ii-folder-name";
        name.textContent = folderData.folder.name;

        folderHeader.append(icon, name);
      }

      // Only create contents container if there are children
      if (hasChildren) {
        const folderContents = document.createElement("div");
        folderContents.className = "ii-folder-contents";
        folderContents.id = `ii-folder-contents-${folderData.folder.id}`;
        folderHeader.querySelector(".ii-folder-toggle")?.setAttribute("aria-controls", folderContents.id);

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

    if (this.selectedFolderId && !folderMap.has(this.selectedFolderId)) {
      this.selectedFolderId = null;
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
        empty: `<i class="fas fa-edit" aria-hidden="true"></i> ${localize("II.State.Ready", "Ready")}`,
        parsing: `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${localize("II.State.Parsing", "Parsing...")}`,
        valid: `<i class="fas fa-check-circle" aria-hidden="true"></i> ${localize("II.State.Valid", "Valid")}`,
        error: `<i class="fas fa-exclamation-circle" aria-hidden="true"></i> ${localize("II.State.Error", "Error")}`
      };
      stateIndicator.innerHTML = icons[state] || icons.empty;
      stateIndicator.className = `ii-state-indicator state-${state}`;
    }
  }

  /**
   * Invalidate any preview produced for an older input value.
   * Async parse work checks parseGeneration before updating the window.
   */
  _invalidateParseResult() {
    this.parseGeneration++;

    if (this.parseTimeout) clearTimeout(this.parseTimeout);
    if (this.parseStateTimeout) clearTimeout(this.parseStateTimeout);
    this.parseTimeout = null;
    this.parseStateTimeout = null;

    this.currentParseResult = null;
    this.selectedBatchItems = new Set();
    this.normalizedText = "";
    const normalizedInput = this.element.querySelector("#ii-normalized-input");
    if (normalizedInput) normalizedInput.value = "";


    const output = this.element.querySelector("#ii-parse-output");
    if (output) {
      output.innerHTML = "<p><em>Parse the current text to preview it...</em></p>";
    }

    const importBtn = this.element.querySelector("[data-action='import']");
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.classList.remove("has-selection");
      delete importBtn.dataset.count;
      importBtn.removeAttribute("title");
    }

    this._updateParseState("empty");
    return this.parseGeneration;
  }

  /** Update visual state of batch selection */
  _updateBatchSelection() {
    const successes = this.currentParseResult?.successes || [];
    successes.forEach((result, index) => {
      if (result.item?._hasUnresolvedUuids) this.selectedBatchItems.delete(index);
    });

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
    const bindCollapsibleHeader = (header, sectionSelector) => {
      const section = header.closest(sectionSelector);
      if (!section) return;
      header.setAttribute("role", "button");
      header.tabIndex = 0;
      const syncExpanded = () => {
        header.setAttribute("aria-expanded", String(!section.classList.contains("collapsed")));
      };
      syncExpanded();
      if (header.dataset.iiCollapseBound === "true") return;
      header.dataset.iiCollapseBound = "true";
      const toggle = () => {
        section.classList.toggle("collapsed");
        syncExpanded();
      };
      header.addEventListener("click", toggle);
      header.addEventListener("keydown", event => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        header.click();
      });
    };

    // Collapsible headers (item and embedded Activity importer sections)
    this.element.querySelectorAll(".ii-section-header").forEach(header => {
      bindCollapsibleHeader(header, ".ii-section");
    });

    this.element.querySelectorAll(".ai-section-header").forEach(header => {
      bindCollapsibleHeader(header, ".ai-section");
    });

    // Batch checkboxes
    this.element.querySelectorAll(".ii-batch-checkbox").forEach(checkbox => {
      if (checkbox.dataset.iiSelectionBound === "true") return;
      checkbox.dataset.iiSelectionBound = "true";
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
      if (item.dataset.iiSelectionBound === "true") return;
      item.dataset.iiSelectionBound = "true";
      item.addEventListener("click", (e) => {
        if (e.target.closest("select, option, button, input, label, a")) return;

        const index = parseInt(item.dataset.index);

        if (this.selectedBatchItems.has(index)) {
          this.selectedBatchItems.delete(index);
        } else {
          this.selectedBatchItems.add(index);
        }

        this._updateBatchSelection();
      });
    });
    this._setupBatchFilter();
  }
}
