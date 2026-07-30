import jsyaml from "./vendor/js-yaml.mjs";
import {
  ITEM_YAML_SCHEMA_KEY,
  ITEM_YAML_SCHEMA_VERSION
} from "./strictItemParsers/itemSchemaVersion.js";
import { normalizeCustomProperties } from "./itemCustomProperties.js";

const TYPE_TO_ROOT = {
  weapon: "WEAPON",
  equipment: "EQUIPMENT",
  consumable: "CONSUMABLE",
  tool: "TOOL",
  loot: "LOOT",
  container: "CONTAINER",
  spell: "SPELL"
};
const WEAPON_PROPERTIES = {
  Adamantine: "ada", Ammunition: "amm", Finesse: "fin", Firearm: "fir",
  Focus: "foc", Heavy: "hvy", Light: "lgt", Loading: "lod", Magical: "mgc",
  Reach: "rch", Reload: "rel", Returning: "ret", Silvered: "sil", Special: "spc",
  Thrown: "thr", "Two-Handed": "two", Versatile: "ver"
};
const COVER_LABELS = new Map([[0, "none"], [0.5, "half"], [0.75, "threequarters"], [1, "total"]]);
const MODULE_ID = "5e-item-importer";

/** Flags used to preserve importer YAML on an embedded Activity document. */
export function createStrictYamlAttachmentFlags(rawData) {
  const cloned = plainClone(rawData);
  if (!cloned || typeof cloned !== "object" || Object.keys(cloned).length !== 1) {
    throw new TypeError("rawData must contain exactly one ACTIVITY_* or EFFECT block");
  }
  const key = Object.keys(cloned)[0];
  if (!key.startsWith("ACTIVITY_") && key !== "EFFECT") {
    throw new TypeError(`Unsupported attachment key "${key}"`);
  }
  return { [MODULE_ID]: { strictYaml: cloned } };
}

function isObject(value) {
  return !!value && typeof value === "object";
}

function plainClone(value) {
  if (Array.isArray(value)) return value.map(plainClone);
  if (value instanceof Set) return [...value].map(plainClone);
  if (value instanceof Map) return Object.fromEntries([...value].map(([key, entry]) => [key, plainClone(entry)]));
  if (!isObject(value)) return value;
  if (typeof value.toObject === "function") return plainClone(value.toObject());
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    output[key] = plainClone(entry);
  }
  return output;
}

function getPath(source, path) {
  let current = source;
  for (const part of path.split(".")) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function read(item, directKey, ...paths) {
  return firstDefined(
    item?.[directKey],
    ...paths.map((path) => getPath(item, path))
  );
}

function na(value) {
  return value === undefined || value === null || value === "" ? "n/a" : value;
}

function bool(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function finite(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function asCollection(value) {
  if (!value) return [];
  if (value instanceof Set || value instanceof Map) return [...value.values()];
  if (Array.isArray(value)) return value;
  if (typeof value.values === "function") return [...value.values()];
  return [];
}

function propertySet(item) {
  const direct = read(item, "properties", "system.properties");
  if (direct instanceof Set) return new Set(direct);
  if (Array.isArray(direct)) return new Set(direct);
  if (isObject(direct)) {
    return new Set(Object.entries(direct).filter(([, enabled]) => enabled).map(([key]) => key));
  }
  return new Set();
}

function damageFormula(damage) {
  if (!damage) return "0";
  if (damage.formula) return String(damage.formula);
  if (damage.custom?.enabled && damage.custom?.formula) return String(damage.custom.formula);
  if (damage.number != null && damage.denomination != null) {
    const bonus = String(damage.bonus ?? "").trim();
    return `${damage.number}d${damage.denomination}${bonus && bonus !== "0" ? ` + ${bonus}` : ""}`;
  }
  if (damage.count != null && damage.faces != null) {
    const bonus = finite(damage.bonus, 0);
    return `${damage.count}d${damage.faces}${bonus ? ` + ${bonus}` : ""}`;
  }
  return "0";
}

function damageType(damage) {
  const type = damage?.type ?? damage?.types;
  if (type instanceof Set) return [...type].join(", ") || "n/a";
  if (Array.isArray(type)) return type.join(", ") || "n/a";
  return na(type);
}

function commonSections(item, itemSection, type) {
  const data = { ITEM: itemSection };
  if (type !== "spell") {
    data.INVENTORY = {
      Quantity: type === "container" ? 1 : integer(read(item, "quantity", "system.quantity"), 1),
      Identified: bool(firstDefined(read(item, "identified", "system.identified"), true)),
      Equipped: bool(firstDefined(read(item, "equipped", "system.equipped"), false))
    };
    data.COST_AND_WEIGHT = {
      "Price Value": finite(read(item, "costDisplay", "system.price.value"), 0),
      "Price Denomination": read(item, "costDenomination", "system.price.denomination") ?? "gp",
      "Weight Value": finite(read(item, "weight", "system.weight.value"), 0),
      "Weight Units": read(item, "weightUnits", "system.weight.units") ?? "lb"
    };
  }
  data.DESCRIPTION = {
    Description: String(read(item, "description", "system.description.value") ?? "")
  };
  if (type !== "spell") {
    data.UNIDENTIFIED_DESCRIPTION = {
      "Unidentified Name": na(read(item, "unidentifiedName", "system.unidentified.name")),
      "Unidentified Description": na(read(item, "unidentifiedDescription", "system.unidentified.description"))
    };
  }
  data.CHAT_FLAVOR = {
    "Chat Description": na(read(item, "chatDescription", "system.description.chat"))
  };
  return data;
}

function magical(item, properties) {
  const bonus = magicBonusValue(item);
  const hasBonus = bonus !== null && bonus !== undefined && bonus !== ""
    && !(typeof bonus === "number" && bonus === 0)
    && !(typeof bonus === "string" && /^\+?0(?:\.0+)?$/.test(bonus.trim()));
  return bool(item?.isMagical) || properties.has("mgc") || hasBonus;
}

function magicBonusValue(item) {
  return firstDefined(
    item?.magicBonus,
    getPath(item, "_source.system.magicalBonus"),
    getPath(item, "_source.system.armor.magicalBonus"),
    getPath(item, "system._source.magicalBonus"),
    getPath(item, "system._source.armor.magicalBonus"),
    getPath(item, "system.magicalBonus"),
    getPath(item, "system.armor.magicalBonus")
  );
}

function attunementSection(item) {
  const attunement = read(item, "attunement", "system.attunement") || "none";
  const requiresAttunement = !["", "none", "0", "false"].includes(
    String(attunement).trim().toLowerCase()
  );
  return {
    Attunement: attunement,
    "Attunement By": requiresAttunement ? na(read(
      item,
      "attunementRequirement",
      `flags.${MODULE_ID}.attunementRequirement`,
      "system.attunedBy"
    )) : "n/a",
    "Magic Bonus": na(magicBonusValue(item))
  };
}

function usageSections(item, autoDestroy = false) {
  const directUses = item?.uses;
  // dnd5e prepares FormulaField maxima into evaluated numbers on the live
  // system model. Prefer raw document source so formulas such as @prof survive.
  const max = firstDefined(
    getPath(item, "_source.system.uses.max"),
    getPath(item, "system._source.uses.max"),
    directUses?.max,
    getPath(item, "system.uses.max"),
    0
  );
  const spent = firstDefined(
    getPath(item, "_source.system.uses.spent"),
    getPath(item, "system._source.uses.spent"),
    directUses?.value,
    directUses?.spent,
    getPath(item, "system.uses.spent"),
    0
  );
  const spentNumber = Number(spent);
  if (!Number.isSafeInteger(spentNumber) || spentNumber < 0) {
    const error = new Error(`Cannot export uses because Uses Spent must be a non-negative integer; received "${spent}".`);
    error.code = "ITEM_EXPORT_UNSUPPORTED_USES";
    throw error;
  }
  let representedMax;
  const maxNumber = typeof max === "number" ? max : Number(max);
  if (Number.isSafeInteger(maxNumber) && maxNumber >= 0 && String(max).trim() !== "") {
    representedMax = maxNumber;
  } else if (typeof max === "string"
      && max.trim()
      && max.length <= 200
      && !/[\r\n;]/.test(max)
      && !/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(max.trim())
      && !/\b\d*d\d+/i.test(max)
      && /(?:@|[+\-*/%()])/.test(max)) {
    representedMax = max.trim();
  } else {
    const error = new Error(`Cannot export uses because Uses Max is neither a non-negative integer nor a safe formula; received "${max}".`);
    error.code = "ITEM_EXPORT_UNSUPPORTED_USES";
    throw error;
  }
  const usage = {
    "Uses Spent": spentNumber,
    "Uses Max": representedMax
  };
  if (autoDestroy) usage["Destroy on Empty"] = bool(firstDefined(item?.autoDestroy, getPath(item, "system.uses.autoDestroy"), false));
  const sourceRecovery = firstDefined(
    getPath(item, "_source.system.uses.recovery"),
    getPath(item, "system._source.uses.recovery"),
    item?.recovery,
    getPath(item, "system.uses.recovery"),
    []
  );
  const recovery = asCollection(sourceRecovery).map((entry) => ({
    Period: entry?.period ?? "lr",
    Type: entry?.type ?? "recoverAll",
    Formula: na(entry?.formula)
  }));
  return { usage, recovery };
}

function proficiency(value) {
  return value === null || value === undefined || value === "" ? "Automatic" : value;
}

function coverLabel(value) {
  if (typeof value === "string") return value.toLowerCase().replace(/\s+/g, "");
  return COVER_LABELS.get(Number(value)) ?? "none";
}

function buildWeapon(item) {
  const properties = propertySet(item);
  const itemSection = {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common",
    "Weapon Type": read(item, "weaponType", "system.type.value") ?? "improv",
    "Base Weapon": na(read(item, "baseWeapon", "system.type.baseItem"))
  };
  const data = commonSections(item, itemSection, "weapon");
  data.PROPERTIES = Object.fromEntries(
    Object.entries(WEAPON_PROPERTIES).map(([label, id]) => [label, properties.has(id)])
  );
  data.PROPERTIES.Magical = magical(item, properties);
  data.ATTUNEMENT = attunementSection(item);
  if (data.PROPERTIES.Ammunition) {
    data.AMMUNITION = { "Ammunition Type": read(item, "ammunitionType", "system.ammunition.type") ?? "arrow" };
  }
  if (data.PROPERTIES.Reload) {
    data.RELOAD = { "Reload Amount": integer(read(item, "reloadAmount", "system.reload"), 1) };
  }
  const range = firstDefined(item?.range, getPath(item, "system.range"), {});
  data.RANGE = {
    Reach: na(firstDefined(item?.reach, range?.reach)),
    "Range Normal": na(range?.value),
    "Range Long": na(range?.long),
    "Range Units": range?.units ?? "ft"
  };
  const damage = firstDefined(item?.damage, getPath(item, "system.damage.base"));
  data.DAMAGE = { "Damage Formula": damageFormula(damage), "Damage Type": damageType(damage) };
  if (data.PROPERTIES.Versatile) {
    const versatile = firstDefined(item?.versatileDamage, getPath(item, "system.damage.versatile"));
    data.VERSATILE_DAMAGE = {
      "Versatile Formula": damageFormula(versatile),
      "Versatile Damage Type": damageType(versatile ?? damage)
    };
  }
  data.MASTERY = { Mastery: na(read(item, "mastery", "system.mastery")) };
  data.PROFICIENCY = { Proficient: proficiency(read(item, "proficient", "system.proficient")) };
  if (itemSection["Weapon Type"] === "siege") {
    const hp = firstDefined(item?.hitPoints, getPath(item, "system.hp"), {});
    data.SIEGE_PROPERTIES = {
      "Siege Armor Class": finite(read(item, "siegeArmorClass", "system.armor.value"), 0),
      Cover: coverLabel(read(item, "cover", "system.cover")),
      "Hit Points Current": na(hp?.value),
      "Hit Points Max": na(hp?.max),
      "Hit Points Threshold": na(hp?.dt),
      "Health Conditions": na(hp?.conditions)
    };
  }
  const uses = usageSections(item);
  data.USAGE = uses.usage;
  data.RECOVERY = uses.recovery;
  return data;
}

function buildEquipment(item) {
  const properties = propertySet(item);
  const equipmentType = read(item, "armorType", "system.type.value") ?? "wondrous";
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common",
    "Equipment Type": equipmentType,
    "Base Equipment": na(read(item, "baseEquipment", "system.type.baseItem"))
  }, "equipment");
  data.PROPERTIES = {
    Magical: magical(item, properties),
    Adamantine: properties.has("ada"),
    Focus: properties.has("foc"),
    "Stealth Disadvantage": bool(firstDefined(item?.stealthDisadvantage, properties.has("stealthDisadvantage")))
  };
  data.ATTUNEMENT = attunementSection(item);
  if (["light", "medium", "heavy", "natural", "shield"].includes(equipmentType)) {
    data.ARMOR = {
      "Armor Class": finite(read(item, "armorClass", "system.armor.value"), 0),
      "Max Dex Modifier": na(read(item, "maxDexModifier", "system.armor.dex")),
      "Strength Requirement": na(read(item, "strengthRequirement", "system.strength"))
    };
  }
  if (equipmentType === "vehicle") {
    const hp = firstDefined(item?.hitPoints, getPath(item, "system.hp"), {});
    data.VEHICLE_PROPERTIES = {
      "Vehicle Armor Class": finite(read(item, "vehicleArmorClass", "system.armor.value"), 0),
      Cover: coverLabel(read(item, "cover", "system.cover")),
      "Hit Points Current": na(hp?.value),
      "Hit Points Max": na(hp?.max),
      "Hit Points Threshold": na(hp?.dt),
      "Health Conditions": na(hp?.conditions),
      Speed: na(read(item, "speed", "system.speed.value")),
      "Speed Conditions": na(read(item, "speedConditions", "system.speed.conditions"))
    };
  }
  data.PROFICIENCY = { Proficient: proficiency(read(item, "proficient", "system.proficient")) };
  const uses = usageSections(item);
  data.USAGE = uses.usage;
  data.RECOVERY = uses.recovery;
  return data;
}

function buildConsumable(item) {
  const properties = propertySet(item);
  const consumableType = read(item, "consumableType", "system.type.value") ?? "trinket";
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common",
    "Consumable Type": consumableType
  }, "consumable");
  data.PROPERTIES = { Magical: magical(item, properties) };
  data.ATTUNEMENT = attunementSection(item);
  if (consumableType === "ammo") {
    const damage = firstDefined(item?.damage, getPath(item, "system.damage.base"));
    data.AMMUNITION_PROPERTIES = {
      "Ammunition Type": read(item, "ammunitionType", "system.type.subtype") ?? "arrow",
      Adamantine: bool(firstDefined(item?.adamantine, properties.has("ada"))),
      Silvered: bool(firstDefined(item?.silvered, properties.has("sil"))),
      Returning: bool(firstDefined(item?.returning, properties.has("ret"))),
      "Magic Bonus": na(magicBonusValue(item)),
      "Damage Formula": damage ? damageFormula(damage) : "n/a",
      "Damage Type": damage ? damageType(damage) : "n/a",
      "Damage Replace": bool(firstDefined(item?.damageReplace, getPath(item, "system.damage.replace"), false))
    };
  }
  if (consumableType === "poison") {
    data.POISON_PROPERTIES = { "Poison Type": read(item, "poisonType", "system.type.subtype") ?? "injury" };
  }
  if (consumableType === "scroll") {
    data.SCROLL_PROPERTIES = {
      Concentration: bool(firstDefined(item?.concentration, properties.has("concentration"))),
      Somatic: bool(firstDefined(item?.somatic, properties.has("somatic"))),
      Vocal: bool(firstDefined(item?.vocal, properties.has("vocal"))),
      Ritual: bool(firstDefined(item?.ritual, properties.has("ritual")))
    };
  }
  const uses = usageSections(item, true);
  data.USAGE = uses.usage;
  data.RECOVERY = uses.recovery;
  return data;
}

function buildTool(item) {
  const properties = propertySet(item);
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common",
    "Tool Type": read(item, "toolType", "system.type.value") ?? "",
    "Base Tool": read(item, "baseToolItem", "system.type.baseItem") ?? "thief"
  }, "tool");
  data.PROPERTIES = {
    Magical: magical(item, properties),
    "Tool Bonus": na(firstDefined(
      item?.toolBonus,
      getPath(item, "_source.system.bonus"),
      getPath(item, "system._source.bonus"),
      getPath(item, "system.bonus")
    ))
  };
  data.ATTUNEMENT = attunementSection(item);
  data.ABILITY_CHECK = {
    Proficient: proficiency(read(item, "proficient", "system.proficient")),
    Ability: na(read(item, "toolAbility", "system.ability"))
  };
  const uses = usageSections(item);
  data.USAGE = uses.usage;
  data.RECOVERY = uses.recovery;
  return data;
}

function buildLoot(item) {
  const properties = propertySet(item);
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common",
    "Loot Type": read(item, "lootType", "system.type.value") ?? "gear"
  }, "loot");
  data.PROPERTIES = { Magical: magical(item, properties) };
  return data;
}

function buildContainer(item) {
  const properties = propertySet(item);
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Item"),
    Rarity: item?.rarity ?? getPath(item, "system.rarity") ?? "common"
  }, "container");
  data.PROPERTIES = {
    Magical: magical(item, properties),
    "Weightless Contents": bool(firstDefined(item?.weightlessContents, properties.has("weightlessContents")))
  };
  data.ATTUNEMENT = attunementSection(item);
  data.CAPACITY = {
    "Item Count": na(read(item, "itemCapacity", "system.capacity.count")),
    "Weight Capacity Value": na(read(item, "weightCapacity", "system.capacity.weight.value")),
    "Weight Capacity Units": na(read(item, "weightCapacityUnits", "system.capacity.weight.units")),
    "Volume Capacity Value": na(read(item, "volumeCapacity", "system.capacity.volume.value")),
    "Volume Capacity Units": na(read(item, "volumeCapacityUnits", "system.capacity.volume.units"))
  };
  const currency = firstDefined(item?.currency, getPath(item, "system.currency"));
  if (currency && ["pp", "gp", "ep", "sp", "cp"].some((key) => finite(currency[key], 0) !== 0)) {
    data.CURRENCY_CONTENTS = {
      Platinum: integer(currency.pp, 0), Gold: integer(currency.gp, 0),
      Electrum: integer(currency.ep, 0), Silver: integer(currency.sp, 0), Copper: integer(currency.cp, 0)
    };
  }
  return data;
}

function buildSpell(item) {
  const properties = propertySet(item);
  const range = firstDefined(item?.range, getPath(item, "system.range"), {});
  const duration = firstDefined(item?.duration, getPath(item, "system.duration"), {});
  const target = firstDefined(item?.target, getPath(item, "system.target.affects"), {});
  const area = firstDefined(item?.area, getPath(item, "system.target.template"));
  const data = commonSections(item, {
    Name: String(item?.name ?? "Unnamed Spell"),
    Level: integer(read(item, "spellLevel", "system.level"), 0),
    School: read(item, "spellSchool", "system.school") ?? "evo",
    Ability: na(read(item, "spellAbility", "system.ability"))
  }, "spell");
  data.COMPONENTS = {
    Vocal: bool(firstDefined(item?.vocal, properties.has("vocal"))),
    Somatic: bool(firstDefined(item?.somatic, properties.has("somatic"))),
    Material: bool(firstDefined(item?.material, properties.has("material")))
  };
  if (data.COMPONENTS.Material) {
    data.MATERIALS = {
      Value: read(item, "materialValue", "system.materials.value") ?? "",
      Cost: integer(read(item, "materialCost", "system.materials.cost"), 0),
      Supply: integer(read(item, "materialSupply", "system.materials.supply"), 0),
      Consumed: bool(read(item, "materialConsumed", "system.materials.consumed"))
    };
  }
  data.PREPARATION = {
    Method: read(item, "preparationMode", "system.method") ?? "spell",
    Prepared: bool(firstDefined(item?.prepared, getPath(item, "system.prepared")))
  };
  data.ACTIVATION = {
    Type: read(item, "activationType", "system.activation.type") ?? "action",
    Value: integer(read(item, "activationValue", "system.activation.value"), 1),
    Condition: na(read(item, "activationCondition", "system.activation.condition"))
  };
  data.RANGE = { Units: range?.units ?? "ft", Value: na(range?.value) };
  data.DURATION = {
    Units: duration?.units ?? "inst",
    Value: na(duration?.value),
    Concentration: bool(firstDefined(item?.concentration, properties.has("concentration")))
  };
  data.TARGETS = {
    Type: target?.type ?? "any", Count: na(target?.count),
    Choice: bool(target?.choice), Special: na(target?.special)
  };
  if (area?.type) {
    data.AREA = {
      Shape: area.type, Size: integer(area.size, 0), Units: area.units ?? "ft",
      Count: na(area.count), Width: na(area.width), Height: na(area.height),
      Contiguous: area.contiguous === undefined ? "n/a" : bool(area.contiguous)
    };
  }
  const uses = usageSections(item);
  data.USAGE = uses.usage;
  data.RECOVERY = uses.recovery;
  return data;
}

function representFoundryEffect(effect) {
  const source = typeof effect?.toObject === "function" ? effect.toObject() : effect;
  if (!source?.name) return null;
  const details = {
    Name: source.name,
    "Effect Suspended": !!source.disabled,
    "Apply Effect to Actor": !!source.transfer
  };
  const statuses = asCollection(source.statuses).map(String).filter(Boolean);
  if (statuses.length) details["Status Conditions"] = statuses.join(", ");
  const raw = { DETAILS: details };
  if (source.description) raw.EFFECT_DESCRIPTION = { "Effect Description": source.description };
  if (source.duration && Object.keys(source.duration).length) {
    raw.DURATION = {
      "Effect Duration (Seconds)": na(source.duration.seconds),
      "Effect Start Time": na(source.duration.startTime),
      "Effect Duration (combat) Rounds": na(source.duration.rounds),
      "Effect Duration (combat) Turns": na(source.duration.turns),
      "Effect Start (combat) Rounds": na(source.duration.startRound),
      "Effect Start (combat) Turns": na(source.duration.startTurn)
    };
  }
  if (Array.isArray(source.changes) && source.changes.length) {
    raw.CHANGES = source.changes.map((change) => ({
      "Attribute Key": change.key,
      "Change Mode": change.mode,
      Value: change.value,
      Priority: change.priority ?? 20
    }));
  }
  return raw;
}

function strictActivityPayload(value) {
  let source = value;
  if (typeof source === "string") {
    try {
      source = jsyaml.load(source);
    } catch {
      return null;
    }
  }
  if (!isObject(source)) return null;
  const candidates = [
    source,
    source.strictYaml,
    source.rawData,
    source.payload,
    source.data,
    source.data?.strictYaml,
    source.data?.rawData,
    source.data?.payload
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!isObject(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    const keys = Object.keys(candidate);
    if (keys.length !== 1 || !/^ACTIVITY_[A-Z0-9_]+$/.test(keys[0])) continue;
    if (!isObject(candidate[keys[0]])) continue;
    return plainClone(candidate);
  }
  return null;
}

function getActivityImporterApi(options) {
  if (Object.prototype.hasOwnProperty.call(options, "activityImporterApi")) {
    return options.activityImporterApi;
  }
  const module = globalThis.game?.modules?.get?.("5e-activity-importer");
  return module?.active ? module.api ?? null : null;
}

function isLiveFoundryDocument(document) {
  return typeof document?.toObject === "function"
    || typeof document?.update === "function"
    || !!document?.parent;
}

function hasActivitySerializer(options) {
  const api = getActivityImporterApi(options);
  return typeof options.activitySerializer === "function"
    || typeof api?.serializeActivity === "function";
}

function serializeLiveActivity(activity, item, options) {
  const api = getActivityImporterApi(options);
  const serializer = options.activitySerializer
    ?? (typeof api?.serializeActivity === "function" ? api.serializeActivity.bind(api) : null);
  if (typeof serializer !== "function") {
    return {
      payload: null,
      reason: "no canonical provenance is stored and 5e Activity Importer serialization is unavailable"
    };
  }
  const source = plainClone(
    typeof activity?.toObject === "function" ? activity.toObject() : activity
  );
  const linkedEffects = asCollection(activity?.effects)
    .map((reference) => {
      const id = isObject(reference) ? firstDefined(reference._id, reference.id) : reference;
      return asCollection(item?.effects).find((effect) =>
        String(firstDefined(effect?._id, effect?.id) ?? "") === String(id ?? "")
      );
    })
    .filter(Boolean)
    .map((effect) => plainClone(
      typeof effect?.toObject === "function" ? effect.toObject() : effect
    ));
  try {
    const serialized = serializer(source, {
      format: "object",
      kind: "strict-activity",
      strictYaml: true,
      itemType: item?.type ?? null,
      activityType: activity?.type ?? source?.type ?? null,
      includeLinkedEffects: options.includeEffects !== false,
      linkedEffects
    });
    if (serialized && typeof serialized.then === "function") {
      return {
        payload: null,
        reason: "the 5e Activity Importer serializer is asynchronous, which this synchronous export path cannot safely consume"
      };
    }
    const payload = strictActivityPayload(serialized);
    return payload
      ? {
          payload,
          reason: null,
          serializedEffectIds: Array.isArray(serialized?.serializedEffectIds)
            ? serialized.serializedEffectIds.map(String)
            : []
        }
      : {
          payload: null,
          reason: "the 5e Activity Importer serializer did not return one canonical ACTIVITY_* block"
        };
  } catch (error) {
    return {
      payload: null,
      reason: `the 5e Activity Importer serializer failed: ${error?.message || error}`
    };
  }
}

function localizedActivityExportError(activity, reason) {
  const name = String(activity?.name ?? activity?.type ?? "Unnamed Activity");
  const fallback = `Cannot export Activity "${name}" as strict YAML because ${reason}. Export stopped to prevent data loss.`;
  let message = fallback;
  try {
    if (typeof globalThis.game?.i18n?.format === "function") {
      message = game.i18n.format("II.Errors.ActivityExportUnsupported", { name, reason });
    }
  } catch {
    message = fallback;
  }
  const error = new Error(message);
  error.code = "ITEM_EXPORT_UNSUPPORTED_ACTIVITY";
  error.activityId = firstDefined(activity?._id, activity?.id) ?? null;
  return error;
}

function strictEffectPayload(value) {
  let source = value;
  if (typeof source === "string") {
    try {
      source = jsyaml.load(source);
    } catch {
      return null;
    }
  }
  if (!isObject(source)) return null;
  const candidates = [
    source,
    source.strictYaml,
    source.rawData,
    source.payload,
    source.data,
    source.data?.strictYaml,
    source.data?.rawData,
    source.data?.payload
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!isObject(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    if (Object.keys(candidate).length !== 1 || !isObject(candidate.EFFECT)) continue;
    return plainClone(candidate.EFFECT);
  }
  return null;
}

function serializeLiveEffect(effect, options) {
  const api = getActivityImporterApi(options);
  const serializer = options.effectSerializer
    ?? (typeof api?.serializeEffect === "function" ? api.serializeEffect.bind(api) : null);
  if (typeof serializer !== "function") {
    return { payload: null, reason: "the 5e Activity Importer effect serializer is unavailable" };
  }
  const source = plainClone(
    typeof effect?.toObject === "function" ? effect.toObject() : effect
  );
  try {
    const serialized = serializer(source, {
      format: "object",
      kind: "strict-effect",
      strictYaml: true
    });
    if (serialized && typeof serialized.then === "function") {
      return {
        payload: null,
        reason: "the 5e Activity Importer effect serializer is asynchronous, which this synchronous export path cannot safely consume"
      };
    }
    const payload = strictEffectPayload(serialized);
    return payload
      ? { payload, reason: null }
      : {
          payload: null,
          reason: "the 5e Activity Importer effect serializer did not return one canonical EFFECT block"
        };
  } catch (error) {
    return {
      payload: null,
      reason: `the 5e Activity Importer effect serializer failed: ${error?.message || error}`
    };
  }
}

function localizedEffectExportError(effect, reason) {
  const name = String(effect?.name ?? effect?._id ?? effect?.id ?? "Unnamed Active Effect");
  const fallback = `Cannot export Active Effect "${name}" as strict YAML because ${reason}. Export stopped to prevent data loss.`;
  let message = fallback;
  try {
    if (typeof globalThis.game?.i18n?.format === "function") {
      message = game.i18n.format("II.Errors.EffectExportUnsupported", { name, reason });
    }
  } catch {
    message = fallback;
  }
  const error = new Error(message);
  error.code = "ITEM_EXPORT_UNSUPPORTED_EFFECT";
  error.effectId = firstDefined(effect?._id, effect?.id) ?? null;
  return error;
}

function sharedActivityEffectExportError(effectId, firstActivity, secondActivity) {
  const firstName = String(firstActivity?.name ?? firstActivity?.type ?? "Unnamed Activity");
  const secondName = String(secondActivity?.name ?? secondActivity?.type ?? "Unnamed Activity");
  const fallback = `Cannot export Activities "${firstName}" and "${secondName}" as strict YAML because both reference Active Effect "${effectId}". The strict format cannot preserve a shared effect without duplicating it, so export stopped to prevent data loss.`;
  let message = fallback;
  try {
    if (typeof globalThis.game?.i18n?.format === "function") {
      message = game.i18n.format("II.Errors.SharedActivityEffectUnsupported", {
        firstName,
        secondName,
        effectId
      });
    }
  } catch {
    message = fallback;
  }
  const error = new Error(message);
  error.code = "ITEM_EXPORT_SHARED_ACTIVITY_EFFECT";
  error.effectId = effectId;
  error.activityIds = [firstActivity, secondActivity].map(activity =>
    firstDefined(activity?._id, activity?.id) ?? null
  );
  return error;
}

function stableSignature(value) {
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(",")}]`;
  if (!isObject(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${stableSignature(value[key])}`
  ).join(",")}}`;
}

function strictEffectBody(effect, options = {}) {
  const api = getActivityImporterApi(options);
  const serializerAvailable = typeof options.effectSerializer === "function"
    || typeof api?.serializeEffect === "function";
  if (serializerAvailable) {
    const serialized = serializeLiveEffect(effect, options);
    if (!serialized.payload) throw localizedEffectExportError(effect, serialized.reason);
    return serialized.payload;
  }
  const source = typeof effect?.toObject === "function" ? effect.toObject() : effect;
  const raw = effect?.flags?.[MODULE_ID]?.strictYaml
    ?? effect?.flags?.[MODULE_ID]?.rawData
    ?? source?.flags?.[MODULE_ID]?.strictYaml
    ?? source?.flags?.[MODULE_ID]?.rawData;
  if (raw?.EFFECT && !isLiveFoundryDocument(effect)) return plainClone(raw.EFFECT);
  if (isLiveFoundryDocument(effect)) {
    throw localizedEffectExportError(
      effect,
      "stored provenance cannot verify the current live state and the canonical effect serializer is unavailable"
    );
  }
  return representFoundryEffect(effect);
}

function effectReferenceSignature(value) {
  const body = plainClone(value?.EFFECT ?? value);
  if (isObject(body)) delete body.APPLICATION;
  return stableSignature(body);
}

function representedLinkedEffectIds(activity, activityPayload, item, options = {}) {
  const key = Object.keys(activityPayload ?? {})[0];
  const block = activityPayload?.[key];
  const embedded = [
    ...(Array.isArray(block?.APPLIED_EFFECTS) ? block.APPLIED_EFFECTS : []),
    ...(Array.isArray(block?.ENCHANTMENTS) ? block.ENCHANTMENTS : [])
  ];
  if (!embedded.length) return [];
  const remaining = new Map();
  for (const entry of embedded) {
    const signature = effectReferenceSignature(entry);
    remaining.set(signature, (remaining.get(signature) ?? 0) + 1);
  }
  const itemEffects = new Map(asCollection(item?.effects).map((effect) => [
    String(firstDefined(effect?._id, effect?.id) ?? ""),
    effect
  ]));
  const represented = [];
  for (const reference of asCollection(activity?.effects)) {
    const id = String(
      (isObject(reference) ? firstDefined(reference._id, reference.id) : reference) ?? ""
    );
    if (!id) continue;
    const effect = itemEffects.get(id) ?? (isObject(reference) ? reference : null);
    const body = strictEffectBody(effect, options);
    if (!body) continue;
    const signature = effectReferenceSignature(body);
    const count = remaining.get(signature) ?? 0;
    if (count < 1) continue;
    represented.push(id);
    if (count === 1) remaining.delete(signature);
    else remaining.set(signature, count - 1);
  }
  return represented;
}

function addAttachments(data, item, options) {
  const hasActivityAlias = Object.prototype.hasOwnProperty.call(options, "includeActivities");
  const hasEffectAlias = Object.prototype.hasOwnProperty.call(options, "includeEffects");
  const includeActivities = hasActivityAlias
    ? options.includeActivities !== false
    : options.includeAttachments !== false;
  const includeEffects = hasEffectAlias
    ? options.includeEffects !== false
    : options.includeAttachments !== false && options.includeEmbeddedEffects !== false;
  if (!includeActivities && !includeEffects) return;
  const activities = [];
  const effects = [];
  const linkedEffectIds = new Set();
  const linkedEffectOwners = new Map();
  const pendingEntries = options.pendingActivities ?? item?.pendingActivities ?? [];
  for (const pendingEntry of pendingEntries) {
    const raw = plainClone(pendingEntry?.rawData);
    const key = pendingEntry?.key ?? Object.keys(raw ?? {})[0];
    if (!raw || !key) continue;
    if (includeEffects && key === "EFFECT" && raw.EFFECT) effects.push(raw.EFFECT);
    else if (includeActivities && key.startsWith("ACTIVITY_") && raw[key]) {
      if (!includeEffects) {
        delete raw[key].APPLIED_EFFECTS;
        delete raw[key].ENCHANTMENTS;
      }
      activities.push(raw);
    }
  }
  for (const activity of includeActivities ? asCollection(item?.system?.activities) : []) {
    const stored = activity?.rawData
      ?? activity?.flags?.[MODULE_ID]?.strictYaml
      ?? activity?.flags?.[MODULE_ID]?.rawData;
    let raw = null;
    let serializedEffectIds = [];
    if (hasActivitySerializer(options)) {
      const serialized = serializeLiveActivity(activity, item, { ...options, includeEffects });
      raw = serialized.payload;
      if (!raw) throw localizedActivityExportError(activity, serialized.reason);
      serializedEffectIds = serialized.serializedEffectIds ?? [];
    } else {
      raw = strictActivityPayload(stored);
      if (!raw) {
        throw localizedActivityExportError(
          activity,
          "no canonical provenance is stored and 5e Activity Importer serialization is unavailable"
        );
      }
      if (isLiveFoundryDocument(activity)) {
        throw localizedActivityExportError(
          activity,
          "stored provenance cannot verify the current live state and 5e Activity Importer serialization is unavailable"
        );
      }
    }
    if (!includeEffects) {
      const key = Object.keys(raw)[0];
      delete raw[key].APPLIED_EFFECTS;
      delete raw[key].ENCHANTMENTS;
    }
    activities.push(raw);
    if (includeEffects) {
      const representedIds = representedLinkedEffectIds(activity, raw, item, options);
      for (const id of new Set([...serializedEffectIds, ...representedIds].map(String))) {
        const previousOwner = linkedEffectOwners.get(id);
        if (previousOwner) {
          throw sharedActivityEffectExportError(id, previousOwner, activity);
        }
        linkedEffectOwners.set(id, activity);
        linkedEffectIds.add(id);
      }
    }
  }
  if (includeEffects) {
    for (const effect of asCollection(item?.effects)) {
      const effectId = firstDefined(effect?._id, effect?.id);
      if (effectId !== undefined && effectId !== null && linkedEffectIds.has(String(effectId))) continue;
      const represented = strictEffectBody(effect, options);
      if (represented) effects.push(represented);
    }
  }
  if (activities.length) data.Activities = activities;
  if (effects.length) data.effects = effects;
}

function addCustomProperties(data, item, options) {
  const source = options.customProperties
    ?? item?.customProperties
    ?? item?.flags?.[MODULE_ID]?.customProperties;
  if (!source) return;
  const input = source.Registered || source.Metadata
    ? source
    : { Registered: source.registered, Metadata: source.metadata };
  const normalized = normalizeCustomProperties(input, {
    registry: options.propertyRegistry,
    itemType: item?.type
  });
  if (!normalized.registered.length && !Object.keys(normalized.metadata).length) return;
  data.CUSTOM_PROPERTIES = {
    Registered: normalized.registered,
    Metadata: normalized.metadata
  };
}

/** Convert an ItemData or Foundry Item into a strict-YAML document object. */
export function itemToStrictYamlDocument(item, options = {}) {
  if (!item || typeof item !== "object") throw new TypeError("An item object is required");
  const type = String(item.type ?? "").toLowerCase();
  const rootKey = TYPE_TO_ROOT[type];
  if (!rootKey) throw new TypeError(`Unsupported Item type "${item.type ?? ""}"`);
  const builders = {
    weapon: buildWeapon, equipment: buildEquipment, consumable: buildConsumable,
    tool: buildTool, loot: buildLoot, container: buildContainer, spell: buildSpell
  };
  const data = builders[type](item);
  addCustomProperties(data, item, options);
  addAttachments(data, item, options);
  return {
    [ITEM_YAML_SCHEMA_KEY]: ITEM_YAML_SCHEMA_VERSION,
    [rootKey]: data
  };
}

export function exportStrictItemYaml(item, options = {}) {
  const document = itemToStrictYamlDocument(item, options);
  return jsyaml.dump(document, {
    lineWidth: options.lineWidth ?? -1,
    noRefs: true,
    sortKeys: false,
    noCompatMode: true
  }).trim();
}

/** Export batches as YAML documents so duplicate Item types remain lossless. */
export function exportStrictItemYamlBatch(items, options = {}) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  return items.map((item) => exportStrictItemYaml(item, options)).join("\n---\n");
}
