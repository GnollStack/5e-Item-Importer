# Strict_Loot_Template_v3.md

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
LOOT:
  ITEM:
    Name: "Ruby Gemstone"
    # additional fields omitted in this batching example
WEAPON:
  ITEM:
    Name: "Longsword +1"
    # additional fields omitted in this batching example
```
For multiple items of the **same type**, separate them with `---` (YAML document separator):
```text
SCHEMA_VERSION: 1
LOOT:
  ITEM:
    Name: "Ruby Gemstone"
    # additional fields omitted in this batching example
---
SCHEMA_VERSION: 1
LOOT:
  ITEM:
    Name: "Gold Idol"
    # additional fields omitted in this batching example
```
You can mix both methods. Supported top-level keys: `SPELL`, `WEAPON`, `EQUIPMENT`, `CONSUMABLE`, `TOOL`, `LOOT`, `CONTAINER`.

**For LLM generation:**
- Output ONLY the yaml code block. No commentary before or after.
- Use exact values from the FIELD REFERENCE tables at the bottom of this document. Do not invent values.
- Booleans: `true` or `false` (lowercase, no quotes).
- Required scalar fields that do not apply: use the literal string `n/a`.
- **Omit both `effects:` and `Activities:` entirely** unless explicitly requested.
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
- Magical: `false` unless the item is explicitly magical.
- Unidentified Name: `n/a`; Unidentified Description: `n/a` unless an unidentified version is needed.
- Chat Description: `n/a` unless special chat flavor is needed.

---

```yaml
SCHEMA_VERSION: 1
LOOT:
  ITEM:
    Name: "[text]"
    Rarity: "[common|uncommon|rare|veryRare|legendary|artifact|n/a]"
    Loot Type: "[art|gear|gem|junk|material|resource|trade|treasure]"

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

### **Loot Types**
| Type | Description | Examples |
|------|-------------|----------|
| `art` | Artistic objects, paintings, sculptures | Paintings, tapestries, carvings |
| `gear` | Mundane equipment without function | Broken tools, old clothing |
| `gem` | Precious stones | Diamonds, rubies, opals |
| `junk` | Worthless or near-worthless items | Broken pottery, rusty nails |
| `material` | Crafting components | Monster parts, rare metals |
| `resource` | Consumable crafting resources | Ingots, lumber, cloth bolts |
| `trade` | Trade goods with mercantile value | Silk, spices, livestock |
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
