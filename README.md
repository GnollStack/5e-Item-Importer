# 5e-Item-Importer

![alt text](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/total)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/total)
![alt text](https://img.shields.io/badge/Foundry-v13-informational)

A simple module to parse items for the dnd 5e system and create them in Foundry VTT.

The architecture and foundational parsing concepts for this module were inspired by the excellent [5e Statblock Importer](https://github.com/Aioros/5e-statblock-importer) by Aioros.

5e Item Importer
Import D&D 5e items from text format (PDFs, websites, homebrew documents) into Foundry VTT.
📋 Features
✅ What Works Now:

Multiple Input Formats:

Natural text format (standard D&D item descriptions)
Structured format (Name:, Type:, Description:, etc.)


Item Types:

Weapons (all types, including magic weapons with bonuses)
Armor/Equipment (all types, including magic armor)
Consumables (potions, scrolls, etc.)
Tools
Containers (with weight and volume capacity)
Loot with automatic subtype detection (Art, Gemstone, Treasure, Materials, etc.)


Parsing Features:

Attunement (required, optional, specific requirements)
Cost/weight parsing (all currency types)
Properties parsing (finesse, versatile, reach, etc.)
Damage formulas with types
Armor Class with DEX modifiers
Range (normal/long)
Capacity (weight and volume for containers)
Automatic magical property for uncommon+ items
Identification system (unidentified items with alternate names/descriptions)


Quality of Life:

Icon matching from compendiums and system files
Folder organization
Auto-parse on input (configurable)
Debug mode with detailed logging


⚠️ Known Limitations:

⚠️ Spell scrolls (not yet fully implemented)


Quick Start
Installation

Open Foundry VTT
Go to Add-on Modules
Install "5e Item Importer"
Enable in your world

Basic Usage

Click "Import Item" button in Items Directory
Paste your item text
Click "Parse" to preview (or wait for auto-parse)
Click "Import" to create the item


📖 Supported Formats
Natural Text Format (Standard D&D)
The parser works with standard D&D item text from books, PDFs, and websites:
Bag of Holding
Wondrous item, uncommon
Cost: 500 gp, Weight: 15 lb.

This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. Retrieving an item from the bag requires an action.
```

### Structured Format (Key: Value pairs)

The parser supports structured format with labeled fields for precise control:
```
Name: Ring of Minor Illusion
Type: Loot
Rarity: Uncommon
Identified: false
Unidentified Name: Simple Silver Ring
Properties: Jewelry, Magical
Cost: 150 gp
Weight: 0.1 lb
Unidentified Description:
This simple silver ring is cool to the touch and hums with a faint, almost imperceptible energy. It is stamped with the maker's mark of a stylized eye.
Chat Description:
As an action, you cast the Minor Illusion cantrip.
Description:
While wearing this ring, you can cast the Minor Illusion cantrip at will.
```

**Supported Fields:**
- `Name:` - Item name (required)
- `Type:` - Item type: Weapon, Armor/Equipment, Loot, Consumable, Tool, Container
- `Rarity:` - Common, Uncommon, Rare, Very Rare, Legendary, Artifact
- `Identified:` - true/false (controls whether item is identified)
- `Unidentified Name:` - Name shown when item is unidentified
- `Attunement:` - None, Yes, Required, or specific requirement (e.g., "by a spellcaster")
- `Cost:` - Value and currency (e.g., "150 gp")
- `Weight:` - Value and unit (e.g., "0.1 lb")
- `Properties:` - Comma-separated properties (used to detect loot subtype and magical status)
- `Unidentified Description:` - Description shown when item is unidentified (multi-line)
- `Chat Description:` - Short description for chat cards (multi-line)
- `Description:` - Full identified description (multi-line, required)

**Multi-line Fields:**
Fields like `Description:`, `Unidentified Description:`, and `Chat Description:` can span multiple lines. The parser will automatically collect all text until it encounters the next field label.

---

## Loot Item Subtypes

The parser automatically detects loot subtypes based on keywords:

- **Art Objects** - Detected from: jewelry, ring, necklace, bracelet, earring, crown, tiara
- **Gemstones** - Detected from: gemstone, gem, diamond, ruby, sapphire, emerald, pearl, opal
- **Treasure** - Detected from: treasure, coins, gold, silver, platinum
- **Materials** - Detected from: material, component, ore, ingot, cloth, leather, hide
- **Resources** - Detected from: resource, food, water, rations
- **Junk** - Detected from: junk, scrap, broken, worthless
- **Adventuring Gear** - Default if no other type matches

**Note:** Items with Uncommon or higher rarity are automatically marked as magical.

---

## Test Cases

### Test 1: Basic Weapon
```
Longsword
Weapon (longsword), martial melee weapon
Cost: 15 gp
Weight: 3 lb.
Damage: 1d8 slashing
Properties: Versatile (1d10)

A versatile sword used by many warriors.
```

**Expected Results:**
- ✅ Type: Weapon
- ✅ Damage: 1d8 slashing
- ✅ Properties: Versatile (1d10)
- ✅ Cost: 15 gp
- ✅ Weight: 3 lb

### Test 2: Magic Weapon
```
Flame Tongue
Weapon (longsword), rare (requires attunement)
Cost: 5000 gp
Weight: 3 lb.

You can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. These flames shed bright light in a 40-foot radius and dim light for an additional 40 feet. While the sword is ablaze, it deals an extra 2d6 fire damage to any target it hits. The flames last until you use a bonus action to speak the command word again or until you drop or sheathe the sword.
```

**Expected Results:**
- ✅ Type: Weapon
- ✅ Rarity: Rare
- ✅ Attunement: Required
- ✅ Description: Full text preserved

### Test 3: Magic Armor
```
Plate Armor +1
Armor (plate), uncommon
Cost: 2000 gp
Weight: 65 lb.
AC: 19

You have a +1 bonus to AC while wearing this armor.
```

**Expected Results:**
- ✅ Type: Equipment (Armor)
- ✅ Rarity: Uncommon
- ✅ AC: 19
- ✅ Magic Bonus: +1

### Test 4: Potion
```
Potion of Healing
Potion, common
Cost: 50 gp
Weight: 0.5 lb.

You regain 2d4 + 2 hit points when you drink this potion.
```

**Expected Results:**
- ✅ Type: Consumable
- ✅ Subtype: Potion
- ✅ Rarity: Common
- ✅ Description: Healing effect

### Test 5: Container
```
Bag of Holding
Wondrous item, uncommon
Cost: 500 gp, Weight: 15 lb.

This bag has an interior space considerably larger than its outside dimensions, roughly 2 feet in diameter at the mouth and 4 feet deep. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. Retrieving an item from the bag requires an action.
```

**Expected Results:**
- ✅ Type: Container
- ✅ Rarity: Uncommon
- ✅ Weight Capacity: 500 lb
- ✅ Volume Capacity: 64 cu. ft.
- ✅ Activation: Action

### Test 6: Loot Item with Properties
```
Name: Jeweled Signet Ring (House Valtoris)
Type: Loot
Rarity: Uncommon
Attunement: None
Cost: 75 gp
Weight: 0 lb
Properties: Jewelry, Noble, Inscribed
Description:
A gold signet ring set with a tiny garnet. Bears the crest of House Valtoris; useful for favors—or for fencing.
```

**Expected Results:**
- ✅ Type: Loot (Adventuring Gear)
- ✅ Subtype: Art Object (detected from "Jewelry")
- ✅ Rarity: Uncommon
- ✅ Properties: Magical (automatically added for uncommon+ items)
- ✅ Description: Properly formatted

### Test 7: Unidentified Magic Item (Structured Format)
```
Name: Ring of Minor Illusion
Type: Loot
Rarity: Uncommon
Identified: false
Unidentified Name: Simple Silver Ring
Properties: Jewelry, Magical
Cost: 150 gp
Weight: 0.1 lb
Unidentified Description:
This simple silver ring is cool to the touch and hums with a faint, almost imperceptible energy. It is stamped with the maker's mark of a stylized eye.
Chat Description:
As an action, you cast the Minor Illusion cantrip.
Description:
While wearing this ring, you can cast the Minor Illusion cantrip at will.
Expected Results:

✅ Type: Loot (Art Object)
✅ Rarity: Uncommon
✅ Identified: false
✅ Unidentified Name: "Simple Silver Ring"
✅ Unidentified Description: Full unidentified text
✅ Chat Description: Short action description
✅ Description: Full identified effect
✅ Properties: Magical (auto-detected from rarity)


Known Behaviors
Automatic Type Detection

Loot subtypes are automatically detected from item names and properties
Items containing "ring", "necklace", etc. → Art Object
Items containing "gem", "diamond", etc. → Gemstone
Default → Adventuring Gear

Identification System

Set Identified: false to create unidentified items
Unidentified Name: displays instead of real name when unidentified
Unidentified Description: shows different text to players
Chat Description: appears in chat cards when item is used
Items Directory automatically updates when identification status changes

Magical Items

Items with Uncommon or higher rarity are automatically marked as magical
Magic weapons/armor with bonuses (+1, +2, +3) are detected from the name

Format Flexibility

Parser automatically detects structured vs. natural format
Can mix both formats (some fields structured, description natural)
Empty fields are handled gracefully


Settings
Access settings via: Game Settings → Module Settings → 5e Item Importer
Available Settings:

Debug Mode - Enable detailed console logging
Show Parse Results - Display parsed data in console
Auto-Parse on Input - Automatically parse as you type
Auto-Parse Delay - Milliseconds to wait before parsing (250-3000ms)
Default Item Type - Type to use when detection fails
Match Icons from Compendiums - Search for matching item icons
Create Items as Identified - Mark imported items as identified
Parse Currency Values - Extract cost from descriptions
Parse Weight Values - Extract weight from descriptions
Preserve Description Formatting - Maintain paragraph breaks


🛠 Troubleshooting
Module doesn't load
Check:

Module is enabled in world settings
No console errors (F12)
Files are in correct location

"Import Item" button doesn't appear
Check:

You have ITEM_CREATE permission
You're in the Items Directory (not Actors/Scenes)
Page has fully loaded

Items import but data is wrong
Solutions:

Enable Debug Mode in settings
Enable Show Parse Results
Check console (F12) for parsing information
Verify text format matches expected structure

Icons don't match
Solutions:

Enable "Match Icons from Compendiums" in settings
Ensure you have dnd5e system compendiums active
Icon matching requires standard item names

Description is empty
Check:

Description comes after type/rarity line in natural format
Description comes after "Description:" label in structured format
No blank lines between item data and description


Module API
The module exposes an API for programmatic access:
javascript// Access the API
const api = game.modules.get("5e-item-importer").api;

// Parse item text
const result = api.parse("Longsword\nWeapon (longsword), martial\nCost: 15 gp");
// Returns: { item: ItemData, issues: [] }

// Import item
const imported = await api.import("Longsword\n...", folderId);

// Open import window
api.openWindow();

// Get module info
const info = api.info();

Compatibility

Foundry VTT: v13.315+
D&D 5e System: v5.1.10+
Module Version: 13.1.1


🎯 Roadmap
Short-term (1-2 weeks):

 Full spell scroll support with v5.1 structure
 Improved natural language parsing
 Better error messages

Medium-term (1-3 months):

 Batch import feature
 Export to text feature
 Item templates system

Long-term (3-6 months):

 Custom property support
 AI-powered parsing suggestions
 Browser extension for quick imports


Tips & Tricks
Best Practices:

Use standard D&D formatting for best results
Enable Auto-Parse for real-time feedback
Check parsed data before importing
Use folders to organize imported items
Enable Debug Mode when troubleshooting

Common Issues:

Name too long? Parser will auto-truncate at 100 characters
Wrong item type? Use structured format with Type: field
Missing properties? Add them manually after import
Icon doesn't match? Disable icon matching or change after import


Module version (v13.1.0)
Foundry version
dnd5e system version
