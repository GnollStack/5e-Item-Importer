# Item Importer generation guide

## LLM authoring entry point

Start with [explicit authoring rules](../docs/template-authoring.md), then supply the matching full reference and [concrete example](../docs/examples/README.md). State whether you are creating from a description or preserving stored data. Missing material mechanics and required references need clarification before final YAML. A linked file must actually be supplied/read; links alone do not make a template bundle self-contained.

The first YAML block in each explicit template remains the complete field reference. The later marked example is concrete input with stated prerequisites. Select fields from the source intent for new content; preserve all supported supplied fields when reproducing data.


5e Item Importer is free and works standalone. The forthcoming optional premium 5e Activity Importer adds authored activity/effect import and full Item YAML export when installed. It is not included in this free release. Premium examples below apply only when companion availability is explicitly confirmed or premium output is requested. The same strict Item format supports both workflows.

## Choose a generation mode

| Mode | What the LLM should generate |
|---|---|
| **Free/core (default)** | Core Item fields and complete source rules in descriptions. Omit `Activities` and `effects` entirely. |
| **Premium/full** | The same core Item fields and descriptions, plus supported source-defined activities/effects using the premium companion's matching strict templates. |

Choose premium/full only when explicitly requested or when Activity Importer availability is confirmed. Unknown availability defaults to free/core. An explicit free/core request wins even when both modules are installed. These names are prompt instructions, not YAML keys or a new schema version.

Give an LLM your source text and the relevant [strict Item template](YAML%20Templates/) with one of these prompts:

```text
Generate a free/core Item for the standalone 5e Item Importer using the supplied
strict template. Preserve all source rules in descriptions. Omit Activities
and effects. Return only one YAML code block, without mode fields or commentary.
```

```text
Generate a premium/full Item for 5e Item Importer. I have the premium
5e Activity Importer available and have supplied its matching Activity/Effect
templates. Preserve the full source rules in descriptions and add only supported
source-defined attachments. Return only one YAML code block, without mode fields
or commentary. Do not invent UUIDs, bonuses, or automation requirements.
```

Activity Importer must be active when attachments are imported. If it is absent, the base Item still imports and attachments are skipped with warnings. Core YAML export remains available independently; full export needs the companion serializers for activities/effects.

Free imports retain normal dnd5e Item fields and system behavior. Description enrichers provide clickable text but do not generate source-specific activities. Loot and Container support passive `effects` only and must never include `Activities`. MIDI-QOL and DAE are separate optional integrations; select their fields only when that automation is intended and available.


## Explicit YAML v2 reference

See the [native field coverage and value rules](../docs/explicit-yaml-v2.md). The first YAML block in each of the seven full reference templates shows its supported Item controls. Optional recovery entries have an adjacent commented list schema. The later attachment examples illustrate nesting and canonical syntax; use the companion's full reference when authoring an activity or effect. Quick-start examples remain compact.

Preserve value types: booleans, finite numbers, nullable values, empty strings and collections are distinct. Keep quoted formulas intact. `USAGE.Uses Max` supports a nonnegative integer or a deterministic formula such as `"1 + @prof"`, with the restrictions stated in each usable Item template. It does not accept dice or a bare fractional maximum. Tool Bonus may contain dice; Magic Bonus is deterministic. A hidden native control can retain supplied data without enabling its checkbox.

New damage uses the nine-field `DAMAGE_DATA` mapping. Existing formula shorthand remains valid input when explicit data is absent. Consumable magic bonuses belong in `ATTUNEMENT.Magic Bonus`; the old ammunition spelling is compatibility input. Native consumable subtype and its required ammo/poison parser alias must agree. Effects use `DURATION.Value`/`Units`, string `Change Type`, status lists, and typed `Value` entries.

These templates do not promise every native value or type is importable: Container quantity remains fixed at 1 and is omitted from export, Loot has no equipped state, Tool proficiency 1.5 is not accepted by the existing parser, and additional Item types and relationships remain deferred. The [native field catalog](../docs/native-field-catalog.md) separates native schema, sheet options, and declared YAML mappings; its unreviewed fields need further investigation.
