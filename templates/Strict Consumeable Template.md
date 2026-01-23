# Strict_Consumable_Template_v2.md

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

===END CONSUMABLE===
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
| `recoverAll` | blank | Regain all charges |
| `loseAll` | blank | Lose all remaining charges |
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

## **EXAMPLE 1: POTION (Voidtouched Elixir)**

```text
===CONSUMABLE===
Name: Voidtouched Elixir
Rarity: rare
Consumable Type: potion

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 450
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---USAGE---
Uses Current: 0
Uses Max: 0
Destroy on Empty: false

---DESCRIPTION---
Description:
<p><em>This viscous black liquid seems to absorb light, and faint whispers echo when the vial is uncorked.</em></p>
<hr>

<p>When you drink this potion, you gain the following benefits for 1 minute:</p>

<ul>
<li><strong>Void Sight.</strong> You gain darkvision out to 120 feet. If you already have darkvision, its range increases by 60 feet.</li>
<li><strong>Shadow Step.</strong> As a bonus action, you can teleport up to 30 feet to an unoccupied space you can see that is in dim light or darkness.</li>
<li><strong>Whispers of the Void.</strong> You have advantage on [[/check perception format=long]] checks and [[/save wis format=long]] saving throws.</li>
</ul>

<p><strong>Side Effect.</strong> When the effect ends, you must succeed on a [[/save con 13 format=long]] or gain one level of exhaustion as the void's chill lingers in your bones.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Inky Black Potion
Unidentified Description:
<p>A vial of swirling black liquid that seems to drink in the surrounding light. Faint, unintelligible whispers emanate from within.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The void's embrace grants power—but always demands a price.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 2: WAND (Wand of Entropic Bolts)**

```text
===CONSUMABLE===
Name: Wand of Entropic Bolts
Rarity: uncommon
Consumable Type: wand

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 600
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: required
Attunement By: spellcaster

---USAGE---
Uses Current: 5
Uses Max: 5
Destroy on Empty: true

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d4+1
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This twisted iron wand is cold to the touch and leaves a faint residue of rust on your fingers.</em></p>
<hr>

<p>This wand has 5 charges. While holding it, you can use an action to expend charges and unleash bolts of decaying energy:</p>

<ul>
<li><strong>1 Charge:</strong> Make a ranged spell attack ([[/attack +7]]) against a creature within 60 feet. On a hit, the target takes [[/damage 2d8 necrotic average]].</li>
<li><strong>2 Charges:</strong> The bolt explodes on impact. The target and each creature within 5 feet of it must succeed on a [[/save dex 14 format=long]] or take [[/damage 3d6 necrotic average]].</li>
</ul>

<p>The wand regains 1d4 + 1 expended charges daily at dawn.</p>

<p><strong>Entropic Collapse.</strong> If you expend the wand's last charge, roll a d20. On a 1, the wand rusts away to nothing in your hand and is destroyed.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Corroded Iron Wand
Unidentified Description:
<p>A wand of dark iron, covered in a thin layer of rust. It feels unnaturally cold.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Entropy given form—decay made weapon.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 3: POISON (Mindfire Toxin)**

```text
===CONSUMABLE===
Name: Mindfire Toxin
Rarity: rare
Consumable Type: poison

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 0
Weight Units: lb

---PROPERTIES---
Magical: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---POISON PROPERTIES---
Poison Type: injury

---USAGE---
Uses Current: 0
Uses Max: 0
Destroy on Empty: false

---DESCRIPTION---
Description:
<p><em>This shimmering violet paste is distilled from rare psychoactive fungi found only in the Underdark.</em></p>
<hr>

<p>You can use this poison to coat one slashing or piercing weapon or up to three pieces of ammunition. Applying the poison takes an action. A creature hit by the poisoned weapon or ammunition must make a [[/save con 15 format=long]].</p>

<p><strong>On a Failed Save:</strong> The target takes [[/damage 2d6 psychic average]] and is &Reference[poisoned] for 1 minute. While poisoned in this way, the creature has disadvantage on Intelligence, Wisdom, and Charisma saving throws as its mind burns with hallucinations.</p>

<p><strong>On a Successful Save:</strong> The target takes half damage and isn't poisoned.</p>

<p>Once applied, the poison retains potency for 1 minute before drying.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Violet Paste
Unidentified Description:
<p>A small vial containing a shimmering purple substance with an acrid smell.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The mind is the most fragile organ—and the most rewarding to attack.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 4: AMMUNITION (Screaming Bolts)**

```text
===CONSUMABLE===
Name: Screaming Bolt
Rarity: uncommon
Consumable Type: ammo

---INVENTORY---
Quantity: 5
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 75
Price Denomination: gp
Weight Value: 0.075
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---AMMUNITION PROPERTIES---
Ammunition Type: bolt
Adamantine: false
Silvered: false
Returning: false
Magic Bonus: 1
Damage Formula: 1d10 + @mod
Damage Type: piercing
Damage Replace: false

---USAGE---
Uses Current: 0
Uses Max: 0
Destroy on Empty: false

---DESCRIPTION---
Description:
<p><em>These crossbow bolts are fletched with ghostly white feathers and emit a faint, high-pitched hum.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic ammunition.</p>

<p><strong>Banshee's Wail.</strong> When this bolt strikes a target, it releases a piercing shriek. The target and each creature within 10 feet of it must succeed on a [[/save con 12 format=long]] or be &Reference[deafened] until the end of their next turn.</p>

<p>Once a screaming bolt hits a target, the magic fades and it becomes a nonmagical bolt.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Strange Crossbow Bolt
Unidentified Description:
<p>A crossbow bolt with unusual pale feathers that seems to vibrate slightly.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
It strikes with the wail of the damned.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 5: FOOD (Hearthstone Ration)**

```text
===CONSUMABLE===
Name: Hearthstone Ration
Rarity: common
Consumable Type: food

---INVENTORY---
Quantity: 3
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 25
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---USAGE---
Uses Current: 0
Uses Max: 0
Destroy on Empty: false

---DESCRIPTION---
Description:
<p><em>This dense, amber-colored biscuit is warm to the touch and smells of honey and cinnamon.</em></p>
<hr>

<p>When you spend 1 minute eating this magical ration, you gain the following benefits:</p>

<ul>
<li>You are nourished as if you had eaten a full day's rations.</li>
<li>You regain [[/heal 1d4 average]] hit points.</li>
<li>You have advantage on saving throws against being &Reference[frightened] for the next hour.</li>
</ul>

<p>The warmth of the hearthstone ration also provides comfort against natural cold, granting resistance to cold damage from environmental effects (but not spells or attacks) for 1 hour.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Warm Biscuit
Unidentified Description:
<p>A dense biscuit that radiates gentle warmth.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A taste of home, even in the darkest dungeon.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 6: ROD (Rod of the Spellbreaker)**

```text
===CONSUMABLE===
Name: Rod of the Spellbreaker
Rarity: veryRare
Consumable Type: rod

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 5000
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---USAGE---
Uses Current: 3
Uses Max: 3
Destroy on Empty: false

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This adamantine rod is etched with spiraling runes that pulse with a soft blue glow when magic is nearby.</em></p>
<hr>

<p>This rod has 3 charges and regains all expended charges daily at dawn.</p>

<p><strong>Dispelling Strike (1 Charge).</strong> When you hit a creature with a melee attack, you can expend 1 charge to force the target to make a [[/save cha 15 format=long]]. On a failed save, one spell of your choice affecting the target ends (as if targeted by <em>dispel magic</em>).</p>

<p><strong>Counterspell (2 Charges).</strong> When you see a creature within 60 feet casting a spell, you can use your reaction and expend 2 charges to interrupt it. The caster must succeed on a [[/check format=long]] using their spellcasting ability against DC 15 or the spell fails and has no effect.</p>

<p><strong>Antimagic Pulse (3 Charges).</strong> As an action, you can expend all 3 charges to create a 15-foot-radius pulse centered on yourself. Each creature in the area must succeed on a [[/save con 15 format=long]] or have all spell effects on them suppressed for 1 minute. Suppressed spells resume afterward if their duration hasn't expired.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Rune-Etched Adamantine Rod
Unidentified Description:
<p>A heavy rod of dark metal covered in strange symbols that occasionally flicker with pale light.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Magic unravels before the Spellbreaker's will.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---