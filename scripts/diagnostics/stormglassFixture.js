/** Exact user-facing sample exercised through the real Item creation workflow. */
import yaml from "../vendor/js-yaml.mjs";
import { YamlItemParser } from "../strictItemParsers/yamlItemParser.js";
import { cloneExplicit } from "../explicitYamlFields.js";
import { extractExpectedItemProps, extractActualItemProps } from "../ui/itemComparisonExtractor.js";
import { compareProperties } from "../ui/itemComparisonEngine.js";

export async function createStormglassFixture(makeMarker) {
  const api=game.modules.get("5e-activity-importer")?.active ? game.modules.get("5e-activity-importer").api : null;
  if(!api)throw new Error("The Stormglass integration fixture requires active Activity Importer.");
  const response=await fetch("modules/5e-item-importer/tests/fixtures/stormglass-requiem.yaml");
  if(!response.ok)throw new Error("The source-only Stormglass fixture is unavailable.");
  const text=await response.text();
  const parsed=new YamlItemParser().parse(text);
  if(!parsed.success)throw new Error(parsed.errors.join("; "));
  const attachments=parsed.item.pendingActivities.flatMap(entry=>api.parseAll(yaml.dump(entry.rawData)));
  const ids=attachments.flatMap(entry=>[entry.activityData?._id,...(entry.embeddedEffectResults??[]).map(effect=>effect.effectData?._id)]);
  if(ids.length!==4||ids.some(id=>!(/^[A-Za-z0-9]{16}$/).test(id)))throw new Error("Sample contains an invalid activity/effect ID.");
  const marker=makeMarker("Stormglass Requiem");
  parsed.item.name=marker.fixtureName;
  parsed.item.explicitSource.flags={"5e-item-importer":{mcpAutomationFixture:marker}};
  const result=await parsed.item.createItem5e(null,{deterministicIcons:true,generateAnimations:false});
  if(!result.success||!result.item)throw new Error(result.issues?.join("; ")||"Stormglass creation failed.");
  const created=result.item;
  const report=compareProperties(extractExpectedItemProps(parsed),extractActualItemProps(created,parsed));
  const activities=[...created.system.activities.values()];
  const effects=[...created.effects.values()];
  const linksValid=attachments.every(expected=>{
    const actual=created.system.activities.get(expected.activityData._id);
    const link=actual?._source.effects?.[0];
    return actual && link?._id===expected.embeddedEffectResults[0].effectData._id
      && created.effects.has(link._id)
      && (actual.type!=="save" || link.onSave===false);
  });
  return {
    step:"stormglass-exact-yaml-workflow",
    success:result.activityResults?.addedActivities===2&&result.activityResults?.addedEffects===2
      && activities.length===2&&effects.length===2&&linksValid&&!result.issues.length
      && report.mismatches.length===0&&report.missing.length===0&&report.extra.length===0,
    itemId:created.id,activityCount:activities.length,effectCount:effects.length,
    ids:cloneExplicit(ids),linksValid,issues:result.issues,comparison:report
  };
}
