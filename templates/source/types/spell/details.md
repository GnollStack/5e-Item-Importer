@@include details/optional-activities-and-active-effects.md

@@include details/fields.md

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
| `radius` | Emanation around the caster |
| `ring` | Ring; `Width` is its thickness |
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

@@include details/fields/recovery-periods.md

@@include details/fields/recovery-types.md

@@include details/enricher-reference.md

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

@@include details/html-patterns.md

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


@@include details/explicit-fields.md
