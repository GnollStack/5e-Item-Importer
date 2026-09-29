import { createCatalogAccumulator, addCatalogModel, finishCatalog } from "../../scripts/fieldCatalogCore.js";
import { createFieldCatalogService } from "../../scripts/fieldCatalogService.js";
import { extendMidiCatalog } from "../../scripts/fieldCatalogMidi.js";
import { midiRulesFor } from "../../scripts/fieldCatalogMidiRules.js";
import { assembleSnapshot, compareSnapshots } from "../../tools/field-catalog-reports.mjs";

const assert = (condition, message = "Assertion failed") => { if (!condition) throw new Error(message); };
function suite() {
    const tests = [];
    return { tests, check(name, fn) { try { fn(); tests.push({ name, passed: true }); } catch (error) { tests.push({ name, passed: false, error: error.message }); } } };
}
class StringField {
    constructor(options = {}) { this.options = options; Object.assign(this, { required: false, nullable: false, blank: true, initial: "" }, options); }
    _validateType(value) { return typeof value === "string"; }
    validate(value) { if (!this._validateType(value) || !this.blank && value === "" || this.choices && !this.choices.includes(value)) throw new Error("Invalid string"); }
    clean(value) { return value === undefined ? this.initial : String(value).trim(); }
}
class MidiConditionField extends StringField {}
class NumberField extends StringField {
    constructor(options = {}) { super(options); this.initial = 0; }
    _validateType(value) { return typeof value === "number"; }
    validate(value) { if (!this._validateType(value) || value < (this.min ?? -Infinity)) throw new Error("Invalid number"); }
    clean(value) { return Number(value); }
}
class SchemaField { constructor(fields) { this.fields = fields; this.options = {}; } }
const globals = ["game", "dnd5e", "foundry", "CONFIG", "MidiQOL"];
function syntheticEnvironment(provider) {
    let revision = 0, calls = 0;
    class NativeActivity {
        static metadata = { type: "attack" };
        static defineSchema() { return { inherited: new NumberField({ min: 0 }), removed: new StringField() }; }
        static get schema() { return new SchemaField(this.defineSchema()); }
    }
    class EarlierExtension extends NativeActivity {
        static defineSchema() { return { ...super.defineSchema(), earlierModule: new StringField(), twiceExtended: new NumberField({ min: 1 }) }; }
    }
    class MidiActivityMixin extends EarlierExtension {
        static defineSchema() { return { ...super.defineSchema(),
            midiProperties: new SchemaField({ autoTargetType: new StringField({ initial: "any", blank: false }),
                triggeredActivityTargets: new StringField({ initial: "targets" }) }),
            useConditionText: new MidiConditionField(), macroData: new SchemaField({ command: new StringField() }) }; }
    }
    class RegisteredMidiActivity extends MidiActivityMixin {
        static defineSchema() {
            const fields = super.defineSchema(); delete fields.removed;
            return { ...fields, inherited: new NumberField({ min: revision ? 3 : 2 }),
                unknownNewMidi: new StringField({ choices: revision ? ["new", "old"] : ["old"] }),
                contextualDefault: new StringField({ initial: () => { calls++; throw new Error("Default executed"); } }),
                customValidator: new StringField({ validate: () => { calls++; throw new Error("Custom validator executed"); } }) };
        }
    }
    class LaterExtension extends RegisteredMidiActivity {
        static defineSchema() { return { ...super.defineSchema(), laterModule: new StringField(), twiceExtended: new NumberField({ min: 4 }) }; }
    }
    globalThis.game = { version: "14.367", release: { generation: 14 }, system: { id: "dnd5e", version: "5.3.3" },
        modules: new Map([["midi-qol", { id: "midi-qol", active: true, version: "14.0.9" }]]),
        items: { create() { calls++; throw new Error("World write"); } }, i18n: { lang: "en" } };
    globalThis.dnd5e = { documents: { activity: { NativeActivity } } };
    globalThis.foundry = { data: { fields: { StringField, NumberField, SchemaField } } };
    globalThis.CONFIG = { DND5E: { activityTypes: { attack: { documentClass: LaterExtension } } } };
    globalThis.MidiQOL = {
        activityTypes: { attack: { documentClass: RegisteredMidiActivity } },
        midiFlags: [...Array.from({ length: 260 }, (_, index) => ({ name: "flags.midi-qol.synthetic." + index })), { name: "flags.midi-qol.optional.NAME.count" }, { name: "flags.not-midi.foo" }],
        midiPropertiesOptions: { triggeredActivityTargetOptions: [{ value: "targets" }, { value: "customTargetPool" }] }
    };
    const discover = () => {
        const acc = createCatalogAccumulator(provider);
        addCatalogModel(acc, { kind: "activity", type: "attack", model: NativeActivity, source: { package: "dnd5e" } });
        if (provider === "5e-item-importer") acc.types.push({ kind: "item", type: "weapon", modelClass: "WeaponData" });
        return finishCatalog(acc);
    };
    return { discover, revise: () => { revision++; }, calls: () => calls, native: NativeActivity };
}
export function runMidiFieldCatalogTests({ provider, decorate }) {
    if (globalThis.__fieldCatalogTestSandbox !== true) throw new Error("Synthetic globals may only be installed in the isolated source test VM.");
    const saved = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const { tests, check } = suite();
    try {
        const fixture = syntheticEnvironment(provider);
        const service = createFieldCatalogService({ provider, discover: fixture.discover, decorate: fields => fields,
            extend: catalog => extendMidiCatalog(catalog, provider), decorateExtensions: decorate });
        const pages = (layer = "midi", limit = 53) => {
            const result = []; let cursor;
            do {
                const page = service.getFieldCatalog({ layer, limit, ...(cursor ? { cursor } : {}) });
                assert(page.success, JSON.stringify(page.errors)); result.push(page); cursor = page.nextCursor;
                assert(result.length < 50);
            } while (cursor);
            return result;
        };
        const fields = () => pages().flatMap(page => page.fields);
        const find = path => fields().find(field => field.path === path && field.kind === "activity");
        check("MIDI attribution separates additions before and after the published mixin", () => {
            const all = pages("all").flatMap(page => page.fields);
            assert(all.some(field => field.layer === "midi" && field.path === "midiProperties.autoTargetType"));
            assert(all.some(field => field.layer === "extensions" && field.path === "earlierModule"));
            assert(all.some(field => field.layer === "extensions" && field.path === "laterModule"));
            assert(!all.some(field => field.layer === "midi" && /earlierModule|laterModule/.test(field.path)));
            assert(all.some(field => field.layer === "midi" && field.path === "removed" && field.extension.operation === "removed"));
            const twice = all.filter(field => field.layer === "extensions" && field.path === "twiceExtended");
            assert(twice.length === 1 && twice[0].constraints.min === 4);
            assert(twice[0].extension.earlierContributions[0].contract.constraints.min === 1);
            assembleSnapshot(pages("all"));
        });
        check("MIDI inherited constraints retain their native baseline and stable identity", () => {
            const native = service.getFieldCatalog().fields.find(field => field.path === "inherited");
            const midi = find("inherited");
            assert(native.constraints.min === 0 && midi.constraints.min === 2 && midi.extension.baseline.constraints.min === 0);
            assert(midi.extension.nativeFieldId === native.id && midi.id !== native.id);
            assert(midi.extension.changedProperties.includes("constraints"));
        });
        check("MIDI complete pagination and deterministic snapshots preserve registry entries", () => {
            const capture = pages(), again = pages();
            assert(JSON.stringify(capture) === JSON.stringify(again));
            const rows = capture.flatMap(page => page.fields);
            assert(rows.length === capture[0].total && new Set(rows.map(row => row.id)).size === rows.length);
            assert(!compareSnapshots(assembleSnapshot(capture), assembleSnapshot(again)).hasChanges);
            if (provider === "5e-activity-importer") {
                assert(rows.filter(field => field.configurationTarget?.startsWith("flags.midi-qol.synthetic.")).length === 260);
                assert(rows.some(field => field.configurationTarget === "flags.midi-qol.optional.{name}.count" && field.pattern));
                assert(!rows.some(field => field.configurationTarget === "flags.not-midi.foo"));
            }
        });
        check("MIDI changed schema and choice snapshots invalidate continuation cursors", () => {
            const pageSize = provider === "5e-item-importer" ? 2 : 53;
            const before = pages("all", pageSize), identity = find("unknownNewMidi").id;
            fixture.revise();
            assert(!service.getFieldCatalog({ layer: "all", limit: pageSize, cursor: before[0].nextCursor }).success);
            const after = pages("all", pageSize);
            const diff = compareSnapshots(assembleSnapshot(before), assembleSnapshot(after));
            assert(diff.fields.changed.some(change => change.id === identity && change.changes.some(change => change.property === "schemaChoices")));
            assert(diff.fields.changed.some(change => change.changes.some(change => change.property === "constraints")));
        });
        check("MIDI probes preserve candidates and never execute commands or defaults", () => {
            const field = find("useConditionText");
            const input = { fieldId: field.id, values: ["(() => { throw new Error('never'); })()", false, 0], context: { source: { type: "attack" } } };
            const before = JSON.stringify(input), report = service.probeFieldValues(input);
            assert(report.success && report.results[0].raw.valid && report.results[1].raw.valid === false);
            assert(report.results[0].contextual.status === "incomplete" && JSON.stringify(input) === before);
            const defaults = service.probeFieldValues({ fieldId: find("contextualDefault").id, includeMissing: true });
            assert(defaults.results[0].cleaning.status === "incomplete");
            const custom = service.probeFieldValues({ fieldId: find("customValidator").id, values: ["text"] });
            assert(custom.results[0].raw.status === "incomplete");
            assert(fixture.calls() === 0);
        });
        check("MIDI unknown fields are coverage gaps and schema acceptance is not sheet choice membership", () => {
            assert(find("unknownNewMidi").coverage.gap);
            const field = find("midiProperties.autoTargetType");
            assert(field.schemaChoices.status === "not-declared");
            assert(field.sheet.options.some(option => option.ids.includes("enemy")));
            const probe = service.probeFieldValues({ fieldId: field.id, values: ["not-a-sheet-option"] });
            assert(probe.results[0].raw.valid);
            assert(find("midiProperties.triggeredActivityTargets").sheet.options.some(option => option.kind === "running-midi-registry" && option.ids.includes("customTargetPool")));
        });
        check("MIDI flags explicitly lack native validation guarantees", () => {
            const field = fields().find(field => field.validation.formalDataField === false);
            const report = service.probeFieldValues({ fieldId: field.id, values: [false, 0, {}, [], null] });
            assert(report.success && report.results.every(row => row.raw.status === "incomplete" && row.cleaning.status === "incomplete" && row.contextual.status === "incomplete"));
        });
        check("MIDI layer filters cannot be mixed with native cursors or arbitrary identities", () => {
            const first = service.getFieldCatalog({ layer: "midi", limit: 1 });
            assert(!service.getFieldCatalog({ cursor: first.nextCursor }).success);
            assert(!service.getFieldCatalog({ layer: "made-up" }).success);
            assert(!service.getFieldDetails({ layer: "native", fieldId: find("inherited").id }).success);
            assert(!service.probeFieldValues({ fieldId: "game.items.create", values: [1] }).success);
        });
        check("MIDI unavailable retains explicit references and independent provider operation", () => {
            globalThis.game.modules.get("midi-qol").active = false;
            globalThis.CONFIG.DND5E.activityTypes.attack.documentClass = fixture.native;
            const page = service.getFieldCatalog({ layer: "midi", limit: 200 });
            assert(page.success && page.environment.midi.schemaStatus === "unavailable");
            assert(!page.fields.some(field => field.fieldClass));
            assert(page.diagnostics.some(diagnostic => diagnostic.code === "midi-unavailable"));
            if (provider === "5e-activity-importer") assert(page.fields.some(field => field.path === "midiProperties.autoTargetType" && field.schemaReference));
            globalThis.game.modules.delete("midi-qol");
            assert(service.getFieldCatalog({ layer: "midi" }).success);
            assert(service.getFieldCatalog().success && fixture.calls() === 0);
        });
    } finally {
        for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    }
    return { success: tests.every(test => test.passed), tests };
}

export function installMidiParserTestEnvironment() {
    if (globalThis.__fieldCatalogTestSandbox !== true) throw new Error("Parser fixtures require an isolated test VM.");
    globalThis.game = { version: "14.367", release: { generation: 14 }, system: { id: "dnd5e", version: "5.3.3" },
        modules: new Map([["midi-qol", { active: true, version: "14.0.9" }]]), settings: { get: () => false },
        i18n: { localize: value => value, format: value => value }, packs: [] };
    globalThis.foundry = { utils: { deepClone: structuredClone, getProperty: (value, path) => path.split(".").reduce((value, key) => value?.[key], value),
        setProperty: (object, path, value) => { const keys = path.split("."); let cursor = object; for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {}; cursor[keys.at(-1)] = value; },
        mergeObject: (a, b) => Object.assign(a, b) } };
    globalThis.CONFIG = { DND5E: {} };
}
export function runMidiYamlCoverageTests({ parser, serializer, decorate }) {
    const { tests, check } = suite();
    const parse = text => {
        const result = parser.parseAllBlocksYaml(text)[0];
        assert(result?.success, result?.errors?.join("; ")); return result;
    };
    const yaml = (type, body) => "ACTIVITY_" + type.toUpperCase() + ":\n  ACTIVITY:\n    Name: Catalog Fixture\n" + body;
    const field = (path, type = "attack", extra = {}) => decorate([{ layer: "midi", kind: "activity", type, path, ...extra }],
        { systemVersion: "5.3.3", foundryVersion: "14.367", midi: { active: true } })[0];
    check("MIDI targeting and trigger mappings retain stored inactive values", () => {
        const data = parse(yaml("attack", "  MIDI CONDITIONS:\n    AoE Target Type: enemy\n    Target on Template Draw: alwaysIgnoreDefeated\n    Trigger Activity: none\n    Trigger Targets: failedSaves\n    Roll As: firstTarget\n    Trigger Consume Resources: false\n    Trigger Configure Dialog: false\n    Skip Concentration Save: true")).activityData;
        assert(data.midiProperties.autoTargetType === "enemy" && data.midiProperties.triggeredActivityId === "none");
        assert(data.midiProperties.triggeredActivityTargets === "failedSaves" && data.midiProperties.triggeredActivityConsume === false && data.midiProperties.skipConcentrationCheck === true);
        assert(field("midiProperties.autoTargetType").coverage.acceptedValues.includes("enemy"));
    });
    check("MIDI consumption and dialog declarations match exact parser conversions", () => {
        const data = parse(yaml("utility", "  MIDI CONDITIONS:\n    Auto Consume: true\n    Force Consume Dialog: always\n    Force Roll Config: never\n    Force Damage Config: default\n    Choose Effects: yes\n    Toggle Effect: 'TRUE'")).activityData.midiProperties;
        assert(data.autoConsume === true && data.forceConsumeDialog === "always" && data.forceRollDialog === "never" && data.chooseEffects === false && data.toggleEffect === true);
        const rules = midiRulesFor({ kind: "activity", type: "utility", path: "midiProperties.forceConsumeDialog" }, { version: "14.0.9", active: true });
        assert(rules.behavior.conditions.some(condition => condition.includes("forceConsumeDialog=always returns false")));
    });
    check("MIDI overtime inactive values are reported as a coverage limitation", () => {
        const data = parse(yaml("utility", "  MIDI OVERTIME:\n    Is Over Time: false\n    Turn Choice: end\n    Save Removes: false\n    Roll As: source\n    Activity Macro: 'throw new Error(\"never run\")'")).activityData;
        assert(data.isOverTimeFlag === false && !data.overTimeProperties && data.macroData.command.includes("never run"));
        assert(field("overTimeProperties.turnChoice").coverage.conversions.some(text => text.includes("drops overtime")));
        const active = parse(yaml("utility", "  MIDI OVERTIME:\n    Is Over Time: true\n    Turn Choice: end\n    Save Removes: false\n    Roll As: source")).activityData;
        assert(active.overTimeProperties.turnChoice === "end" && active.overTimeProperties.saveRemoves === false);
    });
    check("MIDI Other Activity restrictions and aliases match authored YAML", () => {
        for (const type of ["attack", "save", "check", "utility"]) {
            const data = parse(yaml(type, "  MIDI CONDITIONS:\n    Use Other Activity: auto\n    Override action type: false")).activityData;
            assert(data.otherActivityId === "" && data.otherActivityAsParentType === false);
        }
        const result = parse(yaml("heal", "  HEALING:\n    Formula: '1d4'\n  MIDI CONDITIONS:\n    Use Other Activity: damage\n    Override action type: true"));
        assert(result.activityData.otherActivityId === undefined && result.warnings.some(warning => warning.includes("Other Activity")));
        const autoTrigger = parse(yaml("utility", "  MIDI CONDITIONS:\n    Trigger Activity: auto")).activityData;
        assert(autoTrigger.midiProperties.triggeredActivityId === "");
        assert(field("midiProperties.triggeredActivityId").coverage.conversions.some(text => text.includes("nonblank")));
    });
    check("MIDI effect change keys round trip without executing values", () => {
        const parsed = parse("EFFECT:\n  DETAILS:\n    Name: Flag fixture\n  CHANGES:\n    - Attribute Key: flags.midi-qol.advantage.all\n      Change Type: custom\n      Change Phase: final\n      Value: '(() => { throw new Error(\"never\"); })()'\n    - Attribute Key: flags.midi-qol.optional.example.count\n      Change Type: override\n      Value: 0");
        const source = JSON.stringify(parsed.effectData);
        const serialized = serializer.serializeEffectToStrictYaml(parsed.effectData);
        const roundTrip = parse(JSON.stringify(serialized.rawData));
        assert(roundTrip.effectData.system.changes[0].value.includes("never") && roundTrip.effectData.system.changes[1].value === 0);
        assert(JSON.stringify(parsed.effectData) === source);
    });
    check("MIDI-labelled effect control retains DAE ownership", () => {
        for (const alias of ["Midi-QOL", "MIDI-QOL", "MIDI_QOL"]) {
            const data = parse("EFFECT:\n  DETAILS:\n    Name: Incapacitation\n  " + alias + ":\n    Effect disabled if actor incapacitated: true").effectData;
            assert(data.flags.dae.disableIncapacitated === true && !data.flags["midi-qol"]);
            let rejected = false; try { serializer.serializeEffectToStrictYaml(data); } catch { rejected = true; }
            assert(rejected);
        }
    });
    check("MIDI Check damage mapping preserves explicit typed parts", () => {
        const data = parse(yaml("check", "  MIDI DAMAGE:\n    Damage on Save: half\n    Allow Critical: true\n    Extra Critical Damage Formula: '1d6'\n  MIDI DAMAGE_PARTS:\n    - DAMAGE_DATA:\n        Dice Count: 2\n        Die Denomination: 6\n        Bonus: '@mod'\n        Damage Types: [fire]\n        Custom Enabled: false\n        Custom Formula: '3d8'\n        Scaling Mode: ''\n        Scaling Dice Count: 0\n        Scaling Formula: ''")).activityData;
        assert(data.damage.parts[0].number === 2 && data.damage.parts[0].custom.formula === "3d8" && data.damage.critical.allow === true);
        assert(field("damage.parts[*].number", "check").coverage.yamlLocations[0].endsWith("DAMAGE_DATA.Dice Count"));
    });
    check("MIDI export gaps and newly discovered fields do not expand parser support", () => {
        const data = parse(yaml("attack", "  MIDI CONDITIONS:\n    AoE Target Type: enemy\n  regionBehavior:\n    enabled: true")).activityData;
        assert(!data.regionBehavior);
        let rejected = false; try { serializer.serializeActivityToStrictYaml(data); } catch { rejected = true; }
        assert(rejected && field("midiProperties.autoTargetType").coverage.stages.export === "unsupported");
        assert(field("regionBehavior.enabled").coverage.status === "unsupported");
        const invalid = parser.parseAllBlocksYaml(yaml("attack", "  MIDI ATTACK:\n    Fumble Threshold: 1.5"))[0];
        assert(!invalid.success);
    });
    check("MIDI parser unavailable warns while preserving supported data", () => {
        globalThis.game.modules.get("midi-qol").active = false;
        const result = parse(yaml("attack", "  MIDI CONDITIONS:\n    AoE Target Type: enemy"));
        assert(result.activityData.midiProperties.autoTargetType === "enemy" && result.warnings.some(text => text.includes("not active")));
        globalThis.game.modules.get("midi-qol").active = true;
    });
    return { tests };
}
