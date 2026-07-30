/**
 * 5e Item Importer
 * Main entry point for the module
 *
 * This module allows you to import D&D 5e items from text format
 * (like from PDFs, websites, or homebrew documents) into Foundry VTT.
 */

import { MODULE_NAME, MODULE_TITLE, registerSettings } from "./itemConfig.js";
import { ItemUtils } from "./itemUtils.js";
import { ItemWindow } from "./itemWindow.js";
import { createDiagnosticsApi } from "./debugApi.js";
import { parseItemText } from "./parserRouting.js";
import { createItemImporterApi } from "./ui/itemPublicApi.js";
import { renderAttunementRequirement } from "./ui/itemAttunementNote.js";
import {
    exportCoreItemYaml,
    exportFullItemYaml,
    getActivityCapabilities
} from "./ui/itemFeatureAdapters.js";
import { copyText, downloadText, listActorDestinations, localize } from "./ui/itemWorkflowServices.js";

/**
 * Initialize module
 */
Hooks.on("init", () => {
    console.log(`${MODULE_TITLE} | Initializing module...`);

    // Register settings
    registerSettings();

    // Register API for programmatic access
    registerAPI();

    console.log(`${MODULE_TITLE} | Initialization complete`);
});

/**
 * Register module API
 * Allows other modules or macros to use the importer programmatically
 */
function registerAPI() {
    const parse = (text, options = {}) => parseItemText(text, options);
    const diagnostics = createDiagnosticsApi({
        parse,
        openWindow: () => ItemWindow.renderWindow()
    });
    const module = game.modules.get(MODULE_NAME);
    module.api = createItemImporterApi({
        utils: ItemUtils,
        openWindow: () => ItemWindow.renderWindow(),
        diagnostics,
        version: module.version,
        info: () => ({
            name: MODULE_NAME,
            title: MODULE_TITLE,
            version: module.version,
            debug: game.settings.get(MODULE_NAME, "debug"),
            enableMcpDiagnostics: game.settings.get(MODULE_NAME, "enableMcpDiagnostics")
        })
    });
    ItemUtils.log("Module API registered", module.api);
}

/**
 * Add standalone Import Item button to the Items Directory footer
 */
function _addStandaloneButton(element) {
    if (element.querySelector("[data-ii-directory-control='true']")) return;

    ItemUtils.log("Adding Item Importer button to Items Directory");

    const importButton = document.createElement("button");
    importButton.dataset.iiDirectoryControl = "true";
    importButton.setAttribute("type", "button");
    importButton.classList.add("ii-directory-btn");
    importButton.innerHTML = `<i class="fas fa-file-import"></i> Import Item`;

    importButton.addEventListener("click", () => {
        ItemUtils.log("Import Item button clicked");
        ItemWindow.renderWindow();
    });

    const footer = element.querySelector(".directory-footer");
    if (footer) {
        footer.appendChild(importButton);
        ItemUtils.log("Import button added successfully");
    } else {
        ItemUtils.warn("Could not find directory footer to add button");
    }
}

/**
 * Add button to Items Directory
 * When 5e Activity Importer is active and integration is enabled, injects
 * "Import Item" into that module's existing dropdown instead of a standalone button.
 */
Hooks.on("renderItemDirectory", (app, html, data) => {
    // Only add button if user has permission to create items
    if (!game.user.hasPermission("ITEM_CREATE") && listActorDestinations().length === 0) {
        return;
    }

    // Convert jQuery to DOM element if needed
    const element = html instanceof jQuery ? html.get(0) : html;

    const activityImporterActive = game.modules.get("5e-activity-importer")?.active;
    const integrateWithActivityImporter = game.settings.get(MODULE_NAME, "integrateWithActivityImporter");

    if (activityImporterActive && integrateWithActivityImporter) {
        // Defer injection until all renderItemDirectory hooks have fired
        setTimeout(() => {
            const dropdown = element.querySelector(
                "[data-ai-directory-controls='true'] .ai-directory-dropdown, #ai-main-button-group .ai-directory-dropdown"
            );
            if (!dropdown) {
                // Activity importer dropdown not found — fall back to standalone button
                _addStandaloneButton(element);
                return;
            }

            // Prevent duplicate injection
            if (dropdown.querySelector(".ii-import-item-option")) return;

            const importOption = document.createElement("button");
            importOption.setAttribute("type", "button");
            importOption.classList.add("ai-dropdown-item", "ii-import-item-option");
            importOption.innerHTML = `<i class="fas fa-file-import"></i> Import Item`;
            importOption.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.style.display = "none";
                ItemUtils.log("Import Item selected from Activity Importer dropdown");
                ItemWindow.renderWindow();
            });

            // Prepend so Import Item appears at the top of the dropdown
            dropdown.insertBefore(importOption, dropdown.firstChild);
            ItemUtils.log("Import Item injected into Activity Importer dropdown");
        }, 0);
        return;
    }

    // Standalone mode: add the normal Import Item button
    _addStandaloneButton(element);
});

/**
 * Ready hook - module is fully loaded
 */
Hooks.on("ready", () => {
    const debugMode = game.settings.get(MODULE_NAME, "debug");

    if (debugMode) {
        console.log(`${MODULE_TITLE} | Module ready in DEBUG mode`);
        console.log(`${MODULE_TITLE} | Settings:`, {
            debug: game.settings.get(MODULE_NAME, "debug"),
            showParseResults: game.settings.get(MODULE_NAME, "showParseResults"),
            autoParse: game.settings.get(MODULE_NAME, "autoParse"),
            matchIcons: game.settings.get(MODULE_NAME, "matchIcons"),
            parseCurrency: game.settings.get(MODULE_NAME, "parseCurrency"),
            parseWeight: game.settings.get(MODULE_NAME, "parseWeight")
        });
    }

    // Show welcome message for first-time users
    const hasShownWelcome = game.settings.get(MODULE_NAME, "hasShownWelcome");
    if (!hasShownWelcome && game.user.isGM) {
        showWelcomeMessage();
        game.settings.set(MODULE_NAME, "hasShownWelcome", true);
    }
});

/**
 * Show welcome message for first-time users
 */
function showWelcomeMessage() {
    const content = `
        <div style="text-align: center; margin: 1em 0;">
            <h2><i class="fas fa-magic"></i> Welcome to ${MODULE_TITLE}!</h2>
            <p>Import D&D 5e items from text format into Foundry VTT.</p>
        </div>
        <div style="margin: 1em 0;">
            <h3>Quick Start:</h3>
            <ol>
                <li>Click the "Import Item" button in the Items Directory</li>
                <li>Paste your item text (from PDFs, websites, etc.)</li>
                <li>Click "Parse" to preview</li>
                <li>Click "Import" to create the item</li>
            </ol>
        </div>
        <div style="margin: 1em 0;">
            <h3>Tips:</h3>
            <ul>
                <li>Enable <strong>Debug Mode</strong> in settings for detailed logging</li>
                <li>Auto-Parse will parse as you type (configurable)</li>
                <li>The parser works best with standard D&D item formats</li>
            </ul>
        </div>
        <p style="text-align: center; margin-top: 1em;">
            <em>Check the module settings for more options!</em>
        </p>
    `;

    foundry.applications.api.DialogV2.prompt({
        window: {
            title: `${MODULE_TITLE} - Welcome`,
            icon: "fas fa-magic"
        },
        position: { width: 500 },
        content: content,
        rejectClose: false,
        modal: false,
        ok: {
            label: "Get Started",
            icon: "fas fa-check"
        }
    });
}

/** Resolve a world Item from Foundry v14 or legacy context-menu arguments. */
const EXPORTABLE_ITEM_TYPES = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"]);

function isExportableItem(item) {
    return item?.documentName === "Item" && EXPORTABLE_ITEM_TYPES.has(item.type);
}

function contextEntryId(target) {
    const element = target?.[0] ?? target;
    const entry = element?.closest?.("[data-entry-id], [data-document-id]") ?? element;
    return entry?.dataset?.documentId
        ?? entry?.dataset?.entryId
        ?? target?.data?.("documentId")
        ?? target?.data?.("entryId")
        ?? null;
}

function resolveContextItem(target, app = null) {
    if (target?.documentName === "Item") return target;
    const id = contextEntryId(target);
    if (!id) return null;
    return app?.collection?.index?.get?.(id)
        ?? app?.collection?.get?.(id)
        ?? game.items.get(id)
        ?? null;
}

async function resolveContextDocument(target, app = null) {
    if (target?.documentName === "Item") return target;
    const id = contextEntryId(target);
    if (id && typeof app?.collection?.getDocument === "function") {
        return app.collection.getDocument(id);
    }
    return resolveContextItem(target, app);
}

function isExportableContextItem(target, app = null) {
    const item = resolveContextItem(target, app);
    return isExportableItem(item)
        || (!item?.documentName && EXPORTABLE_ITEM_TYPES.has(item?.type));
}

function hasFullExportSupport() {
    return getActivityCapabilities().fullSerialization;
}

function exportFilename(item, mode) {
    const name = item?.name || "5e-item";
    return mode === "core" ? `${name}.core.yaml` : `${name}.yaml`;
}

async function copyCoreYaml(item) {
    if (!isExportableItem(item)) return;
    try {
        await copyText(await exportCoreItemYaml(item));
        ui.notifications.info(localize(
            "II.Notifications.CoreExportCopied",
            "Copied core Item YAML. Activities and Active Effects were excluded."
        ));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

async function downloadCoreYaml(item) {
    if (!isExportableItem(item)) return;
    try {
        const yaml = await exportCoreItemYaml(item);
        downloadText(yaml, exportFilename(item, "core"));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

async function copyFullYaml(item) {
    if (!isExportableItem(item) || !hasFullExportSupport()) return;
    try {
        await copyText(await exportFullItemYaml(item));
        ui.notifications.info(localize(
            "II.Notifications.FullExportCopied",
            "Copied full Item YAML with Activities and Active Effects."
        ));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

async function downloadFullYaml(item) {
    if (!isExportableItem(item) || !hasFullExportSupport()) return;
    try {
        const yaml = await exportFullItemYaml(item);
        downloadText(yaml, exportFilename(item, "full"));
    } catch (error) {
        ui.notifications.error(error?.message || String(error));
    }
}

Hooks.on("getItemContextOptions", (app, contextOptions) => {
    if (contextOptions.some(option => option.iiItemExporter)) return;
    contextOptions.push(
        {
            iiItemExporter: true,
            label: localize("II.Export.CopyCore", "Copy Core Item YAML"),
            icon: "fas fa-copy",
            visible: target => isExportableContextItem(target, app),
            onClick: async (_event, target) => copyCoreYaml(await resolveContextDocument(target, app))
        },
        {
            iiItemExporter: true,
            label: localize("II.Export.DownloadCore", "Download Core Item YAML"),
            icon: "fas fa-download",
            visible: target => isExportableContextItem(target, app),
            onClick: async (_event, target) => downloadCoreYaml(await resolveContextDocument(target, app))
        },
        {
            iiItemExporter: true,
            label: localize("II.Export.CopyFull", "Copy Full Item YAML"),
            icon: "fas fa-bolt",
            visible: target => hasFullExportSupport() && isExportableContextItem(target, app),
            onClick: async (_event, target) => copyFullYaml(await resolveContextDocument(target, app))
        },
        {
            iiItemExporter: true,
            label: localize("II.Export.DownloadFull", "Download Full Item YAML"),
            icon: "fas fa-file-export",
            visible: target => hasFullExportSupport() && isExportableContextItem(target, app),
            onClick: async (_event, target) => downloadFullYaml(await resolveContextDocument(target, app))
        }
    );
});

// Compatibility for Foundry releases/modules still dispatching legacy directory hooks.
Hooks.on("getItemDirectoryEntryContext", (_html, contextOptions) => {
    if (contextOptions.some(option => option.iiItemExporter)) return;
    contextOptions.push(
        {
            iiItemExporter: true,
            name: localize("II.Export.CopyCore", "Copy Core Item YAML"),
            icon: '<i class="fas fa-copy"></i>',
            condition: target => isExportableItem(resolveContextItem(target)),
            callback: target => copyCoreYaml(resolveContextItem(target))
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.DownloadCore", "Download Core Item YAML"),
            icon: '<i class="fas fa-download"></i>',
            condition: target => isExportableItem(resolveContextItem(target)),
            callback: target => downloadCoreYaml(resolveContextItem(target))
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.CopyFull", "Copy Full Item YAML"),
            icon: '<i class="fas fa-bolt"></i>',
            condition: target => hasFullExportSupport() && isExportableItem(resolveContextItem(target)),
            callback: target => copyFullYaml(resolveContextItem(target))
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.DownloadFull", "Download Full Item YAML"),
            icon: '<i class="fas fa-file-export"></i>',
            condition: target => hasFullExportSupport() && isExportableItem(resolveContextItem(target)),
            callback: target => downloadFullYaml(resolveContextItem(target))
        }
    );
});

Hooks.on("dnd5e.getItemContextOptions", (item, contextOptions) => {
    if (!isExportableItem(item) || contextOptions.some(option => option.iiItemExporter)) return;
    contextOptions.push(
        {
            iiItemExporter: true,
            name: localize("II.Export.CopyCore", "Copy Core Item YAML"),
            icon: '<i class="fas fa-copy"></i>',
            condition: () => true,
            callback: () => copyCoreYaml(item)
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.DownloadCore", "Download Core Item YAML"),
            icon: '<i class="fas fa-download"></i>',
            condition: () => true,
            callback: () => downloadCoreYaml(item)
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.CopyFull", "Copy Full Item YAML"),
            icon: '<i class="fas fa-bolt"></i>',
            condition: () => hasFullExportSupport(),
            callback: () => copyFullYaml(item)
        },
        {
            iiItemExporter: true,
            name: localize("II.Export.DownloadFull", "Download Full Item YAML"),
            icon: '<i class="fas fa-file-export"></i>',
            condition: () => hasFullExportSupport(),
            callback: () => downloadFullYaml(item)
        }
    );
});

Hooks.on("renderItemSheet5e", renderAttunementRequirement);

/**
 * Console command helpers for development
 */
if (typeof window !== "undefined") {
    window.ItemImporter = {
        // Quick access to module
        get module() {
            return game.modules.get(MODULE_NAME);
        },

        // Quick access to API
        get api() {
            return game.modules.get(MODULE_NAME)?.api;
        },

        // MCP Server Diagnostics
        get diagnostics() {
            return game.modules.get(MODULE_NAME)?.api?.diagnostics;
        },

        // Quick access to settings
        get settings() {
            return {
                debug: game.settings.get(MODULE_NAME, "debug"),
                enableMcpDiagnostics: game.settings.get(MODULE_NAME, "enableMcpDiagnostics"),
                showParseResults: game.settings.get(MODULE_NAME, "showParseResults"),
                autoParse: game.settings.get(MODULE_NAME, "autoParse"),
                matchIcons: game.settings.get(MODULE_NAME, "matchIcons"),
                parseCurrency: game.settings.get(MODULE_NAME, "parseCurrency"),
                parseWeight: game.settings.get(MODULE_NAME, "parseWeight")
            };
        },

        // Toggle debug mode quickly
        toggleDebug() {
            const current = game.settings.get(MODULE_NAME, "debug");
            game.settings.set(MODULE_NAME, "debug", !current);
            console.log(`${MODULE_TITLE} | Debug mode: ${!current ? "ON" : "OFF"}`);
        },

        // Test utility functions
        test: {
            currency: (text) => ItemUtils.parseCurrency(text),
            weight: (text) => ItemUtils.parseWeight(text),
            dice: (text) => ItemUtils.parseDice(text),
            normalize: (text) => ItemUtils.normalizeUnicode(text)
        },

        // Get version info
        version: () => {
            const mod = game.modules.get(MODULE_NAME);
            console.log(`${MODULE_TITLE} v${mod.version}`);
            return mod.version;
        },

        // Help text
        help: () => {
            console.log(`
${MODULE_TITLE} - Console Commands
=====================================

ItemImporter.module          - Get module object
ItemImporter.api             - Get module API
ItemImporter.settings        - View current settings
ItemImporter.toggleDebug()   - Toggle debug mode
ItemImporter.version()       - Show version
ItemImporter.diagnostics     - MCP Server Diagnostics
ItemImporter.test            - Test utilities

Test Commands:
  ItemImporter.test.currency("50 gp")
  ItemImporter.test.weight("15 lb")
  ItemImporter.test.dice("2d6+3")
  ItemImporter.test.normalize("some–text")

For more info, see the module documentation.
            `);
        }
    };

    // Show helper on load if debug mode
    Hooks.once("ready", () => {
        if (game.settings.get(MODULE_NAME, "debug")) {
            console.log(`${MODULE_TITLE} | Debug mode active. Type 'ItemImporter.help()' for console commands.`);
        }
    });
}
