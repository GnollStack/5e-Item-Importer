# Strict Equipment Item authoring reference

## At a glance

- **Root key:** `EQUIPMENT`
- **When to use:** Use EQUIPMENT when the source is armor, a shield, clothing, or a magic item that is worn or held and is not used up: a ring, rod, wand, cloak, boots, amulet or other wondrous item, a holy symbol or other trinket, or vehicle equipment. `ITEM.Equipment Type` says which: `light`, `medium`, `heavy`, `natural`, `shield`, `clothing`, `ring`, `rod`, `wand`, `trinket`, `wondrous` or `vehicle`.
- **Smallest working block:** `ITEM.Name` (the name), `ITEM.Equipment Type` (one id from the list). For `light`, `medium`, `heavy`, `natural` and `shield` also `ARMOR.Armor Class` (required) and `ITEM.Base Equipment` (the importer warns without it, except for `natural`).

**Use another template when:**

- A weapon, including a magic staff that can be swung as a quarterstaff: WEAPON.
- A potion, scroll, ammunition, or a wondrous item that is used up (dust, a bead): CONSUMABLE.
- A bag, pack, chest or quiver that holds items: CONTAINER.
- Artisan's tools, a kit, a gaming set or a musical instrument: TOOL.
- A gem, an art object, or gear with no rules to run: LOOT.
- A class feature or feat that changes AC: FEAT.

**Work in this order:** find the source wording in [From source text to YAML](#from-source-text-to-yaml), copy the exact names from the [Complete field reference](#complete-field-reference), shape the answer like the [Concrete example](#concrete-example), then go through [Check before you answer](#check-before-you-answer).

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 7` and the `EQUIPMENT` root.

Item Importer alone supports core fields. Activity/effect attachments require the optional Activity Importer; use its matching templates. Free/core is the default when companion availability is unknown. Loot/Container accept passive effects only.

Read the [generation guide](../README.md) and [authoring rules and validation](../../docs/template-authoring.md) with this file. Explicit field contracts target D&D5e 6.0.6, 6.1.0 and 6.1.1 / Foundry 14.370; MIDI/DAE annotations, when used, target the reviewed MIDI-QOL 14.7.0 and DAE 14.6.10 on D&D5e 6.1.0 (and MIDI-QOL 14.6.11 and DAE 14.6.9 on D&D5e 6.0.6). Package versions and YAML versions are separate.

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

Find the wording closest to the source and write the fields shown. A path such as `ITEM.Name` is the `Name` key inside the `ITEM` section of `EQUIPMENT`. A list such as `RECOVERY` takes one `-` entry per item. Leave out every section the source does not mention.

| The source says | Write |
| --- | --- |
| "Plate Armor", "Heavy Armor", "AC 18" | `ITEM.Equipment Type: heavy`; `ITEM.Base Equipment: plate`; `ARMOR.Armor Class: 18`; `ARMOR.Max Dex Modifier: 0` |
| "AC 14 + Dex modifier (max 2)" (medium armor) | `ITEM.Equipment Type: medium`; `ITEM.Base Equipment: breastplate`; `ARMOR.Armor Class: 14`; `ARMOR.Max Dex Modifier: 2` |
| "AC 11 + Dex modifier" (light armor) | `ITEM.Equipment Type: light`; `ITEM.Base Equipment: leather`; `ARMOR.Armor Class: 11` |
| "Strength 15" and "Stealth: Disadvantage" | `ARMOR.Strength Requirement: 15`; `PROPERTIES.Stealth Disadvantage: true` |
| "Shield", "+2 AC" | `ITEM.Equipment Type: shield`; `ITEM.Base Equipment: shield`; `ARMOR.Armor Class: 2` |
| "You have a +1 bonus to AC while wearing this armor" | `PROPERTIES.Magical: true`; `ATTUNEMENT.Magic Bonus: 1` |
| "Wondrous item, uncommon (requires attunement by a spellcaster)" | `ITEM.Equipment Type: wondrous`; `ITEM.Rarities: [uncommon]`; `PROPERTIES.Magical: true`; `ATTUNEMENT.Attunement: required`; `ATTUNEMENT.Attunement By: a spellcaster` |
| "Ring, rare" | `ITEM.Equipment Type: ring`; `ITEM.Rarities: [rare]`; `PROPERTIES.Magical: true` |
| "can be used as a holy symbol" or "as a spellcasting focus" | `PROPERTIES.Focus: true` |
| "It has 3 charges" and "regains all expended charges daily at dawn" | `USAGE.Uses Spent: 0`; `USAGE.Uses Max: 3`; `RECOVERY: [{Period: dawn, Type: recoverAll}]` |
| "1,500 gp" and "65 lb." | `COST_AND_WEIGHT.Price Value: 1500`; `COST_AND_WEIGHT.Price Denomination: gp`; `COST_AND_WEIGHT.Weight Value: 65`; `COST_AND_WEIGHT.Weight Units: lb` |
| "Chain Mail" in an equipment table (not magic, no rarity) | `ITEM.Rarities: []`; `PROPERTIES.Magical: false`; `INVENTORY.Identified: true` |

## Complete field reference

```yaml
SCHEMA_VERSION: 7
EQUIPMENT:
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
    Equipment Type: "[light|medium|heavy|natural|shield|clothing|ring|rod|trinket|wand|wondrous|vehicle]"
    Base Equipment: "[e.g. plate, leather, shield - OR n/a for wondrous items]"

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
    Magical: "[true|false]"
    Adamantine: "[true|false]"
    Focus: "[true|false]"
    Stealth Disadvantage: "[true|false]"

  ATTUNEMENT:
    Attuned: false # Current state, independent of Attunement requirement.
    # Store independently of Magical; a bonus does not enable an explicit false property.
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]" # Importer metadata; ignored when Attunement is none.
    Magic Bonus: "[formula|n/a]" # Deterministic formula, e.g. "@prof"; no dice.

  ARMOR:
    # Armor/shield controls; preserve supplied settings on non-armor types.
    Armor Class: "[integer|null]" # Same native AC field; supplied non-null values must agree.
    Max Dex Modifier: "[integer|null]" # Null means no stored dexterity cap.
    Strength Requirement: "[integer|null]" # Nonnegative integer or native null.

  VEHICLE_PROPERTIES:
    Crew Capacity: 0
    Speed Units: "[ft|mi|m|km]"
    # Vehicle controls; preserve supplied settings on other equipment types.
    Vehicle Armor Class: "[integer|null]" # Same native AC field; supplied non-null values must agree.
    Cover: "[none|half|threequarters|total|number|null]" # Numeric cover is 0..1.
    Hit Points Current: "[integer|null]" # Nonnegative integer, or native null.
    Hit Points Max: "[integer|null]" # Nonnegative integer, or native null.
    Hit Points Threshold: "[integer|null]" # Nonnegative integer, or native null.
    Health Conditions: "[text|n/a]"
    Speed: "[integer|null]" # Nonnegative integer; no formula.
    Speed Conditions: "[text|n/a]"

  PROFICIENCY:
    Proficient: "[Automatic|0|1]"

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

ARMOR and VEHICLE_PROPERTIES are conditional authoring groups. Keep supplied inactive armor/vehicle settings, but do not invent them for a wondrous item. Conflicting armor-class values are invalid. Source rules such as resistance or an AC bonus require explicit companion effects for automation; description text alone does not supply them.


## Concrete example

A free/core equipment import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 7
EQUIPMENT:
  ITEM:
    Name: Cloak of Protection
    Rarities: [uncommon]
    Equipment Type: wondrous
    Base Equipment: n/a
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 400
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb
  PROPERTIES:
    Magical: true
  ATTUNEMENT:
    Attunement: required
  DESCRIPTION:
    Description: >
      While wearing this cloak, [[lookup @name]]{the creature} gains a +1 bonus to AC and saving
      throws.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-equipment.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Check before you answer

1. `light`, `medium`, `heavy`, `natural` and `shield` need an `ARMOR` section with `ARMOR.Armor Class`, or the import fails. Leave `ARMOR` out for rings, rods, wands, clothing, trinkets and wondrous items.
2. `ARMOR.Armor Class` is a whole number: the armor's base AC (`18` for plate, `14` for a breastplate) or a shield's bonus (`2`). Text such as `14 + Dex modifier (max 2)` fails. For +1 armor keep the base AC and write `ATTUNEMENT.Magic Bonus: 1`; do not write `19`.
3. Write the Dexterity cap in `ARMOR.Max Dex Modifier`: `2` for medium armor, `0` for heavy armor. Leave it out for light armor. Heavy armor without `Max Dex Modifier: 0` is stored with no cap.
4. "Stealth: Disadvantage" is `PROPERTIES.Stealth Disadvantage: true`. It is not an `ARMOR` key; there it is ignored with a warning. The Strength score is `ARMOR.Strength Requirement`.
5. `ATTUNEMENT.Magic Bonus` is the AC bonus of magic armor or a magic shield. Do not use it for a ring, cloak or other wondrous item that grants +1 AC. That bonus is not an Item field.
6. `ITEM.Equipment Type` is one id: `wondrous`, not `wondrous item`. `ITEM.Base Equipment` is only for armor and shields, as one lowercase word: `studdedleather`, `chainshirt`, `scalemail`, `halfplate`, `ringmail`, `chainmail`. Leave it out for everything else.
7. Set `PROPERTIES.Magical: true` on every magic item; `ATTUNEMENT.Attunement: required` does not set it. `ATTUNEMENT.Attunement` is `required`, `optional` or `none`, never `true`. Always write `ITEM.Rarities` (`[]` for mundane gear; a missing key is stored as `common`) and `INVENTORY.Identified` (a missing key follows the user's setting).
8. `USAGE.Uses Spent` counts charges already used, so a full item is `Uses Spent: 0`. `USAGE.Uses Max` is a whole number or a formula without dice. `RECOVERY` is dropped when `Uses Max` is `0` or missing. Use the period ids (`dawn`, `dusk`, `day`, `lr`, `sr`), not words such as `long rest`.
9. Start the document with `SCHEMA_VERSION: 7`, then the root key. Copy section and field names exactly as the Complete field reference spells them.
10. Write only the sections and fields the source needs. Do not copy the whole reference, and leave no `[placeholder]` value and no `#` comment in the answer.
11. Write formulas as quoted strings (`"1d6 + 1"`). Write `true`, `false` and plain numbers without quotes.
12. Keep the complete rules text in `DESCRIPTION.Description`. Add `Activities` and `effects` only when the user asked for a full Item and has 5e Activity Importer; use that module's templates for those blocks.

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

### **Equipment Types & Base Equipment**
| Type | Base Equipment Options |
|------|------------------------|
| `light` | `padded`, `leather`, `studdedleather` |
| `medium` | `hide`, `chainshirt`, `scalemail`, `breastplate`, `halfplate` |
| `heavy` | `ringmail`, `chainmail`, `splint`, `plate` |
| `shield` | `shield` |
| `natural` | n/a (for creature natural armor) |
| `clothing` | n/a |
| `ring` | n/a |
| `wondrous` | n/a |
| `trinket` | n/a |
| `rod` | n/a |
| `wand` | n/a |
| `vehicle` | n/a |

### **Armor Class Calculations**
| Type | Base AC | Dex Modifier |
|------|---------|--------------|
| Light | 11-12 | Full Dex |
| Medium | 12-15 | Max +2 Dex |
| Heavy | 14-18 | No Dex |
| Shield | +2 | N/A (added to base) |

### **Proficiency**
| Value | Meaning |
|-------|---------|
| `Automatic` | Game auto-detects proficiency from the character (default) |
| `0` | Not proficient |
| `1` | Proficient |

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

### **Recovery Types**
| Type | Formula | Result |
|------|---------|--------|
| `recoverAll` | n/a | Regain all charges |
| `loseAll` | n/a | Lose all remaining charges |
| `formula` | Dice (e.g., `1d4+1`) | Regain rolled amount |
| `formula` | Number (e.g., `5`) | For recharge: regain all on d6 ≥ 5 |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save dex 15]]                       → [DC 15 Dexterity]
[[/save con 14 format=long]]           → [DC 14 Constitution] saving throw
[[/save wis 13]]                       → [DC 13 Wisdom]
[[/save str dex 15]]                   → [DC 15 Strength or Dexterity]
```

### **Damage Rolls**
```html
[[/damage 2d6 fire]]                   → [2d6] fire
[[/damage 2d6 fire average]]           → 7 (2d6) fire
[[/damage 1d8 + @mod radiant average]] → Includes ability modifier
[[/damage 2d6 fire & 2d6 cold average]] → 7 (2d6) fire plus 7 (2d6) cold
```

### **Healing**
```html
[[/heal 2d8 + 2]]                      → [2d8 + 2] healing
[[/heal 2d8 + 2 average]]              → 11 (2d8 + 2) healing
[[/heal 10 temp]]                      → [10] temporary hit points
```

### **Ability Checks**
```html
[[/check stealth]]                     → [Dexterity (Stealth)]
[[/check stealth 15]]                  → [DC 15 Dexterity (Stealth)]
[[/check athletics 14 format=long]]    → [DC 14 Strength (Athletics)] check
[[/check perception 12 passive]]       → passive Wisdom (Perception) of 12+
```

### **Attack Rolls**
```html
[[/attack +7]]                         → Fixed +7 to hit
[[/attack]]                            → Auto-links to item's attack activity
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip)
&Reference[restrained]                 → Restrained
&Reference[invisible]                  → Invisible
&Reference[frightened]                 → Frightened
&Reference[charmed]                    → Charmed
&Reference[grappled]                   → Grappled
&Reference[Difficult Terrain]          → Difficult Terrain
&Reference[Half Cover]                 → Half Cover
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.str.mod]]          → Strength modifier
[[lookup @attributes.ac.value]]        → Current AC
[[lookup @details.cr]]                 → Challenge Rating
```

---

## **HTML PATTERNS**

### **Standard Magic Armor**
```html
<p><em>Brief flavor description of the armor's appearance.</em></p>
<hr>

<p>You have a +X bonus to AC while wearing this armor.</p>
```

### **Reactive Armor (Damage Reduction)**
```html
<p><strong>Reactive Defense.</strong> When [[lookup @name]]{the creature} takes damage from a source they can see, they can use their reaction to reduce that damage by [[/damage 1d10 + @abilities.con.mod average]].</p>
```

### **Aura Effect**
```html
<p><strong>Aura of Protection.</strong> While [[lookup @name]]{the creature} wears this item, they and friendly creatures within 10 feet of them have advantage on saving throws against being &Reference[frightened].</p>
```

### **Charge-Based Ability**
```html
<p>This item has X charges. While wearing it, [[lookup @name]]{the creature} can expend 1 or more charges to use the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The item regains 1d4 + 1 expended charges daily at dawn.</p>
```

### **Resistance/Immunity**
```html
<p><strong>Elemental Ward.</strong> While [[lookup @name]]{the creature} wears this armor, they have resistance to fire damage.</p>
```

### **Triggered Effect**
```html
<p><strong>Retribution.</strong> When a creature within 5 feet of [[lookup @name]]{the creature} hits them with a melee attack, they can use their reaction to deal [[/damage 2d6 lightning average]] to the attacker.</p>
```

---


## Explicit fields in Item YAML schema 7

Verification target: D&D5e 6.0.6, 6.1.0 and 6.1.1 / Foundry 14.370. Item YAML versions 0 to 6 remain accepted in memory. Complete field mappings, conditions, defaults, exclusions, and tests are recorded in [the field coverage reference](../../docs/explicit-yaml-v2.md).

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
