# Strict_Container_Template.md

```markdown
===CONTAINER===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]

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
Weightless Contents: [true|false]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]

---CAPACITY---
Item Count: [integer|blank]
Weight Capacity Value: [number|blank]
Weight Capacity Units: [lb|tn|kg|t|blank]
Volume Capacity Value: [number|blank]
Volume Capacity Units: [cubicfoot|liter|blank]

---CURRENCY CONTENTS---
(All fields required, use 0 for empty)
Platinum: [integer]
Gold: [integer]
Electrum: [integer]
Silver: [integer]
Copper: [integer]

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

===END CONTAINER===
```

---

## **FIELD REFERENCE**

### **Capacity Rules:**
*   **Weightless Contents:** If `true`, the weight of items inside does not add to the container's total weight (e.g., Bag of Holding).
*   **Volume Units:** Must be exactly `cubicfoot` or `liter`. Do not use abbreviations like `ft^3`.

---

## **EXAMPLE: MAGICAL CONTAINER (Bag of Holding)**

```text
===CONTAINER===
Name: Bag of Holding
Rarity: uncommon

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 15
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 500
Weight Capacity Units: lb
Volume Capacity Value: 64
Volume Capacity Units: cubicfoot

---CURRENCY CONTENTS---
Platinum: 0
Gold: 250
Electrum: 0
Silver: 100
Copper: 0

---DESCRIPTION---
Description:
This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 15 pounds, regardless of its contents.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Worn Leather Bag
Unidentified Description:
A worn leather bag that seems lighter than it should be.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical bag with extradimensional space.
===END CHAT FLAVOR===

===END CONTAINER===
```