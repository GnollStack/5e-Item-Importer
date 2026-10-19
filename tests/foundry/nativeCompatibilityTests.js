/** Native 6.x model round trips. Constructs temporary models only; never persists documents. */
import yaml from "../../scripts/vendor/js-yaml.mjs";
import { YamlItemParser } from "../../scripts/strictItemParsers/yamlItemParser.js";
import { itemToStrictYamlDocument } from "../../scripts/itemYamlExporter.js";
import { ItemData } from "../../scripts/itemData.js";
import { cloneExplicit, readPath } from "../../scripts/explicitYamlFields.js";
import { buildAppliedEffectProfiles } from "../../scripts/activityEffectLinks.js";

const TYPES = ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"];
const DAMAGE = { number: 2, denomination: 6, bonus: "@mod", types: ["fire", "cold"], modifiers: ["min3", "min3", "r1"],
  custom: { enabled: false, formula: "3 + @mod" }, scaling: { mode: "whole", number: 0, formula: "@prof" } };
function stable(value) {
  value = cloneExplicit(value);
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const equal = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
function differences(left, right, path = "system") {
  if (equal(left, right)) return [];
  if (left && right && !Array.isArray(left) && !Array.isArray(right) && typeof left === "object" && typeof right === "object")
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap(key => differences(left[key], right[key], path + "." + key));
  return [path];
}
function seed(type) {
  const system = { description: { value: "<p>Complete stored description</p>", chat: "Stored chat" },
    identifier: "native-" + type, source: { book: "Native fixture", page: "12a", custom: "Source fidelity", license: "Private", rules: "2024", revision: 1.5 } };
  if (type !== "spell") Object.assign(system, { rarities: type === "loot" ? [] : ["rare", "veryRare"],
    unidentified: { name: "Unknown item", description: "<p>Stored unidentified text</p>" }, identified: false,
    quantity: 1, weight: { value: 0.5, units: "lb" }, price: { value: 0.25, denomination: "gp" } });
  if (type === "weapon") Object.assign(system, { type: { value: "simpleM", baseItem: "club" },
    properties: ["ver"], damage: { base: cloneExplicit(DAMAGE), versatile: cloneExplicit(DAMAGE) }, range: { value: 20.5, long: 60.25, reach: 5.5, units: "ft" } });
  if (type === "equipment") Object.assign(system, { type: { value: "clothing", baseItem: "" }, armor: { value: 12, dex: 0, magicalBonus: "2" }, strength: 8 });
  if (type === "consumable") Object.assign(system, { type: { value: "potion", subtype: "stored" }, damage: { base: cloneExplicit(DAMAGE), replace: false } });
  if (type === "tool") Object.assign(system, { type: { value: "art", baseItem: "alchemist" }, properties: ["foc"], proficient: 0.5 });
  if (type === "loot") Object.assign(system, { type: { value: "gear", subtype: "stored" } });
  if (type === "spell") Object.assign(system, { level: 2, school: "evo", method: "spell", prepared: 2,
    sourceItem: "spellcasting", activation: { type: "action", value: 0 },
    range: { value: "30 + @mod", units: "ft", special: "Stored range" },
    duration: { value: "1 + @mod", units: "minute", expiry: "turnEnd", special: "Stored duration" },
    materials: { value: "Inactive material", consumed: false, cost: 0.5, supply: 1.25 } });
  return { name: "Native " + type, type, img: "icons/svg/book.svg", system };
}
async function parse(document) {
  const parsed = new YamlItemParser().parse(yaml.dump(document));
  if (!parsed.success) throw new Error(parsed.errors.join("; "));
  await parsed.item.buildFoundryData({ deterministicIcons: true });
  return parsed.item;
}

export async function runNativeCompatibilityTests() {
  const results = [];
  const check = async (name, action) => {
    try { const details = await action(); results.push({ name, passed: true, details }); }
    catch (error) { results.push({ name, passed: false, details: { error: error.message } }); }
  };
  const snapshot = () => JSON.stringify([game.items.map(item => item._source), game.actors.map(actor => actor._source)]);
  const before = snapshot();
  for (const type of TYPES) await check(type + " complete native system survives export/import", async () => {
    const document = new CONFIG.Item.documentClass(seed(type), { strict: true });
    const original = document.toObject();
    const exported = itemToStrictYamlDocument(document, { includeActivities: false, includeEffects: false });
    const parsed = await parse(exported);
    const rebuilt = new CONFIG.Item.documentClass(cloneExplicit(parsed.itemData), { strict: true });
    const changed = differences(original.system, rebuilt.toObject().system);
    if (changed.length) throw new Error("Native round trip changed " + changed.map(path=>path+": "+JSON.stringify(readPath(original,path))+" -> "+JSON.stringify(readPath(rebuilt.toObject(),path))).join(", "));
    if (rebuilt.toObject().name !== original.name) throw new Error("Prepared unidentified name replaced stored name.");
    if (type !== "spell") {
      for (const rarities of [[], ["legendary"], ["rare", "veryRare"]]) {
        const input = cloneExplicit(exported); input[type.toUpperCase()].ITEM.Rarities = rarities;
        const update = await parse(input);
        document.updateSource(ItemData.prepareExistingItemUpdate(update.itemData));
        if (!equal(document.toObject().system.rarities, rarities)) throw new Error("Existing native Item rarity update failed.");
      }
    }
    return { completeSystemEqual: true, persisted: false };
  });
  for (const type of ["weapon","consumable"]) await check(type + " native default damage preserves optional omissions",async()=>{
    const data=seed(type);
    data.system.damage={base:{number:1,denomination:6,types:["fire"]},...(type==="weapon"?{versatile:{number:1,denomination:8,types:["fire"]}}:{replace:false})};
    const document=new CONFIG.Item.documentClass(data,{strict:true});
    const original=document.toObject();
    const parsed=await parse(itemToStrictYamlDocument(document,{includeActivities:false,includeEffects:false}));
    const restored=new CONFIG.Item.documentClass(cloneExplicit(parsed.itemData),{strict:true}).toObject();
    const changed=differences(original.system,restored.system);
    if(changed.length)throw new Error("Native default damage changed "+changed.map(path=>path+": "+JSON.stringify(readPath(original,path))+" -> "+JSON.stringify(readPath(restored,path))).join(", "));
  });
  await check("Explicit origin including null and stale UUID remains source data", async () => {
    const harness = Object.create(ItemData.prototype);
    for (const origin of [null, "", "Actor.StaleOrigin00001"]) {
      const effect = { origin };
      await harness.normalizeEffectOrigin(effect, { uuid: "Item.Parent0000000001" });
      if (effect.origin !== origin) throw new Error("An explicit effect origin was replaced.");
    }
    const effect = {};
    await harness.normalizeEffectOrigin(effect, { uuid: "Item.Parent0000000001" });
    if (effect.origin !== "Item.Parent0000000001") throw new Error("Omitted effect origin did not default to the parent.");
  });
  await check("Shared local ActiveEffect topology survives full native Item export/import",async()=>{
    const effectId="SharedEffect0001";
    const activities=[{_id:"SharedSave000001",type:"save",name:"First shared save",effects:[{_id:effectId,onSave:false,level:{min:0,max:0}}]},
      {_id:"SharedSave000002",type:"save",name:"Second shared save",effects:[{_id:effectId,onSave:true,level:{min:1,max:null}}]}];
    const input=seed("weapon");input.system.activities=Object.fromEntries(activities.map(activity=>[activity._id,activity]));
    input.effects=[{_id:effectId,name:"Shared native effect",type:"base",origin:null,disabled:false,transfer:false,system:{changes:[]}}];
    const original=new CONFIG.Item.documentClass(input,{strict:true});
    if(!game.modules.get("5e-activity-importer")?.active) {
      const before=JSON.stringify(original.toObject());
      let document,error;try{document=itemToStrictYamlDocument(original);}catch(caught){error=caught;}
      if(document!==undefined||error?.code!=="ITEM_EXPORT_UNSUPPORTED_ACTIVITY"||!error.message.includes("serialization is unavailable"))throw new Error("Missing companion did not stop full export clearly before returning partial data.");
      if(JSON.stringify(original.toObject())!==before)throw new Error("Missing-companion export changed native source.");
      return {companionInactive:true,clearUnsupportedError:true,partialExport:false,sourceUnchanged:true};
    }
    const document=itemToStrictYamlDocument(original);
    if(document.WEAPON.effects?.length!==1)throw new Error("Shared effect did not export as one Item-level definition.");
    const parsed=await parse(document);
    const collected=await parsed.collectActivityResults();
    if(collected.blockingIssues?.length||!collected.results)throw new Error(collected.issues.join("; "));
    const target=new CONFIG.Item.documentClass(cloneExplicit(parsed.itemData),{strict:true});
    const issues=await parsed.preflightInlineActivityPlan(collected.results,target);
    if(issues.length)throw new Error(issues.join("; "));
    const rebuiltSource=cloneExplicit(parsed.itemData);rebuiltSource.effects=[];rebuiltSource.system.activities={};
    for(const result of collected.results) {
      if(result.resultType==="effect")rebuiltSource.effects.push(result.effectData);
      else {
        if(result.embeddedEffectResults?.length)throw new Error("Shared definition was duplicated inline.");
        const source={type:result.activityType,...result.activityData,effects:buildAppliedEffectProfiles(result)};
        rebuiltSource.system.activities[source._id]=source;
      }
    }
    const restored=new CONFIG.Item.documentClass(rebuiltSource,{strict:true});
    const changed=differences(original.toObject().system.activities,restored.toObject().system.activities,"system.activities");
    if(changed.length||!equal(original.toObject().effects,restored.toObject().effects))throw new Error("Shared topology changed native source: "+changed.join(", "));
    return {activities:2,effectDefinitions:1,completeNativeProfilesEqual:true,persisted:false};
  });
  await check("World and Actor document sources remain unchanged", () => {
    if (snapshot() !== before) throw new Error("Native validation changed a world document source.");
  });
  const passed = results.filter(result => result.passed).length;
  return { success: passed === results.length, total: results.length, passed, failed: results.length - passed, results };
}
