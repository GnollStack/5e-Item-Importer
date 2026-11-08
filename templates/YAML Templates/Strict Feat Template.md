# Strict Feat Item authoring reference

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 6` and the `FEAT` root.

Item Importer alone supports core fields. Activity/effect attachments require the optional Activity Importer; use its matching templates. Free/core is the default when companion availability is unknown. Features accept activities and passive effects.

Read the [generation guide](../README.md) and [authoring rules and validation](../../docs/template-authoring.md) with this file. Explicit field contracts target D&D5e 6.0.6 / Foundry 14.369; MIDI/DAE annotations, when used, target the reviewed MIDI-QOL 14.6.8 and DAE 14.6.6 integrations. Package versions and YAML versions are separate.

## Generate or preserve

**Create from a description:** include fields needed for the stated mechanics and any explicitly supplied settings. Omit unrelated optional sections. Do not populate every placeholder or copy example values into a different feature. Ask for missing information that changes the mechanics or a required reference; use a documented default only when it does not change the source intent. Invent mechanics only when the user explicitly requests homebrew design.

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

The first YAML block is the **native field reference**, not a ready-made feature to import unchanged. Placeholders describe choices, not default values. Later examples contain concrete values. The separate [schema 4 automation reference](../../docs/automation-schema-4.md) defines reviewed typed integration fields. Do not combine canonical AUTOMATION with legacy MIDI/DAE sections in one Activity or Effect.

Missing, `null`, `false`, `0`, `""`, `[]` and `{}` are distinct. Use `n/a` only for fields that document it as an unset marker. Never use it as a universal substitute for null or empty data. `CHANGES.Value` retains its YAML type, including the literal text `n/a`. Formula syntax acceptance does not establish that referenced variables exist.

A feature is not a physical Item: it has no quantity, price, weight, rarity, attunement or unidentified text. Omit unsupplied prerequisites, enchantment limits and optional resources rather than inventing them. Formula Uses Max must be deterministic, one line and at most 200 characters, without dice or semicolons; recovery needs a positive literal maximum or a formula maximum.

## Complete field reference

```yaml
SCHEMA_VERSION: 6
FEAT:
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
    Feature Type: "[background|class|monster|race|enchantment|feat|pietyTrait|supernaturalGift|vehicle|n/a]" # n/a stores a blank type.
    Feature Subtype: "[subtype identifier|n/a]" # Only class, enchantment, feat and supernaturalGift define subtypes.
    Requirements: "[text|n/a]" # Free text shown on the sheet, for example "Fighter 1" or "Level 4+".

  PREREQUISITES:
    Level: "[integer|n/a]" # Minimum character level for the feat picker; n/a stores null.
    Items: [] # List of "identifier" or "type:identifier" entries, for example [fighter, "feat:alert"].
    Repeatable: "[true|false]"

  PROPERTIES:
    Magical: "[true|false]"
    Passive Trait: "[true|false]"

  ENCHANTMENT:
    # Stored for every feature; the sheet shows these controls only for an
    # enchantment source (artificerInfusion or rune subtype).
    Max: "[formula|n/a]" # Deterministic maximum number of active enchantments.
    Period: "[sr|lr|atwill|n/a]" # Replacement period; n/a stores Never.

  VEHICLE_PROPERTIES:
    # Cover is shown only for vehicle features; both values are retained otherwise.
    Cover: "[none|half|threequarters|total|0..1|n/a]"
    Crewed: "[true|false]"

  USAGE:
    # Uses Spent = number of uses ALREADY CONSUMED (0 means all uses are available).
    # Uses Max = maximum count or deterministic formula, e.g. "@prof" (no dice).
    # Example: A feature usable twice per rest with one use spent → Uses Spent: 1, Uses Max: 2
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|formula|n/a]"

  # Optional, repeatable. Use [] when there is no recovery.
  # With a positive Uses Max or a formula maximum, replace [] with entries shaped like:
  #   - Period: "[lr|sr|day|dawn|dusk|recharge|initiative|turnStart|turnEnd|turn]"
  #     Type: "[recoverAll|loseAll|formula]"
  #     Formula: "[formula|n/a]" # Required for Type formula; recharge uses a 2..6 threshold.
  RECOVERY: []

  # Optional, repeatable. One root key per entry; omit the list when the feature
  # grants nothing. Referenced documents resolve by UUID, Name or Identifier; the
  # import window shows a drop zone for anything missing or ambiguous, and import
  # waits until every reference resolves. HitPoints, Size and Subclass belong to
  # classes and species and are rejected here.
  ADVANCEMENT:
    - ABILITY_SCORE_IMPROVEMENT:
        Advancement ID: n/a # Optional 16-character stable ID; omit to allocate one.
        Level: 0 # 0 = any level (the feat default).
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        Points: "[integer]" # Free points the player assigns.
        Cap: "[integer]" # Maximum increase to one ability (native default 2).
        Max: "[integer|n/a]" # Maximum resulting score; n/a keeps the native 20.
        Locked: [] # Ability identifiers that cannot receive points.
        FIXED:
          - Ability: "[str|dex|con|int|wis|cha]"
            Value: "[integer]"
        RECOMMENDATION: # Optional recommended feat (epic boon boons).
          UUID: "[uuid|n/a]"
          Name: "[text|n/a]"
          Identifier: "[text|n/a]"
    - GRANT_ITEMS:
        Advancement ID: n/a
        Level: 0
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        Optional: "[true|false]" # Let the player decline the grant.
        Sorting: "[a|m]" # a = alphabetical, m = manual (Sort values).
        ITEMS:
          - UUID: "[uuid|n/a]"
            Name: "[text|n/a]"
            Identifier: "[text|n/a]"
            Type: "[feat|spell|consumable|container|equipment|loot|tool|weapon|n/a]"
            Optional: "[true|false]"
            Sort: 0
        SPELL: # Optional spell configuration for granted spells.
          Ability: [] # Spellcasting ability identifiers.
          Method: "[atwill|innate|ritual|pact|spell|n/a]"
          Prepared: "[unprepared|prepared|always]"
          Uses Max: "[formula|n/a]"
          Uses Per: "[lr|sr|day|dawn|dusk|recharge|initiative|turnStart|turnEnd|turn|n/a]"
          Require Slot: "[true|false]"
    - CHOOSE_ITEMS:
        Advancement ID: n/a
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        Allow Drops: "[true|false]"
        Sorting: "[a|m]"
        Type: "[feat|spell|consumable|container|equipment|loot|tool|weapon|n/a]"
        CHOICES:
          - Level: "[integer]"
            Count: "[integer]"
            Replacement: "[true|false]"
        POOL:
          - UUID: "[uuid|n/a]"
            Name: "[text|n/a]"
            Identifier: "[text|n/a]"
            Type: "[feat|spell|consumable|container|equipment|loot|tool|weapon|n/a]"
            Sort: 0
        RESTRICTION:
          Level: "[text|n/a]" # Spell level restriction such as available or 1.
          List: [] # Spell list identifiers such as class:wizard.
          School: [] # Spell school identifiers.
          Type: "[text|n/a]"
          Subtype: "[text|n/a]"
        SPELL:
          Ability: []
          Method: "[atwill|innate|ritual|pact|spell|n/a]"
          Prepared: "[unprepared|prepared|always]"
          Uses Max: "[formula|n/a]"
          Uses Per: "[lr|sr|day|dawn|dusk|recharge|initiative|turnStart|turnEnd|turn|n/a]"
          Require Slot: "[true|false]"
    - MODIFY_ITEMS:
        Advancement ID: n/a
        Level: 0
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        CHANGES:
          - Effect ID: n/a # An enchantment effect defined in this feature's effects list.
            EFFECT: # Or a standalone compendium ActiveEffect.
              UUID: "[uuid|n/a]"
              Name: "[text|n/a]"
            Identifiers: [] # Item identifiers the change applies to, e.g. ["weapon:longsword"].
    - SCALE_VALUE:
        Advancement ID: n/a
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        Identifier: "[text]" # The @scale key, e.g. storm-dice.
        Type: "[string|number|cr|dice|distance|usage]"
        Distance Units: "[ft|mi|m|km|n/a]" # distance type only.
        SCALE:
          - Level: "[integer]"
            Value: "[text|number|n/a]" # string, number, cr, distance and usage types.
            Dice Count: "[integer|null|n/a]" # dice type.
            Die Denomination: "[integer|n/a]" # dice type.
            Modifiers: [] # dice type, e.g. [min2].
            Period: "[lr|sr|day|dawn|dusk|recharge|initiative|turnStart|turnEnd|turn|n/a]" # usage type.
    - TRAIT:
        Advancement ID: n/a
        Level: 0
        Name: "[text|n/a]"
        Hint: "[text|n/a]"
        Icon: "[filepath|n/a]"
        Class Restriction: "[primary|secondary|n/a]"
        Mode: "[default|expertise|forcedExpertise|upgrade|mastery]"
        Allow Replacements: "[true|false]"
        Grants: [] # Trait keys such as skills:ath, weapon:mar, armor:hvy, languages:*.
        CHOICES:
          - Count: "[integer]"
            Pool: [] # Trait keys the player may choose from; empty = any.

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

```

## Configuration rules

This is a native Feature Item, not a physical inventory item: rarity, quantity, price, weight, attunement and unidentified-description fields are not feature authoring controls and are ignored with a warning. Feature Type and Feature Subtype are dnd5e identifiers, not display labels; unknown values are stored with a warning and the sheet shows them as a generic Feature. Advancement is authored through the `ADVANCEMENT` list: ability score improvements, granted items, item choices, item changes, scale values and traits. Referenced Items and effects are matched by UUID, name or identifier in the world and compendia; anything missing or ambiguous gets a drop zone in the import window, and import waits until every reference resolves. Enchantment limits matter only for Artificer infusion and Rune Knight rune sources, and Cover only for vehicle features; both are retained for any feature. Source-specific attacks, saves, damage, healing and effects require companion attachments in full output.


## Concrete example

A free/core class feature import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 6
FEAT:
  ITEM:
    Name: Second Wind
    Feature Type: class
    Feature Subtype: n/a
    Requirements: Fighter 1
  PREREQUISITES:
    Level: n/a
    Items: []
    Repeatable: false
  PROPERTIES:
    Magical: false
    Passive Trait: false
  USAGE:
    Uses Spent: 0
    Uses Max: 1
  RECOVERY:
    - Period: sr
      Type: recoverAll
  DESCRIPTION:
    Description: >
      <p>You have a limited well of stamina that you can draw on to protect yourself from harm.
      On your turn, you can use a bonus action to regain hit points equal to
      [[/heal 1d10 + @classes.fighter.levels]].</p>

      <p>Once you use this feature, you must finish a short or long rest before you can use it again.</p>
  CHAT_FLAVOR:
    Chat Description: |
      n/a
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-feat.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Compatibility and support

Use canonical keys in new YAML. Native schema choices, sheet choices and importer coverage can differ. Unknown fields are not generic YAML extension points. `ADVANCEMENT` accepts the six feat-valid advancement types; HitPoints, Size and Subclass belong to classes and species and are rejected.

Full Item export needs companion serializers for its attachments; unsupported attachments can block full export. Keep source rules in descriptions for manual mechanics.

## Detailed field and text reference

## OPTIONAL ACTIVITIES AND ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct attack, saving throw, damage, healing, or condition activities. The importer does not generate those mechanics from strict YAML description text. dnd5e creates no default activity for a feature.

For a functional feature with source-defined rolls or effects, include the appropriate `Activities` and/or `effects` entries when Activity Importer is available for this workflow or the user requests its support. This includes a feature's primary save, damage or healing, not only extra actions. Use the matching complete Activity Importer templates from `modules/5e-activity-importer/templates/Base Activity Templates/`, or the MIDI variants when that automation is intended. Preserve source mechanics, triggers, costs, and scaling; never invent mechanics, UUIDs, macros, or module-specific effect keys. If a rule cannot be represented, retain it in the description for manual resolution.

In free/core mode, or when companion support is unavailable or unspecified, omit these sections and preserve the full rules in the description. The resulting import does not promise automated use of those rules. Do not add empty placeholder entries. Both sections require the companion module to be active at import time.

Append supported sections at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key:
- `Activities` is an array. Each entry contains exactly one `ACTIVITY_*` key and the corresponding activity body. Multiple activities of the same type are separate array entries; do not insert `---` inside this array.
- `effects` is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Use these for passive feature effects such as a flat bonus. Effects applied by an activity belong in that activity's `APPLIED_EFFECTS` array instead; do not duplicate them here.
- For effects on Foundry 14, use DURATION.Value and DURATION.Units; units may be years, months, days, hours, minutes, seconds, rounds, or turns. Use a nonnegative integer Value, or null for no finite duration.

Use canonical string `Change Type` and a status list. Preserve the YAML type of each `CHANGES[].Value`: a number, boolean, string, list, mapping, or null must match the intended change. Do not quote everything. Legacy numeric `Change Mode` and separate duration labels remain accepted input. Optional Activity ID and Effect ID values must contain exactly 16 alphanumeric characters; omit them when stable references are unnecessary.

The completed examples below demonstrate array nesting for a passive +1 AC feature and a healing action. They are illustrative only: include them only if the source actually grants those mechanics, and use the full matching companion template for the requested activity type. For a complete feature with MIDI-QOL automation (a shared use pool, a cone save with an applied condition, a temporary hit point heal and a passive effect), see [full-midi-feat.yaml](../../docs/examples/full-midi-feat.yaml); the native equivalent pattern is [full-native-weapon.yaml](../../docs/examples/full-native-weapon.yaml).

```yaml
  effects:
    - DETAILS:
        Name: "Defense Fighting Style"
        Effect Type: base
        Effect Suspended: false
        Apply Effect to Actor: true
        Status Conditions: []
      EFFECT_DESCRIPTION:
        Effect Description: "Grants +1 AC while wearing armor."
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
    - ACTIVITY_HEAL:
        ACTIVITY:
          Name: "Second Wind"
          Icon: n/a
        ACTIVATION:
          Override Activation: true
          Activation Type: bonus
          Activation Cost: 1
          Condition: n/a
        HEALING:
          Healing Formula: "1d10 + @classes.fighter.levels"
          Healing Type: healing
        APPLIED_EFFECTS: []
```

---

## **FIELD REFERENCE**

### **Feature Types**
`Feature Type` stores the dnd5e `system.type.value` identifier.

| Value | Sheet label | Typical use |
|-------|-------------|-------------|
| `background` | Background Feature | Features granted by a background |
| `class` | Class Feature | Class and subclass features, invocations, metamagic, maneuvers |
| `monster` | Monster Feature | Stat-block traits, actions, legendary actions |
| `race` | Species Feature | Species and lineage traits |
| `enchantment` | Enchantment | Standalone enchantment sources |
| `feat` | Feat | Feats chosen at level-up |
| `pietyTrait` | Piety Trait | Mythic Odysseys of Theros piety traits |
| `supernaturalGift` | Supernatural Gift | Blessings, charms, epic boons granted as gifts |
| `vehicle` | Vehicle Feature | Vehicle actions and traits |
| `n/a` | Feature | No type selected |

### **Feature Subtypes**
`Feature Subtype` stores `system.type.subtype`. Only these types define subtypes; a subtype on another type is stored without a label.

| Feature Type | Subtype values |
|--------------|----------------|
| `class` | `arcaneShot`, `artificerInfusion`, `channelDivinity`, `defensiveTactic`, `eldritchInvocation`, `elementalDiscipline`, `fightingStyle`, `huntersPrey`, `ki`, `maneuver`, `metamagic`, `multiattack`, `pact`, `psionicPower`, `rune`, `superiorHuntersDefense` |
| `enchantment` | `artificerInfusion`, `rune` |
| `feat` | `general`, `origin`, `fightingStyle`, `epicBoon` |
| `supernaturalGift` | `blessing`, `charm`, `epicBoon` |

### **Requirements and Prerequisites**
| Field | Description | Accepted values |
|---|---|---|
| `ITEM.Requirements` | Free text shown beneath the feature name, such as `Fighter 1`, `Level 4+` or `Proficiency with heavy armor`. dnd5e does not derive it from prerequisites. | Text or `n/a`. |
| `PREREQUISITES.Level` | Minimum character level checked by the feat picker. | Non-negative integer or `n/a` (null). |
| `PREREQUISITES.Items` | Items the actor must own, matched by dnd5e identifier. Prefix with an Item document type to narrow the match. | List of `identifier` or `type:identifier` strings, such as `[fighter, "feat:alert"]`. |
| `PREREQUISITES.Repeatable` | Whether the feat can be taken more than once. | `true` or `false`. |

### **Properties**
| Property | dnd5e identifier | Effect |
|---|---|---|
| `Magical` | `mgc` | Marks damage from this feature's activities as magical. |
| `Passive Trait` | `trait` | Lists the feature under passive traits on character and NPC sheets. |

### **Enchantment Limits**
| Field | Description | Accepted values |
|---|---|---|
| `ENCHANTMENT.Max` | Maximum number of active enchantments from this source. | Deterministic formula or `n/a`. |
| `ENCHANTMENT.Period` | When replaced enchantments can be swapped. | `sr` (Short Rest), `lr` (Long Rest), `atwill` (At Will) or `n/a` (Never). |

### **Vehicle Properties**
| Field | Description | Accepted values |
|---|---|---|
| `VEHICLE_PROPERTIES.Cover` | Cover granted to crew by a vehicle feature. | `none`, `half`, `threequarters`, `total`, a number from 0 to 1, or `n/a`. |
| `VEHICLE_PROPERTIES.Crewed` | Stored native flag; dnd5e 6.0.6 has no sheet control for it. | `true` or `false`. |

### **Advancement**
`ADVANCEMENT` is a list; each entry has exactly one root key. Entries share the common keys below and are stored under `system.advancement`, keyed by their ID.

| Common key | Description | Accepted values |
|---|---|---|
| `Advancement ID` | Stable 16-character ID; omit (`n/a`) to allocate one. | 16 alphanumeric characters or `n/a`. |
| `Level` | Character level at which the advancement applies; `0` means any level. Not used by `CHOOSE_ITEMS` and `SCALE_VALUE`, which take levels from their entries. | Non-negative integer. |
| `Name`, `Hint`, `Icon` | Optional display name, HTML hint and icon path. | Text, HTML, file path or `n/a`. |
| `Class Restriction` | Limits the advancement to a primary or secondary class. | `primary`, `secondary` or `n/a`. |

| Root | dnd5e type | Keys |
|---|---|---|
| `ABILITY_SCORE_IMPROVEMENT` | AbilityScoreImprovement | `Points` (free points), `Cap` (max increase per ability, default 2), `Max` (max resulting score), `Locked` (ability identifiers that cannot receive points), `FIXED` (list of `Ability`/`Value` increases), `RECOMMENDATION` (a feat reference for epic boons). |
| `GRANT_ITEMS` | ItemGrant | `Optional`, `Sorting` (`a` alphabetical or `m` manual), `ITEMS` (references with `Optional` and `Sort`), `SPELL` (spell configuration). |
| `CHOOSE_ITEMS` | ItemChoice | `Allow Drops`, `Sorting`, `Type` (Item type the player may choose), `CHOICES` (list of `Level`/`Count`/`Replacement`), `POOL` (references with `Sort`), `RESTRICTION` (`Level`, `List`, `School`, `Type`, `Subtype`), `SPELL`. |
| `MODIFY_ITEMS` | ModifyItem | `CHANGES`: each entry names an `Effect ID` (an enchantment effect in this feature's `effects` list) or an `EFFECT` reference to a standalone compendium ActiveEffect, plus the `Identifiers` of the Items it changes. |
| `SCALE_VALUE` | ScaleValue | `Identifier` (the `@scale.<feature>.<identifier>` key), `Type` (`string`, `number`, `cr`, `dice`, `distance`, `usage`), `Distance Units`, `SCALE` (list of `Level` entries: `Value` for most types; `Dice Count`, `Die Denomination`, `Modifiers` for dice; `Value` and `Period` for usage). |
| `TRAIT` | Trait | `Mode` (`default`, `expertise`, `forcedExpertise`, `upgrade`, `mastery`), `Allow Replacements`, `Grants` (trait keys), `CHOICES` (list of `Count`/`Pool`). |

**References** (`ITEMS`, `POOL`, `RECOMMENDATION`, `EFFECT`) accept `UUID`, `Name`, `Identifier` and, for Items, `Type`. A UUID is validated as written. Otherwise a single world or compendium document matching the name (or identifier) resolves automatically; several matches or none produce a drop zone in the import window, and a dropped document always overrides the automatic choice. Advancement UUIDs must point at world or compendium documents, not Items embedded in an Actor.

**Spell configuration** (`SPELL`): `Ability` lists spellcasting ability identifiers; `Method` is `atwill`, `innate`, `ritual`, `pact` or `spell`; `Prepared` is `unprepared`, `prepared` or `always`; `Uses Max`/`Uses Per`/`Require Slot` give the granted spells their own uses.

**Trait keys** use `<trait>:<category>[:<child>]`: traits are `saves`, `skills`, `languages`, `armor`, `weapon`, `tool`, `di`, `dr`, `dv`, `ci` and `dm`; `*` and `ALL` are wildcards. Categories use dnd5e identifiers (`weapon:sim`, `weapon:mar`, `armor:lgt`, `armor:med`, `armor:hvy`, `armor:shl`, `tool:art`); the parser warns when it sees the spelled-out names instead.

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
[[/save con dc=8+@prof+@abilities.con.mod format=long]] → [DC {computed} Constitution] saving throw
[[/save]]                              → Auto-links to the feature's save activity
```

### **Damage and Healing**
```html
[[/damage 2d6 fire]]                   → [2d6] fire
[[/damage 2d6 fire average]]           → 7 (2d6) fire
[[/damage]]                            → Auto-links to the feature's damage activity
[[/heal 1d10 + @classes.fighter.levels]] → [1d10 + fighter level] healing
[[/heal 5 temp]]                       → [5] temporary hit points
```

### **Attack Rolls and Checks**
```html
[[/attack]]                            → Auto-links to the feature's attack activity
[[/attack +5]]                         → Fixed +5 to hit (stat blocks)
[[/check athletics 15]]                → [DC 15 Strength (Athletics)]
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip & link)
&Reference[frightened]                 → Frightened
&Reference[Difficult Terrain]          → Difficult Terrain
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @name]]{the creature}         → Fallback text if no actor
[[lookup @classes.fighter.levels]]     → Fighter level
[[lookup @prof]]                       → Proficiency bonus
```

---

## **HTML PATTERNS**

### **Standard Feature Block**
```html
<p>Starting at 2nd level, you can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.</p>
<p>Once you use this feature, you must finish a short or long rest before you can use it again.</p>
```

### **Stat-Block Trait**
```html
<p><em>Legendary Resistance (3/Day).</em> If [[lookup @name]]{the creature} fails a saving throw, it can choose to succeed instead.</p>
```

### **Bulleted Mechanics (Feats)**
```html
<ul>
<li>Increase your Strength or Constitution score by 1, to a maximum of 20.</li>
<li>While you are wearing heavy armor, bludgeoning, piercing, and slashing damage that you take from nonmagical attacks is reduced by 3.</li>
</ul>
```

---


## Explicit fields in Item YAML schema 6

Verification target: D&D5e 6.0.6 / Foundry 14.369. Item YAML versions 0, 1, 2, 3, 4 and 5 remain accepted in memory. Complete field mappings, conditions, defaults, exclusions, and tests are recorded in [the field coverage reference](../../docs/explicit-yaml-v2.md).

| Field | Stored value / default |
|---|---|
| ITEM.Icon | Native image path. A supplied path takes priority over automatic icon selection. |
| ITEM.Identifier / ITEM.Sort | Native identifier / integer ordering value; zero is valid. |
| SOURCE.Book, Page, Custom, License, Rules, Revision | Native source information. Revision is numeric (default 1); page is text. |
| ITEM.Feature Type / Feature Subtype | Native `system.type.value` / `system.type.subtype` identifiers; unknown values are stored with a warning. Blank or `n/a` stores an empty string. |
| ITEM.Requirements | Native `system.requirements` free text; `n/a` stores an empty string. |
| PREREQUISITES.Level / Items / Repeatable | Native `system.prerequisites.level` (nullable integer), `items` (identifier list), `repeatable` (boolean, default false). |
| PROPERTIES.Magical / Passive Trait | Native `mgc` / `trait` property membership; explicit false removes only that property. |
| ENCHANTMENT.Max / Period | Native `system.enchant.max` deterministic formula and `system.enchant.period`; retained for every feature type. |
| VEHICLE_PROPERTIES.Cover / Crewed | Native `system.cover` (labels or 0..1, nullable) and `system.crewed` boolean; retained for every feature type. |
| ADVANCEMENT[] | Native `system.advancement` entries keyed by `Advancement ID` (allocated when omitted): the six feat-valid types with their full configuration. Omitted common keys keep the native defaults (level 0, no name, empty hint). Referenced documents are stored as UUIDs after resolution. |
| Formula fields | Preserve the complete formula string. Numeric fields reject expressions and fractional values when the native field requires integers. |
| Inactive controls | Retain supplied values without enabling the controlling property or override. Omit a conditional section only when no stored settings need preservation. |

Features have no physical or identifiable fields: `ITEM.Rarities`, `INVENTORY`, `COST_AND_WEIGHT`, `UNIDENTIFIED_DESCRIPTION` and `ATTUNEMENT` are reported as unsupported FeatData sections and ignored. `USAGE` and `RECOVERY` follow the shared limited-use rules, including the combat recovery periods `initiative`, `turnStart`, `turnEnd` and `turn`.
