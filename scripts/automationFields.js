import { cloneExplicit, applyExplicitSource, isMapping } from "./explicitYamlFields.js";

/** Reviewed authored storage, not execution. Shared by the independent importers. */
export const AUTOMATION_REVIEW = Object.freeze({ foundry: "14.369", system: "6.0.6", midi: "14.6.0", dae: "14.6.0" });
const string = { kind: "string" }, boolean = { kind: "boolean" }, number = { kind: "number" };
const nullable = spec => ({ ...spec, nullable: true });
const choice = (...choices) => ({ kind: typeof choices[0], choices });
const range = (min, max = Infinity) => ({ kind: "number", min, max });
const array = element => ({ kind: "array", element });
const object = fields => ({ kind: "object", fields });
const strings = array(string);
const formula = { kind: "formula", nullable: true };
const fieldsOf = (names, spec) => Object.fromEntries(names.split(" ").map(name => [name, spec]));
const critical = object({ allow: boolean, bonus: formula });
const damagePart = object({ number: nullable(range(0)), denomination: nullable(range(0)), bonus: formula,
    types: strings, modifiers: strings, custom: object({ enabled: boolean, formula }),
    scaling: object({ mode: choice("", "whole", "half"), number: nullable(range(0)), formula }) });
const midiCommon = {
    useConditionText: string, useConditionReason: string, effectConditionText: string, otherActivityId: nullable(string),
    macroData: object({ name: string, command: string }),
    ignoreTraits: object(fieldsOf("idi idr idv ida idm", boolean)),
    midiProperties: object({
        ...fieldsOf("triggeredActivityId triggeredActivityConditionText triggeredActivityTargets triggeredActivityRollAs forceConsumeDialog forceRollDialog forceDamageDialog confirmTargets autoTargetType autoTargetAction identifier rollMode removeChatButtons autoCEEffects", string),
        ...fieldsOf("triggeredActivityConsume triggeredActivityConfigure autoConsume automationOnly otherActivityCompatible otherActivityAsParentType displayActivityName chooseEffects toggleEffect ignoreFullCover magicEffect magicDamage noConcentrationCheck skipConcentrationCheck", boolean),
        ignoreTraits: strings
    }),
    isOverTimeFlag: boolean,
    overTimeProperties: object({ turnChoice: nullable(choice("start", "end")), saveRemoves: boolean, rollAs: choice("target", "source"),
        preRemoveConditionText: string, postRemoveConditionText: string }),
    regionBehavior: object({ enabled: boolean, dispositionFilter: choice(-1, 0, 1), excludeSource: boolean, oncePerTurn: boolean,
        wallRestriction: string, regionVisibility: number, attachToken: choice("default", "caster", "target"),
        templateOrigin: choice("default", "base", "top", "eye"), rules: array(object({
            trigger: choice("entry", "exit", "turnStart", "turnEnd"), action: choice("useActivity", "applyEffect"), targetId: string
        })) }),
    regionLight: object({ enabled: boolean, dim: range(0), bright: range(0), color: nullable(string), alpha: range(0, 1),
        luminosity: range(0, 1), animationType: nullable(string), animationSpeed: range(0, 10), animationIntensity: range(1, 10) })
};
const midiSpecific = {
    attack: { otherActivityAsParentType: boolean, attackMode: string, ammunition: string, otherActivityUuid: string,
        attackRollPerTarget: string, fumbleThreshold: number },
    save: { otherActivityAsParentType: boolean, friendlySave: string, damage: object({ critical }) },
    check: { otherActivityAsParentType: boolean, friendlySave: string,
        damage: object({ onSave: choice("none", "half", "full"), critical, parts: array(damagePart) }) },
    utility: { otherActivityAsParentType: boolean }, summon: { friendlySummon: boolean }
};
const macro = object({ _id: nullable(string), name: string, img: nullable(string), type: choice("script", "chat"),
    scope: choice("global", "actors", "actor"), command: string, author: nullable(string), folder: nullable(string),
    ownership: { kind: "ownership" }, flags: object({}), _stats: { kind: "metadata" } });
const daeEffect = {
    ...fieldsOf("enableCondition disableCondition durationExpression macroRepeat", string),
    ...fieldsOf("disableIncapacitated selfTarget selfTargetAlways dontApply", boolean),
    stackable: choice("noneName", "none", "multi", "count", "countDeleteDecrement", "noneNameOnly"),
    applicationMode: choice("default", "dnd5e", "legacy"), expiryMode: choice("default", "delete", "suppress"), specialDuration: strings
};
const midiItem = { onUseMacroName: nullable(string), noProvokeReaction: boolean };
const ownedNamespaces = new Set(["midi-qol", "dae", "core"]);
const derived = { "midi-qol": new Set(["onUseMacroParts"]) };

export function automationSchema(kind, type) {
    return object({
        "midi-qol": object({ ...(kind === "activity" ? { fields: object({ ...midiCommon, ...midiSpecific[type] }) } : {}),
            flags: object(kind === "item" ? midiItem : {}) }),
        dae: object(kind === "effect" ? daeEffect : kind === "item" ? { macro } : {}),
        ...(kind === "effect" ? { core: object({ overlay: boolean }) } : {})
    });
}

function validate(value, spec, path) {
    if (value === null && spec.nullable) return null;
    if (spec.kind === "object") {
        if (!isMapping(value)) throw new Error(`${path} must be a mapping.`);
        const out = {};
        for (const [key, entry] of Object.entries(value)) {
            if (!Object.hasOwn(spec.fields, key)) throw new Error(`${path}.${key} is not a reviewed authored field.`);
            if (entry === undefined) continue; // Native optional defaults have no YAML representation.
            out[key] = validate(entry, spec.fields[key], `${path}.${key}`);
        }
        return out;
    }
    if (spec.kind === "array") {
        const entries = value instanceof Set ? [...value] : value;
        if (!Array.isArray(entries)) throw new Error(`${path} must be a list.`);
        return entries.map((entry, index) => validate(entry, spec.element, `${path}[${index}]`));
    }
    if (spec.kind === "ownership") {
        if (!isMapping(value) || Object.entries(value).some(([key, entry]) =>
            ["__proto__", "constructor", "prototype"].includes(key) || !Number.isInteger(entry) || entry < -1 || entry > 3))
            throw new Error(`${path} must contain document ownership levels.`);
        return cloneExplicit(value);
    }
    if (spec.kind === "metadata") {
        // Macro document statistics are not authored content and never imported.
        if (!isMapping(value)) throw new Error(`${path} must be a mapping.`);
        return {};
    }
    const valid = spec.kind === "formula" ? ["string", "number"].includes(typeof value) : typeof value === spec.kind;
    if (!valid || typeof value === "number" && (!Number.isFinite(value) || value < (spec.min ?? -Infinity) || value > (spec.max ?? Infinity)))
        throw new Error(`${path} must be ${spec.nullable ? "null or " : ""}${spec.kind}${spec.min !== undefined ? ` in ${spec.min}..${spec.max}` : ""}.`);
    if (spec.choices && !spec.choices.includes(value)) throw new Error(`${path} must be one of ${spec.choices.join(", ")}.`);
    return value;
}

/** Canonical schema-4 section. No coercion, evaluation, lookup or writes. */
export function parseAutomation(section, kind, type) {
    if (section === undefined) return {};
    const value = validate(section, automationSchema(kind, type), "AUTOMATION");
    const patch = cloneExplicit(value["midi-qol"]?.fields ?? {});
    const flags = {};
    if (Object.hasOwn(value["midi-qol"] ?? {}, "flags")) flags["midi-qol"] = value["midi-qol"].flags;
    for (const provider of ["dae", "core"]) if (Object.hasOwn(value, provider)) flags[provider] = value[provider];
    if (Object.keys(flags).length) patch.flags = flags;
    return patch;
}

/** Extract only reviewed data, retaining false/empty/inactive values. Unknown owned flags fail closed. */
export function exportAutomation(document, kind, type) {
    const source = document?._source ?? document ?? {};
    const schema = automationSchema(kind, type);
    const out = {};
    if (kind === "activity") {
        const fields = {};
        for (const key of Object.keys(schema.fields["midi-qol"].fields.fields.fields)) {
            if (!Object.hasOwn(source, key) || source[key] === undefined) continue;
            if (type === "save" && key === "damage") {
                if (Object.hasOwn(source.damage ?? {}, "critical")) fields.damage = { critical: cloneExplicit(source.damage.critical) };
            } else fields[key] = cloneExplicit(source[key]);
        }
        if (Object.keys(fields).length) out["midi-qol"] = { fields };
    }
    for (const [provider, flags] of Object.entries(source.flags ?? {})) {
        if (!ownedNamespaces.has(provider)) continue;
        const authored = cloneExplicit(flags);
        for (const key of derived[provider] ?? []) delete authored?.[key];
        if (!isMapping(authored)) throw new Error(`flags.${provider} must be a mapping.`);
        if (Object.keys(flags).length && !Object.keys(authored).length) continue;
        if (provider === "midi-qol") (out[provider] ??= {}).flags = authored;
        else out[provider] = authored;
    }
    return validate(out, schema, "AUTOMATION");
}

/** Remove exactly the exported extension paths before applying the native strict serializer. */
export function nativeAutomationSource(document, kind, type) {
    const source = cloneExplicit(document?._source ?? document);
    const automation = exportAutomation(source, kind, type);
    if (kind === "activity") {
        for (const key of Object.keys(automationSchema(kind, type).fields["midi-qol"].fields.fields.fields)) {
            if (key === "damage" && type === "save") {
                if (source.damage) delete source.damage.critical;
            } else delete source[key];
        }
    }
    for (const provider of ownedNamespaces) if (source.flags) delete source.flags[provider];
    return { source, automation };
}

export function applyAutomation(target, section, kind, type) {
    return applyExplicitSource(target, parseAutomation(section, kind, type));
}

/** Rows preserve null versus empty values; macros and conditions are displayed as inert text. */
export function automationRows(document, kind, type) {
    let value;
    try { value = exportAutomation(document, kind, type); }
    catch (error) { return [{ section: "Automation", label: "Unsupported data", value: error.message }]; }
    const rows = [];
    const visit = (entry, path) => {
        if (isMapping(entry) && Object.keys(entry).length) for (const [key, child] of Object.entries(entry)) visit(child, [...path, key]);
        else rows.push({ section: "Automation", label: path.join(" / "), value: entry === null ? "null" : typeof entry === "string" ? entry || '""' : JSON.stringify(entry) });
    };
    for (const [provider, entry] of Object.entries(value)) visit(entry, [provider]);
    return rows;
}

/** Used by catalog coverage and generated references; storage coverage is separate from gameplay evidence. */
export function automationFieldEntries(kind, type) {
    const rows = [];
    const walk = (spec, keys) => {
        if (spec.kind === "object") for (const [key, child] of Object.entries(spec.fields)) walk(child, [...keys, key]);
        else {
            const [provider, group, ...tail] = keys;
            const path = provider === "midi-qol" ? group === "fields" ? tail.join(".") : `flags.midi-qol.${tail.join(".")}` : `flags.${keys.join(".")}`;
            rows.push({ path, yamlPath: "AUTOMATION." + keys.join("."), spec });
            if (spec.kind === "array" && spec.element.kind === "object") walk(spec.element, [...keys.slice(0, -1), keys.at(-1) + "[*]"]);
        }
    };
    walk(automationSchema(kind, type), []);
    return rows;
}

/** Canonical coverage supersedes legacy aliases, without claiming gameplay validation. */
export function automationCoverage(field, owner) {
    const allowed = owner === "5e-item-importer"
        ? field.kind === "item" && ["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"].includes(field.type)
        : owner === "5e-activity-importer"
            && (field.kind === "activity" && ["attack", "save", "check", "utility", "summon", "damage", "heal", "cast", "enchant", "transform", "forward"].includes(field.type)
                || field.kind === "effect" && ["base", "enchantment"].includes(field.type));
    if (!allowed || field.configurationTarget || field.layer === "extensions") return null;
    const entry = automationFieldEntries(field.kind, field.type).find(entry => entry.path === field.path.replace(/\[\*\]$/, ""));
    if (!entry) return null;
    const prefix = field.kind === "activity" ? "ACTIVITY_" + field.type.toUpperCase() : field.kind === "effect" ? "EFFECT" : field.type.toUpperCase();
    return { owner, status: "declared", gap: false, yamlLocations: [prefix + "." + entry.yamlPath], aliases: [],
        acceptedRepresentations: [entry.spec.kind + (entry.spec.nullable ? " or null" : "")], acceptedValues: entry.spec.choices ?? [],
        conversions: ["Exact typed storage; inactive, false, zero and empty values are retained. Commands and conditions remain inert text."],
        conditions: ["MIDI Activity fields require the compatible active provider; context references are checked before import."],
        stages: Object.fromEntries(["parse", "build", "export", "template", "preview", "comparison"].map(stage => [stage, "declared"])),
        evidence: [{ file: "tests/unit/automationTests.js", stages: ["parse", "build", "export", "preview"], status: "referenced" }],
        references: ["scripts/automationFields.js", "docs/automation-schema-4.md"], reviewedMidiVersion: AUTOMATION_REVIEW.midi,
        reason: "Reviewed authored storage support; behavior depends on the system, integrations and workflow context." };
}

/** Foundry merges flag objects by default. An explicitly empty authored object must clear its prior keys. */
export function automationUpdateDeletions(existingFlags, incomingFlags) {
    const patches = {};
    const walk = (existing, incoming, output) => {
        if (!isMapping(incoming)) return;
        if (!Object.keys(incoming).length) {
            for (const key of Object.keys(existing ?? {})) output["-=" + key] = null;
        } else for (const [key, value] of Object.entries(incoming)) {
            if (isMapping(value)) {
                const nested = {}; walk(existing?.[key], value, nested);
                if (Object.keys(nested).length) output[key] = nested;
            }
        }
    };
    for (const provider of ["midi-qol", "dae"]) if (Object.hasOwn(incomingFlags ?? {}, provider)) {
        const patch = {}; walk(existingFlags?.[provider], incomingFlags[provider], patch);
        if (Object.keys(patch).length) patches[provider] = patch;
    }
    return patches;
}
