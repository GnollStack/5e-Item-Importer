import { ItemData } from "../../scripts/itemData.js";

/** Source-only attachment transaction fixtures use a current, isolated companion contract. */
export function withCompatibleActivityCompanion(item = Object.create(ItemData.prototype)) {
    const companion = {
        active: true,
        api: { schemaVersion: 2, capabilities: { serialization: {
            strictActivity: { schemaVersion: 5 }, strictEffect: { schemaVersion: 5 }
        } } }
    };
    item.collectActivityResults = function(results) {
        return ItemData.prototype.collectActivityResults.call(this, results, companion);
    };
    return item;
}
