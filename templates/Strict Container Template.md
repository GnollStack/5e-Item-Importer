# Strict_Container_Template_v2.md

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
[multiline HTML content containing Enrichers]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text|blank]
Unidentified Description:
[multiline HTML content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **FIELD REFERENCE**

### **Capacity Rules**
| Field | Description |
|-------|-------------|
| `Item Count` | Maximum number of discrete items (blank = unlimited) |
| `Weight Capacity` | Maximum weight the container can hold |
| `Volume Capacity` | Maximum volume the container can hold |
| `Weightless Contents` | If `true`, contents don't add to carried weight |

### **Volume Units**
| Value | Description |
|-------|-------------|
| `cubicfoot` | Cubic feet (do NOT use `ft^3` or `cu ft`) |
| `liter` | Liters |

### **Common Container Capacities**
| Container | Weight | Volume | Notes |
|-----------|--------|--------|-------|
| Backpack | 30 lb | 1 cu ft | Standard adventuring gear |
| Bag of Holding | 500 lb | 64 cu ft | Weightless contents |
| Portable Hole | 10,000 lb | 282 cu ft | 6 ft diameter, 10 ft deep |
| Handy Haversack | 120 lb | ~12 cu ft | Weightless, retrieval bonus |

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save dex 15]]                       → [DC 15 Dexterity]
[[/save con 13 format=long]]           → [DC 13 Constitution] saving throw
[[/save wis 14]]                       → [DC 14 Wisdom]
```

### **Damage Rolls**
```html
[[/damage 2d6 piercing]]               → [2d6] piercing
[[/damage 4d10 force average]]         → 22 (4d10) force
[[/damage 2d6 acid average]]           → 7 (2d6) acid
```

### **Ability Checks**
```html
[[/check investigation 15]]            → [DC 15 Intelligence (Investigation)]
[[/check sleightofhand 12]]            → [DC 12 Dexterity (Sleight of Hand)]
[[/check arcana 14 format=long]]       → [DC 14 Intelligence (Arcana)] check
```

### **Condition & Rule References**
```html
&Reference[restrained]                 → Restrained (with tooltip)
&Reference[prone]                      → Prone
&Reference[blinded]                    → Blinded
&Reference[incapacitated]              → Incapacitated
&Reference[Suffocating]                → Suffocating rules
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @abilities.str.mod]]          → Strength modifier
```

---

## **HTML PATTERNS**

### **Standard Container Description**
```html
<p><em>A brief flavor description of the container's appearance.</em></p>
<hr>

<p>This container can hold up to X pounds of material, not exceeding Y cubic feet in volume.</p>
```

### **Extradimensional Space Warning**
```html
<p><strong>Extradimensional Interference.</strong> Placing this container inside an extradimensional space created by a &Reference[Bag of Holding], &Reference[Portable Hole], or similar item instantly destroys both items and opens a gate to the Astral Plane.</p>
```

### **Retrieval Mechanics**
```html
<p><strong>Retrieval.</strong> Retrieving an item from the container requires an action. If a specific item is desired, you can find it instantly without searching.</p>
```

### **Hazard/Trap Pattern**
```html
<p><strong>Triggered Trap.</strong> When opened by a creature not attuned to it, the container releases a burst of energy. Each creature within 10 feet must make a [[/save dex 14 format=long]] or take [[/damage 3d6 fire average]].</p>
```

### **Cursed Container Pattern**
```html
<p><strong>Curse.</strong> Once you place an item inside this container, you must succeed on a [[/save wis 15 format=long]] or become unwilling to part with it. While cursed, you have disadvantage on attack rolls and ability checks whenever the container is more than 10 feet away from you.</p>
```

---

## **EXAMPLE 1: EXTRADIMENSIONAL (Void Satchel)**

```text
===CONTAINER===
Name: Void Satchel
Rarity: rare

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 2500
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 250
Weight Capacity Units: lb
Volume Capacity Value: 32
Volume Capacity Units: cubicfoot

---CURRENCY CONTENTS---
Platinum: 0
Gold: 0
Electrum: 0
Silver: 0
Copper: 0

---DESCRIPTION---
Description:
<p><em>This sleek black satchel is made from shadowsilk and seems to ripple like the surface of dark water when touched.</em></p>
<hr>

<p>This satchel has an interior space considerably larger than its outside dimensions. The bag can hold up to 250 pounds, not exceeding a volume of 32 cubic feet. The satchel weighs 3 pounds, regardless of its contents.</p>

<p><strong>Void Retrieval.</strong> As a bonus action, you can speak the name of any item stored within the satchel. That item appears instantly in your free hand. If your hands are full, the item falls at your feet.</p>

<p><strong>Shadow Concealment.</strong> The satchel and its contents are invisible to divination magic. Spells such as <em>locate object</em> cannot detect items stored within.</p>

<p><strong>Extradimensional Interference.</strong> Placing this satchel inside an extradimensional space created by a <em>bag of holding</em>, <em>portable hole</em>, or similar item instantly destroys both items and opens a gate to the Astral Plane. The gate originates where the one item was placed inside the other. Any creature within 10 feet of the gate is sucked through it to a random location on the Astral Plane. The gate then closes and the items are destroyed.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Rippling Black Satchel
Unidentified Description:
<p>A satchel made of unusual dark fabric that seems to move on its own.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A fragment of the void, tamed and stitched into leather.
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **EXAMPLE 2: CURSED (Mimic's Maw Pouch)**

```text
===CONTAINER===
Name: Mimic's Maw Pouch
Rarity: uncommon

---INVENTORY---
Quantity: 1
Identified: false
Equipped: true

---COST AND WEIGHT---
Price Value: 400
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---CAPACITY---
Item Count: 20
Weight Capacity Value: 20
Weight Capacity Units: lb
Volume Capacity Value: blank
Volume Capacity Units: blank

---CURRENCY CONTENTS---
Platinum: 0
Gold: 15
Electrum: 0
Silver: 30
Copper: 0

---DESCRIPTION---
Description:
<p><em>This leather pouch has an unsettling texture, and its drawstring closure resembles pursed lips.</em></p>
<hr>

<p>This pouch can hold up to 20 items weighing no more than 20 pounds total. While attuned to it, you can retrieve any stored item as a free action once per turn.</p>

<p><strong>Hungry Pouch.</strong> The pouch has a taste for treasure. Whenever you place a gemstone, piece of jewelry, or art object inside, roll a d20. On a 1, the pouch consumes the item—it is destroyed and cannot be recovered.</p>

<p><strong>Curse.</strong> This pouch is cursed. Attuning to it curses you until you are targeted by <em>remove curse</em> or similar magic. While cursed, you are unwilling to part with the pouch and keep it on your person at all times. Whenever you attempt to give away or store treasure elsewhere, you must succeed on a [[/save wis 13 format=long]] or compulsively place it in the pouch instead.</p>

<p><strong>Bite.</strong> If a creature other than you attempts to retrieve an item from the pouch, it bites them, dealing [[/damage 1d6 piercing average]] and refusing to release the item until you command it to.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Unusual Leather Pouch
Unidentified Description:
<p>A small leather pouch with an oddly organic texture. It contains some coins.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
It keeps your treasure safe. Very, very safe.
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **EXAMPLE 3: TRAPPED (Paranoid Merchant's Lockbox)**

```text
===CONTAINER===
Name: Paranoid Merchant's Lockbox
Rarity: rare

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 1500
Price Denomination: gp
Weight Value: 10
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: false

---ATTUNEMENT---
Attunement: optional
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 50
Weight Capacity Units: lb
Volume Capacity Value: 2
Volume Capacity Units: cubicfoot

---CURRENCY CONTENTS---
Platinum: 10
Gold: 200
Electrum: 0
Silver: 0
Copper: 0

---DESCRIPTION---
Description:
<p><em>This iron-banded mahogany box is covered in tiny runes that glow faintly when touched by an unfamiliar hand.</em></p>
<hr>

<p>This lockbox can hold up to 50 pounds of material in a 2 cubic foot interior. It has AC 19 and 30 hit points, and is immune to damage from nonmagical weapons.</p>

<p><strong>Arcane Lock.</strong> The lockbox is sealed with a permanent <em>arcane lock</em> spell. A creature attuned to it can open or close it freely. The lock can also be opened with a [[/check thieves 25 format=long]] or suppressed by <em>knock</em> for 10 minutes.</p>

<p><strong>Trapped.</strong> When a creature attempts to open the lockbox without being attuned to it or fails the check to pick the lock, the box triggers one of the following defenses (roll 1d4 or choose):</p>

<ol>
<li><strong>Shocking Grasp.</strong> The creature must succeed on a [[/save con 15 format=long]] or take [[/damage 3d8 lightning average]] and be unable to take reactions until the start of its next turn.</li>
<li><strong>Alarm.</strong> A shrill alarm audible within 300 feet sounds for 1 minute.</li>
<li><strong>Glitterdust.</strong> The creature is covered in glowing dust, becoming outlined as if by <em>faerie fire</em> for 1 hour. The dust cannot be washed off.</li>
<li><strong>Phantasmal Guardian.</strong> An illusory figure of a snarling guard dog appears and barks loudly, potentially alerting nearby creatures.</li>
</ol>

<p>The trap resets at dawn each day.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Rune-Covered Lockbox
Unidentified Description:
<p>A heavy iron-banded wooden box. Faint runes are etched across its surface.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Trust no one—especially not thieves.
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **EXAMPLE 4: LIVING (Rootweave Basket)**

```text
===CONTAINER===
Name: Rootweave Basket
Rarity: uncommon

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 350
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 40
Weight Capacity Units: lb
Volume Capacity Value: 3
Volume Capacity Units: cubicfoot

---CURRENCY CONTENTS---
Platinum: 0
Gold: 0
Electrum: 0
Silver: 0
Copper: 0

---DESCRIPTION---
Description:
<p><em>This basket is woven from still-living vines and roots that shift and curl gently when observed closely.</em></p>
<hr>

<p>This living basket can hold up to 40 pounds of material in a 3 cubic foot interior.</p>

<p><strong>Preservation.</strong> Organic material stored in the basket (food, herbs, spell components) does not rot, decay, or age while inside. Creatures placed inside still require air and are not preserved.</p>

<p><strong>Gentle Growth.</strong> If you place a single seed or cutting inside the basket overnight, it grows into a healthy seedling by dawn, ready for planting.</p>

<p><strong>Verdant Bond.</strong> While carrying this basket, you have advantage on [[/check nature format=long]] checks and [[/check survival format=long]] checks made to forage for food.</p>

<p><strong>Feeding.</strong> The basket must be watered with at least one pint of water each week or it becomes dormant, losing its magical properties until watered again.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Woven Vine Basket
Unidentified Description:
<p>A basket made of intertwined vines. Some of them appear to still be alive.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Nature's bounty, carried close to your heart.
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **EXAMPLE 5: UTILITY (Coinkeeper's Purse)**

```text
===CONTAINER===
Name: Coinkeeper's Purse
Rarity: common

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 100
Price Denomination: gp
Weight Value: 0.25
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 100
Weight Capacity Units: lb
Volume Capacity Value: blank
Volume Capacity Units: blank

---CURRENCY CONTENTS---
Platinum: 5
Gold: 50
Electrum: 20
Silver: 100
Copper: 200

---DESCRIPTION---
Description:
<p><em>This small velvet purse jingles softly with an impossible amount of coin. A tiny silver clasp shaped like a merchant's scale holds it closed.</em></p>
<hr>

<p>This purse can hold up to 5,000 coins of any denomination. The coins inside are weightless while stored.</p>

<p><strong>Instant Accounting.</strong> As a free action, you always know the exact count and total value of coins inside the purse without needing to count them.</p>

<p><strong>Quick Payment.</strong> When making a purchase, you can use a bonus action to have the purse dispense the exact amount needed directly into your hand or onto a surface.</p>

<p><strong>Secure Clasp.</strong> The purse cannot be opened by anyone other than you unless they succeed on a [[/check sleightofhand 15 format=long]]. You are immediately aware if someone attempts and fails this check.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Jingling Velvet Purse
Unidentified Description:
<p>A small velvet purse that seems heavier than its size suggests.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A merchant's best friend—and a pickpocket's worst nightmare.
===END CHAT FLAVOR===

===END CONTAINER===
```

---

## **EXAMPLE 6: HAZARDOUS (Bottled Rift)**

```text
===CONTAINER===
Name: Bottled Rift
Rarity: veryRare

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 8000
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true
Weightless Contents: true

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---CAPACITY---
Item Count: blank
Weight Capacity Value: 1000
Weight Capacity Units: lb
Volume Capacity Value: 125
Volume Capacity Units: cubicfoot

---CURRENCY CONTENTS---
Platinum: 0
Gold: 0
Electrum: 0
Silver: 0
Copper: 0

---DESCRIPTION---
Description:
<p><em>This stoppered crystal bottle contains a swirling vortex of crackling energy—a stabilized tear in the fabric of reality.</em></p>
<hr>

<p>This bottle contains a controlled rift to a pocket dimension. The space inside can hold up to 1,000 pounds, not exceeding 125 cubic feet (a 5-foot cube). While attuned, you can store or retrieve items as an action by removing the stopper.</p>

<p><strong>Rift Instability.</strong> If the bottle takes damage or is forcibly opened while you are not attuned to it, the rift destabilizes. Each creature within 20 feet must make a [[/save dex 17 format=long]]. On a failed save, a creature takes [[/damage 6d10 force average]] and is teleported to a random unoccupied space within 100 feet. On a successful save, the creature takes half damage and isn't teleported.</p>

<p><strong>Lost to the Void.</strong> If the bottle is destroyed, all contents are lost to the Astral Plane and cannot be recovered by any means short of a <em>wish</em> spell.</p>

<p><strong>Extradimensional Interference.</strong> Placing this bottle inside an extradimensional space created by a <em>bag of holding</em>, <em>portable hole</em>, or similar item causes a catastrophic collapse. Both items are destroyed, and a 10-foot-radius sphere centered on the point of contact becomes a temporary portal to the Astral Plane for 1 minute.</p>

<p><strong>Time Dilation.</strong> Time passes strangely within the rift. Living creatures placed inside do not age, breathe, eat, or drink while stored, but are &Reference[unconscious] and unaware of their surroundings.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Swirling Crystal Bottle
Unidentified Description:
<p>A crystal bottle containing what appears to be a contained storm of purple-white energy.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Handle with extreme care. Or don't. It makes for an excellent grenade.
===END CHAT FLAVOR===

===END CONTAINER===
```

---