@@include details/optional-activities-and-active-effects.md

@@include details/fields.md

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
| `1.5` | One and a half proficiency |
| `2` | Expertise (double proficiency) |

These are the accepted YAML proficiency values, including the native 1.5 multiplier.

@@include details/fields/recovery-periods.md

### **Recharge Values**
| Formula | Display |
|---------|---------|
| `6` | Recharge 6 |
| `5` | Recharge 5-6 |
| `4` | Recharge 4-6 |
| `3` | Recharge 3-6 |
| `2` | Recharge 2-6 |

---

@@include details/enricher-reference.md

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

@@include details/html-patterns.md

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


@@include details/explicit-fields.md
