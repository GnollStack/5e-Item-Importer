# Strict_Consumable_Template.md
```markdown
===CONSUMABLE===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Consumable Type: [ammo|food|poison|potion|rod|scroll|trinket|wand]

---INVENTORY---
Quantity: [integer]
Identified: [true|false]
Equipped: [true|false]

---COST AND WEIGHT---
Price Value: [number]
Price Denomination: [pp|gp|ep|sp|cp]
Weight Value: [number]
Weight Units: [lb|tn|kg|t]

---PROPERTIES---
Magical: [true|false]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]

---AMMUNITION PROPERTIES---
(Required only if Consumable Type is ammo)
Ammunition Type: [arrow|bolt|dart|needle|bullet|slingbullet|energycell]
Adamantine: [true|false]
Silvered: [true|false]
Returning: [true|false]
Magic Bonus: [integer|blank]
Damage Formula: [e.g. 1d6 + @mod]
Damage Type: [piercing|bludgeoning|slashing|etc]
Damage Replace: [true|false]

---POISON PROPERTIES---
(Required only if Consumable Type is poison)
Poison Type: [contact|ingested|inhaled|injury]

---SCROLL PROPERTIES---
(Required only if Consumable Type is scroll)
Concentration: [true|false]
Somatic: [true|false]
Verbal: [true|false]
Ritual: [true|false]

---USAGE---
(See Field Reference below for rules on Potions vs Wands)
Uses Current: [integer]
Uses Max: [integer]
Destroy on Empty: [true|false]

---RECOVERY---
(Optional, repeatable. Only relevant if Uses Max > 0)
Period: [lr|sr|day|dawn|dusk|recharge]
Type: [recoverAll|loseAll|formula]
Formula: [text|blank]
===END RECOVERY===

---DESCRIPTION---
Description:
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text|blank]
Unidentified Description:
[multiline text content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **FIELD REFERENCE**

### **Usage & Recovery Rules:**
*   **For Potions, Food, Poison:** Set `Uses Max: 0`. These are tracked by `Quantity` in Inventory.
*   **For Wands & Rods:** Set `Uses Max` to the number of charges (e.g., 7). Set `Destroy on Empty` if it crumbles to dust.
*   **For Ammunition:** Set `Uses Max: 0`. Tracked by `Quantity`.

### **Recovery Field Rules:**

| Period | Type | Formula | Description |
|--------|------|---------|-------------|
| `lr` | `recoverAll` | `blank` | Recover all uses on Long Rest |
| `lr` | `loseAll` | `blank` | Lose all uses on Long Rest |
| `lr` | `formula` | Dice formula | Recover formula result on Long Rest |
| `sr` | `recoverAll` | `blank` | Recover all uses on Short Rest |
| `sr` | `loseAll` | `blank` | Lose all uses on Short Rest |
| `sr` | `formula` | Dice formula | Recover formula result on Short Rest |
| `day` | `recoverAll` | `blank` | Recover all uses daily |
| `day` | `loseAll` | `blank` | Lose all uses daily |
| `day` | `formula` | Dice formula | Recover formula result daily |
| `dawn` | `recoverAll` | `blank` | Recover all uses at dawn |
| `dawn` | `loseAll` | `blank` | Lose all uses at dawn |
| `dawn` | `formula` | Dice formula | Recover formula result at dawn |
| `dusk` | `recoverAll` | `blank` | Recover all uses at dusk |
| `dusk` | `loseAll` | `blank` | Lose all uses at dusk |
| `dusk` | `formula` | Dice formula | Recover formula result at dusk |
| `recharge` | `formula` | `2`-`6` | Recharge on d6 roll ≥ Formula value |

---

## **EXAMPLE: WAND OF MAGIC MISSILES**
```text
===CONSUMABLE===
Name: Wand of Magic Missiles
Rarity: uncommon
Consumable Type: wand

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---USAGE---
Uses Current: 7
Uses Max: 7
Destroy on Empty: true

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d6+1
===END RECOVERY===

---DESCRIPTION---
Description:
This wand has 7 charges. While holding it, you can use an action to expend 1 or more of its charges to cast the magic missile spell from it. For 1 charge, you cast the 1st-level version of the spell. You can increase the spell slot level by one for each additional charge you expend.

The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll a d20. On a 1, the wand crumbles into ashes and is destroyed.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Slender Metal Wand
Unidentified Description:
A thin metal wand tipped with a quartz crystal.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A wand that shoots magic missiles.
===END CHAT FLAVOR===

===END CONSUMABLE===
```