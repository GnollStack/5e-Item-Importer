# Strict_Consumable_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    ...
---
CONSUMABLE:
  ITEM:
    Name: "Potion of Greater Healing"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

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
    Weight Units: "[lb|tn|kg|t]"

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
    Damage Formula: "[e.g. 1d6 + @mod|n/a]"
    Damage Type: "[piercing|bludgeoning|slashing|etc|n/a]"
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

  RECOVERY: []
    # Optional, repeatable. Use [] when there is no recovery.
    # If Uses Max > 0, replace [] with one or more entries:
    # - Period: "[lr|sr|day|dawn|dusk|recharge]"
    #   Type: "[recoverAll|loseAll|formula]"
    #   Formula: "[text|n/a]"

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

  effects:
    # ── OMIT THIS SECTION ENTIRELY unless passive effects are needed ──
    # Passive Active Effects applied to the actor when item is consumed/equipped.
    # These are NOT activities — they are always-on mechanical modifications.
    # Requires the 5e-activity-importer module to be active.
    # This MUST be a YAML array. Each entry follows the EFFECT template format.
    # See the MIDI Effect Template for full field reference.

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless extra activities are needed ──
    # Requires the 5e-activity-importer module to be active.
    # IMPORTANT: This MUST be a YAML array (each entry starts with a dash "-").
    # Each entry has exactly ONE top-level key: ACTIVITY_*
    # Supported keys: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD
    # See the 5e-activity-importer module templates for full field reference.
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
<p>When you drink this potion, you regain [[/heal 2d4 + 2 average]] hit points.</p>
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
<p>This wand has 7 charges. While holding it, you can use an action to expend 1 or more charges to cast a spell from it.</p>
<ul>
<li><strong>1 Charge:</strong> [[/damage 1d4 + 1 force average]] (1st-level)</li>
<li><strong>2 Charges:</strong> [[/damage 2d4 + 2 force average]] (2nd-level)</li>
<li><strong>3 Charges:</strong> [[/damage 3d4 + 3 force average]] (3rd-level)</li>
</ul>
```

### **Risk on Empty**
```html
<p><strong>Crumble Risk.</strong> If you expend the item's last charge, roll a d20. On a 1, it crumbles into ashes and is destroyed.</p>
```

---