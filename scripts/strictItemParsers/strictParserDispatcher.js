/**
 * 5e Item Importer - Strict Parser Dispatcher
 * Routes input to the YAML parser.
 *
 * NOTE: Do NOT import NaturalItemParser here — it imports from this file,
 * which would create a circular dependency.
 */

import { YamlItemParser } from './yamlItemParser.js';
import { ItemUtils } from '../itemUtils.js';

/**
 * Get the appropriate strict parser for the given text.
 * Currently always returns a YamlItemParser instance.
 *
 * @param {string} text - Raw item text
 * @returns {YamlItemParser} A parser instance with a .parse(text) method
 */
export function getParserForText(text) {
    return new YamlItemParser();
}

/**
 * Parse YAML text that may contain multiple items.
 * Each top-level key (WEAPON, EQUIPMENT, etc.) becomes a separate item.
 *
 * @param {string} text - Raw YAML text
 * @returns {Array} Array of parse result objects: { success, item, errors, warnings }
 */
export function parseAllItemsYaml(text) {
    ItemUtils.log("Dispatcher: Routing to YAML parser (parseAll).");
    const parser = new YamlItemParser();
    return parser.parseAll(text);
}
