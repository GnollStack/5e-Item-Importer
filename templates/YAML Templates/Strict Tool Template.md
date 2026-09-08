# Strict_Tool_Template_v3.md

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
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
SCHEMA_VERSION: 1
TOOL:
  ITEM:
    Name: "Thieves' Tools"
    # additional fields omitted in this batching example
---
SCHEMA_VERSION: 1
TOOL:
  ITEM:
    Name: "Herbalism Kit"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit conditional sections entirely** (e.g., ATTUNEMENT) when their condition is not met. Do not fill omitted sections with `n/a` values.
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
TOOL:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Tool Type: "[art|game|music|n/a]"
    # Use n/a for disguise/forgery/herbalism/navigator/poisoner/thieves tools.
    Base Tool: "[e.g. alchemist, smith, thief, lute, dice - see list below]"

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
    Magical: "[true|false]"
    Tool Bonus: "[integer|n/a]"

  ATTUNEMENT:
    # (Required only if Magical is true)
    Attunement: "[none|required|optional]"
    Attunement By: "[text|n/a]"

  ABILITY_CHECK:
    Proficient: "[Automatic|0|0.5|1|2]"
    Ability: "[str|dex|con|int|wis|cha|n/a]"

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

### **Tool Types & Base Tool IDs**
| Type | Base Tool IDs |
|------|---------------|
| `art` | `alchemist`, `brewer`, `calligrapher`, `carpenter`, `cartographer`, `cobbler`, `cook`, `glassblower`, `jeweler`, `leatherworker`, `mason`, `painter`, `potter`, `smith`, `tinker`, `weaver`, `woodcarver` |
| `game` | `dice`, `card`, `chess` |
| `music` | `bagpipes`, `drum`, `dulcimer`, `flute`, `horn`, `lute`, `lyre`, `panflute`, `shawm`, `viol` |
| `n/a` | `disg`, `forg`, `herb`, `navg`, `pois`, `thief` |

Legacy short artisan IDs such as `alch` and `calli` are still accepted for backward compatibility, but new templates should use the full IDs below.

### **Artisan Tools Reference**
| ID | Tool Name |
|----|-----------|
| `alchemist` | Alchemist's Supplies |
| `brewer` | Brewer's Supplies |
| `calligrapher` | Calligrapher's Supplies |
| `carpenter` | Carpenter's Tools |
| `cartographer` | Cartographer's Tools |
| `cobbler` | Cobbler's Tools |
| `cook` | Cook's Utensils |
| `glassblower` | Glassblower's Tools |
| `jeweler` | Jeweler's Tools |
| `leatherworker` | Leatherworker's Tools |
| `mason` | Mason's Tools |
| `painter` | Painter's Supplies |
| `potter` | Potter's Tools |
| `smith` | Smith's Tools |
| `tinker` | Tinker's Tools |
| `weaver` | Weaver's Tools |
| `woodcarver` | Woodcarver's Tools |

### **Other Tools Reference**
| ID | Tool Name |
|----|-----------|
| `disg` | Disguise Kit |
| `forg` | Forgery Kit |
| `herb` | Herbalism Kit |
| `navg` | Navigator's Tools |
| `pois` | Poisoner's Kit |
| `thief` | Thieves' Tools |

### **Proficiency**
| Value | Meaning |
|-------|---------|
| `Automatic` | Game auto-detects proficiency from the character (default) |
| `0` | Not proficient |
| `0.5` | Half proficiency |
| `1` | Proficient |
| `2` | Expertise (double proficiency) |

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
[[/check alchemist 14 format=long]]    → [DC 14 Intelligence (Alchemist's Supplies)] check
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

<p>Proficiency with these tools lets [[lookup @name]]{the creature} add their proficiency bonus to ability checks they make using them.</p>
```

### **Magical Tool with Bonus**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>While using these tools, [[lookup @name]]{the creature} has a +X bonus to ability checks made with them.</p>
```

### **Charge-Based Tool**
```html
<p><em>Flavor description.</em></p>
<hr>

<p>This item has X charges. While using it, [[lookup @name]]{the creature} can expend charges to activate the following abilities:</p>
<ul>
<li><strong>Ability Name (1 Charge):</strong> Effect description.</li>
<li><strong>Ability Name (2 Charges):</strong> Effect description.</li>
</ul>
<p>The item regains 1d4 expended charges daily at dawn.</p>
```

### **Area Effect (Musical Instruments)**
```html
<p><strong>Haunting Melody (1 Charge).</strong> As an action, [[lookup @name]]{the creature} can play the instrument and expend 1 charge. Each creature of their choice within 30 feet that can hear them must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of them for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.</p>
```

### **Crafting Enhancement**
```html
<p><strong>Master's Touch.</strong> When [[lookup @name]]{the creature} uses these tools to craft an item during downtime, they complete the work in half the normal time.</p>
```

### **Proficiency Requirement**
```html
<p>You must be proficient with [tool type] to use this item's magical properties.</p>
```

---
