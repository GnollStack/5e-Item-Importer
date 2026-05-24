# Strict_Consumable_Template_v3.md

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
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    # additional fields omitted in this batching example
---
CONSUMABLE:
  ITEM:
    Name: "Potion of Greater Healing"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., ATTUNEMENT, AMMUNITION_PROPERTIES, POISON_PROPERTIES) when their condition is not met. Do not fill omitted sections with `n/a` values.
- **Omit both `effects:` and `Activities:` entirely** unless explicitly requested.
- Do not include template comments (`# ...`) in the final YAML output.
- Do not omit individual fields from required sections just because their value is `n/a`.
- Replace every bracketed placeholder value; never output literal placeholders like `[text]` or `[integer]`.
- Use HTML tags inside description fields, not Markdown headings or Markdown lists.
- For dnd5e typed custom ammunition formulas that replace weapon damage, set `Damage Type` to the primary ammunition damage type, such as `piercing`. This gives dnd5e a default for system-added ability, weapon magic, and ammunition magic bonuses while bracketed terms keep extra damage separate for resistance and immunity.
- Use `Damage Type: n/a` only when the ammunition formula is fully self-contained and will not receive system-added bonuses.

**YAML Syntax Rules (do not violate):**
- Every key needs a SPACE after the colon: `KEY: value`, never `KEY:value`. js-yaml will reject the file with a confusing "multiline key" error otherwise.
- Empty arrays are written `KEY: []` and empty mappings `KEY: {}` — both with the space.
- Indentation is exactly 2 spaces per level. No tabs. No 4-space jumps.

**Default assumptions when source text is silent:**
- Quantity: `1`
- Identified: `true`
- Equipped: `false`
- Rarity: `n/a` for mundane or unspecified consumables.
- Price Value: `0`; Price Denomination: `gp`
- Weight Value: `0` when negligible or not listed; Weight Units: `lb`
- Magical: `false` unless the consumable is explicitly magical.
- Potions, food, poison, and ammunition: Uses Spent: `0`, Uses Max: `0`, Destroy on Empty: `false`.
- Wands, rods, and charged trinkets: Uses Spent: `0`; Uses Max should match the listed maximum charges.
- RECOVERY: `[]` when no charge recovery applies.
- Unidentified Name: `n/a`; Unidentified Description: `n/a` unless an unidentified version is needed.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
CONSUMABLE:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Consumable Type: "[ammo|food|poison|potion|rod|scroll|trinket|wand]"

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

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  AMMUNITION_PROPERTIES:
    # (Required only if Consumable Type is ammo)
    Ammunition Type: "[arrow|bolt|dart|needle|bullet|slingbullet|energycell]"
    Adamantine: "[true|false]"
    Silvered: "[true|false]"
    Returning: "[true|false]"
    Magic Bonus: "[integer|n/a]"
    Damage Formula: "[e.g. 1d6 + @mod OR 1d6[piercing] + 1d4[fire]|n/a]"
    Damage Type: "[primary type such as piercing|bludgeoning|slashing|etc|n/a only for fully self-contained typed formulas]"
    Damage Replace: "[true|false]"

  POISON_PROPERTIES:
    # (Required only if Consumable Type is poison)
    Poison Type: "[contact|ingested|inhaled|injury]"

  SCROLL_PROPERTIES:
    # (Required only if Consumable Type is scroll)
    Concentration: "[true|false]"
    Somatic: "[true|false]"
    Verbal: "[true|false]"
    Ritual: "[true|false]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = total number of charges the item can hold.
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|n/a]"
    Destroy on Empty: "[true|false]"

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

### **Usage & Recovery Rules**
| Type | Uses Max | Destroy on Empty | Tracking |
|------|----------|------------------|----------|
| Potions | `0` | `false` | By Quantity |
| Food | `0` | `false` | By Quantity |
| Poison | `0` | `false` | By Quantity |
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
| `recharge` | Roll d6 at dawn; recharge on X+ |

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
