# Strict Spell Item authoring reference

## At a glance

- **Root key:** `SPELL`
- **When to use:** Use SPELL when the source is a spell description: a level and school line, casting time, range, components and duration. A cantrip is a spell of level 0.
- **Smallest working block:** `ITEM.Name` (the name), `ITEM.Level` (0 to 9; 0 is a cantrip), `ITEM.School` (three-letter id), `ACTIVATION.Type` (the casting time unit). Without `RANGE` the importer stores range units `ft` with no value, and without `DURATION` it stores `inst`, so write both for a real spell.

**Use another template when:**

- A spell scroll: CONSUMABLE (`Consumable Type: scroll`).
- A magic item that casts a spell (wand, staff, ring): EQUIPMENT or WEAPON, with the spell named in the description.
- A class feature, feat, invocation, maneuver or psionic power with no spell level and school: FEAT.
- A monster trait or action, even a magical one (breath weapon, innate ability): FEAT.

**Work in this order:** find the source wording in [From source text to YAML](#from-source-text-to-yaml), copy the exact names from the [Complete field reference](#complete-field-reference), shape the answer like the [Concrete example](#concrete-example), then go through [Check before you answer](#check-before-you-answer).

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 7` and the `SPELL` root.

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

Omit optional resources the source does not give rather than inventing them. Formula Uses Max must be deterministic, one line and at most 200 characters, without dice or semicolons; recovery needs a positive literal maximum or a formula maximum.

## From source text to YAML

Find the wording closest to the source and write the fields shown. A path such as `ITEM.Name` is the `Name` key inside the `ITEM` section of `SPELL`. A list such as `RECOVERY` takes one `-` entry per item. Leave out every section the source does not mention.

| The source says | Write |
| --- | --- |
| "3rd-level evocation" or "Level 3 Evocation" | `ITEM.Level: 3`; `ITEM.School: evo` |
| "Casting Time: 1 action" | `ACTIVATION.Type: action`; `ACTIVATION.Value: 1` |
| "Casting Time: 1 reaction, which you take when you are hit by an attack" | `ACTIVATION.Type: reaction`; `ACTIVATION.Value: 1`; `ACTIVATION.Condition: "which you take when you are hit by an attack"` |
| "Range: 150 feet" | `RANGE.Units: ft`; `RANGE.Value: 150` |
| "Range: Self (15-foot cone)" | `RANGE.Units: self`; `AREA.Shape: cone`; `AREA.Size: 15`; `AREA.Units: ft` |
| "Components: V, S, M (a tiny ball of bat guano and sulfur)" | `COMPONENTS.Vocal: true`; `COMPONENTS.Somatic: true`; `COMPONENTS.Material: true`; `COMPONENTS.Ritual: false`; `MATERIALS.Value: "a tiny ball of bat guano and sulfur"`; `MATERIALS.Consumed: false` |
| "M (a diamond worth 300+ gp, which the spell consumes)" | `COMPONENTS.Material: true`; `MATERIALS.Value: "a diamond worth 300+ gp, which the spell consumes"`; `MATERIALS.Cost: 300`; `MATERIALS.Consumed: true` |
| "Duration: Concentration, up to 1 minute" | `DURATION.Units: minute`; `DURATION.Value: 1`; `DURATION.Concentration: true` |
| "(ritual)" after the school, or "Casting Time: 1 action or Ritual" | `COMPONENTS.Ritual: true`; `PREPARATION.Method: spell` |
| "each creature in a 20-foot-radius sphere" | `TARGETS.Type: creature`; `AREA.Shape: sphere`; `AREA.Size: 20`; `AREA.Units: ft` |
| "one creature you can see within range" | `TARGETS.Type: creature`; `TARGETS.Count: 1` |
| "you can cast it once without a spell slot" and "you regain the ability when you finish a long rest" | `PREPARATION.Method: innate`; `USAGE.Uses Spent: 0`; `USAGE.Uses Max: 1`; `RECOVERY: [{Period: lr, Type: recoverAll}]` |

## Complete field reference

```yaml
SCHEMA_VERSION: 7
SPELL:
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
    Level: "[0|1|2|3|4|5|6|7|8|9]"
    School: "[abj|con|div|enc|evo|ill|nec|trs|n/a]" # n/a stores an empty school.
    Ability: "[str|dex|con|int|wis|cha|n/a]"

  COMPONENTS:
    Vocal: "[true|false]"
    Somatic: "[true|false]"
    Material: "[true|false]"
    Ritual: "[true|false]"

  MATERIALS:
    # Used when Material is true; retain all supplied settings when it is false.
    Value: "[text]"
    Cost: "[integer|decimal]"
    Supply: "[integer|decimal]"
    Consumed: "[true|false]"

  PREPARATION:
    Method: "[atwill|innate|ritual|pact|spell]"
    Prepared: "[unprepared|prepared|always]"
    Source Item: "[identifier|n/a]"

  ACTIVATION:
    Type: "[action|bonus|reaction|minute|hour|day|special]"
    Value: "[integer]" # Nonnegative activation cost; preserve when timing hides the count.
    Condition: "[text|n/a]"

  RANGE:
    # Value and Special remain stored for self/touch/spec/any units.
    Special: "[text|n/a]"
    Units: "[self|touch|spec|any|ft|mi|m|km]"
    Value: "[formula|n/a]"

  DURATION:
    # Preserve Value and Special even when the selected unit hides those controls.
    Expiry: null # Native expiry key (e.g. turnEnd), or null for default expiry.
    Special: "[text|n/a]"
    Units: "[inst|spec|turn|round|minute|hour|day|month|year|disp|dstr|perm]"
    Value: "[formula|n/a]"
    Concentration: "[true|false]"

  TARGETS:
    Type: "[self|ally|enemy|creature|object|space|creatureOrObject|any|willing|n/a]"
    Count: "[formula|n/a]"
    Choice: "[true|false]"
    Special: "[text|n/a]"

  AREA:
    Stationary: false
    # Used when Shape selects an area; retain dimensions and booleans with no shape.
    Shape: "[cone|cube|cylinder|radius|ring|line|sphere|circle|square|wall|n/a]"
    Size: "[formula|n/a]"
    Units: "[ft|mi|m|km]"
    Count: "[formula|n/a]"
    Width: "[formula|n/a]"
    Height: "[formula|n/a]"
    Contiguous: "[true|false]" # Preserve independently of Shape and Count.

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

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

```

## Configuration rules

This is a native Spell Item, not a physical inventory item: rarity, quantity, price, weight and unidentified-description fields are not current spell authoring controls. Use Prepared:unprepared/prepared/always for native 0/1/2 state. COMPONENTS.Ritual is independent of Method; use Method:spell for an ordinary ritual-capable prepared spell. Preserve material cost/supply, consumed state and inactive components independently. Source-specific attacks, saves, healing and effects require companion attachments in full output.


## Concrete example

A free/core spell import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 7
SPELL:
  ITEM:
    Name: Magic Missile
    Level: 1
    School: evo
    Ability: n/a
  COMPONENTS:
    Vocal: true
    Somatic: true
    Material: false
    Ritual: false
  PREPARATION:
    Method: spell
    Prepared: prepared
  ACTIVATION:
    Type: action
    Value: 1
    Condition: n/a
  RANGE:
    Units: ft
    Value: 120
  DURATION:
    Units: inst
    Value: n/a
    Concentration: false
  TARGETS:
    Type: creature
    Count: 3
    Choice: true
    Special: Up to three creatures; each dart can target the same or a different creature.
  USAGE:
    Uses Spent: 0
    Uses Max: n/a
  RECOVERY: []
  DESCRIPTION:
    Description: >
      <p>You create three glowing darts of magical force. Each dart hits a creature of your choice
      that you can see within range and deals [[/damage 1d4 + 1 force]] damage. The darts strike
      simultaneously, and you can direct them at one creature or several.</p>

      <p><strong>At Higher Levels.</strong> One additional dart is created for each spell slot level
      above 1.</p>
  CHAT_FLAVOR:
    Chat Description: |
      n/a
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-spell.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Check before you answer

1. `ITEM.School` is a three-letter id: `abj`, `con`, `div`, `enc`, `evo`, `ill`, `nec` or `trs`. `evocation` fails. `ITEM.Level` is a number from 0 to 9. A cantrip is `0`; `cantrip` or `3rd` fails.
2. V is `COMPONENTS.Vocal`, not `Verbal`. Concentration is `DURATION.Concentration`, not a `COMPONENTS` key. The wrong key is ignored with a warning, so the spell loses that property.
3. A ritual spell is `COMPONENTS.Ritual: true` with `PREPARATION.Method: spell`. Do not write `Method: ritual` for it. `PREPARATION.Prepared` is `unprepared`, `prepared` or `always`.
4. `ACTIVATION.Type` is one id: `action`, `bonus`, `reaction`, `minute`, `hour`, `day` or `special`. `ACTIVATION.Value` is a whole number. "10 minutes" is `Type: minute` and `Value: 10`. `bonus action` fails.
5. Units are ids: `ft`, not `feet`; `minute`, not `minutes`; `inst`, not `instantaneous`. "Until dispelled" is `disp`. An unknown unit gives a warning.
6. "Self (15-foot cone)" is `RANGE.Units: self` plus an `AREA` section. Do not put the area size in `RANGE.Value`. Write `AREA` only when the spell has an area. A 2024 Emanation is `AREA.Shape: radius`.
7. The material text goes in `MATERIALS.Value`. A gp price goes in `MATERIALS.Cost` as a plain number: `300`, not `300 gp`. "Which the spell consumes" is `MATERIALS.Consumed: true`. Set `COMPONENTS.Material: true` as well.
8. A spell has no rarity, price, weight, quantity or attunement. `ITEM.Rarities`, `INVENTORY`, `COST_AND_WEIGHT`, `UNIDENTIFIED_DESCRIPTION` and `ATTUNEMENT` are ignored with a warning. Leave `USAGE` and `RECOVERY` out for a spell that is cast with spell slots.
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

### **Spellcasting Ability Override**
Use `Ability` in the `ITEM` section to override the class spellcasting ability for this specific spell. Useful for racial or feat-granted spells that use a fixed ability (e.g., `cha` for Tiefling spells, `int` for Eldritch Knight spells). Set to `n/a` to use the class default.

| Value | Ability |
|-------|---------|
| `str` | Strength |
| `dex` | Dexterity |
| `con` | Constitution |
| `int` | Intelligence |
| `wis` | Wisdom |
| `cha` | Charisma |
| `n/a` | Use class default |

---

### **Spell Schools**
| Key | School |
|-----|--------|
| `abj` | Abjuration |
| `con` | Conjuration |
| `div` | Divination |
| `enc` | Enchantment |
| `evo` | Evocation |
| `ill` | Illusion |
| `nec` | Necromancy |
| `trs` | Transmutation |

### **Preparation Methods**
| Method | Description |
|--------|-------------|
| `atwill` | At Will (always available, no slot needed) |
| `innate` | Innate (uses per day, not spell slots) |
| `ritual` | Legacy ritual-only preparation (always prepared); when Components Ritual is omitted, also enables the ritual property. |
| `pact` | Pact Magic (Warlock slot) |
| `spell` | Standard spellbook/prepared spell |

Legacy `prepared` is still accepted for backward compatibility, but new templates should use `spell`.

### **Ritual Casting and Materials**

| Field | Description | Accepted Values |
|---|---|---|
| `COMPONENTS.Ritual` | Whether this spell can be cast as a ritual, independently of preparation. A normal ritual-capable spell uses `Ritual: true` with `PREPARATION.Method: spell`. | `true` or `false`; default `false`. |
| `MATERIALS.Cost` | Material component cost in gold pieces. | Finite nonnegative number (integer or decimal); `0` when no cost is stated. |
| `MATERIALS.Supply` | Tracked supply of material components. | Finite nonnegative number (integer or decimal); `0` when no supply is tracked. |

New YAML must state `COMPONENTS.Ritual` explicitly. An explicit boolean takes precedence over the legacy `Method: ritual` implication. Older YAML with an omitted, null, or `n/a` Ritual field retains that legacy inference.

### **Activation Types**
| Type | Description |
|------|-------------|
| `action` | Action |
| `bonus` | Bonus Action |
| `reaction` | Reaction |
| `minute` | Minutes (use Value for count) |
| `hour` | Hours (use Value for count) |
| `day` | Days |
| `special` | Special |

### **Range Units**
| Unit | Description |
|------|-------------|
| `self` | Self (no range value needed) |
| `touch` | Touch |
| `spec` | Special |
| `any` | Unlimited / Any distance |
| `ft` | Feet |
| `mi` | Miles |
| `m` | Meters |
| `km` | Kilometers |

### **Duration Units**
| Unit | Description |
|------|-------------|
| `inst` | Instantaneous |
| `spec` | Special |
| `turn` | Turn |
| `round` | Rounds |
| `minute` | Minutes |
| `hour` | Hours |
| `day` | Days |
| `month` | Months |
| `year` | Years |
| `disp` | Until dispelled |
| `dstr` | Until dispelled or triggered |
| `perm` | Permanent |

### **Target Types**
| Type | Description |
|------|-------------|
| `self` | Self |
| `ally` | Ally |
| `enemy` | Enemy |
| `creature` | Any creature |
| `object` | Object |
| `space` | Space/point |
| `creatureOrObject` | Creature or Object |
| `any` | Any target |
| `willing` | Willing creature |

### **Area Shapes**
| Shape | Description |
|-------|-------------|
| `cone` | Cone |
| `cube` | Cube |
| `cylinder` | Cylinder |
| `radius` | Emanation around the caster |
| `ring` | Ring; `Width` is its thickness |
| `line` | Line |
| `sphere` | Sphere |
| `circle` | Circle |
| `square` | Square |
| `wall` | Wall |

### **Area Advanced Fields**
| Field | Description | Example |
|-------|-------------|---------|
| `Count` | Number of separate template areas | *Conjure Animals* (multiple zones) |
| `Width` | Width of the area (for line/wall shapes) | *Wall of Fire* width |
| `Height` | Height of the area (for cylinder/wall shapes) | *Cloudkill* height |
| `Contiguous` | Whether multiple templates must be adjacent | `true` or `false` |

These fields are optional and only needed for spells with unusual area geometry. Most spells only need `Shape`, `Size`, and `Units`.

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
| `recoverAll` | n/a | Regain all uses |
| `loseAll` | n/a | Lose all remaining uses |
| `formula` | Dice (e.g., `1d4+1`) | Regain rolled amount |
| `formula` | Number (e.g., `5`) | For recharge: regain all on d6 ≥ 5 |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save dex]]                          → [Dexterity]
[[/save dex 15]]                       → [DC 15 Dexterity]
[[/save dex dc=@spell.dc]]             → [DC {spell DC} Dexterity]
[[/save dex 15 format=long]]           → [DC 15 Dexterity] saving throw
[[/save str dex 15]]                   → [DC 15 Strength or Dexterity]
[[/save]]                              → Auto-links to item's save activity
```

### **Concentration Saves**
```html
[[/concentration]]                     → [Concentration]
[[/concentration 10]]                  → [DC 10 Concentration]
[[/concentration ability=cha]]         → Uses Charisma instead of default
```

### **Damage Rolls**
```html
[[/damage 8d6 fire]]                   → [8d6] fire
[[/damage 8d6 fire average]]           → 28 (8d6) fire
[[/damage 8d6 fire format=long]]       → [8d6] fire damage
[[/damage 2d6 fire & 1d6 necrotic average]]  → 7 (2d6) fire plus 3 (1d6) necrotic
[[/damage 1d10 bludgeoning slashing]]  → Choice of damage type on roll
[[/damage 1d6 + @mod fire average]]    → Includes ability modifier
[[/damage]]                            → Auto-links to item's damage activity
[[/damage twoHanded]]                  → Uses two-handed attack mode
[[/damage format=extended]]            → "Hit: [Xd6] fire damage" (NPC statblocks)
```

### **Healing**
```html
[[/heal 2d8 + @mod]]                   → [2d8 + @mod] healing
[[/heal 2d8 + @mod average]]           → 9 + MOD (2d8 + @mod) healing
[[/heal 10 temp]]                      → [10] temporary hit points
[[/heal]]                              → Auto-links to item's heal activity
```

### **Attack Rolls**
```html
[[/attack]]                            → Auto-links to item's attack activity
[[/attack +5]]                         → Fixed +5 to hit (traps, etc.)
[[/attack extended]]                   → "Melee Attack Roll: [+X], reach 15 ft"
[[/attack 5 thrown]]                   → Uses thrown attack mode
```

### **Ability/Skill Checks**
```html
[[/check dex]]                         → [Dexterity]
[[/check dex 15]]                      → [DC 15 Dexterity]
[[/check dex 15 format=long]]          → [DC 15 Dexterity] check
[[/check perception]]                  → [Wisdom (Perception)]
[[/check str athletics 15]]            → [DC 15 Strength (Athletics)]
[[/check acrobatics athletics 15]]     → Choice of skill
[[/check perception 15 passive format=long]] → passive Wisdom (Perception) score of 15 or higher
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip & link)
&Reference[blinded]                    → Blinded
&Reference[restrained]                 → Restrained
&Reference[incapacitated]              → Incapacitated
&Reference[Difficult Terrain]          → Difficult Terrain
&Reference[prone apply=false]          → No "apply condition" button
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @name lowercase]]             → creature's name
[[lookup @details.type.config.label]]  → Creature type (e.g., "Fiend")
[[lookup @abilities.con.mod]]          → Constitution modifier
[[lookup @spell.dc]]                   → Spell save DC
[[lookup @name]]{the creature}         → Fallback text if no actor
```

---

## **HTML PATTERNS**

### **Flavor Text Block**
```html
<p><em>Descriptive flavor text in italics...</em></p>
<hr>
```

### **Blockquote for Lore**
```html
<blockquote>"A mystical quote or ancient saying."</blockquote>
```

### **Standard Effect Block**
```html
<p>Each creature in the area must make a [[/save dex dc=@spell.dc format=long]]. On a failed save, a creature takes [[/damage 8d6 fire average]] and is &Reference[prone]. On a successful save, a creature takes half damage and isn't knocked prone.</p>
```

### **Bulleted Mechanics (Complex Spells)**
```html
<ul>
<li><strong>Save:</strong> [[/save con dc=@spell.dc]]</li>
<li><strong>Damage:</strong> [[/damage 6d10 force average]]</li>
<li><strong>Failure:</strong> Target is &Reference[restrained] until the start of [[lookup @name]]{the creature}'s next turn.</li>
<li><strong>Success:</strong> Half damage, no additional effects.</li>
</ul>
```

### **Higher Levels Section**
```html
<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When [[lookup @name]]{the creature} casts this spell using a spell slot of Xth level or higher, the damage increases by [[/damage 1d6 fire]] for each slot level above X.</p>
</section>
```

### **Concentration Reminder**
```html
<p><strong>Maintaining Concentration.</strong> If [[lookup @name]]{the creature} takes damage while concentrating on this spell, they must succeed on a [[/concentration]] saving throw or the spell ends.</p>
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
