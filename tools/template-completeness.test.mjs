import test from "node:test";
import assert from "node:assert/strict";
import yaml from "../scripts/vendor/js-yaml.mjs";
import { checkTemplate, declaredTemplateRequirements } from "./template-completeness.mjs";
const fence = text => String.fromCharCode(96).repeat(3) + "yaml\n" + text + "\n" + String.fromCharCode(96).repeat(3) + "\n";
const requirement = (path, options = {}) => ({
  kind: "item", type: "weapon", nativePath: "system.example", path,
  representations: [], aliases: [], stages: { template: "declared" }, ...options
});
const item = (body, requirements, extra = "") => checkTemplate({
  markdown: fence("SCHEMA_VERSION: 2\nWEAPON:\n" + body) + extra, requirements, yaml, itemModule: true, type: "weapon"
});
const activity = (body, requirements, type = "attack") => checkTemplate({
  markdown: fence("ACTIVITY_" + type.toUpperCase() + ":\n" + body), requirements, yaml, itemModule: false, type
});

test("declared requirements use coverage audit and merged decorators without importing a companion", () => {
  let sentinelCalls = 0;
  const api = {
    auditCoverageReferences(fields) {
      sentinelCalls++;
      assert.equal(fields.length, 7);
      return { missing: [{ kind: "item", type: "weapon", path: "system.damage" }] };
    },
    decorateCatalogFields(fields, environment) {
      assert.equal(environment.systemVersion, "5.3.3");
      assert.equal(environment.foundryVersion, "14.367");
      return [{ ...fields[0], coverage: { stages: { template: "declared" },
        yamlLocations: ["WEAPON.DAMAGE.DAMAGE_DATA.Dice Count", "WEAPON.DAMAGE.DAMAGE_DATA.Bonus"],
        acceptedRepresentations: ["formula string"], aliases: ["WEAPON.DAMAGE.Damage Formula"] } },
      { kind: "item", type: "weapon", coverage: { stages: { template: "excluded" }, yamlLocations: ["WEAPON.INTERNAL"] } }];
    }
  };
  const requirements = declaredTemplateRequirements(api, true);
  assert.equal(sentinelCalls, 1);
  assert.equal(requirements.length, 2);
  assert.equal(requirements[1].path, "WEAPON.DAMAGE.DAMAGE_DATA.Bonus");
  assert.equal(requirements.some(entry => entry.path === "WEAPON.INTERNAL"), false);
});

test("removing a real field fails even when its YAML name still appears in prose or comments", () => {
  const requirements = [requirement("WEAPON.USAGE.Uses Max", { representations: ["formula string"] })];
  assert.equal(item('  USAGE:\n    Uses Max: "[formula|number|n/a]"', requirements).success, true);
  const missing = item("  USAGE: {}\n  # Uses Max is important", requirements, "WEAPON.USAGE.Uses Max is documented here.");
  assert.equal(missing.success, false);
  assert.ok(missing.issues.some(issue => issue.code === "missing-canonical-field"));
});

test("a synthetic new mapping produces a completeness failure without editing fixed expectations", () => {
  const requirements = [requirement("WEAPON.ITEM.Name")];
  assert.equal(item("  ITEM:\n    Name: Example", requirements).success, true);
  requirements.push(requirement("WEAPON.ITEM.Future Native Field"));
  assert.equal(item("  ITEM:\n    Name: Example", requirements).success, false);
});

test("canonical fields must exist; aliases are compatibility inputs rather than full-reference coverage", () => {
  const requirements = [requirement("WEAPON.DAMAGE.DAMAGE_DATA", { aliases: ["WEAPON.DAMAGE.Damage Formula"] })];
  const result = item('  DAMAGE:\n    Damage Formula: "1d6"', requirements);
  assert.ok(result.issues.some(issue => issue.code === "missing-canonical-field"));
});

test("repeatable fields and inline effect leaves are verified structurally", () => {
  const requirements = [
    requirement("ACTIVITY_ATTACK.CONSUMPTION[].Amount", { kind: "activity", type: "attack", representations: ["formula string"] }),
    requirement("EFFECT.DETAILS.Icon", { kind: "effect", type: "base" }),
    requirement("EFFECT.CHANGES[].Value", { kind: "effect", type: "base" })
  ];
  const complete = '  CONSUMPTION:\n    - Amount: "[formula|number]"\n  APPLIED_EFFECTS:\n    - DETAILS:\n        Icon: n/a\n      CHANGES:\n        - Value: false';
  assert.equal(activity(complete, requirements).success, true);
  const missing = activity(complete.replace("        - Value: false", "        - Other: false"), requirements);
  assert.ok(missing.issues.some(issue => issue.path === "ACTIVITY_ATTACK.APPLIED_EFFECTS[].CHANGES[].Value"));
  assert.equal(activity("  CONSUMPTION: []\n  APPLIED_EFFECTS: []", requirements).success, false);
});

test("nullable effect start and complete named fields are explicit mutually exclusive alternatives", () => {
  const startFields = ["Effect Start Time", "Effect Start (combat) Rounds", "Effect Start (combat) Turns", "Combat Encounter", "Combatant", "Initiative"];
  const requirements = ["Start", ...startFields].map(name => requirement("EFFECT.DURATION." + name, { kind: "effect", type: "base" }));
  const run = body => checkTemplate({ markdown: fence("EFFECT:\n  DURATION:\n" + body), requirements, yaml, itemModule: false, type: "effect" });
  assert.equal(run("    Start: null").success, true);
  const named = startFields.map(name => "    " + name + ": n/a").join("\n");
  const namedResult = run(named);
  assert.equal(namedResult.success, true);
  assert.equal(namedResult.exceptions.length, 1);
  assert.equal(run("    Start: null\n    Effect Start Time: 0").success, false);
  assert.equal(run(named.replace("    Combatant: n/a", "")).success, false);
});

test("commented recovery schema is narrowly parsed and cannot be replaced with vague prose", () => {
  const requirements = ["Period", "Type", "Formula"].map(label => requirement("WEAPON.RECOVERY[]." + label));
  const body = '  # Recovery list entries:\n  #   - Period: "[lr|sr]"\n  #     Type: "[recoverAll|formula]"\n  #     Formula: "[text|n/a]"\n  RECOVERY: []';
  const valid = item(body, requirements);
  assert.equal(valid.success, true);
  assert.equal(valid.exceptions.length, 3);
  assert.equal(item(body.replace('  #     Formula: "[text|n/a]"', "  # Formula is optional"), requirements).success, false);
});

test("populated canonical and legacy override, scaling and damage keys are ambiguous, including false and zero", () => {
  for (const pair of [
    "    Override Range: false\n    Range: true",
    "    Override Activation: false\n    Activation: true",
    "    Override Duration: true\n    Duration: false",
    "    Scaling Mode: none\n    Scale Consumption: false",
    "    Change Type: add\n    Change Mode: 0"
  ]) {
    assert.equal(activity("  SECTION:\n" + pair, []).success, false, pair);
  }
  assert.equal(item('  DAMAGE:\n    DAMAGE_DATA:\n      Dice Count: 0\n    Damage Formula: "1d6"', []).success, false);
  assert.equal(activity("  RANGE:\n    Override Range: false\n    Range: n/a", []).success, true);
});

test("duplicate YAML keys fail and incompatible spell-slot aliases are identified", () => {
  assert.equal(activity("  ACTIVITY:\n    Name: One\n    Name: Two", []).success, false);
  const result = activity("  BEHAVIOR:\n    Consume Spell Slot: false\n  CASTING_DETAILS:\n    Consume Spell Slot: true", [], "cast");
  assert.ok(result.issues.some(issue => issue.code === "ambiguous-spell-slot-alias"));
});

test("formula-backed guidance cannot regress to numeric-only placeholder instructions", () => {
  const requirements = [requirement("WEAPON.USAGE.Uses Max", { representations: ["formula string"] })];
  assert.equal(item('  USAGE:\n    Uses Max: "[integer|n/a]"', requirements).success, false);
  assert.equal(item('  USAGE:\n    Uses Max: "[text|integer|n/a]"', requirements).success, true);
  assert.equal(item("  USAGE:\n    Uses Max: 0", requirements).success, true);
});

test("effect values preserve typed examples and status conditions remain lists", () => {
  for (const value of ["0", "false", "null", "[]", "{}"]) {
    assert.equal(activity("  APPLIED_EFFECTS:\n    - DETAILS:\n        Status Conditions: []\n      CHANGES:\n        - Value: " + value, []).success, true);
  }
  assert.equal(activity('  APPLIED_EFFECTS:\n    - CHANGES:\n        - Value: "[text|n/a]"', []).success, false);
  assert.equal(activity("  APPLIED_EFFECTS:\n    - DETAILS:\n        Status Conditions: blinded", []).success, false);
});


test("compact Item attachments require canonical damage and effect forms without companion field discovery", () => {
  const canonical = "WEAPON:\n  effects:\n    - DETAILS:\n        Name: Example\n        Status Conditions: []\n      DURATION:\n        Value: null\n        Units: seconds\n      CHANGES:\n        - Change Type: add\n          Value: 1\n  Activities:\n    - ACTIVITY_DAMAGE:\n        DAMAGE:\n          DAMAGE_PARTS:\n            - DAMAGE_DATA:\n                Dice Count: 1";
  assert.equal(item("  ITEM:\n    Name: Example", [], fence(canonical)).success, true);
  const oldEffect = canonical.replace("Change Type: add", "Change Mode: 2");
  assert.equal(item("  ITEM:\n    Name: Example", [], fence(oldEffect)).success, false);
  const oldDamage = canonical.replace("DAMAGE_DATA:\n                Dice Count: 1", 'Damage Formula: "1d6"');
  assert.equal(item("  ITEM:\n    Name: Example", [], fence(oldDamage)).success, false);
  assert.equal(item("  ITEM:\n    Name: Example", [], fence(canonical.replace("Value: 1", 'Value: "[text]"'))).success, false);
});


test("future enchantment-specific mappings participate in full Effect completeness", () => {
  const api = {
    auditCoverageReferences(fields) {
      assert.ok(fields.some(field => field.kind === "effect" && field.type === "base"));
      assert.ok(fields.some(field => field.kind === "effect" && field.type === "enchantment"));
      return { missing: [{ kind: "effect", type: "enchantment", path: "system.future" }] };
    },
    decorateCatalogFields(fields) {
      return fields.map(field => ({ ...field, coverage: { stages: { template: "declared" },
        yamlLocations: ["EFFECT.DETAILS.Future Enchantment Field"] } }));
    }
  };
  const requirements = declaredTemplateRequirements(api, false);
  const result = checkTemplate({ markdown: fence("EFFECT:\n  DETAILS:\n    Name: Example"), requirements, yaml, itemModule: false, type: "effect" });
  assert.equal(result.success, false);
  assert.equal(result.issues[0].path, "EFFECT.DETAILS.Future Enchantment Field");
});
