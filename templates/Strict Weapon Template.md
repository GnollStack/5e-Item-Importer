# Strict_Weapon_Template_v2.md

```markdown
===WEAPON===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]
Weapon Type: [simpleM|simpleR|martialM|martialR|natural|improv|siege]
Base Weapon: [e.g. longsword, dagger, bow - see list below - OR blank]

---INVENTORY---
Quantity: [integer]
Identified: [true|false]
Equipped: [true|false]

---COST AND WEIGHT---
Price Value: [number]
Price Denomination: [pp|gp|ep|sp|cp]
Weight Value: [number]
Weight Units: [lb|tn|kg|t]

---PROPERTIES---
Adamantine: [true|false]
Ammunition: [true|false]
Finesse: [true|false]
Firearm: [true|false]
Focus: [true|false]
Heavy: [true|false]
Light: [true|false]
Loading: [true|false]
Magical: [true|false]
Reach: [true|false]
Reload: [true|false]
Returning: [true|false]
Silvered: [true|false]
Special: [true|false]
Thrown: [true|false]
Two-Handed: [true|false]
Versatile: [true|false]

---ATTUNEMENT---
(Required only if Magical is true)
Attunement: [none|required|optional]
Attunement By: [text|blank]
Magic Bonus: [integer|blank]

---AMMUNITION---
(Required only if Ammunition is true)
Ammunition Type: [arrow|crossbowBolt|firearmBullet|slingBullet|energyCell|blowgunNeedle]

---RELOAD---
(Required only if Reload is true)
Reload Amount: [integer]

---VERSATILE DAMAGE---
(Required only if Versatile is true)
Versatile Formula: [e.g. 1d10 + @mod]
Versatile Damage Type: [slashing|piercing|bludgeoning|etc]

---SIEGE PROPERTIES---
(Required only if Weapon Type is siege)
Siege Armor Class: [integer]
Cover: [none|half|threequarters|total]
Hit Points Current: [integer]
Hit Points Max: [integer]
Hit Points Threshold: [integer]
Health Conditions: [text|blank]

---RANGE---
Reach: [integer|blank]
Range Normal: [integer|blank]
Range Long: [integer|blank]
Range Units: [ft|m|sq|mi]

---DAMAGE---
Damage Formula: [e.g. 2d6 + @mod]
Damage Type: [acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder]

---MASTERY---
Mastery: [cleave|graze|nick|push|sap|slow|topple|vex|blank]

---PROFICIENCY---
Proficiency: [automatic|notProficient|proficient]

---USAGE---
Uses Current: [integer]
Uses Max: [integer]

---RECOVERY---
(Optional, repeatable. Only relevant if Uses Max > 0)
Period: [lr|sr|day|dawn|dusk|recharge]
Type: [recoverAll|loseAll|formula]
Formula: [text|blank]
===END RECOVERY===

---DESCRIPTION---
Description:
[multiline HTML content containing Enrichers]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text|blank]
Unidentified Description:
[multiline HTML content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END WEAPON===
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

## **EXAMPLE 1: GREATSWORD (Oathblade of the Fallen Paladin)**

```text
===WEAPON===
Name: Oathblade of the Fallen Paladin
Rarity: veryRare
Weapon Type: martialM
Base Weapon: greatsword

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 15000
Price Denomination: gp
Weight Value: 6
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 2

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 2d6 + @mod + 2
Damage Type: slashing

---MASTERY---
Mastery: graze

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 5
Uses Max: 5

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d4+1
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This massive blade is forged from blackened steel, its edge eternally sharp. Holy symbols have been scratched out and replaced with profane runes, yet faint traces of divine light still flicker within the metal.</em></p>
<hr>

<p>You have a +2 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Conflicted Soul.</strong> This weapon was once a holy avenger, corrupted when its wielder fell from grace. It deals an extra [[/damage 2d6 necrotic average]] to celestials and an extra [[/damage 2d6 radiant average]] to fiends and undead.</p>

<p><strong>Oathbreaker's Smite.</strong> This weapon has 5 charges. When you hit a creature with this weapon, you can expend charges to deal additional damage:</p>
<ul>
<li><strong>1 Charge:</strong> Deal an extra [[/damage 2d8 necrotic average]].</li>
<li><strong>2 Charges:</strong> Deal an extra [[/damage 3d8 necrotic average]], and the target must succeed on a [[/save wis 15 format=long]] or become &Reference[frightened] of you until the end of your next turn.</li>
<li><strong>3 Charges:</strong> Deal an extra [[/damage 4d8 necrotic average]], and you regain hit points equal to half the necrotic damage dealt.</li>
</ul>

<p>The weapon regains 1d4 + 1 expended charges daily at dawn.</p>

<p><strong>Echoes of Redemption.</strong> If you use this weapon to defeat a fiend or undead creature of CR 10 or higher, you can choose to permanently remove 1d4 profane runes from the blade. If all runes are removed, the weapon transforms back into a <em>holy avenger</em>.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Corrupted Greatsword
Unidentified Description:
<p>A massive greatsword of blackened steel. Holy symbols have been defaced, and dark runes glow faintly along the blade.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A weapon torn between darkness and the light it once served.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 2: LONGBOW (Whisperwind Bow)**

```text
===WEAPON===
Name: Whisperwind Bow
Rarity: rare
Weapon Type: martialR
Base Weapon: longbow

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: true
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---AMMUNITION---
Ammunition Type: arrow

---RANGE---
Reach: blank
Range Normal: 150
Range Long: 600
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 1
Damage Type: piercing

---MASTERY---
Mastery: slow

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This elegant elven bow is crafted from pale ashwood and strung with spider silk. When drawn, the air around it stills completely—arrows loose from this bow make no sound.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Silent Shot.</strong> Attacks made with this bow make no sound. Creatures cannot use sound to detect where the attack originated from.</p>

<p><strong>Wind's Blessing.</strong> Arrows fired from this bow ignore half cover and three-quarters cover, and you suffer no disadvantage from attacking at long range.</p>

<p><strong>Zephyr Strike.</strong> This bow has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Seeking Arrow (1 Charge):</strong> When you make an attack, the arrow curves around obstacles. The target gains no benefit from cover for this attack, and you have advantage on the attack roll.</li>
<li><strong>Gale Burst (2 Charges):</strong> When you hit a creature, it must succeed on a [[/save str 15 format=long]] or be pushed 15 feet directly away from you and knocked &Reference[prone].</li>
<li><strong>Phantom Arrow (3 Charges):</strong> As a bonus action, you create a magical arrow that doesn't require ammunition. This arrow deals an extra [[/damage 2d6 force average]] and passes through creatures, potentially hitting multiple targets in a 60-foot line. Each creature in the line must make a [[/save dex 15 format=long]], taking [[/damage 3d8 + @mod piercing average]] on a failure, or half on a success.</li>
</ul>

<p>The bow regains all expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Pale Elven Bow
Unidentified Description:
<p>A finely crafted bow of pale wood. The air seems unusually still around it.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Death on silent wings.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 3: RAPIER (Viper's Fang)**

```text
===WEAPON===
Name: Viper's Fang
Rarity: rare
Weapon Type: martialM
Base Weapon: rapier

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 3500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
Firearm: false
Focus: false
Heavy: false
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 1
Damage Type: piercing

---MASTERY---
Mastery: vex

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This slender rapier has a blade etched with serpentine patterns. The crossguard is shaped like a coiled viper, its emerald eyes gleaming with malevolent intelligence.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Serpent's Venom.</strong> When you hit a creature with this weapon, the target must succeed on a [[/save con 14 format=long]] or take [[/damage 2d6 poison average]] and become &Reference[poisoned] until the end of your next turn. Once a creature succeeds on this save, it is immune to the poison for 24 hours.</p>

<p><strong>Coiled Strike.</strong> When you take the Attack action on your turn, you can forgo one of your attacks to make a special lunging strike. You can move up to 10 feet toward an enemy without provoking opportunity attacks, and if you hit with the next attack you make this turn, the target takes an extra [[/damage 1d8 piercing average]].</p>

<p><strong>Viper's Reflexes.</strong> While holding this weapon, you have advantage on initiative rolls and can't be surprised while conscious.</p>

<p><strong>Shed Skin.</strong> As a reaction when you are hit by an attack, you can impose disadvantage on the attack roll, potentially causing it to miss. Once used, this property can't be used again until you finish a short or long rest.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Serpent-Hilted Rapier
Unidentified Description:
<p>A slender rapier with a snake-shaped crossguard. The blade has a faint green tint.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Quick as a snake, twice as deadly.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 4: GLAIVE (Reaper's Reach)**

```text
===WEAPON===
Name: Reaper's Reach
Rarity: rare
Weapon Type: martialM
Base Weapon: glaive

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 4000
Price Denomination: gp
Weight Value: 6
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: true
Light: false
Loading: false
Magical: true
Reach: true
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 10
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d10 + @mod + 1
Damage Type: slashing

---MASTERY---
Mastery: topple

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This glaive's blade is forged from cold iron and etched with funerary rites. A faint chill emanates from the weapon, and those near death can see a spectral shroud trailing from its edge.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Soul Sight.</strong> While holding this weapon, you can see the current hit points of any creature within 30 feet as a percentage of their maximum (healthy, bloodied, near death).</p>

<p><strong>Death's Harvest.</strong> When you reduce a creature to 0 hit points with this weapon, you gain [[/heal 1d10 temp]] as the weapon drinks in the creature's fading life force.</p>

<p><strong>Reaper's Sweep.</strong> This weapon has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Sweeping Strike (1 Charge):</strong> When you hit a creature, you can force each other creature of your choice within 5 feet of the target to make a [[/save dex 14 format=long]] or take [[/damage 2d10 slashing average]].</li>
<li><strong>Spectral Extension (2 Charges):</strong> Until the end of your turn, this weapon's reach increases to 15 feet, and attacks deal an extra [[/damage 1d10 necrotic average]].</li>
</ul>

<p>The weapon regains all expended charges daily at dawn.</p>

<p><strong>Grim Reminder.</strong> Undead creatures have disadvantage on saving throws against being turned while within 10 feet of this weapon.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Cold Iron Glaive
Unidentified Description:
<p>A glaive with a blade of dark iron. It radiates an unsettling chill.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
No one escapes the reaper forever.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 5: HANDAXE (Stormthrower)**

```text
===WEAPON===
Name: Stormthrower
Rarity: uncommon
Weapon Type: simpleM
Base Weapon: handaxe

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 1500
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: false
Light: true
Loading: false
Magical: true
Reach: false
Reload: false
Returning: true
Silvered: false
Special: false
Thrown: true
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 1

---RANGE---
Reach: 5
Range Normal: 20
Range Long: 60
Range Units: ft

---DAMAGE---
Damage Formula: 1d6 + @mod + 1
Damage Type: slashing

---MASTERY---
Mastery: vex

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
<p><em>This handaxe crackles with barely contained lightning. Storm clouds seem to gather in miniature around its blade, and thunder rumbles softly when it's drawn.</em></p>
<hr>

<p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Returning.</strong> After you throw this weapon, it returns to your hand at the end of your turn.</p>

<p><strong>Lightning Arc.</strong> When you throw this weapon and hit, the target takes an extra [[/damage 1d6 lightning average]]. Additionally, lightning arcs to one creature of your choice within 15 feet of the target, which must succeed on a [[/save dex 13 format=long]] or take [[/damage 1d6 lightning average]].</p>

<p><strong>Thunderclap.</strong> Once per short rest, when you hit a creature with a thrown attack using this weapon, you can cause a thunderous boom. Each creature within 10 feet of the target (including the target) must succeed on a [[/save con 14 format=long]] or be &Reference[deafened] and pushed 10 feet away from the point of impact.</p>

<p><strong>Storm's Blessing.</strong> While holding this weapon, you have resistance to lightning damage.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Crackling Handaxe
Unidentified Description:
<p>A handaxe that sparks with electricity. Small clouds seem to swirl around its head.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Throw the storm.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 6: WARHAMMER (Earthshaker)**

```text
===WEAPON===
Name: Earthshaker
Rarity: rare
Weapon Type: martialM
Base Weapon: warhammer

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 5000
Price Denomination: gp
Weight Value: 2
Weight Units: lb

---PROPERTIES---
Adamantine: true
Ammunition: false
Finesse: false
Firearm: false
Focus: false
Heavy: false
Light: false
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: false
Versatile: true

---ATTUNEMENT---
Attunement: required
Attunement By: blank
Magic Bonus: 2

---VERSATILE DAMAGE---
Versatile Formula: 1d10 + @mod + 2
Versatile Damage Type: bludgeoning

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d8 + @mod + 2
Damage Type: bludgeoning

---MASTERY---
Mastery: push

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This dwarven warhammer is forged from deep iron and engraved with runes of earth and stone. The head seems impossibly dense, and the ground trembles slightly with each swing.</em></p>
<hr>

<p>You have a +2 bonus to attack and damage rolls made with this magic weapon.</p>

<p><strong>Adamantine.</strong> This weapon is made of adamantine. When you hit an object with this weapon, the hit is automatically a critical hit.</p>

<p><strong>Versatile.</strong> This weapon can be wielded with one or two hands. When wielded with two hands, it deals [[/damage 1d10 + @mod + 2 bludgeoning]] damage.</p>

<p><strong>Tremor Strike.</strong> This weapon has 3 charges. You can expend charges to use the following abilities:</p>
<ul>
<li><strong>Groundshock (1 Charge):</strong> When you hit a creature, you can cause the ground beneath it to crack. The target and each creature of your choice within 5 feet must succeed on a [[/save dex 15 format=long]] or fall &Reference[prone].</li>
<li><strong>Shockwave (2 Charges):</strong> As an action, you can strike the ground, creating a shockwave. Each creature within 15 feet of you must make a [[/save con 15 format=long]], taking [[/damage 3d8 thunder average]] on a failed save and being knocked &Reference[prone], or half as much damage on a successful save without falling prone.</li>
<li><strong>Earthen Fortress (3 Charges):</strong> As an action, you slam the hammer into the ground. A 10-foot radius area around you becomes &Reference[Difficult Terrain] for enemies for 1 minute. Additionally, you and allies standing in this area have half cover.</li>
</ul>

<p>The weapon regains all expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Dense Dwarven Hammer
Unidentified Description:
<p>An unusually heavy warhammer covered in dwarven runes. The ground seems to shake when it moves.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
When mountains strike back.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 7: SCIMITAR (Moonblade of the Eladrin)**

```text
===WEAPON===
Name: Moonblade of the Eladrin
Rarity: legendary
Weapon Type: martialM
Base Weapon: scimitar

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 50000
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
Firearm: false
Focus: true
Heavy: false
Light: true
Loading: false
Magical: true
Reach: false
Reload: false
Returning: false
Silvered: true
Special: true
Thrown: false
Two-Handed: false
Versatile: false

---ATTUNEMENT---
Attunement: required
Attunement By: elf or half-elf of neutral or good alignment
Magic Bonus: 3

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d6 + @mod + 3
Damage Type: slashing

---MASTERY---
Mastery: nick

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 5
Uses Max: 5

---RECOVERY---
Period: dawn
Type: recoverAll
Formula: blank
===END RECOVERY===

---DESCRIPTION---
Description:
<p><em>This elegant curved blade shimmers with captured moonlight. Ancient Elvish script runs along its length, and the blade phases between silver and translucent based on the moon's phase. The weapon hums softly when held by one worthy of its legacy.</em></p>
<hr>

<p>You have a +3 bonus to attack and damage rolls made with this magic weapon. This weapon can be used as a spellcasting focus for your spells.</p>

<p><strong>Sentience.</strong> This moonblade is a sentient neutral good weapon with Intelligence 14, Wisdom 16, and Charisma 18. It has hearing and darkvision out to 120 feet. It can communicate telepathically with its wielder and speaks Elvish, Sylvan, and Common.</p>

<p><strong>Personality.</strong> The moonblade contains the collected wisdom of seven previous wielders. It values honor, protection of the innocent, and the preservation of elven culture. It will not allow itself to be used for evil acts and may refuse to function if its wielder strays from a good alignment.</p>

<p><strong>Lunar Cycle.</strong> This weapon has 5 charges. Its abilities shift based on the moon's phase:</p>
<ul>
<li><strong>New Moon (Stealth):</strong> You become &Reference[invisible] until the end of your next turn (1 Charge).</li>
<li><strong>Waxing Moon (Growth):</strong> You and allies within 30 feet regain [[/heal 2d8 + 4 average]] hit points (2 Charges).</li>
<li><strong>Full Moon (Power):</strong> Your next attack deals an extra [[/damage 4d6 radiant average]] and the target must succeed on a [[/save con 17 format=long]] or be &Reference[blinded] until the end of your next turn (2 Charges).</li>
<li><strong>Waning Moon (Protection):</strong> You gain resistance to all damage until the start of your next turn (3 Charges).</li>
</ul>

<p>The weapon regains all expended charges daily at dawn. The DM determines which phase ability is available based on the in-game moon cycle, or the wielder can choose freely if the moon is not tracked.</p>

<p><strong>Legacy Runes.</strong> Seven runes are inscribed on the blade, each representing a past wielder's contribution. These grant: +3 bonus (base), finesse, light, spellcasting focus, and the Lunar Cycle abilities.</p>

<p><strong>Rejection.</strong> If you are not an elf or half-elf of neutral or good alignment, attempting to attune to this weapon deals [[/damage 6d6 psychic average]] to you and ends the attunement attempt.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Glowing Elven Scimitar
Unidentified Description:
<p>A curved elven blade that glows with soft moonlight. Elvish script runs along its length.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
Seven souls guide the blade. Seven legacies live within its edge.
===END CHAT FLAVOR===

===END WEAPON===
```

---