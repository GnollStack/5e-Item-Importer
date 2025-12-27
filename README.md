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

===END WEAPON===
```

**Valid Base Weapons:**
*   **Melee:** `club`, `dagger`, `greatclub`, `handaxe`, `javelin`, `lighthammer`, `mace`, `quarterstaff`, `sickle`, `spear`, `battleaxe`, `flail`, `glaive`, `greataxe`, `greatsword`, `halberd`, `lance`, `longsword`, `maul`, `morningstar`, `pike`, `rapier`, `scimitar`, `shortsword`, `trident`, `warpick`, `warhammer`, `whip`
*   **Ranged:** `dart`, `lightcrossbow`, `shortbow`, `sling`, `blowgun`, `handcrossbow`, `heavycrossbow`, `longbow`, `net`

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
Unidentified Name: Heavy Axe
Unidentified Description:
A large axe with a double head.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A standard greataxe.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 2: MAGICAL WEAPON (Custom Dagger)**

```text
===WEAPON===
Name: Magma Tooth
Rarity: rare
Weapon Type: simpleM
Base Weapon: dagger

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 2500
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
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
Damage Formula: 1d4[piercing] + @mod + 1d6[fire] + 1
Damage Type: piercing, fire

---MASTERY---
Mastery: nick

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3
Destroy on Empty: false

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d3
===END RECOVERY===

---DESCRIPTION---
Description:
<p><i>This dagger appears to be a shard of jagged obsidian. The core glows with a dull, rhythmic heat, like a heartbeat of magma.</i></p>

<h3>Burning Edge</h3>
<p>You have a +1 bonus to attack and damage rolls made with this magic weapon. On a hit, the dagger deals an extra [[/damage 1d6 type=fire]] damage (included in the item formula).</p>

<h3>Magma Burst</h3>
<p>The dagger has 3 charges. While holding it, you can use an action to expend 1 charge to cast <i>Burning Hands</i> (DC 15) from the blade.</p>

<p>You create a cone of fire shooting outward:</p>
<ul>
    <li><b>Area:</b> [[/template type=cone distance=15]]</li>
    <li><b>Save:</b> [[/save ability=dex dc=15]]</li>
    <li><b>Damage:</b> [[/damage 3d6 type=fire]] (Half on success)</li>
</ul>

<p>The dagger regains <b>1d3</b> expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Hot Black Shard
Unidentified Description:
<p>A jagged piece of black glass wrapped in leather. It feels uncomfortably warm to the touch.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
<i>The dagger flares with volcanic heat as it strikes.</i>
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
(See Field Reference below for rules on Potions vs Wands)
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

===END CONSUMABLE===
```

---

## **FIELD REFERENCE**

### **Usage & Recovery Rules:**
*   **For Potions, Food, Poison:** Set `Uses Max: 0`. These are tracked by `Quantity` in Inventory.
*   **For Wands & Rods:** Set `Uses Max` to the number of charges (e.g., 7). Set `Destroy on Empty` if it crumbles to dust.
*   **For Ammunition:** Set `Uses Max: 0`. Tracked by `Quantity`.

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

---

## **EXAMPLE: WAND OF MAGIC MISSILES**
```text
===CONSUMABLE===
Name: Wand of Magic Missiles
Rarity: uncommon
Consumable Type: wand

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

---ATTUNEMENT---
Attunement: none
Attunement By: blank

---USAGE---
Uses Current: 7
Uses Max: 7
Destroy on Empty: true

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d6+1
===END RECOVERY===

---DESCRIPTION---
Description:
This wand has 7 charges. While holding it, you can use an action to expend 1 or more of its charges to cast the magic missile spell from it. For 1 charge, you cast the 1st-level version of the spell. You can increase the spell slot level by one for each additional charge you expend.

The wand regains 1d6 + 1 expended charges daily at dawn. If you expend the wand's last charge, roll a d20. On a 1, the wand crumbles into ashes and is destroyed.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Slender Metal Wand
Unidentified Description:
A thin metal wand tipped with a quartz crystal.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A wand that shoots magic missiles.
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
Unidentified Name: [text|blank]
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

===END EQUIPMENT===
```

---

## **FIELD REFERENCE**

### **Valid Equipment Types & Base Equipment:**
*   **light:** `padded`, `leather`, `studdedleather`
*   **medium:** `hide`, `chainshirt`, `scalemail`, `breastplate`, `halfplate`
*   **heavy:** `ringmail`, `chainmail`, `splint`, `plate`
*   **shield:** `shield`
*   **wondrous, ring, clothing, trinket:** Usually `blank` Base Equipment.

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
Unidentified Name: Magic Plate
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

## **EXAMPLE 2: WONDROUS ITEM (Cloak of Billowing)**

```text
===EQUIPMENT===
Name: Cloak of Billowing
Rarity: common
Equipment Type: wondrous
Base Equipment: blank

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 50
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Magical: true
Adamantine: false
Focus: false
Stealth Disadvantage: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: blank

---ARMOR---
Armor Class: blank
Max Dex Modifier: blank
Strength Requirement: blank

---PROFICIENCY---
Proficiency: automatic

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
This cloak has 1 charge. While wearing it, you can use a bonus action to expend the charge to make the cloak billow dramatically for 1 minute. The cloak regains its charge daily at dawn.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Silk Cloak
Unidentified Description:
A finely made silk cloak.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A cloak that billows dramatically.
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
Unidentified Name: Fine Cloak
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
Unidentified Name: blank
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

## **EXAMPLE: LOOT TEMPLATE**

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
Unidentified Name: Heavy Blue Stone
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
Unidentified Name: Metal Tools
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
Unidentified Name: Shiny Tools
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
Unidentified Name: Dark Pipes
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
Unidentified Name: Shimmering Lyre
Unidentified Description:
A golden lyre with strings that shimmer with magical energy.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical lyre that aids in construction.
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

## License & Credits

### Commercial Licensing & Permissions

This project is strictly **Non-Commercial** under the **Commons Clause**.

If you wish to use this software in a commercial product, sell it as part of a bundle, host it as a paid service, or otherwise monetize this code, you **must** obtain a separate commercial license.

I am open to discussing licensing for:
* Integration into paid VTT modules.
* Commercial hosting or distribution.
* Custom feature development for commercial projects.

**Contact GnollStack for inquiries:**
* **Email:** Somedudeed@gmail.com
* **Discord:** GnollStack
* *Please do not open GitHub Issues for commercial licensing discussions. But feel free to contact me via Github*

**Author:** [GnollStack](https://github.com/GnollStack)
**Compatibility:** Foundry VTT v13+ / dnd5e 5.1+
