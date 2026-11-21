# Item Importer generation guide

## LLM authoring entry point

For a chatbot project, use the [Importer LLM Pack](https://github.com/GnollStack/bakshis-bazaar-archives/tree/main/importer-llm-pack/14.5.0) of this version. It assembles the field references, source-to-YAML rows and checks of these templates into a few files a chatbot can read, with worked examples and setup steps for Claude Projects, ChatGPT Projects and other chatbots. The files below are the same content for agents that read the module's own files.

Start with [explicit authoring rules](../docs/template-authoring.md), then supply the matching full reference and [concrete example](../docs/examples/README.md). State whether you are creating from a description or preserving stored data. Missing material mechanics and required references need clarification before final YAML. A linked file must actually be supplied/read; links alone do not make a template bundle self-contained.

The first YAML block in each explicit template remains the native field reference; reviewed canonical automation fields are in the [schema 4 automation reference](../docs/automation-schema-4.md). The later marked example is concrete input with stated prerequisites. Select fields from the source intent for new content; preserve all supported supplied fields when reproducing data.


5e Item Importer is free and works standalone. The optional premium 5e Activity Importer, available to Bazaar Patrons, adds authored activity/effect import and full Item YAML export when installed; it is a separate module. Premium examples below apply only when companion availability is explicitly confirmed or premium output is requested. The same strict Item format supports both workflows.

## Pick the template

| The source is | Root key | Template |
| --- | --- | --- |
| Something a creature attacks with: a sword, a bow, a natural weapon, a siege weapon | `WEAPON` | [Strict Weapon](YAML%20Templates/Strict%20Weapon%20Template.md) |
| Armor, a shield, clothing, or a worn or held magic item that is not used up | `EQUIPMENT` | [Strict Equipment](YAML%20Templates/Strict%20Equipment%20Template.md) |
| Something used up or carried as a stack: a potion, scroll, ammunition, poison, food | `CONSUMABLE` | [Strict Consumable](YAML%20Templates/Strict%20Consumable%20Template.md) |
| Artisan's tools, a gaming set, a musical instrument or another tool | `TOOL` | [Strict Tool](YAML%20Templates/Strict%20Tool%20Template.md) |
| Treasure, gems, art objects, trade goods, or plain gear with nothing to activate | `LOOT` | [Strict Loot](YAML%20Templates/Strict%20Loot%20Template.md) |
| A bag, chest, quiver or other holder of items | `CONTAINER` | [Strict Container](YAML%20Templates/Strict%20Container%20Template.md) |
| A spell | `SPELL` | [Strict Spell](YAML%20Templates/Strict%20Spell%20Template.md) |
| A class feature, species trait, monster ability or feat | `FEAT` | [Strict Feat](YAML%20Templates/Strict%20Feat%20Template.md) |

Every template opens with **At a glance** (when to use it, when to use another template, and the smallest document that works). **From source text to YAML** maps rules wording to the fields to write. The complete field reference and one concrete example follow, and **Check before you answer** lists the mistakes to look for before returning YAML.

## Use the generated output

Paste the result into the importer's main source field and click **Preview**. Templates, recipes and saved presets share one picker; **Manage** opens preset controls. Read the [import-window guide](../docs/import-window.md) for reference checks, optional History and restoring window defaults.

When starting from prose, the optional **Show generated YAML editor** under **View options** exposes parsed values and defaults without replacing the source. **Use and preview** applies your edits to the main source. Copy/download uses the current preview, so apply edits first.

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


## Several Items in one paste

Different Item types can share one paste; separate Items of the same type with a line holding `---`. The top-level keys are `SPELL`, `FEAT`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT` and `CONTAINER`.

A `CONTAINER` can list complete Items under `CONTENTS`, up to five containers deep, and they are created inside it. An Item can also name its container with `INVENTORY.Container`: a container in the same paste, an existing one by UUID, or one dragged onto the reference in the window. Contents are never created loose if their container fails, and exporting a container includes its contents. See [full-native-container.yaml](../docs/examples/full-native-container.yaml).

## Quick drafts

For a quick single-Item draft, the eight Item types can also be written as a flat key/value list. At minimum give `name` and `type`; the importer fills in sensible defaults and checks the result the same way as strict YAML.

```yaml
name: Quick Spark
type: spell
level: 2
school: evocation
activation: bonus action
components: V, S
range: 60 feet
duration: 1 minute
description: A brief arc of blue-white light.
```

Type-specific lightweight fields include `weaponType`/`baseWeapon`, `equipmentType`/`baseEquipment`/`armorClass`, `consumableType`/`ammunitionType`/`poisonType`, `toolType`/`baseTool`, `lootType`, container capacity fields, spell level/school/activation/component/range/duration fields, and feature `featureType`/`featureSubtype`/`requirements`/`prerequisiteLevel`/`repeatable` fields (`type: feat` with `featureType: general feat`, `invocation`, `species trait`, and similar readable values).

Readable aliases such as `armor`/`armour`, `potion`, `scroll`, `martial melee`, `thieves tools`, `trade goods`, and full spell-school names are accepted. Values it can't use are reported, never silently replaced. Use the strict templates for anything more detailed.

## Rules worth knowing

- **Mixed damage:** write a typed formula such as `1d8[piercing] + 1d6[lightning]` and set `Damage Type` to the main type (`piercing`), so ability and magic bonuses land on the right type. Do the same for `Versatile Damage Type`.
- **Mechanics:** enrichers such as `[[/damage 1d6 fire]]` make clickable text, not mechanics. Saves, damage and effects that should work at the table go in `Activities` and `effects`, which need Activity Importer; without it, keep the rules in the description.
- **Rituals:** `COMPONENTS.Ritual: true` marks a ritual spell; how it is prepared is set separately.
- **Numbers:** quantities and uses are whole numbers; price, weight and capacity may have decimals; none can be negative, and `12abc` is an error.
- **Attunement:** `Attunement By` is kept only when `Attunement` is `required` or `optional`.
- **Warnings and errors:** an unknown section or field name is a warning; anything invalid is an error, and nothing imports until it is fixed.

## Descriptions: enrichers and name lookups

`Description` and `Chat Description` fields preserve Foundry/dnd5e text features for Foundry to resolve when displayed. You can use dnd5e enrichers like `[[/damage 1d6 fire average]]`, roll-data formulas like `@prof`, dynamic lookups like `[[lookup @name]]{the creature}`, System HTML classes, and pass-through document links like `@UUID[...]` or `@Embed[...]`.

Use dynamic name lookups for active narration and chat flavor, such as `[[lookup @name]]{The creature} drinks the potion.` or `When [[lookup @name]]{the creature} hits with this weapon...`. Keep passive rules text natural.

Optional companion: **Token Name Lookup** can make the same stock dnd5e `[[lookup @name]]` text prefer concrete token names for aliases, disguises, and token inventory views. Items remain fully compatible without that module; dnd5e simply resolves the lookup to the actor name.

## Explicit YAML schema 7 reference

See the [native field coverage and value rules](../docs/explicit-yaml-v2.md). The first YAML block in each of the eight full reference templates shows its supported Item controls. Optional recovery entries have an adjacent commented list schema. The later attachment examples illustrate nesting and canonical syntax; use the companion's full reference when authoring an activity or effect. Quick-start examples remain compact.

Preserve value types: booleans, finite numbers, nullable values, empty strings and collections are distinct. Keep quoted formulas intact. `USAGE.Uses Max` supports a nonnegative integer or a deterministic formula such as `"1 + @prof"`, with the restrictions stated in each usable Item template. It does not accept dice or a bare fractional maximum. Tool Bonus may contain dice; Magic Bonus is deterministic. A hidden native control can retain supplied data without enabling its checkbox.

New damage uses the ten-field `DAMAGE_DATA` mapping. Existing formula shorthand remains valid input when explicit data is absent. Consumable magic bonuses belong in `ATTUNEMENT.Magic Bonus`; the old ammunition spelling is compatibility input. Native consumable subtype and its required ammo/poison parser alias must agree. Effects use `DURATION.Value`/`Units`, string `Change Type`, status lists, and typed `Value` entries.

These templates do not promise every native value or type is importable: Container quantity remains fixed at 1 and is omitted from export, Loot has no equipped state, Tool proficiency accepts Automatic/null or 0, 0.5, 1, 1.5 and 2, Feature advancement covers the six feat-valid types (HitPoints, Size and Subclass belong to classes and species), container contents nest up to five deep within one collection, and the class, subclass, background, species and facility Item types remain deferred. The [native field catalog](../docs/native-field-catalog.md) separates native schema, sheet options, and declared YAML mappings; its unreviewed fields need further investigation.

## Schema 4 automation and recipes

The existing window selector includes editable recipes. Selecting one stages YAML; it does not create a document. If you already have text, confirm replacement or cancel to keep the draft. A recipe that needs an external reference prompts for an existing document UUID and checks its document type. Cancelling or supplying an invalid reference keeps your draft.

1. Choose the appropriate Activity/Effect mode or Item recipe. Integration choices appear only when their provider is active.
2. Edit the drafted names, rules, values and links for your content.
3. Click **Preview** and inspect warnings and references. For a direct Activity/Effect import, use **Check import** before adding it. Enable **Compare after import** beforehand if you want to review the written result.
4. Check intended gameplay in the relevant actor, combat, area or calendar context.

Full typed automation fields are documented in [Automation storage in schema 4](../docs/automation-schema-4.md). Older YAML remains readable; Item exports use Item YAML schema 7 and keep the schema 4 automation storage.

| Recipe | Availability | Starting behavior |
| --- | --- | --- |
| Native: multiple rarities | Item Importer alone | A wondrous Item with uncommon and rare categories. |
| Native: dawn recovery | Item Importer alone | Three charges recover at dawn using the world calendar. |
| Native: dusk recovery | Item Importer alone | Three charges recover at dusk using the world calendar. |
| MIDI: Item automation settings | MIDI-QOL active | Editable Item reaction and on-use macro settings; importing does not execute a macro. |
| Activity Importer recipes | Compatible premium companion active | Native/integration activity and effect drafts wrapped in a complete Equipment Item. Provider-dependent recipes also require that provider. |

The companion supplies its own recipe content. Item Importer remains standalone and free; Activity/Effect attachment authoring requires Activity Importer. Dawn/dusk recovery depends on the native calendar and recovery context; a recipe does not advance world time.
