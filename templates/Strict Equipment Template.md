# Strict_Equipment_Template_v2.md

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

===END EQUIPMENT===
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
| `natural` | blank (for creature natural armor) |
| `clothing` | blank |
| `ring` | blank |
| `wondrous` | blank |
| `trinket` | blank |
| `rod` | blank |
| `wand` | blank |
| `vehicle` | blank |

### **Armor Class Calculations**
| Type | Base AC | Dex Modifier |
|------|---------|--------------|
| Light | 11-12 | Full Dex |
| Medium | 12-15 | Max +2 Dex |
| Heavy | 14-18 | No Dex |
| Shield | +2 | N/A (added to base) |

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
| `recoverAll` | blank | Regain all charges |
| `loseAll` | blank | Lose all remaining charges |
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

## **EXAMPLE 1: HEAVY ARMOR (Dreadplate of the Fallen Knight)**

```text
===EQUIPMENT===
Name: Dreadplate of the Fallen Knight
Rarity: veryRare
Equipment Type: heavy
Base Equipment: plate

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 12000
Price Denomination: gp
Weight Value: 65
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: true

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 2

---ARMOR---
Armor Class: 18
Max Dex Modifier: 0
Strength Requirement: 15

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This blackened plate armor is etched with the heraldry of a forgotten order. Faint whispers of battle cries echo when danger approaches.</em></p>
<hr>

<p>You have a +2 bonus to AC while wearing this armor.</p>

<p><strong>Dread Presence.</strong> While wearing this armor, you have advantage on [[/check intimidation format=long]] checks.</p>

<p><strong>Spectral Guardian.</strong> This armor has 3 charges. When you are hit by an attack, you can use your reaction to expend 1 charge and summon the spectral visage of a fallen knight. The attacker must succeed on a [[/save wis 15 format=long]] or be &Reference[frightened] of you until the end of their next turn. While frightened in this way, the creature's speed is reduced to 0.</p>

<p><strong>Unyielding.</strong> When you are reduced to 0 hit points but not killed outright, you can use your reaction to expend 2 charges and drop to 1 hit point instead. When you do, each creature of your choice within 10 feet takes [[/damage 2d8 necrotic average]] as the armor unleashes a pulse of deathly energy.</p>

<p>The armor regains all expended charges daily at dawn.</p>

<p><strong>Curse.</strong> Once you don this armor, you can't doff it unless targeted by <em>remove curse</em> or similar magic. While wearing the armor, you have disadvantage on saving throws against effects that turn undead.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Blackened Plate Armor
Unidentified Description:
<p>A suit of heavy plate armor made of black metal. Strange whispers seem to emanate from it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The knight fell, but the armor remembers.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 2: SHIELD (Aegis of the Last Stand)**

```text
===EQUIPMENT===
Name: Aegis of the Last Stand
Rarity: rare
Equipment Type: shield
Base Equipment: shield

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4500
Price Denomination: gp
Weight Value: 6
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---ARMOR---
Armor Class: 2
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: lr
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This battered tower shield bears the scars of a hundred battles. Golden runes pulse along its edges when allies are in danger.</em></p>
<hr>

<p>While holding this shield, you have a +1 bonus to AC. This bonus is in addition to the shield's normal bonus to AC.</p>

<p><strong>Guardian's Intervention.</strong> This shield has 3 charges. When a creature you can see within 5 feet of you is hit by an attack, you can use your reaction to expend 1 charge and become the target of that attack instead, using your AC.</p>

<p><strong>Rallying Defense.</strong> When you expend the shield's last charge, you and each ally within 30 feet gain [[/heal 10 temp]] as the shield releases a burst of protective energy.</p>

<p><strong>Stalwart.</strong> While holding this shield, you have advantage on saving throws against being knocked &Reference[prone] or moved against your will.</p>

<p>The shield regains all expended charges when you finish a long rest.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Scarred Tower Shield
Unidentified Description:
<p>A heavily scarred shield with faintly glowing runes along its edges.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Stand firm. Stand together.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 3: RING (Ring of Spell Echoes)**

```text
===EQUIPMENT===
Name: Ring of Spell Echoes
Rarity: rare
Equipment Type: ring
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 3000
Price Denomination: gp
Weight Value: 0
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: spellcaster
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: automatic

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
<p><em>This silver ring is set with a fractured amethyst that seems to hold ghostly reflections of light that aren't there.</em></p>
<hr>

<p>This ring has 3 charges. It regains 1d3 expended charges daily at dawn.</p>

<p><strong>Spell Echo.</strong> When you cast a spell of 3rd level or lower that targets only one creature and doesn't have a range of self, you can expend a number of charges equal to the spell's level (minimum 1) to target a second creature in range with the same spell. The second casting uses the same spell slot and requires no additional components.</p>

<p><strong>Lingering Magic.</strong> While wearing this ring, when you cast a spell that deals damage, spectral echoes of the spell's energy linger around the target. The next attack roll made against that creature before the end of your next turn has advantage.</p>

<p><strong>Overcharge.</strong> If you expend the ring's last charge, roll a d20. On a 1, the ring cracks and becomes nonmagical.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Cracked Amethyst Ring
Unidentified Description:
<p>A silver ring with a cracked purple gemstone that reflects light strangely.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Every spell leaves a shadow—this ring gives it form.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 4: CLOTHING (Shadowweave Cloak)**

```text
===EQUIPMENT===
Name: Shadowweave Cloak
Rarity: uncommon
Equipment Type: clothing
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 800
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: automatic

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This cloak is woven from threads that seem to drink in surrounding light, its edges blurring into the shadows around it.</em></p>
<hr>

<p><strong>One with Shadow.</strong> While wearing this cloak in dim light or darkness, you have advantage on [[/check stealth format=long]] checks.</p>

<p><strong>Shadow Step.</strong> While you are in dim light or darkness, as a bonus action you can teleport up to 30 feet to an unoccupied space you can see that is also in dim light or darkness. You then have advantage on the first melee attack you make before the end of the turn.</p>

<p><strong>Cloak of Darkness.</strong> As an action, you can pull the cloak around you to become heavily obscured to others. You can see out normally. This effect lasts for 1 minute, until you attack or cast a spell, or until you use a bonus action to end it. Once used, this property can't be used again until you finish a short or long rest.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Dark Hooded Cloak
Unidentified Description:
<p>A hooded cloak made of unusually dark fabric that seems to shift at the edges.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The darkness welcomes you as one of its own.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 5: WONDROUS ITEM (Stormcaller's Gauntlets)**

```text
===EQUIPMENT===
Name: Stormcaller's Gauntlets
Rarity: rare
Equipment Type: wondrous
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4000
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: true
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: spellcaster
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: automatic

---USAGE---
Uses Current: 5
Uses Max: 5

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d4+1
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>These brass gauntlets are etched with spiraling cloud patterns, and tiny arcs of electricity occasionally dance between the fingertips.</em></p>
<hr>

<p>These gauntlets have 5 charges. They regain 1d4 + 1 expended charges daily at dawn. While wearing them, you can use them as a spellcasting focus for your spells.</p>

<p><strong>Storm's Fury.</strong> When you deal lightning or thunder damage with a spell, you can expend 1 charge to reroll any number of the damage dice. You must use the new rolls.</p>

<p><strong>Thunderclap (2 Charges).</strong> As an action, you can expend 2 charges to slam the gauntlets together. Each creature within 15 feet of you must make a [[/save con 15 format=long]]. On a failed save, a creature takes [[/damage 3d8 thunder average]] and is pushed 10 feet away from you. On a successful save, the creature takes half damage and isn't pushed.</p>

<p><strong>Lightning Lure (1 Charge).</strong> As a bonus action, you can expend 1 charge to target one creature you can see within 30 feet. The target must succeed on a [[/save str 15 format=long]] or be pulled up to 15 feet toward you. If the creature ends this movement within 5 feet of you, it takes [[/damage 1d8 lightning average]].</p>

<p><strong>Resistance.</strong> While wearing these gauntlets, you have resistance to lightning damage.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Sparking Brass Gauntlets
Unidentified Description:
<p>A pair of brass gauntlets that occasionally emit small sparks of electricity.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Command the storm with a gesture.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 6: VEHICLE (Arcane Skiff)**

```text
===EQUIPMENT===
Name: Arcane Skiff
Rarity: rare
Equipment Type: vehicle
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 8000
Price Denomination: gp
Weight Value: 200
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---VEHICLE PROPERTIES---
Vehicle Armor Class: 15
Cover: half
Hit Points Current: 50
Hit Points Max: 50
Hit Points Threshold: 10
Health Conditions: blank
Speed: 60
Speed Conditions: hover

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This sleek 10-foot boat floats a few inches above any surface, its hull inscribed with glowing arcane runes. A crystalline orb at the stern serves as its controls.</em></p>
<hr>

<p>This magical skiff can carry up to 4 Medium creatures and 400 pounds of cargo. It hovers up to 3 feet above any solid or liquid surface and can move at a speed of 60 feet per round when piloted.</p>

<p><strong>Piloting.</strong> While attuned to the skiff and touching the control orb, you can use your bonus action to move the skiff up to its speed. The skiff can move in any direction, including straight up or down.</p>

<p><strong>Arcane Shield.</strong> The skiff has 3 charges. As a reaction when you or a passenger would take damage from an attack or spell, you can expend 1 charge to create a shimmering barrier. The damage is reduced by [[/damage 2d10 + 5 average]]. The skiff regains all charges daily at dawn.</p>

<p><strong>Water Walking.</strong> The skiff can travel across water and other liquids as if they were solid ground.</p>

<p><strong>Damage Threshold.</strong> The skiff has a damage threshold of 10. It is immune to poison and psychic damage.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Floating Rune-Covered Boat
Unidentified Description:
<p>A small boat covered in glowing runes that hovers above the ground.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Why walk when you can glide?
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 7: LIGHT ARMOR (Serpentscale Vest)**

```text
===EQUIPMENT===
Name: Serpentscale Vest
Rarity: uncommon
Equipment Type: light
Base Equipment: studdedleather

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 1500
Price Denomination: gp
Weight Value: 13
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---ARMOR---
Armor Class: 12
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This fitted leather vest is reinforced with iridescent scales that shimmer between green and gold.</em></p>
<hr>

<p>You have a +1 bonus to AC while wearing this armor.</p>

<p><strong>Serpent's Agility.</strong> While wearing this armor, you have advantage on saving throws and [[/check acrobatics format=long]] checks made to escape a grapple or the &Reference[restrained] condition.</p>

<p><strong>Slippery.</strong> When a creature misses you with a melee attack, you can use your reaction to move up to 10 feet without provoking opportunity attacks.</p>

<p><strong>Poison Resistance.</strong> You have resistance to poison damage and advantage on saving throws against the &Reference[poisoned] condition.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Iridescent Scale Vest
Unidentified Description:
<p>A leather vest reinforced with shimmering scales of unknown origin.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Slither free from danger.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---