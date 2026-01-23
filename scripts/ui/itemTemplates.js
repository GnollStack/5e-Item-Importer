/**
 * 5e Item Importer - Example Templates
 * Template data for the quick-start dropdown
 */

export const ITEM_TEMPLATES = [
    {
        id: "weapon",
        label: "Magic Weapon",
        text: `===WEAPON===
Longsword +1
Weapon (longsword), uncommon (requires attunement)
Cost: 500 gp, Weight: 3 lb.

You have a +1 bonus to attack and damage rolls made with this magic weapon.`
    },
    {
        id: "armor",
        label: "Magic Armor",
        text: `===EQUIPMENT===
Cloak of Protection
Wondrous item (cloak), uncommon (requires attunement)
Cost: 3,500 gp, Weight: 1 lb.

You gain a +1 bonus to AC and saving throws while you wear this cloak.`
    },
    {
        id: "potion",
        label: "Potion",
        text: `===CONSUMABLE===
Potion of Healing
Potion, common
Cost: 50 gp, Weight: 0.5 lb.

You regain 2d4 + 2 hit points when you drink this potion. The potion's red liquid glimmers when agitated.`
    },
    {
        id: "scroll",
        label: "Spell Scroll",
        text: `===CONSUMABLE===
Spell Scroll (Fireball)
Scroll, uncommon
Cost: 200 gp, Weight: 0 lb.

A spell scroll bears the words of a single spell, written in a mystical cipher. This scroll contains the fireball spell (3rd level, DC 15).
[scroll]`
    },
    {
        id: "tool",
        label: "Tool",
        text: `===TOOL===
Thieves' Tools
Tool (thieves' tools), common
Cost: 25 gp, Weight: 1 lb.

This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers.`
    },
    {
        id: "container",
        label: "Container",
        text: `===CONTAINER===
Bag of Holding
Wondrous item (bag), uncommon
Cost: 4,000 gp, Weight: 15 lb.
Capacity: 500 lb., 64 cubic feet

This bag has an interior space considerably larger than its outside dimensions. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet.
[weightless]`
    },
    {
        id: "spell",
        label: "Spell",
        text: `===SPELL===
Fireball
3rd-level evocation

Casting Time: 1 action
Range: 150 feet
Components: V, S, M (a tiny ball of bat guano and sulfur)
Duration: Instantaneous

A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.`
    },
    {
        id: "loot",
        label: "Loot/Gear",
        text: `===LOOT===
Ruby of the War Mage
Wondrous item (gemstone), common (requires attunement by a spellcaster)
Cost: 100 gp, Weight: 0 lb.

Etched with eldritch runes, this 1-inch-diameter ruby allows you to use a simple or martial weapon as a spellcasting focus for your spells.`
    }
];