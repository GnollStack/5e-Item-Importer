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
    Proficient: "[Automatic|0|1]"

  USAGE:
    # Uses Spent = number of charges ALREADY CONSUMED (0 means all charges are available).
    # Uses Max = total number of charges the item can hold.
    # Example: A fresh item with 5 charges → Uses Spent: 0, Uses Max: 5
    Uses Spent: "[integer|n/a]"
    Uses Max: "[integer|n/a]"

  RECOVERY: []
    # Optional, repeatable. Use [] when there is no recovery.
    # If Uses Max > 0, replace [] with one or more entries:
    # - Period: "[lr|sr|day|dawn|dusk|recharge]"
    #   Type: "[recoverAll|loseAll|formula]"
    #   Formula: "[text|n/a]"

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

  effects:
    # ── OMIT THIS SECTION ENTIRELY unless passive effects are needed ──
    # Passive Active Effects applied to the actor when item is equipped/attuned.
    # These are NOT activities — they are always-on mechanical modifications.
    # The dnd5e system auto-generates a default attack activity for weapons,
    # so only add effects/activities for EXTRA capabilities beyond the base weapon.
    # Requires the 5e-activity-importer module to be active.
    # This MUST be a YAML array. Each entry follows the EFFECT template format.
    # See the MIDI Effect Template for full field reference.
    #
    # Example:
    #   effects:
    #     - DETAILS:
    #         Name: "Gleaming Deflection"
    #         Effect Suspended: "false"
    #         Apply Effect to Actor: "true"
    #       CHANGES:
    #         - Attribute Key: "system.attributes.ac.bonus"
    #           Change Mode: "2"
    #           Value: "1"
    #           Priority: "20"

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless extra activities are needed ──
    # Additional activities beyond the default weapon attack (which is auto-generated).
    # Requires the 5e-activity-importer module to be active.
    # IMPORTANT: This MUST be a YAML array (each entry starts with a dash "-").
    # Each entry has exactly ONE top-level key: ACTIVITY_*
    # Supported keys: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD
    # See the 5e-activity-importer module templates for full field reference.
    #
    # Example:
    #   Activities:
    #     - ACTIVITY_HEAL:
    #         ACTIVITY:
    #           Name: "Healing Touch"
    #         HEALING:
    #           Formula: "1d8 + @mod"
    #           Type: "healing"
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