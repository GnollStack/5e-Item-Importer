/** Reviewed source annotations, not validators or a generated snapshot. Keep importer copies identical. */
export const MIDI_REVIEW = Object.freeze({ midi: "14.0.9", system: "5.3.3", foundry: "14.367" });
const SOURCE = "modules/midi-qol/midi-qol.js";
const TAB = "modules/midi-qol/templates/activity/parts/midi-activity-tab.hbs";
export const MIDI_SHEET_OPTIONS = Object.freeze({
    rollMode: ["default", "publicroll", "gmroll", "blindroll", "selfroll"],
    removeChatButtons: ["default", "off", "attack", "damage", "all", "everything"],
    forceConsumeDialog: ["default", "always", "never"], forceRollDialog: ["default", "always", "never"],
    forceDamageDialog: ["default", "always", "never"], confirmTargets: ["default", "always", "never"],
    autoTargetType: ["any", "ally", "notAlly", "enemy", "notEnemy", "neutral", "notNeutral", "hostile", "notHostile", "Friendly", "notFriendly"],
    autoTargetAction: ["default", "none", "always", "alwaysIgnoreIncapacitated", "alwaysIgnoreDefeated", "wallsBlock", "wallsBlockIgnoreIncapacitated", "wallsBlockIgnoreDefeated", "walledtemplates"],
    autoCEEffects: ["default", "none", "itempri", "cepri", "both"],
    triggeredActivityTargets: ["self", "targets", "hitTargets", "missedTargets", "failedSaves", "saveTargets", "retarget"],
    triggeredActivityRollAs: ["self", "firstTarget", "firstHitTarget", "firstMissedTarget", "firstSaveTarget", "firstFailedSaveTarget"],
    attackRollPerTarget: ["default", "always", "never"], friendlySave: ["default", "friendlySuccess", "friendlyFail"]
});
const COMMON = new Set(["useConditionText", "useConditionReason", "effectConditionText", "isOverTimeFlag",
    "macroData", "macroData.name", "macroData.command", "ignoreTraits", ...["idi", "idr", "idv", "ida", "idm"].map(key => "ignoreTraits." + key),
    "midiProperties", ...["ignoreTraits", "triggeredActivityId", "triggeredActivityConditionText", "triggeredActivityTargets", "triggeredActivityRollAs",
        "triggeredActivityConsume", "triggeredActivityConfigure", "autoConsume", "forceConsumeDialog", "forceRollDialog", "forceDamageDialog", "confirmTargets",
        "autoTargetType", "autoTargetAction", "automationOnly", "otherActivityCompatible", "otherActivityAsParentType", "identifier", "displayActivityName",
        "rollMode", "chooseEffects", "toggleEffect", "ignoreFullCover", "removeChatButtons", "magicEffect", "magicDamage", "noConcentrationCheck",
        "skipConcentrationCheck", "autoCEEffects"].map(key => "midiProperties." + key),
    "overTimeProperties", ...["turnChoice", "saveRemoves", "rollAs", "preRemoveConditionText", "postRemoveConditionText"].map(key => "overTimeProperties." + key),
    "regionBehavior", ...["enabled", "dispositionFilter", "excludeSource", "oncePerTurn", "wallRestriction", "regionVisibility", "attachToken", "rules",
        "rules[*]", "rules[*].trigger", "rules[*].action", "rules[*].targetId"].map(key => "regionBehavior." + key),
    "regionLight", ...["enabled", "dim", "bright", "color", "alpha", "luminosity", "animationType", "animationSpeed", "animationIntensity"].map(key => "regionLight." + key),
    "otherActivityId", "otherActivityAsParentType", "otherActivityUuid", "attackMode", "ammunition", "attackRollPerTarget", "fumbleThreshold", "friendlySave", "friendlySummon"]);
const own = (value, key) => value && Object.getOwnPropertyDescriptor(value, key)?.value;
const options = (ids, source = SOURCE, extra = {}) => ({ ids: [...ids], source, kind: "reviewed-midi-sheet", complete: true, ...extra });
const contextual = (source, reason, ids = []) => ({ source, ids, kind: "context-dependent", complete: false, reason });

/** No sheet construction/preparation: some MIDI render/prepare hooks write or resolve linked documents. */
export function midiRulesFor(field, midi) {
    const path = field.path.replace(/\[\*\]$/, "");
    const leaf = path.split(".").at(-1);
    const current = midi.version === MIDI_REVIEW.midi && midi.reviewCurrent !== false;
    const sheet = { status: "needs-review", verifiedVersion: MIDI_REVIEW.midi, verifiedSystemVersion: MIDI_REVIEW.system,
        verifiedFoundryVersion: MIDI_REVIEW.foundry, options: [], conditions: [], visibleWhen: [], disabledWhen: [],
        inactiveBehavior: "Unknown; storage acceptance does not establish whether the sheet retains or gameplay uses a value.",
        editability: { status: "context-dependent", reason: "Inherited permissions and locked-document controls are not evaluated. Empty disabledWhen is not proof that a control is enabled." }, references: [] };
    const behavior = { status: "unresolved", gameplayTested: false, evaluated: false, applicableTo: field.applicableTo ?? [field.kind + ":" + field.type],
        dependencies: [{ module: "midi-qol", requiredFor: "MIDI automation", active: midi.active },
            { setting: "midi-qol.EnableWorkflow", requiredFor: "MIDI workflow automation" }],
        conditions: [], unresolved: [], references: [],
        schemaRepresentation: field.fieldClass === "MidiConditionField" ? "String; MIDI overrides FormulaField type validation to a string check. This does not validate expression syntax."
            : field.fieldClass ? "Use discovered storage, constraints, default and schemaChoices; sheet choices are a separate contract."
                : "No formal document DataField schema; registry/editor hints do not guarantee validation." };
    const review = (reference = TAB) => {
        sheet.status = current ? "reviewed" : "needs-review";
        sheet.references.push(reference);
        behavior.status = current ? "source-reviewed" : "needs-review";
        behavior.references.push(reference, SOURCE);
        if (!current) behavior.unresolved.push("Source review targets MIDI 14.0.9 / dnd5e 5.3.3 / Foundry 14.367; re-review this runtime.");
    };
    const condition = text => { sheet.conditions.push(text); behavior.conditions.push(text); };
    const dep = (module, requiredFor) => behavior.dependencies.push({ module, requiredFor, active: globalThis.game?.modules?.get?.(module)?.active === true });
    if (field.kind === "activity" && COMMON.has(path)) {
        review();
        sheet.inactiveBehavior = "Schema stores these values independently of visibility. Sheet submission retention and gameplay are not inferred from storage; see each condition and importer conversion.";
        if (MIDI_SHEET_OPTIONS[leaf]) sheet.options.push(options(MIDI_SHEET_OPTIONS[leaf]));
        if (/^midiProperties\.triggeredActivity/.test(path)) {
            condition("Subcontrols are hidden while triggeredActivityId is 'none'; hidden values remain representable in the schema.");
            sheet.visibleWhen.push(path.endsWith("triggeredActivityId") ? "MIDI tab available" : "midiProperties.triggeredActivityId != 'none'");
            condition("Gameplay requires a resolvable, triggerable activity and a non-aborted workflow; target pools depend on hit/save results. No references or trigger chains are resolved here.");
            if (leaf === "triggeredActivityId") sheet.options.push(contextual("MidiActivitySheet._prepareMidiQolContext", "Same Item activities except self, filtered by isTriggerableActivity; runtime resolver also accepts IDs, identifiers and UUIDs.", ["none"]));
            if (["triggeredActivityTargets", "triggeredActivityRollAs"].includes(leaf)) {
                const registryKey = leaf === "triggeredActivityTargets" ? "triggeredActivityTargetOptions" : "triggeredActivityRollAsOptions";
                const values = own(own(globalThis.MidiQOL, "midiPropertiesOptions"), registryKey);
                sheet.options.push(Array.isArray(values) ? options(values.map(entry => own(entry, "value")).filter(value => ["string", "number"].includes(typeof value)),
                    "MidiQOL.midiPropertiesOptions." + registryKey, { kind: "running-midi-registry", note: "Current registry may include further extensions." })
                    : contextual("MidiQOL.midiPropertiesOptions", "Runtime registry unavailable."));
            }
            if (leaf === "triggeredActivityRollAs") condition("The sheet restricts Roll As to self when the resolved target reports isSelfTriggerableOnly. In reviewed 14.0.9, Cast returns false; Forward is not triggerable. Historical comments are not authoritative.");
            if (leaf === "triggeredActivityConsume") condition("Controls consumption on the triggered workflow, separately from this activity's consumption.");
            if (leaf === "triggeredActivityConfigure") condition("Controls the triggered workflow configuration dialog, separately from its resource consumption.");
        }
        if (/^otherActivity(Id|AsParentType|Uuid)$/.test(path)) {
            condition("Top-level Other Activity fields exist on attack, save, check and utility. Do not infer support on damage/heal from canUseOtherActivity getters.");
            condition("Targets must be another compatible activity: save, check, damage, heal or utility with otherActivityCompatible enabled; actor/item context and link resolution are required.");
            if (path === "otherActivityId") sheet.options.push(contextual("MidiActivitySheet otherActivityOptions / MidiActivityMixin.otherActivity", "Sheet lists other compatible activities on the Item; runtime also supports ID, identifier and UUID. Blank selects Auto; none disables.", ["", "none"]));
            if (path === "otherActivityAsParentType") condition("Overrides the other activity action type using its parent's type; distinct from midiProperties.otherActivityAsParentType, which is also declared but not this control.");
            if (path === "otherActivityUuid") { sheet.visibleWhen.push("Deprecated; no authoring control"); condition("Deprecated field; Attack sheet submission clears it. Re-author otherActivityId."); }
        }
        if (path === "midiProperties.otherActivityAsParentType") {
            sheet.status = "needs-review"; behavior.status = "unresolved";
            behavior.unresolved.push("Schema declares this nested field, but the reviewed sheet uses top-level otherActivityAsParentType. No gameplay effect or YAML mapping is inferred.");
        }
        if (path === "midiProperties.otherActivityCompatible") {
            sheet.visibleWhen.push("possibleOtherActivity is true (save, check, damage, heal, utility)");
            condition("The schema accepts the flag on all MIDI activity classes; only possibleOtherActivity types can become Other Activity candidates.");
        }
        if (["autoTargetType", "autoTargetAction"].includes(leaf)) {
            sheet.visibleWhen.push("activity.target.template.type is non-empty");
            condition("Area targeting depends on the effective template and token dispositions; stored values alone do not create targets.");
            behavior.dependencies.push({ setting: "midi-qol.ConfigSettings.autoTarget", requiredFor: "autoTargetAction=default" });
            if (leaf === "autoTargetAction") dep("walledtemplates", "autoTargetAction=walledtemplates");
        }
        if (["autoConsume", "forceConsumeDialog"].includes(leaf)) {
            condition("shouldAutoConsume precedence: forceConsumeDialog=always returns false; never returns true; otherwise autoConsume=true returns true; default falls back to workflow/PC/GM consumption settings and Item type.");
            behavior.dependencies.push({ setting: "midi-qol.ConfigSettings.consumeResource / gmConsumeResource", requiredFor: "default consumption policy" });
        }
        if (["forceRollDialog", "forceDamageDialog"].includes(leaf)) {
            condition("default defers to workflow fast-forward configuration; always/never override the applicable roll/damage dialog. Keybindings and workflow options can interact; end-to-end combinations are untested.");
            behavior.dependencies.push({ setting: "midi-qol.ConfigSettings.autoFastForward / gmAutoFastForward", requiredFor: "default roll policy" });
        }
        if (leaf === "confirmTargets") {
            condition("forcedTargetConfirmation takes precedence over the stored confirmTargets value. Cast and Forward force never in 14.0.9.");
            if (["cast", "forward"].includes(field.type)) sheet.options = [options(["never"], SOURCE + ":forcedTargetConfirmation")];
            behavior.dependencies.push({ setting: "midi-qol.TargetConfirmation", requiredFor: "default confirmation policy" });
        }
        if (leaf === "skipConcentrationCheck") {
            sheet.visibleWhen.push("consumption.targets contains target='attributes.hp.value'");
            condition("Skips concentration checks for HP consumed by this activity; without HP consumption the stored value has no such effect.");
        }
        if (leaf === "noConcentrationCheck") condition("Suppresses concentration checks caused by this workflow's damage, distinct from skipping the source's HP-consumption check.");
        if (["chooseEffects", "toggleEffect"].includes(leaf) || path === "effectConditionText") {
            condition("Requires applicable linked/embedded effects and eligible effect targets. Transfer effects, DAE dontApply and workflow application settings affect eligibility; Cast/Forward/Transform have no supported importer APPLIED_EFFECTS workflow.");
            behavior.dependencies.push({ setting: "midi-qol.ConfigSettings.autoItemEffects", requiredFor: "automatic Item effect application" });
            if (leaf === "chooseEffects") condition("Prompts for selected eligible effects; a true flag with no applicable effects cannot supply an effect.");
            if (leaf === "toggleEffect") condition("Existing matching target effects can be toggled instead of duplicated; matching/application requires runtime context.");
        }
        if (leaf === "autoCEEffects") {
            sheet.visibleWhen.push("dfreds-convenient-effects integration is available");
            dep("dfreds-convenient-effects", "Convenient Effects selection/application");
            condition("default uses MIDI settings; none disables CE; itempri prefers Item effects; cepri prefers CE; both permits both sources.");
        }
        if (["ignoreFullCover", "ignoreTraits", "magicDamage"].includes(leaf) || path.startsWith("ignoreTraits.")) {
            sheet.visibleWhen.push("activity.damage exists");
            condition("Affects applicable damage/cover processing; schema presence on a non-damage activity is not gameplay support.");
            if (leaf === "ignoreTraits") sheet.options.push(contextual(SOURCE + ":getIgnoreTraitsOptions", "Category IDs idi/idr/idv/ida/idm plus category.damageType entries from the current damage registry; no finite closed schema enum.", ["idi", "idr", "idv", "ida", "idm"]));
        }
        if (leaf === "magicEffect") { sheet.visibleWhen.push("save/check effect extras"); condition("Marks non-spell saves/checks as magical for relevant resistance logic; spells already count as magical in the reviewed save workflow."); }
        if (leaf === "automationOnly") condition("Hides the activity from normal activity selection. It remains available to applicable automation and Other Activity selection.");
        if (path === "attackMode") sheet.options.push(contextual(SOURCE + ":MidiAttackActivitySheet", "Parent Item system.attackModes; available handedness and weapon modes depend on the Item."));
        if (path === "ammunition") { sheet.visibleWhen.push("Parent Item has the amm property"); sheet.options.push(contextual(SOURCE + ":MidiAttackActivitySheet", "Parent Item ammunitionOptions depend on actor inventory; documents are not enumerated.")); }
        if (path === "fumbleThreshold") condition("MIDI schema declares a NumberField without an integer/range bound here; do not invent a 1..20 schema constraint. YAML uses integer coercion.");
        if (path.startsWith("overTimeProperties")) {
            sheet.visibleWhen.push("isOverTimeFlag=true");
            condition("Overtime controls are hidden while isOverTimeFlag=false. The schema can retain values; the current importer drops these subfields in that state.");
            if (leaf === "turnChoice") { sheet.options.push(options(["start", "end"])); condition("Source declares default:'start', not initial:'start'; use the observed schema default/cleaning result instead of assuming these are equivalent."); }
            if (leaf === "rollAs") sheet.options.push(options(["target", "source"]));
            condition("Overtime execution requires a corresponding effect/combat trigger and actor/source context; no turn processing is performed.");
        }
        if (path.startsWith("macroData")) {
            dep("dae", "Activity Macro editor (DAE.DIMEditor)");
            condition("Macro command is stored text. The editor and execution require their integrations and on-use configuration; this catalog never compiles or invokes commands.");
        }
        if (path.startsWith("regionBehavior") || path.startsWith("regionLight")) {
            sheet.references.push("modules/midi-qol/templates/apps/RegionBehaviorEditor/regionBehaviorEditor.hbs");
            sheet.visibleWhen.push("effective activity has an area target");
            condition("Region configuration requires area targeting and regionBehavior.enabled; light values additionally require regionLight.enabled.");
            condition("MIDI's activity-sheet render hook may set target.override=true when region behavior is enabled. Catalog discovery never constructs or renders that sheet.");
            if (leaf === "trigger") sheet.options.push(options(["entry", "exit", "turnStart", "turnEnd"], SOURCE + ":RegionBehaviorEditor"));
            if (leaf === "action") sheet.options.push(options(["useActivity", "applyEffect", "removeEffect"], SOURCE + ":RegionBehaviorEditor"));
            if (leaf === "targetId") sheet.options.push(contextual(SOURCE + ":RegionBehaviorEditor", "Activity ID/identifier for useActivity; effect reference for apply/remove. The action controls interpretation; no links are resolved."));
            if (leaf === "animationType") sheet.options.push(contextual("CONFIG.Canvas.lightAnimations", "Runtime animation registry; source options may be extended by other modules."));
            if (path.startsWith("regionLight")) {
                sheet.status = "needs-review";
                behavior.unresolved.push("regionLight is declared in the schema; the reviewed RegionBehaviorEditor template does not expose its controls. Sheet editing and gameplay need further review.");
            }
        }
        if (/ConditionText$/.test(path) || path === "useConditionText") {
            condition("Expressions use workflow/actor/target roll data and are stored without execution. A string or formula syntax check cannot establish variables, truth, safety or automation success.");
            behavior.dependencies.push({ setting: "midi-qol.ConfigSettings.conditionEditorEnabled", requiredFor: "condition-editor button only" });
        }
        if (path === "friendlySummon") condition("Summon-specific control; disposition and placement require actor/token context. No summon is created by discovery.");
    } else if (field.kind === "activity" && ["save", "check"].includes(field.type) && path.startsWith("damage")) {
        review(SOURCE + ":MidiSaveActivity / MidiCheckActivity.defineSchema");
        condition("MIDI adds Check damage and save/check critical controls. Changed inherited defaults/choices are recorded against the native model separately.");
        if (path === "damage.onSave") sheet.options.push(options(["none", "half", "full"], "modules/midi-qol/templates/activity/save-effect.hbs"));
        behavior.unresolved.push("Other inherited damage controls retain their separate native catalog annotations; current gameplay combinations are not tested.");
    } else if (field.configurationTarget) {
        review(SOURCE + ":setupMidiFlags");
        sheet.options.push(contextual("MidiQOL.midiFlags / DAE effect-change editor", "A declared change key is not a native field enum or validation guarantee. Key, change type, phase, effect state and target context must agree."));
        sheet.inactiveBehavior = "Effect values are stored data. Disabled/suppressed effects and inapplicable change targets may be inactive; no effect is applied by the catalog.";
        dep("dae", "MIDI registered effect-change browser/types and contextual application where required");
        behavior.status = "needs-review";
        behavior.unresolved.push("Individual registry key gameplay, defaults and accepted values need review. Registry membership is discovery evidence only.");
        if (field.pattern) condition("Pattern placeholders are author-selected names/paths, not literal keys and not an exhaustive option list.");
        if (/\.OverTime$/.test(field.configurationTarget)) condition("OverTime is a MIDI effect-change specification string; field assignments, expressions, saves and replacement effects depend on the overtime parser/context. No expression is evaluated.");
        if (/\.ActivityOverTime$/.test(field.configurationTarget)) condition("ActivityOverTime references activity-based overtime; resolving the activity and effect/combat context is required.");
        if (/\.(advantage|disadvantage|noAdvantage|noDisadvantage|fail|success)\./.test(field.configurationTarget)) condition("Registry may offer a BooleanFormulaField editor; boolean/condition interpretation is integration behavior, not a document DataField guarantee.");
    } else if (field.kind === "item" && path.startsWith("flags.midi-qol.")) {
        review(SOURCE + ":ItemOnUseMacrosConfig / itemPrepareData");
        if (path === "flags.midi-qol.onUseMacroName") {
            sheet.visibleWhen.push("User role >= ConfigSettings.midiPropertiesTabRole; Item macro configuration requires activity-capable Item context");
            sheet.options.push(contextual("ItemOnUseMacrosConfig + MidiQOL.MQOnUseOptions", "Macro selectors include ItemMacro, ActivityMacro-<id>, Custom; passes come from onUseMacroOptions and Workflow.stateHooks. Macro names/UUIDs require context."));
            condition("Stored comma-separated on-use entries encode [pass]macro. Empty string means none. No macro is resolved or executed.");
            dep("dae", "DIME editor for ItemMacro / ActivityMacro entries");
        } else if (path === "flags.midi-qol.onUseMacroParts") {
            condition("Derived during item preparation from onUseMacroName; never an authored persisted replacement for that flag.");
        } else if (path === "flags.midi-qol.noProvokeReaction") {
            condition("A truthy Item flag suppresses reaction processing for that Item's save workflow; workflowOptions.noProvokeReaction can also suppress it. This is source-reviewed conditional behavior, not a schema-validated boolean.");
        } else {
            sheet.status = "needs-review"; behavior.status = "unresolved";
            behavior.unresolved.push("Open MIDI Item flags are not a complete list. Historical, transient and context-only flags are not automatically authorable settings.");
        }
    } else if (path === "flags.dae.disableIncapacitated") {
        review("modules/dae: disableIncapacitated integration / importer extractEffectAutomation");
        dep("dae", "storage and incapacitation handling for the control labelled Midi-QOL in importer references");
        condition("Despite the YAML section label Midi-QOL, this writes flags.dae.disableIncapacitated. It is DAE-owned integration data, not a MIDI-owned native schema field.");
    } else {
        behavior.unresolved.push("Discovered configuration has no reviewed sheet/gameplay annotation. Do not infer applicability or importer support from its name.");
    }
    if (!midi.active) behavior.unresolved.push("MIDI is unavailable; annotations are reviewed source references, not evidence of an active schema or runtime behavior.");
    return { sheet, behavior };
}

export function midiDeclarations(provider, types, { unavailableTypes = [] } = {}) {
    const declarations = [];
    if (provider === "5e-item-importer") {
        for (const { type } of types.filter(type => type.kind === "item")) {
            for (const [path, extra] of [
                ["flags.midi-qol.onUseMacroName", { default: { kind: "source-fallback", value: "", note: "Absent value is treated as no macros by preparation, not a DataField default." } }],
                ["flags.midi-qol.onUseMacroParts", { classification: "derived", persisted: false }],
                ["flags.midi-qol.noProvokeReaction", { default: { kind: "source-fallback", value: false, note: "Missing flag does not suppress workflow reaction handling." } }],
                ["flags.midi-qol.{path}", { pattern: true }]
            ]) declarations.push({ kind: "item", type, path, ...extra, reference: SOURCE + ":ItemOnUseMacrosConfig / itemPrepareData" });
        }
    } else {
        for (const type of unavailableTypes.filter(type => type !== "order")) {
            for (const path of COMMON) {
                if (["otherActivityId", "otherActivityAsParentType"].includes(path) && !["attack", "save", "check", "utility"].includes(type)) continue;
                if (["attackMode", "ammunition", "fumbleThreshold", "attackRollPerTarget", "otherActivityUuid"].includes(path) && type !== "attack") continue;
                if (path === "friendlySave" && !["save", "check"].includes(type)) continue;
                if (path === "friendlySummon" && type !== "summon") continue;
                declarations.push({ kind: "activity", type, path, classification: "unresolved-schema-reference",
                    schemaReference: true, reference: SOURCE + ":reviewed MIDI 14.0.9 schema; runtime schema unavailable" });
            }
        }
        for (const { type } of types.filter(type => type.kind === "activity")) declarations.push({ kind: "activity", type,
            path: "flags.midi-qol.{path}", pattern: true, reference: SOURCE + ":MidiActivityMixin (no formal flags child schema)" });
        for (const { type } of types.filter(type => type.kind === "effect")) {
            declarations.push({ kind: "effect", type, path: "flags.midi-qol.{path}", pattern: true,
                reference: SOURCE + ":effect application and overtime metadata",
                applicableTo: ["ActiveEffect MIDI metadata; castData, overtime counters and source links are context-generated, not generic authoring fields"] });
            for (const group of ["castData", "overtime"]) declarations.push({ kind: "effect", type,
                path: "flags.midi-qol." + group + ".{key}", pattern: true, classification: "context-generated-metadata",
                reference: SOURCE + ":effect application / overtime bookkeeping",
                applicableTo: ["Runtime effect metadata; manually authoring this pattern has no declared importer support"] });
            declarations.push({ kind: "effect", type, path: "flags.dae.disableIncapacitated", owner: "dae", integration: true,
                reference: "modules/dae: disableIncapacitated; importer extractEffectAutomation" });
        }
        for (const target of ["flags.midi-qol.{path}", "flags.midi-qol.OverTime", "flags.midi-qol.ActivityOverTime"]) declarations.push({
            kind: "effect", type: "base", path: "system.changes[*].value", variant: "change.key=" + target,
            configurationTarget: target, pattern: target.includes("{"), reference: SOURCE + ":setupMidiFlags / daeFieldBrowserFields" });
    }
    return declarations;
}
