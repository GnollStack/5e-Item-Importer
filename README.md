# 5e Item Importer

![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)
![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/total)
![alt text](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/total)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20a%20Steak-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/gnollstack)

**Stop manually typing items.**  
The **5e Item Importer** allows you to import D&D 5e items directly from text into Foundry VTT. It supports two powerful workflows:

1.  **Natural Language:** Copy/paste directly from PDFs, D&D Beyond, or websites. This method handles standard D&D 5e formatting.
2.  **Strict Format:** Use the provided templates to generate near perfect imports every time. Great for homebrew, bulk generation, or working with LLMs. **Supports Batches**.

<img width="640" height="865" alt="image" src="https://github.com/user-attachments/assets/c9d0b2ea-930d-4600-849c-200e8b4f40e6" />

## See it in Action on Youtube: 
- [5e Importer V13.2.0](https://youtu.be/THrikJq0EY4)
- [5e Importer V13.7.2](https://youtu.be/dyhUoiNYxmA?si=DozAjOLjFGEmcAk-)

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

</details>

---

## 2. Strict Format Parser
*Best for: Complex homebrew and bulk generation.*

The Strict Parser uses a specific key/value format. This is ideal for using with **LLMs (ChatGPT, Claude, Gemini)**. You can paste a System Prompt into an AI, tell it "Make me a sword that does ice damage," and it will output a block you can paste directly into Foundry with the  stats, icons, and configuration filled in on the imported item, Not that this only fills in the basic item fields and details

### Strict Templates
Expand the sections below to copy the templates for prompts and to view example items.

<details>
<summary><strong>⚔️ Strict Weapon Template</strong></summary>

# Strict_Weapon_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
---
WEAPON:
  ITEM:
    Name: "Dagger of Venom"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
WEAPON:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Weapon Type: "[simpleM|simpleR|martialM|martialR|natural|improv|siege]"
    Base Weapon: "[e.g. longsword, dagger, bow - see list below - OR n/a]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Adamantine: "[true|false]"
    Ammunition: "[true|false]"
    Finesse: "[true|false]"
    Firearm: "[true|false]"
    Focus: "[true|false]"
    Heavy: "[true|false]"
    Light: "[true|false]"
    Loading: "[true|false]"
    Magical: "[true|false]"
    Reach: "[true|false]"
    Reload: "[true|false]"
    Returning: "[true|false]"
    Silvered: "[true|false]"
    Special: "[true|false]"
    Thrown: "[true|false]"
    Two-Handed: "[true|false]"
    Versatile: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"
    Magic Bonus: "[integer|n/a]"

  AMMUNITION:
    # (Required only if Ammunition is true)
    Ammunition Type: "[arrow|crossbowBolt|firearmBullet|slingBullet|energyCell|blowgunNeedle]"

  RELOAD:
    # (Required only if Reload is true)
    Reload Amount: "[integer]"

  VERSATILE_DAMAGE:
    # (Required only if Versatile is true)
    Versatile Formula: "[e.g. 1d10 + @mod]"
    Versatile Damage Type: "[slashing|piercing|bludgeoning|etc]"

  SIEGE_PROPERTIES:
    # (Required only if Weapon Type is siege)
    Siege Armor Class: "[integer]"
    Cover: "[none|half|threequarters|total]"
    Hit Points Current: "[integer]"
    Hit Points Max: "[integer]"
    Hit Points Threshold: "[integer]"
    Health Conditions: "[text|n/a]"

  RANGE:
    Reach: "[integer|n/a]"
    Range Normal: "[integer|n/a]"
    Range Long: "[integer|n/a]"
    Range Units: "[ft|m|sq|mi]"

  DAMAGE:
    Damage Formula: "[e.g. 2d6 + @mod]"
    Damage Type: "[acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder]"

  MASTERY:
    Mastery: "[cleave|graze|nick|push|sap|slow|topple|vex|n/a]"

  PROFICIENCY:
    Proficiency: "[automatic|notProficient|proficient]"

  USAGE:
    Uses Spent: "[integer]"
    Uses Max: "[integer]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
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
</details>

<details>
<summary><strong>🧪 Strict Consumable Template</strong></summary>

# Strict_Consumable_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    ...
---
CONSUMABLE:
  ITEM:
    Name: "Potion of Greater Healing"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
CONSUMABLE:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Consumable Type: "[ammo|food|poison|potion|rod|scroll|trinket|wand]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Magical: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  AMMUNITION_PROPERTIES:
    # (Required only if Consumable Type is ammo)
    Ammunition Type: "[arrow|bolt|dart|needle|bullet|slingbullet|energycell]"
    Adamantine: "[true|false]"
    Silvered: "[true|false]"
    Returning: "[true|false]"
    Magic Bonus: "[integer|n/a]"
    Damage Formula: "[e.g. 1d6 + @mod|n/a]"
    Damage Type: "[piercing|bludgeoning|slashing|etc|n/a]"
    Damage Replace: "[true|false]"

  POISON_PROPERTIES:
    # (Required only if Consumable Type is poison)
    Poison Type: "[contact|ingested|inhaled|injury]"

  SCROLL_PROPERTIES:
    # (Required only if Consumable Type is scroll)
    Concentration: "[true|false]"
    Somatic: "[true|false]"
    Verbal: "[true|false]"
    Ritual: "[true|false]"

  USAGE:
    Uses Spent: "[integer]"
    Uses Max: "[integer]"
    Destroy on Empty: "[true|false]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
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
| `recoverAll` | n/a | Regain all charges |
| `loseAll` | n/a | Lose all remaining charges |
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
</details>

<details>
<summary><strong>🎒 Strict Container Template</strong></summary>

# Strict_Container_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    ...
---
CONTAINER:
  ITEM:
    Name: "Handy Haversack"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
CONTAINER:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Magical: "[true|false]"
    Weightless Contents: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  CAPACITY:
    Item Count: "[integer|n/a]"
    Weight Capacity Value: "[number|n/a]"
    Weight Capacity Units: "[lb|tn|kg|t|n/a]"
    Volume Capacity Value: "[number|n/a]"
    Volume Capacity Units: "[cubicfoot|liter|n/a]"

  CURRENCY_CONTENTS:
    # (All fields required, use 0 for empty)
    Platinum: "[integer]"
    Gold: "[integer]"
    Electrum: "[integer]"
    Silver: "[integer]"
    Copper: "[integer]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]
      
  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
```

---

## **FIELD REFERENCE**

### **Capacity Rules**
| Field | Description |
|-------|-------------|
| `Item Count` | Maximum number of discrete items (n/a = unlimited) |
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

---
</details>

<details>
<summary><strong>🛡️ Strict Equipment Template</strong></summary>

# Strict_Equipment_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    ...
---
EQUIPMENT:
  ITEM:
    Name: "Cloak of Protection"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
EQUIPMENT:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Equipment Type: "[light|medium|heavy|natural|shield|clothing|ring|rod|trinket|wand|wondrous|vehicle]"
    Base Equipment: "[e.g. plate, leather, shield - OR n/a for wondrous items]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Magical: "[true|false]"
    Adamantine: "[true|false]"
    Focus: "[true|false]"
    Stealth Disadvantage: "[true|false]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"
    Magic Bonus: "[integer|n/a]"

  ARMOR:
    # (Required only for Armor/Shields: light, medium, heavy, natural, shield)
    Armor Class: "[integer]"
    Max Dex Modifier: "[integer|n/a]"
    Strength Requirement: "[integer|n/a]"

  VEHICLE_PROPERTIES:
    # (Required only if Equipment Type is vehicle)
    Vehicle Armor Class: "[integer]"
    Cover: "[none|half|threequarters|total]"
    Hit Points Current: "[integer]"
    Hit Points Max: "[integer]"
    Hit Points Threshold: "[integer]"
    Health Conditions: "[text|n/a]"
    Speed: "[integer]"
    Speed Conditions: "[text|n/a]"

  PROFICIENCY:
    Proficiency: "[automatic|notProficient|proficient]"

  USAGE:
    Uses Spent: "[integer]"
    Uses Max: "[integer]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
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
| `natural` | n/a (for creature natural armor) |
| `clothing` | n/a |
| `ring` | n/a |
| `wondrous` | n/a |
| `trinket` | n/a |
| `rod` | n/a |
| `wand` | n/a |
| `vehicle` | n/a |

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
| `recoverAll` | n/a | Regain all charges |
| `loseAll` | n/a | Lose all remaining charges |
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

---
</details>

<details>
<summary><strong>💎 Strict Loot Template</strong></summary>

# Strict_Loot_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
LOOT:
  ITEM:
    Name: "Ruby Gemstone"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
LOOT:
  ITEM:
    Name: "Ruby Gemstone"
    ...
---
LOOT:
  ITEM:
    Name: "Gold Idol"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
LOOT:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Loot Type: "[art|gear|gem|junk|material|resource|treasure]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Magical: "[true|false]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
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

---
</details>

<details>
<summary><strong>✨ Strict Spell Template</strong></summary>

# Strict_Spell_Template_v2.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
SPELL:
  ITEM:
    Name: "Fireball"
    ...
WEAPON:
  ITEM:
    Name: "Staff of Fire"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
SPELL:
  ITEM:
    Name: "Fireball"
    ...
---
SPELL:
  ITEM:
    Name: "Lightning Bolt"
    ...
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
SPELL:
  ITEM:
    Name: "[text]"
    Level: "[0|1|2|3|4|5|6|7|8|9]"
    School: "[abj|con|div|enc|evo|ill|nec|trs]"

  COMPONENTS:
    Vocal: "[true|false]"
    Somatic: "[true|false]"
    Material: "[true|false]"

  MATERIALS:
    # (Required only if Material is true)
    Value: "[text]"
    Cost: "[integer]"
    Supply: "[integer]"
    Consumed: "[true|false]"

  PREPARATION:
    Method: "[atwill|innate|ritual|pact|prepared]"
    Prepared: "[true|false]"

  ACTIVATION:
    Type: "[action|bonus|reaction|minute|hour|day|special]"
    Value: "[integer]"
    Condition: "[text|n/a]"

  RANGE:
    Units: "[self|touch|spec|any|ft|mi|m|km]"
    Value: "[integer|n/a]"

  DURATION:
    Units: "[inst|spec|turn|round|minute|hour|day|month|year|disp|dstr|perm]"
    Value: "[integer|n/a]"
    Concentration: "[true|false]"

  TARGETS:
    Type: "[self|ally|enemy|creature|object|space|creatureOrObject|any|willing]"
    Count: "[integer|n/a]"
    Choice: "[true|false]"
    Special: "[text|n/a]"

  AREA:
    # (Required only if spell has an area of effect)
    Shape: "[cone|cube|cylinder|radius|line|sphere|circle|square|wall]"
    Size: "[integer]"
    Units: "[ft|mi|m|km]"

  USAGE:
    Uses Spent: "[integer]"
    Uses Max: "[integer]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
```

---

## **FIELD REFERENCE**

### **Spell Schools**
| Key | School |
|-----|--------|
| `abj` | Abjuration |
| `con` | Conjuration |
| `div` | Divination |
| `enc` | Enchantment |
| `evo` | Evocation |
| `ill` | Illusion |
| `nec` | Necromancy |
| `trs` | Transmutation |

### **Preparation Methods**
| Method | Description |
|--------|-------------|
| `atwill` | At Will (always available, no slot needed) |
| `innate` | Innate (uses per day, not spell slots) |
| `ritual` | Ritual (adds ritual property, always prepared) |
| `pact` | Pact Magic (Warlock slot) |
| `prepared` | Standard prepared spell |

### **Activation Types**
| Type | Description |
|------|-------------|
| `action` | Action |
| `bonus` | Bonus Action |
| `reaction` | Reaction |
| `minute` | Minutes (use Value for count) |
| `hour` | Hours (use Value for count) |
| `day` | Days |
| `special` | Special |

### **Range Units**
| Unit | Description |
|------|-------------|
| `self` | Self (no range value needed) |
| `touch` | Touch |
| `spec` | Special |
| `any` | Unlimited / Any distance |
| `ft` | Feet |
| `mi` | Miles |
| `m` | Meters |
| `km` | Kilometers |

### **Duration Units**
| Unit | Description |
|------|-------------|
| `inst` | Instantaneous |
| `spec` | Special |
| `turn` | Turn |
| `round` | Rounds |
| `minute` | Minutes |
| `hour` | Hours |
| `day` | Days |
| `month` | Months |
| `year` | Years |
| `disp` | Until dispelled |
| `dstr` | Until dispelled or triggered |
| `perm` | Permanent |

### **Target Types**
| Type | Description |
|------|-------------|
| `self` | Self |
| `ally` | Ally |
| `enemy` | Enemy |
| `creature` | Any creature |
| `object` | Object |
| `space` | Space/point |
| `creatureOrObject` | Creature or Object |
| `any` | Any target |
| `willing` | Willing creature |

### **Area Shapes**
| Shape | Description |
|-------|-------------|
| `cone` | Cone |
| `cube` | Cube |
| `cylinder` | Cylinder |
| `radius` | Radius/burst |
| `line` | Line |
| `sphere` | Sphere |
| `circle` | Circle |
| `square` | Square |
| `wall` | Wall |

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
| `recoverAll` | n/a | Regain all uses |
| `loseAll` | n/a | Lose all remaining uses |
| `formula` | Dice (e.g., `1d4+1`) | Regain rolled amount |
| `formula` | Number (e.g., `5`) | For recharge: regain all on d6 ≥ 5 |

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

</details>

<details>
<summary><strong>⚒️ Strict Tool Template</strong></summary>

# Strict_Tool_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Fill in every field. Use `n/a` for fields that don't apply.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Conditional sections (marked with `#` comments) can be omitted entirely when not applicable.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```yaml
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    ...
WEAPON:
  ITEM:
    Name: "Longsword +1"
    ...
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```yaml
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    ...
---
TOOL:
  ITEM:
    Name: "Herbalism Kit"
    ...
```
You can mix both methods. Supported top-level keys: `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Inapplicable fields: use the literal string `n/a`.
- **Omit the `Activities` section entirely** unless the user explicitly requests activities.

---

```yaml
TOOL:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Tool Type: "[art|game|music|other]"
    Base Tool: "[e.g. smith, thief, lute, dice - see list below]"

  INVENTORY:
    Quantity: "[integer]"
    Identified: "[true|false]"
    Equipped: "[true|false]"

  COST_AND_WEIGHT:
    Price Value: "[number]"
    Price Denomination: "[pp|gp|ep|sp|cp]"
    Weight Value: "[number]"
    Weight Units: "[lb|tn|kg|t]"

  PROPERTIES:
    Magical: "[true|false]"
    Tool Bonus: "[integer|n/a]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  ABILITY_CHECK:
    Proficiency: "[notProficient|proficient|expert]"
    Ability: "[str|dex|con|int|wis|cha|n/a]"

  USAGE:
    Uses Spent: "[integer]"
    Uses Max: "[integer]"

  RECOVERY:
    # (Optional, repeatable. Only relevant if Uses Max > 0)
    - Period: "[lr|sr|day|dawn|dusk|recharge]"
      Type: "[recoverAll|loseAll|formula]"
      Formula: "[text|n/a]"

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "[text|n/a]"
    Unidentified Description: |
      [multiline HTML content]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless activities are explicitly requested ──
    # Requires the 5e-activity-importer module to be active.
    # If requested: array format — add any number of activities/effects.
    # Supported types: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD, EFFECT
    # See the 5e-activity-importer module templates for full field reference.
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

</details>

---

## Common Issues

**Natural Parsing Improvements**
> Natural Parsing is still being worked on.

**Icons aren't matching automatically.**
> Go to Module Settings and enable **"Match Icons from Compendiums"**. Note: This feature works best with standard D&D 5e item names (e.g., "Longsword", "Potion of Healing"). Im hoping to include randomized compedium images in the near future

**Description is empty.**
> If using Natural Language: Ensure there is a n/a line between the stat block and the description.
> If using Strict Format: Ensure the description is between `Description:` and `===END DESCRIPTION===`.

---

## 🥩 Support Development

This module represents **many hours** of developement.

**If this module enhanced your immersion, consider treating me to a steak, much better than coffee!**

<a href='https://ko-fi.com/gnollstack' target='_blank'>
<img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Steak at ko-fi.com' />
</a>

> *"Thanks for the support! It helps me maintain support for the module and puts a nice steak on the table."*

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
**Compatibility:** Foundry VTT v13 / dnd5e 5.2.x+
