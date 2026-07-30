# Strict_Equipment_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Output every field shown in required sections. Use `n/a` for required scalar fields that do not apply.
- Begin every YAML document with `SCHEMA_VERSION: 1` before the Item type key.
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
SCHEMA_VERSION: 1
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
SCHEMA_VERSION: 1
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    # additional fields omitted in this batching example
---
SCHEMA_VERSION: 1
EQUIPMENT:
  ITEM:
    Name: "Cloak of Protection"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., ATTUNEMENT, ARMOR, VEHICLE_PROPERTIES) when their condition is not met. Do not fill omitted sections with `n/a` values.
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
- Rarity: `n/a` for mundane or unspecified items.
- Price Value: `0`; Price Denomination: `gp`
- Weight Value: `0` when negligible or not listed; Weight Units: `lb`
- Uses Spent: `0`; Uses Max: `n/a` unless the item tracks charges or uses.
- RECOVERY: `[]` when no charge recovery applies.
- Unidentified Name: `n/a`; Unidentified Description: `n/a` unless an unidentified version is needed.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
SCHEMA_VERSION: 1
EQUIPMENT:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Equipment Type: "[light|medium|heavy|natural|shield|clothing|ring|rod|trinket|wand|wondrous|vehicle]"
    Base Equipment: "[e.g. plate, leather, shield - OR n/a for wondrous items]"

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
    Adamantine: "[true|false]"
    Focus: "[true|false]"
    Stealth Disadvantage: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"
    Magic Bonus: "[integer|n/a]"

  ARMOR:
    # (Required only for Armor/Shields: light, medium, heavy, natural, shield)
    Armor Class: "[integer]"
    Max Dex Modifier: "[integer|n/a]"
    Strength Requirement: "[integer|n/a]"

  VEHICLE_PROPERTIES:
    # (Required only if Equipment Type is vehicle)
    Vehicle Armor Class: "[integer]"
    Cover: "[none|half|threequarters|total]"
    Hit Points Current: "[integer]"
    Hit Points Max: "[integer]"
    Hit Points Threshold: "[integer]"
    Health Conditions: "[text|n/a]"
    Speed: "[integer]"
    Speed Conditions: "[text|n/a]"

  PROFICIENCY:
    Proficient: "[Automatic|0|1]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = total number of charges the item can hold.
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|n/a]"

  # Optional, repeatable. Use [] when there is no recovery.
  # If Uses Max > 0, replace [] with a list of entries shaped like:
  #   - Period: "[lr|sr|day|dawn|dusk|recharge]"
  #     Type: "[recoverAll|loseAll|formula]"
  #     Formula: "[text|n/a]"
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
| `recharge` | Roll d6 at dawn; recharge on X+ |

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
