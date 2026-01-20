# 5e Item Importer

![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)
![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/total)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/total)

**Stop manually typing items.**  
The **5e Item Importer** allows you to import D&D 5e items directly from text into Foundry VTT. It supports two powerful workflows:

1.  **Natural Language:** Copy/paste directly from PDFs, D&D Beyond, or websites. This method handles standard D&D 5e formatting.
2.  **Strict Format:** Use the provided templates to generate near perfect imports every time. Great for homebrew, bulk generation, or working with LLMs. **Supports Batches**.

<img width="700" height="602" alt="image" src="https://github.com/user-attachments/assets/c608cb8f-fc8a-405e-b68c-5152508e0d5e" />

## See it in Action on Youtube: [5e Importer V13.2.0](https://youtu.be/THrikJq0EY4)

---

##  1. Natural Language Parser
*Best for: Quick imports from books, PDFs, or websites.*

**This feaure is still under active development**

The module attempts to read standard D&D 5e statblock formatting. It automatically detects item types, costs, weights, and damage formulas.

**How to use:**
1.  Copy the item text from your source.
2.  Open the **Items Directory** in Foundry.
3.  Click **Import Item**.
4.  Paste the text and click **Import**.
5.  Parse and then Import. You can choose a file to put it into.

<details>
<summary><strong>📄 View Natural Language Template & Examples</strong></summary>

### Best Practice Patterns
For best results, try to match the standard D&D 5e Statblock format:

```text
[Item Name]
[Type], [Rarity] (requires attunement [by Class/Race])
Cost: [Value] [gp/sp/cp], Weight: [Value] [lb]
Damage: [Formula] [Type]
Properties: [Prop1], [Prop2], [Versatile (1d10)]
AC: [Number] (max Dex [Number])

[Description Paragraphs...]
```

---

## **BEST PRACTICE PATTERNS**

### **1. Naming & Header**
The parser uses 3 strategies. The safest is Title Case on the first line.
*   **Good:** `Flame Tongue`
*   **Better:** `Name: Flame Tongue` (Guarantees 100% confidence)

### **2. Type Detection**
Include specific keywords in the first 3 lines to trigger type detection:
*   **Weapon:** "Weapon", "Melee Weapon", "Ranged Weapon", "Attack Roll"
*   **Armor:** "Armor", "Shield", "Plate", "Leather", "AC"
*   **Consumable:** "Potion", "Scroll", "Food", "Drink", "Ammunition"
*   **Tool:** "Tool", "Kit", "Instrument", "Gaming Set"
*   **Container:** "Bag", "Backpack", "Box", "Holds", "Capacity"
*   **Loot:** "Gem", "Art Object", "Treasure", "Material"

### **3. Weapons**
To ensure correct parsing of damage and properties:
*   **Type:** Use full terms like "Martial Melee Weapon" or "Simple Ranged Weapon".
*   **Damage:** Format as `1d8 slashing` or `Damage: 2d6 fire`.
*   **Properties:** List them clearly: `Finesse, Light, Thrown`.
*   **Versatile:** Use the specific format `Versatile (1d10)`.

### **4. Armor & Equipment**
*   **AC:** Use `AC 18` or `Armor Class: 14`.
*   **Stealth:** Use the phrase `Disadvantage on Stealth checks`.
*   **Strength:** Use `Requires Strength 13` or `Str 15`.

### **5. Containers**
The parser looks for specific capacity phrases:
*   **Weight:** "Holds 500 pounds" or "Capacity: 500 lbs".
*   **Volume:** "64 cubic feet".
*   **Currency:** "Contains 50 gp" or "Holds 10 platinum".

---

## **EXAMPLE: WEAPON (Best Result)**

```text
Sun Blade
Weapon (longsword), rare (requires attunement)
Cost: 5000 gp, Weight: 3 lb.
Damage: 1d8 radiant
Properties: Finesse, Versatile (1d10)

This item appears to be a longsword hilt. While grasping the hilt, you can use a bonus action to cause a blade of pure radiance to spring into existence, or make the blade disappear.
```

## **EXAMPLE: ARMOR (Best Result)**

```text
Dragon Scale Mail
Armor (scale mail), very rare (requires attunement)
Cost: 4000 gp, Weight: 45 lb.
AC: 14 (max Dex 2)

Dragon scale mail is made of the scales of one kind of dragon. While wearing this armor, you have advantage on saving throws against the Frightful Presence and breath weapons of dragons.
```

## **EXAMPLE: CONTAINER (Best Result)**

```text
Bag of Holding
Wondrous item, uncommon
Weight: 15 lb.

This bag has an interior space considerably larger than its outside dimensions. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.
The bag currently contains 50 gp and 10 sp.
```

## **EXAMPLE: TOOL (Best Result)**

```text
Thieves' Tools
Tool, common
Cost: 25 gp, Weight: 1 lb.

This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers. Proficiency with these tools lets you add your proficiency bonus to any ability checks you make to disarm traps or open locks.
```
</details>

---

## 2. Strict Format Parser
*Best for: Complex homebrew and bulk generation.*

The Strict Parser uses a specific key/value format. This is ideal for using with **LLMs (ChatGPT, Claude, DeepSeek)**. You can paste a System Prompt into an AI, tell it "Make me a sword that does ice damage," and it will output a block you can paste directly into Foundry with the  stats, icons, and configuration filled in on the imported item, Not that this only fills in the basic item fields and details

### Strict Templates
Expand the sections below to copy the templates for prompts and to view example items.

<details>
<summary><strong>⚔️ Strict Weapon Template</strong></summary>

```markdown
===WEAPON===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Weapon Type: [simpleM|simpleR|martialM|martialR|natural|improv|siege]
Base Weapon: [e.g. longsword, dagger, bow - see list below - OR blank]

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
Adamantine: [true|false]
Ammunition: [true|false]
Finesse: [true|false]
Firearm: [true|false]
Focus: [true|false]
Heavy: [true|false]
Light: [true|false]
Loading: [true|false]
Magical: [true|false]
Reach: [true|false]
Reload: [true|false]
Returning: [true|false]
Silvered: [true|false]
Special: [true|false]
Thrown: [true|false]
Two-Handed: [true|false]
Versatile: [true|false]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]
Magic Bonus: [integer|blank]

---AMMUNITION---
(Required only if Ammunition is true)
Ammunition Type: [arrow|crossbowBolt|firearmBullet|slingBullet|energyCell|blowgunNeedle]

---RELOAD---
(Required only if Reload is true)
Reload Amount: [integer]

---VERSATILE DAMAGE---
(Required only if Versatile is true)
Versatile Formula: [e.g. 1d10 + @mod]
Versatile Damage Type: [slashing|piercing|bludgeoning|etc]

---SIEGE PROPERTIES---
(Required only if Weapon Type is siege)
Siege Armor Class: [integer]
Cover: [none|half|threequarters|total]
Hit Points Current: [integer]
Hit Points Max: [integer]
Hit Points Threshold: [integer]
Health Conditions: [text|blank]

---RANGE---
Reach: [integer|blank]
Range Normal: [integer|blank]
Range Long: [integer|blank]
Range Units: [ft|m|sq|mi]

---DAMAGE---
Damage Formula: [e.g. 2d6 + @mod]
Damage Type: [acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder]

---MASTERY---
Mastery: [cleave|graze|nick|push|sap|slow|topple|vex|blank]

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

===END WEAPON===
```

---

## **FIELD REFERENCE**

### **Weapon Types**
| Type | Description |
|------|-------------|
| `simpleM` | Simple Melee Weapon |
| `simpleR` | Simple Ranged Weapon |
| `martialM` | Martial Melee Weapon |
| `martialR` | Martial Ranged Weapon |
| `natural` | Natural Weapon (claws, bite, etc.) |
| `improv` | Improvised Weapon |
| `siege` | Siege Weapon |

### **Base Weapons - Melee**
| Simple | Martial |
|--------|---------|
| `club`, `dagger`, `greatclub`, `handaxe`, `javelin`, `lighthammer`, `mace`, `quarterstaff`, `sickle`, `spear` | `battleaxe`, `flail`, `glaive`, `greataxe`, `greatsword`, `halberd`, `lance`, `longsword`, `maul`, `morningstar`, `pike`, `rapier`, `scimitar`, `shortsword`, `trident`, `warpick`, `warhammer`, `whip` |

### **Base Weapons - Ranged**
| Simple | Martial |
|--------|---------|
| `dart`, `lightcrossbow`, `shortbow`, `sling` | `blowgun`, `handcrossbow`, `heavycrossbow`, `longbow`, `net` |

### **Weapon Mastery Properties (2024)**
| Mastery | Effect |
|---------|--------|
| `cleave` | Hit another creature within 5 ft for ability mod damage |
| `graze` | Deal ability mod damage on a miss |
| `nick` | Make extra attack with light weapon as part of Attack action |
| `push` | Push Large or smaller creature 10 ft away |
| `sap` | Disadvantage on target's next attack roll |
| `slow` | Reduce target's speed by 10 ft until your next turn |
| `topple` | Target must make Con save or fall prone |
| `vex` | Advantage on next attack against same target |

### **Recovery Periods**
| Period | Description |
|--------|-------------|
| `lr` | Long Rest |
| `sr` | Short Rest |
| `day` | Daily (any time) |
| `dawn` | At dawn |
| `dusk` | At dusk |
| `recharge` | Roll d6 at dawn; recharge on X+ |

---

## **ENRICHER REFERENCE**

### **Attack Rolls**
```html
[[/attack]]                            → Auto-links to weapon's attack activity
[[/attack +7]]                         → Fixed +7 to hit
[[/attack extended]]                   → "Melee Attack Roll: [+X], reach 5 ft"
[[/attack thrown]]                     → Uses thrown attack mode
[[/attack twoHanded]]                  → Uses two-handed attack mode
```

### **Damage Rolls**
```html
[[/damage 2d6 slashing]]               → [2d6] slashing
[[/damage 2d6 slashing average]]       → 7 (2d6) slashing
[[/damage 1d8 + @mod slashing]]        → Includes ability modifier
[[/damage 2d6 slashing & 1d6 fire average]] → Multiple damage types
[[/damage]]                            → Auto-links to weapon's damage activity
[[/damage twoHanded]]                  → Uses two-handed damage
[[/damage format=extended]]            → "Hit: [2d6] slashing damage"
```

### **Saving Throws**
```html
[[/save str 15]]                       → [DC 15 Strength]
[[/save dex 14 format=long]]           → [DC 14 Dexterity] saving throw
[[/save con dc=@abilities.str.dc]]     → Uses wielder's Strength DC
[[/save con dc=8+@prof+@abilities.str.mod]] → Calculated DC
```

### **Healing**
```html
[[/heal 2d6]]                          → [2d6] healing
[[/heal 2d6 average]]                  → 7 (2d6) healing
[[/heal 10 temp]]                      → [10] temporary hit points
```

### **Ability Checks**
```html
[[/check athletics 15]]                → [DC 15 Strength (Athletics)]
[[/check acrobatics 13 format=long]]   → [DC 13 Dexterity (Acrobatics)] check
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip)
&Reference[restrained]                 → Restrained
&Reference[frightened]                 → Frightened
&Reference[paralyzed]                  → Paralyzed
&Reference[stunned]                    → Stunned
&Reference[poisoned]                   → Poisoned
&Reference[blinded]                    → Blinded
&Reference[grappled]                   → Grappled
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Wielder's name
[[lookup @abilities.str.mod]]          → Strength modifier
[[lookup @attributes.prof]]            → Proficiency bonus
```

---

## **HTML PATTERNS**

### **Standard Magic Weapon**
```html
<p><em>Brief flavor description of the weapon's appearance.</em></p>
<hr>

<p>You have a +X bonus to attack and damage rolls made with this magic weapon.</p>
```

### **Extra Damage on Hit**
```html
<p><strong>Elemental Strike.</strong> When you hit with this weapon, the target takes an extra [[/damage 1d6 fire average]].</p>
```

### **On-Hit Save Effect**
```html
<p><strong>Venomous.</strong> When you hit a creature with this weapon, the target must succeed on a [[/save con 14 format=long]] or become &Reference[poisoned] for 1 minute. The creature can repeat the save at the end of each of its turns, ending the effect on a success.</p>
```

### **Charge-Based Abilities**
```html
<p>This weapon has X charges. While holding it, you can expend charges to use the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The weapon regains 1d4 + 1 expended charges daily at dawn.</p>
```

### **Critical Hit Enhancement**
```html
<p><strong>Devastating Critical.</strong> When you score a critical hit with this weapon, you can roll one additional weapon damage die when determining the extra damage.</p>
```

### **Sentient Weapon**
```html
<p><strong>Sentience.</strong> This weapon is sentient with Intelligence X, Wisdom Y, and Charisma Z. It has hearing and darkvision out to 60 feet. It can communicate telepathically with its wielder and speaks [languages].</p>

<p><strong>Personality.</strong> [Description of the weapon's personality, goals, and potential conflicts.]</p>
```

---

## **EXAMPLE 1: GREATSWORD (Oathblade of the Fallen Paladin)**

```text
===WEAPON===
Name: Oathblade of the Fallen Paladin
Rarity: veryRare
Weapon Type: martialM
Base Weapon: greatsword

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 15000
Price Denomination: gp
Weight Value: 6
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 2

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 2d6 + @mod + 2
Damage Type: slashing

---MASTERY---
Mastery: graze

---PROFICIENCY---
Proficiency: proficient

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
<p><em>This massive blade is forged from blackened steel, its edge eternally sharp. Holy symbols have been scratched out and replaced with profane runes, yet faint traces of divine light still flicker within the metal.</em></p>
<hr>

<p>You have a +2 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Conflicted Soul.</strong> This weapon was once a holy avenger, corrupted when its wielder fell from grace. It deals an extra [[/damage 2d6 necrotic average]] to celestials and an extra [[/damage 2d6 radiant average]] to fiends and undead.</p>

<p><strong>Oathbreaker's Smite.</strong> This weapon has 5 charges. When you hit a creature with this weapon, you can expend charges to deal additional damage:</p>
<ul>
<li><strong>1 Charge:</strong> Deal an extra [[/damage 2d8 necrotic average]].</li>
<li><strong>2 Charges:</strong> Deal an extra [[/damage 3d8 necrotic average]], and the target must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of you until the end of your next turn.</li>
<li><strong>3 Charges:</strong> Deal an extra [[/damage 4d8 necrotic average]], and you regain hit points equal to half the necrotic damage dealt.</li>
</ul>

<p>The weapon regains 1d4 + 1 expended charges daily at dawn.</p>

<p><strong>Echoes of Redemption.</strong> If you use this weapon to defeat a fiend or undead creature of CR 10 or higher, you can choose to permanently remove 1d4 profane runes from the blade. If all runes are removed, the weapon transforms back into a <em>holy avenger</em>.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Corrupted Greatsword
Unidentified Description:
<p>A massive greatsword of blackened steel. Holy symbols have been defaced, and dark runes glow faintly along the blade.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A weapon torn between darkness and the light it once served.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 2: LONGBOW (Whisperwind Bow)**

```text
===WEAPON===
Name: Whisperwind Bow
Rarity: rare
Weapon Type: martialR
Base Weapon: longbow

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: true
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---AMMUNITION---
Ammunition Type: arrow

---RANGE---
Reach: blank
Range Normal: 150
Range Long: 600
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 1
Damage Type: piercing

---MASTERY---
Mastery: slow

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
<p><em>This elegant elven bow is crafted from pale ashwood and strung with spider silk. When drawn, the air around it stills completely—arrows loose from this bow make no sound.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Silent Shot.</strong> Attacks made with this bow make no sound. Creatures cannot use sound to detect where the attack originated from.</p>

<p><strong>Wind's Blessing.</strong> Arrows fired from this bow ignore half cover and three-quarters cover, and you suffer no disadvantage from attacking at long range.</p>

<p><strong>Zephyr Strike.</strong> This bow has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Seeking Arrow (1 Charge):</strong> When you make an attack, the arrow curves around obstacles. The target gains no benefit from cover for this attack, and you have advantage on the attack roll.</li>
<li><strong>Gale Burst (2 Charges):</strong> When you hit a creature, it must succeed on a [[/save str 15 format=long]] or be pushed 15 feet directly away from you and knocked &Reference[prone].</li>
<li><strong>Phantom Arrow (3 Charges):</strong> As a bonus action, you create a magical arrow that doesn't require ammunition. This arrow deals an extra [[/damage 2d6 force average]] and passes through creatures, potentially hitting multiple targets in a 60-foot line. Each creature in the line must make a [[/save dex 15 format=long]], taking [[/damage 3d8 + @mod piercing average]] on a failure, or half on a success.</li>
</ul>

<p>The bow regains all expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Pale Elven Bow
Unidentified Description:
<p>A finely crafted bow of pale wood. The air seems unusually still around it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Death on silent wings.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 3: RAPIER (Viper's Fang)**

```text
===WEAPON===
Name: Viper's Fang
Rarity: rare
Weapon Type: martialM
Base Weapon: rapier

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 3500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
Firearm: false
Focus: false
Heavy: false
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 1
Damage Type: piercing

---MASTERY---
Mastery: vex

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This slender rapier has a blade etched with serpentine patterns. The crossguard is shaped like a coiled viper, its emerald eyes gleaming with malevolent intelligence.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Serpent's Venom.</strong> When you hit a creature with this weapon, the target must succeed on a [[/save con 14 format=long]] or take [[/damage 2d6 poison average]] and become &Reference[poisoned] until the end of your next turn. Once a creature succeeds on this save, it is immune to the poison for 24 hours.</p>

<p><strong>Coiled Strike.</strong> When you take the Attack action on your turn, you can forgo one of your attacks to make a special lunging strike. You can move up to 10 feet toward an enemy without provoking opportunity attacks, and if you hit with the next attack you make this turn, the target takes an extra [[/damage 1d8 piercing average]].</p>

<p><strong>Viper's Reflexes.</strong> While holding this weapon, you have advantage on initiative rolls and can't be surprised while conscious.</p>

<p><strong>Shed Skin.</strong> As a reaction when you are hit by an attack, you can impose disadvantage on the attack roll, potentially causing it to miss. Once used, this property can't be used again until you finish a short or long rest.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Serpent-Hilted Rapier
Unidentified Description:
<p>A slender rapier with a snake-shaped crossguard. The blade has a faint green tint.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Quick as a snake, twice as deadly.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 4: GLAIVE (Reaper's Reach)**

```text
===WEAPON===
Name: Reaper's Reach
Rarity: rare
Weapon Type: martialM
Base Weapon: glaive

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4000
Price Denomination: gp
Weight Value: 6
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: true
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 10
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d10 + @mod + 1
Damage Type: slashing

---MASTERY---
Mastery: topple

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
<p><em>This glaive's blade is forged from cold iron and etched with funerary rites. A faint chill emanates from the weapon, and those near death can see a spectral shroud trailing from its edge.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Soul Sight.</strong> While holding this weapon, you can see the current hit points of any creature within 30 feet as a percentage of their maximum (healthy, bloodied, near death).</p>

<p><strong>Death's Harvest.</strong> When you reduce a creature to 0 hit points with this weapon, you gain [[/heal 1d10 temp]] as the weapon drinks in the creature's fading life force.</p>

<p><strong>Reaper's Sweep.</strong> This weapon has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Sweeping Strike (1 Charge):</strong> When you hit a creature, you can force each other creature of your choice within 5 feet of the target to make a [[/save dex 14 format=long]] or take [[/damage 2d10 slashing average]].</li>
<li><strong>Spectral Extension (2 Charges):</strong> Until the end of your turn, this weapon's reach increases to 15 feet, and attacks deal an extra [[/damage 1d10 necrotic average]].</li>
</ul>

<p>The weapon regains all expended charges daily at dawn.</p>

<p><strong>Grim Reminder.</strong> Undead creatures have disadvantage on saving throws against being turned while within 10 feet of this weapon.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Cold Iron Glaive
Unidentified Description:
<p>A glaive with a blade of dark iron. It radiates an unsettling chill.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
No one escapes the reaper forever.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 5: HANDAXE (Stormthrower)**

```text
===WEAPON===
Name: Stormthrower
Rarity: uncommon
Weapon Type: simpleM
Base Weapon: handaxe

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 1500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: false
Light: true
Loading: false
Magical: true
Reach: false
Reload: false
Returning: true
Silvered: false
Special: false
Thrown: true
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 5
Range Normal: 20
Range Long: 60
Range Units: ft

---DAMAGE---
Damage Formula: 1d6 + @mod + 1
Damage Type: slashing

---MASTERY---
Mastery: vex

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This handaxe crackles with barely contained lightning. Storm clouds seem to gather in miniature around its blade, and thunder rumbles softly when it's drawn.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Returning.</strong> After you throw this weapon, it returns to your hand at the end of your turn.</p>

<p><strong>Lightning Arc.</strong> When you throw this weapon and hit, the target takes an extra [[/damage 1d6 lightning average]]. Additionally, lightning arcs to one creature of your choice within 15 feet of the target, which must succeed on a [[/save dex 13 format=long]] or take [[/damage 1d6 lightning average]].</p>

<p><strong>Thunderclap.</strong> Once per short rest, when you hit a creature with a thrown attack using this weapon, you can cause a thunderous boom. Each creature within 10 feet of the target (including the target) must succeed on a [[/save con 14 format=long]] or be &Reference[deafened] and pushed 10 feet away from the point of impact.</p>

<p><strong>Storm's Blessing.</strong> While holding this weapon, you have resistance to lightning damage.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Crackling Handaxe
Unidentified Description:
<p>A handaxe that sparks with electricity. Small clouds seem to swirl around its head.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Throw the storm.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 6: WARHAMMER (Earthshaker)**

```text
===WEAPON===
Name: Earthshaker
Rarity: rare
Weapon Type: martialM
Base Weapon: warhammer

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
Adamantine: true
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: false
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: false
Versatile: true

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 2

---VERSATILE DAMAGE---
Versatile Formula: 1d10 + @mod + 2
Versatile Damage Type: bludgeoning

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 2
Damage Type: bludgeoning

---MASTERY---
Mastery: push

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
<p><em>This dwarven warhammer is forged from deep iron and engraved with runes of earth and stone. The head seems impossibly dense, and the ground trembles slightly with each swing.</em></p>
<hr>

<p>You have a +2 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Adamantine.</strong> This weapon is made of adamantine. When you hit an object with this weapon, the hit is automatically a critical hit.</p>

<p><strong>Versatile.</strong> This weapon can be wielded with one or two hands. When wielded with two hands, it deals [[/damage 1d10 + @mod + 2 bludgeoning]] damage.</p>

<p><strong>Tremor Strike.</strong> This weapon has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Groundshock (1 Charge):</strong> When you hit a creature, you can cause the ground beneath it to crack. The target and each creature of your choice within 5 feet must succeed on a [[/save dex 15 format=long]] or fall &Reference[prone].</li>
<li><strong>Shockwave (2 Charges):</strong> As an action, you can strike the ground, creating a shockwave. Each creature within 15 feet of you must make a [[/save con 15 format=long]], taking [[/damage 3d8 thunder average]] on a failed save and being knocked &Reference[prone], or half as much damage on a successful save without falling prone.</li>
<li><strong>Earthen Fortress (3 Charges):</strong> As an action, you slam the hammer into the ground. A 10-foot radius area around you becomes &Reference[Difficult Terrain] for enemies for 1 minute. Additionally, you and allies standing in this area have half cover.</li>
</ul>

<p>The weapon regains all expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Dense Dwarven Hammer
Unidentified Description:
<p>An unusually heavy warhammer covered in dwarven runes. The ground seems to shake when it moves.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
When mountains strike back.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 7: SCIMITAR (Moonblade of the Eladrin)**

```text
===WEAPON===
Name: Moonblade of the Eladrin
Rarity: legendary
Weapon Type: martialM
Base Weapon: scimitar

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 50000
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
Firearm: false
Focus: true
Heavy: false
Light: true
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: true
Special: true
Thrown: false
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: elf or half-elf of neutral or good alignment
Magic Bonus: 3

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d6 + @mod + 3
Damage Type: slashing

---MASTERY---
Mastery: nick

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 5
Uses Max: 5

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This elegant curved blade shimmers with captured moonlight. Ancient Elvish script runs along its length, and the blade phases between silver and translucent based on the moon's phase. The weapon hums softly when held by one worthy of its legacy.</em></p>
<hr>

<p>You have a +3 bonus to attack and damage rolls made with this magic weapon. This weapon can be used as a spellcasting focus for your spells.</p>

<p><strong>Sentience.</strong> This moonblade is a sentient neutral good weapon with Intelligence 14, Wisdom 16, and Charisma 18. It has hearing and darkvision out to 120 feet. It can communicate telepathically with its wielder and speaks Elvish, Sylvan, and Common.</p>

<p><strong>Personality.</strong> The moonblade contains the collected wisdom of seven previous wielders. It values honor, protection of the innocent, and the preservation of elven culture. It will not allow itself to be used for evil acts and may refuse to function if its wielder strays from a good alignment.</p>

<p><strong>Lunar Cycle.</strong> This weapon has 5 charges. Its abilities shift based on the moon's phase:</p>
<ul>
<li><strong>New Moon (Stealth):</strong> You become &Reference[invisible] until the end of your next turn (1 Charge).</li>
<li><strong>Waxing Moon (Growth):</strong> You and allies within 30 feet regain [[/heal 2d8 + 4 average]] hit points (2 Charges).</li>
<li><strong>Full Moon (Power):</strong> Your next attack deals an extra [[/damage 4d6 radiant average]] and the target must succeed on a [[/save con 17 format=long]] or be &Reference[blinded] until the end of your next turn (2 Charges).</li>
<li><strong>Waning Moon (Protection):</strong> You gain resistance to all damage until the start of your next turn (3 Charges).</li>
</ul>

<p>The weapon regains all expended charges daily at dawn. The DM determines which phase ability is available based on the in-game moon cycle, or the wielder can choose freely if the moon is not tracked.</p>

<p><strong>Legacy Runes.</strong> Seven runes are inscribed on the blade, each representing a past wielder's contribution. These grant: +3 bonus (base), finesse, light, spellcasting focus, and the Lunar Cycle abilities.</p>

<p><strong>Rejection.</strong> If you are not an elf or half-elf of neutral or good alignment, attempting to attune to this weapon deals [[/damage 6d6 psychic average]] to you and ends the attunement attempt.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Glowing Elven Scimitar
Unidentified Description:
<p>A curved elven blade that glows with soft moonlight. Elvish script runs along its length.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Seven souls guide the blade. Seven legacies live within its edge.
===END CHAT FLAVOR===

===END WEAPON===
```

---
</details>

<details>
<summary><strong>🧪 Strict Consumable Template</strong></summary>

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
</details>

<details>
<summary><strong>🎒 Strict Container Template</strong></summary>

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
</details>

<details>
<summary><strong>🛡️ Strict Equipment Template</strong></summary>

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
</details>

<details>
<summary><strong>💎 Strict Loot Template</strong></summary>

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
</details>

<details>
<summary><strong>✨ Strict Spell Template</strong></summary>

```markdown
===SPELL===
Name: [text]
Level: [0|1|2|3|4|5|6|7|8|9]
School: [abj|con|div|enc|evo|ill|nec|trs]

---COMPONENTS---
Vocal: [true|false]
Somatic: [true|false]
Material: [true|false]

---MATERIALS---
(Required only if Material is true)
Value: [text] (e.g., "a diamond worth 50 gp")
Cost: [integer] (The gold value, e.g. 50)
Supply: [integer] (The numeric quantity if relevant)
Consumed: [true|false]

---PREPARATION---
Method: [atwill|innate|ritual|pact|prepared]
Prepared: [true|false]

---ACTIVATION---
Type: [action|bonus|reaction|minute|hour|day|special]
Value: [integer]
Condition: [text] (For reactions or special)

---RANGE---
Units: [self|touch|spec|any|ft|mi|m|km]
Value: [integer]
Special: [text]

---DURATION---
Units: [inst|spec|turn|round|minute|hour|day|month|year|disp|dstr|perm]
Value: [integer]
Concentration: [true|false]

---TARGETS---
Type: [self|ally|enemy|creature|object|space|creatureOrObject|any|willing]
Count: [integer]
Choice: [true|false]
Special: [text]

---AREA---
(Required only if spell has an area of effect)
Shape: [cone|cube|cylinder|radius|line|sphere|circle|square|wall]
Size: [integer]
Units: [ft|mi|m|km]

---USAGE---
Uses Current: [integer]
Uses Max: [integer]

---RECOVERY---
(Optional, repeatable. Only relevant if Uses Max > 0)
Period: [lr|sr|day|dawn|dusk|recharge]
Type: [recoverAll|loseAll|formula]
Formula: [text]
===END RECOVERY===

---DESCRIPTION---
Description:
[multiline HTML content containing Enrichers]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text]
Unidentified Description:
[multiline HTML content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END SPELL===
```

---

## **ENRICHER REFERENCE**

### **Saving Throws**
```html
[[/save dex]]                          → [Dexterity]
[[/save dex 15]]                       → [DC 15 Dexterity]
[[/save dex dc=@spell.dc]]             → [DC {spell DC} Dexterity]
[[/save dex 15 format=long]]           → [DC 15 Dexterity] saving throw
[[/save str dex 15]]                   → [DC 15 Strength or Dexterity]
[[/save]]                              → Auto-links to item's save activity
```

### **Concentration Saves**
```html
[[/concentration]]                     → [Concentration]
[[/concentration 10]]                  → [DC 10 Concentration]
[[/concentration ability=cha]]         → Uses Charisma instead of default
```

### **Damage Rolls**
```html
[[/damage 8d6 fire]]                   → [8d6] fire
[[/damage 8d6 fire average]]           → 28 (8d6) fire
[[/damage 8d6 fire format=long]]       → [8d6] fire damage
[[/damage 2d6 fire & 1d6 necrotic average]]  → 7 (2d6) fire plus 3 (1d6) necrotic
[[/damage 1d10 bludgeoning slashing]]  → Choice of damage type on roll
[[/damage 1d6 + @mod fire average]]    → Includes ability modifier
[[/damage]]                            → Auto-links to item's damage activity
[[/damage twoHanded]]                  → Uses two-handed attack mode
[[/damage format=extended]]            → "Hit: [Xd6] fire damage" (NPC statblocks)
```

### **Healing**
```html
[[/heal 2d8 + @mod]]                   → [2d8 + @mod] healing
[[/heal 2d8 + @mod average]]           → 9 + MOD (2d8 + @mod) healing
[[/heal 10 temp]]                      → [10] temporary hit points
[[/heal]]                              → Auto-links to item's heal activity
```

### **Attack Rolls**
```html
[[/attack]]                            → Auto-links to item's attack activity
[[/attack +5]]                         → Fixed +5 to hit (traps, etc.)
[[/attack extended]]                   → "Melee Attack Roll: [+X], reach 15 ft"
[[/attack 5 thrown]]                   → Uses thrown attack mode
```

### **Ability/Skill Checks**
```html
[[/check dex]]                         → [Dexterity]
[[/check dex 15]]                      → [DC 15 Dexterity]
[[/check dex 15 format=long]]          → [DC 15 Dexterity] check
[[/check perception]]                  → [Wisdom (Perception)]
[[/check str athletics 15]]            → [DC 15 Strength (Athletics)]
[[/check acrobatics athletics 15]]     → Choice of skill
[[/check perception 15 passive format=long]] → passive Wisdom (Perception) score of 15 or higher
```

### **Condition & Rule References**
```html
&Reference[prone]                      → Prone (with tooltip & link)
&Reference[blinded]                    → Blinded
&Reference[restrained]                 → Restrained
&Reference[incapacitated]              → Incapacitated
&Reference[Difficult Terrain]          → Difficult Terrain
&Reference[prone apply=false]          → No "apply condition" button
```

### **Dynamic Lookups**
```html
[[lookup @name]]                       → Creature's name
[[lookup @name lowercase]]             → creature's name
[[lookup @details.type.config.label]]  → Creature type (e.g., "Fiend")
[[lookup @abilities.con.mod]]          → Constitution modifier
[[lookup @spell.dc]]                   → Spell save DC
[[lookup @name]]{the creature}         → Fallback text if no actor
```

---

## **HTML PATTERNS**

### **Flavor Text Block**
```html
<p><em>Descriptive flavor text in italics...</em></p>
<hr>
```

### **Blockquote for Lore**
```html
<blockquote>"A mystical quote or ancient saying."</blockquote>
```

### **Standard Effect Block**
```html
<p>Each creature in the area must make a [[/save dex dc=@spell.dc format=long]]. On a failed save, a creature takes [[/damage 8d6 fire average]] and is &Reference[prone]. On a successful save, a creature takes half damage and isn't knocked prone.</p>
```

### **Bulleted Mechanics (Complex Spells)**
```html
<ul>
<li><strong>Save:</strong> [[/save con dc=@spell.dc]]</li>
<li><strong>Damage:</strong> [[/damage 6d10 force average]]</li>
<li><strong>Failure:</strong> Target is &Reference[restrained] until the start of your next turn.</li>
<li><strong>Success:</strong> Half damage, no additional effects.</li>
</ul>
```

### **Higher Levels Section**
```html
<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of Xth level or higher, the damage increases by [[/damage 1d6 fire]] for each slot level above X.</p>
</section>
```

### **Concentration Reminder**
```html
<p><strong>Maintaining Concentration.</strong> If you take damage while concentrating on this spell, you must succeed on a [[/concentration]] saving throw or the spell ends.</p>
```

---

## **EXAMPLE 1: AOE DAMAGE + CONDITION (Void Singularity)**

```text
===SPELL===
Name: Void Singularity
Level: 4
School: evo

---COMPONENTS---
Vocal: true
Somatic: true
Material: true

---MATERIALS---
Value: a crushed black pearl worth 100 gp
Cost: 100
Supply: 1
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 120
Special: 

---DURATION---
Units: round
Value: 1
Concentration: true

---TARGETS---
Type: creature
Count: 
Choice: false
Special: 

---AREA---
Shape: sphere
Size: 20
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You tear a hole in reality at a point you can see within range. A sphere of crushing gravity collapses inward, pulling everything toward the center.</em></p>
<hr>

<p>Each creature in a 20-foot-radius sphere centered on that point must make a [[/save str dc=@spell.dc format=long]]. On a failed save, a creature takes [[/damage 6d10 force average]] and is pulled up to 15 feet toward the center of the sphere and is &Reference[restrained] until the start of your next turn. On a successful save, a creature takes half damage and isn't pulled or restrained.</p>

<p>Unsecured objects in the area that aren't being worn or carried take the damage and are pulled toward the center.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 5th level or higher, the damage increases by [[/damage 1d10 force]] for each slot level above 4th.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Unknown Gravity Spell
Unidentified Description:
<p>The caster creates a small black bead that seems to absorb light around it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A singularity opens, crushing everything within with overwhelming gravity.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 2: HEALING + CONDITION REMOVAL (Chrono-Mend)**

```text
===SPELL===
Name: Chrono-Mend
Level: 3
School: trs

---COMPONENTS---
Vocal: true
Somatic: false
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: bonus
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 60
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: ally
Count: 1
Choice: true
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<blockquote>"Time is a river, and sometimes, we must swim upstream."</blockquote>

<p>You rewind time for a creature you can see within range, undoing recent injuries. The target regains [[/heal 3d8 + @mod average]] hit points.</p>

<p>Additionally, you can end one of the following conditions affecting the target: &Reference[blinded], &Reference[deafened], &Reference[paralyzed], or &Reference[poisoned].</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 4th level or higher, the healing increases by [[/heal 1d8]] for each slot level above 3rd.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Time Spell
Unidentified Description:
<p>The caster's eyes glow with a golden light as distinct ticking sounds emanate from their hands.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Time rewinds around the target, knitting wounds and erasing ailments.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 3: SPELL ATTACK + SAVE (Viper Lash)**

```text
===SPELL===
Name: Viper Lash
Level: 1
School: con

---COMPONENTS---
Vocal: true
Somatic: true
Material: true

---MATERIALS---
Value: a dried snake skin
Cost: 0
Supply: 0
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 30
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: creature
Count: 1
Choice: true
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>A spectral green serpent erupts from your hand to strike at a foe.</em></p>
<hr>

<p>Make a melee spell attack against a creature within range. On a hit, the target takes [[/damage 2d8 poison average]] and must succeed on a [[/save con dc=@spell.dc format=long]] or be &Reference[poisoned] until the end of your next turn.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d8 poison]] for each slot level above 1st.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Green Lash
Unidentified Description:
<p>The caster summons a whip made of green energy.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A spectral snake strikes out, dripping with magical venom.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 4: CONCENTRATION + MULTI-DAMAGE (Elemental Maelstrom)**

```text
===SPELL===
Name: Elemental Maelstrom
Level: 5
School: evo

---COMPONENTS---
Vocal: true
Somatic: true
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: self
Value: 
Special: 

---DURATION---
Units: minute
Value: 1
Concentration: true

---TARGETS---
Type: creature
Count: 
Choice: false
Special: 

---AREA---
Shape: sphere
Size: 30
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You become the eye of a raging elemental storm that swirls around you.</em></p>
<hr>

<p>A maelstrom of elemental energy surrounds you in a 30-foot-radius sphere for the duration. When a creature enters the area for the first time on a turn or starts its turn there, it must make a [[/save dex dc=@spell.dc format=long]], taking [[/damage 3d6 fire & 3d6 cold average]] on a failed save, or half as much on a successful one.</p>

<p>The area is &Reference[Difficult Terrain] for creatures other than you.</p>

<p><strong>Maintaining Concentration.</strong> If you take damage while concentrating on this spell, you must succeed on a [[/concentration]] saving throw or the spell ends early.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 6th level or higher, the fire and cold damage each increase by [[/damage 1d6 fire]] for each slot level above 5th.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Storm Spell
Unidentified Description:
<p>A violent swirl of opposing elements surrounds the caster.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Fire and ice rage in a devastating vortex around you.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 5: REACTION SPELL (Temporal Sidestep)**

```text
===SPELL===
Name: Temporal Sidestep
Level: 2
School: div

---COMPONENTS---
Vocal: false
Somatic: true
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: reaction
Value: 1
Condition: which you take when a creature you can see targets you with an attack

---RANGE---
Units: self
Value: 
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: self
Count: 1
Choice: false
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You glimpse a fraction of a second into the future and step aside before the blow lands.</em></p>
<hr>

<p>When a creature you can see targets you with an attack, you can use your reaction to teleport up to 15 feet to an unoccupied space you can see. The triggering attack automatically misses, and you can't be targeted by opportunity attacks until the start of your next turn.</p>

<p>If you teleport to a space that is no longer within the attack's range or behind total cover, the attacker can redirect the attack to another target within range, or the attack is wasted.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Blink Spell
Unidentified Description:
<p>The caster briefly shimmers and vanishes.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
You slip through time, leaving only an afterimage where you stood.
===END CHAT FLAVOR===

===END SPELL===
```

---

</details>

<details>
<summary><strong>⚒️ Strict Tool Template</strong></summary>

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

</details>

---

## Common Issues

**Natural Parsing Improvements**
> Natural Parsing is still being worked on.

**Icons aren't matching automatically.**
> Go to Module Settings and enable **"Match Icons from Compendiums"**. Note: This feature works best with standard D&D 5e item names (e.g., "Longsword", "Potion of Healing"). Im hoping to include randomized compedium images in the near future

**Description is empty.**
> If using Natural Language: Ensure there is a blank line between the stat block and the description.
> If using Strict Format: Ensure the description is between `Description:` and `===END DESCRIPTION===`.

---

## ⚖️ License & Permissions

### Proprietary EULA
This module is licensed under the **GnollStack Proprietary EULA**.
It is **Free for Personal Use**, meaning you can use it in your home games, stream it, or modify it for your own table without restriction.

However, **Commercial Redistribution is Strictly Prohibited.**
You may **NOT** sell this module, bundle it within paid content (such as Patreon maps or adventures), or host it as a commercial service without prior written consent.

### Commercial Licensing
I am open to partnerships! If you are a map maker, adventure writer, or developer who wishes to use this module commercially, please contact me. I offer commercial licenses for:
* Bundling this module with paid VTT content.
* Official integration into commercial systems.
* Custom feature development for your specific product.

### Contact
For licensing inquiries or permission slips:
* **Discord:** `GnollStack` (Preferred)
* **Email:** `Somedudeed@gmail.com`
* *Please do not open GitHub Issues for commercial licensing discussions. But feel free to contact me via Discord or Email*

---
**Author:** [GnollStack](https://github.com/GnollStack)
**Compatibility:** Foundry VTT v13+ / dnd5e 5.1+
