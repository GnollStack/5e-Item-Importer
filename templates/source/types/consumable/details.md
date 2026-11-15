@@include details/optional-activities-and-active-effects.md

@@include details/fields.md

### **Usage & Recovery Rules**
| Type | Uses Max | Destroy on Empty | Tracking |
|------|----------|------------------|----------|
| Potions | `1` | `true` | One use each; the quantity drops as they are used |
| Food | `1` | `true` | One use each; the quantity drops as they are used |
| Poison | `1` | `true` | One use each; the quantity drops as they are used |
| Ammunition | `0` | `false` | By Quantity |
| Wands | Charges (e.g., `7`) | `true` or `false` | By Uses |
| Rods | Charges (e.g., `3`) | `true` or `false` | By Uses |
| Trinkets | Varies | Varies | Context-dependent |

@@include details/fields/recovery-periods.md

### **Recovery Types**
| Type | Formula | Result |
|------|---------|--------|
| `recoverAll` | n/a | Regain all charges |
| `loseAll` | n/a | Lose all remaining charges |
| `formula` | Dice (e.g., `1d6+1`) | Regain rolled amount |
| `formula` | Number (e.g., `5`) | For recharge: regain all on d6 ≥ 5 |

---

@@include details/enricher-reference.md

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

@@include details/enricher-reference/attack-rolls.md

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

@@include details/html-patterns.md

### **Standard Consumable Effect**
```html
<p>When [[lookup @name]]{the creature} drinks this potion, they regain [[/heal 2d4 + 2 average]] hit points.</p>
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
<p>This wand has 7 charges. While holding it, [[lookup @name]]{the creature} can use an action to expend 1 or more charges to cast a spell from it.</p>
<ul>
<li><strong>1 Charge:</strong> [[/damage 1d4 + 1 force average]] (1st-level)</li>
<li><strong>2 Charges:</strong> [[/damage 2d4 + 2 force average]] (2nd-level)</li>
<li><strong>3 Charges:</strong> [[/damage 3d4 + 3 force average]] (3rd-level)</li>
</ul>
```

### **Risk on Empty**
```html
<p><strong>Crumble Risk.</strong> If [[lookup @name]]{the creature} expends the item's last charge, roll a d20. On a 1, it crumbles into ashes and is destroyed.</p>
```

---


@@include details/explicit-fields.md
