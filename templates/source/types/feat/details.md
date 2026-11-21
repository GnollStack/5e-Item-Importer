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

@@include details/fields.md

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
| `race` | `lineage` (dnd5e 6.1 or later; earlier versions store it without a label) |
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
| `VEHICLE_PROPERTIES.Crewed` | Stored native flag; dnd5e 6 has no sheet control for it. | `true` or `false`. |

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

**References** (`ITEMS`, `POOL`, `RECOMMENDATION`, `EFFECT`) accept `UUID`, `Name`, `Identifier` and, for Items, `Type`. A UUID is validated as written. Otherwise the import window links the document by name (or identifier): a world copy, a single match, or the copy in dnd5e's compendium for the world's rules. Other matches are listed to choose from, and a missing one gets a search field; a document the user picks, pastes or drops always overrides the automatic choice. Advancement UUIDs must point at world or compendium documents, not Items embedded in an Actor.

**Spell configuration** (`SPELL`): `Ability` lists spellcasting ability identifiers; `Method` is `atwill`, `innate`, `ritual`, `pact` or `spell`; `Prepared` is `unprepared`, `prepared` or `always`; `Uses Max`/`Uses Per`/`Require Slot` give the granted spells their own uses.

**Trait keys** use `<trait>:<category>[:<child>]`: traits are `saves`, `skills`, `languages`, `armor`, `weapon`, `tool`, `di`, `dr`, `dv`, `ci` and `dm`; `*` and `ALL` are wildcards. Categories use dnd5e identifiers (`weapon:sim`, `weapon:mar`, `armor:lgt`, `armor:med`, `armor:hvy`, `armor:shl`, `tool:art`); the parser warns when it sees the spelled-out names instead.

@@include details/fields/recovery-periods.md

@@include details/fields/recovery-types.md

@@include details/enricher-reference.md

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

@@include details/html-patterns.md

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


## Explicit fields in Item YAML schema 7

Verification target: D&D5e 6.0.6, 6.1.0 and 6.1.1 / Foundry 14.370. Item YAML versions 0 to 6 remain accepted in memory. Complete field mappings, conditions, defaults, exclusions, and tests are recorded in [the field coverage reference](../../docs/explicit-yaml-v2.md).

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
