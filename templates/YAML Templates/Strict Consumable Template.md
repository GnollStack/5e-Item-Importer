# Strict Consumable Item authoring reference

## At a glance

- **Root key:** `CONSUMABLE`
- **When to use:** Use CONSUMABLE when the source is used up or carried as a stack: a potion, elixir or oil, a spell scroll, ammunition, poison, food and drink, gear with a number of uses (a healer's kit), or a one-use wondrous item such as dust or a bead. The parser also accepts `wand` and `rod` here, for a charged wand or rod that the user wants stored as a consumable.
- **Smallest working block:** `ITEM.Name` (the name), `ITEM.Consumable Type` (`ammo`, `food`, `poison`, `potion`, `rod`, `scroll`, `trinket` or `wand`). `ammo` also needs `AMMUNITION_PROPERTIES.Ammunition Type`; `poison` also needs `POISON_PROPERTIES.Poison Type`.

**Use another template when:**

- The bow, crossbow or sling that fires the ammunition: WEAPON.
- A spell description that is not a scroll: SPELL.
- A ring, cloak, boots or other permanent magic item: EQUIPMENT. A wand or rod fits either template; EQUIPMENT (`Equipment Type: wand` or `rod`) suits one that keeps recharging.
- A quiver, bag or case that holds the consumables: CONTAINER.
- A herbalism kit, poisoner's kit or other kit that gives a tool proficiency: TOOL.
- A gem, an art object, or gear that is not used up: LOOT.

**Work in this order:** find the source wording in [From source text to YAML](#from-source-text-to-yaml), copy the exact names from the [Complete field reference](#complete-field-reference), shape the answer like the [Concrete example](#concrete-example), then go through [Check before you answer](#check-before-you-answer).

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 7` and the `CONSUMABLE` root.

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

Find the wording closest to the source and write the fields shown. A path such as `ITEM.Name` is the `Name` key inside the `ITEM` section of `CONSUMABLE`. A list such as `RECOVERY` takes one `-` entry per item. Leave out every section the source does not mention.

| The source says | Write |
| --- | --- |
| "Potion, common" | `ITEM.Consumable Type: potion`; `ITEM.Rarities: [common]`; `PROPERTIES.Magical: true` |
| "when you drink this potion" (one use, then it is gone) | `USAGE.Uses Spent: 0`; `USAGE.Uses Max: 1`; `USAGE.Destroy on Empty: true` |
| "Arrows (20)" | `ITEM.Consumable Type: ammo`; `AMMUNITION_PROPERTIES.Ammunition Type: arrow`; `INVENTORY.Quantity: 20` |
| "You have a +1 bonus to attack and damage rolls made with this piece of magic ammunition" | `PROPERTIES.Magical: true`; `ATTUNEMENT.Magic Bonus: 1` |
| "Poison (injury)" | `ITEM.Consumable Type: poison`; `POISON_PROPERTIES.Poison Type: injury` |
| "Spell scroll" of a concentration spell with V and S components | `ITEM.Consumable Type: scroll`; `SCROLL_PROPERTIES.Vocal: true`; `SCROLL_PROPERTIES.Somatic: true`; `SCROLL_PROPERTIES.Concentration: true`; `SCROLL_PROPERTIES.Ritual: false` |
| "Rations (1 day)" | `ITEM.Consumable Type: food`; `FOOD_PROPERTIES.Nutritious: true` |
| "Waterskin" or another drink | `ITEM.Consumable Type: food`; `FOOD_PROPERTIES.Hydrating: true` |
| "This wand has 7 charges" and "regains 1d6 + 1 expended charges daily at dawn" | `ITEM.Consumable Type: wand`; `USAGE.Uses Spent: 0`; `USAGE.Uses Max: 7`; `USAGE.Destroy on Empty: false`; `RECOVERY: [{Period: dawn, Type: formula, Formula: "1d6 + 1"}]` |
| "Wondrous item" that is used up, such as dust or a bead | `ITEM.Consumable Type: wondrous` |
| "50 gp" and "1/2 lb." | `COST_AND_WEIGHT.Price Value: 50`; `COST_AND_WEIGHT.Price Denomination: gp`; `COST_AND_WEIGHT.Weight Value: 0.5`; `COST_AND_WEIGHT.Weight Units: lb` |
| "Arrows" or "Rations" in an equipment table (not magic, no rarity) | `ITEM.Rarities: []`; `PROPERTIES.Magical: false`; `INVENTORY.Identified: true` |

## Complete field reference

```yaml
SCHEMA_VERSION: 7
CONSUMABLE:
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
    Consumable Type: "[ammo|food|poison|potion|rod|scroll|trinket|wand|wondrous]"
    Consumable Subtype: "[text|n/a]" # Native ID; match the active ammo/poison alias below.

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

  ATTUNEMENT:
    Attuned: false # Current state, independent of Attunement requirement.
    # Store independently of Magical; a bonus does not enable an explicit false property.
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]" # Importer metadata; ignored when Attunement is none.
    Magic Bonus: "[formula|n/a]" # Canonical for every subtype; deterministic, no dice.

  AMMUNITION_PROPERTIES:
    # Booleans remain stored on all subtypes; the type alias is required only for ammo.
    Ammunition Type: "[arrow|bolt|needle|bullet|slingbullet|energycell]" # Omit this alias outside ammo.
    Adamantine: "[true|false]"
    Silvered: "[true|false]"
    Returning: "[true|false]"

  POISON_PROPERTIES:
    # Required for poison; omit this alias section for other subtypes.
    Poison Type: "[contact|ingested|inhaled|injury]"

  SCROLL_PROPERTIES:
    # Shown for scrolls; preserve supplied booleans on other subtypes.
    Concentration: "[true|false]"
    Somatic: "[true|false]"
    Vocal: "[true|false]"
    Ritual: "[true|false]"

  FOOD_PROPERTIES:
    # dnd5e 6.1 or later, Consumable Type food only (rations, water). Earlier dnd5e stores them without using them.
    Hydrating: "[true|false]"
    Nutritious: "[true|false]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = maximum count or deterministic formula, e.g. "1 + @prof" (no dice).
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|formula|n/a]"
    Destroy on Empty: "[true|false]"

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

  DAMAGE:
    Replace: false
    DAMAGE_DATA:
      Dice Count: "[integer|null]" # Nonnegative integer; null means no dice count.
      Die Denomination: "[integer|null]" # Sheet dice: 4, 6, 8, 10, 12, 20, 100; or null.
      Bonus: "[formula|n/a]"
      Damage Types: [] # Native damage type IDs; e.g. [piercing, fire].
      Modifiers: []
      Custom Enabled: false
      Custom Formula: "[formula|n/a]" # Retained even when Custom Enabled is false.
      Scaling Mode: "[none|whole|half]"
      Scaling Dice Count: "[integer|null]" # Default 1 if omitted; retain explicit 0 or null.
      Scaling Formula: "[formula|n/a]" # Retained even when Scaling Mode is none.

```

## Configuration rules

For ammo/poison, write the subtype alias (`AMMUNITION_PROPERTIES.Ammunition Type` or `POISON_PROPERTIES.Poison Type`) and leave `ITEM.Consumable Subtype` out. When both are written they are not compared, and `Consumable Subtype` is the value stored. Canonical Magic Bonus belongs in ATTUNEMENT; the older ammunition label is compatibility input. DAMAGE.Replace changes how ammunition damage is used; preserve explicit false. The damage structure may be stored on other subtypes without making it active. A potion's descriptive healing is not an authored Heal activity unless a companion attachment supplies it.


## Concrete example

A free/core consumable import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 7
CONSUMABLE:
  ITEM:
    Name: Potion of Healing
    Rarities: [common]
    Consumable Type: potion
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 50
    Price Denomination: gp
    Weight Value: 0.5
    Weight Units: lb
  PROPERTIES:
    Magical: true
  USAGE:
    Uses Spent: 0
    Uses Max: 1
    Destroy on Empty: true
  DESCRIPTION:
    Description: >
      [[lookup @name]]{The creature} regains [[/heal 2d4 + 2 average]] hit points when they drink
      this potion. The potion's red liquid glimmers when agitated.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-consumable.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Check before you answer

1. `ITEM.Consumable Type` is one of `ammo`, `food`, `poison`, `potion`, `rod`, `scroll`, `trinket`, `wand`, `wondrous`. `ammunition` fails. Elixirs, oils and philters are `potion`. Use `wondrous` for a wondrous item that is used up, and `trinket` for a consumable that fits no other type.
2. `ammo` needs `AMMUNITION_PROPERTIES.Ammunition Type` and `poison` needs `POISON_PROPERTIES.Poison Type`, or the import fails. Leave `ITEM.Consumable Subtype` out: the importer fills it from those two keys. If you do write it, use the matching dnd5e id (`crossbowBolt` for `bolt`), because a value that disagrees is stored without a warning.
3. Ammunition type words here are `arrow`, `bolt`, `needle`, `bullet`, `slingbullet` and `energycell`. They differ from the ids in the Weapon template.
4. A one-use item (potion, scroll, dose of poison) is `USAGE.Uses Max: 1`, `USAGE.Uses Spent: 0`, `USAGE.Destroy on Empty: true`. Write `Destroy on Empty` with a lowercase `on`; `Destroy On Empty` is ignored with a warning.
5. `INVENTORY.Quantity` is how many of the item there are. Do not put the stack size in `USAGE.Uses Max`. Ammunition has no `USAGE`: twenty arrows are `Quantity: 20`.
6. A +1 on ammunition is `ATTUNEMENT.Magic Bonus: 1` with `PROPERTIES.Magical: true`. Do not use the old `AMMUNITION_PROPERTIES.Magic Bonus` key.
7. `DAMAGE` is for ammunition that deals its own damage. Do not put a potion's healing or a poison's damage there.
8. Scroll components are `SCROLL_PROPERTIES.Vocal` (V), `Somatic` (S), `Concentration` and `Ritual`; `Verbal` gives a warning. `FOOD_PROPERTIES` belongs only to `Consumable Type: food`; on another type it gives a warning. Always write `ITEM.Rarities` (`[]` for mundane arrows, food or poison; a missing key is stored as `common`) and `INVENTORY.Identified` (a missing key follows the user's setting).
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

### **Usage & Recovery Rules**
| Type | Uses Max | Destroy on Empty | Tracking |
|------|----------|------------------|----------|
| Potions | `1` | `true` | One use each; the quantity drops as they are used |
| Food | `1` | `true` | One use each; the quantity drops as they are used |
| Poison | `1` | `true` | One use each; the quantity drops as they are used |
| Ammunition | `0` | `false` | By Quantity |
| Wands | Charges (e.g., `7`) | `true` or `false` | By Uses |
| Rods | Charges (e.g., `3`) | `true` or `false` | By Uses |
| Trinkets | Varies | Varies | Context-dependent |

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
| `formula` | Dice (e.g., `1d6+1`) | Regain rolled amount |
| `formula` | Number (e.g., `5`) | For recharge: regain all on d6 ≥ 5 |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save con]]                          → [Constitution]
[[/save con 15]]                       → [DC 15 Constitution]
[[/save con 15 format=long]]           → [DC 15 Constitution] saving throw
[[/save str dex 14]]                   → [DC 14 Strength or Dexterity]
```

### **Damage Rolls**
```html
[[/damage 2d6 poison]]                 → [2d6] poison
[[/damage 2d6 poison average]]         → 7 (2d6) poison
[[/damage 2d6 poison format=long]]     → [2d6] poison damage
[[/damage 1d6 fire & 1d6 cold average]] → 3 (1d6) fire plus 3 (1d6) cold
```

### **Healing**
```html
[[/heal 2d4 + 2]]                      → [2d4 + 2] healing
[[/heal 2d4 + 2 average]]              → 7 (2d4 + 2) healing
[[/heal 10 temp]]                      → [10] temporary hit points
```

### **Ability Checks**
```html
[[/check con 13]]                      → [DC 13 Constitution]
[[/check perception 15]]               → [DC 15 Wisdom (Perception)]
[[/check con 13 format=long]]          → [DC 13 Constitution] check
```

### **Attack Rolls**
```html
[[/attack +7]]                         → Fixed +7 to hit
[[/attack]]                            → Auto-links to item's attack activity
```

### **Condition & Rule References**
```html
&Reference[poisoned]                   → Poisoned (with tooltip)
&Reference[paralyzed]                  → Paralyzed
&Reference[invisible]                  → Invisible
&Reference[unconscious]                → Unconscious
&Reference[blinded]                    → Blinded
&Reference[Difficult Terrain]          → Difficult Terrain
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.con.mod]]          → Constitution modifier
[[lookup @details.cr]]                 → Challenge Rating
```

---

## **HTML PATTERNS**

### **Standard Consumable Effect**
```html
<p>When [[lookup @name]]{the creature} drinks this potion, they regain [[/heal 2d4 + 2 average]] hit points.</p>
```

### **Save-Based Effect**
```html
<p>A creature subjected to this poison must succeed on a [[/save con 15 format=long]] or take [[/damage 3d6 poison average]] and become &Reference[poisoned] for 1 hour.</p>
```

### **Tiered Effects (Potions of Varying Strength)**
```html
<table>
<thead><tr><th>Potion</th><th>Rarity</th><th>HP Regained</th></tr></thead>
<tbody>
<tr><td>Healing</td><td>Common</td><td>[[/heal 2d4 + 2 average]]</td></tr>
<tr><td>Greater Healing</td><td>Uncommon</td><td>[[/heal 4d4 + 4 average]]</td></tr>
<tr><td>Superior Healing</td><td>Rare</td><td>[[/heal 8d4 + 8 average]]</td></tr>
<tr><td>Supreme Healing</td><td>Very Rare</td><td>[[/heal 10d4 + 20 average]]</td></tr>
</tbody>
</table>
```

### **Charge-Based Usage**
```html
<p>This wand has 7 charges. While holding it, [[lookup @name]]{the creature} can use an action to expend 1 or more charges to cast a spell from it.</p>
<ul>
<li><strong>1 Charge:</strong> [[/damage 1d4 + 1 force average]] (1st-level)</li>
<li><strong>2 Charges:</strong> [[/damage 2d4 + 2 force average]] (2nd-level)</li>
<li><strong>3 Charges:</strong> [[/damage 3d4 + 3 force average]] (3rd-level)</li>
</ul>
```

### **Risk on Empty**
```html
<p><strong>Crumble Risk.</strong> If [[lookup @name]]{the creature} expends the item's last charge, roll a d20. On a 1, it crumbles into ashes and is destroyed.</p>
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
