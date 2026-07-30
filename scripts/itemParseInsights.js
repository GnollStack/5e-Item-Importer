/** Deterministic, local-only parse confidence, suggestions, and provenance. */

const INSIGHTS_VERSION = 1;
const LOW_CONFIDENCE = 0.65;
const MEDIUM_CONFIDENCE = 0.82;

const COMMON_FIELDS = new Set([
  "name", "itemType", "rarity", "cost", "weight", "description",
  "quantity", "uses", "isMagical"
]);

const ITEM_TYPE_FIELDS = {
  weapon: new Set([
    "weaponType", "baseWeapon", "damage", "versatileDamage", "properties",
    "mastery", "range", "attunement", "magicBonus"
  ]),
  equipment: new Set([
    "equipmentType", "baseEquipment", "armorClass", "maxDexModifier",
    "strengthRequirement", "equipmentProperties", "attunement", "magicBonus"
  ]),
  tool: new Set([
    "toolType", "baseTool", "toolBonus", "toolAbility", "toolProficiency",
    "attunement"
  ]),
  consumable: new Set([
    "consumableType", "ammunitionType", "ammunitionProperties", "poisonType",
    "scrollProperties", "attunement"
  ]),
  container: new Set([
    "containerCapacity", "containerProperties", "currencyContents", "attunement"
  ]),
  loot: new Set(["lootType", "lootProperties"]),
  spell: new Set([])
};

const KNOWN_TYPE_FIELDS = new Set(
  Object.values(ITEM_TYPE_FIELDS).flatMap((fields) => [...fields])
);

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableValue(value) {
  if (value == null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(stableValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return String(value);
}

function clampConfidence(value, fallback = 0.5) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function textContainsValue(text, value) {
  if (value == null || value === "" || typeof value === "object") return false;
  return String(text ?? "").toLowerCase().includes(String(value).toLowerCase());
}

function normalizeItemType(value) {
  const type = String(value ?? "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ITEM_TYPE_FIELDS, type) ? type : null;
}

function isRelevantField(field, itemType) {
  if (COMMON_FIELDS.has(field)) return true;
  if (!KNOWN_TYPE_FIELDS.has(field)) return true;
  if (!itemType) return true;
  return ITEM_TYPE_FIELDS[itemType].has(field);
}

/**
 * Build field-level provenance. Accepts either an options object or the
 * positional form (text, extractedFields, confidence).
 */
export function deriveParseProvenance(input, extractedFields = {}, confidence = {}) {
  const options = isPlainObject(input) && Object.prototype.hasOwnProperty.call(input, "text")
    ? input
    : { text: input, extractedFields, confidence };
  const text = String(options.text ?? "");
  const fields = options.extractedFields ?? {};
  const confidenceMap = options.confidence ?? {};
  const parser = options.parser ?? "local";
  const itemType = normalizeItemType(options.itemType ?? fields.itemType);

  return Object.keys(fields)
    .filter((field) => isRelevantField(field, itemType))
    .sort()
    .map((field) => {
      const value = stableValue(fields[field]);
      const explicitConfidence = confidenceMap[field];
      const evidenced = textContainsValue(text, value);
      const fieldConfidence = clampConfidence(
        explicitConfidence,
        evidenced ? 0.85 : value == null || value === "" ? 0.35 : 0.6
      );
      const origin = evidenced
        ? "explicit"
        : value == null || value === ""
          ? "missing"
          : fieldConfidence >= MEDIUM_CONFIDENCE
            ? "inferred"
            : "defaulted";
      return { field, value, confidence: fieldConfidence, origin, parser };
    });
}

function suggestion(code, message, options = {}) {
  return {
    code,
    severity: options.severity ?? "info",
    field: options.field ?? null,
    message
  };
}

function dedupeSuggestions(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.code}|${entry.field ?? ""}|${entry.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) =>
    a.severity.localeCompare(b.severity)
      || String(a.field ?? "").localeCompare(String(b.field ?? ""))
      || a.code.localeCompare(b.code)
      || a.message.localeCompare(b.message)
  );
}

export function buildItemParseInsights({ text = "", result = {}, trace = {}, parser = null } = {}) {
  const selectedParser = parser ?? trace.selectedParser ?? "unknown";
  const extractedFields = trace.extractedFields ?? trace.lightYaml?.fields ?? {};
  const confidenceMap = trace.confidence ?? {};
  const itemType = normalizeItemType(
    extractedFields.itemType ?? trace.itemType ?? result.item?.type
  );
  const provenance = deriveParseProvenance({
    text,
    extractedFields,
    confidence: confidenceMap,
    parser: selectedParser,
    itemType
  });
  const suggestions = [];

  for (const entry of provenance) {
    if (entry.origin === "missing") continue;
    if (entry.confidence < LOW_CONFIDENCE) {
      suggestions.push(suggestion(
        "review-low-confidence",
        `Review ${entry.field}; it was ${entry.origin} with ${Math.round(entry.confidence * 100)}% confidence.`,
        { field: entry.field, severity: "warning" }
      ));
    } else if (entry.origin === "defaulted") {
      suggestions.push(suggestion(
        "review-default",
        `Confirm the defaulted ${entry.field} value.`,
        { field: entry.field }
      ));
    }
  }

  for (const message of result.errors ?? []) {
    suggestions.push(suggestion("resolve-parse-error", String(message), { severity: "error" }));
  }
  for (const message of result.warnings ?? []) {
    suggestions.push(suggestion("review-parser-warning", String(message), { severity: "warning" }));
  }
  for (const automationSuggestion of trace.automation?.suggestions ?? []) {
    suggestions.push(suggestion(
      automationSuggestion.code ?? "review-automation",
      automationSuggestion.message ?? String(automationSuggestion),
      { severity: "info" }
    ));
  }
  if ((trace.automation?.pendingActivities?.length ?? 0) > 0
      && result.item?.pendingActivities?.length === 0) {
    suggestions.push(suggestion(
      "review-suggested-automation",
      `${trace.automation.pendingActivities.length} high-confidence automation suggestion(s) are available for review.`,
      { severity: "info" }
    ));
  }

  const item = result.item;
  if (result.success && item) {
    if (!item.name || item.name === "Unnamed Item") {
      suggestions.push(suggestion("add-name", "Provide an explicit item name.", {
        field: "name",
        severity: "warning"
      }));
    }
    if (!String(item.description ?? "").trim()) {
      suggestions.push(suggestion("add-description", "Add rules or flavor text if the item needs a description.", {
        field: "description"
      }));
    }
  }

  const confidenceValues = provenance
    .map((entry) => entry.confidence)
    .filter(Number.isFinite);
  let overall = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : (result.success ? 1 : 0);
  overall -= Math.min(0.45, (result.errors?.length ?? 0) * 0.2 + (result.warnings?.length ?? 0) * 0.03);
  overall = clampConfidence(overall, result.success ? 1 : 0);

  return {
    version: INSIGHTS_VERSION,
    localOnly: true,
    deterministic: true,
    parser: selectedParser,
    inputKind: trace.inputKind ?? "unknown",
    confidence: {
      overall: Number(overall.toFixed(3)),
      fields: Object.fromEntries(provenance.map((entry) => [entry.field, entry.confidence]))
    },
    provenance,
    suggestions: dedupeSuggestions(suggestions)
  };
}
