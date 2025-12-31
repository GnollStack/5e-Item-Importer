# Strict_Equipment_Template.md

```markdown
===EQUIPMENT===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Equipment Type: [light|medium|heavy|natural|shield|clothing|ring|rod|trinket|wand|wondrous|vehicle]
Base Equipment: [e.g. plate, leather, shield - OR blank for wondrous items]

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
Adamantine: [true|false]
Focus: [true|false]
Stealth Disadvantage: [true|false]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]
Magic Bonus: [integer|blank]

---ARMOR---
(Required only for Armor/Shields)
Armor Class: [integer]
Max Dex Modifier: [integer|blank]
Strength Requirement: [integer|blank]

---VEHICLE PROPERTIES---
(Required only if Equipment Type is vehicle)
Vehicle Armor Class: [integer]
Cover: [none|half|threequarters|total]
Hit Points Current: [integer]
Hit Points Max: [integer]
Hit Points Threshold: [integer]
Health Conditions: [text|blank]
Speed: [integer]
Speed Conditions: [text|blank]

---PROFICIENCY---
Proficiency: [automatic|notProficient|proficient]

---USAGE---
Uses Current: [integer]
Uses Max: [integer]

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

===END EQUIPMENT===
```

---

## **FIELD REFERENCE**

### **Valid Equipment Types & Base Equipment:**
*   **light:** `padded`, `leather`, `studdedleather`
*   **medium:** `hide`, `chainshirt`, `scalemail`, `breastplate`, `halfplate`
*   **heavy:** `ringmail`, `chainmail`, `splint`, `plate`
*   **shield:** `shield`
*   **wondrous, ring, clothing, trinket:** Usually `blank` Base Equipment.

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

## **EXAMPLE 1: ARMOR (Plate Armor +1)**

```text
===EQUIPMENT===
Name: Plate Armor +1
Rarity: rare
Equipment Type: heavy
Base Equipment: plate

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 1500
Price Denomination: gp
Weight Value: 65
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: 1

---ARMOR---
Armor Class: 18
Max Dex Modifier: 0
Strength Requirement: 15

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
You have a +1 bonus to AC while wearing this armor. Plate consists of shaped, interlocking metal plates to cover the entire body.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Magic Plate
Unidentified Description:
A suit of heavy plate armor that gleams with a magical aura.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Magical plate armor.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 2: WONDROUS ITEM (Cloak of Billowing)**

```text
===EQUIPMENT===
Name: Cloak of Billowing
Rarity: common
Equipment Type: wondrous
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 50
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: automatic

---USAGE---
Uses Current: 1
Uses Max: 1

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
This cloak has 1 charge. While wearing it, you can use a bonus action to expend the charge to make the cloak billow dramatically for 1 minute. The cloak regains its charge daily at dawn.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Silk Cloak
Unidentified Description:
A finely made silk cloak.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A cloak that billows dramatically.
===END CHAT FLAVOR===

===END EQUIPMENT===
```