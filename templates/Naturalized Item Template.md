# Natural_Language_Template.md

**Note:** This parser is flexible, but following the **Standard D&D 5e Statblock Format** yields the highest accuracy.

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
*Based on parser logic in `naturalItemParser.js`*

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

### Input
```text
Sun Blade
Weapon (longsword), rare (requires attunement)
Cost: 5000 gp, Weight: 3 lb.
Damage: 1d8 radiant
Properties: Finesse, Versatile (1d10)

This item appears to be a longsword hilt. While grasping the hilt, you can use a bonus action to cause a blade of pure radiance to spring into existence, or make the blade disappear.
```

## **EXAMPLE: ARMOR (Best Result)**

### Input
```text
Dragon Scale Mail
Armor (scale mail), very rare (requires attunement)
Cost: 4000 gp, Weight: 45 lb.
AC: 14 (max Dex 2)

Dragon scale mail is made of the scales of one kind of dragon. While wearing this armor, you have advantage on saving throws against the Frightful Presence and breath weapons of dragons.
```

## **EXAMPLE: CONTAINER (Best Result)**

### Input
```text
Bag of Holding
Wondrous item, uncommon
Weight: 15 lb.

This bag has an interior space considerably larger than its outside dimensions. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.
The bag currently contains 50 gp and 10 sp.
```

## **EXAMPLE: TOOL (Best Result)**

### Input
```text
Thieves' Tools
Tool, common
Cost: 25 gp, Weight: 1 lb.

This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers. Proficiency with these tools lets you add your proficiency bonus to any ability checks you make to disarm traps or open locks.
```

---

## **HOW IT WORKS (Internal Logic)**
1.  **Extraction:** The parser scans the text using Regex to find Stats (Name, Type, Cost, Weight, Damage, Properties, AC, etc.).
2.  **Stripping:** It removes lines that look like Stats to isolate the **Description**.
3.  **Conversion:** It builds a YAML document matching the strict template format.
4.  **Final Pass:** It runs the generated YAML through the `YamlItemParser` for validation and item creation.
