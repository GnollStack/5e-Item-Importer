# Automation storage in schema 4

Reviewed against Foundry 14.369, dnd5e 6.0.6, MIDI-QOL 14.6.0 and DAE 14.6.0.

Use `AUTOMATION` inside an existing Item, Activity or Effect block. This is a typed, reviewed mapping, not a raw-data escape hatch. Unknown keys fail with their exact path. Native fields keep their existing YAML sections. Do not combine canonical automation with legacy MIDI/DAE sections in the same Activity or Effect.

Exports preserve stored source values, including inactive settings, false, zero, null and empty strings, lists and mappings. Omitted fields remain omitted. Updating an Item with an explicitly empty automation flag mapping clears its old keys; merge mode retains existing values. No macro, condition or formula is executed during parsing, exporting, preview or comparison. UUID references remain synchronous stored references; import preflight resolves supported links and rejects missing, ambiguous or recursive links.

MIDI Activity fields require compatible MIDI-QOL to be active at import, because a native-only Activity model would discard them. Authored Item and Effect flags can be stored while their provider is inactive; they have no integration behavior until the provider is available. Native recipes require no automation modules. Item Importer remains standalone; Activity and Effect attachments and their recipes require the compatible premium Activity Importer.

Legacy YAML remains readable. Prefer the schema-4 form for exact values and complete automation export. Legacy aliases retain their documented coercions. Unknown integration fields stop export rather than silently disappear. `flags.midi-qol.onUseMacroParts` is derived preparation state and is excluded; Macro `_stats` is document bookkeeping, normalized to an empty mapping. Other unreviewed runtime metadata is rejected, not copied as reusable automation.

Recipes are editable drafts in the existing template selector. Required external references must be chosen from real documents before insertion. Conditions, area placement, turn expiry, calendar recovery, stacking and automation require the relevant Actor, Item, combat, calendar and workflow context. Field coverage describes storage support, not universal gameplay verification. No new Item roots, advancements, facilities or Order/Teleport authoring are enabled.

## Field reference

Paths are relative to the existing type block. `[*]` means each array element. String fields without listed choices retain authored strings; they do not validate expressions or prove reference availability.

| Kind | Applies to | YAML path | Stored value |
| --- | --- | --- | --- |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.midi-qol.flags.onUseMacroName` | string or null |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.midi-qol.flags.noProvokeReaction` | boolean |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro._id` | string or null |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.name` | string |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.img` | string or null |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.type` | "script", "chat" |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.scope` | "global", "actors", "actor" |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.command` | string |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.author` | string or null |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.folder` | string or null |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro.ownership` | ownership |
| item | weapon, equipment, consumable, tool, loot, container, spell | `AUTOMATION.dae.macro._stats` | metadata |
