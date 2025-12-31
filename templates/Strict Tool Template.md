# Strict_Tool_Template.md

```markdown
===TOOL===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Tool Type: [art|game|music|other]
Base Tool: [e.g. smith, thief, lute, dice - see list below]

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
Tool Bonus: [integer or blank]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]

---ABILITY CHECK---
Proficiency: [notProficient|proficient|expert]
Ability: [str|dex|con|int|wis|cha|blank]

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

===END TOOL===
```

---

## **FIELD REFERENCE**

### **Valid Base Tool IDs:**
*   **art:** `alch`, `brew`, `calli`, `carp`, `carta`, `cob`, `cook`, `glass`, `jewel`, `leath`, `maso`, `paint`, `pott`, `smith`, `tink`, `weav`, `wood`
*   **game:** `dice`, `card`, `chess`
*   **music:** `bagpipes`, `drum`, `dulcimer`, `flute`, `horn`, `lute`, `lyre`, `panflute`, `shawm`, `viol`
*   **other:** `disg`, `forg`, `herb`, `navg`, `pois`, `thief`

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

### **Recharge Values (recharge period):**
| Formula | Display |
|---------|---------|
| `6` | Recharge 6 |
| `5` | Recharge 5-6 |
| `4` | Recharge 4-6 |
| `3` | Recharge 3-6 |
| `2` | Recharge 2-6 |

---

## **EXAMPLE: NON-MAGICAL TOOL (Smith's Tools)**
```text
===TOOL===
Name: Smith's Tools
Rarity: common
Tool Type: art
Base Tool: smith

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 20
Price Denomination: gp
Weight Value: 8
Weight Units: lb

---PROPERTIES---
Magical: false
Tool Bonus: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: blank

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan's tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
A set of metalworking tools.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Smith's tools for metalworking.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE: MAGICAL TOOL (Thieves' Tools +2)**
```text
===TOOL===
Name: Thieves' Tools +2
Rarity: rare
Tool Type: other
Base Tool: thief

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
Tool Bonus: 2

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: dex

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
These masterwork thieves' tools grant a +2 bonus to ability checks made to pick locks and disarm traps. The tools are made of mithral and darkwood.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
An exceptionally well-crafted set of thieves' tools. The picks gleam with an unusual sheen.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Masterwork thieves' tools that grant a +2 bonus.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE: MAGICAL TOOL WITH USES (Pipes of Haunting)**
```text
===TOOL===
Name: Pipes of Haunting
Rarity: uncommon
Tool Type: music
Base Tool: panflute

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: blank

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: cha

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d3
===END RECOVERY===

---DESCRIPTION---
Description:
You must be proficient with wind instruments to use these pipes. They have 3 charges. You can use an action to play them and expend 1 charge to create an eerie, spellbinding tune. Each creature within 30 feet of you that hears you play must succeed on a DC 15 Wisdom saving throw or become frightened of you for 1 minute. If you wish, all creatures in the area that aren't hostile toward you automatically succeed on the saving throw. A creature that fails the saving throw can repeat it at the end of each of its turns, ending the effect on itself on a success. A creature that succeeds on its saving throw is immune to the effect of these pipes for 24 hours. The pipes regain 1d3 expended charges daily at dawn.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
An ornate set of pan pipes carved from dark wood with silver inlay.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Eerie pipes that can frighten nearby creatures.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE: TOOL WITH MULTIPLE RECOVERY PERIODS**
```text
===TOOL===
Name: Lyre of Building
Rarity: rare
Tool Type: music
Base Tool: lyre

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 5000
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: blank

---ATTUNEMENT---
Attunement: required
Attunement By: a bard

---ABILITY CHECK---
Proficiency: proficient
Ability: cha

---USAGE---
Uses Current: 5
Uses Max: 5

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d4+1
===END RECOVERY===

---RECOVERY---
Period: sr
Type: formula
Formula: 1
===END RECOVERY===

---DESCRIPTION---
Description:
This magical lyre has 5 charges. While playing it, you can expend charges to cast spells. The lyre regains 1d4+1 charges daily at dawn, and you can recover 1 additional charge during a short rest by playing a soothing melody.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
A golden lyre with strings that shimmer with magical energy.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical lyre that aids in construction.
===END CHAT FLAVOR===

===END TOOL===
```