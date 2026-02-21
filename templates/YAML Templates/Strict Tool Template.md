# Strict_Tool_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    ...
---
TOOL:
  ITEM:
    Name: "Herbalism Kit"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.

---

```yaml
TOOL:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Tool Type: "[art|game|music|other]"
    Base Tool: "[e.g. smith, thief, lute, dice - see list below]"

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
    Tool Bonus: "[integer|n/a]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  ABILITY_CHECK:
    Proficiency: "[notProficient|proficient|expert]"
    Ability: "[str|dex|con|int|wis|cha|n/a]"

  USAGE:
    Uses Current: "[integer]"
    Uses Max: "[integer]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

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

  Activities:
    # (Optional) Requires the 5e-activity-importer module to be active.
    # Array format — add as many activities/effects as needed, any type, any number.
    # Each entry uses the full activity importer YAML format.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer templates for full field reference.
    #
    # Example — Heal activity for a potion:
    # - ACTIVITY_HEAL:
    #     ACTIVITY:
    #       Name: "Drink Potion"
    #       Icon: "n/a"
    #     HEALING:
    #       Formula: "2d4 + 2"
    #       Type: "healing"
    #     ACTIVATION:
    #       Activation Type: "action"
    #       Activation Cost: 1
    #     CONSUMPTION:
    #       - Consumption Type: "itemUses"
    #         Consumption Amount: 1
    #
    # All activity types and EFFECT blocks are supported.
    # See the Strict Weapon Template for a complete field reference of all types.
```

---

## **FIELD REFERENCE**

### **Tool Types & Base Tool IDs**
| Type | Base Tool IDs |
|------|---------------|
| `art` | `alch`, `brew`, `calli`, `carp`, `carta`, `cob`, `cook`, `glass`, `jewel`, `leath`, `maso`, `paint`, `pott`, `smith`, `tink`, `weav`, `wood` |
| `game` | `dice`, `card`, `chess` |
| `music` | `bagpipes`, `drum`, `dulcimer`, `flute`, `horn`, `lute`, `lyre`, `panflute`, `shawm`, `viol` |
| `other` | `disg`, `forg`, `herb`, `navg`, `pois`, `thief` |

### **Artisan Tools Reference**
| ID | Tool Name |
|----|-----------|
| `alch` | Alchemist's Supplies |
| `brew` | Brewer's Supplies |
| `calli` | Calligrapher's Supplies |
| `carp` | Carpenter's Tools |
| `carta` | Cartographer's Tools |
| `cob` | Cobbler's Tools |
| `cook` | Cook's Utensils |
| `glass` | Glassblower's Tools |
| `jewel` | Jeweler's Tools |
| `leath` | Leatherworker's Tools |
| `maso` | Mason's Tools |
| `paint` | Painter's Supplies |
| `pott` | Potter's Tools |
| `smith` | Smith's Tools |
| `tink` | Tinker's Tools |
| `weav` | Weaver's Tools |
| `wood` | Woodcarver's Tools |

### **Other Tools Reference**
| ID | Tool Name |
|----|-----------|
| `disg` | Disguise Kit |
| `forg` | Forgery Kit |
| `herb` | Herbalism Kit |
| `navg` | Navigator's Tools |
| `pois` | Poisoner's Kit |
| `thief` | Thieves' Tools |

### **Recovery Periods**
| Period | Description |
|--------|-------------|
| `lr` | Long Rest |
| `sr` | Short Rest |
| `day` | Daily (any time) |
| `dawn` | At dawn |
| `dusk` | At dusk |
| `recharge` | Roll d6 at dawn; recharge on X+ |

### **Recharge Values**
| Formula | Display |
|---------|---------|
| `6` | Recharge 6 |
| `5` | Recharge 5-6 |
| `4` | Recharge 4-6 |
| `3` | Recharge 3-6 |
| `2` | Recharge 2-6 |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save wis 15]]                       → [DC 15 Wisdom]
[[/save con 13 format=long]]           → [DC 13 Constitution] saving throw
[[/save cha 14]]                       → [DC 14 Charisma]
[[/save dex wis 15]]                   → [DC 15 Dexterity or Wisdom]
```

### **Damage Rolls**
```html
[[/damage 2d6 fire]]                   → [2d6] fire
[[/damage 2d6 fire average]]           → 7 (2d6) fire
[[/damage 1d8 + @mod thunder average]] → Includes ability modifier
```

### **Healing**
```html
[[/heal 2d4 + 2]]                      → [2d4 + 2] healing
[[/heal 2d4 + 2 average]]              → 7 (2d4 + 2) healing
[[/heal 5 temp]]                       → [5] temporary hit points
```

### **Ability/Tool Checks**
```html
[[/check thieves 15]]                  → [DC 15 Dexterity (Thieves' Tools)]
[[/check alch 14 format=long]]         → [DC 14 Intelligence (Alchemist's Supplies)] check
[[/check performance 12]]              → [DC 12 Charisma (Performance)]
[[/check sleightofhand 13]]            → [DC 13 Dexterity (Sleight of Hand)]
[[/tool smith 15]]                     → [DC 15 Strength (Smith's Tools)]
```

### **Condition & Rule References**
```html
&Reference[frightened]                 → Frightened (with tooltip)
&Reference[charmed]                    → Charmed
&Reference[poisoned]                   → Poisoned
&Reference[deafened]                   → Deafened
&Reference[incapacitated]              → Incapacitated
&Reference[invisible]                  → Invisible
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.cha.mod]]          → Charisma modifier
[[lookup @attributes.prof]]            → Proficiency bonus
```

---

## **HTML PATTERNS**

### **Standard Tool Description**
```html
<p><em>Brief flavor description of the tool's appearance.</em></p>
<hr>

<p>Proficiency with these tools lets you add your proficiency bonus to any ability checks you make using them.</p>
```

### **Magical Tool with Bonus**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>You have a +X bonus to ability checks made using these tools.</p>
```

### **Charge-Based Tool**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>This item has X charges. While using it, you can expend charges to activate the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The item regains 1d4 expended charges daily at dawn.</p>
```

### **Area Effect (Musical Instruments)**
```html
<p><strong>Haunting Melody (1 Charge).</strong> As an action, you can play the instrument and expend 1 charge. Each creature of your choice within 30 feet that can hear you must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of you for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.</p>
```

### **Crafting Enhancement**
```html
<p><strong>Master's Touch.</strong> When you use these tools to craft an item during downtime, you complete the work in half the normal time.</p>
```

### **Proficiency Requirement**
```html
<p>You must be proficient with [tool type] to use this item's magical properties.</p>
```

---