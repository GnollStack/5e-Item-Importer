# 5e Item Importer

![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)
![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/total)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/total)

**Stop manually typing items.**  
The **5e Item Importer** allows you to import D&D 5e items (Weapons, Loot, Containers, Spells, etc.) directly from text into Foundry VTT. It supports two powerful workflows:

1.  **Natural Language:** Copy/paste directly from PDFs, D&D Beyond, or websites. This method handles standard D&D 5e formatting.
2.  **Strict Format:** Use the provided templates to generate near perfect imports every time. Great for homebrew, bulk generation, or working with LLMs. **Supports Batch support**

<img width="700" height="602" alt="image" src="https://github.com/user-attachments/assets/c608cb8f-fc8a-405e-b68c-5152508e0d5e" />

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

## 2. Strict Format Parser (AI Powered)
*Best for: Complex homebrew, bulk generation, and 100% accuracy.*

The Strict Parser uses a specific key/value format. This is ideal for using with **LLMs (ChatGPT, Claude, DeepSeek)**. You can paste a "System Prompt" into an AI, tell it "Make me a sword that does ice damage," and it will output a block you can paste directly into Foundry with perfect stats, icons, and configuration.

### Strict Templates
Expand the sections below to copy the templates for your AI prompt or manual entry.

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

---DESCRIPTION---
Description:
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
[multiline text content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END WEAPON===
```

**Valid Base Weapons:**
*   **Melee:** `club`, `dagger`, `greatclub`, `handaxe`, `javelin`, `lighthammer`, `mace`, `quarterstaff`, `sickle`, `spear`, `battleaxe`, `flail`, `glaive`, `greataxe`, `greatsword`, `halberd`, `lance`, `longsword`, `maul`, `morningstar`, `pike`, `rapier`, `scimitar`, `shortsword`, `trident`, `warpick`, `warhammer`, `whip`
*   **Ranged:** `dart`, `lightcrossbow`, `shortbow`, `sling`, `blowgun`, `handcrossbow`, `heavycrossbow`, `longbow`, `net`

---

## **EXAMPLE 1: MELEE WEAPON (Greataxe)**

```text
===WEAPON===
Name: Greataxe
Rarity: common
Weapon Type: martialM
Base Weapon: greataxe

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 30
Price Denomination: gp
Weight Value: 7
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
Magical: false
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: blank

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d12 + @mod
Damage Type: slashing

---MASTERY---
Mastery: cleave

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
A heavy, double-bladed axe capable of cleaving through armor and bone alike.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
blank
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
blank
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 2: RANGED WEAPON (Hand Crossbow)**

```text
===WEAPON===
Name: Hand Crossbow
Rarity: common
Weapon Type: martialR
Base Weapon: handcrossbow

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 75
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: true
Finesse: false
Firearm: false
Focus: false
Heavy: false
Light: true
Loading: true
Magical: false
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: blank

---AMMUNITION---
Ammunition Type: crossbowBolt

---RANGE---
Reach: blank
Range Normal: 30
Range Long: 120
Range Units: ft

---DAMAGE---
Damage Formula: 1d6 + @mod
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
A small crossbow that can be fired with one hand.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
blank
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
blank
===END CHAT FLAVOR===

===END WEAPON===
```
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

---DESCRIPTION---
Description:
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
[multiline text content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 1: AMMUNITION (+1 Arrow)**

```text
===CONSUMABLE===
Name: Arrow +1
Rarity: uncommon
Consumable Type: ammo

---INVENTORY---
Quantity: 20
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 5
Price Denomination: gp
Weight Value: 0.05
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---AMMUNITION PROPERTIES---
Ammunition Type: arrow
Adamantine: false
Silvered: false
Returning: false
Magic Bonus: 1
Damage Formula: blank
Damage Type: blank
Damage Replace: false

---USAGE---
Uses Current: 20
Uses Max: 20
Destroy on Empty: true

---DESCRIPTION---
Description:
You have a +1 bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
This arrow features perfect fletching and a head that never seems to dull.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magic arrow that grants a +1 bonus to hit and damage.
===END CHAT FLAVOR===

===END CONSUMABLE===
```

---

## **EXAMPLE 2: POTION (Standard)**

```text
===CONSUMABLE===
Name: Potion of Healing
Rarity: common
Consumable Type: potion

---INVENTORY---
Quantity: 1
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 50
Price Denomination: gp
Weight Value: 0.5
Weight Units: lb

---PROPERTIES---
Magical: true

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---USAGE---
Uses Current: 1
Uses Max: 1
Destroy on Empty: true

---DESCRIPTION---
Description:
You regain 2d4 + 2 hit points when you drink this potion. The potion's red liquid glimmers when agitated.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
A glass vial filled with a glimmering red liquid.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A character drinks the potion and feels their wounds knit together.
===END CHAT FLAVOR===

===END CONSUMABLE===
```
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
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
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
Unidentified Description:
A worn leather bag that seems lighter than it should be.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical bag with extradimensional space.
===END CHAT FLAVOR===

===END CONTAINER===
```
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

---DESCRIPTION---
Description:
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
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

## **EXAMPLE 2: WONDROUS ITEM (Cloak of Protection)**

```text
===EQUIPMENT===
Name: Cloak of Protection
Rarity: uncommon
Equipment Type: wondrous
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 350
Price Denomination: gp
Weight Value: 3
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
You gain a +1 bonus to AC and saving throws while you wear this cloak.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
A finely made cloak that feels warm to the touch.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical cloak of protection.
===END CHAT FLAVOR===

===END EQUIPMENT===
```

---

## **EXAMPLE 3: VEHICLE (Naval Ram)**

```text
===EQUIPMENT===
Name: Naval Ram
Rarity: common
Equipment Type: vehicle
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 1000
Price Denomination: gp
Weight Value: 2000
Weight Units: lb

---PROPERTIES---
Magical: false
Adamantine: false
Focus: false
Stealth Disadvantage: false

---VEHICLE PROPERTIES---
Vehicle Armor Class: 20
Cover: total
Hit Points Current: 100
Hit Points Max: 100
Hit Points Threshold: 10
Health Conditions: blank
Speed: 0
Speed Conditions: blank

---PROFICIENCY---
Proficiency: automatic

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
A massive iron ram attached to the front of a warship.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
blank
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A siege weapon for ships.
===END CHAT FLAVOR===

===END EQUIPMENT===
```
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
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
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

## **EXAMPLE: FILLED TEMPLATE**

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
Unidentified Description:
A heavy, blue stone that feels cold to the touch.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
The gem sparkles with an inner light.
===END CHAT FLAVOR===

===END LOOT===
```
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

---DESCRIPTION---
Description:
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
[multiline text content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END TOOL===
```

**Valid Base Tool IDs:**
*   **art:** `alch`, `brew`, `calli`, `carp`, `carta`, `cob`, `cook`, `glass`, `jewel`, `leath`, `maso`, `paint`, `pott`, `smith`, `tink`, `weav`, `wood`
*   **game:** `dice`, `card`, `chess`
*   **music:** `bagpipes`, `drum`, `dulcimer`, `flute`, `horn`, `lute`, `lyre`, `panflute`, `shawm`, `viol`
*   **other:** `disg`, `forg`, `herb`, `navg`, `pois`, `thief`

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
</details>

---

## Common Issues

**The "Import Item" button isn't showing up.**
> Ensure you are in the **Items Directory** tab (the dagger icon). The button does not appear in the Actors or Compendium tabs.

**Icons aren't matching automatically.**
> Go to Module Settings and enable **"Match Icons from Compendiums"**. Note: This feature works best with standard D&D 5e item names (e.g., "Longsword", "Potion of Healing").

**Description is empty.**
> If using Natural Language: Ensure there is a blank line between the stat block and the description.
> If using Strict Format: Ensure the description is between `Description:` and `===END DESCRIPTION===`.

---

## License & Credits

**License:** MIT License  
**Author:** [GnollStack](https://github.com/GnollStack)  
**Compatibility:** Foundry VTT v13+ / dnd5e 5.1+

*Concept inspired by the original 5e-statblock-importer by Aioros.*
