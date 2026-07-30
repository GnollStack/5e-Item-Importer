import jsyaml from "./vendor/js-yaml.mjs";

/**
 * Conservative, local synthesis of optional Activity Importer payloads.
 * Nothing here imports or calls the optional module: entries remain pending
 * until the normal item creation flow can apply them.
 */

const DAMAGE_TYPES = new Set([
  "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
]);
const CONDITIONS = new Set([
  "blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled",
  "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone",
  "restrained", "stunned", "unconscious"
]);
const ABILITIES = {
  str: "str", strength: "str",
  dex: "dex", dexterity: "dex",
  con: "con", constitution: "con",
  int: "int", intelligence: "int",
  wis: "wis", wisdom: "wis",
  cha: "cha", charisma: "cha"
};

function cleanFormula(formula) {
  return String(formula ?? "").replace(/\s+/g, " ").replace(/\s*([+-])\s*/g, " $1 ").trim();
}

function titleCase(value) {
  return String(value ?? "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pending(key, name, rawData, confidence, evidence) {
  return {
    key,
    name,
    rawData,
    source: "natural-text",
    confidence,
    evidence
  };
}

function sentenceAt(text, index) {
  const start = Math.max(0, text.lastIndexOf(".", index - 1) + 1);
  const next = text.indexOf(".", index);
  return text.slice(start, next < 0 ? text.length : next + 1).trim();
}

function conditionDuration(evidence) {
  const rounds = evidence.match(/\bfor\s+(\d+)\s+rounds?\b/i);
  if (rounds) return { "Effect Duration (combat) Rounds": Number(rounds[1]) };
  const minutes = evidence.match(/\bfor\s+(\d+)\s+minutes?\b/i);
  if (minutes) return { "Effect Duration (Seconds)": Number(minutes[1]) * 60 };
  const hours = evidence.match(/\bfor\s+(\d+)\s+hours?\b/i);
  if (hours) return { "Effect Duration (Seconds)": Number(hours[1]) * 3600 };
  if (/\buntil (?:the )?(?:start|end) of (?:its|your|the target'?s) next turn\b/i.test(evidence)) {
    return { "Effect Duration (combat) Rounds": 1 };
  }
  return {};
}

function pushUnique(output, entry) {
  const signature = `${entry.key}|${entry.name}|${JSON.stringify(entry.rawData)}`;
  if (!output.some((existing) =>
    `${existing.key}|${existing.name}|${JSON.stringify(existing.rawData)}` === signature
  )) output.push(entry);
}

/**
 * Synthesize only mechanically explicit wording. Ambiguous prose is returned
 * as a suggestion instead of guessed automation.
 */
export function synthesizeNaturalAutomation(text, context = {}) {
  const source = String(text ?? "");
  const itemName = String(context.name ?? context.itemName ?? "Item").trim() || "Item";
  const pendingActivities = [];
  const suggestions = [];
  const warnings = [];

  const damagePattern = /\b(?:deals?|takes?|suffers?)\s+(?:an?\s+)?(?:extra|additional)\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+([a-z]+)\s+damage\b/gi;
  for (const match of source.matchAll(damagePattern)) {
    const damageType = match[2].toLowerCase();
    if (!DAMAGE_TYPES.has(damageType)) continue;
    const formula = cleanFormula(match[1]);
    const evidence = sentenceAt(source, match.index ?? 0);
    const name = `${itemName}: Extra ${titleCase(damageType)} Damage`;
    pushUnique(pendingActivities, pending("ACTIVITY_DAMAGE", name, {
      ACTIVITY_DAMAGE: {
        ACTIVITY: { Name: name, Icon: "n/a" },
        DAMAGE_DETAILS: { "Allow Critical": true },
        DAMAGE: {
          DAMAGE_PARTS: [{
            "Damage Formula": formula,
            "Damage Type": damageType,
            "Damage Scaling": "No Scaling"
          }]
        }
      }
    }, 0.96, evidence));
  }

  const healingPattern = /\b(?:regains?|heals?(?:\s+(?:itself|the target|a creature))?)\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(?:hit points?|hp)\b/gi;
  for (const match of source.matchAll(healingPattern)) {
    const formula = cleanFormula(match[1]);
    const evidence = sentenceAt(source, match.index ?? 0);
    const name = `${itemName}: Healing`;
    pushUnique(pendingActivities, pending("ACTIVITY_HEAL", name, {
      ACTIVITY_HEAL: {
        ACTIVITY: { Name: name, Icon: "n/a" },
        HEALING: {
          Formula: formula,
          Type: "healing",
          Scaling: "whole",
          "Dice Count": 1
        }
      }
    }, 0.95, evidence));
  }

  const savePattern = /\b(?:make|makes|succeed on|succeeds on)?\s*(?:a|an)?\s*DC\s*(\d{1,2})\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Str|Dex|Con|Int|Wis|Cha)\s+saving throw\b/gi;
  for (const match of source.matchAll(savePattern)) {
    const dc = Number(match[1]);
    const ability = ABILITIES[match[2].toLowerCase()];
    if (!ability || dc < 1 || dc > 40) continue;
    const evidence = sentenceAt(source, match.index ?? 0);
    const name = `${itemName}: ${match[2].slice(0, 3).toUpperCase()} Save`;
    pushUnique(pendingActivities, pending("ACTIVITY_SAVE", name, {
      ACTIVITY_SAVE: {
        ACTIVITY: { Name: name, Icon: "n/a" },
        SAVE_DETAILS: {
          "Challenge Ability": ability,
          "DC Calculation": "custom",
          "DC Formula": String(dc)
        }
      }
    }, 0.97, evidence));
  }

  const conditionPattern = new RegExp(
    `\\b(?:is|becomes|is rendered|become)\\s+(${[...CONDITIONS].join("|")})\\b[^.]{0,120}\\b(?:until|for)\\b[^.]*`,
    "gi"
  );
  for (const match of source.matchAll(conditionPattern)) {
    const condition = match[1].toLowerCase();
    const evidence = sentenceAt(source, match.index ?? 0);
    const name = `${itemName}: ${titleCase(condition)}`;
    const activity = pendingActivities.find((entry) =>
      entry.evidence === evidence
        && ["ACTIVITY_SAVE", "ACTIVITY_DAMAGE", "ACTIVITY_UTILITY"].includes(entry.key)
    );
    if (!activity) {
      suggestions.push({
        code: "automation-condition-needs-activity",
        message: `The ${condition} condition was recognized, but it was not attached because the same sentence did not produce a target-applying activity.`
      });
      continue;
    }
    activity.rawData[activity.key].APPLIED_EFFECTS = [{
      DETAILS: {
        Name: name,
        "Effect Suspended": false,
        "Apply Effect to Actor": false,
        "Status Conditions": condition
      },
      EFFECT_DESCRIPTION: { "Effect Description": evidence },
      DURATION: conditionDuration(evidence)
    }];
  }

  const rechargePattern = /\b(?:recharge\s*(\d)\s*[-\u2013\u2014]\s*6|recharges?\s+on\s+(?:a\s+)?(?:roll\s+of\s+)?(\d)\s+(?:or|through|to|[-\u2013\u2014])\s*6)\b/gi;
  for (const match of source.matchAll(rechargePattern)) {
    const threshold = Number(match[1] ?? match[2]);
    if (threshold < 2 || threshold > 6) continue;
    const evidence = sentenceAt(source, match.index ?? 0);
    const name = `${itemName}: Recharge ${threshold}-6`;
    pushUnique(pendingActivities, pending("ACTIVITY_UTILITY", name, {
      ACTIVITY_UTILITY: {
        ACTIVITY: { Name: name, Icon: "n/a" },
        UTILITY_ROLL: {
          "Roll Label": `Recharge on ${threshold}-6`,
          "Roll Formula": "1d6",
          "Visible to All": true
        }
      }
    }, 0.98, evidence));
  }

  if (/\b(?:extra|additional) damage\b/i.test(source)
      && !pendingActivities.some((entry) => entry.key === "ACTIVITY_DAMAGE")) {
    suggestions.push({
      code: "automation-needs-damage-formula",
      message: "Extra damage was mentioned, but an explicit dice formula and damage type are required for safe automation."
    });
  }
  if (/\bsaving throw\b/i.test(source)
      && !pendingActivities.some((entry) => entry.key === "ACTIVITY_SAVE")) {
    suggestions.push({
      code: "automation-needs-save-dc",
      message: "A saving throw was mentioned, but both an explicit DC and ability are required for safe automation."
    });
  }

  return {
    version: 1,
    source: "deterministic-local-rules",
    pendingActivities,
    suggestions,
    warnings,
    validation: validateSynthesizedAutomation(pendingActivities, {
      parseAllBlocks: context.parseAllBlocks ?? context.parseAll ?? context.parse
    })
  };
}

/**
 * Validate synthesized raw payloads through an Activity Importer-compatible
 * parse function when one is available. This never requires that dependency.
 */
export function validateSynthesizedAutomation(entries, options = {}) {
  const hasExplicitParser = Object.prototype.hasOwnProperty.call(options, "parseAllBlocks")
    && options.parseAllBlocks !== undefined;
  const runtimeApi = options.useRuntimeApi === false
    ? null
    : globalThis.game?.modules?.get?.("5e-activity-importer")?.api;
  const parseAllBlocks = hasExplicitParser
    ? options.parseAllBlocks
    : runtimeApi?.parseAll ?? runtimeApi?.parse ?? runtimeApi?.parseAllBlocks ?? null;
  if (typeof parseAllBlocks !== "function") {
    return { available: false, skipped: true, valid: null, results: [], errors: [] };
  }

  const results = [];
  const errors = [];
  for (const entry of entries ?? []) {
    try {
      const yaml = jsyaml.dump(entry.rawData, { lineWidth: -1, noRefs: true }).trim();
      const parsed = parseAllBlocks(yaml, { diagnostics: false });
      const blocks = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      const valid = blocks.length > 0 && blocks.every((block) =>
        block?.success === true && (block?.activityData || block?.effectData)
      );
      results.push({ key: entry.key, name: entry.name, valid, blocks });
      if (!valid) errors.push(`${entry.name || entry.key} did not round-trip through the Activity parser.`);
    } catch (error) {
      results.push({ key: entry.key, name: entry.name, valid: false, blocks: [] });
      errors.push(`${entry.name || entry.key}: ${error.message}`);
    }
  }
  return { available: true, skipped: false, valid: errors.length === 0, results, errors };
}
