/**
 * scripts/integrations/autoAnimations.js
 * Handles the generation of flags for the AutoAnimations module
 */

// Mapping D&D 5e base items to AutoAnimation animation names
// Keys match system.type.baseItem
const WEAPON_ANIMATION_MAP = {
  // Swords
  dagger: "dagger",
  greatsword: "greatsword",
  longsword: "greatsword", // AA usually shares animations for long/great
  scimitar: "scimitar",
  shortsword: "shortsword",
  rapier: "rapier",
  
  // Axes
  handaxe: "handaxe",
  battleaxe: "battleaxe",
  greataxe: "greataxe",
  
  // Bludgeoning
  club: "club",
  greatclub: "greatclub",
  mace: "mace",
  maul: "maul",
  flail: "flail",
  warhammer: "warhammer",
  quarterstaff: "quarterstaff",
  
  // Polearms
  glaive: "glaive",
  halberd: "halberd",
  pike: "spear",
  spear: "spear",
  trident: "trident",
  
  // Ranged
  shortbow: "arrow",
  longbow: "arrow",
  handcrossbow: "bolt",
  lightcrossbow: "bolt",
  heavycrossbow: "bolt",
  dart: "dagger", // Visual approximation
  sling: "sling", // Requires rock animation usually
};

export class AutoAnimationsHandler {
  /**
   * Generates the flags object for an item
   * @param {Object} itemData - The ItemData instance
   * @returns {Object|null} The flags object or null
   */
  static generateFlags(itemData) {
    // 1. Basic Checks
    if (itemData.type !== "weapon") return null;
    
    // 2. Determine Animation Name
    // Try to match specific base item, fall back to "sword" or "arrow" based on type
    let animationName = WEAPON_ANIMATION_MAP[itemData.baseWeapon];
    let menuType = "melee";

    // Logic to determine defaults if no specific map found
    if (itemData.weaponType === "simpleR" || itemData.weaponType === "martialR") {
      menuType = "range";
      if (!animationName) {
        // Guess based on name
        animationName = itemData.name.toLowerCase().includes("crossbow") ? "bolt" : "arrow";
      }
    } else {
      // Melee default
      if (!animationName) animationName = "greatsword"; // Generic swing
    }

    // 3. Handle Thrown Weapons (Hybrid)
    // If it is melee but has the 'thrown' property, we enable the "Melee Switch"
    const isThrown = Array.isArray(itemData.properties) 
      ? itemData.properties.includes("thr")
      : (itemData.properties instanceof Set && itemData.properties.has("thr"));
      
    const switchType = isThrown ? "on" : "off";
    
    // For thrown items, the projectile is usually the weapon itself (dagger, axe) 
    // unless it's a spear/trident
    const thrownVariant = animationName || "dagger";

    // 4. Construct the Flag
    // AutoAnimations requires a strict UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
    const flagId = crypto.randomUUID();
    
    return {
      autoanimations: {
        version: 5,
        id: flagId,
        label: itemData.name,
        isEnabled: true,
        isCustomized: true,
        fromAmmo: false,
        menu: menuType,
        
        // PRIMARY ATTACK (Melee swing or Ranged shot)
        primary: {
          video: {
            dbSection: menuType,
            menuType: "weapon",
            animation: animationName,
            variant: "01",
            color: "white",
            enableCustom: false
          },
          sound: { enable: false },
          options: {
            opacity: 1,
            size: 1,
            elevation: 1000,
            isWait: false
          }
        },

        // MELEE SWITCH (For thrown weapons used in melee or vice versa)
        meleeSwitch: {
          video: {
            dbSection: "range", // Thrown is considered ranged in AA
            menuType: "weapon",
            animation: thrownVariant, 
            variant: "01",
            color: "white"
          },
          sound: { enable: false },
          options: {
            detect: "automatic",
            range: 5, // Switch animation if target is > 5ft away
            returning: isThrown, // Return weapon to hand?
            switchType: switchType
          }
        },

        // DEFAULTS (Required structure to prevent errors)
        secondary: { enable: false },
        source: { enable: false },
        target: { enable: false },
        macro: { enable: false },
        soundOnly: { sound: { enable: false } }
      }
    };
  }
}