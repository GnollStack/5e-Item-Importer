# UNIVERSAL STRICT TEMPLATE

This template defines the **common fields** that appear in ALL item types.
Each specific item type (Weapon, Tool, Consumable, etc.) inherits these fields and adds type-specific fields.

---

## UNIVERSAL ITEM FIELDS

Every item has these sections in this exact order:

```===ITEM_TYPE===
Name: [text]
Rarity: [common|uncommon|rare|veryRare|legendary|artifact|blank]

---INVENTORY---
Quantity: [number]
Identified: [true|false]
Equipped: [true|false]

---COST AND WEIGHT---
Price Value: [number]
Price Denomination: [pp|gp|ep|sp|cp]
Weight Value: [number]
Weight Units: [lb|tn|kg|t]

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

===END ITEM_TYPE===
```

---

## FIELD SPECIFICATIONS

### **Universal Required Fields**
- `Name` - Must not be empty (1-100 characters)

### **Universal Optional Fields** (all have defaults)
- `Rarity` - Defaults to "common" if blank
- `Quantity` - Defaults to 1
- `Identified` - Defaults to true
- `Equipped` - Defaults to false
- `Price Value` - Defaults to 0
- `Price Denomination` - Defaults to "gp"
- `Weight Value` - Defaults to 0
- `Weight Units` - Defaults to "lb"
- `Description` - Defaults to empty string
- `Unidentified Description` - Defaults to empty string
- `Chat Description` - Defaults to empty string

---

## VALID VALUES

### **Rarity**
| Value | Description |
|-------|-------------|
| `common` | Common |
| `uncommon` | Uncommon |
| `rare` | Rare |
| `veryRare` | Very Rare |
| `legendary` | Legendary |
| `artifact` | Artifact |
| `blank` | No rarity (default) |

### **Price Denomination**
| Value | Full Name | Copper Value |
|-------|-----------|--------------|
| `pp` | Platinum Piece | 1000 |
| `gp` | Gold Piece | 100 |
| `ep` | Electrum Piece | 50 |
| `sp` | Silver Piece | 10 |
| `cp` | Copper Piece | 1 |

### **Weight Units**
| Value | Description |
|-------|-------------|
| `lb` | Pounds (D&D standard) |
| `tn` | Tons |
| `kg` | Kilograms |
| `t` | Metric tons |

### **Boolean Fields**
| Value | Meaning |
|-------|---------|
| `true` | Yes / Enabled |
| `false` | No / Disabled |

---

## PARSING ORDER

The Universal Parser should extract fields in this order:

1. **Item Type Detection** - Read `===ITEM_TYPE===` marker
2. **Name** - Extract and validate (required)
3. **Rarity** - Extract or default to common
4. **Inventory Section** - Extract quantity, identified, equipped
5. **Cost and Weight Section** - Extract price and weight with units
6. **Descriptions** - Extract all three description fields

After universal fields are extracted, hand off to type-specific parser.

---

## EXAMPLE: MINIMAL UNIVERSAL TEMPLATE

```
===LOOT===
Name: Iron Ore
Rarity: blank

---INVENTORY---
Quantity: 10
Identified: true
Equipped: false

---COST AND WEIGHT---
Price Value: 1
Price Denomination: sp
Weight Value: 1
Weight Units: lb

---DESCRIPTION---
Description:
Unrefined iron ore.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
blank
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
blank
===END CHAT FLAVOR===

===END LOOT===
```

---

## EXAMPLE: FULL UNIVERSAL TEMPLATE

```
===WEAPON===
Name: Longsword +1
Rarity: uncommon

---INVENTORY---
Quantity: 1
Identified: true
Equipped: true

---COST AND WEIGHT---
Price Value: 500
Price Denomination: gp
Weight Value: 3
Weight Units: lb

---DESCRIPTION---
Description:
You have a +1 bonus to attack and damage rolls made with this magic weapon.

This elegant longsword has a blade of polished steel with runes etched along its length. The crossguard is wrapped in fine leather, and the pommel is set with a small sapphire.
===END DESCRIPTION===

---UNIDENTIFIED DESCRIPTION---
Unidentified Description:
This longsword appears to be of exceptional craftsmanship. The blade gleams with an unusual luster, and the runes along its length pulse faintly with magical energy.
===END UNIDENTIFIED DESCRIPTION===

---CHAT FLAVOR---
Chat Description:
A magical longsword that grants a +1 bonus to attack and damage rolls.
===END CHAT FLAVOR===

[... weapon-specific sections follow ...]

===END WEAPON===
```

---
