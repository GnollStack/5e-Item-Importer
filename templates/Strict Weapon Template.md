# Strict_Weapon_Template.md

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
[multiline text content]
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: [text|blank]
Unidentified Description:
[multiline text content]
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
[multiline text content]
===END CHAT FLAVOR===

===END WEAPON===
```

**Valid Base Weapons:**
*   **Melee:** `club`, `dagger`, `greatclub`, `handaxe`, `javelin`, `lighthammer`, `mace`, `quarterstaff`, `sickle`, `spear`, `battleaxe`, `flail`, `glaive`, `greataxe`, `greatsword`, `halberd`, `lance`, `longsword`, `maul`, `morningstar`, `pike`, `rapier`, `scimitar`, `shortsword`, `trident`, `warpick`, `warhammer`, `whip`
*   **Ranged:** `dart`, `lightcrossbow`, `shortbow`, `sling`, `blowgun`, `handcrossbow`, `heavycrossbow`, `longbow`, `net`

### **Recovery Field Rules:**

| Period | Type | Formula | Description |
|--------|------|---------|-------------|
| `lr` | `recoverAll` | `blank` | Recover all uses on Long Rest |
| `lr` | `loseAll` | `blank` | Lose all uses on Long Rest |
| `lr` | `formula` | Dice formula | Recover formula result on Long Rest |
| `sr` | `recoverAll` | `blank` | Recover all uses on Short Rest |
| `sr` | `loseAll` | `blank` | Lose all uses on Short Rest |
| `sr` | `formula` | Dice formula | Recover formula result on Short Rest |
| `day` | `recoverAll` | `blank` | Recover all uses daily |
| `day` | `loseAll` | `blank` | Lose all uses daily |
| `day` | `formula` | Dice formula | Recover formula result daily |
| `dawn` | `recoverAll` | `blank` | Recover all uses at dawn |
| `dawn` | `loseAll` | `blank` | Lose all uses at dawn |
| `dawn` | `formula` | Dice formula | Recover formula result at dawn |
| `dusk` | `recoverAll` | `blank` | Recover all uses at dusk |
| `dusk` | `loseAll` | `blank` | Lose all uses at dusk |
| `dusk` | `formula` | Dice formula | Recover formula result at dusk |
| `recharge` | `formula` | `2`-`6` | Recharge on d6 roll ≥ Formula value |

---

## **EXAMPLE 1: MELEE WEAPON (Greataxe)**

```text
===WEAPON===
Name: Greataxe
Rarity: common
Weapon Type: martialM
Base Weapon: greataxe

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 30
Price Denomination: gp
Weight Value: 7
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
Magical: false
Reach: false
Reload: false
Returning: false
Silvered: false
Special: false
Thrown: false
Two-Handed: true
Versatile: false

---ATTUNEMENT---
Attunement: none
Attunement By: blank
Magic Bonus: blank

---RANGE---
Reach: 5
Range Normal: blank
Range Long: blank
Range Units: ft

---DAMAGE---
Damage Formula: 1d12 + @mod
Damage Type: slashing

---MASTERY---
Mastery: cleave

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 0
Uses Max: 0

---DESCRIPTION---
Description:
A heavy, double-bladed axe capable of cleaving through armor and bone alike.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Heavy Axe
Unidentified Description:
A large axe with a double head.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A standard greataxe.
===END CHAT FLAVOR===

===END WEAPON===
```

---

## **EXAMPLE 2: MAGICAL WEAPON (Custom Dagger)**

```text
===WEAPON===
Name: Magma Tooth
Rarity: rare
Weapon Type: simpleM
Base Weapon: dagger

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 2500
Price Denomination: gp
Weight Value: 1
Weight Units: lb

---PROPERTIES---
Adamantine: false
Ammunition: false
Finesse: true
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
Damage Formula: 1d4[piercing] + @mod + 1d6[fire] + 1
Damage Type: piercing, fire

---MASTERY---
Mastery: nick

---PROFICIENCY---
Proficiency: proficient

---USAGE---
Uses Current: 3
Uses Max: 3
Destroy on Empty: false

---RECOVERY---
Period: dawn
Type: formula
Formula: 1d3
===END RECOVERY===

---DESCRIPTION---
Description:
<p><i>This dagger appears to be a shard of jagged obsidian. The core glows with a dull, rhythmic heat, like a heartbeat of magma.</i></p>

<h3>Burning Edge</h3>
<p>You have a +1 bonus to attack and damage rolls made with this magic weapon. On a hit, the dagger deals an extra [[/damage 1d6 type=fire]] damage (included in the item formula).</p>

<h3>Magma Burst</h3>
<p>The dagger has 3 charges. While holding it, you can use an action to expend 1 charge to cast <i>Burning Hands</i> (DC 15) from the blade.</p>

<p>You create a cone of fire shooting outward:</p>
<ul>
    <li><b>Area:</b> [[/template type=cone distance=15]]</li>
    <li><b>Save:</b> [[/save ability=dex dc=15]]</li>
    <li><b>Damage:</b> [[/damage 3d6 type=fire]] (Half on success)</li>
</ul>

<p>The dagger regains <b>1d3</b> expended charges daily at dawn.</p>
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Name: Hot Black Shard
Unidentified Description:
<p>A jagged piece of black glass wrapped in leather. It feels uncomfortably warm to the touch.</p>
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
<i>The dagger flares with volcanic heat as it strikes.</i>
===END CHAT FLAVOR===

===END WEAPON===
```