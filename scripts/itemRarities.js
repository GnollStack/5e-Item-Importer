import { isUnset, stringList } from "./explicitYamlFields.js";

const NAMES = Object.freeze({ common: "Common", uncommon: "Uncommon", rare: "Rare", veryRare: "Very Rare", legendary: "Legendary", artifact: "Artifact" });

/** Normalize the native rarity set without losing an explicitly empty collection. */
export function normalizeItemRarities(value, label = "ITEM.Rarities") {
  const known = { ...NAMES, ...(globalThis.CONFIG?.DND5E?.itemRarity ?? {}) };
  const aliases = new Map(Object.keys(known).map(key => [key.toLowerCase().replace(/\s+/g, ""), key]));
  return [...new Set(stringList(value, label).map(entry => {
    const key = aliases.get(entry.toLowerCase().replace(/\s+/g, ""));
    if (!key) throw new Error(`${label} contains an unsupported rarity "${entry}".`);
    return key;
  }))];
}

export function parseItemRarities(section = {}) {
  const canonical = Object.hasOwn(section, "Rarities");
  const legacy = !isUnset(section.Rarity);
  if (!canonical) return legacy ? normalizeItemRarities(section.Rarity, "ITEM.Rarity") : ["common"];
  if (!Array.isArray(section.Rarities)) throw new Error("ITEM.Rarities must be a list; use [] for an Item without rarity.");
  const values = normalizeItemRarities(section.Rarities);
  if (legacy) {
    const old = normalizeItemRarities(section.Rarity, "ITEM.Rarity");
    if (JSON.stringify([...values].sort()) !== JSON.stringify([...old].sort()))
      throw new Error("ITEM.Rarities conflicts with legacy ITEM.Rarity.");
  }
  return values;
}

export function itemRarities(item) {
  const source = item?._source ?? item;
  const values = source?.system?.rarities ?? source?.rarities;
  if (values !== undefined) return normalizeItemRarities(values);
  const legacy = source?.system?.rarity ?? source?.rarity;
  return isUnset(legacy) ? [] : normalizeItemRarities(legacy, "ITEM.Rarity");
}

export function formatItemRarities(item) {
  return itemRarities(item).map(value => NAMES[value] ?? value).join(", ") || "Mundane";
}
