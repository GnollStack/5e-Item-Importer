# Strict_Tool_Template_v2.md

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

===END TOOL===
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

## **EXAMPLE 1: ARTISAN TOOL (Alembic of Instant Alchemy)**

```text
===TOOL===
Name: Alembic of Instant Alchemy
Rarity: rare
Tool Type: art
Base Tool: alch

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 2500
Price Denomination: gp
Weight Value: 8
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 2

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: int

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
<p><em>This copper and glass alchemical apparatus hums with arcane energy. Liquids placed within seem to bubble and transform of their own accord.</em></p>
<hr>

<p>You have a +2 bonus to ability checks made using these alchemist's supplies.</p>

<p><strong>Rapid Synthesis.</strong> When you use these supplies to craft an alchemical item (such as acid, alchemist's fire, or antitoxin), you complete the work in one-quarter the normal time.</p>

<p><strong>Instant Brew.</strong> This alembic has 3 charges. As an action, you can expend charges to instantly create one of the following items, which lasts for 1 hour before becoming inert:</p>
<ul>
<li><strong>Antitoxin (1 Charge):</strong> A creature that drinks this has advantage on saving throws against the &Reference[poisoned] condition for 1 hour.</li>
<li><strong>Alchemist's Fire (1 Charge):</strong> On a hit, the target takes [[/damage 1d4 fire]] at the start of each of its turns. A creature can end this damage by using its action to make a [[/check dex 10 format=long]] to extinguish the flames.</li>
<li><strong>Potent Acid (2 Charges):</strong> As an action, hurl at a creature within 20 feet. On a hit, the target takes [[/damage 4d6 acid average]].</li>
</ul>

<p>The alembic regains all expended charges daily at dawn.</p>

<p><strong>Volatile.</strong> If the alembic is destroyed while it has charges remaining, it explodes. Each creature within 10 feet must make a [[/save dex 14 format=long]], taking [[/damage 3d6 fire & 3d6 acid average]] on a failed save, or half as much on a successful one.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Glowing Alchemical Apparatus
Unidentified Description:
<p>A complex arrangement of copper tubes and glass vessels that pulses with faint light.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Alchemy at the speed of thought.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 2: THIEVES' TOOLS (Skeleton Keys of the Ghost Thief)**

```text
===TOOL===
Name: Skeleton Keys of the Ghost Thief
Rarity: rare
Tool Type: other
Base Tool: thief

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 3500
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 2

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: dex

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
<p><em>These mithral lockpicks shimmer with a ghostly luminescence. Legend says they were forged by a master thief who continued her work even after death.</em></p>
<hr>

<p>You have a +2 bonus to ability checks made using these thieves' tools.</p>

<p><strong>Spectral Touch.</strong> These tools have 3 charges. You can expend charges to use the following abilities:</p>

<ul>
<li><strong>Ghostly Pick (1 Charge):</strong> As an action, you can cause one of the picks to become incorporeal for 1 minute. During this time, you can insert it into a lock even if there is no visible keyhole, such as magically sealed doors or locks hidden behind solid surfaces. You still must succeed on a [[/check thieves format=long]] to open the lock.</li>
<li><strong>Phase Step (2 Charges):</strong> As a bonus action, you become incorporeal until the end of your turn. During this time, you can move through other creatures and objects as if they were &Reference[Difficult Terrain]. If you end your turn inside an object, you take [[/damage 1d10 force average]] and are shunted to the nearest unoccupied space.</li>
</ul>

<p>The tools regain all expended charges daily at dawn.</p>

<p><strong>Silent Work.</strong> While using these tools, you make no sound when picking locks or disarming traps, regardless of the result.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Glowing Lockpicks
Unidentified Description:
<p>A set of silvery lockpicks that emit a faint, ghostly glow.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
No lock can hold what refuses to be bound.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 3: MUSICAL INSTRUMENT (Drums of the Warchanter)**

```text
===TOOL===
Name: Drums of the Warchanter
Rarity: rare
Tool Type: music
Base Tool: drum

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4000
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 1

---ATTUNEMENT---
Attunement: required
Attunement By: blank

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

---DESCRIPTION---
Description:
<p><em>These war drums are stretched with dire wolf hide and bound with iron bands etched with orcish battle-runes. The rhythm they produce stirs the blood and quickens the heart.</em></p>
<hr>

<p>You must be proficient with drums to use this item's magical properties. You have a +1 bonus to ability checks made using these drums.</p>

<p><strong>Battle Rhythm.</strong> These drums have 5 charges. While playing them, you can expend charges to create the following effects:</p>

<ul>
<li><strong>Cadence of Courage (1 Charge):</strong> As a bonus action, you and each ally within 30 feet that can hear you gain [[/heal 5 temp]]. This temporary HP lasts for 10 minutes.</li>
<li><strong>Thunder of the Charge (2 Charges):</strong> As an action, you and each ally within 30 feet that can hear you can immediately move up to half their speed without provoking opportunity attacks.</li>
<li><strong>Drums of Doom (3 Charges):</strong> As an action, each enemy within 60 feet that can hear you must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of you for 1 minute. A creature can repeat the save at the end of each of its turns, ending the effect on itself on a success.</li>
</ul>

<p>The drums regain 1d4 + 1 expended charges daily at dawn.</p>

<p><strong>Heartbeat of Battle.</strong> While you play these drums during combat, allies within 30 feet who can hear you have advantage on saving throws against being &Reference[charmed] or &Reference[frightened].</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Iron-Bound War Drums
Unidentified Description:
<p>A pair of drums bound with iron and covered in strange runes. They thrum with latent energy when struck.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The drums speak of glory, of blood, of victory.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 4: GAMING SET (Deck of Fated Hands)**

```text
===TOOL===
Name: Deck of Fated Hands
Rarity: uncommon
Tool Type: game
Base Tool: card

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 800
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 2

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: int

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
<p><em>This deck of ornate playing cards features ever-shifting illustrations. The faces of the court cards seem to watch you, and the suits occasionally rearrange themselves when you're not looking.</em></p>
<hr>

<p>You have a +2 bonus to ability checks made using this gaming set when playing card games.</p>

<p><strong>Read the Cards.</strong> Once per day, you can spend 10 minutes performing a card reading for yourself or a willing creature. At the end of the reading, roll a d6 and consult the table below to determine what insight the cards provide:</p>

<table>
<thead><tr><th>d6</th><th>Result</th></tr></thead>
<tbody>
<tr><td>1</td><td><strong>The Fool:</strong> The subject has disadvantage on the next saving throw they make within 24 hours.</td></tr>
<tr><td>2-3</td><td><strong>The Wheel:</strong> No effect. Fate is uncertain.</td></tr>
<tr><td>4-5</td><td><strong>The Star:</strong> The subject can reroll one attack roll, ability check, or saving throw within 24 hours, using the new result.</td></tr>
<tr><td>6</td><td><strong>The Crown:</strong> The subject has advantage on the next saving throw they make within 24 hours.</td></tr>
</tbody>
</table>

<p><strong>Cheat Fate (1 Charge).</strong> When you receive "The Fool" result, you can expend the deck's daily charge to reroll and take the new result.</p>

<p><strong>Gambler's Intuition.</strong> While attuned to this deck, you have advantage on [[/check insight format=long]] checks to determine if someone is bluffing or cheating at games of chance.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Strange Playing Cards
Unidentified Description:
<p>A deck of playing cards with unusual, shifting illustrations.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The cards know more than they reveal.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 5: HERBALISM KIT (Verdant Apothecary Satchel)**

```text
===TOOL===
Name: Verdant Apothecary Satchel
Rarity: uncommon
Tool Type: other
Base Tool: herb

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 600
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 1

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: wis

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
<p><em>This well-worn leather satchel is embroidered with vines that seem to shift and grow. Inside, compartments organize dried herbs, vials, and a mortar and pestle made of living wood.</em></p>
<hr>

<p>You have a +1 bonus to ability checks made using this herbalism kit.</p>

<p><strong>Preservation.</strong> Herbs and plant materials stored in this satchel never wilt, rot, or lose potency.</p>

<p><strong>Verdant Remedies.</strong> This satchel has 3 charges. You can expend charges to create the following remedies, which retain potency for 24 hours:</p>

<ul>
<li><strong>Healing Poultice (1 Charge):</strong> As an action, you create a poultice that can be applied to a creature as an action, restoring [[/heal 2d4 + 2 average]] hit points.</li>
<li><strong>Antitoxin Salve (1 Charge):</strong> A creature that receives this salve has advantage on saving throws against poison and the &Reference[poisoned] condition for 1 hour.</li>
<li><strong>Restorative Tincture (2 Charges):</strong> A creature that drinks this tincture can immediately repeat a saving throw against one disease or poison affecting them, with advantage.</li>
</ul>

<p>The satchel regains all expended charges daily at dawn.</p>

<p><strong>Nature's Bounty.</strong> When you forage for herbs or medicinal plants, you find twice the normal amount on a successful [[/check survival format=long]] or [[/check nature format=long]] check.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Vine-Covered Satchel
Unidentified Description:
<p>A leather satchel embroidered with living vines that move slightly when observed.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Nature provides for those who know where to look.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 6: NAVIGATOR'S TOOLS (Compass of the Lost)**

```text
===TOOL===
Name: Compass of the Lost
Rarity: rare
Tool Type: other
Base Tool: navg

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 3000
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 2

---ATTUNEMENT---
Attunement: required
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: wis

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
<p><em>This brass compass is etched with constellations from a dozen different worlds. Its needle spins wildly when first held, then settles to point toward something only the bearer can sense.</em></p>
<hr>

<p>You have a +2 bonus to ability checks made using these navigator's tools.</p>

<p><strong>True North.</strong> While holding this compass, you always know which direction is north, even in locations where conventional compasses fail (such as the Underdark or other planes).</p>

<p><strong>Find the Path.</strong> This compass has 3 charges. You can expend charges to use the following abilities:</p>

<ul>
<li><strong>Locate Object (1 Charge):</strong> As an action, you can focus on a specific object you have seen or handled. For 10 minutes, the compass needle points toward the nearest such object within 1,000 feet, or spins aimlessly if none exists.</li>
<li><strong>Find Creature (2 Charges):</strong> As an action, you can focus on a creature you have met. For 1 hour, the compass needle points toward that creature if it is on the same plane of existence. The creature can make a [[/save wis 15 format=long]] to block this effect (if it is aware of you and wishes to hide).</li>
<li><strong>Unerring Return (3 Charges):</strong> As an action, you designate your current location as "home." For the next 7 days, you can use a bonus action to have the compass point toward that location from anywhere on the same plane.</li>
</ul>

<p>The compass regains all expended charges daily at dawn.</p>

<p><strong>Never Lost.</strong> While attuned to this compass, you cannot become lost by nonmagical means, and you have advantage on saving throws against spells and effects that would teleport you against your will.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Strange Brass Compass
Unidentified Description:
<p>An ornate compass covered in unfamiliar star patterns. Its needle moves erratically.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
All who wander are not lost—especially with this.
===END CHAT FLAVOR===

===END TOOL===
```

---

## **EXAMPLE 7: COOK'S UTENSILS (Cauldron of the Feast)**

```text
===TOOL===
Name: Cauldron of the Feast
Rarity: uncommon
Tool Type: art
Base Tool: cook

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 1200
Price Denomination: gp
Weight Value: 25
Weight Units: lb

---PROPERTIES---
Magical: true
Tool Bonus: 2

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---ABILITY CHECK---
Proficiency: proficient
Ability: wis

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
<p><em>This cast-iron cauldron is decorated with images of bountiful harvests and joyful feasts. It always feels pleasantly warm to the touch and smells faintly of home-cooked meals.</em></p>
<hr>

<p>You have a +2 bonus to ability checks made using these cook's utensils.</p>

<p><strong>Endless Stew (1 Charge).</strong> Once per day, you can spend 10 minutes preparing a simple stew in this cauldron using any edible ingredients (even minimal ones). The cauldron produces enough hearty, delicious stew to feed up to 10 Medium creatures. Creatures that consume a full portion gain the following benefits:</p>

<ul>
<li>The meal counts as a full day's rations.</li>
<li>The creature regains [[/heal 1d8 average]] hit points.</li>
<li>The creature has advantage on [[/save con format=long]] saving throws against exhaustion for the next 8 hours.</li>
</ul>

<p>The cauldron regains its charge daily at dawn.</p>

<p><strong>Purifying Flame.</strong> Any food or water placed in the cauldron is purified, removing poison and disease. This does not expend a charge.</p>

<p><strong>Comfort of Home.</strong> Creatures who eat from this cauldron during a short rest regain one additional Hit Die.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Warm Iron Cauldron
Unidentified Description:
<p>A cast-iron cauldron that radiates gentle warmth and smells faintly of spices.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A warm meal can heal more than just hunger.
===END CHAT FLAVOR===

===END TOOL===
```

---