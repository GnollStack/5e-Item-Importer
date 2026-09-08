# Strict_Spell_Template_v2.md

## INSTRUCTIONS

**Free and premium generation modes:**
- 5e Activity Importer is a forthcoming premium companion, not included with this free release. Use free/core output unless premium output is explicitly requested or companion availability is confirmed.
- **Free/core (default):** 5e Item Importer is free and works alone. Generate core Item fields and the complete source rules in descriptions. Omit `Activities` and `effects` entirely; description enrichers do not create those mechanics.
- **Premium/full:** Use this mode only when the user explicitly requests it or confirms that 5e Activity Importer is available. Add only source-defined, supported activities/effects using that premium companion's strict templates. Keep the complete rules in the Item description as well. Activity Importer must be active when importing attachments.
- If module availability is unspecified, use free/core mode. Merely receiving this template does not establish premium availability. An explicit free/core request takes precedence even when both modules are installed.
- These mode names are prompt instructions, not YAML fields. Do not emit mode, edition, purchase, or licensing metadata.
- Loot and Container support passive `effects` only; never emit `Activities` for those types.

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
SPELL:
  ITEM:
    Name: "Fireball"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Staff of Fire"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
SCHEMA_VERSION: 1
SPELL:
  ITEM:
    Name: "Fireball"
    # additional fields omitted in this batching example
---
SCHEMA_VERSION: 1
SPELL:
  ITEM:
    Name: "Lightning Bolt"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., MATERIALS, AREA) when their condition is not met. Do not fill omitted sections with `n/a` values.
- For functional source-defined mechanics, use the companion Activities/Active Effects workflow below in premium/full mode. For a core Item import without companion support, omit both sections and retain the rules in the description.
- Do not include template comments (`# ...`) in the final YAML output.
- Do not omit individual fields from required sections just because their value is `n/a`.
- Replace every bracketed placeholder value; never output literal placeholders like `[text]` or `[integer]`.
- Use HTML tags inside description fields, not Markdown headings or Markdown lists.

**YAML Syntax Rules (do not violate):**
- Every key needs a SPACE after the colon: `KEY: value`, never `KEY:value`. js-yaml will reject the file with a confusing "multiline key" error otherwise.
- Empty arrays are written `KEY: []` and empty mappings `KEY: {}` — both with the space.
- Indentation is exactly 2 spaces per level. No tabs. No 4-space jumps.

**Default assumptions when source text is silent:**
- Ability: `n/a` unless the spell uses a fixed ability override.
- Preparation Method: `spell`; Prepared: `true` unless explicitly at-will, innate, ritual-only, or pact magic. A normally prepared spell that can also be cast as a ritual keeps `Method: spell`.
- Components Ritual: `false` unless the spell is ritual-capable; use `true` independently of its preparation method.
- Material Cost and Supply: finite nonnegative numbers (integers or decimals); use `0` when no cost or tracked supply is specified.
- Activation Condition: `n/a` unless a trigger or special condition is stated.
- Duration Concentration: `false` unless concentration is explicitly required.
- Uses Spent: `0`; Uses Max: `n/a` unless the spell item tracks limited uses outside normal spell slots.
- RECOVERY: `[]` when no limited-use recovery applies.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
SCHEMA_VERSION: 1
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
    Ritual: "[true|false]"

  MATERIALS:
    # (Required only if Material is true)
    Value: "[text]"
    Cost: "[integer|decimal]"
    Supply: "[integer|decimal]"
    Consumed: "[true|false]"

  PREPARATION:
    Method: "[atwill|innate|ritual|pact|spell]"
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

  # Optional, repeatable. Use [] when there is no recovery.
  # If Uses Max > 0, replace [] with a list of entries shaped like:
  #   - Period: "[lr|sr|day|dawn|dusk|recharge]"
  #     Type: "[recoverAll|loseAll|formula]"
  #     Formula: "[text|n/a]"
  RECOVERY: []

  DESCRIPTION:
    Description: |
      [multiline HTML content containing Enrichers]

  CHAT_FLAVOR:
    Chat Description: |
      [multiline text content]

```

## OPTIONAL ACTIVITIES AND ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct attack, saving throw, damage, healing, or condition activities. The importer does not generate those mechanics from strict YAML description text. Some item types receive generic system defaults, which do not reproduce arbitrary source rules.

For a functional item with source-defined rolls or effects, include the appropriate `Activities` and/or `effects` entries when Activity Importer is available for this workflow or the user requests its support. This includes a spell's primary save and damage, not only extra actions. Use the matching complete Activity Importer templates from `modules/5e-activity-importer/templates/Base Activity Templates/`, or the MIDI variants when that automation is intended. Preserve source mechanics, triggers, costs, and scaling; never invent mechanics, UUIDs, macros, or module-specific effect keys. If a rule cannot be represented, retain it in the description for manual resolution.

In free/core mode, or when companion support is unavailable or unspecified, omit these sections and preserve the full rules in the description. The resulting import does not promise automated use of those rules. Do not add empty placeholder entries. Both sections require the companion module to be active at import time, and the selected dnd5e Item type must support the requested activities.

Append supported sections at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key:
- `Activities` is an array. Each entry contains exactly one `ACTIVITY_*` key and the corresponding activity body. Multiple activities of the same type are separate array entries; do not insert `---` inside this array.
- `effects` is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Use these for passive item effects. Effects applied by an activity belong in that activity's `APPLIED_EFFECTS` array instead; do not duplicate them here.
- For each effect on Foundry 14, populate at most one duration unit (Seconds, Rounds, or Turns), using `n/a` for the other units.

The completed examples below demonstrate array nesting for a passive +1 AC ward and an action that deals 1d6 fire damage. They are illustrative only: include them only if the source actually grants those mechanics, and use the full matching companion template for the requested activity type.

```yaml
  effects:
    - DETAILS:
        Name: "Armor Ward"
        Icon Tint Color: n/a
        Effect Suspended: false
        Apply Effect to Actor: true
        Status Conditions: n/a
        Separate Status Conditions: n/a
      EFFECT_DESCRIPTION:
        Effect Description: "Grants +1 AC while this item's passive effect is active."
      DURATION:
        Effect Duration (Seconds): n/a
        Effect Start Time: n/a
        Effect Duration (combat) Rounds: n/a
        Effect Duration (combat) Turns: n/a
        Effect Start (combat) Rounds: n/a
        Effect Start (combat) Turns: n/a
      CHANGES:
        - Attribute Key: system.attributes.ac.bonus
          Change Mode: 2
          Value: "1"
          Priority: 20
  Activities:
    - ACTIVITY_DAMAGE:
        ACTIVITY:
          Name: "Fire Burst"
          Icon: n/a
        ACTIVATION:
          Override Activation: true
          Activation Type: action
          Activation Cost: 1
          Condition: n/a
        DURATION:
          Override Duration: true
          Duration Time: inst
          Special Duration: n/a
          Duration Amount: n/a
          Concentration: false
        DAMAGE_DETAILS:
          Allow Critical: false
          Extra Critical Damage Formula: n/a
        DAMAGE:
          DAMAGE_PARTS:
            - Custom Damage Formula: true
              Damage Formula: "1d6"
              Damage Type: fire
              Damage Scaling: No Scaling
        APPLIED_EFFECTS: []
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
| `ritual` | Legacy ritual-only preparation (always prepared); when Components Ritual is omitted, also enables the ritual property. |
| `pact` | Pact Magic (Warlock slot) |
| `spell` | Standard spellbook/prepared spell |

Legacy `prepared` is still accepted for backward compatibility, but new templates should use `spell`.

### **Ritual Casting and Materials**

| Field | Description | Accepted Values |
|---|---|---|
| `COMPONENTS.Ritual` | Whether this spell can be cast as a ritual, independently of preparation. A normal ritual-capable spell uses `Ritual: true` with `PREPARATION.Method: spell`. | `true` or `false`; default `false`. |
| `MATERIALS.Cost` | Material component cost in gold pieces. | Finite nonnegative number (integer or decimal); `0` when no cost is stated. |
| `MATERIALS.Supply` | Tracked supply of material components. | Finite nonnegative number (integer or decimal); `0` when no supply is tracked. |

New YAML must state `COMPONENTS.Ritual` explicitly. An explicit boolean takes precedence over the legacy `Method: ritual` implication. Older YAML with an omitted, null, or `n/a` Ritual field retains that legacy inference.

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
<li><strong>Failure:</strong> Target is &Reference[restrained] until the start of [[lookup @name]]{the creature}'s next turn.</li>
<li><strong>Success:</strong> Half damage, no additional effects.</li>
</ul>
```

### **Higher Levels Section**
```html
<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When [[lookup @name]]{the creature} casts this spell using a spell slot of Xth level or higher, the damage increases by [[/damage 1d6 fire]] for each slot level above X.</p>
</section>
```

### **Concentration Reminder**
```html
<p><strong>Maintaining Concentration.</strong> If [[lookup @name]]{the creature} takes damage while concentrating on this spell, they must succeed on a [[/concentration]] saving throw or the spell ends.</p>
```

---
