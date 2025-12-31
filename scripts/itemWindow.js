/**
 * 5e Item Importer - UI Window
 * ApplicationV2-based interface for importing items
 */

import { ItemUtils } from "./itemUtils.js";
// import { NaturalItemParser } from "./naturalItemParser.js"; Commented out until I get the strict parsing to work
import { getParserForText } from "./strictItemParsers/strictParserDispatcher.js";
import { MODULE_NAME } from "./itemConfig.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ItemWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.parseTimeout = null;
    this.currentParseResult = null;
  }

  static DEFAULT_OPTIONS = {
    id: "ii-window",
    position: { width: 700, height: 600 },
    classes: ["ii-window"],
    tag: "form",
    window: {
      resizable: true,
      title: "5e Item Importer",
    },
    actions: {
      parse: ItemWindow.parse,
      import: ItemWindow.import,
      reset: ItemWindow.reset,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_NAME}/templates/itemWindow.hbs`,
    },
  };

  /**
   * Singleton instance
   */
  static instance = null;

  /**
   * Render the window
   */
  static async renderWindow() {
    if (ItemWindow.instance) {
      ItemWindow.instance.render(true);
    } else {
      ItemWindow.instance = new ItemWindow();
      ItemWindow.instance.render(true);
    }
  }

  /**
   * Prepare context data for rendering
   */
  _prepareContext(options) {
    return {
      autoParse: game.settings.get(MODULE_NAME, "autoParse"),
      placeholder:
        "Paste your item text here...\n\nExample:\nLongsword +1\nWeapon (longsword), uncommon (requires attunement)\nCost: 500 gp, Weight: 3 lb.\n\nYou have a +1 bonus to attack and damage rolls made with this magic weapon.",
    };
  }

  /**
   * Called after render
   */
  _onRender(context, options) {
    const input = this.element.querySelector("#ii-input");
    const autoParseCheckbox = this.element.querySelector(
      "#ii-auto-parse-checkbox"
    );

    // Clear any initial whitespace and ensure placeholder shows
    if (input) {
      input.value = "";
      // Force placeholder to show by ensuring the value is truly empty
      input.setAttribute("placeholder", context.placeholder);
    }

    // Set up paste handler
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.originalEvent || e).clipboardData.getData("text/plain");
      // Remove unicode format control characters
      const cleaned = text.replace(/\p{Cf}/gu, "");
      ItemUtils.insertTextAtSelection(cleaned);
    });

    // Set up enter key handler
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ItemUtils.insertTextAtSelection("\n");
      }
    });

    // Set up auto-parse
    if (autoParseCheckbox) {
      autoParseCheckbox.checked = game.settings.get(MODULE_NAME, "autoParse");

      autoParseCheckbox.addEventListener("change", (e) => {
        game.settings.set(MODULE_NAME, "autoParse", e.target.checked);
      });
    }

    // Auto-parse on input if enabled
    ["input", "blur"].forEach((eventType) => {
      input.addEventListener(eventType, (e) => {
        if (game.settings.get(MODULE_NAME, "autoParse")) {
          const delay =
            eventType === "input"
              ? game.settings.get(MODULE_NAME, "autoParseDelay")
              : 0;

          if (this.parseTimeout) {
            clearTimeout(this.parseTimeout);
          }

          this.parseTimeout = setTimeout(() => {
            ItemWindow.parse.call(this);
          }, delay);
        }
      });
    });

    // Populate folder select
    this.populateFolderSelect();

    ItemUtils.log("Item window rendered");
  }

  /**
   * Populate folder selection dropdown
   */
  populateFolderSelect() {
    const select = this.element.querySelector("#ii-folder-select");
    if (!select) return;

    // Clear existing options
    select.innerHTML = "";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "None (Root Level)";
    select.appendChild(defaultOption);

    // Add folder options
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

  /**
   * Parse the item text
   */
  static parse() {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    const text = input.innerText.trim();

    if (!text) {
      output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
      importBtn.disabled = true;
      this.currentParseResult = null;
      return;
    }

    ItemUtils.log("Parsing item text...");

    // 1. DETECT BATCH: Look for the strict template marker using a multiline, global regex.
    const itemMarkers = text.match(/^===([A-Z]+)===$/gm);

    // If we have more than one marker, treat it as a batch.
    if (itemMarkers && itemMarkers.length > 1) {
      ItemUtils.log(`Batch import detected with ${itemMarkers.length} items.`);
      ItemWindow.handleBatchParse.call(this, text);
      return;
    }

    try {
      // Parse the text
      // This is the code thats pointing towards naturalItemParser, commented out until I get strict parsing working
      // const result = NaturalItemParser.parseInput(text);

      // 2. The new logic that calls our strict dispatcher.
      const parser = getParserForText(text);
      const result = parser.parse(text);

      this.currentParseResult = result;

      if (!result.item) {
        const allErrors = [
          ...(result.errors || []),
          ...(result.warnings || []),
        ];
        output.innerHTML = `<div class="ii-parse-error">
                    <p><strong>⚠️ Parse Failed</strong></p>
                    <ul>${allErrors.map((i) => `<li>${i}</li>`).join("")}</ul>
                </div>`;
        importBtn.disabled = true;
        return;
      }

      // Display parse results
      const item = result.item;
      let html = '<div class="ii-parse-success">';
      html += `<h3>📦 ${item.name}</h3>`;
      html += '<div class="ii-parse-details">';

      // Quantity
      if (item.quantity && item.quantity > 1) {
        html += `<div class="ii-parse-row"><strong>Quantity:</strong> ${item.quantity}</div>`;
      }

      // Basic info
      // Show type with subtype if it's loot
      let typeDisplay = ItemWindow.formatType(item.type);
      if (item.type === "loot" && item.lootType) {
        const subtypeNames = {
          art: "Art Object",
          gear: "Adventuring Gear",
          gem: "Gemstone",
          treasure: "Treasure",
          mat: "Material",
          res: "Resource",
          junk: "Junk",
        };
        typeDisplay += ` (${subtypeNames[item.lootType] || item.lootType})`;
      }
      html += `<div class="ii-parse-row"><strong>Type:</strong> ${typeDisplay}</div>`;

      const magicalText = item.isMagical
        ? ` <span style="color: var(--ii-success);">(Magical)</span>`
        : ` <span style="opacity: 0.7;">(Non-Magical)</span>`;
      html += `<div class="ii-parse-row"><strong>Rarity:</strong> ${ItemWindow.formatRarity(
        item.rarity
      )}${magicalText}</div>`;

      if (item.attunement) {
        html += `<div class="ii-parse-row"><strong>Attunement:</strong> Required${
          item.attunementRequirement ? ` (${item.attunementRequirement})` : ""
        }</div>`;
      }

      if (item.cost > 0) {
        const costDisplay = item.costDisplay || item.getCostValue();
        const denomination = item.costDenomination || "gp";
        html += `<div class="ii-parse-row"><strong>Cost:</strong> ${costDisplay} ${denomination}</div>`;
      }

      if (item.weight > 0) {
        const weightUnitNames = {
          lb: "lb.",
          tn: "tons",
          kg: "kg",
          Mg: "Mg",
        };
        const unitDisplay =
          weightUnitNames[item.weightUnits] || item.weightUnits;
        html += `<div class="ii-parse-row"><strong>Weight:</strong> ${item.weight} ${unitDisplay}</div>`;
      }

      // Container capacity info
      if (item.itemCapacity) {
        html += `<div class="parse-row"><strong>Item Capacity:</strong> ${item.itemCapacity} items</div>`;
      }

      if (item.weightCapacity) {
        const weightUnitNames = {
          lb: "lb.",
          tn: "tons",
          kg: "kg",
          Mg: "Mg",
        };
        const unitDisplay =
          weightUnitNames[item.weightCapacityUnits] || item.weightCapacityUnits;
        html += `<div class="parse-row"><strong>Weight Capacity:</strong> ${item.weightCapacity} ${unitDisplay}</div>`;
      }

      if (item.volumeCapacity) {
        const volumeUnitNames = {
          cubicFoot: "cu. ft.",
          liter: "L",
        };
        const unitDisplay =
          volumeUnitNames[item.volumeCapacityUnits] || item.volumeCapacityUnits;
        html += `<div class="parse-row"><strong>Volume Capacity:</strong> ${item.volumeCapacity} ${unitDisplay}</div>`;
      }

      if (item.weightlessContents) {
        html += `<div class="parse-row"><strong>Weightless Contents:</strong> Yes</div>`;
      }

      // Weapon info
      if (item.damage) {
        html += `<div class="parse-row"><strong>Damage:</strong> ${item.damage.formula} ${item.damage.type}</div>`;
      }

      if (item.range) {
        html += `<div class="parse-row"><strong>Range:</strong> ${
          item.range.normal
        }${item.range.long ? `/${item.range.long}` : ""} ft.</div>`;
      }

      if (item.properties && item.properties.length > 0) {
        html += `<div class="parse-row"><strong>Properties:</strong> ${item.properties.join(
          ", "
        )}</div>`;
      }

      // Armor info
      if (item.armorClass) {
        html += `<div class="parse-row"><strong>AC:</strong> ${
          item.armorClass
        }${item.armorAddDex ? " + Dex" : ""}</div>`;
      }

      // Tool info
      if (item.toolType !== null && item.toolType !== undefined) {
        const toolTypeNames = {
          "": "Other Tools",
          art: "Artisan's Tools",
          game: "Gaming Set",
          music: "Musical Instrument",
        };
        html += `<div class="parse-row"><strong>Tool Type:</strong> ${
          toolTypeNames[item.toolType] || "Unknown"
        }</div>`;
      }

      if (item.baseToolItem) {
        html += `<div class="parse-row"><strong>Base Tool:</strong> ${item.baseToolItem}</div>`;
      }

      if (item.toolAbility) {
        html += `<div class="parse-row"><strong>Tool Ability:</strong> ${item.toolAbility.toUpperCase()}</div>`;
      }

      if (item.toolBonus) {
        html += `<div class="parse-row"><strong>Tool Bonus:</strong> +${item.toolBonus}</div>`;
      }

      // Consumable info
      if (item.consumableType) {
        const consumableTypeNames = {
          ammo: "Ammunition",
          food: "Food",
          poison: "Poison",
          potion: "Potion",
          rod: "Rod",
          scroll: "Scroll",
          trinket: "Trinket",
          wand: "Wand",
        };
        html += `<div class="parse-row"><strong>Consumable Type:</strong> ${
          consumableTypeNames[item.consumableType] || item.consumableType
        }</div>`;
      }

      // Charges (for magic items)
      if (item.charges) {
        html += `<div class="parse-row"><strong>Charges:</strong> ${item.charges.value}/${item.charges.max}</div>`;
        if (item.charges.recovery) {
          html += `<div class="parse-row"><strong>Recharge:</strong> ${item.charges.recovery} per day</div>`;
        }
      }

      // Uses (for tools and consumables)
      if (item.uses && !item.charges) {
        html += `<div class="parse-row"><strong>Limited Uses:</strong> ${item.uses.value}/${item.uses.max}</div>`;
      }

      // Auto-destroy
      if (item.autoDestroy) {
        html += `<div class="parse-row"><strong>Destroy on Empty:</strong> Yes</div>`;
      }

      // Charges
      if (item.charges) {
        html += `<div class="parse-row"><strong>Charges:</strong> ${item.charges.value}/${item.charges.max}</div>`;
      }

      // Description preview
      if (item.description && item.description.length > 0) {
        const preview = item.description
          .replace(/<[^>]+>/g, "")
          .substring(0, 200);
        html += `<div class="parse-row"><strong>Description:</strong> ${preview}${
          preview.length < item.description.length ? "..." : ""
        }</div>`;
      }

      if (
        item.unidentifiedDescription &&
        item.unidentifiedDescription.length > 0
      ) {
        const unidPreview = item.unidentifiedDescription
          .replace(/<[^>]+>/g, "")
          .substring(0, 150);
        html += `<div class="parse-row"><strong>Unidentified:</strong> ${unidPreview}${
          unidPreview.length < item.unidentifiedDescription.length ? "..." : ""
        }</div>`;
      }

      if (item.chatDescription && item.chatDescription.length > 0) {
        const chatPreview = item.chatDescription
          .replace(/<[^>]+>/g, "")
          .substring(0, 150);
        html += `<div class="parse-row"><strong>Chat Message:</strong> ${chatPreview}${
          chatPreview.length < item.chatDescription.length ? "..." : ""
        }</div>`;
      }

      html += `<div class="parse-row"><strong>Identified:</strong> ${
        item.identified ? "Yes" : "No"
      }</div>`;

      html += "</div>"; // parse-details

      // Issues (Now handles errors and warnings from the new parser)
      const allIssues = [...(result.errors || []), ...(result.warnings || [])];

      if (allIssues.length > 0) {
        html += '<div class="ii-parse-issues">';
        html += "<p><strong>⚠️ Issues & Warnings:</strong></p>";
        html += "<ul>";
        allIssues.forEach((issue) => {
          html += `<li>${issue}</li>`;
        });
        html += "</ul>";
        html += "</div>";
      }

      html += "</div>"; // ii-parse-success

      output.innerHTML = html;
      importBtn.disabled = false;

      ItemUtils.log("Parse successful", result);
    } catch (error) {
      ItemUtils.error("Parse error", error);
      output.innerHTML = `<div class="ii-parse-error">
                <p><strong>❌ Error</strong></p>
                <p>${error.message}</p>
            </div>`;
      importBtn.disabled = true;
      this.currentParseResult = null;
    }
  }

  /**
   * Handles parsing a single item block.
   * @param {string} text - The text for a single item.
   */
  static handleSingleParse(text) {
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    try {
      const parser = getParserForText(text);
      const result = parser.parse(text);

      // Store the result. For single items, it's just the result object.
      this.currentParseResult = result;

      if (!result.success || !result.item) {
        const allErrors = [
          ...(result.errors || []),
          ...(result.warnings || []),
        ];
        output.innerHTML = `<div class="parse-error">
                    <p><strong>⚠️ Parse Failed</strong></p>
                    <ul>${allErrors.map((i) => `<li>${i}</li>`).join("")}</ul>
                </div>`;
        importBtn.disabled = true;
        return;
      }

      // Call a helper to render the detailed preview.
      output.innerHTML = this.renderSingleItemPreview(result.item, result);
      importBtn.disabled = false;
      ItemUtils.log("Single parse successful", result);
    } catch (error) {
      ItemUtils.error("Parse error", error);
      output.innerHTML = `<div class="parse-error"><p><strong>❌ Error</strong></p><p>${error.message}</p></div>`;
      importBtn.disabled = true;
      this.currentParseResult = null;
    }
  }

  /**
   * Handles parsing a full text block containing multiple items.
   * @param {string} text - The full text input.
   */
  static handleBatchParse(text) {
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    // 2. SPLIT THE TEXT: Use a positive lookahead to split *before* the delimiter, keeping it.
    const itemChunks = text
      .split(/(?=^===[A-Z]+===$)/m)
      .filter((chunk) => chunk.trim());

    const results = {
      successes: [],
      failures: [],
    };

    // 3. LOOP AND PARSE
    for (const chunk of itemChunks) {
      try {
        const parser = getParserForText(chunk);
        const result = parser.parse(chunk);
        if (result.success && result.item) {
          results.successes.push(result);
        } else {
          results.failures.push({
            text: chunk,
            errors: [...result.errors, ...result.warnings],
          });
        }
      } catch (error) {
        results.failures.push({ text: chunk, errors: [error.message] });
      }
    }

    // 4. COLLECT AND STORE RESULTS
    this.currentParseResult = results;
    ItemUtils.log("Batch parse complete", results);

    // 5. DISPLAY SUMMARY UI
    output.innerHTML = ItemWindow.renderBatchSummary(results);

    // Enable import button only if there's at least one successful parse.
    importBtn.disabled = results.successes.length === 0;
  }

  /**
   * Renders the HTML for the batch parse summary.
   * @param {object} results - The collected results object.
   * @returns {string} - The HTML to display.
   */
  static renderBatchSummary(results) {
    let html = `<div class="ii-parse-success">`;
    html += `<h3>Batch Parse Results</h3>`;
    html += `<p>Found <strong>${results.successes.length}</strong> items ready for import and <strong>${results.failures.length}</strong> items with errors.</p>`;

    if (results.successes.length > 0) {
      html += `<h4>✅ Ready to Import:</h4>`;
      html += `<ul>`;
      results.successes.forEach((res) => {
        html += `<li><strong>${res.item.name}</strong> (${ItemWindow.formatType(
          res.item.type
        )}, ${ItemWindow.formatRarity(res.item.rarity)})</li>`;
      });
      html += `</ul>`;
    }

    if (results.failures.length > 0) {
      html += `<h4 style="color: var(--color-text-error);">❌ Failed Items:</h4>`;
      html += `<ul class="fa-ul">`;
      results.failures.forEach((fail) => {
        const firstLine = fail.text.split("\n")[0].trim();
        html += `<li><span class="fa-li"><i class="fas fa-times-circle"></i></span><strong>Item starting with "<em>${firstLine}</em>":</strong>`;
        html += `<ul>${fail.errors.map((e) => `<li>${e}</li>`).join("")}</ul>`;
        html += `</li>`;
      });
      html += `</ul>`;
    }

    html += "</div>";
    return html;
  }

  /**
   * Renders the detailed HTML preview for a single item.
   * @param {ItemData} item - The parsed item data.
   * @param {object} result - The full parse result, including warnings/errors.
   * @returns {string} HTML for the preview.
   */
  static renderSingleItemPreview(item, result) {
    // MOVE your original HTML generation code from the old parse() method HERE.
    // It should look something like this:
    let html = '<div class="ii-parse-success">';
    html += `<h3>📦 ${item.name}</h3>`;
    html += '<div class="ii-parse-details">';

    // ... (all your existing logic for creating 'parse-row' divs) ...

    html += "</div>"; // End parse-details

    const allIssues = [...(result.errors || []), ...(result.warnings || [])];
    if (allIssues.length > 0) {
      html += '<div class="ii-parse-issues">';
      html += "<p><strong>⚠️ Issues & Warnings:</strong></p>";
      html += "<ul>";
      allIssues.forEach((issue) => {
        html += `<li>${issue}</li>`;
      });
      html += "</ul></div>";
    }

    html += "</div>"; // End ii-parse-success
    return html;
  }

  /**
   * Render batch import summary
   * @param {Object} results - Batch parse results with successes and failures arrays
   */
  renderBatchSummary(results) {
    const { successes, failures } = results;
    const total = successes.length + failures.length;

    let html = `<div class="batch-summary">`;
    html += `<h3>Batch Import Complete</h3>`;
    html += `<p><strong>${successes.length}/${total}</strong> items parsed successfully</p>`;

    if (successes.length > 0) {
      html += `<div class="batch-successes">`;
      html += `<h4>Successfully Parsed:</h4>`;
      html += `<ul>`;
      successes.forEach((item) => {
        html += `<li>${item.name || "Unnamed Item"} (${item.type})</li>`;
      });
      html += `</ul>`;
      html += `</div>`;
    }

    if (failures.length > 0) {
      html += `<div class="batch-failures">`;
      html += `<h4>Failed to Parse:</h4>`;
      html += `<ul>`;
      failures.forEach((failure) => {
        html += `<li>${failure.text?.substring(0, 50) || "Unknown"}: ${
          failure.error
        }</li>`;
      });
      html += `</ul>`;
      html += `</div>`;
    }

    html += `</div>`;

    // Display in the preview area or create a dialog
    const previewDiv = this.element.find(".item-preview");
    if (previewDiv.length) {
      previewDiv.html(html);
    }
  }

  /**
   * Import the parsed item(s) with batch support.
   */
  static async import() {
    if (!this.currentParseResult) {
      ItemUtils.warn("No item to import");
      return;
    }

    const folderSelect = this.element.querySelector("#ii-folder-select");
    const folderId = folderSelect?.value || null;

    const importBtn = this.element.querySelector("[data-action='import']");
    const originalText = importBtn.textContent;
    importBtn.disabled = true;

    // Check if this is a batch import by looking for the 'successes' property
    if (this.currentParseResult.successes) {
      // BATCH IMPORT LOGIC
      const itemsToCreate = this.currentParseResult.successes.map(
        (res) => res.item
      );
      const total = itemsToCreate.length;
      ItemUtils.log(`Importing ${total} items to folder:`, folderId);

      for (let i = 0; i < total; i++) {
        const item = itemsToCreate[i];
        importBtn.textContent = `Importing (${i + 1}/${total})...`;
        try {
          await item.createItem5e(folderId);
        } catch (err) {
          ui.notifications.error(
            `Failed to import ${item.name}: ${err.message}`
          );
        }
      }
      if (total > 0) {
        ui.notifications.info(`Successfully imported ${total} items.`);
      }
    } else if (this.currentParseResult.item) {
      // SINGLE ITEM IMPORT LOGIC (Original logic)
      ItemUtils.log("Importing single item to folder:", folderId);
      importBtn.textContent = "Importing...";
      await this.currentParseResult.item.createItem5e(folderId);
    }

    // Reset the form regardless of import type
    importBtn.textContent = originalText;
    ItemWindow.reset.call(this);
  }

  /**
   * Reset the form
   */
  static reset() {
    const input = this.element.querySelector("#ii-input");
    const output = this.element.querySelector("#ii-parse-output");
    const importBtn = this.element.querySelector("[data-action='import']");

    // Use innerText (or innerHTML) because the element is a contenteditable div, not a textarea
    if (input) {
      input.innerText = "";
      input.innerHTML = ""; // Redundant safety to ensure HTML is cleared too
    }

    if (output) {
      output.innerHTML = "<p><em>Enter item text to parse...</em></p>";
    }

    if (importBtn) {
      importBtn.disabled = true;
    }

    this.currentParseResult = null;

    ItemUtils.log("Form reset");
  }

  /**
   * Format item type for display
   */
  static formatType(type) {
    const typeMap = {
      weapon: "Weapon",
      equipment: "Equipment",
      consumable: "Consumable",
      tool: "Tool",
      loot: "Loot",
      container: "Container",
      spell: "Spell",
      feat: "Feature",
      class: "Class",
      background: "Background",
      facility: "Facility",
      race: "Race",
      subclass: "Subclass",
    };
    return typeMap[type] || type;
  }

  /**
   * Format rarity for display
   */
  static formatRarity(rarity) {
    const rarityMap = {
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      veryRare: "Very Rare",
      legendary: "Legendary",
      artifact: "Artifact",
    };
    return rarityMap[rarity] || rarity;
  }
}
