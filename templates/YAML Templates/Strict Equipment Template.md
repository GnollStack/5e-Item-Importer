# Strict_Equipment_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    ...
---
EQUIPMENT:
  ITEM:
    Name: "Cloak of Protection"
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
    Weight Units: "[lb|tn|kg|t]"

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
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|n/a]"

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
    # Passive Active Effects applied to the actor when item is equipped/attuned.
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
<p><strong>Reactive Defense.</strong> When you take damage from a source you can see, you can use your reaction to reduce that damage by [[/damage 1d10 + @abilities.con.mod average]].</p>
```

### **Aura Effect**
```html
<p><strong>Aura of Protection.</strong> While you wear this item, you and friendly creatures within 10 feet of you have advantage on saving throws against being &Reference[frightened].</p>
```

### **Charge-Based Ability**
```html
<p>This item has X charges. While wearing it, you can expend 1 or more charges to use the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The item regains 1d4 + 1 expended charges daily at dawn.</p>
```

### **Resistance/Immunity**
```html
<p><strong>Elemental Ward.</strong> While wearing this armor, you have resistance to fire damage.</p>
```

### **Triggered Effect**
```html
<p><strong>Retribution.</strong> When a creature within 5 feet of you hits you with a melee attack, you can use your reaction to deal [[/damage 2d6 lightning average]] to the attacker.</p>
```

---