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
    Name: "Alchemist's Supplies"
    Rarity: common
    Tool Type: art
    Base Tool: alchemist

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
    Proficient: Automatic
    Ability: int

  DESCRIPTION:
    Description: |
      This set of alchemist's supplies includes glass beakers, a metal frame, a stirring rod, a mortar and pestle, and common alchemical ingredients.`
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
    Volume Capacity Value: 64
    Volume Capacity Units: cubicFoot

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
    },
    {
        id: "weapon-with-activities",
        label: "Weapon with Activities",
        text: `WEAPON:
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
    Damage Formula: "1d8"
    Damage Type: slashing

  VERSATILE_DAMAGE:
    Versatile Formula: "1d10"
    Versatile Damage Type: slashing

  DESCRIPTION:
    Description: |
      You can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. These flames shed bright light in a 40-foot radius and dim light for an additional 40 feet. While the sword is ablaze, it deals an extra 2d6 fire damage to any target it hits. The flames last until you use a bonus action to speak the command word again or until you drop or sheathe the sword.

  Activities:
    - ACTIVITY_ATTACK:
        ACTIVITY:
          Name: "Flame Tongue Strike"
          Icon: "n/a"

        CHAT_FLAVOR:
          Chat Description: |
            A fiery slash with the Flame Tongue.

        ATTACK:
          Attack Type: "melee"
          Attack Class: "weapon"

        ACTIVATION:
          Activation Type: "action"
          Activation Cost: 1
          Condition: "n/a"
          Override Activation: false

        DURATION:
          Duration Time: "inst"
          Concentration: false

        RANGE:
          Range: true
          Range Units: "ft"
          Range Value: 5
          Special Range: "n/a"

        TARGETS:
          Target Type: "creature"
          Target Amount: 1
          Special Targeting: "n/a"
          Choose Targets: false
          Template Type: "n/a"

        ATTACK_DETAILS:
          Attack Ability: "str"
          To Hit Bonus: "n/a"
          Flat To Hit: false
          Critical Threshold: "n/a"

        ATTACK_DAMAGE:
          Include Base Damage: true
          Extra Critical Damage: "n/a"
          DAMAGE_PARTS:
            - Custom Damage Formula: true
              Damage Formula: "2d6"
              Damage Type: "fire"
              Damage Scaling: "No Scaling"

    - EFFECT:
        DETAILS:
          Name: "Flame Tongue Active"
          Icon Tint Color: "n/a"
          Effect Suspended: false
          Apply Effect to Actor: true
          Status Conditions: "n/a"
          Separate Status Conditions: "n/a"

        EFFECT_DESCRIPTION:
          Effect Description: |
            The Flame Tongue sword is ablaze, shedding bright light in a 40-foot radius.

        DURATION:
          Effect Duration (Seconds): "n/a"
          Effect Start Time: "n/a"
          Effect Duration (combat) Rounds: "n/a"
          Effect Duration (combat) Turns: "n/a"
          Effect Start (combat) Rounds: "n/a"
          Effect Start (combat) Turns: "n/a"`
    }
];
