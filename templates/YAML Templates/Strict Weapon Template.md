# Strict Weapon Item authoring reference

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 2` and the `WEAPON` root.

Item Importer alone supports core fields. Activity/effect attachments require the optional Activity Importer; use its matching templates. Free/core is the default when companion availability is unknown. Loot/Container accept passive effects only.

Read the [generation guide](../README.md) and [authoring rules and validation](../../docs/template-authoring.md) with this file. Explicit field contracts target D&D5e 5.3.3 / Foundry 14.367; MIDI annotations, when used, target MIDI-QOL 14.0.9. Package versions and YAML versions are separate.

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

The first YAML block is a **complete field reference**, not a ready-made item to import unchanged. Placeholders describe choices, not default values. Later examples contain concrete values.

Missing, `null`, `false`, `0`, `""`, `[]` and `{}` are distinct. Use `n/a` only for fields that document it as an unset marker. Never use it as a universal substitute for null or empty data. `CHANGES.Value` retains its YAML type, including the literal text `n/a`. Formula syntax acceptance does not establish that referenced variables exist.

For new physical Items, ordinary defaults are quantity 1, identified true, equipped false and zero unspecified price/weight. Omit unsupplied rarity, attunement restrictions and optional resources rather than inventing them. Formula Uses Max must be deterministic, one line and at most 200 characters, without dice or semicolons; recovery needs a positive literal maximum or a formula maximum.

## Complete field reference

```yaml
SCHEMA_VERSION: 2
WEAPON:
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
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Weapon Type: "[simpleM|simpleR|martialM|martialR|natural|improv|siege]"
    Base Weapon: "[e.g. longsword, dagger, bow - see list below - OR n/a]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|Mg]"

  PROPERTIES:
    NPC Equipment: false # Native gear property; shown for NPC inventory.
    Adamantine: "[true|false]"
    Ammunition: "[true|false]"
    Finesse: "[true|false]"
    Firearm: "[true|false]"
    Focus: "[true|false]"
    Heavy: "[true|false]"
    Light: "[true|false]"
    Loading: "[true|false]"
    Magical: "[true|false]"
    Reach: "[true|false]" # Property checkbox; the distance is RANGE.Reach.
    Reload: "[true|false]"
    Returning: "[true|false]"
    Silvered: "[true|false]"
    Special: "[true|false]"
    Thrown: "[true|false]"
    Two-Handed: "[true|false]"
    Versatile: "[true|false]"

  ATTUNEMENT:
    Attuned: false # Current state, independent of Attunement requirement.
    # Store independently of Magical; a bonus does not enable an explicit false property.
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]" # Importer metadata; ignored when Attunement is none.
    Magic Bonus: "[formula|n/a]" # Deterministic formula, e.g. "@prof"; no dice.

  AMMUNITION:
    # Select for Ammunition; preserve a supplied selection when the property is false.
    Ammunition Type: "[arrow|crossbowBolt|firearmBullet|slingBullet|energyCell|blowgunNeedle]"

  RELOAD:
    # Compatibility metadata only; no native reload amount or automation.
    # Optional legacy metadata, even when Reload is true.
    Reload Amount: "[integer]"

  VERSATILE_DAMAGE:
    DAMAGE_DATA:
      Dice Count: "[integer|null]" # Nonnegative integer; null means no dice count.
      Die Denomination: "[integer|null]" # Sheet dice: 4, 6, 8, 10, 12, 20, 100; or null.
      Bonus: "[formula|n/a]"
      Damage Types: [] # Native damage type IDs; e.g. [piercing, fire].
      Custom Enabled: false
      Custom Formula: "[formula|n/a]" # Retained even when Custom Enabled is false.
      Scaling Mode: "[none|whole|half]"
      Scaling Dice Count: "[integer|null]" # Default 1 if omitted; retain explicit 0 or null.
      Scaling Formula: "[formula|n/a]" # Retained even when Scaling Mode is none.
    # Used when Versatile is true; preserve supplied damage when the property is false.

  SIEGE_PROPERTIES:
    Crew Capacity: 0
    Speed: "[integer|null]" # Nonnegative integer; no formula.
    Speed Units: "[ft|mi|m|km]"
    Speed Conditions: "[text|n/a]"
    # Shown for siege weapons; preserve supplied mountable settings on other types.
    Siege Armor Class: "[integer|null]" # Nonnegative integer or native null.
    Cover: "[none|half|threequarters|total|number|null]" # Numeric cover is 0..1.
    Hit Points Current: "[integer|null]" # Nonnegative integer, or native null.
    Hit Points Max: "[integer|null]" # Nonnegative integer, or native null.
    Hit Points Threshold: "[integer|null]" # Nonnegative integer, or native null.
    Health Conditions: "[text|n/a]"

  RANGE:
    Reach: "[number|null]" # Nonnegative decimal distance; no formula.
    Range Normal: "[number|null]" # Nonnegative decimal distance; no formula.
    Range Long: "[number|null]" # Nonnegative decimal distance; no formula.
    Range Units: "[ft|m|sq|mi]"

  DAMAGE:
    DAMAGE_DATA:
      Dice Count: "[integer|null]" # Nonnegative integer; null means no dice count.
      Die Denomination: "[integer|null]" # Sheet dice: 4, 6, 8, 10, 12, 20, 100; or null.
      Bonus: "[formula|n/a]"
      Damage Types: [] # Native damage type IDs; e.g. [piercing, fire].
      Custom Enabled: false
      Custom Formula: "[formula|n/a]" # Retained even when Custom Enabled is false.
      Scaling Mode: "[none|whole|half]"
      Scaling Dice Count: "[integer|null]" # Default 1 if omitted; retain explicit 0 or null.
      Scaling Formula: "[formula|n/a]" # Retained even when Scaling Mode is none.

  MASTERY:
    Mastery: "[cleave|graze|nick|push|sap|slow|topple|vex|n/a]"

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
  #   - Period: "[lr|sr|day|dawn|dusk|recharge]"
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

Use DAMAGE.DAMAGE_DATA for the parent weapon's base damage and VERSATILE_DAMAGE.DAMAGE_DATA for its two-handed alternative. A weapon attack with Include Base Damage:true already uses the parent base; do not duplicate that damage in extra parts. Keep Magic Bonus separate from additional dice. For mixed types in one custom base formula, bracket each term's type and supply a primary Damage Types entry for system-added bonuses. Store siege/ammunition settings only when supplied; their presence does not enable the corresponding property. Reload Amount is compatibility metadata with a warning, not native reload automation.


## Concrete example

A free/core weapon import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 2
WEAPON:
  ITEM:
    Name: Longsword +1
    Rarity: uncommon
    Weapon Type: martialM
    Base Weapon: longsword
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 500
    Price Denomination: gp
    Weight Value: 3
    Weight Units: lb
  PROPERTIES:
    Magical: true
    Versatile: true
  ATTUNEMENT:
    Attunement: required
    Magic Bonus: 1
  RANGE:
    Reach: 5
  DAMAGE:
    DAMAGE_DATA:
      Dice Count: 1
      Die Denomination: 8
      Bonus: ""
      Damage Types:
        - slashing
      Custom Enabled: false
      Custom Formula: ""
      Scaling Mode: none
      Scaling Dice Count: 0
      Scaling Formula: ""
  VERSATILE_DAMAGE:
    DAMAGE_DATA:
      Dice Count: 1
      Die Denomination: 10
      Bonus: ""
      Damage Types:
        - slashing
      Custom Enabled: false
      Custom Formula: ""
      Scaling Mode: none
      Scaling Dice Count: 0
      Scaling Formula: ""
  MASTERY:
    Mastery: sap
  DESCRIPTION:
    Description: |
      You have a +1 bonus to attack and damage rolls made with this magic weapon.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-weapon.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

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
                Custom Enabled: false
                Custom Formula: ""
                Scaling Mode: none
                Scaling Dice Count: 1
                Scaling Formula: ""
        APPLIED_EFFECTS: []
```

---

## **FIELD REFERENCE**

### **Weapon Types**
| Type | Description |
|------|-------------|
| `simpleM` | Simple Melee Weapon |
| `simpleR` | Simple Ranged Weapon |
| `martialM` | Martial Melee Weapon |
| `martialR` | Martial Ranged Weapon |
| `natural` | Natural Weapon (claws, bite, etc.) |
| `improv` | Improvised Weapon |
| `siege` | Siege Weapon |

### **Base Weapons - Melee**
| Simple | Martial |
|--------|---------|
| `club`, `dagger`, `greatclub`, `handaxe`, `javelin`, `lighthammer`, `mace`, `quarterstaff`, `sickle`, `spear` | `battleaxe`, `flail`, `glaive`, `greataxe`, `greatsword`, `halberd`, `lance`, `longsword`, `maul`, `morningstar`, `pike`, `rapier`, `scimitar`, `shortsword`, `trident`, `warpick`, `warhammer`, `whip` |

### **Base Weapons - Ranged**
| Simple | Martial |
|--------|---------|
| `dart`, `lightcrossbow`, `shortbow`, `sling` | `blowgun`, `handcrossbow`, `heavycrossbow`, `longbow`, `net` |

### **Weapon Mastery Properties (2024)**
| Mastery | Effect |
|---------|--------|
| `cleave` | Hit another creature within 5 ft for ability mod damage |
| `graze` | Deal ability mod damage on a miss |
| `nick` | Make extra attack with light weapon as part of Attack action |
| `push` | Push Large or smaller creature 10 ft away |
| `sap` | Disadvantage on target's next attack roll |
| `slow` | Reduce target's speed by 10 ft until your next turn |
| `topple` | Target must make Con save or fall prone |
| `vex` | Advantage on next attack against same target |

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

---

## **ENRICHER REFERENCE**

### **Attack Rolls**
```html
[[/attack]]                            → Auto-links to weapon's attack activity
[[/attack +7]]                         → Fixed +7 to hit
[[/attack extended]]                   → "Melee Attack Roll: [+X], reach 5 ft"
[[/attack thrown]]                     → Uses thrown attack mode
[[/attack twoHanded]]                  → Uses two-handed attack mode
```

### **Damage Rolls**
```html
[[/damage 2d6 slashing]]               → [2d6] slashing
[[/damage 2d6 slashing average]]       → 7 (2d6) slashing
[[/damage 1d8 + @mod slashing]]        → Includes ability modifier
[[/damage 2d6 slashing & 1d6 fire average]] → Multiple damage types
[[/damage]]                            → Auto-links to weapon's damage activity
[[/damage twoHanded]]                  → Uses two-handed damage
[[/damage format=extended]]            → "Hit: [2d6] slashing damage"
```

### **Saving Throws**
```html
[[/save str 15]]                       → [DC 15 Strength]
[[/save dex 14 format=long]]           → [DC 14 Dexterity] saving throw
[[/save con dc=@abilities.str.dc]]     → Uses wielder's Strength DC
[[/save con dc=8+@prof+@abilities.str.mod]] → Calculated DC
```

### **Healing**
```html
[[/heal 2d6]]                          → [2d6] healing
[[/heal 2d6 average]]                  → 7 (2d6) healing
[[/heal 10 temp]]                      → [10] temporary hit points
```

### **Ability Checks**
```html
[[/check athletics 15]]                → [DC 15 Strength (Athletics)]
[[/check acrobatics 13 format=long]]   → [DC 13 Dexterity (Acrobatics)] check
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip)
&Reference[restrained]                 → Restrained
&Reference[frightened]                 → Frightened
&Reference[paralyzed]                  → Paralyzed
&Reference[stunned]                    → Stunned
&Reference[poisoned]                   → Poisoned
&Reference[blinded]                    → Blinded
&Reference[grappled]                   → Grappled
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Wielder's name
[[lookup @abilities.str.mod]]          → Strength modifier
[[lookup @attributes.prof]]            → Proficiency bonus
```

---

## **HTML PATTERNS**

### **Standard Magic Weapon**
```html
<p><em>Brief flavor description of the weapon's appearance.</em></p>
<hr>

<p>You have a +X bonus to attack and damage rolls made with this magic weapon.</p>
```

### **Extra Damage on Hit**
```html
<p><strong>Elemental Strike.</strong> When [[lookup @name]]{the creature} hits with this weapon, the target takes an extra [[/damage 1d6 fire average]].</p>
```

### **On-Hit Save Effect**
```html
<p><strong>Venomous.</strong> When [[lookup @name]]{the creature} hits a creature with this weapon, the target must succeed on a [[/save con 14 format=long]] or become &Reference[poisoned] for 1 minute. The creature can repeat the save at the end of each of its turns, ending the effect on a success.</p>
```

### **Charge-Based Abilities**
```html
<p>This weapon has X charges. While holding it, [[lookup @name]]{the creature} can expend charges to use the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The weapon regains 1d4 + 1 expended charges daily at dawn.</p>
```

### **Critical Hit Enhancement**
```html
<p><strong>Devastating Critical.</strong> When [[lookup @name]]{the creature} scores a critical hit with this weapon, they can roll one additional weapon damage die when determining the extra damage.</p>
```

### **Sentient Weapon**
```html
<p><strong>Sentience.</strong> This weapon is sentient with Intelligence X, Wisdom Y, and Charisma Z. It has hearing and darkvision out to 60 feet. It can communicate telepathically with its wielder and speaks [languages].</p>

<p><strong>Personality.</strong> [Description of the weapon's personality, goals, and potential conflicts.]</p>
```

---


## Explicit fields in Item YAML schema 2

Verification target: D&D5e 5.3.3 / Foundry 14.367. Item YAML versions 0 and 1 remain accepted in memory. Complete field mappings, conditions, defaults, exclusions, and tests are recorded in [the field coverage reference](../../docs/explicit-yaml-v2.md).

| Field | Stored value / default |
|---|---|
| ITEM.Icon | Native image path. A supplied path takes priority over automatic icon selection. |
| ITEM.Identifier / ITEM.Sort | Native identifier / integer ordering value; zero is valid. |
| SOURCE.Book, Page, Custom, License, Rules, Revision | Native source information. Revision is numeric (default 1); page is text. |
| ATTUNEMENT.Attuned | Current item state, separate from the attunement requirement. Applies to equippable types, including Container. Default false. |
| Formula fields | Preserve the complete formula string. Numeric fields reject expressions and fractional values when the native field requires integers. |
| Inactive controls | Retain supplied values without enabling the controlling property or override. Omit a conditional section only when no stored settings need preservation. |

DAMAGE_DATA is the canonical damage representation for Weapon base/versatile damage and Consumable damage. It preserves Dice Count, Die Denomination, Bonus, the Damage Types list, Custom Enabled, Custom Formula, Scaling Mode, Scaling Dice Count, and Scaling Formula. Dice values are nonnegative integers or null; formulas are strings; Custom Enabled defaults false; Scaling Mode defaults none. An inactive custom formula and inactive structured damage remain stored together. Do not combine populated legacy damage shorthand with DAMAGE_DATA. Legacy formula/type labels remain accepted on input. Consumable DAMAGE.Replace defaults false; old ammunition Damage Replace remains an alias.

Additional controls apply by item type: Tool PROPERTIES.Focus; Loot ITEM.Loot Subtype; siege/vehicle Crew Capacity, Speed, Speed Units, and Speed Conditions. Weapon reach and ranges accept native decimals. RELOAD.Reload Amount is private metadata in flags.5e-item-importer.reloadAmount, with no native reload automation.

Spell PREPARATION.Prepared exports unprepared/prepared/always and accepts native 0/1/2 or legacy booleans. Source Item stores the spellcasting source identifier. RANGE.Special, DURATION.Special, and AREA.Stationary retain their native values. Range, duration, target count, and every area dimension/count accept formulas. Material settings remain stored when Material is false.
