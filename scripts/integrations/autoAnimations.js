/**
 * scripts/integrations/autoAnimations.js
 * Handles the generation of flags for the AutoAnimations module
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function weaponVideo(dbSection, animation, variant = "01", color = "white") {
  return {
    dbSection,
    menuType: "weapon",
    animation,
    variant,
    color,
    enableCustom: false
  };
}

const MELEE_FALLBACK = weaponVideo("melee", "sword");
const RANGE_ARROW = weaponVideo("range", "arrow", "regular", "regular");
const RANGE_BOLT = weaponVideo("range", "bolt", "physical", "orange");
const RANGE_BULLET = weaponVideo("range", "bullet", "1", "orange");
const RANGE_FLASK = weaponVideo("range", "flask", "01", "orange");

const WEAPON_ANIMATION_CANDIDATES = {
  dagger: [weaponVideo("melee", "dagger"), weaponVideo("melee", "sword")],
  greatsword: [weaponVideo("melee", "greatsword"), weaponVideo("melee", "sword")],
  longsword: [weaponVideo("melee", "sword"), weaponVideo("melee", "greatsword")],
  shortsword: [weaponVideo("melee", "shortsword"), weaponVideo("melee", "sword")],
  scimitar: [weaponVideo("melee", "scimitar"), weaponVideo("melee", "sword")],
  sickle: [weaponVideo("melee", "scimitar"), weaponVideo("melee", "handaxe"), weaponVideo("melee", "dagger")],
  rapier: [weaponVideo("melee", "rapier"), weaponVideo("melee", "sword")],
  whip: [weaponVideo("melee", "sword"), weaponVideo("melee", "rapier")],

  handaxe: [weaponVideo("melee", "handaxe"), weaponVideo("melee", "greataxe")],
  battleaxe: [weaponVideo("melee", "greataxe"), weaponVideo("melee", "handaxe")],
  greataxe: [weaponVideo("melee", "greataxe"), weaponVideo("melee", "handaxe")],

  club: [weaponVideo("melee", "club"), weaponVideo("melee", "greatclub")],
  greatclub: [weaponVideo("melee", "greatclub"), weaponVideo("melee", "club")],
  mace: [weaponVideo("melee", "mace"), weaponVideo("melee", "club")],
  maul: [weaponVideo("melee", "maul"), weaponVideo("melee", "greatclub")],
  flail: [weaponVideo("melee", "mace"), weaponVideo("melee", "club")],
  morningstar: [weaponVideo("melee", "mace"), weaponVideo("melee", "hammer")],
  lighthammer: [weaponVideo("melee", "hammer"), weaponVideo("melee", "warhammer")],
  warhammer: [weaponVideo("melee", "warhammer"), weaponVideo("melee", "hammer"), weaponVideo("melee", "maul")],
  warpick: [weaponVideo("melee", "hammer"), weaponVideo("melee", "mace")],
  quarterstaff: [weaponVideo("melee", "quarterstaff"), weaponVideo("melee", "spear")],

  glaive: [weaponVideo("melee", "glaive"), weaponVideo("melee", "spear")],
  halberd: [weaponVideo("melee", "halberd"), weaponVideo("melee", "glaive"), weaponVideo("melee", "spear")],
  pike: [weaponVideo("melee", "spear"), weaponVideo("melee", "glaive")],
  spear: [weaponVideo("melee", "spear")],
  javelin: [weaponVideo("melee", "spear")],
  lance: [weaponVideo("melee", "spear"), weaponVideo("melee", "glaive")],
  trident: [weaponVideo("melee", "spear"), weaponVideo("melee", "glaive")],

  shortbow: [RANGE_ARROW],
  longbow: [RANGE_ARROW],
  handcrossbow: [RANGE_BOLT],
  lightcrossbow: [RANGE_BOLT],
  heavycrossbow: [RANGE_BOLT],
  dart: [weaponVideo("range", "dart"), weaponVideo("range", "dagger"), RANGE_ARROW],
  blowgun: [weaponVideo("range", "dart"), weaponVideo("range", "dagger"), RANGE_ARROW],
  sling: [weaponVideo("range", "sling"), RANGE_BULLET, RANGE_ARROW],
  net: [RANGE_FLASK, weaponVideo("range", "dagger"), RANGE_ARROW],
};

const THROWN_ANIMATION_CANDIDATES = {
  dagger: [weaponVideo("range", "dagger"), RANGE_ARROW],
  handaxe: [weaponVideo("range", "handaxe"), RANGE_ARROW],
  lighthammer: [weaponVideo("range", "hammer"), RANGE_ARROW],
  spear: [weaponVideo("range", "spear"), RANGE_ARROW],
  javelin: [weaponVideo("range", "javelin"), weaponVideo("range", "spear"), RANGE_ARROW],
  trident: [weaponVideo("range", "spear"), RANGE_ARROW],
  dart: [weaponVideo("range", "dart"), weaponVideo("range", "dagger"), RANGE_ARROW],
};

export class AutoAnimationsHandler {
  /**
   * Generate a UUID v4 ID for Auto Animations flags.
   *
   * Browser-hosted Foundry worlds may expose crypto.getRandomValues without
   * crypto.randomUUID, especially when served from a non-secure origin.
   *
   * @param {Crypto|object|null} cryptoApi - Optional crypto-like source for tests
   * @returns {string} UUID v4 string
   */
  static generateUuidV4(cryptoApi = globalThis.crypto ?? globalThis.msCrypto ?? null) {
    if (typeof cryptoApi?.randomUUID === "function") {
      const uuid = cryptoApi.randomUUID();
      if (UUID_V4_REGEX.test(uuid)) return uuid;
    }

    const bytes = new Uint8Array(16);
    if (typeof cryptoApi?.getRandomValues === "function") {
      cryptoApi.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join("")
    ].join("-");
  }

  static normalizeBaseWeapon(baseWeapon) {
    return String(baseWeapon ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  static isRangedWeapon(itemData) {
    return itemData.weaponType === "simpleR" || itemData.weaponType === "martialR";
  }

  static hasProperty(itemData, propertyCode) {
    if (Array.isArray(itemData.properties)) return itemData.properties.includes(propertyCode);
    if (itemData.properties instanceof Set) return itemData.properties.has(propertyCode);
    return false;
  }

  static getVideoPath(video) {
    if (!video?.dbSection || !video?.menuType || !video?.animation || !video?.variant || !video?.color) {
      return null;
    }

    const base = `autoanimations.${video.dbSection}.${video.menuType}.${video.animation}.${video.variant}`;
    return video.color === "random" ? base : `${base}.${video.color}`;
  }

  static isVideoAvailable(video) {
    const path = this.getVideoPath(video);
    const database = globalThis.Sequencer?.Database;
    const getEntry = database?.getEntry;
    if (!path || typeof getEntry !== "function") return true;

    try {
      return !!getEntry.call(database, path, { softFail: true });
    } catch {
      return false;
    }
  }

  static hasAvailabilityApi() {
    return typeof globalThis.Sequencer?.Database?.getEntry === "function";
  }

  static chooseFirstAvailable(candidates, fallback) {
    const preferred = [...(candidates ?? [])].filter(Boolean);
    const ordered = [...preferred, fallback].filter(Boolean);
    const available = ordered.find(candidate => this.isVideoAvailable(candidate));
    if (available) return available;
    return this.hasAvailabilityApi() ? null : preferred[0] ?? fallback ?? ordered[0];
  }

  static getFallbackVideo(itemData) {
    if (this.isRangedWeapon(itemData)) {
      const name = itemData.name?.toLowerCase?.() ?? "";
      if (name.includes("crossbow")) return RANGE_BOLT;
      if (this.hasProperty(itemData, "fir") || /\b(?:firearm|gun|pistol|musket|rifle|blunderbuss)\b/.test(name)) {
        return RANGE_BULLET;
      }
      return RANGE_ARROW;
    }
    return MELEE_FALLBACK;
  }

  static resolvePrimaryVideo(itemData) {
    const baseWeapon = this.normalizeBaseWeapon(itemData.baseWeapon);
    const fallback = this.getFallbackVideo(itemData);
    const candidates = WEAPON_ANIMATION_CANDIDATES[baseWeapon] ?? [];

    if (this.isRangedWeapon(itemData)) {
      const rangedCandidates = candidates.filter(candidate => candidate.dbSection === "range");
      return this.chooseFirstAvailable(rangedCandidates.length ? rangedCandidates : [fallback], fallback);
    }

    const meleeCandidates = candidates.filter(candidate => candidate.dbSection === "melee");
    return this.chooseFirstAvailable(meleeCandidates.length ? meleeCandidates : [fallback], fallback);
  }

  static resolveThrownVideo(itemData) {
    const baseWeapon = this.normalizeBaseWeapon(itemData.baseWeapon);
    const candidates = THROWN_ANIMATION_CANDIDATES[baseWeapon] ?? [];
    return candidates.find(candidate => this.isVideoAvailable(candidate)) ?? null;
  }

  /**
   * Generates the flags object for an item
   * @param {Object} itemData - The ItemData instance
   * @returns {Object|null} The flags object or null
   */
  static generateFlags(itemData, options = {}) {
    if (itemData.type !== "weapon") {
      const minimumConfidence = Number.isFinite(options.minimumConfidence)
        ? options.minimumConfidence
        : 0.75;
      const preview = getAutoAnimationPreview(itemData, options);
      const selected = preview.candidates.find((candidate) =>
        candidate.confidence >= minimumConfidence
          && (options.checkAvailability === false || this.isVideoAvailable(candidate.video))
      ) ?? null;
      return selected ? buildAutoAnimationFlagsFromCandidate(itemData, selected, options) : null;
    }

    const primaryVideo = this.resolvePrimaryVideo(itemData);
    if (!primaryVideo) return null;
    const isThrown = this.hasProperty(itemData, "thr");
    const thrownVideo = isThrown && primaryVideo.dbSection === "melee"
      ? this.resolveThrownVideo(itemData)
      : null;
    const canUsePrimaryRangeSwitch = thrownVideo
      && primaryVideo.menuType === thrownVideo.menuType
      && primaryVideo.animation === thrownVideo.animation
      && primaryVideo.variant === thrownVideo.variant
      && primaryVideo.color === thrownVideo.color;
    const switchType = thrownVideo
      ? (canUsePrimaryRangeSwitch ? "on" : "custom")
      : "off";
    const isReturning = this.hasProperty(itemData, "ret");
    const flagId = this.generateUuidV4();

    return {
      autoanimations: {
        version: 5,
        id: flagId,
        label: itemData.name,
        isEnabled: true,
        isCustomized: true,
        fromAmmo: false,
        menu: primaryVideo.dbSection,

        primary: {
          video: primaryVideo,
          sound: { enable: false },
          options: {
            opacity: 1,
            size: 1,
            elevation: 1000,
            isWait: false
          }
        },

        meleeSwitch: {
          video: thrownVideo ?? RANGE_ARROW,
          sound: { enable: false },
          options: {
            detect: "automatic",
            range: 5,
            isReturning,
            returning: isReturning,
            switchType
          }
        },

        secondary: { enable: false },
        source: { enable: false },
        target: { enable: false },
        macro: { enable: false },
        soundOnly: { sound: { enable: false } }
      }
    };
  }
}

/** Convert an explicit semantic candidate to persistable AutoAnimations flags. */
export function buildAutoAnimationFlagsFromCandidate(itemData, candidate, options = {}) {
  const video = candidate?.video;
  if (!itemData || !video || !AutoAnimationsHandler.getVideoPath(video)) return null;
  return {
    autoanimations: {
      version: 5,
      id: options.id ?? AutoAnimationsHandler.generateUuidV4(options.cryptoApi),
      label: itemData.name ?? candidate.label ?? "Item Animation",
      isEnabled: options.isEnabled !== false,
      isCustomized: true,
      fromAmmo: false,
      menu: video.dbSection,
      primary: {
        video: { ...video },
        sound: { enable: false },
        options: {
          opacity: 1,
          size: 1,
          elevation: 1000,
          isWait: false,
          ...(options.primaryOptions ?? {})
        }
      },
      meleeSwitch: {
        video: RANGE_ARROW,
        sound: { enable: false },
        options: {
          detect: "automatic",
          range: 5,
          isReturning: false,
          returning: false,
          switchType: "off"
        }
      },
      secondary: { enable: false },
      source: { enable: false },
      target: { enable: false },
      macro: { enable: false },
      soundOnly: { sound: { enable: false } }
    },
    "5e-item-importer": {
      autoAnimationHint: {
        id: candidate.id,
        confidence: candidate.confidence,
        reason: candidate.reason
      }
    }
  };
}

function semanticVideo(dbSection, menuType, animation, variant = "01", color = "white") {
  return { dbSection, menuType, animation, variant, color, enableCustom: false };
}

const DAMAGE_ANIMATION_HINTS = {
  acid: semanticVideo("range", "spell", "acid", "01", "green"),
  cold: semanticVideo("range", "spell", "rayoffrost", "01", "blue"),
  fire: semanticVideo("range", "spell", "firebolt", "01", "orange"),
  force: semanticVideo("range", "spell", "magicmissile", "01", "purple"),
  lightning: semanticVideo("range", "spell", "lightningbolt", "01", "blue"),
  necrotic: semanticVideo("range", "spell", "eldritchblast", "01", "purple"),
  poison: semanticVideo("range", "spell", "poison", "01", "green"),
  psychic: semanticVideo("static", "spell", "mindsliver", "01", "purple"),
  radiant: semanticVideo("range", "spell", "guidingbolt", "01", "yellow"),
  thunder: semanticVideo("static", "spell", "thunderwave", "01", "blue")
};

const SPELL_SCHOOL_HINTS = {
  abj: semanticVideo("static", "spell", "shield", "01", "blue"),
  con: semanticVideo("static", "spell", "portal", "01", "blue"),
  div: semanticVideo("static", "spell", "detectmagic", "01", "blue"),
  enc: semanticVideo("static", "spell", "charm", "01", "pink"),
  evo: semanticVideo("range", "spell", "magicmissile", "01", "purple"),
  ill: semanticVideo("static", "spell", "illusion", "01", "purple"),
  nec: semanticVideo("range", "spell", "eldritchblast", "01", "green"),
  trs: semanticVideo("static", "spell", "transmutation", "01", "blue")
};

function values(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set || value instanceof Map) return [...value.values()];
  if (typeof value.values === "function") return [...value.values()];
  return [];
}

function itemProperties(item) {
  const properties = item?.properties ?? item?.system?.properties ?? [];
  if (properties instanceof Set) return new Set(properties);
  if (Array.isArray(properties)) return new Set(properties);
  return new Set(Object.entries(properties ?? {}).filter(([, enabled]) => enabled).map(([key]) => key));
}

function extractDamageTypes(item) {
  const types = new Set();
  const candidates = [
    item?.damage?.type,
    item?.damage?.types,
    item?.system?.damage?.base?.types
  ];
  for (const candidate of candidates) {
    for (const type of candidate instanceof Set
      ? candidate
      : Array.isArray(candidate)
        ? candidate
        : candidate
          ? [candidate]
          : []) types.add(String(type).toLowerCase());
  }
  const pending = item?.pendingActivities ?? [];
  for (const entry of pending) {
    const parts = entry?.rawData?.[entry.key]?.DAMAGE?.DAMAGE_PARTS
      ?? entry?.rawData?.[entry.key]?.SAVE_DAMAGE?.DAMAGE_PARTS
      ?? [];
    for (const part of parts) {
      const type = part?.["Damage Type"];
      if (type) types.add(String(type).toLowerCase());
    }
  }
  return [...types].sort();
}

function activityKinds(item, options) {
  const kinds = new Set();
  for (const entry of options.activities ?? item?.pendingActivities ?? []) {
    const key = String(entry?.key ?? Object.keys(entry?.rawData ?? {})[0] ?? "");
    if (key.startsWith("ACTIVITY_")) kinds.add(key.slice("ACTIVITY_".length).toLowerCase());
  }
  for (const activity of values(item?.system?.activities)) {
    if (activity?.type) kinds.add(String(activity.type).toLowerCase());
  }
  return [...kinds].sort();
}

function addCandidate(output, candidate) {
  if (!candidate?.video) return;
  const path = AutoAnimationsHandler.getVideoPath(candidate.video);
  const signature = `${candidate.id}|${path}`;
  if (output.some((entry) => `${entry.id}|${entry.path}` === signature)) return;
  output.push({ ...candidate, path });
}

function nameHints(item, output) {
  const name = String(item?.name ?? "").toLowerCase();
  const rules = [
    [/\b(?:heal|healing|cure|restoration)\b/, "healing", semanticVideo("static", "spell", "curewounds", "01", "blue")],
    [/\b(?:teleport|portal|dimension|misty)\b/, "teleportation", semanticVideo("static", "spell", "portal", "01", "blue")],
    [/\b(?:shield|barrier|ward|protection)\b/, "protection", semanticVideo("static", "spell", "shield", "01", "blue")],
    [/\b(?:fire|flame|burning|ember)\b/, "fire wording", DAMAGE_ANIMATION_HINTS.fire],
    [/\b(?:cold|frost|ice|winter)\b/, "cold wording", DAMAGE_ANIMATION_HINTS.cold],
    [/\b(?:lightning|storm|thunder|shock)\b/, "lightning wording", DAMAGE_ANIMATION_HINTS.lightning],
    [/\b(?:poison|venom|toxin)\b/, "poison wording", DAMAGE_ANIMATION_HINTS.poison]
  ];
  for (const [pattern, reason, video] of rules) {
    if (pattern.test(name)) addCandidate(output, {
      id: `name-${reason.replace(/\s+/g, "-")}`,
      label: `${item.name}: ${reason}`,
      confidence: 0.82,
      reason: `Item name contains ${reason}.`,
      video
    });
  }
}

/**
 * Return ranked, activity-aware semantic candidates without mutating the Item.
 * Candidates are hints: callers may preview or explicitly apply one.
 */
export function getAutoAnimationCandidates(item, options = {}) {
  if (!item || typeof item !== "object") return [];
  const output = [];
  const type = String(item.type ?? "").toLowerCase();
  const damageTypes = extractDamageTypes(item);
  const kinds = activityKinds(item, options);

  if (type === "weapon") {
    const primary = AutoAnimationsHandler.resolvePrimaryVideo(item);
    addCandidate(output, {
      id: "weapon-primary",
      label: `${item.name ?? "Weapon"}: primary`,
      confidence: 0.98,
      reason: `Matched base weapon ${item.baseWeapon ?? item.system?.type?.baseItem ?? "fallback"}.`,
      video: primary
    });
    if (itemProperties(item).has("thr")) {
      const thrown = AutoAnimationsHandler.resolveThrownVideo(item);
      if (thrown) addCandidate(output, {
        id: "weapon-thrown",
        label: `${item.name ?? "Weapon"}: thrown`,
        confidence: 0.95,
        reason: "The weapon has the thrown property.",
        video: thrown
      });
    }
  }

  for (const damageType of damageTypes) {
    const video = DAMAGE_ANIMATION_HINTS[damageType];
    if (video) addCandidate(output, {
      id: `damage-${damageType}`,
      label: `${item.name ?? "Item"}: ${damageType}`,
      confidence: kinds.includes("damage") || kinds.includes("save") ? 0.94 : 0.86,
      reason: `Detected ${damageType} damage${kinds.length ? ` in ${kinds.join("/")} automation` : ""}.`,
      video
    });
  }

  if (kinds.includes("heal")) addCandidate(output, {
    id: "activity-heal",
    label: `${item.name ?? "Item"}: healing`,
    confidence: 0.96,
    reason: "An inline healing activity is present.",
    video: semanticVideo("static", "spell", "curewounds", "01", "blue")
  });
  if (kinds.includes("save") && damageTypes.length === 0) addCandidate(output, {
    id: "activity-save",
    label: `${item.name ?? "Item"}: saving throw`,
    confidence: 0.8,
    reason: "An inline saving-throw activity is present.",
    video: semanticVideo("static", "spell", "magiccircle", "01", "blue")
  });

  if (type === "spell") {
    const school = String(item.spellSchool ?? item.system?.school ?? "").toLowerCase();
    if (SPELL_SCHOOL_HINTS[school]) addCandidate(output, {
      id: `spell-school-${school}`,
      label: `${item.name ?? "Spell"}: school`,
      confidence: damageTypes.length ? 0.72 : 0.84,
      reason: `Fallback based on ${school || "unknown"} spell school.`,
      video: SPELL_SCHOOL_HINTS[school]
    });
  } else if (type === "consumable") {
    const subtype = String(item.consumableType ?? item.system?.type?.value ?? "").toLowerCase();
    const videos = {
      potion: semanticVideo("static", "spell", "curewounds", "01", "blue"),
      poison: DAMAGE_ANIMATION_HINTS.poison,
      ammo: RANGE_ARROW,
      scroll: semanticVideo("static", "spell", "magiccircle", "01", "blue"),
      wand: semanticVideo("range", "spell", "magicmissile", "01", "purple"),
      rod: semanticVideo("static", "spell", "magiccircle", "01", "purple")
    };
    if (videos[subtype]) addCandidate(output, {
      id: `consumable-${subtype}`,
      label: `${item.name ?? "Consumable"}: ${subtype}`,
      confidence: 0.76,
      reason: `Fallback based on consumable type ${subtype}.`,
      video: videos[subtype]
    });
  } else if (type === "tool") {
    addCandidate(output, {
      id: "tool-utility",
      label: `${item.name ?? "Tool"}: utility`,
      confidence: kinds.includes("utility") ? 0.82 : 0.65,
      reason: kinds.includes("utility") ? "An inline utility activity is present." : "Generic tool-use fallback.",
      video: semanticVideo("static", "generic", "sparkle", "01", "blue")
    });
  } else if (type === "equipment") {
    const subtype = String(item.armorType ?? item.system?.type?.value ?? "").toLowerCase();
    const video = subtype === "shield"
      ? semanticVideo("static", "spell", "shield", "01", "blue")
      : ["wand", "rod"].includes(subtype)
        ? semanticVideo("range", "spell", "magicmissile", "01", "purple")
        : semanticVideo("static", "generic", "sparkle", "01", "white");
    addCandidate(output, {
      id: `equipment-${subtype || "generic"}`,
      label: `${item.name ?? "Equipment"}: activation`,
      confidence: ["shield", "wand", "rod"].includes(subtype)
        ? 0.8
        : kinds.length ? 0.78 : 0.62,
      reason: kinds.length ? `Equipment has ${kinds.join("/")} automation.` : `Fallback based on equipment type ${subtype || "generic"}.`,
      video
    });
  }

  nameHints(item, output);
  return output.sort((a, b) =>
    b.confidence - a.confidence || a.id.localeCompare(b.id) || String(a.path).localeCompare(String(b.path))
  );
}

/** Select the first installed candidate and return the full preview model. */
export function getAutoAnimationPreview(item, options = {}) {
  const candidates = getAutoAnimationCandidates(item, options);
  const checkAvailability = options.checkAvailability !== false;
  const selected = candidates.find((candidate) =>
    !checkAvailability || AutoAnimationsHandler.isVideoAvailable(candidate.video)
  ) ?? (!checkAvailability || !AutoAnimationsHandler.hasAvailabilityApi() ? candidates[0] ?? null : null);
  return {
    supported: candidates.length > 0,
    selected,
    candidates,
    activityAware: activityKinds(item, options).length > 0
  };
}
