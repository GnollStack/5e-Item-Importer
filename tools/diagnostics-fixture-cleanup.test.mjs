import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

async function harness() {
  const items = new Map();
  const context = vm.createContext({game:{items,world:{id:"test-world"}},CONFIG:{Item:{documentClass:{
    deleteDocuments:async ids=>ids.forEach(id=>items.delete(id))
  }}}});
  const source = await fs.readFile(new URL("../scripts/diagnosticsAutomation.js",import.meta.url),"utf8");
  const module = new vm.SourceTextModule(source,{context});
  await module.link(specifier => {
    const values = specifier.endsWith("itemConfig.js") ? {MODULE_NAME:"5e-item-importer"}
      : specifier.endsWith("itemUtils.js") ? {ItemUtils:{randomID:()=>"generated-run"}}
      : {parseItemText:()=>{throw new Error("Cleanup must not invoke parsing.");}};
    return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});
  });
  await module.evaluate();
  const prefix = module.namespace.FIXTURE_PREFIX;
  const add = (id,{name="Unknown item",sourceName=`${prefix} run-a Fixture`,runId="run-a",worldId="test-world",fixtureName=`${prefix} ${runId} Fixture`,flag=true}={}) => {
    items.set(id,{id,name,_source:{name:sourceName},flags:flag?{"5e-item-importer":{mcpAutomationFixture:{runId,worldId,fixtureName}}}:{}});
  };
  return {items,api:module.namespace,add};
}

test("Native unidentified display names do not hide marked fixture sources",async()=>{
  const {api,add}=await harness();add("unidentified");
  assert.equal(api.getFixtureCounts().total,1);
});

test("Renamed fixture recovery requires an exact run and a canonical current-world marker",async()=>{
  const {items,api,add}=await harness();
  add("renamed",{sourceName:"Renamed fixture"});
  add("other-run",{runId:"run-b",sourceName:"Renamed fixture"});
  add("other-world",{worldId:"other-world",sourceName:"Renamed fixture"});
  add("bad-marker",{fixtureName:"5E-ITEM-IMPORTER-MCP-FIXTURE wrong-run Fixture",sourceName:"Renamed fixture"});
  add("unmarked",{flag:false});
  assert.equal(api.getFixtureCounts().total,0);
  assert.deepEqual(Array.from(api.getFixtureCounts("run-a").itemIds),["renamed"]);
  assert.equal((await api.cleanupItemImporterFixtures({confirmMutation:true,runId:"run-a"})).deleted,1);
  assert.deepEqual([...items.keys()],["other-run","other-world","bad-marker","unmarked"]);
});
