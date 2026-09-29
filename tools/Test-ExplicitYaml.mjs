#!/usr/bin/env node
/** Pure parser/serializer checks. Live schema and creation checks use MCP diagnostics. */
import vm from "node:vm";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTemplateCompleteness } from "./Test-TemplateCompleteness.mjs";

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
const explicit=await api("tests/unit/explicitYamlTests.js");
const reports=[await explicit[itemModule?"runExplicitItemYamlTests":"runExplicitActivityYamlTests"]()];
if(itemModule)reports.push(await (await api("tests/unit/itemCoreFeatureTests.js")).runItemCoreFeatureTests({log:false}));
const yaml=(await api("scripts/vendor/js-yaml.mjs")).default;
const diagnostics=itemModule?null:await api("scripts/activityDiagnostics.js");
const parser=itemModule?null:await api("scripts/activityParsers/yamlParser.js");
const templateResults=[];
for(const folder of itemModule?["YAML Templates"]:["Base Activity Templates","Midi QOL Activity Templates"]) {
 const dir=path.join(root,"templates",folder);
 for(const file of await fs.readdir(dir)) {
   if(!file.endsWith(".md"))continue;
   const text=await fs.readFile(path.join(dir,file),"utf8");
   const block=text.match(/\x60\x60\x60yaml\s*\n([\s\S]*?)\x60\x60\x60/)?.[1];
   if(!block)continue;
   try {
     yaml.load(block);
     if(diagnostics) {
       const hydrated=diagnostics.hydrateTemplateYaml(block);
       if(hydrated.remainingPlaceholders.length)throw new Error("Unfilled placeholders: "+hydrated.remainingPlaceholders.join(", "));
       const results=parser.parseAllBlocksYaml(hydrated.yaml);
       if(results.some(r=>!r.success))throw new Error(results.flatMap(r=>r.errors).join("; "));
     }
     templateResults.push({name:file,passed:true});
   } catch(error) {templateResults.push({name:file,passed:false,details:{error:error.message}});}
 }
}
const completeness=await runTemplateCompleteness({root,api,yaml,moduleId:manifest.id});
const results=[...reports.flatMap(r=>r.results),...templateResults,...completeness.results];
const failed=results.filter(r=>!r.passed);
console.log(JSON.stringify({module:manifest.id,scope:"In-memory parser/serializer and template tests; native Foundry validation runs separately.",passed:results.length-failed.length,failed:failed.length,total:results.length,failures:failed},null,2));
process.exitCode=failed.length?1:0;
