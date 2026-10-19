/** Shared, dependency-free helpers for native dnd5e effect profiles. */
export function buildAppliedEffectProfiles(result, createdIds = null) {
    const references = result.activityData?.effects ?? [];
    const embedded = (result.embeddedEffectResults ?? []).filter(entry => entry.success && entry.effectData);
    const ids = createdIds ?? embedded.map(entry => entry.effectData._id);
    if (ids.length !== embedded.length || ids.some(id => !id)) throw new Error("An applied effect has no created document ID.");
    const profiles = embedded.map((entry, index) => ({ _id: ids[index], ...(entry.applicationData ?? {}) }));
    const order = result.appliedEffectOrder;
    if (order === undefined) return [...references, ...profiles].map(clone);
    if (!Array.isArray(order)) throw new Error("Applied effect ordering must be a list when supplied.");
    const seen = new Set();
    const output = order.map(entry => {
        const key = `${entry?.kind}:${entry?.index}`;
        if (!["reference", "embedded"].includes(entry?.kind) || !Number.isInteger(entry.index)
            || entry.index < 0 || seen.has(key)) return null;
        seen.add(key);
        return entry.kind === "reference" ? references[entry.index] : profiles[entry.index];
    });
    if (output.some(entry => !entry) || output.length !== references.length + profiles.length) {
        throw new Error("Applied effect ordering does not match the parsed effect profiles.");
    }
    return output.map(clone);
}

/** Check references without importing or modifying their target documents. */
export async function validateAppliedEffectReferences(results, item, { advisoryOnly = false } = {}) {
    const findings = [];
    const planned = new Map();
    for (const result of results ?? []) {
        for (const effect of [result.effectData, ...(result.embeddedEffectResults ?? []).map(entry => entry.effectData)]) {
            if (effect?._id) planned.set(effect._id, effect);
        }
    }
    const resolve = async uuid => {
        const local = /^\.ActiveEffect\.([^.]+)$/.exec(uuid ?? "");
        if (local) return planned.get(local[1]) ?? item?.effects?.get?.(local[1]) ?? null;
        try { return await globalThis.fromUuid?.(uuid, { relative: item }); } catch { return null; }
    };
    for (const [resultIndex, result] of (results ?? []).entries()) {
        if (!result?.activityData) continue;
        const expectedType = result.activityType === "enchant" ? "enchantment" : "base";
        const add = (message, path) => findings.push({ severity: advisoryOnly ? "warning" : "error",
            code: "effect-link-invalid", message, resultIndex, path });
        for (const [index, profile] of (result.activityData.effects ?? []).entries()) {
            const path = `activityData.effects.${index}`;
            const effect = profile.uuid ? await resolve(profile.uuid)
                : planned.get(profile._id) ?? item?.effects?.get?.(profile._id);
            const actualType = effect?.type ?? effect?._source?.type ?? "base";
            const validDocument = profile.uuid
                ? effect?.documentName === "ActiveEffect" && !effect.parent && !effect.isEmbedded
                : Boolean(effect);
            if (!validDocument || actualType !== expectedType) {
                add(`${result.activityData.name || result.activityType} effect ${index + 1} must resolve to ${profile.uuid ? "a standalone " : "an Item "}${expectedType} ActiveEffect.`, path);
            }
        }
        for (const [index, behavior] of (result.activityData.behaviors ?? []).entries()) {
            if (behavior.type !== "applyActiveEffect") continue;
            for (const uuid of behavior.config?.effects ?? []) {
                if (typeof uuid === "string" && uuid.startsWith(".")) {
                    add(`${result.activityData.name || result.activityType} behavior ${index + 1} requires an absolute ActiveEffect UUID: ${uuid}. Native Region behaviors cannot resolve relative Item effect UUIDs.`, `activityData.behaviors.${index}.config.effects`);
                    continue;
                }
                const effect = await resolve(uuid);
                const isPlanned = [...planned.values()].includes(effect);
                if (!(isPlanned || effect?.documentName === "ActiveEffect") || (effect?.type ?? "base") !== "base") {
                    add(`${result.activityData.name || result.activityType} behavior ${index + 1} has an unresolved base ActiveEffect reference: ${uuid}.`, `activityData.behaviors.${index}.config.effects`);
                }
            }
        }
    }
    return findings;
}

function clone(value) {
    return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
