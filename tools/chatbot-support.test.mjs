// Tests for scripts/ui/chatbotSupport.js. Shared file: identical in both importers (parity list).
import test from "node:test";
import assert from "node:assert/strict";
import {
    LLM_PACK_URL, LLM_PACK_VERSION, compareVersions, hasProblems, midiQolState, midiSkippedNotice,
    parseResultProblems, problemsForChat, setupLine, skippedMidiSettings, uniqueProblems
} from "../scripts/ui/chatbotSupport.js";

const fakeGame = ({ midi = null, system = "6.1.0", item = true, activity = true } = {}) => {
    const modules = new Map();
    if (item) modules.set("5e-item-importer", { active: true, version: "14.4.0" });
    if (activity) modules.set("5e-activity-importer", { active: true, version: "14.4.0" });
    if (midi) modules.set("midi-qol", midi);
    return { modules, system: { id: "dnd5e", version: system } };
};
const midiModule = (active, maximum = "6.0.999") => ({
    active, version: "14.6.11",
    relationships: { systems: new Set([{ id: "dnd5e", type: "system", compatibility: { minimum: "6.0.6", verified: "6.0.6", maximum } }]) }
});

test("the pack link names the pack version", () => {
    assert.match(LLM_PACK_VERSION, /^\d+\.\d+\.\d+$/);
    assert.ok(LLM_PACK_URL.endsWith("/importer-llm-pack/" + LLM_PACK_VERSION));
});

test("compareVersions orders dotted versions", () => {
    assert.equal(compareVersions("6.1.0", "6.0.999"), 1);
    assert.equal(compareVersions("6.0.6", "6.0.6"), 0);
    assert.equal(compareVersions("6.0.6", "6.1"), -1);
    assert.equal(compareVersions("14.370", "14.369"), 1);
});

test("midiQolState tells missing, active, inactive and unsupported apart", () => {
    assert.equal(midiQolState(fakeGame()).state, "missing");
    assert.equal(midiQolState(fakeGame({ midi: midiModule(true) })).state, "active");
    assert.equal(midiQolState(fakeGame({ midi: midiModule(false), system: "6.0.6" })).state, "inactive");
    const unsupported = midiQolState(fakeGame({ midi: midiModule(false), system: "6.1.0" }));
    assert.equal(unsupported.state, "unsupported");
    assert.equal(unsupported.maximum, "6.0.999");
    // MIDI-QOL 14.7.0 requires dnd5e 6.1: its minimum excludes 6.0 worlds.
    const midi1470 = { active: false, version: "14.7.0",
        relationships: { systems: new Set([{ id: "dnd5e", type: "system", compatibility: { minimum: "6.1.0", verified: "6.1.0", maximum: "6.1.999" } }]) } };
    const tooOld = midiQolState(fakeGame({ midi: midi1470, system: "6.0.6" }));
    assert.equal(tooOld.state, "unsupported");
    assert.equal(tooOld.minimum, "6.1.0");
    assert.equal(midiQolState(fakeGame({ midi: midi1470, system: "6.1.0" })).state, "inactive");
    assert.match(midiSkippedNotice([{ name: "Strike", fields: ["otherActivityId"] }], { state: "unsupported", version: "14.7.0", systemVersion: "6.0.6" }).summary,
        /^MIDI-QOL 14\.7\.0 does not run on dnd5e 6\.0\.6/);
    assert.equal(midiQolState(fakeGame({ midi: { active: false, version: "1.0.0" } })).state, "inactive", "no system requirement: it can run");
    assert.equal(midiQolState(undefined).state, "missing");
});

test("the MIDI-QOL notice lists what is left out and never asks to enable what cannot run", () => {
    const entries = skippedMidiSettings([
        { activityType: "save", activityData: { name: "Poison" }, skippedMidiFields: ["midiProperties.triggeredActivityId", "otherActivityId"] },
        { activityType: "attack", activityData: { name: "Strike" } },
        { activityType: "utility", skippedMidiFields: ["regionBehavior.enabled"] }
    ]);
    assert.deepEqual(entries, [
        { name: "Poison", fields: ["midiProperties.triggeredActivityId", "otherActivityId"] },
        { name: "utility", fields: ["regionBehavior.enabled"] }
    ]);
    assert.equal(midiSkippedNotice([], { state: "missing" }), null);
    const inactive = midiSkippedNotice(entries, { state: "inactive", version: "14.6.11", systemVersion: "6.0.6" });
    assert.match(inactive.summary, /^MIDI-QOL is not active in this world, so 3 MIDI-QOL settings will be left out: Poison \(midiProperties\.triggeredActivityId, otherActivityId\); utility \(regionBehavior\.enabled\)\./);
    assert.match(inactive.hint, /fullest automation: enable it and import the YAML again/);
    const unsupported = midiSkippedNotice(entries, { state: "unsupported", version: "14.6.11", systemVersion: "6.1.0" });
    assert.match(unsupported.summary, /^MIDI-QOL 14\.6\.11 does not run on dnd5e 6\.1\.0/);
    assert.doesNotMatch(unsupported.hint, /enable/i);
    const missing = midiSkippedNotice(entries.slice(0, 1).map(entry => ({ ...entry, fields: entry.fields.slice(0, 1) })), { state: "missing" });
    assert.match(missing.summary, /^MIDI-QOL is not installed, so 1 MIDI-QOL setting will be left out/);
    assert.doesNotMatch(missing.hint, /enable/i);
});

test("parse result problems name blocks in a batch and report embedded effects", () => {
    const single = parseResultProblems([{ activityData: { name: "A" }, errors: ["Broken"], warnings: [{ message: "Odd" }] }]);
    assert.deepEqual(single, [{ level: "error", text: "Broken" }, { level: "warning", text: "Odd" }]);
    const batch = parseResultProblems([
        { activityData: { name: "Strike" }, warnings: ["W1"], embeddedEffectResults: [{ effectData: { name: "Burn" }, warnings: ["W2"] }] },
        { effectData: { name: "Aura" }, errors: ["E1"] },
        { errors: ["E2"] }
    ], "Sword: ");
    assert.deepEqual(batch.map(problem => problem.text), ["Sword: Strike: W1", "Sword: Strike: Burn: W2", "Sword: Aura: E1", "Sword: Block 3: E2"]);
    assert.deepEqual(parseResultProblems(null), []);
});

test("problems are de-duplicated and notes alone are not problems", () => {
    const list = uniqueProblems([{ level: "warning", text: "Same  thing" }, { level: "warning", text: "same thing" }, { level: "error", text: "Same thing" }]);
    assert.equal(list.length, 2);
    assert.equal(hasProblems([{ level: "note", text: "MIDI" }]), false);
    assert.equal(hasProblems([{ level: "warning", text: "x" }]), true);
});

test("the copied text follows the pack's paste-back form", () => {
    const game = fakeGame({ midi: midiModule(false), system: "6.1.0", activity: false });
    assert.equal(setupLine(game), "Importer LLM Pack " + LLM_PACK_VERSION + "; 5e Item Importer 14.4.0; 5e Activity Importer not active; dnd5e 6.1.0; MIDI-QOL 14.6.11 cannot run on this dnd5e version");
    const text = problemsForChat({
        windowTitle: "5e Item Importer",
        problems: [{ level: "warning", text: "W" }, { level: "error", text: "E" }, { level: "note", text: "N" }, { level: "warning", text: "W" }],
        yaml: "\nWEAPON:\n  ITEM:\n    Name: X\n\n",
        game
    });
    assert.equal(text, [
        "The 5e Item Importer import window reported these problems with the YAML below. Fix exactly what they name and answer with the whole corrected YAML.",
        "",
        "Setup: " + setupLine(game),
        "",
        "Errors:",
        "- E",
        "",
        "Warnings:",
        "- W",
        "",
        "Notes:",
        "- N",
        "",
        "The YAML:",
        "```yaml",
        "WEAPON:\n  ITEM:\n    Name: X",
        "```"
    ].join("\n"));
});
