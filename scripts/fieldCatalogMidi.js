/** MIDI discovery, shared byte-for-byte by the independent importers. No document access. */
import { createCatalogAccumulator, addCatalogModel, fieldCatalogId } from "./fieldCatalogCore.js";
import { midiRulesFor, midiDeclarations, MIDI_REVIEW } from "./fieldCatalogMidiRules.js";

const copy = value => JSON.parse(JSON.stringify(value));
const stable = value => JSON.stringify(value, function (key, entry) {
    return entry && !Array.isArray(entry) && typeof entry === "object"
        ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry;
});
const own = (value, key) => value && Object.getOwnPropertyDescriptor(value, key)?.value;
const modelClass = value => typeof value === "function" ? value : null;

function readMidiSettings() {
    const settings = {};
    for (const name of ["EnableWorkflow", "ConfigSettings", "TargetConfirmation"]) {
        try {
            const value = globalThis.game?.settings?.get?.("midi-qol", name);
            if (name === "ConfigSettings") {
                const selected = {};
                for (const key of ["autoTarget", "consumeResource", "gmConsumeResource", "autoFastForward", "gmAutoFastForward",
                    "autoItemEffects", "autoCEEffects", "conditionEditorEnabled", "midiPropertiesTabRole"]) {
                    const entry = own(value, key);
                    if (["string", "number", "boolean"].includes(typeof entry) || entry === null
                        || Array.isArray(entry) && entry.every(value => ["string", "number", "boolean"].includes(typeof value))) selected[key] = copy(entry);
                }
                settings[name] = { status: value ? "read" : "unavailable", values: selected };
            } else if (name === "TargetConfirmation") {
                settings[name] = { status: value ? "read" : "unavailable", enabled: own(value, "enabled") ?? null };
            } else settings[name] = { status: typeof value === "boolean" ? "read" : "unavailable", value: typeof value === "boolean" ? value : null };
        } catch { settings[name] = { status: "unavailable" }; }
    }
    return settings;
}

/** Compare storage contracts, not constructor names or translated labels. Callback bodies remain unknown. */
export function midiSchemaContract(field) {
    if (!field) return null;
    const { modelClass: ignored, ...validation } = field.validation ?? {};
    const options = Object.fromEntries(Object.entries(field.declaredOptions ?? {}).filter(([key]) => !["label", "hint", "name"].includes(key)));
    return { fieldClass: field.fieldClass, storage: field.storage, constraints: field.constraints,
        default: field.default, schemaChoices: field.schemaChoices, structure: field.structure, validation, options };
}

function scan(provider, spec) {
    const acc = createCatalogAccumulator(provider);
    addCatalogModel(acc, spec);
    return acc;
}
function key(field) { return fieldCatalogId(field.kind, field.type, field.path, field.variant); }
function changedProperties(before, after) {
    const a = midiSchemaContract(before), b = midiSchemaContract(after);
    return Object.keys(b ?? a ?? {}).filter(key => stable(a?.[key]) !== stable(b?.[key]));
}
function safeProbe(field, reviewed) {
    if (!reviewed) return "The extension implementation has not been reviewed for this installed version.";
    if (field.validation?.custom || field.schemaChoices?.status === "dynamic") return "Custom validators or choice callbacks are not executed for extension probes.";
    if (!["StringField", "BooleanField", "NumberField", "FormulaField", "MidiConditionField", "ColorField"].includes(field.fieldClass))
        return "This extension field needs a reviewed scalar validator; container, reference and custom checks are incomplete.";
    return null;
}

function appendDelta(result, before, after, { layer, source, runtime, reviewed }) {
    const previous = new Map(before.fields.map(field => [key(field), field]));
    const next = new Map(after.fields.map(field => [key(field), field]));
    for (const id of [...new Set([...previous.keys(), ...next.keys()])].sort()) {
        const base = previous.get(id), current = next.get(id);
        const changes = changedProperties(base, current);
        if (base && current && !changes.length) continue;
        const field = copy(current ?? base);
        field.id = layer + "/" + id;
        field.layer = layer;
        field.provenance = { ...field.provenance, native: false, source,
            attribution: layer === "midi" ? "MIDI public constructor registry and reviewed inheritance boundary" : "unattributed-active-extension" };
        field.extension = { operation: !base ? "added" : !current ? "removed" : "changed", changedProperties: changes,
            nativeFieldId: result.fields.some(entry => entry.id === id) ? id : null,
            baseline: midiSchemaContract(base), baselineModel: base?.provenance?.schema ?? null,
            ...runtime, callbackBehaviorCompared: false };
        field.validation.probeScope = "The catalogued constructor's field only. Later active extensions can change acceptance; this is not joint active-model validation.";
        // The same field can change on both sides of MIDI. Keep one stable identity
        // and retain the earlier contract/provenance instead of emitting duplicate IDs.
        const existingIndex = result.fields.findIndex(entry => entry.id === field.id);
        if (existingIndex >= 0) {
            const earlier = result.fields[existingIndex];
            field.extension.earlierContributions = [...(earlier.extension.earlierContributions ?? []), {
                contract: midiSchemaContract(earlier), provenance: earlier.provenance,
                operation: earlier.extension.operation, baseline: earlier.extension.baseline
            }];
        }
        if (!current) field.classification = "removed";
        const review = layer === "midi" ? midiRulesFor(field, result.environment.midi) : null;
        Object.assign(field, review ?? { sheet: { status: "needs-review", options: [], conditions: [], inactiveBehavior: "Unknown." },
            behavior: { status: "unresolved", gameplayTested: false, reason: "An active extension has no proven MIDI ownership." } });
        const handle = after.handles.get(id);
        const probeReason = !current ? "The active schema removed this field." : safeProbe(field, reviewed && layer === "midi");
        result.handles.set(field.id, { ...(handle ?? {}), extensionProbe: true, probeReason,
            contextualReason: "Extension model preparation, joint validators and contextual defaults are not executed. Supply whole-template diagnostics separately; links and gameplay remain untested." });
        if (existingIndex >= 0) result.fields[existingIndex] = field;
        else result.fields.push(field);
    }
    result.diagnostics.push(...after.diagnostics.filter(entry => !entry.fieldId || result.handles.has(layer + "/" + entry.fieldId)).map(entry => ({ ...entry, layer,
        ...(entry.fieldId ? { fieldId: layer + "/" + entry.fieldId } : {}) })));
}

function declarations(result, provider, midi) {
    const add = declaration => {
        const field = { ...declaration, id: "midi/" + fieldCatalogId(declaration.kind, declaration.type, declaration.path, declaration.variant ?? ""),
            layer: "midi", variant: declaration.variant ?? "", fieldClass: null,
            classification: declaration.classification ?? "declared-unschematized",
            storage: { persisted: declaration.persisted ?? true, required: null, nullable: null },
            constraints: {}, default: declaration.default ?? { kind: "unknown", reason: "No formal document DataField declaration." },
            schemaChoices: { status: "not-declared" }, structure: { kind: declaration.pattern ? "pattern" : "unschematized", complete: false },
            validation: { formalDataField: false, schemaAcceptanceIsGameplaySupport: false },
            provenance: { native: false, source: { package: declaration.owner ?? "midi-qol",
                version: declaration.owner ? globalThis.game?.modules?.get?.(declaration.owner)?.version ?? null : midi.version,
                reference: declaration.reference ?? "modules/midi-qol/midi-qol.js:setupMidiFlags" },
                attribution: declaration.integration ? "reviewed-integration-control" : "declared-registry-or-reviewed-source" } };
        Object.assign(field, midiRulesFor(field, midi));
        if (result.handles.has(field.id)) {
            if (declaration.registry) result.fields.find(entry => entry.id === field.id).registry = declaration.registry;
            return;
        }
        result.fields.push(field);
        result.handles.set(field.id, { extensionProbe: true,
            probeReason: "Declared flag/registry configuration has no formal document DataField validator. Registry editor types do not establish document validation.",
            contextualReason: "Effect application, expressions, macros and reference resolution are not executed." });
    };
    for (const declaration of midiDeclarations(provider, result.types, {
        unavailableTypes: midi.boundaries.filter(boundary => boundary.attribution !== "resolved").map(boundary => boundary.type)
    })) add(declaration);
    if (provider !== "5e-activity-importer") return;
    const registry = midi.active ? own(globalThis.MidiQOL, "midiFlags") : null;
    if (!Array.isArray(registry)) {
        result.diagnostics.push({ code: "midi-flag-registry-unavailable", severity: "warning", layer: "midi",
            message: "MIDI effect-change registry unavailable. Reviewed patterns remain; this is not an empty allowed set." });
        return;
    }
    midi.registryEntries = registry.length;
    for (const entry of registry) {
        const name = typeof entry === "string" ? entry : own(entry, "name");
        if (typeof name !== "string" || !/^(?:token\.)?flags\.midi-qol\./.test(name)) continue;
        const pattern = name.endsWith(".") || /(^|\.)NAME(\.|$)/.test(name);
        const target = name.replace(/(^|\.)NAME(?=\.|$)/g, "$1{name}") + (name.endsWith(".") ? "{path}" : "");
        add({ kind: "effect", type: "base", path: "system.changes[*].value", variant: "change.key=" + target,
            configurationTarget: target, pattern, registry: { source: "MidiQOL.midiFlags", name, originalAuthorVerified: false,
                editorType: typeof own(entry, "type") === "function" ? own(entry, "type").name : null,
                documentSchema: false, optionsEvaluated: false },
            applicableTo: name.startsWith("token.") ? ["Token via ActiveEffect integration; context required"] : ["Actor via ActiveEffect change; individual target applicability needs review"] });
    }
}

/** Called only for an explicit extension selection. Native queries retain their existing discovery cost. */
export function extendMidiCatalog(native, provider) {
    const result = { ...native, fields: native.fields.map(field => ({ ...field, layer: "native" })),
        handles: new Map(native.handles), diagnostics: [...native.diagnostics], environment: copy(native.environment) };
    const module = globalThis.game?.modules?.get?.("midi-qol");
    const midi = result.environment.midi = { installed: Boolean(module), active: module?.active === true,
        version: module?.version ?? null, reviewedVersion: MIDI_REVIEW.midi, review: MIDI_REVIEW,
        schemaStatus: module?.active ? "available" : "unavailable", registryEntries: 0,
        boundaries: [], complete: false, settings: module?.active ? readMidiSettings() : { status: "unavailable" },
        limitations: ["No exhaustive claim for open flags, contextual choices, callbacks or gameplay.",
            "Native constructors can themselves read modified CONFIG registries; registry additions are not automatically native or MIDI-owned."] };
    const reviewed = midi.version === MIDI_REVIEW.midi && native.environment.systemVersion === MIDI_REVIEW.system
        && native.environment.foundryVersion === MIDI_REVIEW.foundry;
    midi.reviewCurrent = reviewed;
    if (!midi.active) result.diagnostics.push({ code: "midi-unavailable", severity: "info", layer: "midi",
        message: "MIDI is inactive or absent. Reviewed declarations are reference-only; active MIDI schemas cannot be probed." });

    // Activity models expose a MIDI-owned constructor registry. Separate changes made before and after its mixin.
    for (const type of native.types.filter(type => type.kind === "activity")) {
        const nativeModel = Object.values(globalThis.dnd5e?.documents?.activity ?? {}).find(model => model?.metadata?.type === type.type);
        const registered = midi.active ? modelClass(own(own(globalThis.MidiQOL, "activityTypes"), type.type)?.documentClass) : null;
        const active = globalThis.CONFIG?.DND5E?.activityTypes?.[type.type]?.documentClass;
        if (!nativeModel) continue;
        const spec = { kind: "activity", type: type.type, model: nativeModel };
        const base = scan(provider, spec);
        const mixin = registered && Object.getPrototypeOf(registered);
        const parent = mixin && Object.getPrototypeOf(mixin);
        const boundary = registered && mixin?.name === "MidiActivityMixin" && typeof parent === "function"
            && (parent === nativeModel || parent.prototype instanceof nativeModel);
        midi.boundaries.push({ kind: "activity", type: type.type, nativeModel: nativeModel.name,
            midiModel: registered?.name ?? null, activeModel: active?.name ?? null,
            preMidiModel: boundary ? parent.name : null, attribution: boundary ? "resolved" : "unresolved" });
        if (boundary) {
            const beforeMidi = scan(provider, { ...spec, model: parent });
            const midiSchema = scan(provider, { ...spec, model: registered });
            const activeKeys = Object.entries(globalThis.CONFIG?.DND5E?.activityTypes ?? {}).filter(([, value]) => value.documentClass === registered).map(([id]) => id).sort();
            appendDelta(result, base, beforeMidi, { layer: "extensions", source: { package: null, reference: "pre-MIDI constructor" }, runtime: { active: true }, reviewed: false });
            appendDelta(result, beforeMidi, midiSchema, { layer: "midi", source: { package: "midi-qol", version: midi.version,
                reference: "MidiQOL.activityTypes." + type.type + ".documentClass" },
                runtime: { active: active === registered, activeTypeIds: activeKeys, nativeComparison: "Native to pre-MIDI changes are recorded separately." }, reviewed });
            if (active && active !== registered && active !== nativeModel && active !== parent) appendDelta(result, midiSchema, scan(provider, { ...spec, model: active }),
                { layer: "extensions", source: { package: null, reference: "CONFIG.DND5E.activityTypes" }, runtime: { active: true }, reviewed: false });
        } else if (active && active !== nativeModel) {
            appendDelta(result, base, scan(provider, { ...spec, model: active }), { layer: "extensions", source: { package: null,
                reference: "CONFIG.DND5E.activityTypes; MIDI ownership unproven" }, runtime: { active: true }, reviewed: false });
            result.diagnostics.push({ code: "midi-boundary-unresolved", severity: "warning", layer: "midi", type: type.type,
                message: "No reviewed public MIDI constructor boundary; active differences are unattributed." });
        }
    }
    // There is no reviewed MIDI-owned Item/ActiveEffect constructor registry. Never assign these replacements to MIDI.
    for (const type of native.types.filter(type => ["item", "effect"].includes(type.kind))) {
        const roots = new Map();
        for (const field of native.fields.filter(field => field.kind === type.kind && field.type === type.type)) {
            const handle = native.handles.get(field.id);
            if (handle?.model) roots.set(handle.contextSourcePrefix ?? "", handle.model);
        }
        for (const [prefix, model] of roots) {
            const config = globalThis.CONFIG?.[type.kind === "item" ? "Item" : "ActiveEffect"];
            const active = prefix === "system" ? config?.dataModels?.[type.type] : config?.documentClass;
            const nativeDocument = globalThis.dnd5e?.documents?.[type.kind === "item" ? "Item5e" : "ActiveEffect5e"];
            const baseline = prefix ? model : nativeDocument ?? model;
            if (!active || active === baseline) continue;
            const spec = { kind: type.kind, type: type.type, prefix, model: baseline };
            appendDelta(result, scan(provider, spec), scan(provider, { ...spec, model: active }), {
                layer: "extensions", source: { package: null, reference: "CONFIG document/dataModels registry" }, runtime: { active: true }, reviewed: false });
        }
    }
    declarations(result, provider, midi);
    // Inactive schemas are not fabricated. These patterns keep their unavailable coverage visible.
    if (!midi.active || !midi.boundaries.some(boundary => boundary.attribution === "resolved")) midi.schemaStatus = "unavailable";
    if (provider === "5e-item-importer" && midi.active) midi.schemaStatus = "no-reviewed-midi-item-schema";
    result.diagnostics.sort((a, b) => stable(a).localeCompare(stable(b)));
    return result;
}
