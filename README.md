<div align="center">

# 5e Item Importer

**Stop manually typing items.**

[![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer?label=Latest%20Release&style=flat-square)](https://github.com/GnollStack/5e-Item-Importer/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/total?style=flat-square&color=green)](https://github.com/GnollStack/5e-Item-Importer/releases)
[![Downloads@latest](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/total?style=flat-square)](https://github.com/GnollStack/5e-Item-Importer/releases/latest)
[![Foundry VTT](https://img.shields.io/badge/Foundry-v14-orange?style=flat-square)](https://foundryvtt.com)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20a%20Steak-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/gnollstack)

*For GMs who want D&D 5e items imported from text instead of typed by hand.*

[Features](#what-you-get) &middot; [Quick Start](#quick-start) &middot; [Preview](#preview) &middot; [Installation](#installation) &middot; [Compatibility](#compatibility) &middot; [Templates](#template-reference) &middot; [Common Issues](#common-issues) &middot; [Community](#community) &middot; [Contributing](#contributing) &middot; [AI Use](#ai-use) &middot; [Support](#support-development) &middot; [License](#license-permissions)

</div>

---

## Feature Index

| Feature | Why it matters |
| --- | --- |
| **[Natural Language Parser](#natural-language-parser)** | Copy/paste directly from PDFs, D&D Beyond, or websites. This method handles standard D&D 5e formatting. |
| **[Strict Format Parser](#strict-format-parser)** | Use the provided templates to generate near perfect imports every time. |
| **[Batch / LLM-Friendly Imports](#batch-and-llm-friendly-imports)** | Great for homebrew, bulk generation, or working with LLMs. |
| **[Template Downloads](#template-reference)** | Download the canonical template files for weapons, consumables, containers, equipment, loot, spells, and tools. |
| **[Common Issues](#common-issues)** | Quick fixes for natural parsing, icons, and descriptions. |

> *The **5e Item Importer** allows you to import D&D 5e items directly from text into Foundry VTT. It supports two powerful workflows: Natural Language and Strict Format.*

---

<a id="quick-start"></a>

## Quick Start

1. Install and enable **5e Item Importer** in your world.
2. Open the **Items Directory** in Foundry.
3. Click **Import Item**.
4. Paste the item text and click **Import**.
5. Parse and then Import. You can choose a file to put it into.

---

<a id="preview"></a>

## Preview

<img width="640" height="865" alt="5e Item Importer preview" src="https://github.com/user-attachments/assets/c9d0b2ea-930d-4600-849c-200e8b4f40e6" />

### See it in Action on YouTube

- [5e Importer V13.2.0](https://youtu.be/THrikJq0EY4)
- [5e Importer V13.7.2](https://youtu.be/dyhUoiNYxmA?si=DozAjOLjFGEmcAk-)

---

<a id="what-you-get"></a>

## What You Get

### Natural Language Parser
**Copy/paste directly from PDFs, D&D Beyond, or websites.**

The module attempts to read standard D&D 5e statblock formatting. It automatically detects item types, costs, weights, and damage formulas.

### Strict Format Parser
**Use the provided templates to generate near perfect imports every time.**

The Strict Parser uses a specific key/value format. This is ideal for using with **LLMs (ChatGPT, Claude, Gemini)**. You can paste a System Prompt into an AI, tell it "Make me a sword that does ice damage," and it will output a block you can paste directly into Foundry with the stats, icons, and configuration filled in on the imported item.

<a id="batch-and-llm-friendly-imports"></a>

### Batch and LLM-Friendly Imports
**Great for homebrew, bulk generation, or working with LLMs.**

Strict Format supports batches by stacking different item types in one block or separating multiple items of the same type with YAML document separators. Supported top-level keys are `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, and `CONTAINER`.

---

<a id="installation"></a>

## Installation

1. Foundry -> **Add-on Modules** -> **Install Module**.
2. Search "5e Item Importer", or paste this manifest URL:

```text
https://github.com/GnollStack/5e-Item-Importer/releases/latest/download/module.json
```

3. Enable the module in your world.

---

<a id="compatibility"></a>

## Compatibility

| Requirement | Version |
| --- | --- |
| Foundry VTT | v14+ (verified through v14.363) |
| D&D 5e System | v5.3.3+ (verified through v5.3.3) |

This release line intentionally targets Foundry VTT v14 and dnd5e v5.3.x. If your world is staying on Foundry v13, use the last stable v13-compatible release instead.

---

<a id="natural-language-parser"></a>

## Natural Language Parser
*Best for: Quick imports from books, PDFs, or websites.*

**This feature is still under active development**

The module attempts to read standard D&D 5e statblock formatting. It automatically detects item types, costs, weights, and damage formulas.

**How to use:**
1.  Copy the item text from your source.
2.  Open the **Items Directory** in Foundry.
3.  Click **Import Item**.
4.  Paste the text and click **Import**.
5.  Parse and then Import. You can choose a file to put it into.

<details>
<summary><strong>📄 View Natural Language Template & Examples</strong></summary>

###### Best Practice Patterns
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

##### **BEST PRACTICE PATTERNS**
*Based on parser logic in `naturalItemParser.js`*

###### **1. Naming & Header**
The parser uses 3 strategies. The safest is Title Case on the first line.
*   **Good:** `Flame Tongue`
*   **Better:** `Name: Flame Tongue` (Guarantees 100% confidence)

###### **2. Type Detection**
Include specific keywords in the first 3 lines to trigger type detection:
*   **Weapon:** "Weapon", "Melee Weapon", "Ranged Weapon", "Attack Roll"
*   **Armor:** "Armor", "Shield", "Plate", "Leather", "AC"
*   **Consumable:** "Potion", "Scroll", "Food", "Drink", "Ammunition"
*   **Tool:** "Tool", "Kit", "Instrument", "Gaming Set"
*   **Container:** "Bag", "Backpack", "Box", "Holds", "Capacity"
*   **Loot:** "Gem", "Art Object", "Treasure", "Material"

###### **3. Weapons**
To ensure correct parsing of damage and properties:
*   **Type:** Use full terms like "Martial Melee Weapon" or "Simple Ranged Weapon".
*   **Damage:** Format as `1d8 slashing` or `Damage: 2d6 fire`.
*   **Properties:** List them clearly: `Finesse, Light, Thrown`.
*   **Versatile:** Use the specific format `Versatile (1d10)`.

###### **4. Armor & Equipment**
*   **AC:** Use `AC 18` or `Armor Class: 14`.
*   **Stealth:** Use the phrase `Disadvantage on Stealth checks`.
*   **Strength:** Use `Requires Strength 13` or `Str 15`.

###### **5. Containers**
The parser looks for specific capacity phrases:
*   **Weight:** "Holds 500 pounds" or "Capacity: 500 lbs".
*   **Volume:** "64 cubic feet".
*   **Currency:** "Contains 50 gp" or "Holds 10 platinum".

---

##### **EXAMPLE: WEAPON (Best Result)**

###### Input
```text
Stormglass Rapier
Weapon (rapier), rare (requires attunement)
Cost: 2500 gp, Weight: 2 lb.
Damage: 1d8 piercing
Properties: Finesse

This slender blade is forged from blue crystal that hums before a storm. The wielder has a +1 bonus to attack and damage rolls made with this magic weapon. When the wielder hits a creature with it, the target takes an extra 1d6 lightning damage. Once per turn, the wielder can force the target to make a DC 14 Constitution saving throw or be deafened until the end of its next turn.
```

##### **EXAMPLE: ARMOR (Best Result)**

###### Input
```text
Emberguard Half Plate
Armor (half plate), rare (requires attunement)
Cost: 3500 gp, Weight: 40 lb.
Armor Class: 15 (max Dex 2)

This blackened half plate is warm to the touch and etched with lines like cooling lava. While wearing this armor, the wearer has a +1 bonus to AC and resistance to fire damage. When a creature within 5 feet hits the wearer with a melee attack, sparks leap from the plates and scorch the attacker.
```

##### **EXAMPLE: CONTAINER (Best Result)**

###### Input
```text
Moonwell Bag
Container, uncommon
Weight: 2 lb.

This silver-threaded bag feels cool even in direct sunlight. The bag can hold up to 120 pounds, not exceeding a volume of 12 cubic feet, and its contents do not add to the carrier's encumbrance. The carrier can whisper the name of a stored item to retrieve it without searching. The bag currently contains 3 moonstones, 20 gp, and 12 sp.
```

##### **EXAMPLE: TOOL (Best Result)**

###### Input
```text
Cartographer's Quillcase
Tool, uncommon
Cost: 75 gp, Weight: 1 lb.

This lacquered case contains enchanted inks, folding rulers, waxed vellum, and a silver nib that points toward true north. Proficiency with these tools lets the user add their proficiency bonus to ability checks they make to draw maps, mark safe routes, or decode old survey notes. Once per day, the user can mark one safe route they can see; checks to follow that route have advantage for 24 hours.
```

---

##### **HOW IT WORKS (Internal Logic)**
1.  **Extraction:** The parser scans the text using Regex to find Stats (Name, Type, Cost, Weight, Damage, Properties, AC, etc.).
2.  **Stripping:** It removes lines that look like Stats to isolate the **Description**.
3.  **Conversion:** It builds a YAML document matching the strict template format.
4.  **Final Pass:** It runs the generated YAML through the `YamlItemParser` for validation and item creation.

</details>

---

<a id="strict-format-parser"></a>

## Strict Format Parser
*Best for: Complex homebrew and bulk generation.*

The Strict Parser uses a specific key/value format. This is ideal for using with **LLMs (ChatGPT, Claude, Gemini)**. You can paste a System Prompt into an AI, tell it "Make me a sword that does ice damage," and it will output a block you can paste directly into Foundry with the stats, icons, and configuration filled in on the imported item. Note that this only fills in the basic item fields and details.

<a id="validated-custom-yaml-examples"></a>

### Validated Custom YAML Examples

These examples were validated through the 5e Item Importer MCP diagnostics. They intentionally use optional sections like uses, recovery, chat flavor, unidentified descriptions, dnd5e enrichers, and dynamic name lookups, while avoiding inline activity and active-effect blocks so they work with only 5e Item Importer installed.

For mixed weapon damage, use a dnd5e typed custom formula such as `1d8[piercing] + 1d6[lightning]` and set `Damage Type` to the weapon's primary damage type, such as `piercing`. Do the same for `Versatile Damage Type`. The primary type gives dnd5e a default for system-added ability and magic bonuses, while bracketed formula terms keep extra damage such as lightning separate for resistance and immunity. Use `n/a` only for fully self-contained typed formulas that will not receive system-added ability, magic, or ammunition bonuses. For saves, conditions, healing, and other effects that need automation beyond base item fields, keep the rules in the description text unless the user explicitly wants Activity Importer support.

<a id="validated-yaml-stormglass-rapier"></a>

<details>
<summary><strong>⚔️ Stormglass Rapier (`WEAPON`)</strong></summary>


```yaml
WEAPON:
  ITEM:
    Name: "Stormglass Rapier"
    Rarity: rare
    Weapon Type: martialM
    Base Weapon: rapier

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 2500
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb

  PROPERTIES:
    Adamantine: false
    Ammunition: false
    Magical: true
    Finesse: true
    Firearm: false
    Focus: false
    Heavy: false
    Light: false
    Loading: false
    Reach: false
    Reload: false
    Returning: false
    Silvered: false
    Special: true
    Thrown: false
    Two-Handed: false
    Versatile: false

  ATTUNEMENT:
    Attunement: required
    Attunement By: n/a
    Magic Bonus: 1

  RANGE:
    Reach: 5
    Range Normal: n/a
    Range Long: n/a
    Range Units: ft

  DAMAGE:
    Damage Formula: "1d8[piercing] + 1d6[lightning]"
    Damage Type: piercing

  MASTERY:
    Mastery: vex

  PROFICIENCY:
    Proficient: Automatic

  USAGE:
    Uses Spent: 0
    Uses Max: 3

  RECOVERY:
    - Period: dawn
      Type: formula
      Formula: "1d3"

  DESCRIPTION:
    Description: |
      <p>This slender blade is forged from blue crystal that hums before a storm.</p>
      <p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>
      <p><strong>Stormglass Edge.</strong> When [[lookup @name]]{the creature} hits with this weapon, the target takes an extra [[/damage 1d6 lightning average]].</p>
      <p><strong>Thunderhead Lunge.</strong> [[lookup @name]]{The creature} can expend 1 charge to force the target to make a [[/save con 14 format=long]] or be &Reference[deafened] until the end of its next turn.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Blue Crystal Rapier"
    Unidentified Description: |
      <p>A finely balanced rapier with a translucent blue blade and a faint static hum.</p>

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} thrusts with a storm-bright blade.
```

</details>

<a id="validated-yaml-emberguard-half-plate"></a>

<details>
<summary><strong>🛡️ Emberguard Half Plate (`EQUIPMENT`)</strong></summary>


```yaml
EQUIPMENT:
  ITEM:
    Name: "Emberguard Half Plate"
    Rarity: rare
    Equipment Type: medium
    Base Equipment: halfplate

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 3500
    Price Denomination: gp
    Weight Value: 40
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Adamantine: false
    Focus: false
    Stealth Disadvantage: true

  ATTUNEMENT:
    Attunement: required
    Attunement By: n/a
    Magic Bonus: 1

  ARMOR:
    Armor Class: 15
    Max Dex Modifier: 2
    Strength Requirement: n/a

  PROFICIENCY:
    Proficient: Automatic

  USAGE:
    Uses Spent: 0
    Uses Max: 2

  RECOVERY:
    - Period: dawn
      Type: recoverAll
      Formula: n/a

  DESCRIPTION:
    Description: |
      <p>This blackened half plate is warm to the touch and etched with lines like cooling lava.</p>
      <p>While [[lookup @name]]{the creature} wears this armor, they have a +1 bonus to AC and resistance to &Reference[fire] damage.</p>
      <p><strong>Cinder Flare.</strong> When a creature within 5 feet hits [[lookup @name]]{the creature} with a melee attack, they can expend 1 charge to deal [[/damage 2d6 fire average]] to the attacker.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Blackened Half Plate"
    Unidentified Description: |
      <p>Blackened half plate with dull red seams and a faint smell of smoke.</p>

  CHAT_FLAVOR:
    Chat Description: |
      Sparks crawl across [[lookup @name]]{the creature}'s armor.
```

</details>

<a id="validated-yaml-potion-of-sunlit-breath"></a>

<details>
<summary><strong>🧪 Potion of Sunlit Breath (`CONSUMABLE`)</strong></summary>


```yaml
CONSUMABLE:
  ITEM:
    Name: "Potion of Sunlit Breath"
    Rarity: uncommon
    Consumable Type: potion

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 125
    Price Denomination: gp
    Weight Value: 0.5
    Weight Units: lb

  PROPERTIES:
    Magical: true

  ATTUNEMENT:
    Attunement: none
    Attunement By: n/a

  USAGE:
    Uses Spent: 0
    Uses Max: 1
    Destroy on Empty: true

  RECOVERY: []

  DESCRIPTION:
    Description: |
      <p>This golden potion fizzes with tiny motes of warm light.</p>
      <p>When [[lookup @name]]{the creature} drinks it, they regain [[/heal 2d4 + 2 average]] hit points and can breathe underwater and in smoke-filled air for 1 hour.</p>
      <p>During that hour, [[lookup @name]]{the creature} sheds dim sunlight in a 5-foot radius.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Golden Fizzing Potion"
    Unidentified Description: |
      <p>A sealed vial of golden liquid with bubbles that rise like sparks.</p>

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} drinks a potion bright as sunrise.
```

</details>

<a id="validated-yaml-moonwell-bag"></a>

<details>
<summary><strong>🎒 Moonwell Bag (`CONTAINER`)</strong></summary>


```yaml
CONTAINER:
  ITEM:
    Name: "Moonwell Bag"
    Rarity: uncommon

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 300
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Weightless Contents: true

  ATTUNEMENT:
    Attunement: none
    Attunement By: n/a

  CAPACITY:
    Item Count: 12
    Weight Capacity Value: 120
    Weight Capacity Units: lb
    Volume Capacity Value: 12
    Volume Capacity Units: cubicFoot

  CURRENCY_CONTENTS:
    Platinum: 0
    Gold: 20
    Electrum: 0
    Silver: 12
    Copper: 0

  DESCRIPTION:
    Description: |
      <p>This silver-threaded bag feels cool even in direct sunlight.</p>
      <p>The bag can hold up to 120 pounds, not exceeding a volume of 12 cubic feet, and its contents do not add to the carrier's encumbrance.</p>
      <p><strong>Moonwell Pocket.</strong> As an action, [[lookup @name]]{the creature} can whisper the name of a stored item to retrieve it without searching.</p>
      <p><strong>Overfilled.</strong> If the bag is overloaded, it ruptures and spills moonlit mist into the nearest unoccupied space.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Silver-Threaded Bag"
    Unidentified Description: |
      <p>A soft travel bag stitched with silver thread and tiny pearl toggles.</p>

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} reaches into a cold shimmer of moonlight.
```

</details>

<a id="validated-yaml-starfall-opal"></a>

<details>
<summary><strong>💎 Starfall Opal (`LOOT`)</strong></summary>


```yaml
LOOT:
  ITEM:
    Name: "Starfall Opal"
    Rarity: rare
    Loot Type: gem

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 750
    Price Denomination: gp
    Weight Value: 0
    Weight Units: lb

  PROPERTIES:
    Magical: true

  DESCRIPTION:
    Description: |
      <p>This dark opal holds a silver streak like a falling star.</p>
      <p><strong>Diviner's Lens.</strong> A spellcaster can use the opal as a focus for divination rituals. A creature examining it can identify the omen trapped inside with a [[/check arcana 15 format=long]].</p>
      <p><strong>Celestial Residue.</strong> The gem is warm near sources of &Reference[radiant] damage and cold near sources of &Reference[necrotic] damage.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Dark Opal"
    Unidentified Description: |
      <p>A polished black opal with a pale streak deep beneath its surface.</p>

  CHAT_FLAVOR:
    Chat Description: |
      The opal catches the light like a tiny falling star.
```

</details>

<a id="validated-yaml-lantern-mote"></a>

<details>
<summary><strong>✨ Lantern Mote (`SPELL`)</strong></summary>


```yaml
SPELL:
  ITEM:
    Name: "Lantern Mote"
    Level: 1
    School: evo
    Ability: n/a

  COMPONENTS:
    Vocal: true
    Somatic: true
    Material: true

  MATERIALS:
    Value: "a firefly wing sealed in amber"
    Cost: 0
    Supply: 1
    Consumed: false

  PREPARATION:
    Method: spell
    Prepared: true

  ACTIVATION:
    Type: action
    Value: 1
    Condition: n/a

  RANGE:
    Units: ft
    Value: 60

  DURATION:
    Units: minute
    Value: 10
    Concentration: false

  TARGETS:
    Type: space
    Count: 1
    Choice: false
    Special: n/a

  AREA:
    Shape: sphere
    Size: 10
    Units: ft
    Count: n/a
    Width: n/a
    Height: n/a
    Contiguous: n/a

  USAGE:
    Uses Spent: 0
    Uses Max: n/a

  RECOVERY: []

  DESCRIPTION:
    Description: |
      <p>[[lookup @name]]{The creature} creates a tiny floating mote of warm light at a point they can see within range.</p>
      <p>The mote sheds bright light in a 10-foot radius and dim light for an additional 10 feet. Invisible creatures in the bright light shimmer with a faint outline but are not revealed automatically.</p>
      <p>When the spell ends, one creature of the caster's choice in the bright light gains [[/heal 1d4 temp average]] temporary hit points.</p>
      <section class="secret" id="upcast"><p><strong>At Higher Levels.</strong> When [[lookup @name]]{the creature} casts this spell using a spell slot of 2nd level or higher, the bright-light radius increases by 5 feet for each slot level above 1st.</p></section>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: n/a
    Unidentified Description: |
      n/a

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} releases a small sun-colored mote.
```

</details>

<a id="validated-yaml-cartographers-quillcase"></a>

<details>
<summary><strong>⚒️ Cartographer's Quillcase (`TOOL`)</strong></summary>


```yaml
TOOL:
  ITEM:
    Name: "Cartographer's Quillcase"
    Rarity: uncommon
    Tool Type: art
    Base Tool: cartographer

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 75
    Price Denomination: gp
    Weight Value: 1
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Tool Bonus: 1

  ATTUNEMENT:
    Attunement: none
    Attunement By: n/a

  ABILITY_CHECK:
    Proficient: Automatic
    Ability: wis

  USAGE:
    Uses Spent: 0
    Uses Max: 3

  RECOVERY:
    - Period: dawn
      Type: recoverAll
      Formula: n/a

  DESCRIPTION:
    Description: |
      <p>This lacquered case contains enchanted inks, folding rulers, waxed vellum, and a silver nib that points toward true north.</p>
      <p>While using these tools, [[lookup @name]]{the creature} has a +1 bonus to ability checks made with them.</p>
      <p><strong>True-North Mark.</strong> [[lookup @name]]{The creature} can expend 1 charge while drawing a map to mark one safe route they can see. For the next 24 hours, checks to follow that route can use [[/check survival 13 format=long]] or [[/check cartographer 13 format=long]].</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Lacquered Quillcase"
    Unidentified Description: |
      <p>A travel-worn case filled with precise mapping tools and unusually bright ink.</p>

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} sketches a line that refuses to point anywhere but true north.
```

</details>

<a id="validated-mixed-batch-example"></a>

<details>
<summary><strong>📦 Mixed-Type Batch Example</strong></summary>


```yaml
WEAPON:
  ITEM:
    Name: "Stormglass Rapier"
    Rarity: rare
    Weapon Type: martialM
    Base Weapon: rapier
  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false
  COST_AND_WEIGHT:
    Price Value: 2500
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb
  PROPERTIES:
    Magical: true
    Finesse: true
  ATTUNEMENT:
    Attunement: required
    Magic Bonus: 1
  RANGE:
    Reach: 5
  DAMAGE:
    Damage Formula: "1d8[piercing] + 1d6[lightning]"
    Damage Type: piercing
  USAGE:
    Uses Spent: 0
    Uses Max: 3
  RECOVERY:
    - Period: dawn
      Type: formula
      Formula: "1d3"
  DESCRIPTION:
    Description: |
      <p>A blue crystal dueling blade that crackles before a storm. When [[lookup @name]]{the creature} hits with it, the target takes an extra [[/damage 1d6 lightning average]].</p>

CONSUMABLE:
  ITEM:
    Name: "Potion of Sunlit Breath"
    Rarity: uncommon
    Consumable Type: potion
  COST_AND_WEIGHT:
    Price Value: 125
    Price Denomination: gp
    Weight Value: 0.5
    Weight Units: lb
  PROPERTIES:
    Magical: true
  USAGE:
    Uses Spent: 0
    Uses Max: 1
    Destroy on Empty: true
  RECOVERY: []
  DESCRIPTION:
    Description: |
      <p>For 1 hour, [[lookup @name]]{the creature} can breathe underwater and in smoke-filled air.</p>
  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} drinks a potion bright as sunrise.

LOOT:
  ITEM:
    Name: "Starfall Opal"
    Rarity: rare
    Loot Type: gem
  COST_AND_WEIGHT:
    Price Value: 750
    Price Denomination: gp
    Weight Value: 0
    Weight Units: lb
  PROPERTIES:
    Magical: true
  DESCRIPTION:
    Description: |
      <p>This dark opal holds a silver streak like a falling star. A creature examining it can identify the omen trapped inside with a [[/check arcana 15 format=long]].</p>
```

</details>

<a id="validated-same-type-batch-example"></a>

<details>
<summary><strong>🔁 Same-Type Batch Example</strong></summary>


```yaml
WEAPON:
  ITEM:
    Name: "Stormglass Rapier"
    Rarity: rare
    Weapon Type: martialM
    Base Weapon: rapier
  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false
  COST_AND_WEIGHT:
    Price Value: 2500
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb
  PROPERTIES:
    Magical: true
    Finesse: true
  ATTUNEMENT:
    Attunement: required
    Magic Bonus: 1
  RANGE:
    Reach: 5
  DAMAGE:
    Damage Formula: "1d8[piercing] + 1d6[lightning]"
    Damage Type: piercing
  MASTERY:
    Mastery: vex
  USAGE:
    Uses Spent: 0
    Uses Max: 3
  RECOVERY:
    - Period: dawn
      Type: formula
      Formula: "1d3"
  DESCRIPTION:
    Description: |
      <p>A blue crystal dueling blade that crackles before a storm. When [[lookup @name]]{the creature} hits with it, the target takes an extra [[/damage 1d6 lightning average]].</p>
---
WEAPON:
  ITEM:
    Name: "Whisperpin Dagger"
    Rarity: uncommon
    Weapon Type: simpleM
    Base Weapon: dagger
  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false
  COST_AND_WEIGHT:
    Price Value: 600
    Price Denomination: gp
    Weight Value: 1
    Weight Units: lb
  PROPERTIES:
    Magical: true
    Finesse: true
    Light: true
    Thrown: true
    Returning: true
  ATTUNEMENT:
    Attunement: none
    Attunement By: n/a
    Magic Bonus: 1
  RANGE:
    Reach: 5
    Range Normal: 20
    Range Long: 60
    Range Units: ft
  DAMAGE:
    Damage Formula: "1d4"
    Damage Type: piercing
  MASTERY:
    Mastery: nick
  PROFICIENCY:
    Proficient: Automatic
  USAGE:
    Uses Spent: 0
    Uses Max: 2
  RECOVERY:
    - Period: dusk
      Type: recoverAll
      Formula: n/a
  DESCRIPTION:
    Description: |
      <p>A matte-black returning dagger that drinks in nearby sound.</p>
      <p>When [[lookup @name]]{the creature} hits with this weapon, they can expend 1 charge to force the target to make a [[/save wis 13 format=long]] or be unable to speak above a whisper until the end of its next turn.</p>
  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} throws a blade that returns without a sound.
```

</details>

<a id="template-reference"></a>

### dnd5e Description Features

`Description` and `Chat Description` fields preserve Foundry/dnd5e text features for Foundry to resolve when displayed. You can use dnd5e enrichers like `[[/damage 1d6 fire average]]`, roll-data formulas like `@prof`, dynamic lookups like `[[lookup @name]]{the creature}`, System HTML classes, and pass-through document links like `@UUID[...]` or `@Embed[...]`.

Use dynamic name lookups for active narration and chat flavor, such as `[[lookup @name]]{The creature} drinks the potion.` or `When [[lookup @name]]{the creature} hits with this weapon...`. Keep passive rules text natural.

Optional companion: **Token Name Lookup** can make the same stock dnd5e `[[lookup @name]]` text prefer concrete token names for aliases, disguises, and token inventory views. Items remain fully compatible without that module; dnd5e simply resolves the lookup to the actor name.

### Template Downloads

The full strict templates live as real module files under `templates/YAML Templates/`. Use those files as the source of truth; the README keeps only validated examples so the docs do not drift.

After installing the module, the same files are available locally in your Foundry data folder:

```text
modules/5e-item-importer/templates/YAML Templates/
```

| Template | View in Repo | Raw Download |
| --- | --- | --- |
| Weapon | [Strict Weapon Template](templates/YAML%20Templates/Strict%20Weapon%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Weapon%20Template.md) |
| Consumable | [Strict Consumable Template](templates/YAML%20Templates/Strict%20Consumable%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Consumable%20Template.md) |
| Container | [Strict Container Template](templates/YAML%20Templates/Strict%20Container%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Container%20Template.md) |
| Equipment | [Strict Equipment Template](templates/YAML%20Templates/Strict%20Equipment%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Equipment%20Template.md) |
| Loot | [Strict Loot Template](templates/YAML%20Templates/Strict%20Loot%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Loot%20Template.md) |
| Spell | [Strict Spell Template](templates/YAML%20Templates/Strict%20Spell%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Spell%20Template.md) |
| Tool | [Strict Tool Template](templates/YAML%20Templates/Strict%20Tool%20Template.md) | [Raw](https://raw.githubusercontent.com/GnollStack/5e-Item-Importer/main/templates/YAML%20Templates/Strict%20Tool%20Template.md) |

For import-ready examples, use the [validated custom YAML examples](#validated-custom-yaml-examples), the [mixed-type batch example](#validated-mixed-batch-example), and the [same-type batch example](#validated-same-type-batch-example) above.

---

<a id="common-issues"></a>

## Common Issues

**Natural Parsing Improvements**
> Natural Parsing is still being worked on.

**Icons aren't matching automatically.**
> Go to Module Settings and enable **"Match Icons from Compendiums"**. Note: This feature works best when the item name includes a recognizable D&D 5e base item or item type (e.g., "Stormglass Rapier", "Emberguard Half Plate", "Potion of Sunlit Breath"). I'm hoping to include randomized compendium images in the near future

**Description is empty.**
> If using Natural Language: Ensure there is a n/a line between the stat block and the description.
> If using Strict Format: Use the YAML block form `Description: |` and indent the HTML description beneath it, as shown in the validated examples and template files.

---

<a id="advanced-mcp-diagnostics"></a>

## Advanced MCP Diagnostics

5e Item Importer exposes an allowlisted diagnostics API for Foundry MCP Bridge at:

```js
game.modules.get("5e-item-importer").api.diagnostics.actions
```

These controls are advanced GM-only debugging tools. Normal GMs can leave them disabled during play.

Diagnostics require all of these gates:

- Active GM user
- **Debug Logging** (`debug`)
- **Enable MCP Diagnostics** (`enableMcpDiagnostics`)

Read-only diagnostics include status, settings validation, asset validation, compact client snapshots, parser text validation, activity handoff analysis, world item inspection, opening the import window, and structured smoke tests. Smoke tests are expected to stay read-only and report before/after world document counts.

Confirmed fixture automation is available under the same **Enable MCP Diagnostics** gate. `runAutomation` and `cleanupFixtures` also require `confirmMutation: true`. Fixture cleanup only deletes world Items whose names start with `5E-ITEM-IMPORTER-MCP-FIXTURE` and that also carry this module's `mcpAutomationFixture` flag.

For hard refresh testing, the MCP bridge `reload-foundry-client` tool is the main refresh path. The module-level `refreshClient` action is inherently available when diagnostics gates are open and additionally requires `confirmRefresh: true`.

---

<a id="community"></a>

## Community

- **Report bugs** — [open an issue](https://github.com/GnollStack/5e-Item-Importer/issues) with your Foundry version, module version, steps to reproduce, console logs, and screenshots or short clips when useful.
- **Request features** — tell me what happened at your table and what you wish the module could do.
- **Star the repo** — if the module is useful at your table, a star helps other GMs find it.
- **Watch releases** — follow the repo for updates, compatibility notes, and new feature releases.

---

<a id="contributing"></a>

## Contributing

Bug reports, feature ideas, reproduction notes, documentation fixes, and localization ideas are welcome.

I am not generally accepting unsolicited code PRs for features, refactors, architecture, or behavior changes. This is still my module and my codebase; I will decide how features are designed and implemented unless I explicitly say otherwise.

- **Bug reports** — include Foundry version, module version, a console log, and the steps to reproduce. Screenshots or short clips help a lot.
- **Feature requests** — tell me what happened at your table and what you wish the module could do.
- **Pull requests** — please do not open code PRs unless I ask for one. Open an issue with the idea instead.
- **Code ownership** — core implementation, architecture, and release decisions remain with GnollStack unless stated otherwise.
- **Translations and docs** — typo fixes, wording suggestions, and localization ideas are welcome by issue first. I do not have a public translation setup yet, so I will fold useful wording in myself.

Submitted ideas may be adapted, declined, or implemented by GnollStack. Any accepted contribution or submitted project material may be released under the same EULA as the rest of the module.

---

<a id="ai-use"></a>

## AI-Assisted Development

This module is developed and maintained with the help of AI-assisted tools for coding, debugging, and testing.

I care about the quality, behavior, performance, security, and long-term maintainability of this module, and I take full responsibility for what ships. AI assistance does not replace review, testing, debugging, or security and design judgment.

AI is used here as a tool under my direction to make Foundry better and allow for long term mod support while still having a life outside of building and maintaining my free and premium modules.

If you are uncomfortable using software developed with AI-assisted tools, this module is not for you.

---

<a id="support-development"></a>

## 🥩 Support Development

This module represents **many hours** of development.

**If this module enhanced your immersion, consider treating me to a steak, much better than coffee!**

<a href='https://ko-fi.com/gnollstack' target='_blank'>
<img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Steak at ko-fi.com' />
</a>

> *"Thanks for the support! It helps me maintain support for the module and puts a nice steak on the table."*

---

<a id="license-permissions"></a>

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

<div align="center">

**Author:** [GnollStack](https://github.com/GnollStack) · **Compatibility:** Foundry VTT v14+ (verified v14.363)

[⬆ Back to Top](#5e-item-importer)

</div>
