/** Source-only structural checks for the first full YAML fence in reference templates. */
const ITEM_TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"];
const ACTIVITY_TYPES = ["attack", "save", "damage", "heal", "utility", "check", "cast", "enchant", "summon", "transform", "forward"];
const START_FIELDS = ["Effect Start Time", "Effect Start (combat) Rounds", "Effect Start (combat) Turns", "Combat Encounter", "Combatant", "Initiative"];
const EMPTY_TEXT = new Set(["", "n/a"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

/** Public coverage audits enumerate missing native references; decorators merge each reference's canonical mappings. */
export function declaredTemplateRequirements(coverageApi, itemModule) {
  const sentinels = itemModule ? ITEM_TYPES.map(type => ({ kind: "item", type, path: "__template_coverage_sentinel__" }))
    : [...ACTIVITY_TYPES.map(type => ({ kind: "activity", type, path: "__template_coverage_sentinel__" })),
      { kind: "effect", type: "base", path: "__template_coverage_sentinel__" },
      { kind: "effect", type: "enchantment", path: "__template_coverage_sentinel__" }];
  const missing = coverageApi.auditCoverageReferences(sentinels).missing;
  const fields = coverageApi.decorateCatalogFields(missing.map((entry, index) => ({ ...entry, id: "template-" + index })),
    { systemVersion: "5.3.3", foundryVersion: "14.367" });
  return fields.filter(field => field.coverage?.stages?.template === "declared").flatMap(field =>
    field.coverage.yamlLocations.map(path => ({
      kind: field.kind, type: field.type, nativePath: field.path, path,
      aliases: field.coverage.aliases ?? [], representations: field.coverage.acceptedRepresentations ?? [],
      stages: field.coverage.stages
    })));
}

export function yamlFences(markdown) {
  const pattern = /^\x60\x60\x60ya?ml[ \t]*\r?\n([\s\S]*?)^\x60\x60\x60[ \t]*$/gm;
  return Array.from(markdown.matchAll(pattern), match => match[1]);
}
export function structuralPaths(value, prefix = "", output = new Map()) {
  if (prefix) {
    if (!output.has(prefix)) output.set(prefix, []);
    output.get(prefix).push(value);
  }
  if (Array.isArray(value)) {
    if (!output.has(prefix + "[]")) output.set(prefix + "[]", []);
    for (const entry of value) structuralPaths(entry, prefix + "[]", output);
  } else if (object(value)) {
    for (const [key, entry] of Object.entries(value)) structuralPaths(entry, prefix ? prefix + "." + key : key, output);
  }
  return output;
}

/** A narrowly recognized adjacent commented RECOVERY list is a parsed alternate shape, not prose coverage. */
function commentedRecovery(block, root, yaml) {
  const lines = block.split(/\r?\n/), paths = new Map();
  const index = lines.findIndex(line => /^  RECOVERY:\s*\[\]\s*(?:#.*)?$/.test(line));
  if (index < 0) return paths;
  let start = index - 1;
  while (start >= 0 && (/^\s*#/.test(lines[start]) || /^\s*$/.test(lines[start]))) start--;
  const comments = lines.slice(start + 1, index).map(line => line.replace(/^\s*# ?/, ""));
  const first = comments.findIndex(line => /^\s+- Period:/.test(line));
  if (first < 0) return paths;
  const data = comments.slice(first).filter(line => /^\s*(?:-\s+)?(?:Period|Type|Formula):/.test(line));
  if (data.length !== 3) return paths;
  try {
    const parsed = yaml.load("RECOVERY:\n" + data.join("\n"));
    if (Array.isArray(parsed.RECOVERY) && parsed.RECOVERY.length === 1) structuralPaths(parsed, root, paths);
  } catch { /* Malformed documented alternatives cannot satisfy coverage. */ }
  return paths;
}
function populated(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return !EMPTY_TEXT.has(value.trim().toLowerCase());
  return !Array.isArray(value) || value.length > 0;
}
function inspectAmbiguities(value, path, issues) {
  if (Array.isArray(value)) { value.forEach((entry, index) => inspectAmbiguities(entry, path + "[" + index + "]", issues)); return; }
  if (!object(value)) return;
  const pairs = [
    ["Override Activation", "Activation"], ["Override Duration", "Duration"], ["Override Range", "Range"],
    ["Scaling Mode", "Scale Consumption"], ["Change Type", "Change Mode"],
    ["CUSTOM OPTIONS", "CUSTOM_OPTIONS"], ["Associated Skills", "Associated Skill"], ["Associated Tools", "Associated Tool"]
  ];
  for (const [canonical, alias] of pairs) if (own(value, canonical) && own(value, alias) && populated(value[canonical]) && populated(value[alias])) {
    issues.push({ code: "ambiguous-alias", path, canonical, alias });
  }
  if (own(value, "DAMAGE_DATA") && populated(value.DAMAGE_DATA)) {
    for (const alias of ["Damage Formula", "Damage Type", "Versatile Formula", "Versatile Damage Type", "Formula", "Type", "Custom Damage Formula"]) {
      if (own(value, alias) && populated(value[alias])) issues.push({ code: "ambiguous-damage-shorthand", path, alias });
    }
  }
  if (own(value, "Value") && own(value, "Units")) {
    for (const alias of ["Effect Duration (Seconds)", "Effect Duration (combat) Rounds", "Effect Duration (combat) Turns"]) {
      if (own(value, alias) && populated(value[alias])) issues.push({ code: "ambiguous-duration", path, alias });
    }
  }
  if (own(value, "Start") && value.Start === null && START_FIELDS.some(key => own(value, key) && populated(value[key]))) {
    issues.push({ code: "ambiguous-effect-start", path });
  }
  if (object(value.BEHAVIOR) && object(value.CASTING_DETAILS)
      && own(value.BEHAVIOR, "Consume Spell Slot") && own(value.CASTING_DETAILS, "Consume Spell Slot")
      && populated(value.BEHAVIOR["Consume Spell Slot"]) && populated(value.CASTING_DETAILS["Consume Spell Slot"])) {
    issues.push({ code: "ambiguous-spell-slot-alias", path });
  }
  for (const [key, entry] of Object.entries(value)) inspectAmbiguities(entry, path ? path + "." + key : key, issues);
}

function inspectCompactAttachments(value, path, issues) {
  if (Array.isArray(value)) { value.forEach((entry, index) => inspectCompactAttachments(entry, path + "[" + index + "]", issues)); return; }
  if (!object(value)) return;
  if (object(value.DETAILS) && Array.isArray(value.CHANGES)) {
    if (!object(value.DURATION) || !own(value.DURATION, "Value") || !own(value.DURATION, "Units")) {
      issues.push({ code: "legacy-item-effect-duration-example", path });
    }
    if (own(value.DETAILS, "Status Conditions") && !Array.isArray(value.DETAILS["Status Conditions"])) {
      issues.push({ code: "status-list-required", path: path + ".DETAILS.Status Conditions" });
    }
    for (const [index, change] of value.CHANGES.entries()) {
      if (!object(change) || !own(change, "Change Type")) issues.push({ code: "legacy-item-effect-change-example", path: path + ".CHANGES[" + index + "]" });
      if (typeof change?.Value === "string" && /^\[[^\]]+\]$/.test(change.Value)) {
        issues.push({ code: "typed-effect-value-placeholder", path: path + ".CHANGES[" + index + "].Value" });
      }
    }
  }
  if (Array.isArray(value.DAMAGE_PARTS)) for (const [index, part] of value.DAMAGE_PARTS.entries()) {
    if (!object(part?.DAMAGE_DATA)) issues.push({ code: "legacy-item-damage-example", path: path + ".DAMAGE_PARTS[" + index + "]" });
  }
  for (const [key, entry] of Object.entries(value)) inspectCompactAttachments(entry, path ? path + "." + key : key, issues);
}

export function checkTemplate({ markdown, requirements, yaml, itemModule, type }) {
  const issues = [], exceptions = [], blocks = yamlFences(markdown);
  if (!blocks.length) return { success: false, issues: [{ code: "missing-main-yaml" }], exceptions };
  let main;
  try { main = yaml.load(blocks[0]); }
  catch (error) { return { success: false, issues: [{ code: "invalid-main-yaml", message: error.message }], exceptions }; }
  const root = itemModule ? type.toUpperCase() : type === "effect" ? "EFFECT" : "ACTIVITY_" + type.toUpperCase();
  if (!object(main) || !object(main[root])) return { success: false, issues: [{ code: "wrong-main-root", root }], exceptions };
  if (itemModule && main.SCHEMA_VERSION !== 2) issues.push({ code: "wrong-item-schema-version", expected: 2 });
  const paths = structuralPaths(main), alternatives = itemModule ? commentedRecovery(blocks[0], root, yaml) : new Map();
  const mainRequirements = requirements.filter(entry => itemModule ? entry.kind === "item" && entry.type === type
    : type === "effect" ? entry.kind === "effect" : entry.kind === "activity" && entry.type === type);
  if (!itemModule && type !== "effect" && !["cast", "forward", "transform"].includes(type)) {
    mainRequirements.push(...requirements.filter(entry => entry.kind === "effect").map(entry => ({
      ...entry, path: root + ".APPLIED_EFFECTS[]." + entry.path.slice("EFFECT.".length), inline: true
    })));
  }
  const deduped = [...new Map(mainRequirements.map(entry => [entry.path, entry])).values()];
  for (const requirement of deduped) {
    const path = requirement.path;
    if (itemModule && type === "container" && requirement.nativePath === "system.quantity"
        && requirement.stages.build === "unsupported") {
      exceptions.push({ path, reason: "Container quantity is fixed to one; native free quantity editing is not an importer control." });
      continue;
    }
    if (!paths.has(path)) {
      if (alternatives.has(path)) {
        exceptions.push({ path, reason: "Optional empty RECOVERY uses the adjacent parsed commented list schema." }); continue;
      }
      if (path.endsWith(".DURATION.Start")) {
        const prefix = path.slice(0, -"Start".length);
        if (START_FIELDS.every(key => paths.has(prefix + key))) {
          exceptions.push({ path, reason: "Complete named start fields document the object alternative; Start: null is mutually exclusive." }); continue;
        }
      }
      const match = path.match(/^(.*\.DURATION\.)([^.]+)$/);
      if (match && START_FIELDS.includes(match[2]) && paths.get(match[1] + "Start")?.some(value => value === null)) {
        exceptions.push({ path, reason: "Explicit Start: null represents an absent start object instead of populated child fields." }); continue;
      }
      issues.push({ code: "missing-canonical-field", path, nativePath: requirement.nativePath }); continue;
    }
    if (requirement.representations.some(text => /formula string/i.test(text))) {
      for (const value of paths.get(path)) if (typeof value === "string" && /^\[[^\]]+\]$/.test(value)
          && !/\b(text|string|formula)\b/i.test(value)) {
        issues.push({ code: "formula-guidance-truncated", path, value });
      }
    }
  }
  for (const [path, values] of paths) {
    if (/\.CHANGES\[\]\.Value$/.test(path) && values.some(value => typeof value === "string" && /^\[[^\]]+\]$/.test(value))) {
      issues.push({ code: "typed-effect-value-placeholder", path, reason: "Use a real typed example, such as 0, false, null, a list or mapping." });
    }
    if (/\.DETAILS\.Status Conditions$/.test(path) && values.some(value => !Array.isArray(value))) {
      issues.push({ code: "status-list-required", path });
    }
  }
  inspectAmbiguities(main, "", issues);
  if (itemModule) for (const [index, block] of blocks.slice(1).entries()) {
    try {
      const example = yaml.load(block);
      inspectAmbiguities(example, "example" + (index + 1), issues);
      inspectCompactAttachments(example, "example" + (index + 1), issues);
    } catch (error) {
      issues.push({ code: "invalid-item-example-yaml", block: index + 1, message: error.message });
    }
  }
  return { success: issues.length === 0, root, checked: deduped.length, issues, exceptions };
}
