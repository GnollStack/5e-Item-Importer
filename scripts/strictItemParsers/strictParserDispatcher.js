// scripts/strictItemParsers/strictParserDispatcher.js

import { BaseStrictParser } from "./baseParser.js";
import { LootStrictParser } from "./lootParser.js";
import { ToolStrictParser } from "./toolParser.js";
import { ContainerStrictParser } from "./containerParser.js";
import { ConsumableStrictParser } from "./consumableParser.js";
import { WeaponStrictParser } from "./weaponParser.js";
import { EquipmentStrictParser } from "./equipmentParser.js";
import { SpellStrictParser } from "./spellParser.js";
import { NaturalItemParser } from "../naturalItemParser.js";

/**
 * Main entry point for parsing. Detects format type and routes to appropriate parser.
 *
 * @param {string} text - The full, raw text of the item to be parsed.
 * @returns {BaseStrictParser|NaturalItemParser} An instance of the appropriate parser.
 */
export function getParserForText(text) {
  // If the text is empty, return a base parser instance
  if (!text || !text.trim()) {
    console.log("[Item Importer] Empty text provided, using BaseStrictParser");
    return new BaseStrictParser();
  }

  // Detect if this is a strict template or natural language
  const isStrict = isStrictTemplate(text);

  if (!isStrict) {
    // Natural language - route to natural parser
    console.log(
      "[Item Importer] Natural language detected, using NaturalItemParser"
    );
    return new NaturalItemParser();
  }

  // Strict template - continue with existing logic
  console.log(
    "[Item Importer] Strict template detected, routing to specialized parser"
  );

  const lines = text.split("\n");
  let itemType = null;

  // Find the item type marker
  for (const line of lines) {
    const match = line.trim().match(/^===([A-Z]+)===$/);
    if (match) {
      const typeText = match[1];
      const typeMap = {
        WEAPON: "weapon",
        EQUIPMENT: "equipment",
        CONSUMABLE: "consumable",
        TOOL: "tool",
        LOOT: "loot",
        CONTAINER: "container",
        BACKPACK: "backpack",
        SPELL: "spell",
      };
      itemType = typeMap[typeText] || null;
      break;
    }
  }

  console.log(
    `[Item Importer] Strict Dispatcher: Detected item type -> ${itemType}`
  );

  // Route to specialized parser based on type
  switch (itemType) {
    case "loot":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to LootStrictParser."
      );
      return new LootStrictParser();
    case "tool":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to ToolStrictParser."
      );
      return new ToolStrictParser();
    case "container":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to ContainerStrictParser."
      );
      return new ContainerStrictParser();
    case "consumable":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to ConsumableStrictParser."
      );
      return new ConsumableStrictParser();
    case "weapon":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to WeaponStrictParser."
      );
      return new WeaponStrictParser();
    case "equipment":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to EquipmentStrictParser."
      );
      return new EquipmentStrictParser();
    case "spell":
      console.log(
        "[Item Importer] Strict Dispatcher: Dispatching to SpellStrictParser."
      );
      return new SpellStrictParser();
    default:
      console.log(
        "[Item Importer] Strict Dispatcher: No specific parser found. Dispatching to BaseStrictParser."
      );
      return new BaseStrictParser();
  }
}

/**
 * Detect if text is a strict template format
 * @param {string} text - The text to check
 * @returns {boolean} True if strict template, false if natural language
 */
function isStrictTemplate(text) {
  // Strict templates MUST start with ===ITEMTYPE=== marker
  // Check first non-empty line
  const lines = text.trim().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue; // Skip empty lines

    // First non-empty line should be ===TYPE===
    const isStrictMarker = /^===([A-Z]+)===$/;
    return isStrictMarker.test(trimmed);
  }

  // If we get here, no non-empty lines found
  return false;
}
