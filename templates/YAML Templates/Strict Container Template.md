# Strict_Container_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Output every field shown in required sections. Use `n/a` for required scalar fields that do not apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Omit entire conditional sections when their condition is not met. Do not output a conditional section filled with `n/a`.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**dnd5e Description Features:**
- `DESCRIPTION.Description` and `CHAT_FLAVOR.Chat Description` preserve Foundry/dnd5e text features for Foundry to resolve when displayed.
- You can use dnd5e enrichers such as `[[/damage 1d6 fire average]]`, roll-data formulas such as `@prof` or `@abilities.str.mod`, dynamic lookups such as `[[lookup @name]]{the creature}`, System HTML classes, and pass-through document links such as `@UUID[...]` or `@Embed[...]`.
- Use stock dnd5e `[[lookup @name]]` text for active narration and chat flavor: sentence start `[[lookup @name]]{The creature} drinks the potion.`; mid-sentence `When [[lookup @name]]{the creature} hits with this weapon...`. This normally resolves to the actor name; the optional Token Name Lookup companion can prefer token aliases at render time without changing item syntax.
- Keep passive rules text natural. Do not force dynamic name lookups into every description.

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```text
CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    # additional fields omitted in this batching example
---
CONTAINER:
  ITEM:
    Name: "Handy Haversack"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., ATTUNEMENT) when their condition is not met. Do not fill omitted sections with `n/a` values.
- **Omit both `effects:` and `Activities:` entirely** unless explicitly requested.
- Do not include template comments (`# ...`) in the final YAML output.
- Do not omit individual fields from required sections just because their value is `n/a`.
- Replace every bracketed placeholder value; never output literal placeholders like `[text]` or `[integer]`.
- Use HTML tags inside description fields, not Markdown headings or Markdown lists.

**YAML Syntax Rules (do not violate):**
- Every key needs a SPACE after the colon: `KEY: value`, never `KEY:value`. js-yaml will reject the file with a confusing "multiline key" error otherwise.
- Empty arrays are written `KEY: []` and empty mappings `KEY: {}` — both with the space.
- Indentation is exactly 2 spaces per level. No tabs. No 4-space jumps.

**Default assumptions when source text is silent:**
- Quantity: `1`
- Identified: `true`
- Equipped: `false`
- Rarity: `n/a` for mundane or unspecified containers.
- Price Value: `0`; Price Denomination: `gp`
- Weight Value: `0` when negligible or not listed; Weight Units: `lb`
- Magical: `false`; Weightless Contents: `false` unless explicitly extradimensional or weightless.
- Capacity fields: use `n/a` when unlimited, unknown, or not relevant.
- Omit CURRENCY_CONTENTS unless the container starts with coins inside it.
- Unidentified Name: `n/a`; Unidentified Description: `n/a` unless an unidentified version is needed.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
CONTAINER:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"

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
    Magical: "[true|false]"
    Weightless Contents: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  CAPACITY:
    Item Count: "[integer|n/a]"
    Weight Capacity Value: "[number|n/a]"
    Weight Capacity Units: "[lb|tn|kg|Mg|n/a]"
    Volume Capacity Value: "[number|n/a]"
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

## OPTIONAL ADVANCED SECTIONS

Do not include `effects:` or `Activities:` in normal output. Add them only when the user explicitly asks for passive Active Effects or extra activities beyond the base item behavior.

When requested, append them after `CHAT_FLAVOR`:

```yaml
  effects:
    # Passive Active Effects applied to the actor when the item is equipped, attuned, or otherwise active.
    # Requires the 5e-activity-importer module to be active.
    # Must be a YAML array. Each entry follows the EFFECT template format.

  Activities:
    # Extra activities only. Most base item behavior is generated by the dnd5e system.
    # Requires the 5e-activity-importer module to be active.
    # Must be a YAML array. Each entry starts with a dash and has one ACTIVITY_* key.
```

---

## **FIELD REFERENCE**

### **Capacity Rules**
| Field | Description |
|-------|-------------|
| `Item Count` | Maximum number of discrete items (n/a = unlimited) |
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
