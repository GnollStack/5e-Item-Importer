/**
 * 5e Item Importer - Example Templates
 * Template data for the quick-start dropdown (YAML format)
 */

export const ITEM_TEMPLATES = [
    {
        id: "weapon",
        label: "Magic Weapon",
        text: `WEAPON:
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

  DESCRIPTION:
    Description: |
      You have a +1 bonus to attack and damage rolls made with this magic weapon.`
    },
    {
        id: "armor",
        label: "Magic Armor",
        text: `EQUIPMENT:
  ITEM:
    Name: "Cloak of Protection"
    Rarity: uncommon
    Equipment Type: trinket
    Base Equipment: n/a

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 3500
    Price Denomination: gp
    Weight Value: 1
    Weight Units: lb

  PROPERTIES:
    Magical: true

  ATTUNEMENT:
    Attunement: required

  DESCRIPTION:
    Description: |
      You gain a +1 bonus to AC and saving throws while you wear this cloak.`
    },
    {
        id: "potion",
        label: "Potion",
        text: `CONSUMABLE:
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

  DESCRIPTION:
    Description: |
      You regain 2d4 + 2 hit points when you drink this potion. The potion's red liquid glimmers when agitated.`
    },
    {
        id: "tool",
        label: "Tool",
        text: `TOOL:
  ITEM:
    Name: "Thieves' Tools"
    Rarity: common
    Tool Type: art
    Base Tool: thief

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 25
    Price Denomination: gp
    Weight Value: 1
    Weight Units: lb

  PROPERTIES:
    Magical: false

  ABILITY_CHECK:
    Proficiency: proficient
    Ability: dex

  DESCRIPTION:
    Description: |
      This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers.`
    },
    {
        id: "container",
        label: "Container",
        text: `CONTAINER:
  ITEM:
    Name: "Bag of Holding"
    Rarity: uncommon

  INVENTORY:
    Quantity: 1
    Identified: true

  COST_AND_WEIGHT:
    Price Value: 4000
    Price Denomination: gp
    Weight Value: 15
    Weight Units: lb

  PROPERTIES:
    Magical: true
    Weightless Contents: true

  ATTUNEMENT:
    Attunement: none

  CAPACITY:
    Weight Capacity Value: 500
    Weight Capacity Units: lb

  DESCRIPTION:
    Description: |
      This bag has an interior space considerably larger than its outside dimensions. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.`
    },
    {
        id: "loot",
        label: "Loot/Gear",
        text: `LOOT:
  ITEM:
    Name: "Ruby of the War Mage"
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
    Magical: true

  DESCRIPTION:
    Description: |
      Etched with eldritch runes, this 1-inch-diameter ruby allows you to use a simple or martial weapon as a spellcasting focus for your spells.`
    },
    {
        id: "batch",
        label: "Multi-Item Batch",
        text: `WEAPON:
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
  DESCRIPTION:
    Description: |
      You regain 4d4 + 4 hit points when you drink this potion.

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
    }
];
