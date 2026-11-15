import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTemplates, fill, guideRuleApplies, listPages, referenceHas, renderPage } from "./template-build.mjs";

const FENCE = "\x60\x60\x60";
const plan = (sets, extra = {}) => ({ vars: { rootKey: "ACTIVITY_{{TYPE}}" }, sets, ...extra });
const baseSet = { name: "base", output: "out/{{Type}}.md", layout: "layout.md", lookup: ["types/{{type}}", "shared"], types: ["attack"] };
const midiSet = { ...baseSet, name: "midi", output: "out/MIDI {{Type}}.md", lookup: ["midi/{{type}}", "midi/common", "types/{{type}}", "shared"] };
const io = files => ({ source: file => files[file] ?? null, repo: file => files["repo:" + file] ?? assert.fail("No repository file " + file) });
const render = (files, set = baseSet, extra) => renderPage(listPages(plan([set], extra))[0], io(files));

test("pages.json lists one page per type, and a set without types is one page", () => {
  const pages = listPages(plan([{ ...baseSet, types: ["attack", "effect"] }, { name: "common", flags: ["midi"], output: "out/Common.md", layout: "common.md", lookup: ["shared"] }], { typeVars: { effect: { rootKey: "EFFECT" } } }));
  assert.deepEqual(pages.map(page => page.output), ["out/Attack.md", "out/Effect.md", "out/Common.md"]);
  assert.deepEqual(pages.map(page => fill("{{rootKey}}", page.vars)), ["ACTIVITY_ATTACK", "EFFECT", "ACTIVITY_"]);
  assert.deepEqual(pages[0].lookup, ["types/attack", "shared"]);
  assert.deepEqual([...pages[2].flags], ["common", "midi"]);
});

test("a page is its layout with fragments, variables and conditions filled in", () => {
  const files = {
    "layout.md": "# {{Type}}\n@@# a note for maintainers\n@@include intro.md\n@@if midi\nmidi only\n@@else\nbase only\n@@end\n@@include table.md\n",
    "shared/intro.md": "Root {{rootKey}}.\n",
    "shared/table.md": "shared table\n",
    "types/attack/table.md": "attack table\n\n",
    "midi/common/intro.md": "MIDI root {{rootKey}}.\n"
  };
  const base = render(files);
  assert.equal(base.text, "# Attack\nRoot ACTIVITY_ATTACK.\nbase only\nattack table\n\n");
  assert.deepEqual([...base.used].sort(), ["layout.md", "shared/intro.md", "types/attack/table.md"]);
  // The MIDI page looks in its own folders first; a fragment's final line break is not part of it, a blank line before it is.
  assert.equal(render(files, midiSet).text, "# Attack\nMIDI root ACTIVITY_ATTACK.\nmidi only\nattack table\n\n");
});

test("an embedded repository file is copied as written", () => {
  const files = { "layout.md": FENCE + "yaml\n@@file docs/{{type}}.yaml\n" + FENCE + "\n", "repo:docs/attack.yaml": "Name: \"{{not a variable}}\"\r\n@@not a directive\r\n\r\n" };
  assert.equal(render(files).text, FENCE + "yaml\nName: \"{{not a variable}}\"\n@@not a directive\n" + FENCE + "\n");
});

test("the guide follows the page's own field reference", () => {
  const reference = "ACTIVITY_ATTACK:\n  RANGE:\n    Range Units: ft\n  CONSUMPTION:\n    - Amount: 1\n";
  assert.equal(referenceHas(reference, "RANGE"), true);
  assert.equal(referenceHas(reference, "RANGE.Range Units"), true);
  assert.equal(referenceHas(reference, "RANGE.Amount"), false);
  assert.equal(referenceHas(reference, "CONSUMPTION.Amount"), true);
  assert.equal(referenceHas(reference, "TARGETS"), false);
  const context = { fence: reference, type: "attack", flags: new Set(["midi"]) };
  assert.equal(guideRuleApplies({ needs: ["RANGE", "TARGETS"] }, context), false);
  assert.equal(guideRuleApplies({ types: ["save"] }, context), false);
  assert.equal(guideRuleApplies({ notTypes: ["attack"] }, context), false);
  assert.equal(guideRuleApplies({ sets: ["base"] }, context), false);
  assert.equal(guideRuleApplies({ unless: "never both" }, { ...context, ownChecks: "Never both." }), false);
  assert.equal(guideRuleApplies({ needs: ["RANGE"], types: ["attack"], sets: ["midi"], unless: "never both" }, context), true);

  const files = {
    "layout.md": "@@guide summary\n@@guide not-for\n@@guide rows\n@@guide checks\n" + FENCE + "yaml\n" + reference + FENCE + "\n",
    "types/attack/guide.json": JSON.stringify({ useWhen: " Roll to hit. ", smallest: "Name.", parentItem: "A weapon.", notFor: ["Saves: use ACTIVITY_SAVE."], sourceRows: [{ says: "a | b", write: "x\ny" }], checks: ["Own check."] }),
    "midi/attack/guide.json": JSON.stringify({ useWhen: "With MIDI-QOL.", smallest: "MIDI additions: none.", notFor: [], sourceRows: [], checks: ["Never both."] }),
    "shared/guide.json": JSON.stringify({
      sharedRows: [{ needs: ["RANGE"], says: "range", write: "RANGE" }, { needs: ["TARGETS"], says: "target", write: "TARGETS" }],
      sharedChecks: [{ text: "Shared check." }, { sets: ["midi"], unless: "never both", text: "Use one form, never both." }, { sets: ["midi"], text: "MIDI check." }]
    })
  };
  assert.equal(render(files).text.split(FENCE)[0], [
    "- **Root key:** \x60ACTIVITY_ATTACK\x60", "- **When to use:** Roll to hit.", "- **Smallest working block:** Name.", "- **Parent Item:** A weapon.",
    "- Saves: use ACTIVITY_SAVE.", "| a \\| b | x y |", "| range | RANGE |", "1. Own check.", "2. Shared check.", ""
  ].join("\n"));
  assert.equal(render(files, midiSet).text.split(FENCE)[0], [
    "- **Root key:** \x60ACTIVITY_ATTACK\x60", "- **When to use:** Roll to hit. With MIDI-QOL.", "- **Smallest working block:** Name. MIDI additions: none.", "- **Parent Item:** A weapon.",
    "- Saves: use ACTIVITY_SAVE.", "| a \\| b | x y |", "| range | RANGE |", "1. Own check.", "2. Never both.", "3. Shared check.", "4. MIDI check.", ""
  ].join("\n"));
});

test("a mistake in the source is reported with the page and the line", () => {
  assert.throws(() => render({ "layout.md": "one\n{{missing}}\n" }), /out\/Attack\.md: layout\.md:2: Unknown variable \{\{missing\}\}/);
  assert.throws(() => render({ "layout.md": "@@include part.md\n" }), /layout\.md:1: No source file "part\.md" in types\/attack, shared/);
  assert.throws(() => render({ "layout.md": "@@include part.md\n", "shared/part.md": "@@inclde other.md\n" }), /shared\/part\.md:1: Unknown directive @@inclde/);
  assert.throws(() => render({ "layout.md": "@@if base\ntext\n" }), /@@if without @@end/);
  assert.throws(() => render({ "layout.md": "@@end\n" }), /layout\.md:1: @@end without @@if/);
  assert.throws(() => render({ "layout.md": "@@include a.md\n", "shared/a.md": "@@include a.md\n" }), /in a circle/);
  assert.throws(() => render({ "layout.md": "@@guide rows\n" }), /No guide\.json/);
  assert.throws(() => render({}), /Missing layout layout\.md/);
});

test("the shipped templates match templates/source, with no leftover source file or template", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { pages, unused, strays } = buildTemplates(root);
  assert.ok(pages.length > 0);
  assert.deepEqual(pages.filter(page => page.differs).map(page => page.output + " " + page.difference), [], "Run node tools/Build-Templates.mjs after editing templates/source.");
  assert.deepEqual(unused, []);
  assert.deepEqual(strays, []);
});
