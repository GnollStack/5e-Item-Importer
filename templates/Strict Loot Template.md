# Strict_Loot_Template_v2.md

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

===END LOOT===
```

---

## **FIELD REFERENCE**

### **Loot Types**
| Type | Description | Examples |
|------|-------------|----------|
| `art` | Artistic objects, paintings, sculptures | Paintings, tapestries, carvings |
| `gear` | Mundane equipment without function | Broken tools, old clothing |
| `gem` | Precious stones | Diamonds, rubies, opals |
| `junk` | Worthless or near-worthless items | Broken pottery, rusty nails |
| `material` | Crafting components | Monster parts, rare metals |
| `resource` | Consumable crafting resources | Ingots, lumber, cloth bolts |
| `treasure` | Coins, trade bars, valuables | Gold bars, ancient coins |

### **Common Gem Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 10 gp | Azurite, banded agate, blue quartz, moss agate |
| 50 gp | Bloodstone, carnelian, jasper, moonstone, onyx |
| 100 gp | Amber, amethyst, garnet, jade, pearl, tourmaline |
| 500 gp | Alexandrite, aquamarine, black pearl, topaz |
| 1,000 gp | Black opal, blue sapphire, emerald, fire opal, ruby |
| 5,000 gp | Black sapphire, diamond, jacinth, star ruby |

### **Common Art Object Values (5e Standard)**
| Value | Examples |
|-------|----------|
| 25 gp | Silver ewer, carved bone statuette, small gold bracelet |
| 250 gp | Gold ring with bloodstones, carved ivory statuette |
| 750 gp | Silver chalice with moonstones, bronze crown |
| 2,500 gp | Gold dragon comb with red garnets, jeweled gold crown |
| 7,500 gp | Gold and ruby ring, gold music box, painting by master |

---

## **ENRICHER REFERENCE**

Loot items typically don't have mechanical effects, but enrichers can enhance descriptions and provide hooks for magical items or crafting materials.

### **Condition & Rule References**
```html
&Reference[blinded]                    → Blinded (with tooltip)
&Reference[poisoned]                   → Poisoned
&Reference[petrified]                  → Petrified
&Reference[Difficult Terrain]          → Difficult Terrain
```

### **Damage Types (for material descriptions)**
```html
&Reference[fire]                       → Fire damage type info
&Reference[cold]                       → Cold damage type info
&Reference[radiant]                    → Radiant damage type info
&Reference[necrotic]                   → Necrotic damage type info
```

### **Spell References (for crafting components)**
```html
<em>revivify</em>                      → Spell name in italics
<em>greater restoration</em>           → Spell name in italics
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name (for story items)
[[lookup @details.type.config.label]]  → Creature type
```

---

## **HTML PATTERNS**

### **Standard Loot Description**
```html
<p><em>Brief flavor description of the item's appearance.</em></p>
```

### **Detailed Art Object**
```html
<p><em>A detailed description of the artwork's appearance and craftsmanship.</em></p>

<p><strong>Origin.</strong> This piece was created by [artist/culture] during [era/event].</p>

<p><strong>Provenance.</strong> [History of ownership or discovery].</p>
```

### **Crafting Material with Uses**
```html
<p><em>Physical description of the material.</em></p>
<hr>

<p><strong>Crafting Uses.</strong> This material can be used to craft or enhance items with the following properties:</p>
<ul>
<li>Property one</li>
<li>Property two</li>
</ul>

<p><strong>Harvesting.</strong> A creature can harvest this material with a successful [[/check nature 15 format=long]] or appropriate tool check.</p>
```

### **Magical Component**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Spell Component.</strong> This item can serve as the material component for the following spells:</p>
<ul>
<li><em>spell name</em> (consumed/not consumed)</li>
</ul>
```

### **Story Hook Item**
```html
<p><em>Physical description.</em></p>
<hr>

<p><strong>Inscription.</strong> The item bears the following text: <em>"Quoted inscription here."</em></p>

<p><strong>History.</strong> A successful [[/check history 15 format=long]] reveals [historical information].</p>
```

---

## **EXAMPLE 1: ART (Portrait of the Vanished Duchess)**

```text
===LOOT===
Name: Portrait of the Vanished Duchess
Rarity: uncommon
Loot Type: art

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 750
Price Denomination: gp
Weight Value: 8
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
<p><em>This oil painting depicts a regal woman in a silver gown, her expression serene yet somehow melancholy. The brushwork is masterful, capturing light in ways that seem almost impossible.</em></p>
<hr>

<p><strong>Origin.</strong> Painted by the renowned artist Elara Brighthand during the height of the Silvermoon Dynasty, approximately 200 years ago.</p>

<p><strong>The Vanishing.</strong> Legend holds that Duchess Vaeloria Silvermoon disappeared on the night this portrait was completed. Some say her soul was trapped within the painting; others claim she fled to the Feywild.</p>

<p><strong>Unnerving Gaze.</strong> Those who study the portrait for more than a minute notice the Duchess's eyes seem to follow them. This is a minor magical effect with no mechanical impact, but it unsettles most viewers.</p>

<p><strong>Hidden Detail.</strong> A successful [[/check investigation 18 format=long]] or [[/check perception 18 format=long]] reveals tiny symbols hidden in the lace of the Duchess's collar—coordinates to an unknown location.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Antique Portrait
Unidentified Description:
<p>An old oil painting of a noblewoman in a silver gown. The frame is gilded and ornate.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Her eyes follow you wherever you go.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 2: GEM (Void Opal)**

```text
===LOOT===
Name: Void Opal
Rarity: rare
Loot Type: gem

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 2500
Price Denomination: gp
Weight Value: 0.1
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
<p><em>This black opal seems to contain a swirling galaxy within its depths. Pinpricks of light drift slowly through an inky darkness that appears far deeper than the gem's physical dimensions.</em></p>
<hr>

<p><strong>Planar Resonance.</strong> The opal was formed where the Material Plane brushes against the void between worlds. It pulses faintly when within 60 feet of a portal, planar rift, or extraplanar creature.</p>

<p><strong>Spell Component.</strong> This gem can serve as a material component worth 1,000 gp or less for the following spells (not consumed unless noted):</p>
<ul>
<li><em>plane shift</em> (consumed)</li>
<li><em>gate</em> (not consumed)</li>
<li><em>demiplane</em> (not consumed)</li>
</ul>

<p><strong>Crafting.</strong> An artificer or skilled jeweler can incorporate this gem into a magic item to grant it properties related to teleportation or planar travel.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Strange Black Opal
Unidentified Description:
<p>An unusually dark opal that seems to have tiny moving lights within it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Stare into it too long, and the void stares back.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 3: MATERIAL (Basilisk Eye)**

```text
===LOOT===
Name: Basilisk Eye
Rarity: uncommon
Loot Type: material

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
<p><em>This preserved eye is the size of a human fist, its pale yellow iris still holding a faint, malevolent gleam. It has been carefully treated to prevent decay.</em></p>
<hr>

<p><strong>Harvesting.</strong> A basilisk eye must be harvested within 1 hour of the creature's death. Extracting it requires a successful [[/check nature 13 format=long]] or proficiency with alchemist's supplies. On a failure, the eye is ruined.</p>

<p><strong>Petrification Residue.</strong> The eye retains traces of the basilisk's petrifying gaze. Creatures that handle it carelessly should be cautious—while not powerful enough to petrify, prolonged skin contact causes mild numbness.</p>

<p><strong>Crafting Uses.</strong> This material can be used in the creation of:</p>
<ul>
<li>Potions that grant immunity to the &Reference[petrified] condition</li>
<li>Weapons that deal additional damage to creatures immune to petrification</li>
<li>A <em>mirror of petrification</em> or similar wondrous item</li>
</ul>

<p><strong>Alchemical Use.</strong> An alchemist can process the eye into 3 doses of <em>oil of stone to flesh</em>, which can reverse petrification when applied to a creature.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Preserved Monster Eye
Unidentified Description:
<p>A large, pale yellow eye preserved in a sealed glass jar. It seems to watch you.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Even in death, its gaze is unsettling.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 4: TREASURE (Coin of the Debt Unpaid)**

```text
===LOOT===
Name: Coin of the Debt Unpaid
Rarity: uncommon
Loot Type: treasure

---INVENTORY---
Quantity: 1
Identified: false
Equipped: false

---COST AND WEIGHT---
Price Value: 100
Price Denomination: gp
Weight Value: 0.02
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
<p><em>This ancient gold coin bears the face of a forgotten king on one side and a skull on the other. It feels heavier than it should and is always cold to the touch.</em></p>
<hr>

<p><strong>Cursed Currency.</strong> This coin was minted from gold stolen from a temple and carries a lingering curse. The coin cannot be permanently lost or given away—it always returns to the last creature who willingly accepted it by the next dawn, appearing in their pocket or pack.</p>

<p><strong>Ill Fortune.</strong> While the coin is in your possession, you have disadvantage on death saving throws. This effect persists even if the coin is placed in an extradimensional space.</p>

<p><strong>Breaking the Curse.</strong> The curse can be broken by one of the following methods:</p>
<ul>
<li>Donating gold equal to 10 times the coin's value to a temple</li>
<li>Casting <em>remove curse</em> while the coin is submerged in holy water</li>
<li>Returning the coin to the ruins of the temple from which it was originally stolen</li>
</ul>

<p><strong>Identification.</strong> The curse is not revealed by the <em>identify</em> spell. A [[/check history 18 format=long]] or [[/check religion 15 format=long]] reveals the coin's cursed nature and the legends surrounding it.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Ancient Gold Coin
Unidentified Description:
<p>An old gold coin bearing unfamiliar markings. It feels unusually heavy and cold.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Some debts follow you to the grave—and beyond.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 5: RESOURCE (Mithral Ingot)**

```text
===LOOT===
Name: Mithral Ingot
Rarity: rare
Loot Type: resource

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 800
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Magical: false

---DESCRIPTION---
Description:
<p><em>This silvery-blue metal bar gleams with an inner luster. Despite its metallic appearance, it weighs far less than steel or iron.</em></p>
<hr>

<p><strong>Properties.</strong> Mithral is a rare, lightweight metal prized by armorers and weaponsmiths. Items made from mithral weigh half as much as their steel equivalents.</p>

<p><strong>Crafting Uses.</strong> One mithral ingot can be used to craft one of the following:</p>
<ul>
<li><strong>Mithral Armor:</strong> If the armor normally imposes disadvantage on [[/check stealth format=long]] checks or has a Strength requirement, the mithral version does not.</li>
<li><strong>Mithral Weapon:</strong> The weapon weighs half as much and can be drawn or stowed as part of the same action used to attack.</li>
<li><strong>Component:</strong> Serves as 800 gp worth of material components for item creation.</li>
</ul>

<p><strong>Smithing Requirements.</strong> Working mithral requires proficiency with smith's tools and access to a forge capable of reaching extremely high temperatures. A successful [[/check smith 15 format=long]] is required to properly shape the metal without compromising its properties.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Silvery Metal Ingot
Unidentified Description:
<p>A gleaming silvery-blue metal bar that is surprisingly light for its size.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Light as silk, strong as dragon scale.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 6: JUNK (Broken Sending Stone)**

```text
===LOOT===
Name: Broken Sending Stone
Rarity: common
Loot Type: junk

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 5
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---DESCRIPTION---
Description:
<p><em>This smooth, palm-sized stone is cracked down the middle. Faint magical runes are still visible on its surface, though many are damaged beyond recognition.</em></p>
<hr>

<p><strong>Damaged Magic.</strong> This stone was once part of a pair of <em>sending stones</em>. The damage has rendered it non-functional—it can no longer send or receive messages.</p>

<p><strong>Residual Echoes.</strong> Occasionally, usually at dawn, the stone emits a faint whisper. The words are fragments of old messages: names, warnings, or declarations of love from long ago. These have no mechanical effect but could provide story hooks.</p>

<p><strong>Repair Possibility.</strong> A skilled artificer or wizard with proficiency in the Arcana skill could potentially repair the stone with a successful [[/check arcana 20 format=long]] and 200 gp worth of materials. However, finding its paired stone would be another matter entirely.</p>

<p><strong>Salvage Value.</strong> The residual magic could be harvested by an artificer for use in other projects, providing 50 gp worth of magical components.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Cracked Rune Stone
Unidentified Description:
<p>A cracked stone with faded magical symbols. It occasionally makes faint sounds.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The echoes of old conversations linger in broken things.
===END CHAT FLAVOR===

===END LOOT===
```

---

## **EXAMPLE 7: GEAR (Explorer's Weathered Journal)**

```text
===LOOT===
Name: Explorer's Weathered Journal
Rarity: common
Loot Type: gear

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 25
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: false

---DESCRIPTION---
Description:
<p><em>This leather-bound journal is water-stained and worn from years of use. Many pages are filled with cramped handwriting, sketches of ruins, and crude maps.</em></p>
<hr>

<p><strong>Contents.</strong> The journal belonged to an explorer named Tomas Blackwood, who documented his travels through the Sunken Kingdoms roughly 40 years ago. The entries describe:</p>
<ul>
<li>Detailed observations of local flora, fauna, and weather patterns</li>
<li>Sketches of temple architecture and strange statues</li>
<li>Partial maps of underground complexes</li>
<li>Warnings about traps and guardians encountered</li>
</ul>

<p><strong>Research Value.</strong> A character who spends 1 hour studying the journal gains advantage on the next [[/check history format=long]] or [[/check survival format=long]] check related to the Sunken Kingdoms or similar ancient ruins.</p>

<p><strong>Incomplete.</strong> The final entries become increasingly frantic, mentioning "the seal" and "what waits below." The last page is torn out.</p>

<p><strong>Story Hook.</strong> A successful [[/check investigation 14 format=long]] reveals a name and address in the front cover—Tomas's sister, who may still be alive and searching for answers about his fate.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Old Journal
Unidentified Description:
<p>A battered leather journal filled with handwritten notes and sketches.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Someone's life work, reduced to water-stained pages.
===END CHAT FLAVOR===

===END LOOT===
```

---