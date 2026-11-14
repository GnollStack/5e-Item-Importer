# Strict Loot Item authoring reference

## At a glance

- **Root key:** `LOOT`
- **When to use:** Use LOOT when the source is an object with a value and a weight but no rules to run: a gem, an art object, trade goods, treasure, a crafting material, junk, or plain adventuring gear such as a bedroll or rope.
- **Smallest working block:** `ITEM.Name` (the name), `ITEM.Loot Type` (`art`, `gear`, `gem`, `junk`, `material`, `resource`, `trade` or `treasure`).

**Use another template when:**

- Anything that needs attunement, has charges, or is worn for a benefit: EQUIPMENT.
- Anything that is used up and does something when used (potion, scroll, poison, ammunition): CONSUMABLE.
- Anything that holds other items or coins (pouch, chest): CONTAINER.
- Artisan's tools, kits, gaming sets and musical instruments: TOOL.
- A weapon, armor or a shield, even a mundane one: WEAPON or EQUIPMENT.

**Work in this order:** find the source wording in [From source text to YAML](#from-source-text-to-yaml), copy the exact names from the [Complete field reference](#complete-field-reference), shape the answer like the [Concrete example](#concrete-example), then go through [Check before you answer](#check-before-you-answer).

## Destination and prerequisites

Paste the complete document into Item Importer. Begin with `SCHEMA_VERSION: 7` and the `LOOT` root.

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

Find the wording closest to the source and write the fields shown. A path such as `ITEM.Name` is the `Name` key inside the `ITEM` section of `LOOT`. A list such as `RECOVERY` takes one `-` entry per item. Leave out every section the source does not mention.

| The source says | Write |
| --- | --- |
| "a ruby worth 1,000 gp" | `ITEM.Loot Type: gem`; `COST_AND_WEIGHT.Price Value: 1000`; `COST_AND_WEIGHT.Price Denomination: gp` |
| "silver ewer (25 gp)" (art object) | `ITEM.Loot Type: art`; `COST_AND_WEIGHT.Price Value: 25`; `COST_AND_WEIGHT.Price Denomination: gp` |
| "1 lb. of saffron" (trade goods) | `ITEM.Loot Type: trade`; `COST_AND_WEIGHT.Weight Value: 1`; `COST_AND_WEIGHT.Weight Units: lb` |
| "Bedroll" or "Hempen rope" (gear with no rules to run) | `ITEM.Loot Type: gear` |
| "dragon scale" or another monster part or rare metal for crafting | `ITEM.Loot Type: material` |
| "iron ingot", lumber or cloth (crafting stock) | `ITEM.Loot Type: resource` |
| "gold trade bar" or "ancient coin" | `ITEM.Loot Type: treasure` |
| "broken" or "worthless" | `ITEM.Loot Type: junk`; `COST_AND_WEIGHT.Price Value: 0` |
| "six bloodstones (50 gp each)" | `ITEM.Loot Type: gem`; `INVENTORY.Quantity: 6`; `COST_AND_WEIGHT.Price Value: 50`; `COST_AND_WEIGHT.Price Denomination: gp` |
| "uncommon" magic object with nothing to activate, such as a key that glows | `ITEM.Rarities: [uncommon]`; `PROPERTIES.Magical: true` |
| "its nature is hidden until it is identified" | `INVENTORY.Identified: false`; `UNIDENTIFIED_DESCRIPTION.Unidentified Name: Red Stone` |
| "Ruby" or "Bedroll" in a treasure or equipment table (not magic, no rarity) | `ITEM.Rarities: []`; `PROPERTIES.Magical: false`; `INVENTORY.Identified: true` |

## Complete field reference

```yaml
SCHEMA_VERSION: 7
LOOT:
  SOURCE:
    Book: "[text|n/a]"
    Page: "[text|n/a]"
    Custom: "[text|n/a]"
    License: "[text|n/a]"
    Rules: "[2014|2024|text]"
    Revision: 1 # Finite number, including decimals; native default 1.

  ITEM:
    Loot Subtype: "[text|n/a]"
    Icon: "[filepath|n/a]"
    Identifier: "[text|n/a]"
    Sort: 0 # Integer ordering value; preserve an authored zero.
    Name: "[text]"
    Rarities: [] # Native rarity IDs: common, uncommon, rare, veryRare, legendary, artifact. [] means mundane.
    Loot Type: "[art|gear|gem|junk|material|resource|trade|treasure]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Container: "[container name|uuid|n/a]" # Place inside a container: its name in this batch, an Item UUID, or drag-and-drop in the import window.

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|Mg]"

  PROPERTIES:
    NPC Equipment: false # Native gear property; shown for NPC inventory.
    Magical: "[true|false]"

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

Loot supports passive companion effects but no Activities. It has no native equipped state. Preserve descriptive uses, crafting requirements and magical rules in the description; do not manufacture activity/resource fields for them.


## Concrete example

A free/core loot import. Preserve the complete description; it does not automatically create source-specific activities or effects.

5e Item Importer. Activity Importer is not required for this example.

<!-- AUTHORING-EXAMPLE:START -->
```yaml
SCHEMA_VERSION: 7
LOOT:
  ITEM:
    Name: Ruby
    Rarities: []
    Loot Type: gem
  INVENTORY:
    Quantity: 1
    Identified: true
  COST_AND_WEIGHT:
    Price Value: 100
    Price Denomination: gp
    Weight Value: 0
    Weight Units: lb
  PROPERTIES:
    Magical: false
  DESCRIPTION:
    Description: |
      A clear red gemstone about one inch across, suitable as treasure or a spell component.
```
<!-- AUTHORING-EXAMPLE:END -->

The [standalone YAML file](../../docs/examples/core-loot.yaml) matches this block. See [example prerequisites and validation](../../docs/examples/README.md). Examples establish the stated stored data and validation scope; they do not certify every gameplay combination.

## Check before you answer

1. `ITEM.Loot Type` is required and is one of `art`, `gear`, `gem`, `junk`, `material`, `resource`, `trade`, `treasure`. `trinket`, `misc` or `wondrous` fail.
2. Loot has no attunement, charges, equipped state or activities. `ATTUNEMENT`, `USAGE` and `RECOVERY` are ignored with a warning. If the source has any of them, the item is EQUIPMENT or CONSUMABLE, not LOOT.
3. `COST_AND_WEIGHT.Price Value` is a plain number for one item: `1000`, not `1,000` and not `1000 gp`. The coin goes in `COST_AND_WEIGHT.Price Denomination` (`pp`, `gp`, `ep`, `sp` or `cp`). The count goes in `INVENTORY.Quantity`.
4. Write the value in `COST_AND_WEIGHT` even when the description also says what the item is worth.
5. Leave `ITEM.Loot Subtype` out. dnd5e has no loot subtypes.
6. Always write `ITEM.Rarities` (`[]` for an ordinary gem, art object or piece of gear; a missing key is stored as `common`) and `INVENTORY.Identified` (a missing key follows the user's setting). Use `PROPERTIES.Magical: true` only when the source says the object is magic.
7. Start the document with `SCHEMA_VERSION: 7`, then the root key. Copy section and field names exactly as the Complete field reference spells them.
8. Write only the sections and fields the source needs. Do not copy the whole reference, and leave no `[placeholder]` value and no `#` comment in the answer.
9. Write formulas as quoted strings (`"1d6 + 1"`). Write `true`, `false` and plain numbers without quotes.
10. Keep the complete rules text in `DESCRIPTION.Description`. Add `Activities` and `effects` only when the user asked for a full Item and has 5e Activity Importer; use that module's templates for those blocks.

## Compatibility and support

Use canonical keys in new YAML. Legacy aliases in the reference tables are compatibility input; never combine conflicting aliases with canonical fields. Native schema choices, sheet choices and importer coverage can differ. Unknown fields are not generic YAML extension points.

Full Item export needs companion serializers for its attachments; unsupported attachments can block full export. Keep source rules in descriptions for manual mechanics.

## Detailed field and text reference

## OPTIONAL PASSIVE ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct roll activities or passive bonuses. Strict YAML description text does not generate automation.

Loot and Container items do not expose `system.activities` in dnd5e 6. Never emit an `Activities` section for either type. Keep active mechanics in the description for manual use. A different, activity-capable Item type is appropriate only when it fits the source and the requested workflow; do not silently change the Item type to add automation.

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

### **Loot Types**
| Type | Description | Examples |
|------|-------------|----------|
| `art` | Artistic objects, paintings, sculptures | Paintings, tapestries, carvings |
| `gear` | Adventuring gear | Rope, rations, torches, a bedroll |
| `gem` | Precious stones | Diamonds, rubies, opals |
| `junk` | Worthless or near-worthless items | Broken tools, broken pottery, rusty nails |
| `material` | Crafting components | Monster parts, rare metals |
| `resource` | Consumable crafting resources | Ingots, lumber, cloth bolts |
| `trade` | Trade goods with mercantile value | Silk, spices, livestock |
| `treasure` | Coins, trade bars, valuables | Gold bars, ancient coins |

### **Common Gem Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 10 gp | Azurite, banded agate, blue quartz, moss agate |
| 50 gp | Bloodstone, carnelian, jasper, moonstone, onyx |
| 100 gp | Amber, amethyst, garnet, jade, pearl, tourmaline |
| 500 gp | Alexandrite, aquamarine, black pearl, topaz |
| 1,000 gp | Black opal, blue sapphire, emerald, fire opal, ruby |
| 5,000 gp | Black sapphire, diamond, jacinth, star ruby |

### **Common Art Object Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 25 gp | Silver ewer, carved bone statuette, small gold bracelet |
| 250 gp | Gold ring with bloodstones, carved ivory statuette |
| 750 gp | Silver chalice with moonstones, bronze crown |
| 2,500 gp | Gold dragon comb with red garnets, jeweled gold crown |
| 7,500 gp | Gold and ruby ring, gold music box, painting by master |

---

## **ENRICHER REFERENCE**

Loot items typically don't have mechanical effects, but enrichers can enhance descriptions and provide hooks for magical items or crafting materials.

### **Condition & Rule References**
```html
&Reference[blinded]                    → Blinded (with tooltip)
&Reference[poisoned]                   → Poisoned
&Reference[petrified]                  → Petrified
&Reference[Difficult Terrain]          → Difficult Terrain
```

### **Damage Types (for material descriptions)**
```html
&Reference[fire]                       → Fire damage type info
&Reference[cold]                       → Cold damage type info
&Reference[radiant]                    → Radiant damage type info
&Reference[necrotic]                   → Necrotic damage type info
```

### **Spell References (for crafting components)**
```html
<em>revivify</em>                      → Spell name in italics
<em>greater restoration</em>           → Spell name in italics
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name (for story items)
[[lookup @details.type.config.label]]  → Creature type
```

---

## **HTML PATTERNS**

### **Standard Loot Description**
```html
<p><em>Brief flavor description of the item's appearance.</em></p>
```

### **Detailed Art Object**
```html
<p><em>A detailed description of the artwork's appearance and craftsmanship.</em></p>

<p><strong>Origin.</strong> This piece was created by [artist/culture] during [era/event].</p>

<p><strong>Provenance.</strong> [History of ownership or discovery].</p>
```

### **Crafting Material with Uses**
```html
<p><em>Physical description of the material.</em></p>
<hr>

<p><strong>Crafting Uses.</strong> This material can be used to craft or enhance items with the following properties:</p>
<ul>
<li>Property one</li>
<li>Property two</li>
</ul>

<p><strong>Harvesting.</strong> A creature can harvest this material with a successful [[/check nature 15 format=long]] or appropriate tool check.</p>
```

### **Magical Component**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Spell Component.</strong> This item can serve as the material component for the following spells:</p>
<ul>
<li><em>spell name</em> (consumed/not consumed)</li>
</ul>
```

### **Story Hook Item**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Inscription.</strong> The item bears the following text: <em>"Quoted inscription here."</em></p>

<p><strong>History.</strong> A successful [[/check history 15 format=long]] reveals [historical information].</p>
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
