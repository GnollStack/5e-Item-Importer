/**
 * 5e Item Importer - Regex Patterns
 * Comprehensive regex library for parsing D&D 5e item text
 */

export class ItemRegex {

    // ==========================================
    // Item Type Detection
    // ==========================================

    static weaponType = /\b(weapon|sword|axe|mace|hammer|dagger|bow|crossbow|spear|staff|club|flail|whip|lance|pike|scimitar|rapier|shortsword|longsword|greatsword|battleaxe|greataxe|warhammer|maul|morningstar|quarterstaff|sling|dart|blowgun|handaxe|javelin|trident|war pick|warpick|glaive|halberd|longbow|shortbow|light crossbow|heavy crossbow|hand crossbow)\b/i;

    static armorType = /\b(armor|armour|plate|chain|leather|hide|breastplate|half plate|ring mail|scale mail|splint|studded leather|padded|shield)\b/i;

    static consumableType = /\b(potion|elixir|scroll|wand|rod|ammunition|ammo|arrows?|bolts?|bullets?|food|drink|poison|trinket)\b/i;

    // Ammunition specific detection
    static ammunitionSubtype = /\b(arrows?|bolts?|firearm bullets?|sling bullets?|energy cells?|blowgun needles?)\b/i;
    static ammunitionPropertyAdamantine = /\badamantine\b/i;
    static ammunitionPropertySilvered = /\bsilvered\b/i;
    static ammunitionPropertyReturning = /\breturning\b/i;
    static replaceDamage = /replace(?:s|ing)?\s+(?:the|base)?\s*weapon'?s?\s*damage/i;

    // Specific consumable type detection
    static potionType = /\b(potion|elixir|philter|draft|tonic)\b/i;
    static scrollType = /\b(scroll|parchment|tome)\b/i;
    static wandType = /\bwand\b/i;
    static rodType = /\brod\b/i;
    static ammunitionType = /\b(ammunition|ammo|arrows?|bolts?|bullets?|sling bullets?|blowgun needles?)\b/i;
    static foodType = /\b(food|rations?|meal|bread|cheese|fruit|meat|drink|water|ale|wine)\b/i;
    static poisonType = /\b(poison|venom|toxin)\b/i;
    static trinketType = /\b(trinket|bauble|curiosity|oddity)\b/i;

    static toolType = /\b(tool|kit|instrument|gaming set|artisan|thieves|disguise|forgery|herbalism|navigator|poisoner|musical)\b/i;

    // Tool category detection
    static artisanTools = /\b(artisan'?s?\s+tools?|alchemist|brewer|calligrapher|carpenter|cartographer|cobbler|cook|glassblower|jeweler|leatherworker|mason|painter|potter|smith|tinker|weaver|woodcarver)\b/i;
    static gamingSet = /\b(gaming\s+set|dice\s+set|card\s+set|chess\s+set|playing\s+card)\b/i;
    static musicalInstrument = /\b(musical\s+instrument|bagpipes?|drums?|dulcimer|flute|horn|lute|lyre|pan\s+flute|shawm|viol)\b/i;

    // Specific tool detection
    static thievesTools = /\bthieves'?\s+tools?\b/i;
    static disguiseKit = /\bdisguise\s+kit\b/i;
    static forgeryKit = /\bforgery\s+kit\b/i;
    static herbalismKit = /\bherbalism\s+kit\b/i;
    static navigatorTools = /\bnavigator'?s?\s+tools?\b/i;
    static poisonerKit = /\bpoisoner'?s?\s+kit\b/i;

    static containerType = /\b(bag|pouch|backpack|chest|box|container|sack|case|quiver)\b/i;

    // Generic catch-all for magic items
    static wondrousItem = /\bwondrous item\b/i;

    // ==========================================
    // Item Category/Subtype
    // ==========================================

    // Weapon categories
    static weaponCategory = /\b(simple|martial|natural|improvised|siege)\b/i;
    static weaponMeleeRanged = /\b(melee|ranged)\b/i;

    // Armor categories  
    static armorCategory = /\b(light armor|medium armor|heavy armor|shield)\b/i;

    // Consumable categories
    static consumableCategory = /\b(potion|scroll|wand|rod|ammunition|food|poison)\b/i;

    // ==========================================
    // Rarity Detection
    // ==========================================

    static rarity = /\b(common|uncommon|rare|very rare|legendary|artifact)\b/i;
    static rarityDetails = /(?<rarity>common|uncommon|rare|very rare|legendary|artifact)/i;

    // ==========================================
    // Attunement
    // ==========================================

    static attunement = /requires attunement/i;
    static attunementBy = /requires attunement by (?<attunementBy>[^)]+)/i;

    // ==========================================
    // Properties
    // ==========================================

    // Weapon properties
    static versatile = /versatile\s*\((?<versatileDamage>\d+d\d+(?:\s*[+\-]\s*\d+)?)\)/i;
    static finesse = /\bfinesse\b/i;
    static light = /\blight\b/i;
    static heavy = /\bheavy\b/i;
    static twoHanded = /\btwo-handed\b|\btwo handed\b/i;
    static loading = /\bloading\b/i;
    static reach = /\breach\b/i;
    static thrown = /thrown\s*\((?<thrownRange>[\d/\s]+)\s*ft\.?\)/i;
    static ammunition = /\bammunition\b/i;
    static special = /\bspecial\b/i;

    // Armor properties
    static stealthDisadvantage = /stealth disadvantage|disadvantage on stealth|disadvantage to stealth/i;
    static strengthRequirement = /str(?:ength)?\s+(?<strengthReq>\d+)/i;

    // Auto-destroy detection
    static autoDestroy = /\b(destroy|consume|expend|discard|disappear)s?\s+(?:when|after|on)\s+(?:empty|used|expended|depleted)\b/i;
    static singleUse = /\b(single[\s-]use|one[\s-]time[\s-]use|disposable)\b/i;

    // Container capacity patterns
    static itemCount = /(?:holds?|contains?|capacity\s+of)\s+(?:up\s+to\s+)?(\d+)\s+(?:items?|objects?)/i;
    static weightCapacityLb = /(?:holds?|contains?|carry)\s+(?:up\s+to\s+)?(\d+(?:,\d+)?)\s*(?:pounds?|lbs?)\b/i;
    static weightCapacityTn = /(?:holds?|contains?|carry)\s+(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*(?:tons?|tn)\b/i;
    static volumeCapacityCubic = /(\d+)\s*cubic\s*(?:feet|foot|ft)/i;
    static volumeCapacityLiter = /(\d+(?:\.\d+)?)\s*(?:liters?|litres?|l)\b/i;
    static weightlessContents = /\b(?:weightless|weighs?\s+nothing|contents?\s+(?:weigh|have)\s+no\s+weight)\b/i;

    // ==========================================
    // Numeric Values
    // ==========================================

    // Cost/Currency - supports various formats
    static cost = /(?:cost|price|value|worth)?\s*:?\s*(?<amount>\d+(?:,\d+)*)\s*(?<currency>cp|sp|ep|gp|pp)/i;
    static costDetails = /(?<amount>\d+(?:,\d+)*)\s*(?<currency>cp|sp|ep|gp|pp)/ig;

    // Weight
    static weight = /(?:weight|wt\.?)?\s*:?\s*(?<weight>\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?|#)/i;

    // Armor Class
    static armorClass = /(?:armor class|ac)\s*:?\s*(?<ac>\d+)(?:\s*\+\s*(?<bonus>dex|dex modifier|your dex modifier))?/i;

    // Damage
    static damage = /(?<count>\d+)d(?<faces>\d+)(?:\s*(?<operator>[+\-])\s*(?<bonus>\d+))?\s+(?<damageType>bludgeoning|piercing|slashing|acid|cold|fire|force|lightning|necrotic|poison|psychic|radiant|thunder)/i;

    // Range
    static range = /range\s+(?<normal>\d+)(?:\/(?<long>\d+))?\s*(?:ft|feet|')/i;
    static reach = /reach\s+(?<reach>\d+)\s*(?:ft|feet|')/i;

    // Charges/Uses
    static charges = /(?:has|have|contains?)\s+(?<charges>\d+)\s+charges?/i;
    static regainCharges = /regains?\s+(?<regainAmount>\d+d\d+(?:\s*[+\-]\s*\d+)?|\d+)\s+(?:expended\s+)?charges?/i;

    // Quantity patterns - various formats
    static quantity = /\((\d+)\)\s*$/;  // Matches "(20)" at end of name
    static quantityX = /\s+[x×]\s*(\d+)\s*$/i;  // Matches " x20" or " ×20" at end
    static quantityMultiple = /\s+(\d+)\s+pieces?\s*$/i;  // Matches " 20 pieces" at end

    // ==========================================
    // Activation & Duration
    // ==========================================

    static activation = /(?:as an action|as a bonus action|as a reaction|action|bonus action|reaction|1 action|1 bonus action|1 reaction)/i;
    static activationDetails = /(?<type>action|bonus action|reaction)/i;

    static duration = /(?:duration|lasts?)\s*:?\s*(?<duration>instantaneous|concentration,?\s*up to\s+\d+\s+\w+|\d+\s+(?:rounds?|minutes?|hours?|days?))/i;

    // ==========================================
    // Attack Bonus & Save DC
    // ==========================================

    static attackBonus = /(?:\+|\-)\s*(?<bonus>\d+)\s+(?:bonus\s+)?to\s+(?:attack|hit)/i;
    static saveDC = /(?:DC|dc)\s+(?<dc>\d+)/i;
    static saveAbility = /(?<ability>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i;

    // ==========================================
    // Magic Bonus
    // ==========================================

    // Detects +1, +2, +3 in item names
    static magicBonus = /[+\-]\s*(?<bonus>\d+)\b/;

    // ==========================================
    // Tool Bonus
    // ==========================================

    static toolBonus = /(?:\+|\-)\s*(\d+)\s+(?:to\s+)?(?:tool\s+)?(?:checks?|bonus)/i;

    // ==========================================
    // Description Sections
    // ==========================================

    // Detect paragraph breaks
    static paragraphBreak = /\n\s*\n/;

    // Detect lists
    static bulletPoint = /^[\s]*[•\-\*]\s+/;

    // ==========================================
    // Complete Item Block Patterns
    // ==========================================

    /**
     * Match first line (item name)
     * Example: "Longsword +1" or "Potion of Healing"
     */
    static itemName = /^(?<name>.+?)(?:\s+\+\d+)?$/;

    /**
     * Match type line (second line typically)
     * Example: "Weapon (longsword), uncommon (requires attunement)"
     */
    static typeLine = /^(?<category>[^,]+?)(?:,\s*(?<rarity>common|uncommon|rare|very rare|legendary|artifact))?(?:\s*\((?<attunement>requires attunement[^)]*)\))?/i;

    /**
     * Match metadata line with cost and weight
     * Example: "Cost: 500 gp, Weight: 3 lb."
     */
    static metadataLine = /(?:cost|price|value)?\s*:?\s*(?<cost>\d+(?:,\d+)*\s*(?:cp|sp|ep|gp|pp))?(?:.*?)(?:weight|wt\.?)?\s*:?\s*(?<weight>\d+(?:\.\d+)?\s*(?:lb|lbs|pounds?))?/i;

    /**
     * Match property line
     * Example: "Damage: 1d8 slashing, Properties: Versatile (1d10)"
     */
    static propertyLine = /(?:damage|properties|property)?\s*:?\s*(?<damage>\d+d\d+(?:\s*[+\-]\s*\d+)?\s+\w+)?(?:.*?)(?:properties|property)?\s*:?\s*(?<properties>[^.]+)/i;

    // ==========================================
    // Specific Item Types
    // ==========================================

    // Potions
    static potionHealing = /potion of (?:greater |superior )?healing/i;
    static potionEffect = /you\s+(?:gain|regain)\s+(?<effect>\d+d\d+(?:\s*[+\-]\s*\d+)?)\s+(?<type>hit points?)/i;

    // Scrolls
    static spellScroll = /spell scroll\s*\((?<spellLevel>\w+)\s+level\)/i;
    static scrollSpell = /(?:contains?|has)\s+the\s+(?<spellName>[^.]+?)\s+spell/i;

    // Ammunition
    static ammunitionCount = /(?<count>\d+)\s+(?:pieces?|arrows?|bolts?)/i;

    // Wands/Staffs
    static wandSpell = /(?:casts?|use\s+to\s+cast)\s+the\s+(?<spellName>[^.]+?)\s+spell/i;
    static wandCharges = /(?<current>\d+)\s+charges?(?:.*?)?(?:maximum|max)\s+of\s+(?<max>\d+)/i;

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Test if text contains weapon keywords
     */
    static isWeapon(text) {
        return this.weaponType.test(text);
    }

    /**
     * Test if text contains armor keywords
     */
    static isArmor(text) {
        return this.armorType.test(text);
    }

    /**
     * Test if text contains consumable keywords
     */
    static isConsumable(text) {
        return this.consumableType.test(text);
    }

    /**
     * Test if text contains tool keywords
     */
    static isTool(text) {
        return this.toolType.test(text);
    }

    /**
     * Test if text contains container keywords
     */
    static isContainer(text) {
        return this.containerType.test(text);
    }

    /**
     * Extract all currency mentions from text
     */
    static extractAllCurrency(text) {
        const matches = [];
        let match;
        while ((match = this.costDetails.exec(text)) !== null) {
            matches.push({
                amount: parseInt(match.groups.amount.replace(/,/g, "")),
                currency: match.groups.currency.toLowerCase()
            });
        }
        return matches;
    }

    /**
     * Clean and normalize text before parsing
     */
    static normalizeText(text) {
        return text
            .replace(/[—–−]/g, "-")
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            .replace(/[ \t]+/g, " ")  // Only collapse spaces/tabs, not newlines
            .trim();
    }
}