/**
 * 5e Item Importer - Example Templates
 * Template data for the quick-start dropdown (YAML format)
 */

export const ITEM_TEMPLATES = [
    {
        id: "weapon",
        label: "Magic Weapon",
        text: `SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Longsword +1"
    Rarity: uncommon
    Weapon Type: martialM
    Base Weapon: longsword

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 500
    Price Denomination: gp
    Weight Value: 3
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Versatile: true

  ATTUNEMENT:
    Attunement: required
    Magic Bonus: 1

  RANGE:
    Reach: 5

  DAMAGE:
    Damage Formula: "1d8"
    Damage Type: slashing

  VERSATILE_DAMAGE:
    Versatile Formula: "1d10"
    Versatile Damage Type: slashing

  MASTERY:
    Mastery: sap

  DESCRIPTION:
    Description: |
      You have a +1 bonus to attack and damage rolls made with this magic weapon.`
    },
    {
        id: "armor",
        label: "Wondrous Item",
        text: `SCHEMA_VERSION: 1
EQUIPMENT:
  ITEM:
    Name: "Cloak of Protection"
    Rarity: uncommon
    Equipment Type: wondrous
    Base Equipment: n/a

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 400
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb

  PROPERTIES:
    Magical: true

  ATTUNEMENT:
    Attunement: required

  DESCRIPTION:
    Description: |
      While wearing this cloak, [[lookup @name]]{the creature} gains a +1 bonus to AC and saving throws.`
    },
    {
        id: "potion",
        label: "Potion",
        text: `SCHEMA_VERSION: 1
CONSUMABLE:
  ITEM:
    Name: "Potion of Healing"
    Rarity: common
    Consumable Type: potion

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 50
    Price Denomination: gp
    Weight Value: 0.5
    Weight Units: lb

  PROPERTIES:
    Magical: true

  USAGE:
    Uses Spent: 0
    Uses Max: 1
    Destroy on Empty: true

  DESCRIPTION:
    Description: |
      [[lookup @name]]{The creature} regains [[/heal 2d4 + 2 average]] hit points when they drink this potion. The potion's red liquid glimmers when agitated.`
    },
    {
        id: "tool",
        label: "Tool",
        text: `SCHEMA_VERSION: 1
TOOL:
  ITEM:
    Name: "Alchemist's Supplies"
    Rarity: common
    Tool Type: art
    Base Tool: alchemist

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 50
    Price Denomination: gp
    Weight Value: 8
    Weight Units: lb

  PROPERTIES:
    Magical: false

  ABILITY_CHECK:
    Proficient: Automatic
    Ability: int

  DESCRIPTION:
    Description: |
      This set of alchemist's supplies includes glass beakers, a metal frame, a stirring rod, a mortar and pestle, and common alchemical ingredients.`
    },
    {
        id: "container",
        label: "Container",
        text: `SCHEMA_VERSION: 1
CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    Rarity: uncommon

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 400
    Price Denomination: gp
    Weight Value: 5
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Weightless Contents: true

  ATTUNEMENT:
    Attunement: none

  CAPACITY:
    Weight Capacity Value: 500
    Weight Capacity Units: lb
    Volume Capacity Value: 64
    Volume Capacity Units: cubicFoot

  DESCRIPTION:
    Description: |
      This bag has an interior space considerably larger than its outside dimensions. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.`
    },
    {
        id: "loot",
        label: "Loot/Gear",
        text: `SCHEMA_VERSION: 1
LOOT:
  ITEM:
    Name: "Ruby"
    Rarity: common
    Loot Type: gem

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 100
    Price Denomination: gp
    Weight Value: 0
    Weight Units: lb

  PROPERTIES:
    Magical: false

  DESCRIPTION:
    Description: |
      A clear red gemstone about one inch across, suitable as treasure or a spell component.`
    },
    {
        id: "spell",
        label: "Spell",
        text: `SCHEMA_VERSION: 1
SPELL:
  ITEM:
    Name: "Magic Missile"
    Level: 1
    School: evo
    Ability: n/a
  COMPONENTS:
    Vocal: true
    Somatic: true
    Material: false
  PREPARATION:
    Method: spell
    Prepared: true
  ACTIVATION:
    Type: action
    Value: 1
    Condition: n/a
  RANGE:
    Units: ft
    Value: 120
  DURATION:
    Units: inst
    Value: n/a
    Concentration: false
  TARGETS:
    Type: creature
    Count: 1
    Choice: true
    Special: n/a
  USAGE:
    Uses Spent: 0
    Uses Max: n/a
  RECOVERY: []
  DESCRIPTION:
    Description: |
      Three glowing darts of magical force strike creatures you can see within range.
  CHAT_FLAVOR:
    Chat Description: |
      n/a`
    },
    {
        id: "batch",
        label: "Multi-Item Batch",
        text: `SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Shortsword +1"
    Rarity: uncommon
    Weapon Type: martialM
    Base Weapon: shortsword
  PROPERTIES:
    Magical: true
    Finesse: true
    Light: true
  ATTUNEMENT:
    Attunement: none
    Magic Bonus: 1
  MASTERY:
    Mastery: vex
  RANGE:
    Reach: 5
  DAMAGE:
    Damage Formula: "1d6"
    Damage Type: piercing
  COST_AND_WEIGHT:
    Price Value: 500
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb
  DESCRIPTION:
    Description: |
      You have a +1 bonus to attack and damage rolls made with this magic weapon.

CONSUMABLE:
  ITEM:
    Name: "Potion of Greater Healing"
    Rarity: uncommon
    Consumable Type: potion
  COST_AND_WEIGHT:
    Price Value: 150
    Price Denomination: gp
    Weight Value: 0.5
    Weight Units: lb
  PROPERTIES:
    Magical: true
  USAGE:
    Uses Spent: 0
    Uses Max: 1
    Destroy on Empty: true
  DESCRIPTION:
    Description: |
      [[lookup @name]]{The creature} regains 4d4 + 4 hit points when they drink this potion.

LOOT:
  ITEM:
    Name: "50 Gold Pieces"
    Rarity: common
    Loot Type: treasure
  COST_AND_WEIGHT:
    Price Value: 50
    Price Denomination: gp
    Weight Value: 1
    Weight Units: lb
  PROPERTIES:
    Magical: false
  DESCRIPTION:
    Description: |
      A pouch containing 50 gold coins.`
    },
    {
        id: "mixed-damage-weapon",
        label: "Mixed Damage Weapon",
        text: `SCHEMA_VERSION: 1
WEAPON:
  ITEM:
    Name: "Flame Tongue Longsword"
    Rarity: rare
    Weapon Type: martialM
    Base Weapon: longsword

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 5000
    Price Denomination: gp
    Weight Value: 3
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Versatile: true

  ATTUNEMENT:
    Attunement: required

  RANGE:
    Reach: 5

  DAMAGE:
    Damage Formula: "1d8[slashing] + 2d6[fire]"
    Damage Type: slashing

  VERSATILE_DAMAGE:
    Versatile Formula: "1d10[slashing] + 2d6[fire]"
    Versatile Damage Type: slashing

  MASTERY:
    Mastery: sap

  DESCRIPTION:
    Description: |
      [[lookup @name]]{The creature} can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. These flames shed bright light in a 40-foot radius and dim light for an additional 40 feet. While the sword is ablaze, it deals an extra [[/damage 2d6 fire average]] to any target it hits. The flames last until [[lookup @name]]{the creature} uses a bonus action to speak the command word again or until they drop or sheathe the sword.`
    }
];
