import { explicitRows, applyExplicitSource, cloneExplicit, damageDataToYaml, exactBoolean, exactNumber, formulaValue, isUnset, parseDamageData, readPath, rejectDamageShorthand, writePath } from "./explicitYamlFields.js";

// Fixed, reviewed native paths. This is deliberately not an arbitrary path API.
const ALL = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"];
const EQUIPPABLE = ["weapon", "equipment", "consumable", "tool", "container"];
const propertyFields = [
  ...ALL.filter(type => type !== "spell").map(type => ({types:[type],section:"PROPERTIES",label:"NPC Equipment",code:"gear"})),
  ...ALL.filter(type => type !== "spell").map(type => ({types:[type],section:"PROPERTIES",label:"Magical",code:"mgc"})),
  ...[["Adamantine","ada"],["Silvered","sil"],["Returning","ret"]].map(([label,code]) => ({types:["consumable"],section:"AMMUNITION_PROPERTIES",label,code})),
  ...[["Concentration","concentration"],["Somatic","somatic"],["Vocal","vocal"],["Ritual","ritual"]].map(([label,code]) => ({types:["consumable"],section:"SCROLL_PROPERTIES",label,code}))
];
const fields = [];
function field(types, section, label, path, kind = "string", options = {}) {
  fields.push(Object.freeze({types, section, label, path, kind, options}));
}
for (const [label, path, kind] of [["Icon","img","string"],["Identifier","system.identifier","string"],["Sort","sort","integer"]])
  field(ALL,"ITEM",label,path,kind);
for (const label of ["Book","Page","Custom","License","Rules","Revision"])
  field(ALL,"SOURCE",label,"system.source." + label.toLowerCase(),label === "Revision" ? "number" : "string");
field(ALL,"DESCRIPTION","Description","system.description.value","nullableText");
field(ALL,"CHAT_FLAVOR","Chat Description","system.description.chat","nullableText");
field(["spell"],"PREPARATION","Method","system.method","method");
field(EQUIPPABLE,"ATTUNEMENT","Attuned","system.attuned","boolean");
field(["container"],"INVENTORY","Equipped","system.equipped","boolean");
field(["loot"],"ITEM","Loot Subtype","system.type.subtype");
field(["consumable"],"ITEM","Consumable Subtype","system.type.subtype");
field(EQUIPPABLE,"ATTUNEMENT","Attunement","system.attunement","attunement");
field(["spell"],"PREPARATION","Source Item","system.sourceItem");
field(["spell"],"PREPARATION","Prepared","system.prepared","prepared");
field(["spell"],"RANGE","Special","system.range.special");
field(["spell"],"DURATION","Special","system.duration.special");
field(["spell"],"AREA","Stationary","system.target.template.stationary","boolean");
for (const [section, label, path] of [
  ["RANGE","Value","range.value"],["DURATION","Value","duration.value"],
  ["TARGETS","Count","target.affects.count"],
  ...["Size","Count","Width","Height"].map(label => ["AREA",label,"target.template." + label.toLowerCase()])
]) field(["spell"],section,label,"system." + path,"formula");
for (const [section,label,path,kind] of [
  ["RANGE","Units","range.units","string"],["DURATION","Units","duration.units","string"],
  ["TARGETS","Type","target.affects.type","string"],["TARGETS","Choice","target.affects.choice","boolean"],["TARGETS","Special","target.affects.special","string"],
  ["AREA","Shape","target.template.type","string"],["AREA","Units","target.template.units","string"],["AREA","Contiguous","target.template.contiguous","boolean"]
]) field(["spell"],section,label,"system." + path,kind);
for (const [label,path,kind] of [["Value","value","string"],["Consumed","consumed","boolean"],["Cost","cost","number"],["Supply","supply","number"]])
  field(["spell"],"MATERIALS",label,"system.materials." + path,kind,{min:0});
for (const [type, section] of [["weapon","SIEGE_PROPERTIES"],["equipment","VEHICLE_PROPERTIES"]]) {
  field([type],section,"Cover","system.cover","cover");
  field([type],section,"Crew Capacity","system.crew.max","integer",{min:0});
  field([type],section,"Speed","system.speed.value","integer",{min:0});
  field([type],section,"Speed Units","system.speed.units");
  field([type],section,"Speed Conditions","system.speed.conditions");
}
for (const [label,path] of [["Reach","range.reach"],["Range Normal","range.value"],["Range Long","range.long"]])
  field(["weapon"],"RANGE",label,"system." + path,"number",{min:0});
// Also retain values from controls disabled by type/property toggles.
for (const [type, section] of [["weapon","SIEGE_PROPERTIES"],["equipment","VEHICLE_PROPERTIES"]]) {
  for (const [label,path,kind] of [["Hit Points Current","hp.value","integer"],["Hit Points Max","hp.max","integer"],["Hit Points Threshold","hp.dt","integer"],["Health Conditions","hp.conditions","string"]])
    field([type],section,label,"system." + path,kind,{min:0});
}
field(["weapon"],"AMMUNITION","Ammunition Type","system.ammunition.type");
field(["weapon"],"SIEGE_PROPERTIES","Siege Armor Class","system.armor.value","integer",{min:0});
field(["equipment"],"ARMOR","Armor Class","system.armor.value","integer",{min:0});
field(["equipment"],"ARMOR","Max Dex Modifier","system.armor.dex","integer");
field(["equipment"],"ARMOR","Strength Requirement","system.strength","integer",{min:0});
field(["equipment"],"VEHICLE_PROPERTIES","Vehicle Armor Class","system.armor.value","integer",{min:0});
field(["spell"],"ITEM","School","system.school");
field(["weapon","consumable"],"ATTUNEMENT","Magic Bonus","system.magicalBonus","formula");
field(["equipment"],"ATTUNEMENT","Magic Bonus","system.armor.magicalBonus","formula");
export const EXPLICIT_ITEM_FIELDS = Object.freeze(fields);

export function preparedState(value) {
  if (isUnset(value)) return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const states = {unprepared:0,prepared:1,always:2,"0":0,"1":1,"2":2,true:1,false:0};
  const key = String(value).trim().toLowerCase();
  if (!Object.hasOwn(states,key)) throw new Error("PREPARATION.Prepared must be unprepared, prepared, always, 0, 1, 2, or a legacy boolean.");
  return states[key];
}
function parseField(value, descriptor) {
  const {section,label,kind,options} = descriptor;
  const location = section + "." + label;
  if (kind === "nullableText" && value === null) return null;
  if (kind === "method") return value === "prepared" ? "spell" : isUnset(value) ? "" : String(value);
  if (kind === "prepared") return preparedState(value);
  if (kind === "attunement") {
    if (isUnset(value) || value === "none") return "";
    if (!["required","optional"].includes(value)) throw new Error(location + " must be none, required, or optional.");
    return value;
  }
  if (kind === "cover") {
    const labels = {none:0,half:0.5,threequarters:0.75,total:1};
    return Object.hasOwn(labels,value) ? labels[value] : exactNumber(value,location,{min:0,max:1});
  }
  if (kind === "formula") return formulaValue(value,location);
  if (kind === "boolean") return exactBoolean(value,location);
  if (kind === "number" || kind === "integer") return exactNumber(value,location,{...options,integer:kind === "integer"});
  if (isUnset(value)) return "";
  if (!["string","number"].includes(typeof value)) throw new Error(location + " must be text.");
  return String(value);
}
export function extendExplicitItemSchema(schema,type) {
  for (const {types,section,label} of fields.filter(f => f.types.includes(type))) {
    schema[section] ??= [];
    if (!schema[section].includes(label)) schema[section].push(label);
  }
  if (type !== "spell") schema.PROPERTIES.push("NPC Equipment");
  if (type === "tool") schema.PROPERTIES.push("Focus");
  if (["weapon","consumable"].includes(type)) schema.DAMAGE = [...(schema.DAMAGE ?? []),"DAMAGE_DATA",...(type === "consumable" ? ["Replace"] : [])];
  if (type === "weapon") schema.VERSATILE_DAMAGE.push("DAMAGE_DATA");
}
export function parseExplicitItemFields(item,data,warn = () => {}) {
  const source = {};
  for (const descriptor of fields.filter(f => f.types.includes(item.type))) {
    if (Object.hasOwn(data[descriptor.section] ?? {},descriptor.label)) {
      const value=parseField(data[descriptor.section][descriptor.label],descriptor);
      const previous=readPath(source,descriptor.path);
      if (previous !== undefined && previous !== null && value !== null && previous !== value)
        throw new Error(descriptor.section + "." + descriptor.label + " conflicts with another value for " + descriptor.path + ".");
      if (previous === undefined || value !== null) writePath(source,descriptor.path,value);
    }
  }
  if (item.type === "tool" && Object.hasOwn(data.PROPERTIES ?? {},"Focus")) item.toolFocus = exactBoolean(data.PROPERTIES.Focus,"PROPERTIES.Focus");
  const damages = item.type === "weapon" ? [["DAMAGE","base",["Damage Formula","Damage Type"]],["VERSATILE_DAMAGE","versatile",["Versatile Formula","Versatile Damage Type"]]]
    : item.type === "consumable" ? [["DAMAGE","base",["Damage Formula","Damage Type"]]] : [];
  for (const [section,key,aliases] of damages) {
    const block = data[section];
    if (!block || !Object.hasOwn(block,"DAMAGE_DATA")) continue;
    rejectDamageShorthand(block,aliases,section);
    if (item.type === "consumable") {
      const ammo = data.AMMUNITION_PROPERTIES ?? {};
      if (["Damage Formula","Damage Type"].some(label => !isUnset(ammo[label])))
        throw new Error("DAMAGE.DAMAGE_DATA cannot be combined with ammunition damage shorthand.");
    }
    writePath(source,"system.damage." + key,parseDamageData(block.DAMAGE_DATA,section + ".DAMAGE_DATA"));
  }
  if (item.type === "consumable" && Object.hasOwn(data.DAMAGE ?? {},"Replace")) {
    if (Object.hasOwn(data.AMMUNITION_PROPERTIES ?? {},"Damage Replace")
      && !isUnset(data.AMMUNITION_PROPERTIES["Damage Replace"])
      && exactBoolean(data.AMMUNITION_PROPERTIES["Damage Replace"],"Damage Replace") !== exactBoolean(data.DAMAGE.Replace,"DAMAGE.Replace"))
      throw new Error("DAMAGE.Replace conflicts with AMMUNITION_PROPERTIES.Damage Replace.");
    writePath(source,"system.damage.replace",exactBoolean(data.DAMAGE.Replace,"DAMAGE.Replace"));
  }
  if (item.type === "weapon" && !isUnset(data.RELOAD?.["Reload Amount"])) {
    writePath(source,"flags.5e-item-importer.reloadAmount",exactNumber(data.RELOAD["Reload Amount"],"RELOAD.Reload Amount",{integer:true,min:1,nullable:false}));
    warn("Reload Amount is stored as flags.5e-item-importer.reloadAmount metadata. D&D5e 5.3.3 has no native reload amount field or automation.");
  }
  item.explicitPropertyStates = {};
  for (const {types,section,label,code} of propertyFields.filter(f => f.types.includes(item.type))) {
    if (Object.hasOwn(data[section] ?? {},label))
      item.explicitPropertyStates[code] = exactBoolean(data[section][label],section + "." + label);
  }
  item.explicitSource = source;
  return source;
}
function storedSource(item) {
  if (item?._source) return cloneExplicit(item._source);
  if (typeof item?.toObject === "function") return cloneExplicit(item.toObject());
  if (typeof item?.getFoundryData === "function") return cloneExplicit(item.getFoundryData());
  if (item?.itemData && Object.keys(item.itemData).length) return cloneExplicit(item.itemData);
  return cloneExplicit(item ?? {});
}
export function explicitItemSource(item) {
  const source = storedSource(item);
  applyExplicitSource(source,item?.explicitSource);
  return source;
}
export function itemExplicitRows(item) {
  const data = exportExplicitItemFields({}, item);
  return Object.entries(data).flatMap(([section,value]) => explicitRows(value, section));
}
export function exportExplicitItemFields(data,item) {
  const source = explicitItemSource(item);
  const type = item.type ?? source.type;
  for (const descriptor of fields.filter(f => f.types.includes(type))) {
    const value = readPath(source,descriptor.path);
    if (value === undefined) continue;
    data[descriptor.section] ??= {};
    data[descriptor.section][descriptor.label] = descriptor.kind === "prepared"
      ? ["unprepared","prepared","always"][preparedState(value)] : descriptor.kind === "attunement" ? value || "none" : descriptor.kind === "cover" ? ({0:"none",0.5:"half",0.75:"threequarters",1:"total"}[value] ?? value) : cloneExplicit(value);
  }
  if (source.system?.properties !== undefined) {
    const properties = new Set(source.system.properties);
    for (const {section,label,code} of propertyFields.filter(f => f.types.includes(type))) {
      (data[section] ??= {})[label] = properties.has(code);
    }
  }
  if (type === "tool") {
    data.PROPERTIES ??= {};
    data.PROPERTIES.Focus = new Set(source.system?.properties ?? []).has("foc") || item.toolFocus === true;
  }
  if (["weapon","consumable"].includes(type)) {
    for (const [section,key] of [["DAMAGE","base"],...(type === "weapon" ? [["VERSATILE_DAMAGE","versatile"]] : [])]) {
      const damage = source.system?.damage?.[key];
      if (!damage) continue;
      data[section] = {DAMAGE_DATA:damageDataToYaml(damage)};
      if (type === "consumable") data[section].Replace = source.system.damage.replace ?? false;
    }
    if (type === "consumable" && data.DAMAGE?.DAMAGE_DATA && data.AMMUNITION_PROPERTIES) {
      for (const key of ["Damage Formula","Damage Type","Damage Replace"]) delete data.AMMUNITION_PROPERTIES[key];
    }
  }
  if (type === "spell") (data.PREPARATION ??= {}).Prepared = ["unprepared","prepared","always"][preparedState(readPath(source,"system.prepared") ?? item.prepared ?? data.PREPARATION.Prepared)];
  for (const [section, formulaLabel, typeLabel] of [["DAMAGE","Damage Formula","Damage Type"],["VERSATILE_DAMAGE","Versatile Formula","Versatile Damage Type"]]) {
    const legacy = data[section] ?? (type === "consumable" && section === "DAMAGE" ? data.AMMUNITION_PROPERTIES : undefined);
    if (legacy?.DAMAGE_DATA || isUnset(legacy?.[formulaLabel])) continue;
    data[section] = {DAMAGE_DATA:damageDataToYaml(parseDamageData({
      "Custom Enabled":true,"Custom Formula":legacy[formulaLabel],"Damage Types":isUnset(legacy[typeLabel]) ? [] : legacy[typeLabel]
    }))};
    if (type === "consumable") {
      data[section].Replace = legacy.Replace ?? legacy["Damage Replace"] ?? false;
      for (const key of ["Damage Formula","Damage Type","Damage Replace"]) delete data.AMMUNITION_PROPERTIES?.[key];
    }
  }
  const reload = source.flags?.["5e-item-importer"]?.reloadAmount;
  if (type === "weapon" && reload !== undefined) data.RELOAD = {"Reload Amount":reload};
  return data;
}
