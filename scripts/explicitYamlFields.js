/**
 * Explicit native YAML values shared by convention between the two independent
 * importers. This file has no Foundry imports and never writes documents.
 */
export const DAMAGE_DATA_KEYS = Object.freeze([
  "Dice Count", "Die Denomination", "Bonus", "Damage Types", "Custom Enabled",
  "Custom Formula", "Scaling Mode", "Scaling Dice Count", "Scaling Formula"
]);
export const isMapping = value => !!value && typeof value === "object"
  && !Array.isArray(value) && !(value instanceof Set) && !(value instanceof Map);
export const isUnset = value => value === undefined || value === null
  || (typeof value === "string" && ["", "n/a"].includes(value.trim().toLowerCase()));
export function cloneExplicit(value) {
  if (value instanceof Set) return [...value].map(cloneExplicit);
  if (Array.isArray(value)) return value.map(cloneExplicit);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !["__proto__", "constructor", "prototype"].includes(key)
  ).map(([key, entry]) => [key, cloneExplicit(entry)]));
}
export function exactNumber(value, label, { integer = false, min = -Infinity, max = Infinity, nullable = true } = {}) {
  if (isUnset(value)) {
    if (nullable) return null;
    throw new Error(label + " requires a number.");
  }
  if (typeof value !== "number" && (typeof value !== "string"
      || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) {
    throw new Error(label + " must be an exact number.");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (integer && !Number.isSafeInteger(number)) || number < min || number > max) {
    throw new Error(label + " must be " + (integer ? "an integer" : "a finite number") + " in the supported range.");
  }
  return number;
}
export function exactBoolean(value, label, fallback = false) {
  if (isUnset(value)) return fallback;
  if (value === true || value === false) return value;
  if (typeof value === "string" && /^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === "true";
  throw new Error(label + " must be true or false.");
}
export function formulaValue(value, label) {
  if (isUnset(value)) return "";
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(label + " must be finite.");
  if (!["string", "number"].includes(typeof value)) throw new Error(label + " must be a formula or number.");
  const text = String(value);
  if (/[\r\n;]/.test(text)) throw new Error(label + " must be a single formula.");
  return text;
}
export function stringList(value, label) {
  if (isUnset(value)) return [];
  const entries = value instanceof Set ? [...value] : Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : null;
  if (!entries || entries.some(entry => typeof entry !== "string")) throw new Error(label + " must be a list of strings.");
  return [...new Set(entries.map(entry => entry.trim()).filter(Boolean))];
}
export function readPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}
export function writePath(source, path, value) {
  const keys = path.split(".");
  if (keys.some(key => ["__proto__", "constructor", "prototype"].includes(key))) throw new Error("Unsafe field path.");
  let target = source;
  for (const key of keys.slice(0, -1)) target = target[key] ??= {};
  target[keys.at(-1)] = cloneExplicit(value);
}
export function applyExplicitSource(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    if (isMapping(value)) {
      if (!isMapping(target[key])) target[key] = {};
      applyExplicitSource(target[key], value);
    } else target[key] = cloneExplicit(value);
  }
  return target;
}
export function rejectDamageShorthand(section, labels, path) {
  if (!Object.hasOwn(section ?? {}, "DAMAGE_DATA")) return;
  const conflicts = labels.filter(label => !isUnset(section[label]));
  if (conflicts.length) throw new Error(path + ".DAMAGE_DATA cannot be combined with " + conflicts.join(", ") + ".");
}
export function parseDamageData(value, path = "DAMAGE_DATA") {
  if (!isMapping(value)) throw new Error(path + " must be a mapping.");
  const unknown = Object.keys(value).filter(key => !DAMAGE_DATA_KEYS.includes(key));
  if (unknown.length) throw new Error(path + " has unknown fields: " + unknown.join(", ") + ".");
  const types = stringList(value["Damage Types"], path + ".Damage Types");
  const registry = globalThis.CONFIG?.DND5E;
  const knownTypes = new Set(["acid","bludgeoning","cold","fire","force","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder","healing","temphp","maximum",
    ...Object.keys(registry?.damageTypes ?? {}), ...Object.keys(registry?.healingTypes ?? {})]);
  if (types.some(type => !knownTypes.has(type))) throw new Error(path + " contains an unsupported damage type.");
  const mode = isUnset(value["Scaling Mode"]) || value["Scaling Mode"] === "none" ? "" : value["Scaling Mode"];
  if (!["", "whole", "half"].includes(mode)) throw new Error(path + ".Scaling Mode must be none, whole, or half.");
  return {
    number: exactNumber(value["Dice Count"], path + ".Dice Count", {integer:true,min:0}),
    denomination: exactNumber(value["Die Denomination"], path + ".Die Denomination", {integer:true,min:0}),
    bonus: formulaValue(value.Bonus, path + ".Bonus"),
    types,
    custom: {
      enabled: exactBoolean(value["Custom Enabled"], path + ".Custom Enabled"),
      formula: formulaValue(value["Custom Formula"], path + ".Custom Formula")
    },
    scaling: {
      mode,
      number: Object.hasOwn(value, "Scaling Dice Count")
        ? exactNumber(value["Scaling Dice Count"], path + ".Scaling Dice Count", {integer:true,min:0}) : 1,
      formula: formulaValue(value["Scaling Formula"], path + ".Scaling Formula")
    }
  };
}
export function damageDataToYaml(value = {}) {
  const source = value?._source ?? value;
  return {
    "Dice Count": source.number ?? null, "Die Denomination": source.denomination ?? null,
    Bonus: source.bonus ?? "", "Damage Types": stringList(source.types ?? [], "Damage Types"),
    "Custom Enabled": source.custom?.enabled ?? false, "Custom Formula": source.custom?.formula ?? "",
    "Scaling Mode": source.scaling?.mode || "none",
    "Scaling Dice Count": source.scaling?.number ?? null, "Scaling Formula": source.scaling?.formula ?? ""
  };
}
export function explicitRows(value, section = "Explicit fields", prefix = "") {
  if (!isMapping(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const label = prefix ? prefix + " / " + key : key;
    if (isMapping(entry)) return explicitRows(entry, section, label);
    return [{section, label, value: entry === null ? "n/a" : typeof entry === "object" ? JSON.stringify(cloneExplicit(entry)) : String(entry ?? "")}];
  });
}
