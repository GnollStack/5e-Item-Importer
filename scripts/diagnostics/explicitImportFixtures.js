/** Fixed, marked creation fixtures for the existing gated automation action. */
import yaml from "../vendor/js-yaml.mjs";
import { YamlItemParser } from "../strictItemParsers/yamlItemParser.js";
import { itemToStrictYamlDocument } from "../itemYamlExporter.js";
import { cloneExplicit, readPath } from "../explicitYamlFields.js";
const DAMAGE = {number:2,denomination:6,bonus:"@mod",types:["fire","cold"],custom:{enabled:false,formula:"3 + @mod"},scaling:{mode:"whole",number:0,formula:"@prof"}};
function stable(value) {
  value=cloneExplicit(value);
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export async function createExplicitItemFixtures(makeMarker) {
  const steps=[];
  for (const type of ["weapon","equipment","consumable","tool","loot","container","spell"]) {
    const marker=makeMarker("Explicit " + type);
    const source={name:marker.fixtureName,type,img:"icons/svg/book.svg",sort:0,system:{
      identifier:"explicit-" + type,source:{book:"Private fixture",page:"12a",custom:"Schema 2",license:"Private",rules:"2024",revision:1.5},
      properties:[],quantity:1,identified:false,weight:{value:0.5,units:"lb"},price:{value:0.25,denomination:"gp"}
    }};
    const paths=["img","sort","system.identifier","system.source.book","system.source.page","system.source.custom","system.source.license","system.source.rules","system.source.revision"];
    if(!["loot","spell"].includes(type)) {
      Object.assign(source.system,{equipped:true,attuned:true,attunement:""});
      paths.push("system.equipped","system.attuned");
    }
    if(type==="weapon") {
      Object.assign(source.system,{type:{value:"siege",baseItem:""},range:{value:20.5,long:60.25,reach:5.5,units:"ft"},damage:{base:cloneExplicit(DAMAGE),versatile:cloneExplicit(DAMAGE)},crew:{max:3},cover:0.25,speed:{value:0,units:"m",conditions:"Stored speed"}});
      paths.push("system.range.value","system.range.long","system.range.reach","system.damage.base","system.damage.versatile","system.crew.max","system.cover","system.speed.value","system.speed.units");
    }
    if(type==="equipment") {
      Object.assign(source.system,{type:{value:"vehicle",baseItem:""},armor:{value:10,dex:null},crew:{max:4},speed:{value:30,units:"m",conditions:"Stored speed"}});
      paths.push("system.crew.max","system.speed.value","system.speed.units");
    }
    if(type==="consumable") {
      Object.assign(source.system,{type:{value:"potion",subtype:"stored"},damage:{base:cloneExplicit(DAMAGE),replace:false}});
      paths.push("system.damage.base","system.damage.replace","system.type.subtype");
    }
    if(type==="tool") {
      Object.assign(source.system,{type:{value:"art",baseItem:"alchemist"},properties:["foc"],proficient:0.5});
      paths.push("system.properties","system.proficient");
    }
    if(type==="loot") {source.system.type={value:"gear",subtype:"stored"};paths.push("system.type.subtype");}
    if(type==="spell") {
      source.system={
        identifier:source.system.identifier,source:source.system.source,properties:[],level:2,school:"evo",method:"spell",prepared:2,sourceItem:"spellcasting",
        activation:{type:"action",value:0},range:{value:"30 + @mod",units:"ft",special:"Stored range"},duration:{value:"1 + @mod",units:"minute",special:"Stored duration"},
        materials:{value:"Inactive material",consumed:false,cost:0.5,supply:1.25},
        target:{affects:{type:"creature",count:"1 + @mod",choice:false},template:{type:"cone",size:"10 + @mod",count:"1 + @mod",width:"2 + @mod",height:"3 + @mod",units:"ft",contiguous:false,stationary:true}}
      };
      paths.push("system.prepared","system.sourceItem","system.activation.value","system.range.value","system.duration.value","system.materials","system.target.template","system.target.affects.count");
    }
    const options={includeActivities:false,includeEffects:false};
    const parsed=new YamlItemParser().parse(yaml.dump(itemToStrictYamlDocument(source,options)));
    if(!parsed.success) throw new Error(type+" fixture failed parsing: "+parsed.errors.join("; "));
    await parsed.item.buildFoundryData({deterministicIcons:true});
    const data=cloneExplicit(parsed.item.itemData);
    data.flags ??= {};data.flags["5e-item-importer"] ??= {};data.flags["5e-item-importer"].mcpAutomationFixture=marker;
    const created=await CONFIG.Item.documentClass.create(data,{renderSheet:false});
    const stored=created.toObject();
    const reparsed=new YamlItemParser().parse(yaml.dump(itemToStrictYamlDocument(created,options)));
    if(!reparsed.success) throw new Error(type+" live export failed reparsing: "+reparsed.errors.join("; "));
    await reparsed.item.buildFoundryData({deterministicIcons:true});
    const checks=paths.map(path=>({path,persisted:equal(readPath(source,path),readPath(stored,path)),roundTrip:equal(readPath(source,path),readPath(reparsed.item.itemData,path))}));
    steps.push({step:"explicit-"+type,success:checks.every(c=>c.persisted&&c.roundTrip),itemId:created.id,checks});
    if(type==="weapon")steps.push(await createExplicitInlineFixtures(parsed.item,created));
  }
  return steps;
}

async function createExplicitInlineFixtures(parsedItem,created) {
  const api=game.modules.get("5e-activity-importer")?.active ? game.modules.get("5e-activity-importer").api : null;
  if(!api)return {step:"explicit-inline-attachments",success:true,skipped:true,reason:"Optional companion is inactive."};
  const id=name=>name.padEnd(16,"0").slice(0,16);
  const effect=(name,type="base")=>({_id:id(name),name,type,img:"icons/svg/aura.svg",origin:created.uuid,sort:0,showIcon:0,disabled:false,transfer:false,tint:"#123456",statuses:["poisoned","prone","blinded"],
    duration:{value:2,units:"hours",expiry:"turnEnd",expired:false},start:{combat:null,combatant:null,initiative:0.5,round:0,turn:0,time:0},
    system:{changes:[0,false,"",null,[],{},["one",0,false],{bonus:0,enabled:false}].map(value=>({key:"system.attributes.ac.bonus",type:"override",value,phase:"final",priority:0.5}))}});
  const standalone=effect("InlineTyped");
  const saved=effect("InlineSaved");
  const enchanted=effect("InlineEnchanted","enchantment");
  const save={_id:id("InlineSave"),type:"save",name:"Inline Save",sort:0,consumption:{spellSlot:false},effects:[{_id:saved._id,level:{min:0,max:5},onSave:false}]};
  const enchant={_id:id("InlineEnchant"),type:"enchant",name:"Inline Enchant",sort:0,effects:[{_id:enchanted._id,level:{min:0,max:5},riders:{activity:[save._id],effect:[standalone._id],item:[created.uuid]}}]};
  const descriptors=[api.serializeEffect(standalone),api.serializeActivity(save,{linkedEffects:[saved]}),api.serializeActivity(enchant,{linkedEffects:[enchanted]})];
  parsedItem.pendingActivities=descriptors.map(descriptor=>({key:Object.keys(descriptor.rawData)[0],rawData:descriptor.rawData}));
  const result=await parsedItem.applyActivities(created);
  const checks=[];
  for(const expected of [standalone,saved,enchanted]){
    const actual=created.effects.get(expected._id)?._source;
    for(const path of ["_id","type","img","origin","sort","showIcon","disabled","transfer","tint","statuses","duration","start","system.changes"])
      checks.push({path:expected.name+"."+path,persisted:equal(readPath(expected,path),readPath(actual,path))});
  }
  for(const expected of [save,enchant]){
    const actual=created.system.activities.get(expected._id)?._source;
    checks.push({path:expected.name+".effects",persisted:equal(expected.effects,actual?.effects)});
    checks.push({path:expected.name+".sort",persisted:actual?.sort===0});
  }
  const exported=itemToStrictYamlDocument(created,{includeActivities:false,includeEffects:true});
  const reparsed=new YamlItemParser().parse(yaml.dump(exported));
  const raw=reparsed.item?.pendingActivities?.find(entry=>entry.key==="EFFECT"&&entry.rawData?.EFFECT?.DETAILS?.Name===standalone.name)?.rawData;
  const roundTrip=raw ? api.parseAll(yaml.dump(raw))[0] : null;
  checks.push({path:"inline effect Item export -> companion reparse",persisted:roundTrip?.success===true&&equal(roundTrip.effectData.system.changes,standalone.system.changes)&&equal(roundTrip.effectData.duration,standalone.duration)});
  return {step:"explicit-inline-attachments",success:result.addedActivities===2&&result.addedEffects===3&&checks.every(check=>check.persisted),result,checks};
}

