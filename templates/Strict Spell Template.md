# Strict_Spell_Template_v2.md

```markdown
===SPELL===
Name: [text]
Level: [0|1|2|3|4|5|6|7|8|9]
School: [abj|con|div|enc|evo|ill|nec|trs]

---COMPONENTS---
Vocal: [true|false]
Somatic: [true|false]
Material: [true|false]

---MATERIALS---
(Required only if Material is true)
Value: [text] (e.g., "a diamond worth 50 gp")
Cost: [integer] (The gold value, e.g. 50)
Supply: [integer] (The numeric quantity if relevant)
Consumed: [true|false]

---PREPARATION---
Method: [atwill|innate|ritual|pact|prepared]
Prepared: [true|false]

---ACTIVATION---
Type: [action|bonus|reaction|minute|hour|day|special]
Value: [integer]
Condition: [text] (For reactions or special)

---RANGE---
Units: [self|touch|spec|any|ft|mi|m|km]
Value: [integer]
Special: [text]

---DURATION---
Units: [inst|spec|turn|round|minute|hour|day|month|year|disp|dstr|perm]
Value: [integer]
Concentration: [true|false]

---TARGETS---
Type: [self|ally|enemy|creature|object|space|creatureOrObject|any|willing]
Count: [integer]
Choice: [true|false]
Special: [text]

---AREA---
(Required only if spell has an area of effect)
Shape: [cone|cube|cylinder|radius|line|sphere|circle|square|wall]
Size: [integer]
Units: [ft|mi|m|km]

---USAGE---
Uses Current: [integer]
Uses Max: [integer]

---RECOVERY---
(Optional, repeatable. Only relevant if Uses Max > 0)
Period: [lr|sr|day|dawn|dusk|recharge]
Type: [recoverAll|loseAll|formula]
Formula: [text]
===END RECOVERY===

---DESCRIPTION---
Description:
[multiline HTML content containing Enrichers]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text]
Unidentified Description:
[multiline HTML content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END SPELL===
```

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

## **EXAMPLE 1: AOE DAMAGE + CONDITION (Void Singularity)**

```text
===SPELL===
Name: Void Singularity
Level: 4
School: evo

---COMPONENTS---
Vocal: true
Somatic: true
Material: true

---MATERIALS---
Value: a crushed black pearl worth 100 gp
Cost: 100
Supply: 1
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 120
Special: 

---DURATION---
Units: round
Value: 1
Concentration: true

---TARGETS---
Type: creature
Count: 
Choice: false
Special: 

---AREA---
Shape: sphere
Size: 20
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You tear a hole in reality at a point you can see within range. A sphere of crushing gravity collapses inward, pulling everything toward the center.</em></p>
<hr>

<p>Each creature in a 20-foot-radius sphere centered on that point must make a [[/save str dc=@spell.dc format=long]]. On a failed save, a creature takes [[/damage 6d10 force average]] and is pulled up to 15 feet toward the center of the sphere and is &Reference[restrained] until the start of your next turn. On a successful save, a creature takes half damage and isn't pulled or restrained.</p>

<p>Unsecured objects in the area that aren't being worn or carried take the damage and are pulled toward the center.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 5th level or higher, the damage increases by [[/damage 1d10 force]] for each slot level above 4th.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Unknown Gravity Spell
Unidentified Description:
<p>The caster creates a small black bead that seems to absorb light around it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A singularity opens, crushing everything within with overwhelming gravity.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 2: HEALING + CONDITION REMOVAL (Chrono-Mend)**

```text
===SPELL===
Name: Chrono-Mend
Level: 3
School: trs

---COMPONENTS---
Vocal: true
Somatic: false
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: bonus
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 60
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: ally
Count: 1
Choice: true
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<blockquote>"Time is a river, and sometimes, we must swim upstream."</blockquote>

<p>You rewind time for a creature you can see within range, undoing recent injuries. The target regains [[/heal 3d8 + @mod average]] hit points.</p>

<p>Additionally, you can end one of the following conditions affecting the target: &Reference[blinded], &Reference[deafened], &Reference[paralyzed], or &Reference[poisoned].</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 4th level or higher, the healing increases by [[/heal 1d8]] for each slot level above 3rd.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Time Spell
Unidentified Description:
<p>The caster's eyes glow with a golden light as distinct ticking sounds emanate from their hands.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Time rewinds around the target, knitting wounds and erasing ailments.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 3: SPELL ATTACK + SAVE (Viper Lash)**

```text
===SPELL===
Name: Viper Lash
Level: 1
School: con

---COMPONENTS---
Vocal: true
Somatic: true
Material: true

---MATERIALS---
Value: a dried snake skin
Cost: 0
Supply: 0
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: ft
Value: 30
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: creature
Count: 1
Choice: true
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>A spectral green serpent erupts from your hand to strike at a foe.</em></p>
<hr>

<p>Make a melee spell attack against a creature within range. On a hit, the target takes [[/damage 2d8 poison average]] and must succeed on a [[/save con dc=@spell.dc format=long]] or be &Reference[poisoned] until the end of your next turn.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 2nd level or higher, the damage increases by [[/damage 1d8 poison]] for each slot level above 1st.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Green Lash
Unidentified Description:
<p>The caster summons a whip made of green energy.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A spectral snake strikes out, dripping with magical venom.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 4: CONCENTRATION + MULTI-DAMAGE (Elemental Maelstrom)**

```text
===SPELL===
Name: Elemental Maelstrom
Level: 5
School: evo

---COMPONENTS---
Vocal: true
Somatic: true
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: action
Value: 1
Condition: 

---RANGE---
Units: self
Value: 
Special: 

---DURATION---
Units: minute
Value: 1
Concentration: true

---TARGETS---
Type: creature
Count: 
Choice: false
Special: 

---AREA---
Shape: sphere
Size: 30
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You become the eye of a raging elemental storm that swirls around you.</em></p>
<hr>

<p>A maelstrom of elemental energy surrounds you in a 30-foot-radius sphere for the duration. When a creature enters the area for the first time on a turn or starts its turn there, it must make a [[/save dex dc=@spell.dc format=long]], taking [[/damage 3d6 fire & 3d6 cold average]] on a failed save, or half as much on a successful one.</p>

<p>The area is &Reference[Difficult Terrain] for creatures other than you.</p>

<p><strong>Maintaining Concentration.</strong> If you take damage while concentrating on this spell, you must succeed on a [[/concentration]] saving throw or the spell ends early.</p>

<section class="secret" id="upcast">
<p><strong>At Higher Levels.</strong> When you cast this spell using a spell slot of 6th level or higher, the fire and cold damage each increase by [[/damage 1d6 fire]] for each slot level above 5th.</p>
</section>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Storm Spell
Unidentified Description:
<p>A violent swirl of opposing elements surrounds the caster.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Fire and ice rage in a devastating vortex around you.
===END CHAT FLAVOR===

===END SPELL===
```

---

## **EXAMPLE 5: REACTION SPELL (Temporal Sidestep)**

```text
===SPELL===
Name: Temporal Sidestep
Level: 2
School: div

---COMPONENTS---
Vocal: false
Somatic: true
Material: false

---MATERIALS---
Value: 
Cost: 
Supply: 
Consumed: false

---PREPARATION---
Method: prepared
Prepared: true

---ACTIVATION---
Type: reaction
Value: 1
Condition: which you take when a creature you can see targets you with an attack

---RANGE---
Units: self
Value: 
Special: 

---DURATION---
Units: inst
Value: 
Concentration: false

---TARGETS---
Type: self
Count: 1
Choice: false
Special: 

---AREA---
Shape: 
Size: 
Units: ft

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>You glimpse a fraction of a second into the future and step aside before the blow lands.</em></p>
<hr>

<p>When a creature you can see targets you with an attack, you can use your reaction to teleport up to 15 feet to an unoccupied space you can see. The triggering attack automatically misses, and you can't be targeted by opportunity attacks until the start of your next turn.</p>

<p>If you teleport to a space that is no longer within the attack's range or behind total cover, the attacker can redirect the attack to another target within range, or the attack is wasted.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Blink Spell
Unidentified Description:
<p>The caster briefly shimmers and vanishes.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
You slip through time, leaving only an afterimage where you stood.
===END CHAT FLAVOR===

===END SPELL===
```

---