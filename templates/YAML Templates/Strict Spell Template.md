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
- Inapplicable scalar fields: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., MATERIALS, AREA) when their condition is not met — do NOT fill them with `n/a` values.
- **Omit both `effects:` and `Activities:` entirely** unless explicitly requested.

---

```yaml
SPELL:
  ITEM:
    Name: "[text]"
    Level: "[0|1|2|3|4|5|6|7|8|9]"
    School: "[abj|con|div|enc|evo|ill|nec|trs]"
    Ability: "[str|dex|con|int|wis|cha|n/a]"

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
    Count: "[integer|n/a]"
    Width: "[integer|n/a]"
    Height: "[integer|n/a]"
    Contiguous: "[true|false|n/a]"

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
    # Passive Active Effects applied to the actor.
    # These are NOT activities — they are always-on mechanical modifications.
    # Requires the 5e-activity-importer module to be active.
    # This MUST be a YAML array. Each entry follows the EFFECT template format.
    # See the MIDI Effect Template for full field reference.

  Activities:
    # ── OMIT THIS SECTION ENTIRELY unless extra activities are needed ──
    # Requires the 5e-activity-importer module to be active.
    # IMPORTANT: This MUST be a YAML array (each entry starts with a dash "-").
    # Each entry has exactly ONE top-level key: ACTIVITY_*
    # Supported keys: ACTIVITY_ATTACK, ACTIVITY_SAVE, ACTIVITY_DAMAGE, ACTIVITY_HEAL,
    #   ACTIVITY_CHECK, ACTIVITY_UTILITY, ACTIVITY_CAST, ACTIVITY_ENCHANTING,
    #   ACTIVITY_SUMMON, ACTIVITY_TRANSFORM, ACTIVITY_FORWARD
    # See the 5e-activity-importer module templates for full field reference.
```

---

## **FIELD REFERENCE**

### **Spellcasting Ability Override**
Use `Ability` in the `ITEM` section to override the class spellcasting ability for this specific spell. Useful for racial or feat-granted spells that use a fixed ability (e.g., `cha` for Tiefling spells, `int` for Eldritch Knight spells). Set to `n/a` to use the class default.

| Value | Ability |
|-------|---------|
| `str` | Strength |
| `dex` | Dexterity |
| `con` | Constitution |
| `int` | Intelligence |
| `wis` | Wisdom |
| `cha` | Charisma |
| `n/a` | Use class default |

---

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

### **Area Advanced Fields**
| Field | Description | Example |
|-------|-------------|---------|
| `Count` | Number of separate template areas | *Conjure Animals* (multiple zones) |
| `Width` | Width of the area (for line/wall shapes) | *Wall of Fire* width |
| `Height` | Height of the area (for cylinder/wall shapes) | *Cloudkill* height |
| `Contiguous` | Whether multiple templates must be adjacent | `true` or `false` |

These fields are optional and only needed for spells with unusual area geometry. Most spells only need `Shape`, `Size`, and `Units`.

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
