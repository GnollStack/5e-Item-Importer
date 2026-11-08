/** Fixed, marked creation fixtures for the existing gated automation action. */
import yaml from "../vendor/js-yaml.mjs";
import { YamlItemParser } from "../strictItemParsers/yamlItemParser.js";
import { itemToStrictYamlDocument } from "../itemYamlExporter.js";
import { ItemData } from "../itemData.js";
import { cloneExplicit, readPath } from "../explicitYamlFields.js";
import { isPhysicalItemType } from "../itemConfig.js";
const DAMAGE = {number:2,denomination:6,bonus:"@mod",types:["fire","cold"],custom:{enabled:false,formula:"3 + @mod"},modifiers:["min3","r1"],scaling:{mode:"whole",number:0,formula:"@prof"}};
function stable(value) {
  value=cloneExplicit(value);
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export async function createExplicitItemFixtures(makeMarker) {
  const steps=[];
  for (const type of ["weapon","equipment","consumable","tool","loot","container","spell","feat"]) {
    const marker=makeMarker("Explicit " + type);
    const source={name:marker.fixtureName,type,img:"icons/svg/book.svg",sort:0,system:{
      identifier:"explicit-" + type,source:{book:"Private fixture",page:"12a",custom:"Schema 3",license:"Private",rules:"2024",revision:1.5},
      properties:[],rarities:type==="loot"?[]:["rare","veryRare"],description:{value:"<p>Stored complete description</p>",chat:"<p>Stored chat description</p>"},unidentified:{name:"Unknown fixture",description:"<p>Stored unidentified description</p>"},quantity:1,identified:false,weight:{value:0.5,units:"lb"},price:{value:0.25,denomination:"gp"}
    }};
    const paths=["img","sort","system.identifier","system.source.book","system.source.page","system.source.custom","system.source.license","system.source.rules","system.source.revision"];
    if(isPhysicalItemType(type)) paths.push("system.rarities","system.description","system.unidentified");
    if(!["loot","spell","feat"].includes(type)) {
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
        activation:{type:"action",value:0},range:{value:"30 + @mod",units:"ft",special:"Stored range"},duration:{value:"1 + @mod",units:"minute",expiry:"turnEnd",special:"Stored duration"},
        materials:{value:"Inactive material",consumed:false,cost:0.5,supply:1.25},
        target:{affects:{type:"creature",count:"1 + @mod",choice:false},template:{type:"cone",size:"10 + @mod",count:"1 + @mod",width:"2 + @mod",height:"3 + @mod",units:"ft",contiguous:false,stationary:true}}
      };
      paths.push("system.prepared","system.sourceItem","system.activation.value","system.range.value","system.duration.value","system.duration.expiry","system.materials","system.target.template","system.target.affects.count");
    }
    if(type==="feat") {
      source.system={
        identifier:source.system.identifier,source:source.system.source,description:source.system.description,
        type:{value:"class",subtype:"fightingStyle"},requirements:"Fighter 1",
        prerequisites:{level:4,items:["fighter","feat:alert"],repeatable:true},properties:["mgc","trait"],
        enchant:{max:"1 + @prof",period:"lr"},cover:0.5,crewed:true,
        uses:{spent:1,max:"@prof",recovery:[{period:"lr",type:"recoverAll"}]},
        // Literal compendium UUIDs so the fixture needs no name resolution; dnd5e keys advancement by _id.
        advancement:{
          FixtureAsi000001:{_id:"FixtureAsi000001",type:"AbilityScoreImprovement",level:0,configuration:{points:1,cap:2,fixed:{con:1},locked:["str"]},value:{}},
          FixtureGrant0001:{_id:"FixtureGrant0001",type:"ItemGrant",level:4,name:"Storm Spells",configuration:{items:[{uuid:"Compendium.dnd5e.spells24.Item.phbsplThunderwav",optional:false,sort:0}],optional:false,sorting:"m",spell:{ability:["cha"],method:"spell",prepared:2,uses:{max:"1",per:"lr",requireSlot:false}}},value:{}},
          FixtureScale0001:{_id:"FixtureScale0001",type:"ScaleValue",configuration:{identifier:"storm-dice",type:"dice",scale:{4:{number:1,faces:6,modifiers:[]},12:{number:2,faces:6,modifiers:["min2"]}}},value:{}},
          FixtureTrait0001:{_id:"FixtureTrait0001",type:"Trait",level:0,configuration:{allowReplacements:false,choices:[{count:1,pool:["skills:*"]}],grants:["skills:ath"],mode:"default"},value:{}}
        }
      };
      paths.push("system.description","system.type.value","system.type.subtype","system.requirements","system.prerequisites.level","system.prerequisites.items","system.prerequisites.repeatable","system.enchant.max","system.enchant.period","system.cover","system.crewed","system.uses.spent","system.uses.max",
        "system.advancement.FixtureAsi000001.configuration.fixed.con","system.advancement.FixtureAsi000001.configuration.locked","system.advancement.FixtureAsi000001.level",
        "system.advancement.FixtureGrant0001.name","system.advancement.FixtureGrant0001.configuration.items","system.advancement.FixtureGrant0001.configuration.spell.prepared","system.advancement.FixtureGrant0001.configuration.spell.uses.per",
        "system.advancement.FixtureScale0001.configuration.identifier","system.advancement.FixtureScale0001.configuration.scale.12.number","system.advancement.FixtureScale0001.configuration.scale.12.modifiers",
        "system.advancement.FixtureTrait0001.configuration.grants","system.advancement.FixtureTrait0001.configuration.choices");
    }
    const options={includeActivities:false,includeEffects:false};
    const parsed=new YamlItemParser().parse(yaml.dump(itemToStrictYamlDocument(source,options)));
    if(!parsed.success) throw new Error(type+" fixture failed parsing: "+parsed.errors.join("; "));
    await parsed.item.buildFoundryData({deterministicIcons:true});
    const data=cloneExplicit(parsed.item.itemData);data.name=marker.fixtureName;
    data.flags ??= {};data.flags["5e-item-importer"] ??= {};data.flags["5e-item-importer"].mcpAutomationFixture=marker;
    const created=await CONFIG.Item.documentClass.create(data,{renderSheet:false});
    const stored=created.toObject();
    const reparsed=new YamlItemParser().parse(yaml.dump(itemToStrictYamlDocument(created,options)));
    if(!reparsed.success) throw new Error(type+" live export failed reparsing: "+reparsed.errors.join("; "));
    await reparsed.item.buildFoundryData({deterministicIcons:true});
    const checks=paths.map(path=>({path,persisted:equal(readPath(source,path),readPath(stored,path)),roundTrip:equal(readPath(source,path),readPath(reparsed.item.itemData,path))}));
    steps.push({step:"explicit-"+type,success:checks.every(c=>c.persisted&&c.roundTrip),itemId:created.id,checks});
    if(isPhysicalItemType(type)) {
      for(const rarities of [[],["legendary"],["uncommon","rare"]]) {
        const updateSource=cloneExplicit(source);updateSource.system.rarities=rarities;
        const updateParsed=new YamlItemParser().parse(yaml.dump(itemToStrictYamlDocument(updateSource,options)));
        if(!updateParsed.success)throw new Error("Rarity update failed parsing.");
        await updateParsed.item.buildFoundryData({deterministicIcons:true});
        const update=ItemData.prepareExistingItemUpdate(updateParsed.item.itemData);update.name=marker.fixtureName;
        await created.update(update);
        const storedRarities=created.toObject().system.rarities;
        steps.push({step:"explicit-rarity-update-"+type,success:equal(storedRarities,rarities),itemId:created.id,rarities,storedRarities});
      }
    }
    if(type==="weapon")steps.push(await createExplicitInlineFixtures(parsed.item,created));
  }
  steps.push(...await createExplicitContainerFixtures(makeMarker));
  return steps;
}

/**
 * Nested CONTENTS: the container is created first, then its content is placed inside it
 * the way the batch workflow does (placement options on createItem5e). Both documents
 * carry the fixture flag, so the shared cleanup removes them.
 */
async function createExplicitContainerFixtures(makeMarker) {
  const steps=[];
  const packMarker=makeMarker("Explicit container pack");
  const childMarker=makeMarker("Explicit container child");
  const nested=new YamlItemParser().parseAll(yaml.dump({SCHEMA_VERSION:6,CONTAINER:{
    ITEM:{Name:packMarker.fixtureName,Rarities:[]},INVENTORY:{Quantity:1,Identified:true},
    CONTENTS:[{LOOT:{ITEM:{Name:childMarker.fixtureName,"Loot Type":"gear",Rarities:[]},INVENTORY:{Quantity:2,Identified:true}}}]
  }}));
  if(nested.length!==2||nested.some(result=>!result.success)) throw new Error("Container fixture failed parsing: "+nested.flatMap(result=>result.errors).join("; "));
  for(const [result,marker] of [[nested[0],packMarker],[nested[1],childMarker]]) {
    result.item.explicitSource ??= {};
    result.item.explicitSource.flags={"5e-item-importer":{mcpAutomationFixture:marker}};
  }
  const destination={kind:"world",folderId:null};
  const blocked=await nested[1].item.createItem5e(null,{destination,deterministicIcons:true});
  steps.push({step:"explicit-container-child-blocked-without-parent",success:blocked.success===false&&blocked.item===null&&blocked.issues.some(issue=>issue.includes("was not imported")),issues:blocked.issues});
  const pack=await nested[0].item.createItem5e(null,{destination,deterministicIcons:true});
  if(!pack.success) throw new Error("Container fixture pack failed: "+pack.issues.join("; "));
  const child=await nested[1].item.createItem5e(null,{destination,deterministicIcons:true,containerId:pack.item.id,containerFolderId:pack.item.folder?.id??null});
  const contents=child.success?[...(pack.item.system.contents??[])].map(item=>item.id):[];
  steps.push({step:"explicit-container-contents",success:child.success&&child.item.system.container===pack.item.id&&child.item.system.quantity===2&&contents.includes(child.item.id),
    packId:pack.item.id,childId:child.item?.id,contents,issues:child.issues});
  const exported=itemToStrictYamlDocument(pack.item,{includeContents:true,includeActivities:false,includeEffects:false});
  const reparsed=new YamlItemParser().parseAll(yaml.dump(exported));
  steps.push({step:"explicit-container-export-contents",success:reparsed.length===2&&reparsed.every(result=>result.success)&&reparsed[1].item.containerRef?.kind==="batch"&&reparsed[1].item.name===childMarker.fixtureName&&reparsed[1].item.quantity===2,
    names:reparsed.map(result=>result.item?.name),errors:reparsed.flatMap(result=>result.errors)});
  // An existing-container reference by UUID lands inside the same world container.
  const byUuid=new YamlItemParser().parse(yaml.dump({SCHEMA_VERSION:6,LOOT:{ITEM:{Name:childMarker.fixtureName+" by UUID","Loot Type":"gear",Rarities:[]},INVENTORY:{Quantity:1,Identified:true,Container:pack.item.uuid}}}));
  if(!byUuid.success) throw new Error("Container UUID fixture failed parsing: "+byUuid.errors.join("; "));
  byUuid.item.explicitSource ??= {};
  byUuid.item.explicitSource.flags={"5e-item-importer":{mcpAutomationFixture:{...childMarker,fixtureName:childMarker.fixtureName+" by UUID"}}};
  const placed=await byUuid.item.createItem5e(null,{destination,deterministicIcons:true});
  steps.push({step:"explicit-container-reference-uuid",success:placed.success===true&&placed.item.system.container===pack.item.id,issues:placed.issues,childId:placed.item?.id});
  // The same reference into a compendium destination is a different collection and fails before any write.
  const crossPack=game.packs.find(pack=>pack.documentName==="Item");
  if(crossPack) {
    const cross=new YamlItemParser().parse(yaml.dump({SCHEMA_VERSION:6,LOOT:{ITEM:{Name:childMarker.fixtureName+" cross","Loot Type":"gear",Rarities:[]},INVENTORY:{Quantity:1,Identified:true,Container:pack.item.uuid}}}));
    const before=crossPack.index.size;
    const rejected=await cross.item.createItem5e(null,{destination:{kind:"compendium",pack:crossPack.collection},deterministicIcons:true});
    steps.push({step:"explicit-container-cross-collection-rejected",success:rejected.success===false&&rejected.item===null&&rejected.issues.some(issue=>issue.includes("one collection"))&&crossPack.index.size===before,issues:rejected.issues,pack:crossPack.collection});
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
  const standaloneSeed=effect("InlineTyped");
  const savedSeed=effect("InlineSaved");
  const enchantedSeed=effect("InlineEnchanted","enchantment");
  const saveSeed={_id:id("InlineSave"),type:"save",name:"Inline Save",sort:0,consumption:{spellSlot:false},effects:[{_id:savedSeed._id,level:{min:0,max:5},onSave:false}]};
  const enchantSeed={_id:id("InlineEnchant"),type:"enchant",name:"Inline Enchant",sort:0,effects:[{_id:enchantedSeed._id,level:{min:0,max:5},riders:{activity:[saveSeed._id],effect:[standaloneSeed._id],item:[created.uuid]}}]};
  // Establish current native defaults and generated change IDs before export.
  // This model is ephemeral; the only persisted fixture remains `created`.
  const native=new CONFIG.Item.documentClass({_id:created.id,name:"Native inline fixture source",type:"weapon",
    system:{activities:{[saveSeed._id]:saveSeed,[enchantSeed._id]:enchantSeed}},effects:[standaloneSeed,savedSeed,enchantedSeed]},{strict:true});
  const [standalone,saved,enchanted]=[standaloneSeed,savedSeed,enchantedSeed].map(seed=>cloneExplicit(native.effects.get(seed._id)._source));
  const [save,enchant]=[saveSeed,enchantSeed].map(seed=>cloneExplicit(native.system.activities.get(seed._id)._source));
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
  const roundTripSource=roundTrip?.success ? new CONFIG.ActiveEffect.documentClass(cloneExplicit(roundTrip.effectData),{parent:created,strict:true})._source : null;
  checks.push({path:"inline effect Item export -> companion reparse",persisted:roundTrip?.success===true&&equal(roundTripSource?.system.changes,standalone.system.changes)&&equal(roundTripSource?.duration,standalone.duration)});
  return {step:"explicit-inline-attachments",success:result.addedActivities===2&&result.addedEffects===3&&checks.every(check=>check.persisted),result,checks};
}

