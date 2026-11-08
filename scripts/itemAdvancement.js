/**
 * @file itemAdvancement.js
 * @description Shared vocabulary for dnd5e advancement on Feature Items: YAML root
 * keys, native type names, titles and preview summaries. The strict parser,
 * builder, exporter, preview and comparison all read from here so the six
 * feat-valid advancement types are described in one place.
 *
 * dnd5e 6.0.6 stores `system.advancement` as an object keyed by advancement `_id`
 * whose entries are `{ _id, type, configuration, value, level, name, hint, img,
 * classRestriction }`. HitPoints, Size and Subclass are class/species advancement
 * and are not valid on feats.
 */

/** YAML root key (one per ADVANCEMENT entry) -> native advancement type name. */
export const ADVANCEMENT_ROOTS = Object.freeze({
  ABILITY_SCORE_IMPROVEMENT: "AbilityScoreImprovement",
  GRANT_ITEMS: "ItemGrant",
  CHOOSE_ITEMS: "ItemChoice",
  MODIFY_ITEMS: "ModifyItem",
  SCALE_VALUE: "ScaleValue",
  TRAIT: "Trait"
});

/** Native type name -> YAML root key. */
export const ADVANCEMENT_TYPE_ROOTS = Object.freeze(
  Object.fromEntries(Object.entries(ADVANCEMENT_ROOTS).map(([root, type]) => [type, root]))
);

export const SUPPORTED_ADVANCEMENT_TYPES = Object.freeze(Object.values(ADVANCEMENT_ROOTS));

export const ADVANCEMENT_TITLES = Object.freeze({
  AbilityScoreImprovement: "Ability Score Improvement",
  ItemGrant: "Grant Items",
  ItemChoice: "Choose Items",
  ModifyItem: "Modify Items",
  ScaleValue: "Scale Value",
  Trait: "Trait"
});

/** Types whose levels come from their per-level entries; they store no single `level`. */
export const MULTI_LEVEL_ADVANCEMENT_TYPES = Object.freeze(["ItemChoice", "ScaleValue"]);

export const ADVANCEMENT_COMMON_KEYS = Object.freeze(["Advancement ID", "Level", "Name", "Hint", "Icon", "Class Restriction"]);

export const ADVANCEMENT_KEYS = Object.freeze({
  ABILITY_SCORE_IMPROVEMENT: ["Points", "Cap", "Max", "Locked", "FIXED", "RECOMMENDATION"],
  GRANT_ITEMS: ["Optional", "Sorting", "ITEMS", "SPELL"],
  CHOOSE_ITEMS: ["Allow Drops", "Sorting", "Type", "CHOICES", "POOL", "RESTRICTION", "SPELL"],
  MODIFY_ITEMS: ["CHANGES"],
  SCALE_VALUE: ["Identifier", "Type", "Distance Units", "SCALE"],
  TRAIT: ["Mode", "Allow Replacements", "Grants", "CHOICES"]
});

/** Item types an ItemGrant/ItemChoice may add to an actor (dnd5e 6.0.6). */
export const GRANTABLE_ITEM_TYPES = Object.freeze(["feat", "spell", "consumable", "container", "equipment", "loot", "tool", "weapon"]);
export const SPELL_METHODS = Object.freeze(["atwill", "innate", "ritual", "pact", "spell"]);
export const PREPARED_LABELS = Object.freeze(["unprepared", "prepared", "always"]);
export const SCALE_VALUE_TYPES = Object.freeze(["string", "number", "cr", "dice", "distance", "usage"]);
export const TRAIT_MODES = Object.freeze(["default", "expertise", "forcedExpertise", "upgrade", "mastery"]);
export const CLASS_RESTRICTIONS = Object.freeze(["primary", "secondary"]);
export const SORTING_MODES = Object.freeze(["a", "m"]);
export const ABILITY_IDS = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

/** `<trait>:<category>[:<child>]`, with `*` and `ALL` wildcards (dnd5e trait key grammar). */
export const TRAIT_KEY_PATTERN = /^(saves|skills|languages|armor|weapon|tool|di|dr|dv|ci|dm)(:[A-Za-z0-9_*.-]+)*$/;

/** Human spellings dnd5e would ignore silently; the parser suggests the category ids. */
export const TRAIT_CATEGORY_CORRECTIONS = Object.freeze({
  "weapon:simple": "weapon:sim", "weapon:martial": "weapon:mar",
  "armor:light": "armor:lgt", "armor:medium": "armor:med", "armor:heavy": "armor:hvy", "armor:shield": "armor:shl",
  "tool:artisan": "tool:art", "tool:gaming": "tool:game", "tool:musical": "tool:music"
});

const ABILITY_LABELS = Object.freeze({ str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" });

/**
 * Native `system.advancement` (keyed object, array or Collection of models) -> ordered
 * array of plain entries. Keyed entries receive their key as `_id` when missing.
 * @param {object|Array|Iterable} source
 * @returns {object[]}
 */
export function advancementEntries(source) {
  if (!source) return [];
  let entries;
  if (Array.isArray(source)) entries = source;
  else if (typeof source[Symbol.iterator] === "function") entries = [...source];
  else if (typeof source === "object") {
    entries = Object.entries(source).map(([key, entry]) => {
      const plain = plainEntry(entry);
      return plain ? { _id: key, ...plain } : null;
    });
  } else return [];
  return entries.map(plainEntry).filter(Boolean)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (levelOf(a.entry) - levelOf(b.entry)) || (a.index - b.index))
    .map(({ entry }) => entry);
}

function plainEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const source = typeof entry.toObject === "function" ? entry.toObject() : entry;
  return source && typeof source === "object" ? source : null;
}

function levelOf(entry) {
  return Number.isFinite(entry?.level) ? entry.level : Number.MAX_SAFE_INTEGER;
}

function listOf(value) {
  if (value instanceof Set) return [...value];
  return Array.isArray(value) ? value : [];
}

/**
 * Short, human-readable description of one advancement entry for previews and comparison.
 * @param {object} entry - Native-shaped advancement entry
 * @returns {{ type: string, title: string, level: string, summary: string }}
 */
export function describeAdvancement(entry) {
  const type = String(entry?.type ?? "");
  const title = ADVANCEMENT_TITLES[type] ?? type ?? "Advancement";
  const configuration = entry?.configuration ?? {};
  const level = MULTI_LEVEL_ADVANCEMENT_TYPES.includes(type)
    ? "By level"
    : Number.isInteger(entry?.level) && entry.level > 0 ? `Level ${entry.level}` : "Any level";
  const parts = [];
  switch (type) {
    case "AbilityScoreImprovement": {
      for (const [ability, value] of Object.entries(configuration.fixed ?? {})) {
        if (Number.isFinite(value) && value !== 0) parts.push(`${value > 0 ? "+" : ""}${value} ${ABILITY_LABELS[ability] ?? ability}`);
      }
      if (Number.isFinite(configuration.points) && configuration.points > 0) parts.push(`${configuration.points} point${configuration.points === 1 ? "" : "s"}`);
      if (Number.isFinite(configuration.cap) && configuration.cap !== 2) parts.push(`cap ${configuration.cap}`);
      if (configuration.recommendation) parts.push("recommended feat");
      break;
    }
    case "ItemGrant": {
      const count = listOf(configuration.items).length;
      parts.push(`${count} item${count === 1 ? "" : "s"}`);
      if (configuration.optional) parts.push("optional");
      if (configuration.spell) parts.push("spell configuration");
      break;
    }
    case "ItemChoice": {
      const choices = Object.entries(configuration.choices ?? {})
        .filter(([, choice]) => Number.isFinite(choice?.count))
        .map(([key, choice]) => `${choice.count} at level ${key}`);
      if (choices.length) parts.push(`choose ${choices.join(", ")}`);
      const pool = listOf(configuration.pool).length;
      if (pool) parts.push(`${pool} in pool`);
      if (configuration.type) parts.push(configuration.type);
      break;
    }
    case "ModifyItem": {
      const count = listOf(configuration.changes).length;
      parts.push(`${count} change${count === 1 ? "" : "s"}`);
      break;
    }
    case "ScaleValue": {
      if (configuration.identifier) parts.push(configuration.identifier);
      const steps = Object.entries(configuration.scale ?? {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, step]) => `${key}: ${describeScaleStep(configuration.type, step)}`);
      if (steps.length) parts.push(steps.join(", "));
      break;
    }
    case "Trait": {
      if (configuration.mode && configuration.mode !== "default") parts.push(configuration.mode);
      const grants = listOf(configuration.grants);
      if (grants.length) parts.push(`grants ${grants.join(", ")}`);
      for (const choice of listOf(configuration.choices)) {
        const pool = listOf(choice?.pool);
        parts.push(`choose ${choice?.count ?? 1}${pool.length ? ` from ${pool.join(", ")}` : ""}`);
      }
      break;
    }
    default:
      break;
  }
  return { type, title, level, summary: parts.join("; ") };
}

function describeScaleStep(type, step) {
  if (!step || typeof step !== "object") return String(step ?? "");
  if (type === "dice") {
    const modifiers = listOf(step.modifiers).join("");
    return `${step.number ?? ""}d${step.faces ?? ""}${modifiers}`;
  }
  if (type === "usage") return `${step.value ?? ""}${step.period ? `/${step.period}` : ""}`;
  return String(step.value ?? "");
}
