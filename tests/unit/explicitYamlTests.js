/** Read-only schema 3 regression tests. Safe to run in Foundry; creates no documents. */
import yaml from "../../scripts/vendor/js-yaml.mjs";
import { ItemUtils } from "../../scripts/itemUtils.js";
import { ItemData } from "../../scripts/itemData.js";
import { YamlItemParser } from "../../scripts/strictItemParsers/yamlItemParser.js";
import { itemToStrictYamlDocument, exportStrictItemYamlBatch } from "../../scripts/itemYamlExporter.js";
import { cloneExplicit, readPath, parseDamageData, damageDataToYaml } from "../../scripts/explicitYamlFields.js";
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
const DAMAGE = {number:2,denomination:6,bonus:"@mod",types:["fire","cold"],custom:{enabled:false,formula:"3 + @mod"},modifiers:["min3","r1"],scaling:{mode:"whole",number:0,formula:"@prof"}};
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
    source.system.damage.versatile.modifiers=[];
    requireValue(damageRows(report().extra).length===0,"dnd5e 6 empty modifier defaults were reported as extra versatile damage.");
    source.system.damage.versatile.modifiers=["min2"];
    requireValue(report().extra.some(row=>row.section==="VERSATILE_DAMAGE"),"An authored versatile modifier was hidden.");
    source.system.damage.versatile=cloneExplicit(empty);
    source.system.damage.versatile={types:[],custom:{enabled:false},modifiers:[],scaling:{number:1}};
    parsed.item.itemData.system.damage.versatile=cloneExplicit(source.system.damage.versatile);
    requireValue(damageRows(report().extra).length===0,"Native omitted optional formula defaults were reported as extra versatile damage.");
    source.system.damage.versatile.custom.formula=undefined;
    source.system.damage.versatile.scaling.mode=undefined;
    source.system.damage.versatile.scaling.formula=undefined;
    requireValue(damageRows(report().extra).length===0,"Native own undefined formula fields were reported as extra versatile damage.");
    delete parsed.item.itemData.system.damage.versatile;
    source.system.damage.versatile.bonus=null;
    requireValue(report().extra.some(row=>row.section==="VERSATILE_DAMAGE"),"An explicit null bonus was hidden as an absent default.");
    source.system.damage.versatile=cloneExplicit(empty);
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
    duration:{value:"1 + @mod",units:"minute",expiry:"turnEnd",special:"Stored duration"},
    sourceItem:"spellcasting",
    materials:{value:"inactive material",consumed:false,cost:0.5,supply:1.25},
    target:{affects:{type:"creature",count:"1 + @mod",choice:false,special:"Stored target"},template:{type:"cone",size:"10 + @mod",count:"1 + @mod",width:"2 + @mod",height:"3 + @mod",units:"ft",contiguous:false,stationary:true}}
  }};
  const feat = {name:"Explicit Feat",type:"feat",img:"icons/svg/book.svg",system:{
    type:{value:"class",subtype:"fightingStyle"},requirements:"Fighter 1",
    prerequisites:{level:4,items:["fighter","feat:alert"],repeatable:true},
    properties:["mgc","trait"],enchant:{max:"1 + @prof",period:"lr"},cover:0.5,crewed:true,
    uses:{spent:1,max:"@prof",recovery:[{period:"lr",type:"recoverAll"}]},
    advancement:{
      ExplicitAsi00001:{_id:"ExplicitAsi00001",type:"AbilityScoreImprovement",level:0,configuration:{points:1,cap:2,fixed:{con:1},locked:["str"],recommendation:"Compendium.dnd5e.feats24.Item.phbfeaAlert00000"},value:{}},
      ExplicitGrant001:{_id:"ExplicitGrant001",type:"ItemGrant",level:4,name:"Storm Spells",hint:"<p>Always prepared.</p>",configuration:{items:[{uuid:"Compendium.dnd5e.spells24.Item.phbsplThunderwav",optional:false,sort:0},{uuid:"Compendium.dnd5e.spells24.Item.phbsplGustofWind",optional:true,sort:100000}],optional:false,sorting:"m",spell:{ability:["cha"],method:"spell",prepared:2,uses:{max:"1",per:"lr",requireSlot:false}}},value:{}},
      ExplicitChoice01:{_id:"ExplicitChoice01",type:"ItemChoice",configuration:{allowDrops:true,choices:{"0":{count:1,replacement:false},"8":{count:1,replacement:true}},pool:[{uuid:"Compendium.dnd5e.spells24.Item.phbsplAlarm00000",sort:0}],restriction:{level:"available",list:["class:wizard"],school:["evo"],subtype:"",type:""},sorting:"a",spell:{ability:["int"],method:"ritual",prepared:0,uses:{max:"",per:"",requireSlot:false}},type:"spell"},value:{}},
      ExplicitModify01:{_id:"ExplicitModify01",type:"ModifyItem",level:0,classRestriction:"primary",configuration:{changes:[{_id:"ExplicitEnchant1",identifiers:["weapon:longsword"]},{uuid:"Compendium.world.effects.ActiveEffect.explicitEffect01",identifiers:[]}]},value:{}},
      ExplicitScale001:{_id:"ExplicitScale001",type:"ScaleValue",configuration:{identifier:"storm-dice",type:"dice",distance:{units:"ft"},scale:{"4":{number:1,faces:6,modifiers:[]},"12":{number:2,faces:6,modifiers:["min2"]}}},value:{}},
      ExplicitTrait001:{_id:"ExplicitTrait001",type:"Trait",level:0,img:"icons/svg/aura.svg",configuration:{allowReplacements:false,choices:[{count:1,pool:["skills:*"]}],grants:["skills:ath","weapon:mar"],mode:"default"},value:{}}
    }
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
    for (const path of ["range.value","range.special","duration.value","duration.special","duration.expiry","sourceItem","activation.value","materials","target"]) {
      requireValue(same(readPath(first.item.itemData.system,path),readPath(spell.system,path)),"Initial loss at " + path);
      requireValue(same(readPath(second.item.itemData.system,path),readPath(spell.system,path)),"Round trip loss at " + path);
    }
    requireValue(!new Set(second.item.itemData.system.properties).has("material"),"Inactive materials enabled their component.");
  });
  for (const type of ["weapon","equipment","consumable","tool","loot","container","spell","feat"]) {
    await test(type + " identity, source, state and native controls",async () => {
      const source = type === "spell" ? cloneExplicit(spell) : type === "feat" ? cloneExplicit(feat) : {name:"Explicit " + type,type,system:{properties:[],quantity:1,identified:false,equipped:true,attunement:"",attuned:true,weight:{value:0.5,units:"lb"},price:{value:0.25,denomination:"gp"}}};
      Object.assign(source,{img:"icons/svg/book.svg",sort:0});
      Object.assign(source.system,{identifier:"explicit-" + type,source:{book:"Private",page:"12a",custom:"Custom source",license:"Private",rules:"2024",revision:1.5}});
      if (type === "weapon") Object.assign(source.system,{type:{value:"siege",baseItem:""},range:{value:20.5,long:60.25,reach:5.5,units:"ft"},damage:{base:cloneExplicit(DAMAGE),versatile:cloneExplicit(DAMAGE)},crew:{max:3},speed:{value:0,units:"m",conditions:"Stored speed"}});
      if (type === "equipment") Object.assign(source.system,{type:{value:"vehicle",baseItem:""},armor:{value:10,dex:null},crew:{max:4},speed:{value:30,units:"m",conditions:"Stored speed"}});
      if (type === "consumable") Object.assign(source.system,{type:{value:"potion",subtype:""},damage:{base:cloneExplicit(DAMAGE),replace:false}});
      if (type === "tool") Object.assign(source.system,{type:{value:"art",baseItem:"alchemist"},properties:["foc"],proficient:0.5});
      if (type === "loot") source.system.type = {value:"gear",subtype:"private-subtype"};
      const first = await build(itemToStrictYamlDocument(source));
      const second = await build(itemToStrictYamlDocument(first.item));
      for (const path of ["img","sort","system.identifier","system.source",...(!["loot","spell","feat"].includes(type) ? ["system.attuned","system.equipped"] : []),
        ...(["weapon","equipment"].includes(type) ? ["system.crew.max","system.speed"] : []),
        ...(["weapon","consumable"].includes(type) ? ["system.damage"] : []),
        ...(type === "weapon" ? ["system.range"] : []),
        ...(type === "loot" ? ["system.type.subtype"] : []),
        ...(type === "feat" ? ["system.type","system.requirements","system.prerequisites","system.enchant","system.cover","system.crewed","system.uses.spent","system.uses.max","system.advancement"] : [])])
        requireValue(same(readPath(source,path),readPath(second.item.itemData,path)),type + " lost " + path + ": " + JSON.stringify(readPath(second.item.itemData,path)));
      if (type === "tool") requireValue(new Set(second.item.itemData.system.properties).has("foc") && second.item.itemData.system.proficient === 0.5,"Tool focus/proficiency lost.");
      if (type === "feat") {
        requireValue(same([...source.system.properties].sort(),[...second.item.itemData.system.properties].sort()),"Feat properties lost: " + JSON.stringify(second.item.itemData.system.properties));
        requireValue(second.item.itemData.system.uses.recovery?.[0]?.period === "lr" && second.item.itemData.system.uses.recovery?.[0]?.type === "recoverAll","Feat recovery lost.");
        requireValue(second.item.itemData.system.quantity === undefined && second.item.itemData.system.rarities === undefined && second.item.itemData.system.attunement === undefined,"Feat gained physical fields.");
      }
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
  await test("Native omitted magical and target fields stay omitted",async () => {
    for(const type of ["weapon","consumable"]) {
      const source={name:"Optional native fields",type,system:{type:{value:type==="weapon"?"simpleM":"potion",baseItem:type==="weapon"?"club":""},properties:[]}};
      const document=itemToStrictYamlDocument(source);
      requireValue(!Object.hasOwn(document[type.toUpperCase()].ATTUNEMENT??{},"Magic Bonus"),"Export materialized an absent magical bonus.");
      requireValue((await build(document)).item.itemData.system.magicalBonus===undefined,"Builder materialized an absent magical bonus.");
    }
    const source=cloneExplicit(spell);
    source.system.target.affects={choice:false};
    const document=itemToStrictYamlDocument(source);
    for(const label of ["Type","Count","Special"])requireValue(!Object.hasOwn(document.SPELL.TARGETS??{},label),"Export materialized absent target "+label);
    const parsed=await build(document);
    for(const key of ["type","count","special"])requireValue(parsed.item.itemData.system.target.affects[key]===undefined,"Builder materialized absent target "+key);
  });
  await test("Native damage omissions and authored modifier arrays survive parsing",async () => {
    const source={number:1,denomination:6,types:["fire"],modifiers:["min2","min2","r1"],custom:{enabled:false},scaling:{number:1}};
    const document=damageDataToYaml(source);
    for(const label of ["Bonus","Custom Formula","Scaling Mode","Scaling Formula"])requireValue(!Object.hasOwn(document,label),"Optional damage field materialized: "+label);
    requireValue(same(parseDamageData(document),source),"Native damage optional fields or duplicate modifiers changed.");
    const parsed=await build({SCHEMA_VERSION:3,WEAPON:{ITEM:{Name:"Default damage","Weapon Type":"simpleM","Base Weapon":"club"},DAMAGE:{DAMAGE_DATA:document}}});
    requireValue(same(parsed.item.itemData.system.damage.base,source),"Item damage builder materialized omitted fields.");
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
  for(const version of [1,2,3,4,5,6]) await test("Companion strict descriptor version " + version,async () => {
    const source={name:"Descriptor fixture",type:"weapon",system:{type:{value:"simpleM",baseItem:"club"},properties:[],activities:[{
      _id:"DescriptorAct001",name:"Utility",type:"utility",effects:[],toObject(){return {_id:this._id,name:this.name,type:this.type};}
    }]},effects:[{_id:"DescriptorEff001",name:"Effect",toObject(){return {_id:this._id,name:this.name};}}]};
    const activityImporterApi={
      serializeActivity:()=>({schemaVersion:version,kind:"strict-activity",rawData:{ACTIVITY_UTILITY:{ACTIVITY:{Name:"Utility"}}},serializedEffectIds:[]}),
      serializeEffect:()=>({schemaVersion:version,kind:"strict-effect",rawData:{EFFECT:{DETAILS:{Name:"Effect"}}}})
    };
    let exported,error;try{exported=itemToStrictYamlDocument(source,{activityImporterApi});}catch(e){error=e;}
    if(version===6) requireValue(error?.code==="ITEM_EXPORT_UNSUPPORTED_ACTIVITY","Future descriptor did not fail clearly.");
    else requireValue(exported.WEAPON.Activities.length===1&&exported.WEAPON.effects.length===1,"Supported companion descriptor rejected.");
  });
  for (const version of [0,1,2,3,4,5,6]) await test("Accept Item YAML schema " + version,async () => {
    const doc = itemToStrictYamlDocument(spell); doc.SCHEMA_VERSION = version;
    requireValue((await build(doc)).item.yamlSchemaVersion === 6,"Compatibility version failed.");
  });
  await test("Feat unknown type and subtype warn and are stored",async () => {
    const parsed=await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Odd Feature","Feature Type":"homebrew","Feature Subtype":"custom"}}});
    requireValue(parsed.item.itemData.system.type.value==="homebrew"&&parsed.item.itemData.system.type.subtype==="custom","Unknown feature type or subtype was not stored.");
    requireValue(parsed.warnings.some(w=>w.includes('Unknown Feature Type "homebrew"')),"Unknown feature type did not warn.");
    const mismatch=await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Odd Subtype","Feature Type":"Class","Feature Subtype":"origin"}}});
    requireValue(mismatch.item.itemData.system.type.value==="class","Feature type was not canonicalised.");
    requireValue(mismatch.warnings.some(w=>w.includes('Unknown Feature Subtype "origin"')),"Subtype mismatch did not warn.");
    const periodWarning=await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Odd Period"},ENCHANTMENT:{Max:"1",Period:"weekly"}}});
    requireValue(periodWarning.item.itemData.system.enchant.period==="weekly"&&periodWarning.warnings.some(w=>w.includes("ENCHANTMENT.Period")),"Unknown enchant period was rejected or silent.");
  });
  await test("Feat ignores physical sections with FeatData warnings",async () => {
    const parsed=await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Physical Feature",Rarities:["rare"]},INVENTORY:{Quantity:3},COST_AND_WEIGHT:{"Price Value":5},UNIDENTIFIED_DESCRIPTION:{"Unidentified Name":"Hidden"},ATTUNEMENT:{Attunement:"required"}}});
    requireValue(parsed.item.itemData.system.quantity===undefined&&parsed.item.itemData.system.rarities===undefined&&parsed.item.itemData.system.attunement===undefined,"Physical fields leaked into FeatData.");
    requireValue(parsed.warnings.filter(w=>w.includes("current dnd5e FeatData")).length===5,"Expected five FeatData warnings: "+parsed.warnings.join(" | "));
  });
  await test("Feat advancement registers references, validates entries and reports its summary",async () => {
    const parse = advancement => new YamlItemParser().parse(yaml.dump({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Adv"},ADVANCEMENT:advancement}}));
    requireValue(!parse([{HIT_POINTS:{}}]).success,"Unsupported root accepted.");
    requireValue(!parse([{TRAIT:{Grants:["skill:ath"]}}]).success,"Bad trait key accepted.");
    requireValue(!parse([{GRANT_ITEMS:{ITEMS:[{Optional:true}]}}]).success,"Grant without a reference accepted.");
    requireValue(!parse([{SCALE_VALUE:{Type:"dice",SCALE:[{Level:1,"Die Denomination":6}]}}]).success,"Scale value without an identifier accepted.");
    requireValue(!parse([{GRANT_ITEMS:{Level:-1}}]).success,"Negative level accepted.");
    requireValue(!parse([{ABILITY_SCORE_IMPROVEMENT:{"Class Restriction":"tertiary"}}]).success,"Unknown class restriction accepted.");
    requireValue(!parse([{MODIFY_ITEMS:{CHANGES:[{Identifiers:["weapon:longsword"]}]}}]).success,"Modify change without an effect accepted.");
    requireValue(!parse({GRANT_ITEMS:{}}).success,"Non-list ADVANCEMENT accepted.");
    requireValue(!parse([{GRANT_ITEMS:{},TRAIT:{}}]).success,"Two roots in one entry accepted.");
    const warned = parse([{TRAIT:{Grants:["weapon:martial"]}},{SCALE_VALUE:{Level:3,Identifier:"x",Type:"number",SCALE:[{Level:1,Value:2}]}}]);
    requireValue(warned.success && warned.warnings.some(w => w.includes("weapon:mar")) && warned.warnings.some(w => w.includes("Level is ignored")),"Advancement warnings missing: " + warned.warnings.join(" | "));
    requireValue(warned.item.advancement[1].level === undefined && warned.item.advancement[1].configuration.scale["1"].value === 2,"Multi-level entry kept a level or lost its scale.");
    const named = parse([{GRANT_ITEMS:{ITEMS:[{Name:"Shield",Type:"spell"},{UUID:"Compendium.dnd5e.spells24.Item.phbsplAlarm00000"}]}}]);
    requireValue(named.success,"Named reference parse failed: " + named.errors.join("; "));
    const references = named.item.references;
    requireValue(references.length === 2 && references[0].query.name === "Shield" && references[0].query.itemTypes.join() === "spell" && references[0].status === "pending","Name reference not registered: " + JSON.stringify(references.map(r => r.query)));
    requireValue(references[1].query.uuid === "Compendium.dnd5e.spells24.Item.phbsplAlarm00000" && references[1].path === "advancement[0].configuration.items[1].uuid","UUID reference lost its path.");
    const built = await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Adv"},ADVANCEMENT:[{GRANT_ITEMS:{ITEMS:[{Name:"Shield",Type:"spell"},{UUID:"Compendium.dnd5e.spells24.Item.phbsplAlarm00000"}]}}]}});
    const entries = Object.values(built.item.itemData.system.advancement);
    requireValue(entries.length === 1 && entries[0].type === "ItemGrant" && entries[0].configuration.items[0].uuid === null && entries[0].configuration.items[1].uuid === "Compendium.dnd5e.spells24.Item.phbsplAlarm00000" && /^[A-Za-z0-9]{16}$/.test(entries[0]._id) && entries[0]._id === Object.keys(built.item.itemData.system.advancement)[0],"Built advancement lost ids or UUIDs: " + JSON.stringify(entries));
    requireValue(extractExpectedItemProps(built).some(row => row.section === "Advancement" && row.label.startsWith("Grant Items")),"Preview omits advancement.");
    const compact = await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Adv"},ADVANCEMENT:[{ABILITY_SCORE_IMPROVEMENT:{FIXED:{str:1,dex:2}}},{CHOOSE_ITEMS:{CHOICES:{"0":{Count:1}},Type:"feat"}}]}});
    const [asi, choice] = Object.values(compact.item.itemData.system.advancement);
    requireValue(same(asi.configuration.fixed,{str:1,dex:2}) && same(choice.configuration.choices,{"0":{count:1}}) && choice.configuration.type === "feat","Compact mapping forms were not accepted.");
    let exportError;
    try { itemToStrictYamlDocument({name:"Odd",type:"feat",system:{advancement:{odd0000000000001:{_id:"odd0000000000001",type:"HitPoints",configuration:{},value:{}}}}}); } catch (error) { exportError = error; }
    requireValue(exportError?.code === "ITEM_EXPORT_UNSUPPORTED_ADVANCEMENT","Unsupported native advancement type was exported silently.");
  });
  await test("Container CONTENTS flatten into a batch with placement, limits and name binding",async () => {
    const parser = () => new YamlItemParser();
    const child = (name, extra = {}) => ({LOOT:{ITEM:{Name:name,Rarities:[],"Loot Type":"gear"},INVENTORY:{Quantity:1,Identified:true},...extra}});
    const nested = {SCHEMA_VERSION:6,CONTAINER:{ITEM:{Name:"Pack",Rarities:[]},CONTENTS:[child("Rations"),{CONTAINER:{ITEM:{Name:"Pouch",Rarities:[]},CONTENTS:[child("Flint")]}}]}};
    const results = parser().parseAll(yaml.dump(nested));
    requireValue(results.length === 4 && results.every(r => r.success),"Nested contents did not flatten: " + results.flatMap(r => r.errors).join("; "));
    requireValue(results[0].item.type === "container" && results[0].item.containerRef === null,"Parent gained a container reference.");
    requireValue(same(results[1].item.containerRef,{kind:"batch",parentOrder:0,parentName:"Pack",depth:1}),"Child placement wrong: " + JSON.stringify(results[1].item.containerRef));
    requireValue(results[3].item.containerRef.parentOrder === 2 && results[3].item.containerRef.depth === 2,"Grandchild placement wrong.");
    requireValue(/INVENTORY:[\s\S]*Container: Pack/.test(results[1].sourceText),"Retry text lacks the container name.");
    requireValue(itemToStrictYamlDocument(results[1].item).LOOT.INVENTORY.Container === "Pack","Export lost the batch container name.");
    const single = parser().parse(yaml.dump(nested));
    requireValue(!single.success && single.errors.some(e => e.includes("batch flow")),"parse() accepted nested contents.");
    const byName = parser().parseAll([{CONTAINER:{ITEM:{Name:"Sack",Rarities:[]}}},{LOOT:{ITEM:{Name:"Pebble",Rarities:[],"Loot Type":"gear"},INVENTORY:{Quantity:1,Container:"sack"}}}].map(d => yaml.dump({SCHEMA_VERSION:6,...d})).join("\n---\n"));
    requireValue(byName[1].success && byName[1].item.containerRef.kind === "batch" && byName[1].item.containerRef.parentOrder === 0 && byName[1].item.references.length === 0,"Batch name binding failed: " + JSON.stringify(byName[1].item?.containerRef) + byName[1].errors.join("; "));
    const external = parser().parse(yaml.dump({SCHEMA_VERSION:6,LOOT:{ITEM:{Name:"Pebble",Rarities:[],"Loot Type":"gear"},INVENTORY:{Quantity:1,Container:"Item.worldBag00000001"}}}));
    requireValue(external.success && external.item.containerRef.kind === "reference" && external.item.containerRef.uuid === "Item.worldBag00000001" && external.item.references[0].kind === "container" && external.item.references[0].query.uuid === "Item.worldBag00000001" && external.item.references[0].path === "containerRef.uuid","UUID container reference not registered.");
    const named = parser().parse(yaml.dump({SCHEMA_VERSION:6,LOOT:{ITEM:{Name:"Pebble",Rarities:[],"Loot Type":"gear"},INVENTORY:{Quantity:1,Container:"Old Sack"}}}));
    requireValue(named.success && named.item.containerRef.kind === "reference" && named.item.references[0].query.name === "Old Sack" && named.item.references[0].query.itemTypes.join() === "container","Name container reference not registered.");
    requireValue(itemToStrictYamlDocument(external.item).LOOT.INVENTORY.Container === "Item.worldBag00000001","Export lost the container UUID.");
    const conflict = parser().parseAll(yaml.dump({SCHEMA_VERSION:6,CONTAINER:{ITEM:{Name:"Pack",Rarities:[]},CONTENTS:[child("Rations",{INVENTORY:{Quantity:1,Container:"Pack"}})]}}));
    requireValue(!conflict[1].success && conflict[1].errors.some(e => e.includes("one form")),"Nested item with INVENTORY.Container was accepted.");
    const spellInside = parser().parseAll(yaml.dump({SCHEMA_VERSION:6,CONTAINER:{ITEM:{Name:"Pack",Rarities:[]},CONTENTS:[{SPELL:{ITEM:{Name:"Nope"}}}]}}));
    requireValue(!spellInside[1].success && spellInside[1].errors.some(e => e.includes("physical")),"Non-physical content was accepted.");
    let deep = child("Leaf");
    for (let i = 0; i < 6; i++) deep = {CONTAINER:{ITEM:{Name:"Box " + i,Rarities:[]},CONTENTS:[deep]}};
    const tooDeep = parser().parseAll(yaml.dump({SCHEMA_VERSION:6,...deep}));
    requireValue(tooDeep.some(r => !r.success && r.errors.some(e => e.includes("deep"))),"Depth limit not enforced.");
    const ambiguous = parser().parseAll([{CONTAINER:{ITEM:{Name:"Sack",Rarities:[]}}},{CONTAINER:{ITEM:{Name:"Sack",Rarities:[]}}},{LOOT:{ITEM:{Name:"Pebble",Rarities:[],"Loot Type":"gear"},INVENTORY:{Quantity:1,Container:"Sack"}}}].map(d => yaml.dump({SCHEMA_VERSION:6,...d})).join("\n---\n"));
    requireValue(!ambiguous[2].success && ambiguous[2].errors.some(e => e.includes("matches 2")),"Ambiguous batch container name was accepted.");
    const selfRef = parser().parseAll(yaml.dump({SCHEMA_VERSION:6,CONTAINER:{ITEM:{Name:"Loop",Rarities:[]},INVENTORY:{Quantity:1,Container:"Loop"}}}) + "\n---\n" + yaml.dump({SCHEMA_VERSION:6,LOOT:{ITEM:{Name:"Pebble",Rarities:[],"Loot Type":"gear"}}}));
    requireValue(selfRef[0].success && selfRef[0].item.containerRef.kind === "reference","A container naming itself should fall through to a destination reference: " + JSON.stringify(selfRef[0].item?.containerRef) + selfRef[0].errors.join("; "));
    const exportedBatch = exportStrictItemYamlBatch([
      {id:"Container000001",_id:"Container000001",name:"Sack",type:"container",system:{quantity:1,properties:[],rarities:[]}},
      {id:"Pebble0000000001",_id:"Pebble0000000001",name:"Pebble",type:"loot",system:{quantity:1,properties:[],rarities:[],container:"Container000001"}},
      {id:"Stone00000000001",_id:"Stone00000000001",name:"Stone",type:"loot",system:{quantity:1,properties:[],rarities:[],container:"Elsewhere0000001"}}
    ]);
    const docs = yaml.loadAll(exportedBatch);
    requireValue(docs[1].LOOT.INVENTORY.Container === "Sack" && docs[2].LOOT.INVENTORY.Container === "Item.Elsewhere0000001" && docs[0].CONTAINER.INVENTORY.Container === undefined,"Batch export container labels wrong: " + JSON.stringify(docs.map(d => Object.values(d)[1].INVENTORY)));
  });
  await test("Feat prerequisite items reject malformed identifiers",async () => {
    const parsed=new YamlItemParser().parse(yaml.dump({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Bad Prereq"},PREREQUISITES:{Items:["not valid!"]}}}));
    requireValue(!parsed.success&&parsed.errors.some(e=>e.includes("PREREQUISITES.Items")),"Malformed prerequisite identifier was accepted.");
    const accepted=await build({SCHEMA_VERSION:6,FEAT:{ITEM:{Name:"Good Prereq"},PREREQUISITES:{Items:["fighter","feat:alert"],Level:"n/a"}}});
    requireValue(same(accepted.item.itemData.system.prerequisites.items,["fighter","feat:alert"])&&accepted.item.itemData.system.prerequisites.level===null,"Valid prerequisite identifiers or nullable level were lost.");
  });
  for (const [name,mutate] of [
    ["invalid preparation",d=>d.SPELL.PREPARATION.Prepared=3],
    ["fractional activation",d=>d.SPELL.ACTIVATION.Value=0.5],
    ["expression in numeric field",d=>d.SPELL.ITEM.Sort="1 + 2"],
    ["unknown damage label",d=>{d.SPELL.PREPARATION.Prepared="sometimes";}],
    ["future schema",d=>d.SCHEMA_VERSION=7]
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
  for (const values of [[], ["rare"], ["rare", "veryRare"]]) await test("Native rarity set " + JSON.stringify(values), async () => {
    const source = {name:"Rarity probe",type:"weapon",system:{rarities:values,type:{value:"simpleM",baseItem:"club"}}};
    const document = itemToStrictYamlDocument(source);
    requireValue(same(document.WEAPON.ITEM.Rarities, values) && !Object.hasOwn(document.WEAPON.ITEM,"Rarity"), "Export did not preserve canonical rarities.");
    const parsed = await build(document);
    requireValue(same(parsed.item.itemData.system.rarities,values) && !Object.hasOwn(parsed.item.itemData.system,"rarity"), "Builder retained deprecated scalar rarity.");
    const repeated = await build(itemToStrictYamlDocument(parsed.item));
    requireValue(same(repeated.item.itemData.system.rarities,values),"Rarity set did not round trip.");
    const report = compareProperties(extractExpectedItemProps(parsed),extractActualItemProps({...source,_source:source},parsed));
    requireValue(!report.mismatches.some(row=>row.label==="Rarities"),"Rarity comparison differs.");
    const update = ItemData.prepareExistingItemUpdate(parsed.item.itemData);
    requireValue(same(update.system.rarities,values), "Existing-Item update lost the rarity set.");
    if (globalThis.CONFIG?.Item?.documentClass) {
      const native = new CONFIG.Item.documentClass(source,{strict:true});
      native.updateSource({"system.rarities":["legendary"]});
      native.updateSource(update);
      requireValue(same(native.toObject().system.rarities,values),"Native existing-Item update did not change rarities.");
    }
  });
  await test("Singular rarity remains an unambiguous compatibility input",async()=>{
    const doc={WEAPON:{ITEM:{Name:"Legacy rarity",Rarity:"very rare","Weapon Type":"simpleM","Base Weapon":"club"},DAMAGE:{DAMAGE_DATA:{"Dice Count":1,"Die Denomination":4,"Damage Types":["bludgeoning"]}}}};
    const legacy=await build(doc);
    requireValue(same(legacy.item.itemData.system.rarities,["veryRare"]),"Legacy rarity was lost.");
    doc.WEAPON.ITEM.Rarities=["veryRare"];
    requireValue((await build(doc)).success,"Equivalent rarity declarations rejected.");
    for(const rarities of [[],["common"],["rare","veryRare"],"rare",["imaginary"]]) {
      doc.WEAPON.ITEM.Rarities=rarities;
      requireValue(!new YamlItemParser().parse(yaml.dump(doc)).success,"Conflicting or invalid rarity declarations accepted.");
    }
  });
  await test("Stored descriptions, rarity and damage remain independent of prepared values",async()=>{
    const source={name:"Stored blade",type:"weapon",system:{description:{value:"<p>Stored description</p>",chat:"Stored chat"},unidentified:{name:"Unknown blade",description:"<p>Unknown</p>"},rarities:["rare","legendary"],damage:{base:cloneExplicit(DAMAGE)},type:{value:"simpleM",baseItem:"club"}}};
    const live={...cloneExplicit(source),_source:source};
    live.name="Unknown blade";live.system.description.value="Prepared description";live.system.rarities=["common"];live.system.damage.base.modifiers=[];
    const result=await build(itemToStrictYamlDocument(live));
    for(const path of ["name","system.description","system.unidentified","system.rarities","system.damage.base"]) requireValue(same(readPath(result.item.itemData,path),readPath(source,path)),"Prepared export overwrote "+path);
  });
  await test("Damage modifier defaults and invalid modifier values",async()=>{
    const doc=itemToStrictYamlDocument({name:"Modifiers",type:"weapon",system:{damage:{base:cloneExplicit(DAMAGE)},type:{value:"simpleM",baseItem:"club"}}});
    requireValue(same(doc.WEAPON.DAMAGE.DAMAGE_DATA.Modifiers,DAMAGE.modifiers),"Modifier list lost.");
    doc.WEAPON.DAMAGE.DAMAGE_DATA.Modifiers=[123];
    requireValue(!new YamlItemParser().parse(yaml.dump(doc)).success,"Non-string modifier accepted.");
    delete doc.WEAPON.DAMAGE.DAMAGE_DATA.Modifiers;
    requireValue(same((await build(doc)).item.itemData.system.damage.base.modifiers,[]),"Legacy damage modifier default is not empty.");
  });
  await test("Item attachment creation preserves mixed reference order and rolls back only new effects",async()=>{
    for(const fail of [false,true]) {
      const reference={_id:"ExistingEffect01",level:{min:0,max:4},onSave:false};
      const embedded={success:true,effectData:{_id:"NewInlineEffect1",name:"Inline",type:"base",origin:null},applicationData:{level:{min:1,max:5},onSave:true}};
      const result={success:true,resultType:"activity",activityType:"save",activityData:{_id:"NewSaveActivity1",type:"save",name:"Save",effects:[reference]},embeddedEffectResults:[embedded],appliedEffectOrder:[{kind:"embedded",index:0},{kind:"reference",index:0}]};
      const original=JSON.stringify(result),effects=new Map([[reference._id,{id:reference._id,type:"base"}]]),activities=new Map();
      let received=null;
      const target={name:"Target",type:"weapon",uuid:"Item.Target0000000001",effects,system:{activities},
        createEmbeddedDocuments:async(type,sources)=>sources.map(source=>{const effect={...cloneExplicit(source),id:source._id};effects.set(effect.id,effect);return effect;}),
        createActivity:async(type,source)=>{received=cloneExplicit(source);if(fail)throw new Error("Injected activity creation failure");activities.set(source._id,{id:source._id,...cloneExplicit(source)});},
        deleteEmbeddedDocuments:async(type,ids)=>ids.forEach(id=>effects.delete(id)),deleteActivity:async id=>activities.delete(id)};
      const harness=Object.create(ItemData.prototype);
      harness.collectActivityResults=async()=>({results:[result],issues:[],blockingIssues:[]});
      harness.planInlineActivityResults=async results=>({results,issues:[],supported:false,success:true});
      harness.validateInlineActivitySchemas=async()=>[];
      harness.applyIconFallback=async()=>{};
      const outcome=await harness.applyActivities(target);
      requireValue(same(received?.effects,[{_id:embedded.effectData._id,...embedded.applicationData},reference]),"Native effect profile order or data was replaced.");
      requireValue(JSON.stringify(result)===original,"Attachment creation changed the parsed input.");
      requireValue(effects.has(reference._id),"Existing referenced effect was deleted.");
      if(fail)requireValue(activities.size===0&&effects.size===1&&outcome.issues.some(issue=>issue.includes("Injected")),"Failed activity did not roll back only the new effect.");
      else requireValue(outcome.addedActivities===1&&outcome.addedEffects===1&&effects.get(embedded.effectData._id).origin===null,"Successful attachment lost counts or explicit null origin.");
    }
  });
  await test("Missing applied-effect references fail before any attachment creation",async()=>{
    const harness=Object.create(ItemData.prototype);harness.validateInlineActivitySchemas=async()=>[];
    const issues=await harness.preflightInlineActivityPlan([{success:true,activityType:"save",activityData:{name:"Missing",effects:[{_id:"MissingEffect001"}]},embeddedEffectResults:[]}],{type:"weapon",effects:new Map(),system:{activities:new Map()},createActivity(){throw new Error("Must not create");}});
    requireValue(issues.some(issue=>issue.includes("must resolve")),"Missing effect reference escaped preflight.");
  });
  await test("Malformed effect order metadata and unsupported effect profiles fail before writes",async()=>{
    const harness=Object.create(ItemData.prototype);harness.validateInlineActivitySchemas=async()=>[];
    const target={type:"weapon",effects:new Map(),system:{activities:new Map()},createActivity(){throw new Error("Must not create");}};
    const effect={success:true,effectData:{_id:"NewInlineEffect1",type:"base"}};
    for(const order of [[{kind:"embedded",index:0},{kind:"embedded",index:0}],[{kind:"unknown",index:0}],[{kind:"embedded",index:-1}],[{kind:"embedded",index:1}]]) {
      const issues=await harness.preflightInlineActivityPlan([{success:true,activityType:"save",activityData:{name:"Malformed order",effects:[]},embeddedEffectResults:[effect],appliedEffectOrder:order}],target);
      requireValue(issues.some(issue=>issue.includes("ordering")),"Malformed profile ordering escaped preflight.");
    }
    for(const activityType of ["cast","forward"]) {
      const issues=await harness.preflightInlineActivityPlan([{success:true,activityType,activityData:{name:"Unsupported",effects:[{_id:"MissingEffect001"}]},embeddedEffectResults:[]}],target);
      requireValue(issues.some(issue=>issue.includes("do not support applied effects")),"Unsupported effect reference escaped preflight.");
    }
  });
  await test("Full export excludes prepared-only activities and retains stored source collections",async()=>{
    const activity={_id:"StoredActivity01",name:"Stored",type:"utility",effects:[]};
    const source={name:"Stored activities",type:"weapon",system:{type:{value:"simpleM",baseItem:"club"},activities:{[activity._id]:activity}}};
    const prepared={...cloneExplicit(source),_source:source};
    prepared.system.activities=new Map([[activity._id,activity],["GeneratedOnly001",{_id:"GeneratedOnly001",name:"Generated",type:"utility",effects:[]}]]);
    const serialized=[];
    const activityImporterApi={serializeActivity:entry=>{serialized.push(entry._id);return {schemaVersion:3,kind:"strict-activity",rawData:{ACTIVITY_UTILITY:{ACTIVITY:{Name:entry.name}}}};}};
    for(const input of [prepared,source]) {
      serialized.length=0;
      const document=itemToStrictYamlDocument(input,{activityImporterApi});
      requireValue(same(serialized,[activity._id])&&document.WEAPON.Activities.length===1,"Prepared or keyed-source activities exported incorrectly.");
    }
  });
  await test("Full Item export shares one local effect definition across multiple Activity references",async()=>{
    const effect={_id:"SharedEffect0001",name:"Shared",type:"base"};
    const activities=[{_id:"SharedSave000001",type:"save",name:"First",effects:[{_id:effect._id,onSave:false,level:{min:0,max:0}}]},
      {_id:"SharedSave000002",type:"save",name:"Second",effects:[{_id:effect._id,onSave:true,level:{min:1,max:null}}]}];
    const source={name:"Shared topology",type:"weapon",system:{type:{value:"simpleM",baseItem:"club"},activities},effects:[effect]};
    const calls=[];
    const activityImporterApi={serializeActivity:(activity,options)=>{
      calls.push(options.effectReferenceIds);
      return {schemaVersion:3,kind:"strict-activity",serializedEffectIds:[],rawData:{ACTIVITY_SAVE:{ACTIVITY:{Name:activity.name},APPLIED_EFFECTS:activity.effects.map(profile=>({"Effect ID":profile._id,APPLICATION:{"Level Minimum":profile.level.min,"Level Maximum":profile.level.max,"On Save":profile.onSave}}))}}};
    },serializeEffect:entry=>({schemaVersion:3,kind:"strict-effect",rawData:{EFFECT:{DETAILS:{Name:entry.name,"Effect ID":entry._id}}}})};
    const document=itemToStrictYamlDocument(source,{activityImporterApi});
    requireValue(calls.every(ids=>same(ids,[effect._id])),"Shared effect IDs were not passed to the canonical serializer.");
    requireValue(document.WEAPON.effects.length===1&&document.WEAPON.effects[0].DETAILS["Effect ID"]===effect._id,"Shared local definition was lost or duplicated.");
    requireValue(document.WEAPON.Activities.every(raw=>raw.ACTIVITY_SAVE.APPLIED_EFFECTS[0]["Effect ID"]===effect._id),"Shared local reference was lost.");
    requireValue(document.WEAPON.Activities[0].ACTIVITY_SAVE.APPLIED_EFFECTS[0].APPLICATION["Level Minimum"]===0&&document.WEAPON.Activities[0].ACTIVITY_SAVE.APPLIED_EFFECTS[0].APPLICATION["On Save"]===false,"False/zero application settings were lost.");
  });
  await test("Item creation retains references to one later planned shared effect",async()=>{
    const effect={_id:"SharedEffect0001",name:"Shared",type:"base",origin:null};
    const results=[0,1].map(index=>({success:true,resultType:"activity",activityType:"save",activityData:{_id:index?"SharedSave000002":"SharedSave000001",type:"save",name:"Shared "+index,effects:[{_id:effect._id,onSave:index===1,level:{min:index,max:index?null:0}}]},embeddedEffectResults:[]}));
    results.push({success:true,resultType:"effect",effectData:effect});
    const effects=new Map(),activities=new Map();
    const target={name:"Shared",type:"weapon",uuid:"Item.SharedOwner00001",effects,system:{activities},
      createActivity:async(type,source)=>activities.set(source._id,{id:source._id,...cloneExplicit(source)}),
      createEmbeddedDocuments:async(type,sources)=>sources.map(source=>{const effect={id:source._id,...cloneExplicit(source)};effects.set(effect.id,effect);return effect;}),
      deleteActivity:async id=>activities.delete(id),deleteEmbeddedDocuments:async(type,ids)=>ids.forEach(id=>effects.delete(id))};
    const harness=Object.create(ItemData.prototype);harness.collectActivityResults=async()=>({results,issues:[],blockingIssues:[]});
    harness.planInlineActivityResults=async results=>({results,issues:[],supported:false,success:true});harness.validateInlineActivitySchemas=async()=>[];harness.applyIconFallback=async()=>{};
    const result=await harness.applyActivities(target);
    requireValue(result.issues.length===0&&result.addedActivities===2&&result.addedEffects===1&&effects.size===1,"Shared effect creation failed or duplicated definitions.");
    for(const planned of results.slice(0,2))requireValue(same(activities.get(planned.activityData._id).effects,planned.activityData.effects),"Planned shared reference metadata changed during creation.");
  });
  return {passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,total:results.length,results};
}
