# Strict Tool Item authoring reference

## At a glance

- **Root key:** `TOOL`
- **When to use:** Use TOOL when the source is a set of artisan's tools, a gaming set, a musical instrument, or one of the six other tools dnd5e knows: disguise kit, forgery kit, herbalism kit, navigator's tools, poisoner's kit, thieves' tools. A magic version, such as a magic lute, is still a TOOL.
- **Smallest working block:** `ITEM.Name` (the name), `ITEM.Base Tool` (the importer id of the tool; `ITEM.Tool Type` is filled in from it).

**Use another template when:**

- A healer's kit, climber's kit, mess kit or other gear that is not a dnd5e tool. `Base Tool` rejects it: CONSUMABLE if it has uses, otherwise LOOT (`Loot Type: gear`).
- A worn item that only gives a bonus to a tool or skill check (gloves, goggles): EQUIPMENT.
- A hammer, sickle or other tool-like object with weapon damage: WEAPON.
- A pack or case that holds tools: CONTAINER.
- A feat or class feature that grants a tool proficiency: FEAT.

**Work in this order:** find the source wording in [From source text to YAML](#from-source-text-to-yaml), copy the exact names from the [Complete field reference](#complete-field-reference), shape the answer like the [Concrete example](#concrete-example), then go through [Check before you answer](#check-before-you-answer).

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 7` and the `TOOL` root.

Item Importer alone supports core fields. Activity/effect attachments require the optional Activity Importer; use its matching templates. Free/core is the default when companion availability is unknown. Loot/Container accept passive effects only.

Read the [generation guide](../README.md) and [authoring rules and validation](../../docs/template-authoring.md) with this file. Explicit field contracts target D&D5e 6.0.6 and 6.1.0 / Foundry 14.370; MIDI/DAE annotations, when used, target the reviewed MIDI-QOL 14.6.11 and DAE 14.6.9 integrations. Package versions and YAML versions are separate.

## Generate or preserve

**Create from a description:** include fields needed for the stated mechanics and any explicitly supplied settings. Omit unrelated optional sections. Do not populate every placeholder or copy example bonuses into a different item. Ask for missing information that changes the mechanics or a required reference; use a documented default only when it does not change the source intent. Invent mechanics only when the user explicitly requests homebrew design.

**Preserve supplied data:** retain every supported supplied value, including stored inactive settings, false, zero, empty collections and documented nulls. Keep the controlling toggle independent. Unsupported values remain a reported limitation; do not silently replace them with a guess.

**Final output:** one YAML code block, with two-space indentation and a space after each colon. Replace every bracket placeholder and remove template comments. Preserve formulas as quoted strings and descriptions as HTML or plain text. Use native YAML booleans and numbers. Do not add prompt-mode, compatibility-report or licensing keys to YAML. If a required fact is missing, ask before producing final importable YAML.

## Reading the reference

| Label | Meaning |
| --- | --- |
| Required | Needed for valid input at the indicated location. |
| Conditionally required | Needed when the stated choice or intended mechanic requires it; distinguish parser rejection from runtime prerequisites. |
| Optional | May be omitted in newly authored input when no value is supplied. |
| Context-dependent | Needs a parent Item, actor, accessible document, registry or workflow context. |
| Compatibility input | An accepted older spelling/representation; use the canonical spelling for new YAML. |

The first YAML block is the **native and legacy field reference**, not a ready-made item to import unchanged. Placeholders describe choices, not default values. Later examples contain concrete values. The separate [schema 4 automation reference](../../docs/automation-schema-4.md) defines reviewed typed integration fields. Do not combine canonical AUTOMATION with legacy MIDI/DAE sections in one Activity or Effect.

Missing, `null`, `false`, `0`, `""`, `[]` and `{}` are distinct. Use `n/a` only for fields that document it as an unset marker. Never use it as a universal substitute for null or empty data. `CHANGES.Value` retains its YAML type, including the literal text `n/a`. Formula syntax acceptance does not establish that referenced variables exist.

For new physical Items, ordinary defaults are quantity 1, equipped false and zero unspecified price/weight. Write `ITEM.Rarities: []` for a mundane item, because a missing `Rarities` key is stored as `common`. A missing `INVENTORY.Identified` follows the user's own setting, so write it when it matters. Omit unsupplied attunement restrictions and optional resources rather than inventing them. Formula Uses Max must be deterministic, one line and at most 200 characters, without dice or semicolons; recovery needs a positive literal maximum or a formula maximum.

## From source text to YAML

Find the wording closest to the source and write the fields shown. A path such as `ITEM.Name` is the `Name` key inside the `ITEM` section of `TOOL`. A list such as `RECOVERY` takes one `-` entry per item. Leave out every section the source does not mention.

| The source says | Write |
| --- | --- |
| "Thieves' Tools" | `ITEM.Base Tool: thief` |
| "Smith's Tools" (artisan's tools) | `ITEM.Tool Type: art`; `ITEM.Base Tool: smith` |
| "Lute" (musical instrument) | `ITEM.Tool Type: music`; `ITEM.Base Tool: lute` |
| "Dice Set" (gaming set) | `ITEM.Tool Type: game`; `ITEM.Base Tool: dice` |
| "Herbalism Kit" | `ITEM.Base Tool: herb` |
| "Ability: Dexterity" | `ABILITY_CHECK.Ability: dex`; `ABILITY_CHECK.Proficient: Automatic` |
| "+2 bonus to ability checks made with these tools" | `PROPERTIES.Tool Bonus: 2` |
| "uncommon (requires attunement by a bard)" | `ITEM.Rarities: [uncommon]`; `PROPERTIES.Magical: true`; `ATTUNEMENT.Attunement: required`; `ATTUNEMENT.Attunement By: a bard` |
| "can be used as a spellcasting focus" | `PROPERTIES.Focus: true` |
| "It has 3 charges" and "regains all expended charges daily at dawn" | `USAGE.Uses Spent: 0`; `USAGE.Uses Max: 3`; `RECOVERY: [{Period: dawn, Type: recoverAll}]` |
| "25 gp" and "1 lb." | `COST_AND_WEIGHT.Price Value: 25`; `COST_AND_WEIGHT.Price Denomination: gp`; `COST_AND_WEIGHT.Weight Value: 1`; `COST_AND_WEIGHT.Weight Units: lb` |
| "Thieves' Tools" in an equipment table (not magic, no rarity) | `ITEM.Rarities: []`; `PROPERTIES.Magical: false`; `INVENTORY.Identified: true` |

## Complete field reference

```yaml
SCHEMA_VERSION: 7
TOOL:
  SOURCE:
    Book: "[text|n/a]"
    Page: "[text|n/a]"
    Custom: "[text|n/a]"
    License: "[text|n/a]"
    Rules: "[2014|2024|text]"
    Revision: 1 # Finite number, including decimals; native default 1.

  ITEM:
    Icon: "[filepath|n/a]"
    Identifier: "[text|n/a]"
    Sort: 0 # Integer ordering value; preserve an authored zero.
    Name: "[text]"
    Rarities: [] # Native rarity IDs: common, uncommon, rare, veryRare, legendary, artifact. [] means mundane.
    Tool Type: "[art|game|music|n/a]"
    # Use n/a for disguise/forgery/herbalism/navigator/poisoner/thieves tools.
    Base Tool: "[e.g. alchemist, smith, thief, lute, dice - see list below]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"
    Container: "[container name|uuid|n/a]" # Place inside a container: its name in this batch, an Item UUID, or drag-and-drop in the import window.

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|Mg]"

  PROPERTIES:
    NPC Equipment: false # Native gear property; shown for NPC inventory.
    Focus: false
    Magical: "[true|false]"
    Tool Bonus: "[formula|n/a]" # Finite number or formula, including dice; e.g. "1d4 + @prof".

  ATTUNEMENT:
    Attuned: false # Current state, independent of Attunement requirement.
    # Store independently of Magical; a bonus does not enable an explicit false property.
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]" # Importer metadata; ignored when Attunement is none.

  ABILITY_CHECK:
    Proficient: "[Automatic|0|0.5|1|1.5|2]"
    Ability: "[str|dex|con|int|wis|cha|n/a]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = maximum count or deterministic formula, e.g. "1 + @prof" (no dice).
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|formula|n/a]"

  # Optional, repeatable. Use [] when there is no recovery.
  # With a positive Uses Max or a formula maximum, replace [] with entries shaped like:
  #   - Period: "[lr|sr|day|dawn|dusk|recharge|initiative|turnStart|turnEnd|turn]"
  #     Type: "[recoverAll|loseAll|formula]"
  #     Formula: "[formula|n/a]" # Required for Type formula; recharge uses a 2..6 threshold.
  RECOVERY: []

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

```

## Configuration rules

Use ABILITY_CHECK for the check ability/proficiency and PROPERTIES.Tool Bonus for its roll bonus. Accepted proficiency values are Automatic/null, 0, 0.5, 1, 1.5 and 2. Tool Bonus may contain dice. Magical and Focus are independent properties. Omit activities in free/core output.


## Concrete example

A free/core tool import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 7
TOOL:
  ITEM:
    Name: Alchemist's Supplies
    Rarities: []
    Tool Type: art
    Base Tool: alchemist
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 50
    Price Denomination: gp
    Weight Value: 8
    Weight Units: lb
  PROPERTIES:
    Magical: false
  ABILITY_CHECK:
    Proficient: Automatic
    Ability: int
  DESCRIPTION:
    Description: >
      This set of alchemist's supplies includes glass beakers, a metal frame, a stirring rod, a
      mortar and pestle, and common alchemical ingredients.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-tool.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Check before you answer

1. `ITEM.Base Tool` is required and takes the importer id, not the printed name: `thief` for thieves' tools, `smith`, `alchemist`, `lute`, `dice`. The six kits use `disg`, `forg`, `herb`, `navg`, `pois` and `thief`. Any other word fails.
2. `ITEM.Tool Type` must match the base tool: `art` for artisan's tools, `game` for gaming sets, `music` for instruments. For the six kits leave it out or write `n/a`. A mismatch fails. When unsure, leave `Tool Type` out; the importer fills it in.
3. A bonus to checks made with the tool is `PROPERTIES.Tool Bonus`. It is not an `ABILITY_CHECK` key, and a tool has no `ATTUNEMENT.Magic Bonus` (the importer drops that key without a warning). `Tool Bonus` may hold dice: `"1d4"`.
4. `ABILITY_CHECK.Ability` is a three-letter id: `str`, `dex`, `con`, `int`, `wis` or `cha`. `ABILITY_CHECK.Proficient` is `Automatic`, `0`, `0.5`, `1`, `1.5` or `2`. `Dexterity` or `expertise` is dropped with a warning. Use `Automatic` unless the source fixes the proficiency.
5. A mundane tool has no `USAGE` or `RECOVERY`. Add them only when a magic tool has charges, with `USAGE.Uses Spent: 0` for a full item.
6. Set `PROPERTIES.Magical: true` on a magic tool; `ATTUNEMENT.Attunement: required` does not set it. Always write `ITEM.Rarities` (`[]` for a mundane tool; a missing key is stored as `common`) and `INVENTORY.Identified` (a missing key follows the user's setting).
7. Start the document with `SCHEMA_VERSION: 7`, then the root key. Copy section and field names exactly as the Complete field reference spells them.
8. Write only the sections and fields the source needs. Do not copy the whole reference, and leave no `[placeholder]` value and no `#` comment in the answer.
9. Write formulas as quoted strings (`"1d6 + 1"`). Write `true`, `false` and plain numbers without quotes.
10. Keep the complete rules text in `DESCRIPTION.Description`. Add `Activities` and `effects` only when the user asked for a full Item and has 5e Activity Importer; use that module's templates for those blocks.

## Compatibility and support

Use canonical keys in new YAML. Legacy aliases in the reference tables are compatibility input; never combine conflicting aliases with canonical fields. Native schema choices, sheet choices and importer coverage can differ. Unknown fields are not generic YAML extension points.

Full Item export needs companion serializers for its attachments; unsupported attachments can block full export. Keep source rules in descriptions for manual mechanics.

## Detailed field and text reference

## OPTIONAL ACTIVITIES AND ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct attack, saving throw, damage, healing, or condition activities. The importer does not generate those mechanics from strict YAML description text. Some item types receive generic system defaults, which do not reproduce arbitrary source rules.

For a functional item with source-defined rolls or effects, include the appropriate `Activities` and/or `effects` entries when Activity Importer is available for this workflow or the user requests its support. This includes a spell's primary save and damage, not only extra actions. Use the matching complete Activity Importer templates from `modules/5e-activity-importer/templates/Base Activity Templates/`, or the MIDI variants when that automation is intended. Preserve source mechanics, triggers, costs, and scaling; never invent mechanics, UUIDs, macros, or module-specific effect keys. If a rule cannot be represented, retain it in the description for manual resolution.

In free/core mode, or when companion support is unavailable or unspecified, omit these sections and preserve the full rules in the description. The resulting import does not promise automated use of those rules. Do not add empty placeholder entries. Both sections require the companion module to be active at import time, and the selected dnd5e Item type must support the requested activities.

Append supported sections at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key:
- `Activities` is an array. Each entry contains exactly one `ACTIVITY_*` key and the corresponding activity body. Multiple activities of the same type are separate array entries; do not insert `---` inside this array.
- `effects` is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Use these for passive item effects. Effects applied by an activity belong in that activity's `APPLIED_EFFECTS` array instead; do not duplicate them here.
- For effects on Foundry 14, use DURATION.Value and DURATION.Units; units may be years, months, days, hours, minutes, seconds, rounds, or turns. Use a nonnegative integer Value, or null for no finite duration.

Use canonical string `Change Type` and a status list. Preserve the YAML type of each `CHANGES[].Value`: a number, boolean, string, list, mapping, or null must match the intended change. Do not quote everything. Legacy numeric `Change Mode` and separate duration labels remain accepted input. Optional Activity ID and Effect ID values must contain exactly 16 alphanumeric characters; omit them when stable references are unnecessary.

The completed examples below demonstrate array nesting for a passive +1 AC ward and an action that deals 1d6 fire damage. They are illustrative only: include them only if the source actually grants those mechanics, and use the full matching companion template for the requested activity type.

```yaml
  effects:
    - DETAILS:
        Name: "Armor Ward"
        Effect Type: base
        Effect Suspended: false
        Apply Effect to Actor: true
        Status Conditions: []
      EFFECT_DESCRIPTION:
        Effect Description: "Grants +1 AC while this item's passive effect is active."
      DURATION:
        Value: null
        Units: seconds
      CHANGES:
        - Attribute Key: system.attributes.ac.bonus
          Change Type: add
          Change Phase: initial
          Value: 1
          Priority: 20
  Activities:
    - ACTIVITY_DAMAGE:
        ACTIVITY:
          Name: "Fire Burst"
          Icon: n/a
        ACTIVATION:
          Override Activation: true
          Activation Type: action
          Activation Cost: 1
          Condition: n/a
        DURATION:
          Override Duration: true
          Duration Time: inst
          Special Duration: n/a
          Duration Amount: n/a
          Concentration: false
        DAMAGE_DETAILS:
          Allow Critical: false
          Extra Critical Damage Formula: n/a
        DAMAGE:
          DAMAGE_PARTS:
            - DAMAGE_DATA:
                Dice Count: 1
                Die Denomination: 6
                Bonus: ""
                Damage Types: [fire]
                Modifiers: []
                Custom Enabled: false
                Custom Formula: ""
                Scaling Mode: none
                Scaling Dice Count: 1
                Scaling Formula: ""
        APPLIED_EFFECTS: []
```

---

## **FIELD REFERENCE**

### **Tool Types & Base Tool IDs**
| Type | Base Tool IDs |
|------|---------------|
| `art` | `alchemist`, `brewer`, `calligrapher`, `carpenter`, `cartographer`, `cobbler`, `cook`, `glassblower`, `jeweler`, `leatherworker`, `mason`, `painter`, `potter`, `smith`, `tinker`, `weaver`, `woodcarver` |
| `game` | `dice`, `card`, `chess` |
| `music` | `bagpipes`, `drum`, `dulcimer`, `flute`, `horn`, `lute`, `lyre`, `panflute`, `shawm`, `viol` |
| `n/a` | `disg`, `forg`, `herb`, `navg`, `pois`, `thief` |

Legacy short artisan IDs such as `alch` and `calli` are still accepted for backward compatibility, but new templates should use the full IDs below.

### **Artisan Tools Reference**
| ID | Tool Name |
|----|-----------|
| `alchemist` | Alchemist's Supplies |
| `brewer` | Brewer's Supplies |
| `calligrapher` | Calligrapher's Supplies |
| `carpenter` | Carpenter's Tools |
| `cartographer` | Cartographer's Tools |
| `cobbler` | Cobbler's Tools |
| `cook` | Cook's Utensils |
| `glassblower` | Glassblower's Tools |
| `jeweler` | Jeweler's Tools |
| `leatherworker` | Leatherworker's Tools |
| `mason` | Mason's Tools |
| `painter` | Painter's Supplies |
| `potter` | Potter's Tools |
| `smith` | Smith's Tools |
| `tinker` | Tinker's Tools |
| `weaver` | Weaver's Tools |
| `woodcarver` | Woodcarver's Tools |

### **Other Tools Reference**
| ID | Tool Name |
|----|-----------|
| `disg` | Disguise Kit |
| `forg` | Forgery Kit |
| `herb` | Herbalism Kit |
| `navg` | Navigator's Tools |
| `pois` | Poisoner's Kit |
| `thief` | Thieves' Tools |

### **Proficiency**
| Value | Meaning |
|-------|---------|
| `Automatic` | Game auto-detects proficiency from the character (default) |
| `0` | Not proficient |
| `0.5` | Half proficiency |
| `1` | Proficient |
| `1.5` | One and a half proficiency |
| `2` | Expertise (double proficiency) |

These are the accepted YAML proficiency values, including the native 1.5 multiplier.

### **Recovery Periods**
| Period | Description |
|--------|-------------|
| `lr` | Long Rest |
| `sr` | Short Rest |
| `day` | Daily (any time) |
| `dawn` | At dawn |
| `dusk` | At dusk |
| `recharge` | Recharge threshold: set Formula to 2, 3, 4, 5, or 6 |
| `initiative` | When initiative is rolled |
| `turnStart` | At the start of the owner's turn |
| `turnEnd` | At the end of the owner's turn |
| `turn` | Each turn |

### **Recharge Values**
| Formula | Display |
|---------|---------|
| `6` | Recharge 6 |
| `5` | Recharge 5-6 |
| `4` | Recharge 4-6 |
| `3` | Recharge 3-6 |
| `2` | Recharge 2-6 |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save wis 15]]                       → [DC 15 Wisdom]
[[/save con 13 format=long]]           → [DC 13 Constitution] saving throw
[[/save cha 14]]                       → [DC 14 Charisma]
[[/save dex wis 15]]                   → [DC 15 Dexterity or Wisdom]
```

### **Damage Rolls**
```html
[[/damage 2d6 fire]]                   → [2d6] fire
[[/damage 2d6 fire average]]           → 7 (2d6) fire
[[/damage 1d8 + @mod thunder average]] → Includes ability modifier
```

### **Healing**
```html
[[/heal 2d4 + 2]]                      → [2d4 + 2] healing
[[/heal 2d4 + 2 average]]              → 7 (2d4 + 2) healing
[[/heal 5 temp]]                       → [5] temporary hit points
```

### **Ability/Tool Checks**
```html
[[/check thieves 15]]                  → [DC 15 Dexterity (Thieves' Tools)]
[[/check alchemist 14 format=long]]    → [DC 14 Intelligence (Alchemist's Supplies)] check
[[/check performance 12]]              → [DC 12 Charisma (Performance)]
[[/check sleightofhand 13]]            → [DC 13 Dexterity (Sleight of Hand)]
[[/tool smith 15]]                     → [DC 15 Strength (Smith's Tools)]
```

### **Condition & Rule References**
```html
&Reference[frightened]                 → Frightened (with tooltip)
&Reference[charmed]                    → Charmed
&Reference[poisoned]                   → Poisoned
&Reference[deafened]                   → Deafened
&Reference[incapacitated]              → Incapacitated
&Reference[invisible]                  → Invisible
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.cha.mod]]          → Charisma modifier
[[lookup @attributes.prof]]            → Proficiency bonus
```

---

## **HTML PATTERNS**

### **Standard Tool Description**
```html
<p><em>Brief flavor description of the tool's appearance.</em></p>
<hr>

<p>Proficiency with these tools lets [[lookup @name]]{the creature} add their proficiency bonus to ability checks they make using them.</p>
```

### **Magical Tool with Bonus**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>While using these tools, [[lookup @name]]{the creature} has a +X bonus to ability checks made with them.</p>
```

### **Charge-Based Tool**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>This item has X charges. While using it, [[lookup @name]]{the creature} can expend charges to activate the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The item regains 1d4 expended charges daily at dawn.</p>
```

### **Area Effect (Musical Instruments)**
```html
<p><strong>Haunting Melody (1 Charge).</strong> As an action, [[lookup @name]]{the creature} can play the instrument and expend 1 charge. Each creature of their choice within 30 feet that can hear them must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of them for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.</p>
```

### **Crafting Enhancement**
```html
<p><strong>Master's Touch.</strong> When [[lookup @name]]{the creature} uses these tools to craft an item during downtime, they complete the work in half the normal time.</p>
```

### **Proficiency Requirement**
```html
<p>You must be proficient with [tool type] to use this item's magical properties.</p>
```

---


## Explicit fields in Item YAML schema 7

Verification target: D&D5e 6.0.6 and 6.1.0 / Foundry 14.370. Item YAML versions 0 to 6 remain accepted in memory. Complete field mappings, conditions, defaults, exclusions, and tests are recorded in [the field coverage reference](../../docs/explicit-yaml-v2.md).

| Field | Stored value / default |
|---|---|
| ITEM.Icon | Native image path. A supplied path takes priority over automatic icon selection. |
| ITEM.Identifier / ITEM.Sort | Native identifier / integer ordering value; zero is valid. |
| SOURCE.Book, Page, Custom, License, Rules, Revision | Native source information. Revision is numeric (default 1); page is text. |
| ATTUNEMENT.Attuned | Current item state, separate from the attunement requirement. Applies to equippable types, including Container. Default false. |
| Formula fields | Preserve the complete formula string. Numeric fields reject expressions and fractional values when the native field requires integers. |
| Inactive controls | Retain supplied values without enabling the controlling property or override. Omit a conditional section only when no stored settings need preservation. |

DAMAGE_DATA is the canonical damage representation for Weapon base/versatile damage and Consumable damage. It preserves Dice Count, Die Denomination, Bonus, the Damage Types list, Custom Enabled, Custom Formula, Scaling Mode, Scaling Dice Count, and Scaling Formula. Dice values are nonnegative integers or null; formulas are strings; Custom Enabled defaults false; Scaling Mode defaults none. An inactive custom formula and inactive structured damage remain stored together. Do not combine populated legacy damage shorthand with DAMAGE_DATA. Legacy formula/type labels remain accepted on input. Consumable DAMAGE.Replace defaults false; old ammunition Damage Replace remains an alias.

Additional controls apply by item type: Tool PROPERTIES.Focus; Loot ITEM.Loot Subtype; Container PROPERTIES.Unidentified Contents; Consumable FOOD_PROPERTIES.Hydrating and Nutritious (food only, dnd5e 6.1 or later); siege/vehicle Crew Capacity, Speed, Speed Units, and Speed Conditions. Weapon reach and ranges accept native decimals. RELOAD.Reload Amount is private metadata in flags.5e-item-importer.reloadAmount, with no native reload automation.

Spell PREPARATION.Prepared exports unprepared/prepared/always and accepts native 0/1/2 or legacy booleans. Source Item stores the spellcasting source identifier. RANGE.Special, DURATION.Special, and AREA.Stationary retain their native values. Range, duration, target count, and every area dimension/count accept formulas. Material settings remain stored when Material is false.
