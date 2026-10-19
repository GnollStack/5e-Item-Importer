import { exportAutomation } from "./automationFields.js";

const values = collection => collection?.values ? [...collection.values()] : Array.isArray(collection) ? collection : [];
const dataOf = document => document?._source ?? document;
const idOf = document => document?.id ?? document?._id;
const identifierOf = document => (document?.identifier ?? dataOf(document)?.midiProperties?.identifier)
    || dataOf(document)?.name?.slugify?.() || "";

/** Storage dependencies, independent of macro/condition execution. Flags survive without their provider. */
export function automationDependencyIssues(source, type) {
    try {
        const section = exportAutomation(source, "activity", type);
        if (Object.keys(section["midi-qol"]?.fields ?? {}).length && !globalThis.game?.modules?.get?.("midi-qol")?.active)
            return ["MIDI-QOL must be active to import this Activity's automation fields; the native model would discard them."];
        return [];
    } catch (error) { return [error.message]; }
}

/** Resolve documented MIDI links, never references inside arbitrary command/expression text. No writes. */
export async function validateAutomationReferences(results, item, { advisoryOnly = false, resolveUuid = globalThis.fromUuid } = {}) {
    const findings = [];
    const planned = (results ?? []).filter(result => result?.activityData).map(result => result.activityData);
    const activities = [...values(item?.system?.activities), ...planned];
    const effects = [...values(item?.effects), ...(results ?? []).flatMap(result =>
        [result.effectData, ...(result.embeddedEffectResults ?? []).map(entry => entry.effectData)].filter(Boolean))];
    const edges = new Map(activities.map(activity => [activity, new Set()]));
    // Include stored chains so a new link cannot close a cycle through an existing activity.
    for (const activity of activities) {
        const source = dataOf(activity);
        for (const reference of [source?.otherActivityId, source?.midiProperties?.triggeredActivityId, source?.activity?.id]) {
            if (!reference || reference === "none") continue;
            const target = activities.find(candidate => idOf(candidate) === reference || identifierOf(candidate) === reference);
            if (target) edges.get(activity).add(target);
        }
    }
    for (const [resultIndex, result] of (results ?? []).entries()) {
        const activity = result?.activityData;
        if (!activity) continue;
        const add = (message, path, code = "automation-link-invalid") => findings.push({
            severity: advisoryOnly ? "warning" : "error", code, message, resultIndex, path: "activityData." + path });
        for (const message of automationDependencyIssues(activity, result.activityType)) add(message, "AUTOMATION", "automation-dependency");
        const resolveActivity = async (reference, path, external = false, identifierOnly = false) => {
            if (reference === undefined || reference === null || reference === "" || reference === "none") return null;
            let matches = identifierOnly ? [] : activities.filter(candidate => idOf(candidate) === reference);
            if (!matches.length) matches = activities.filter(candidate => identifierOf(candidate) === reference);
            if (!matches.length && external && typeof reference === "string" && reference.includes(".")) {
                try {
                    const document = await resolveUuid?.(reference, { relative: item });
                    if (document?.item && document?.type && document.item.system?.activities?.get?.(document.id) === document) matches = [document];
                } catch { /* Report unresolved references below. */ }
            }
            if (matches.length !== 1) {
                add(`${activity.name || result.activityType}: ${path} ${JSON.stringify(reference)} is ${matches.length ? "ambiguous" : "unresolved"}.`, path);
                return null;
            }
            const target = matches[0];
            if (edges.has(target)) edges.get(activity)?.add(target);
            return target;
        };
        const other = await resolveActivity(activity.otherActivityId, "otherActivityId");
        if (other?.isOtherActivityCompatible === false) add("The referenced Other Activity is not compatible with that workflow.", "otherActivityId");
        const triggered = await resolveActivity(activity.midiProperties?.triggeredActivityId, "midiProperties.triggeredActivityId", true);
        if (triggered?.isTriggerableActivity === false || (triggered?.type ?? dataOf(triggered)?.type) === "forward")
            add("The referenced Activity cannot be triggered by MIDI.", "midiProperties.triggeredActivityId");
        for (const [index, rule] of (activity.regionBehavior?.rules ?? []).entries()) {
            const path = `regionBehavior.rules.${index}.targetId`;
            if (!rule.targetId) { if (activity.regionBehavior.enabled) add("An enabled area rule needs a target.", path); continue; }
            if (rule.action === "useActivity") await resolveActivity(rule.targetId, path, false, true);
            else if (rule.action === "applyEffect" && !effects.some(effect => idOf(effect) === rule.targetId)) add("Area rule references an unavailable Item effect.", path);
        }
        // Ammunition is an owned Item ID in the attack usage configuration, not an arbitrary UUID.
        if (activity.ammunition && !item?.actor?.items?.get?.(activity.ammunition))
            add("Stored ammunition selection requires the referenced Item on the owning Actor.", "ammunition");
    }
    const visiting = new Set(), visited = new Set();
    const visit = id => {
        if (visiting.has(id)) return true;
        if (visited.has(id)) return false;
        visiting.add(id);
        for (const target of edges.get(id) ?? []) if (visit(target)) return true;
        visiting.delete(id); visited.add(id); return false;
    };
    if (planned.some(visit)) findings.push({ severity: advisoryOnly ? "warning" : "error", code: "automation-link-cycle",
        message: "MIDI Activity links contain a cycle; remove the recursive chain before importing.", path: "activityData.AUTOMATION" });
    return findings;
}
