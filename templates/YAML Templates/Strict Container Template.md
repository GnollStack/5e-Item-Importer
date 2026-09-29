# Strict Container Item authoring reference

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 2` and the `CONTAINER` root.

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
CONTAINER:
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

  INVENTORY:
    Quantity: 1 # Compatibility input only: creation fixes quantity at 1; export omits it.
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|Mg]"

  PROPERTIES:
    NPC Equipment: false # Native gear property; shown for NPC inventory.
    Magical: "[true|false]"
    Weightless Contents: "[true|false]"

  ATTUNEMENT:
    Attuned: false # Current state, independent of Attunement requirement.
    # Store independently of Magical; a bonus does not enable an explicit false property.
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]" # Importer metadata; ignored when Attunement is none.

  CAPACITY:
    Item Count: "[integer|null]" # Nonnegative integer or no stored count limit.
    Weight Capacity Value: "[number|null]" # Nonnegative decimal or no stored limit.
    Weight Capacity Units: "[lb|tn|kg|Mg|n/a]"
    Volume Capacity Value: "[number|null]" # Nonnegative decimal or no stored limit.
    Volume Capacity Units: "[cubicFoot|liter|n/a]"

  CURRENCY_CONTENTS:
    # Optional. Omit this entire section if the container holds no coins.
    # If included, all fields are required; use 0 for empty denominations.
    Platinum: "[integer]"
    Gold: "[integer]"
    Electrum: "[integer]"
    Silver: "[integer]"
    Copper: "[integer]"

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

Container supports passive companion effects but no Activities. Its builder fixes quantity to 1 and canonical export omits quantity; the reference cannot promise arbitrary quantity round trips. Container placement and stored Item relationships are outside this authoring format. Capacity and weightless storage do not create contents from description text.


## Concrete example

A free/core container import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 2
CONTAINER:
  ITEM:
    Name: Bag of Holding
    Rarity: uncommon
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 400
    Price Denomination: gp
    Weight Value: 5
    Weight Units: lb
  PROPERTIES:
    Magical: true
    Weightless Contents: true
  ATTUNEMENT:
    Attunement: none
  CAPACITY:
    Weight Capacity Value: 500
    Weight Capacity Units: lb
    Volume Capacity Value: 64
    Volume Capacity Units: cubicFoot
  DESCRIPTION:
    Description: >
      This bag has an interior space considerably larger than its outside dimensions. The bag can
      hold up to 500 pounds, not exceeding a volume of 64 cubic feet.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-container.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Compatibility and support

Use canonical keys in new YAML. Legacy aliases in the reference tables are compatibility input; never combine conflicting aliases with canonical fields. Native schema choices, sheet choices and importer coverage can differ. Unknown fields are not generic YAML extension points.

Full Item export needs companion serializers for its attachments; unsupported attachments can block full export. Keep source rules in descriptions for manual mechanics.

## Detailed field and text reference

## OPTIONAL PASSIVE ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct roll activities or passive bonuses. Strict YAML description text does not generate automation.

Loot and Container items do not expose `system.activities` in dnd5e 5.3.3. Never emit an `Activities` section for either type. Keep active mechanics in the description for manual use. A different, activity-capable Item type is appropriate only when it fits the source and the requested workflow; do not silently change the Item type to add automation.

If the source grants a passive effect and premium/full mode is selected, append `effects` at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key. This requires the companion module to be active at import time. Use the complete Effect template from `modules/5e-activity-importer/templates/Base Activity Templates/`, or its MIDI variant when that automation is intended. Preserve source mechanics; never invent bonuses, UUIDs, macros, or module-specific effect keys. Without companion support, omit `effects` and retain the complete rules in the description.

The `effects` section is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Omit the section or use `effects: []` when there are no entries. On Foundry 14, use `DURATION.Value` (nonnegative integer or null for no finite duration) and one `DURATION.Units` value: years, months, days, hours, minutes, seconds, rounds, or turns.

Use canonical string `Change Type` and a status list. Preserve the YAML type of each `CHANGES[].Value`: a number, boolean, string, list, mapping, or null must match the intended change. Do not quote everything. Legacy numeric `Change Mode` and separate duration labels remain accepted input. Optional Activity ID and Effect ID values must contain exactly 16 alphanumeric characters; omit them when stable references are unnecessary.

This completed example demonstrates array nesting for a passive +1 AC ward. Include it only if the source actually grants that mechanic; it is an illustration, not a default effect.

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
```

---

## **FIELD REFERENCE**

### **Capacity Rules**
| Field | Description |
|-------|-------------|
| `Item Count` | Maximum number of discrete items (null or legacy n/a = no stored count limit) |
| `Weight Capacity` | Maximum weight the container can hold |
| `Volume Capacity` | Maximum volume the container can hold |
| `Weightless Contents` | If `true`, contents don't add to carried weight |

### **Volume Units**
| Value | Description |
|-------|-------------|
| `cubicFoot` | Cubic feet (do NOT use `ft^3` or `cu ft`) |
| `liter` | Liters |

### **Common Container Capacities**
| Container | Weight | Volume | Notes |
|-----------|--------|--------|-------|
| Backpack | 30 lb | 1 cu ft | Standard adventuring gear |
| Bag of Holding | 500 lb | 64 cu ft | Weightless contents |
| Portable Hole | 10,000 lb | 282 cu ft | 6 ft diameter, 10 ft deep |
| Handy Haversack | 120 lb | ~12 cu ft | Weightless, retrieval bonus |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save dex 15]]                       → [DC 15 Dexterity]
[[/save con 13 format=long]]           → [DC 13 Constitution] saving throw
[[/save wis 14]]                       → [DC 14 Wisdom]
```

### **Damage Rolls**
```html
[[/damage 2d6 piercing]]               → [2d6] piercing
[[/damage 4d10 force average]]         → 22 (4d10) force
[[/damage 2d6 acid average]]           → 7 (2d6) acid
```

### **Ability Checks**
```html
[[/check investigation 15]]            → [DC 15 Intelligence (Investigation)]
[[/check sleightofhand 12]]            → [DC 12 Dexterity (Sleight of Hand)]
[[/check arcana 14 format=long]]       → [DC 14 Intelligence (Arcana)] check
```

### **Condition & Rule References**
```html
&Reference[restrained]                 → Restrained (with tooltip)
&Reference[prone]                      → Prone
&Reference[blinded]                    → Blinded
&Reference[incapacitated]              → Incapacitated
&Reference[Suffocating]                → Suffocating rules
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.str.mod]]          → Strength modifier
```

---

## **HTML PATTERNS**

### **Standard Container Description**
```html
<p><em>A brief flavor description of the container's appearance.</em></p>
<hr>

<p>This container can hold up to X pounds of material, not exceeding Y cubic feet in volume.</p>
```

### **Extradimensional Space Warning**
```html
<p><strong>Extradimensional Interference.</strong> Placing this container inside an extradimensional space created by a &Reference[Bag of Holding], &Reference[Portable Hole], or similar item instantly destroys both items and opens a gate to the Astral Plane.</p>
```

### **Retrieval Mechanics**
```html
<p><strong>Retrieval.</strong> Retrieving an item from the container requires an action. If a specific item is desired, [[lookup @name]]{the creature} can find it instantly without searching.</p>
```

### **Hazard/Trap Pattern**
```html
<p><strong>Triggered Trap.</strong> When opened by a creature not attuned to it, the container releases a burst of energy. Each creature within 10 feet must make a [[/save dex 14 format=long]] or take [[/damage 3d6 fire average]].</p>
```

### **Cursed Container Pattern**
```html
<p><strong>Curse.</strong> Once [[lookup @name]]{the creature} places an item inside this container, they must succeed on a [[/save wis 15 format=long]] or become unwilling to part with it. While cursed, they have disadvantage on attack rolls and ability checks whenever the container is more than 10 feet away from them.</p>
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
