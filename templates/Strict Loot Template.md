# Strict_Loot_Template.md

```markdown
===LOOT===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Loot Type: [art|gear|gem|junk|material|resource|treasure]

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

===END LOOT===
```

---

## **EXAMPLE: LOOT (Diamond of the Deep)**

```text
===LOOT===
Name: Diamond of the Deep
Rarity: rare
Loot Type: gem

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 5000
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
A flawless blue diamond found in the deepest mines of the material plane. It glows faintly in the dark.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Glowing Blue Gem
Unidentified Description:
A heavy, blue stone that feels cold to the touch.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The gem sparkles with an inner light.
===END CHAT FLAVOR===

===END LOOT===
```