/** Read-only schema 2 regression tests. Safe to run in Foundry; creates no documents. */
import yaml from "../../scripts/vendor/js-yaml.mjs";
import { ItemUtils } from "../../scripts/itemUtils.js";
import { ItemData } from "../../scripts/itemData.js";
import { YamlItemParser } from "../../scripts/strictItemParsers/yamlItemParser.js";
import { itemToStrictYamlDocument } from "../../scripts/itemYamlExporter.js";
import { cloneExplicit, readPath } from "../../scripts/explicitYamlFields.js";
import { extractExpectedItemProps, extractActualItemProps } from "../../scripts/ui/itemComparisonExtractor.js";
import { compareProperties } from "../../scripts/ui/itemComparisonEngine.js";

function stable(value) {
  value = cloneExplicit(value);
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key,stable(value[key])]));
  return value;
}
const same = (a,b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function requireValue(condition,message) { if (!condition) throw new Error(message); }
const DAMAGE = {number:2,denomination:6,bonus:"@mod",types:["fire","cold"],custom:{enabled:false,formula:"3 + @mod"},scaling:{mode:"whole",number:0,formula:"@prof"}};
async function build(document) {
  const parsed = new YamlItemParser().parse(yaml.dump(document));
  requireValue(parsed.success,parsed.errors.join("; "));
  await parsed.item.buildFoundryData({deterministicIcons:true});
  if (globalThis.Item?.implementation?.schema) {
    const validation = ItemUtils.validateItemData(parsed.item.itemData);
    requireValue(validation.valid, "Native item schema: " + validation.errors.join("; "));
  }
  return parsed;
}
export async function runExplicitItemYamlTests() {
  const results = [];
  const test = async (name,run) => {
    try { await run(); results.push({name,passed:true}); }
    catch (error) { results.push({name,passed:false,details:{error:error.message}}); }
  };
  await test("Explicit damage summaries match and omitted default versatile damage stays quiet",async()=>{
    const parsed=await build({SCHEMA_VERSION:2,WEAPON:{ITEM:{Name:"Comparison Glaive","Weapon Type":"martialM","Base Weapon":"glaive"},DAMAGE:{DAMAGE_DATA:{"Dice Count":1,"Die Denomination":10,"Damage Types":["slashing"],"Custom Enabled":false,"Custom Formula":"2d8"}}}});
    const empty={number:null,denomination:null,bonus:"",types:[],custom:{enabled:false,formula:""},scaling:{mode:"",number:1,formula:""}};
    const source=cloneExplicit(parsed.item.itemData);
    source.system.damage.versatile=cloneExplicit(empty);
    const actual=()=>extractActualItemProps({...source,_source:source},parsed);
    const report=()=>compareProperties(extractExpectedItemProps(parsed),actual());
    const damageRows=rows=>rows.filter(row=>row.section==="VERSATILE_DAMAGE"||row.section==="DAMAGE"||(row.section==="Combat Statistics"&&["Damage","Damage Type","Versatile"].includes(row.label)));
    requireValue(damageRows(report().extra).length===0,"Native defaults or explicit summaries were reported as extra damage.");
    requireValue(actual().some(row=>row.label==="Damage"&&row.value==="1d10"),"Damage summary was hidden instead of matched.");
    source.system.damage.base.number=2;
    requireValue(damageRows(report().mismatches).length>0,"A real damage mismatch was hidden.");
    source.system.damage.base.number=1;
    source.system.damage.versatile.custom.formula="2d8";
    requireValue(report().extra.some(row=>row.section==="VERSATILE_DAMAGE"&&row.actual==="2d8"),"Unexpected inactive versatile data was hidden.");
    source.system.damage.versatile=cloneExplicit(empty);
    source.system.damage.versatile.scaling.number=0;
    requireValue(report().extra.some(row=>row.section==="VERSATILE_DAMAGE"),"Non-default zero was treated as an empty native default.");
    source.system.damage.versatile=cloneExplicit(empty);
    parsed.item.explicitSource.system.damage.versatile=cloneExplicit(empty);
    const explicitReport=report();
    requireValue(actual().some(row=>row.section==="VERSATILE_DAMAGE"),"Authored empty versatile data disappeared.");
    requireValue(damageRows(explicitReport.extra).length===0&&damageRows(explicitReport.missing).length===0,"Authored empty versatile data did not match.");
    const prepared={...source,system:cloneExplicit(source.system),_source:source};
    prepared.system.damage.base.number=99;
    requireValue(extractActualItemProps(prepared,parsed).some(row=>row.label==="Damage"&&row.value==="1d10"),"Comparison used prepared damage instead of stored source.");
  });
  await test("Generated baseline replacement preserves authored, failed, and changed activities",async()=>{
    const source={type:"weapon",system:{activities:{}}};
    const baseline={id:"Baseline00000001",type:"attack",_source:{_id:"Baseline00000001",type:"attack",name:"Default attack",sort:0}};
    const activities=new Map([[baseline.id,baseline]]);
    const item={system:{activities},deleteActivity:async id=>activities.delete(id)};
    const capture=ItemData.captureGeneratedBaseline(source,item);
    requireValue(capture?.id===baseline.id,"Native baseline was not captured.");
    requireValue(ItemData.captureGeneratedBaseline({type:"weapon",system:{activities:{Authored:{type:"attack"}}}},item)===null,"Authored source activities were eligible for removal.");
    await ItemData.removeReplacedBaseline(item,capture,{createdActivityIds:[],issues:[]});
    requireValue(activities.has(baseline.id),"Baseline removed without a replacement.");
    activities.set("Replacement00001",{id:"Replacement00001",type:"attack"});
    const success={createdActivityIds:["Replacement00001"],issues:[]};
    requireValue(ItemData.captureGeneratedBaseline(source,item)===null,"Multiple existing activities were treated as one baseline.");
    await ItemData.removeReplacedBaseline(item,capture,{...success,issues:["Attachment failed"]});
    requireValue(activities.has(baseline.id),"Failed attachment import removed the baseline.");
    baseline._source.name="Changed during import";
    requireValue(await ItemData.removeReplacedBaseline(item,capture,success),"Modified baseline was silently removed.");
    requireValue(activities.has(baseline.id),"Modified baseline was deleted.");
    baseline._source.name="Default attack";
    item.deleteActivity=async()=>{throw new Error("Fixture delete failure");};
    requireValue((await ItemData.removeReplacedBaseline(item,capture,success))?.includes("Fixture delete failure"),"Cleanup failure was not reported.");
    item.deleteActivity=async id=>activities.delete(id);
    requireValue(await ItemData.removeReplacedBaseline(item,capture,success)===null&&!activities.has(baseline.id)&&activities.has("Replacement00001"),"Successful replacement did not remove only the captured baseline.");
  });
  const spell = {name:"Explicit Spell",type:"spell",img:"icons/svg/book.svg",system:{
    level:2,school:"evo",method:"spell",prepared:2,properties:[],
    activation:{type:"action",value:0,condition:"stored"},
    range:{value:"30 + @mod",units:"ft",special:"Stored range"},
    duration:{value:"1 + @mod",units:"minute",special:"Stored duration"},
    sourceItem:"spellcasting",
    materials:{value:"inactive material",consumed:false,cost:0.5,supply:1.25},
    target:{affects:{type:"creature",count:"1 + @mod",choice:false,special:"Stored target"},template:{type:"cone",size:"10 + @mod",count:"1 + @mod",width:"2 + @mod",height:"3 + @mod",units:"ft",contiguous:false,stationary:true}}
  }};
  for (const [input,expected] of [[false,0],[true,1],[0,0],[1,1],[2,2],["unprepared",0],["prepared",1],["always",2]]) {
    await test("Preparation " + JSON.stringify(input),async () => {
      const doc = itemToStrictYamlDocument(spell);
      doc.SPELL.PREPARATION.Prepared = input;
      const parsed = await build(doc);
      requireValue(parsed.item.itemData.system.prepared === expected,"Preparation lost its native state.");
      requireValue(itemToStrictYamlDocument(parsed.item).SPELL.PREPARATION.Prepared === ["unprepared","prepared","always"][expected],"Export is not descriptive.");
    });
  }
  await test("Spell formulas and inactive materials survive two round trips",async () => {
    const first = await build(itemToStrictYamlDocument(spell));
    const second = await build(itemToStrictYamlDocument(first.item));
    for (const path of ["range.value","range.special","duration.value","duration.special","sourceItem","activation.value","materials","target"]) {
      requireValue(same(readPath(first.item.itemData.system,path),readPath(spell.system,path)),"Initial loss at " + path);
      requireValue(same(readPath(second.item.itemData.system,path),readPath(spell.system,path)),"Round trip loss at " + path);
    }
    requireValue(!new Set(second.item.itemData.system.properties).has("material"),"Inactive materials enabled their component.");
  });
  for (const type of ["weapon","equipment","consumable","tool","loot","container","spell"]) {
    await test(type + " identity, source, state and native controls",async () => {
      const source = type === "spell" ? cloneExplicit(spell) : {name:"Explicit " + type,type,system:{properties:[],quantity:1,identified:false,equipped:true,attunement:"",attuned:true,weight:{value:0.5,units:"lb"},price:{value:0.25,denomination:"gp"}}};
      Object.assign(source,{img:"icons/svg/book.svg",sort:0});
      Object.assign(source.system,{identifier:"explicit-" + type,source:{book:"Private",page:"12a",custom:"Custom source",license:"Private",rules:"2024",revision:1.5}});
      if (type === "weapon") Object.assign(source.system,{type:{value:"siege",baseItem:""},range:{value:20.5,long:60.25,reach:5.5,units:"ft"},damage:{base:cloneExplicit(DAMAGE),versatile:cloneExplicit(DAMAGE)},crew:{max:3},speed:{value:0,units:"m",conditions:"Stored speed"}});
      if (type === "equipment") Object.assign(source.system,{type:{value:"vehicle",baseItem:""},armor:{value:10,dex:null},crew:{max:4},speed:{value:30,units:"m",conditions:"Stored speed"}});
      if (type === "consumable") Object.assign(source.system,{type:{value:"potion",subtype:""},damage:{base:cloneExplicit(DAMAGE),replace:false}});
      if (type === "tool") Object.assign(source.system,{type:{value:"art",baseItem:"alchemist"},properties:["foc"],proficient:0.5});
      if (type === "loot") source.system.type = {value:"gear",subtype:"private-subtype"};
      const first = await build(itemToStrictYamlDocument(source));
      const second = await build(itemToStrictYamlDocument(first.item));
      for (const path of ["img","sort","system.identifier","system.source",...(!["loot","spell"].includes(type) ? ["system.attuned","system.equipped"] : []),
        ...(["weapon","equipment"].includes(type) ? ["system.crew.max","system.speed"] : []),
        ...(["weapon","consumable"].includes(type) ? ["system.damage"] : []),
        ...(type === "weapon" ? ["system.range"] : []),
        ...(type === "loot" ? ["system.type.subtype"] : [])])
        requireValue(same(readPath(source,path),readPath(second.item.itemData,path)),type + " lost " + path + ": " + JSON.stringify(readPath(second.item.itemData,path)));
      if (type === "tool") requireValue(new Set(second.item.itemData.system.properties).has("foc") && second.item.itemData.system.proficient === 0.5,"Tool focus/proficiency lost.");
      const expected = extractExpectedItemProps(first);
      const actual = extractActualItemProps({...second.item.itemData,_source:second.item.itemData});
      requireValue(expected.some(row => row.section === "SOURCE" && row.label === "Revision" && row.value === "1.5"),"Preview missing source revision.");
      requireValue(actual.some(row => row.section === "SOURCE" && row.label === "Revision" && row.value === "1.5"),"Comparison missing source revision.");
    });
  }
  await test("Inactive target, area and magical controls keep stored values",async () => {
    const source=cloneExplicit(spell);
    source.system.target.affects.type="";
    source.system.target.affects.choice=true;
    source.system.target.template.type="";
    source.system.target.template.contiguous=true;
    source.system.target.template.units="m";
    const parsed=await build(itemToStrictYamlDocument(source));
    const reparsed=await build(itemToStrictYamlDocument(parsed.item));
    requireValue(same(source.system.target,reparsed.item.itemData.system.target),"Inactive target or area settings were lost.");
    const weapon={name:"Inactive bonus",type:"weapon",system:{type:{value:"simpleM",baseItem:"club"},properties:[],magicalBonus:"2",damage:{base:cloneExplicit(DAMAGE),versatile:cloneExplicit(DAMAGE)}}};
    const result=await build(itemToStrictYamlDocument(weapon));
    requireValue(!new Set(result.item.itemData.system.properties).has("mgc")&&result.item.itemData.system.magicalBonus==="2","Stored bonus enabled Magical.");
  });
  await test("Consumable stored properties survive a subtype change",async () => {
    const source={name:"Stored consumable",type:"consumable",system:{type:{value:"potion",subtype:"stored"},properties:["ada","sil","ret","somatic","vocal","ritual","concentration"],damage:{base:cloneExplicit(DAMAGE),replace:false}}};
    const parsed=await build(itemToStrictYamlDocument(source));
    const reparsed=await build(itemToStrictYamlDocument(parsed.item));
    requireValue(same([...source.system.properties].sort(),[...reparsed.item.itemData.system.properties].sort()),"Inactive consumable properties were lost.");
    requireValue(reparsed.item.itemData.system.type.subtype==="stored","Inactive subtype was lost.");
  });
  await test("Live export reads stored activation and uses rather than prepared values",async () => {
    const source=cloneExplicit(spell);
    source.system.activation={type:"action",value:2,condition:"stored"};
    source.system.uses={spent:0,max:"2 + @mod",recovery:[]};
    const live={...cloneExplicit(source),_source:source};
    live.system.activation.value=null;
    live.system.uses.max=5;
    const result=await build(itemToStrictYamlDocument(live));
    requireValue(result.item.itemData.system.activation.value===2&&result.item.itemData.system.uses.max==="2 + @mod","Prepared values replaced stored data.");
  });
  await test("Nullable descriptions, blank casting method and NPC equipment persist",async () => {
    const source=cloneExplicit(spell);
    source.system.description={value:null,chat:null};source.system.method="";
    const result=await build(itemToStrictYamlDocument(source));
    requireValue(same(result.item.itemData.system.description,source.system.description)&&result.item.itemData.system.method==="","Nullable description or blank method was lost.");
    const loot={name:"NPC gear",type:"loot",system:{type:{value:"gear",subtype:""},properties:["gear"]}};
    const parsed=await build(itemToStrictYamlDocument(loot));
    requireValue(new Set(parsed.item.itemData.system.properties).has("gear"),"NPC equipment property was lost.");
  });
  await test("Inactive armor controls and blank spell school persist",async () => {
    const source={name:"Stored armor",type:"equipment",system:{type:{value:"clothing",baseItem:""},properties:[],armor:{value:12,dex:0,magicalBonus:""},strength:8}};
    const result=await build(itemToStrictYamlDocument(source));
    const second=await build(itemToStrictYamlDocument(result.item));
    requireValue(same(source.system.armor,second.item.itemData.system.armor)&&second.item.itemData.system.strength===8,"Inactive armor fields were lost.");
    const sourceSpell=cloneExplicit(spell);sourceSpell.system.school="";
    requireValue((await build(itemToStrictYamlDocument(sourceSpell))).item.itemData.system.school==="","Blank spell school was lost.");
  });
  for(const version of [1,2,3]) await test("Companion strict descriptor version " + version,async () => {
    const source={name:"Descriptor fixture",type:"weapon",system:{type:{value:"simpleM",baseItem:"club"},properties:[],activities:[{
      _id:"DescriptorAct001",name:"Utility",type:"utility",effects:[],toObject(){return {_id:this._id,name:this.name,type:this.type};}
    }]},effects:[{_id:"DescriptorEff001",name:"Effect",toObject(){return {_id:this._id,name:this.name};}}]};
    const activityImporterApi={
      serializeActivity:()=>({schemaVersion:version,kind:"strict-activity",rawData:{ACTIVITY_UTILITY:{ACTIVITY:{Name:"Utility"}}},serializedEffectIds:[]}),
      serializeEffect:()=>({schemaVersion:version,kind:"strict-effect",rawData:{EFFECT:{DETAILS:{Name:"Effect"}}}})
    };
    let exported,error;try{exported=itemToStrictYamlDocument(source,{activityImporterApi});}catch(e){error=e;}
    if(version===3) requireValue(error?.code==="ITEM_EXPORT_UNSUPPORTED_ACTIVITY","Future descriptor did not fail clearly.");
    else requireValue(exported.WEAPON.Activities.length===1&&exported.WEAPON.effects.length===1,"Supported companion descriptor rejected.");
  });
  for (const version of [0,1,2]) await test("Accept Item YAML schema " + version,async () => {
    const doc = itemToStrictYamlDocument(spell); doc.SCHEMA_VERSION = version;
    requireValue((await build(doc)).item.yamlSchemaVersion === 2,"Compatibility version failed.");
  });
  for (const [name,mutate] of [
    ["invalid preparation",d=>d.SPELL.PREPARATION.Prepared=3],
    ["fractional activation",d=>d.SPELL.ACTIVATION.Value=0.5],
    ["expression in numeric field",d=>d.SPELL.ITEM.Sort="1 + 2"],
    ["unknown damage label",d=>{d.SPELL.PREPARATION.Prepared="sometimes";}],
    ["future schema",d=>d.SCHEMA_VERSION=3]
  ]) await test("Reject " + name,async () => {
    const doc=itemToStrictYamlDocument(spell);mutate(doc);
    const parsed = new YamlItemParser().parse(yaml.dump(doc));
    requireValue(!parsed.success && parsed.errors.length>0,"Invalid input was silently accepted.");
  });
  await test("Explicit damage rejects ambiguous shorthand; reload is metadata",async () => {
    const doc={SCHEMA_VERSION:2,WEAPON:{ITEM:{Name:"Reload probe","Weapon Type":"simpleR","Base Weapon":"shortbow"},PROPERTIES:{Reload:true},RELOAD:{"Reload Amount":3},DAMAGE:{DAMAGE_DATA:{"Dice Count":1,"Die Denomination":6,"Damage Types":["piercing"],"Custom Enabled":false}}}};
    const parsed=await build(doc);
    requireValue(parsed.item.itemData.system.reload === undefined,"Phantom native reload field remains.");
    requireValue(parsed.item.itemData.flags?.["5e-item-importer"]?.reloadAmount === 3,"Reload metadata lost.");
    requireValue(parsed.warnings.some(w=>w.includes("no native reload")),"Reload metadata warning missing.");
    doc.WEAPON.DAMAGE["Damage Formula"]="1d6";
    requireValue(!new YamlItemParser().parse(yaml.dump(doc)).success,"Ambiguous damage was accepted.");
  });
  return {passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,total:results.length,results};
}
