/**
 * 5e Item Importer
 * Main entry point for the module
 * 
 * This module allows you to import D&D 5e items from text format
 * (like from PDFs, websites, or homebrew documents) into Foundry VTT.
 */

import { MODULE_NAME, MODULE_TITLE, registerSettings, isFeatureEnabled } from "./itemConfig.js";
import { ItemUtils } from "./itemUtils.js";
import { ItemWindow } from "./itemWindow.js";
import { createDiagnosticsApi } from "./debugApi.js";
import { parseItemText } from "./parserRouting.js";

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

    game.modules.get(MODULE_NAME).api = {
        // Expose utility functions
        utils: ItemUtils,

        // Programmatic import now uses our new strict 'parse' function
        parse: parse,
        import: async (text, folderId) => {
            try {
                const result = parse(text);
                return result?.item ? await result.item.createItem5e(folderId) : null;
            } catch (error) {
                ItemUtils.error("API import error", error);
                return null;
            }
        },

        // Open the import window
        openWindow: () => ItemWindow.renderWindow(),

        // MCP Server Diagnostics
        diagnostics,

        // Version info
        version: game.modules.get(MODULE_NAME).version,

        // Module info
        info: () => {
            return {
                name: MODULE_NAME,
                title: MODULE_TITLE,
                version: game.modules.get(MODULE_NAME).version,
                debug: game.settings.get(MODULE_NAME, "debug"),
                enableMcpDiagnostics: game.settings.get(MODULE_NAME, "enableMcpDiagnostics")
            };
        }
    };

    ItemUtils.log("Module API registered", game.modules.get(MODULE_NAME).api);
}

/**
 * Add standalone Import Item button to the Items Directory footer
 */
function _addStandaloneButton(element) {
    if (element.querySelector("#ii-main-button")) return;

    ItemUtils.log("Adding Item Importer button to Items Directory");

    const importButton = document.createElement("button");
    importButton.id = "ii-main-button";
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
    if (!game.user.hasPermission("ITEM_CREATE")) {
        return;
    }

    // Convert jQuery to DOM element if needed
    const element = html instanceof jQuery ? html.get(0) : html;

    const activityImporterActive = game.modules.get("5e-activity-importer")?.active;
    const integrateWithActivityImporter = game.settings.get(MODULE_NAME, "integrateWithActivityImporter");

    if (activityImporterActive && integrateWithActivityImporter) {
        // Defer injection until all renderItemDirectory hooks have fired
        setTimeout(() => {
            const dropdown = element.querySelector("#ai-main-button-group .ai-directory-dropdown");
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

/**
 * Add context menu option to items (gated behind feature flag)
 */
if (isFeatureEnabled('EXPORT_TO_TEXT')) {
    Hooks.on("getItemDirectoryEntryContext", (html, contextOptions) => {
        contextOptions.push({
            name: "Export to Text",
            icon: '<i class="fas fa-file-export"></i>',
            condition: () => true,
            callback: (li) => {
                const item = game.items.get(li.data("documentId"));
                if (item) {
                    exportItemToText(item);
                }
            }
        });
    });
}

/**
 * Export item to text format (future feature)
 */
function exportItemToText(item) {
    ItemUtils.log("Exporting item to text", item);
    ui.notifications.info(`${MODULE_TITLE} | Export feature coming soon!`);

    if (game.settings.get(MODULE_NAME, "debug")) {
        console.log("Item data:", item.toObject());
    }
}

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
