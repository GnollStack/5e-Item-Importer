#!/usr/bin/env node
/** Pure parser/serializer checks. Live schema and creation checks use MCP diagnostics. */
import vm from "node:vm";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { concreteExample, inspectConcreteDocuments } from "./template-authoring.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await fs.readFile(path.join(root,"module.json"),"utf8"));
const itemModule=manifest.id==="5e-item-importer";
const catalog=itemModule?JSON.parse(await fs.readFile(path.join(root,"lang/en.json"),"utf8")):{};
const getProperty=(value,key)=>key.split(".").reduce((o,k)=>o?.[k],value);
const setProperty=(value,key,entry)=>{const keys=key.split(".");let o=value;for(const k of keys.slice(0,-1))o=o[k]??={};o[keys.at(-1)]=entry;return true;};
const localize=key=>getProperty(catalog,key)??key;
const quiet={log(){},warn(){},error(){},group(){},groupEnd(){},assert(){}};
const context=vm.createContext({
 console:quiet,Set,Map,Date,Math,URL,structuredClone,
 game:{release:{generation:14},version:"14.367",system:{id:"dnd5e",version:"5.3.3"},settings:{get(){return false;}},modules:new Map(),packs:[],
 i18n:{localize,format:(key,data={})=>String(localize(key)).replace(/\{(\w+)\}/g,(_,k)=>String(data[k]??""))}},
 CONFIG:{DND5E:{itemProperties:{},validProperties:{}}},
 foundry:{utils:{getProperty,setProperty,deepClone:structuredClone,mergeObject:(a,b)=>Object.assign(a,b)}},
 ui:{notifications:{info(){},warn(){},error(){}}},Hooks:{on(){},once(){}},Application:class {}
});
const cache=new Map();
const linker=(specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier));
async function load(file) {
 file=path.resolve(file);
 if(cache.has(file))return cache.get(file);
 const promise=fs.readFile(file,"utf8").then(code=>new vm.SourceTextModule(code,{
 context,identifier:file,importModuleDynamically:async(specifier,parent)=>{
   const module=await linker(specifier,parent);
   if(module.status==="unlinked")await module.link(linker);
   if(module.status==="linked")await module.evaluate();
   return module;
 }}));
 cache.set(file,promise);return promise;
}
async function api(file) {
 const module=await load(path.join(root,file));
 if(module.status==="unlinked")await module.link(linker);
 if(module.status==="linked")await module.evaluate();
 return module.namespace;
}

const yaml=(await api("scripts/vendor/js-yaml.mjs")).default;
const fixtures=JSON.parse(await fs.readFile(path.join(root,"tests/fixtures/template-authoring.json"),"utf8"));
const parser=await api(itemModule?"scripts/strictItemParsers/yamlItemParser.js":"scripts/activityParsers/yamlParser.js");
const types=itemModule?["weapon","equipment","consumable","tool","container","loot","spell"]:["attack","save","damage","heal","utility","check","cast","enchant","summon","transform","forward","effect"];
for(const type of types) for(const midi of itemModule?[false]:[false,true]) {
 if(fixtures.filter(f=>f.template&&f.type===type&&f.midi===midi).length!==1)throw new Error("Expected one template example for "+type+" MIDI="+midi);
}
const exampleFiles=(await fs.readdir(path.join(root,"docs/examples"))).filter(name=>name.endsWith(".yaml")).sort();
if(JSON.stringify(exampleFiles)!==JSON.stringify(fixtures.map(f=>path.basename(f.file)).sort()))throw new Error("Example manifest/file inventory mismatch.");
const results=[];
for(const fixture of fixtures) {
 const issues=[];
 if(!fixture.intent?.trim()||!fixture.prerequisite?.trim()||!fixture.facts?.length)issues.push({code:"missing-example-contract"});
 try {
  const text=await fs.readFile(path.join(root,fixture.file),"utf8");
  const documents=yaml.loadAll(text).filter(Boolean);
  issues.push(...inspectConcreteDocuments(documents));
  if(fixture.template) {
   const markdown=await fs.readFile(path.join(root,fixture.template),"utf8");
   if(concreteExample(markdown).replaceAll("\r\n","\n")!==text.trim().replaceAll("\r\n","\n"))issues.push({code:"embedded-example-drift"});
  }
  context.game.modules.set("midi-qol",{active:fixture.midi});
  context.game.modules.set("dae",{active:fixture.midi});
  context.game.modules.set("5e-activity-importer",{active:!!fixture.attachments});
  const parsed=itemModule?[new parser.YamlItemParser().parse(text)]:parser.parseAllBlocksYaml(text);
  if(itemModule && parsed[0].success) {
   await parsed[0].item.buildFoundryData({deterministicIcons:true,generateAnimations:false});
   parsed[0].built=parsed[0].item.itemData;
   parsed[0].attachments=parsed[0].item.pendingActivities;
   if(parsed[0].attachments.length!==(fixture.attachments??0))issues.push({code:"attachment-count",actual:parsed[0].attachments.length,expected:fixture.attachments??0});
  }
  if(parsed.some(value=>!value.success))issues.push({code:"parse-failed",details:parsed});
  const names=parsed.map(value=>value.activityData?.name??value.effectData?.name??value.item?.name??value.name);
  if(JSON.stringify(names)!==JSON.stringify(fixture.expectedNames))issues.push({code:"wrong-names",names,expected:fixture.expectedNames});
  const warnings=parsed.flatMap(value=>value.warnings??[]);
  if(warnings.length)issues.push({code:"unexpected-warnings",warnings});
  for(const fact of fixture.facts??[]) {
   const actual=getProperty(parsed,fact.path);
   if(JSON.stringify(actual)!==JSON.stringify(fact.value))issues.push({code:"intent-mismatch",path:fact.path,expected:fact.value,actual});
  }
  if(process.env.TEMPLATE_AUTHORING_CAPTURE)await fs.writeFile(path.join(process.env.TEMPLATE_AUTHORING_CAPTURE,fixture.id+".json"),JSON.stringify(parsed,null,2)+"\n");
 } catch(error) {issues.push({code:"example-error",message:error.message});}
 results.push({name:fixture.id,passed:!issues.length,issues});
}
const failed=results.filter(result=>!result.passed);
console.log(JSON.stringify({module:manifest.id,scope:"Authored examples and semantic assertions; no native Foundry validation or independent LLM trial.",total:results.length,passed:results.length-failed.length,failed:failed.length,failures:failed},null,2));
process.exitCode=failed.length?1:0;
