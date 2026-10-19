import fs from "node:fs/promises";
import { automationFieldEntries, AUTOMATION_REVIEW } from "../scripts/automationFields.js";
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL("module.json", root), "utf8"));
const item = manifest.id === "5e-item-importer";
const rows = new Map();
const kinds = item ? [["item", ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"]]]
    : [["activity", ["attack", "save", "damage", "heal", "utility", "check", "cast", "enchant", "summon", "transform", "forward"]], ["effect", ["base", "enchantment"]]];
for (const [kind, types] of kinds) for (const type of types) for (const entry of automationFieldEntries(kind, type)) {
    const key = kind + ":" + entry.yamlPath;
    const row = rows.get(key) ?? { ...entry, kind, types: [] };
    row.types.push(type); rows.set(key, row);
}
const lines = ["# Automation storage in schema 4", "",
    `Reviewed against Foundry ${AUTOMATION_REVIEW.foundry}, dnd5e ${AUTOMATION_REVIEW.system}, MIDI-QOL ${AUTOMATION_REVIEW.midi} and DAE ${AUTOMATION_REVIEW.dae}.`, "",
    "Use `AUTOMATION` inside an existing Item, Activity or Effect block. This is a typed, reviewed mapping, not a raw-data escape hatch. Unknown keys fail with their exact path. Native fields keep their existing YAML sections. Do not combine canonical automation with legacy MIDI/DAE sections in the same Activity or Effect.", "",
    "Exports preserve stored source values, including inactive settings, false, zero, null and empty strings, lists and mappings. Omitted fields remain omitted. Updating an Item with an explicitly empty automation flag mapping clears its old keys; merge mode retains existing values. No macro, condition or formula is executed during parsing, exporting, preview or comparison. UUID references remain synchronous stored references; import preflight resolves supported links and rejects missing, ambiguous or recursive links.", "",
    "MIDI Activity fields require compatible MIDI-QOL to be active at import, because a native-only Activity model would discard them. Authored Item and Effect flags can be stored while their provider is inactive; they have no integration behavior until the provider is available. Native recipes require no automation modules. Item Importer remains standalone; Activity and Effect attachments and their recipes require the compatible premium Activity Importer.", "",
    "Legacy YAML remains readable. Prefer the schema-4 form for exact values and complete automation export. Legacy aliases retain their documented coercions. Unknown integration fields stop export rather than silently disappear. `flags.midi-qol.onUseMacroParts` is derived preparation state and is excluded; Macro `_stats` is document bookkeeping, normalized to an empty mapping. Other unreviewed runtime metadata is rejected, not copied as reusable automation.", "",
    "Recipes are editable drafts in the existing template selector. Required external references must be chosen from real documents before insertion. Conditions, area placement, turn expiry, calendar recovery, stacking and automation require the relevant Actor, Item, combat, calendar and workflow context. Field coverage describes storage support, not universal gameplay verification. No new Item roots, advancements, facilities or Order/Teleport authoring are enabled.", "",
    "## Field reference", "", "Paths are relative to the existing type block. `[*]` means each array element. String fields without listed choices retain authored strings; they do not validate expressions or prove reference availability.", "",
    "| Kind | Applies to | YAML path | Stored value |", "| --- | --- | --- | --- |"];
for (const row of rows.values()) {
    const spec = row.spec;
    const type = spec.choices ? spec.choices.map(value => JSON.stringify(value)).join(", ") : spec.kind;
    lines.push(`| ${row.kind} | ${row.types.join(", ")} | \`${row.yamlPath}\` | ${type.replaceAll("|", "\\|")}${spec.nullable ? " or null" : ""}${spec.min !== undefined ? `; ${spec.min} to ${Number.isFinite(spec.max) ? spec.max : "unbounded"}` : ""} |`);
}
await fs.writeFile(new URL("docs/automation-schema-4.md", root), lines.join("\n") + "\n");
