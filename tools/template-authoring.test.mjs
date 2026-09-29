import test from "node:test";
import assert from "node:assert/strict";
import { concreteExample, checkMidiTemplateCoverage, inspectConcreteDocuments } from "./template-authoring.mjs";
const fence = text => "\x60\x60\x60yaml\n" + text + "\n\x60\x60\x60";
test("marked examples are separate from the first reference and preserve document batches", () => {
  const example = "ACTIVITY_FORWARD: {}\n---\nACTIVITY_UTILITY: {}";
  assert.equal(concreteExample(fence("ACTIVITY_FORWARD: placeholder") + "\n<!-- AUTHORING-EXAMPLE:START -->\n" + fence(example) + "\n<!-- AUTHORING-EXAMPLE:END -->"), example);
  assert.throws(() => concreteExample(fence(example)), /marked/);
});
test("MIDI completeness detects omitted mappings and enum drift against coverage declarations", () => {
  const row = { kind: "activity", type: "attack", path: "ACTIVITY_ATTACK.MIDI CONDITIONS.Target Confirmation", nativePath: "midiProperties.confirmTargets", acceptedValues: ["default", "always", "never"] };
  const check = body => checkMidiTemplateCoverage({ markdown: fence("fixture"), type: "attack", requirements: [row], yaml: { load: () => ({ ACTIVITY_ATTACK: body }) } });
  assert.equal(check({}).at(0).code, "missing-midi-mapping");
  assert.equal(check({ "MIDI CONDITIONS": { "Target Confirmation": "[default|always]" } }).at(0).choice, "never");
  assert.deepEqual(check({ "MIDI CONDITIONS": { "Target Confirmation": "[default|always|never]" } }), []);
});
test("effect mapping ownership and type applicability remain separate", () => {
  const row = { kind: "effect", type: "base", path: "EFFECT.Midi-QOL.Effect disabled if actor incapacitated" };
  const args = { markdown: fence("fixture"), requirements: [row], yaml: { load: () => ({ ACTIVITY_CAST: {} }) } };
  assert.deepEqual(checkMidiTemplateCoverage({ ...args, type: "cast" }), []);
  assert.equal(checkMidiTemplateCoverage({ ...args, type: "effect" }).at(0).code, "missing-midi-mapping");
});
test("concrete YAML rejects placeholders, numeric mode aliases and conflicting damage", () => {
  assert.deepEqual(inspectConcreteDocuments([{ text: "[[lookup @name]]", value: false, list: ["fire"], formula: "@mod" }]), []);
  const issues = inspectConcreteDocuments([{ Name: "[text]", CHANGES: [{ "Change Mode": 2 }], DAMAGE_DATA: {}, "Damage Formula": "1d6" }]);
  assert.deepEqual(new Set(issues.map(row => row.code)), new Set(["unfilled-placeholder", "noncanonical-change-mode", "ambiguous-damage"]));
});
