# Strict_Weapon_Template_v3.md

## INSTRUCTIONS

**How to use this template:**
- Output every field shown in required sections. Use `n/a` for required scalar fields that do not apply.
- Begin every YAML document with `SCHEMA_VERSION: 1` before the Item type key.
- Wrap the completed YAML in a single ```` ```yaml ```` code fence.
- Omit entire conditional sections when their condition is not met. Do not output a conditional section filled with `n/a`.
- For DESCRIPTION fields, use HTML with Foundry VTT Enrichers (see reference at the bottom of this template).

**dnd5e Description Features:**
- `DESCRIPTION.Description` and `CHAT_FLAVOR.Chat Description` preserve Foundry/dnd5e text features for Foundry to resolve when displayed.
- You can use dnd5e enrichers such as `[[/damage 1d6 fire average]]`, roll-data formulas such as `@prof` or `@abilities.str.mod`, dynamic lookups such as `[[lookup @name]]{the creature}`, System HTML classes, and pass-through document links such as `@UUID[...]` or `@Embed[...]`.
- Use stock dnd5e `[[lookup @name]]` text for active narration and chat flavor: sentence start `[[lookup @name]]{The creature} drinks the potion.`; mid-sentence `When [[lookup @name]]{the creature} hits with this weapon...`. This normally resolves to the actor name; the optional Token Name Lookup companion can prefer token aliases at render time without changing item syntax.
- Keep passive rules text natural. Do not force dynamic name lookups into every description.

**Batching multiple items:**
Combine different item types in one block by stacking top-level keys:
```text
SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
EQUIPMENT:
  ITEM:
    Name: "Plate Armor +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
---
SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Dagger of Venom"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., ATTUNEMENT, AMMUNITION, RELOAD) when their condition is not met. Do not fill omitted sections with `n/a` values.
- **Omit both `effects:` and `Activities:` entirely** unless explicitly requested.
- Do not include template comments (`# ...`) in the final YAML output.
- Do not omit individual fields from required sections just because their value is `n/a`.
- Replace every bracketed placeholder value; never output literal placeholders like `[text]` or `[integer]`.
- Use HTML tags inside description fields, not Markdown headings or Markdown lists.
- For mixed weapon damage formulas like `1d8[piercing] + 1d6[lightning]`, set `Damage Type` to the weapon's primary damage type, such as `piercing`. Do the same for `Versatile Damage Type`. The primary type gives dnd5e a default for system-added ability and magic bonuses, while bracketed formula terms keep extra damage such as lightning separate for resistance and immunity.
- Use `n/a` for `Damage Type` or `Versatile Damage Type` only when the typed formula is fully self-contained and will not receive system-added ability, magic, or ammunition bonuses.

**YAML Syntax Rules (do not violate):**
- Every key needs a SPACE after the colon: `KEY: value`, never `KEY:value`. js-yaml will reject the file with a confusing "multiline key" error otherwise.
- Empty arrays are written `KEY: []` and empty mappings `KEY: {}` — both with the space.
- Indentation is exactly 2 spaces per level. No tabs. No 4-space jumps.

**Default assumptions when source text is silent:**
- Quantity: `1`
- Identified: `true`
- Equipped: `false`
- Rarity: `n/a` for mundane or unspecified items.
- Price Value: `0`; Price Denomination: `gp`
- Weight Value: `0` when negligible or not listed; Weight Units: `lb`
- Uses Spent: `0`; Uses Max: `n/a` unless the item tracks charges or uses.
- RECOVERY: `[]` when no charge recovery applies.
- Unidentified Name: `n/a`; Unidentified Description: `n/a` unless an unidentified version is needed.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
SCHEMA_VERSION: 1
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
    Weight Units: "[lb|tn|kg|Mg]"

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
    Versatile Formula: "[e.g. 1d10 + @mod OR 1d10[slashing] + 1d6[fire]]"
    Versatile Damage Type: "[primary type such as slashing|piercing|bludgeoning|etc|n/a only for fully self-contained typed formulas]"

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
    Damage Formula: "[e.g. 2d6 + @mod OR 1d8[piercing] + 1d6[lightning]]"
    Damage Type: "[primary type such as piercing|slashing|bludgeoning|etc|n/a only for fully self-contained typed formulas]"

  MASTERY:
    Mastery: "[cleave|graze|nick|push|sap|slow|topple|vex|n/a]"

  PROFICIENCY:
    Proficient: "[Automatic|0|1]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = total number of charges the item can hold.
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|n/a]"

  # Optional, repeatable. Use [] when there is no recovery.
  # If Uses Max > 0, replace [] with a list of entries shaped like:
  #   - Period: "[lr|sr|day|dawn|dusk|recharge]"
  #     Type: "[recoverAll|loseAll|formula]"
  #     Formula: "[text|n/a]"
  RECOVERY: []

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

```

## OPTIONAL ADVANCED SECTIONS

Do not include `effects:` or `Activities:` in normal output. Add them only when the user explicitly asks for passive Active Effects or extra activities beyond the base item behavior.

When requested, append them after `CHAT_FLAVOR`:

```yaml
  effects:
    # Passive Active Effects applied to the actor when the item is equipped, attuned, or otherwise active.
    # Requires the 5e-activity-importer module to be active.
    # Must be a YAML array. Each entry follows the EFFECT template format.

  Activities:
    # Extra activities only. Most base item behavior is generated by the dnd5e system.
    # Requires the 5e-activity-importer module to be active.
    # Must be a YAML array. Each entry starts with a dash and has one ACTIVITY_* key.
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

### **Proficiency**
| Value | Meaning |
|-------|---------|
| `Automatic` | Game auto-detects proficiency from the character (default) |
| `0` | Not proficient |
| `1` | Proficient |

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
<p><strong>Elemental Strike.</strong> When [[lookup @name]]{the creature} hits with this weapon, the target takes an extra [[/damage 1d6 fire average]].</p>
```

### **On-Hit Save Effect**
```html
<p><strong>Venomous.</strong> When [[lookup @name]]{the creature} hits a creature with this weapon, the target must succeed on a [[/save con 14 format=long]] or become &Reference[poisoned] for 1 minute. The creature can repeat the save at the end of each of its turns, ending the effect on a success.</p>
```

### **Charge-Based Abilities**
```html
<p>This weapon has X charges. While holding it, [[lookup @name]]{the creature} can expend charges to use the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The weapon regains 1d4 + 1 expended charges daily at dawn.</p>
```

### **Critical Hit Enhancement**
```html
<p><strong>Devastating Critical.</strong> When [[lookup @name]]{the creature} scores a critical hit with this weapon, they can roll one additional weapon damage die when determining the extra damage.</p>
```

### **Sentient Weapon**
```html
<p><strong>Sentience.</strong> This weapon is sentient with Intelligence X, Wisdom Y, and Charisma Z. It has hearing and darkvision out to 60 feet. It can communicate telepathically with its wielder and speaks [languages].</p>

<p><strong>Personality.</strong> [Description of the weapon's personality, goals, and potential conflicts.]</p>
```

---
