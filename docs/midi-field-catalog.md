# MIDI-QOL field discovery and YAML coverage

The existing read-only catalog actions accept an optional layer selector. The default remains native Foundry/D&D5e discovery. Catalog format version 1, YAML versions, diagnostic gates and the MCP transport are unchanged.

| Selection | Contents |
| --- | --- |
| omitted or layer: "native" | Existing native fields, sheet annotations and importer coverage; existing identities are preserved. |
| layer: "midi" | MIDI schema differences, published flag declarations, reviewed source references and the narrowly identified DAE integration control. |
| layer: "extensions" | Active schema differences whose MIDI ownership is unproven. |
| layer: "all" | All three layers, retaining separate identities and provenance. |

Use the existing allowlisted call-module-debug-action interface with moduleId "5e-item-importer" or "5e-activity-importer". The active GM, module Debug Logging/Enable MCP Diagnostics and bridge Developer Tools gates still apply.

~~~json
{
  "moduleId": "5e-activity-importer",
  "action": "getFieldCatalog",
  "args": {
    "layer": "midi",
    "kind": "activity",
    "type": "attack",
    "query": "autoTarget",
    "limit": 100
  }
}
~~~

Keep the same layer and filters while following every nextCursor. Limit remains 1–200. A changed catalog or selection invalidates old cursors. Pass the returned field's id as fieldId to getFieldDetails or probeFieldValues; these infer a MIDI/extension layer from its identity unless layer is supplied explicitly. A native identity is unchanged; its MIDI counterpart is prefixed with "midi/". Unattributed identities use "extensions/". Do not construct arbitrary flag paths as probe identities.

The query searches paths, IDs, variants, configurationTarget and canonical YAML locations. For example, query "flags.midi-qol.advantage.all" finds the declared effect-change target. Its actual effect storage is system.changes[*].value with a change.key selector, not an ActiveEffect document flag of the same name.

## Four different contracts

| Evidence | Meaning |
| --- | --- |
| Discovered schema | Current class, default, constraints and schema choices. This is data acceptance, not a sheet menu or gameplay guarantee. |
| Reviewed sheet/source | Menu choices, visibility, precedence and integration rules reviewed against the version in provenance. Sheet preparation is never invoked. |
| Declared importer mapping | Canonical YAML locations, aliases, values, conversions, conditions and separate parse/build/export/template/preview/comparison statuses. |
| Named tests | Referenced test cases for specified stages. Run results are separate evidence; no mapping becomes universally verified because one test or probe passes. Gameplay is explicitly untested by discovery. |

The reviewed source baseline is MIDI-QOL 14.0.9, D&D5e 5.3.3 and Foundry 14.367. Review status is downgraded on a different runtime. Current versions, selected MIDI settings and active constructor boundaries are recorded in environment.midi. Captures are environment-specific and belong outside shipped documentation.

Native constructors are compared with the class that MIDI actually extended, MIDI's public activity constructor registry, and later active replacements. Earlier/later extensions are kept unattributed. A class name alone is not proof of MIDI ownership. Native constructors can themselves consult modified CONFIG registries, so this is not a pristine reconstruction of D&D5e configuration. Changed inherited fields retain the baseline contract, changed properties and native identity. Callback presence/names are metadata; callback implementation changes cannot be established by snapshot equality.

Item/ActiveEffect replacements have no reviewed MIDI constructor registry equivalent. Their active differences are disclosed without assigning ownership to MIDI. MIDI's current Item/ActiveEffect replacement classes need not add formal fields. The Item catalog separately describes on-use macro flags, the reaction suppression flag, derived macro parts and open flag patterns. The Activity catalog describes MIDI activity schemas, published MIDI effect-change registrations, context-generated effect metadata patterns and the existing Midi-QOL-labelled DAE incapacitation control.

Published MidiQOL.midiFlags entries are declaration evidence. Editor types, including BooleanFormulaField, are not document DataFields. The registry may contain module additions; original authorship is not independently established. NAME slots become {name} patterns. Actor flags applied through changes, token-oriented integration paths and document-owned flags retain their distinct meanings. Open patterns and unreviewed entries remain incomplete.

## Representative configuration rules and gaps

| Configuration | Discovery / behavior | Current YAML coverage |
| --- | --- | --- |
| Area target type/action | Sheet controls appear for an area target. Schema StringFields accept more strings than the menu; walls/dispositions/integrations affect targets. | MIDI CONDITIONS.AoE Target Type / Target on Template Draw use the importer's explicit enums. |
| Trigger | Target pools depend on workflow results; links, triggerability and cycles require context. Subcontrols hide when trigger ID is none. | IDs/identifiers/UUIDs are stored. Use none to disable. Legacy auto becomes blank and conflicts with the nonblank trigger schema. |
| Resource/dialog overrides | forceConsumeDialog=always overrides autoConsume=true; never forces automatic consumption; default uses workflow and PC/GM settings. | Parse/build are declared; the catalog never consumes a resource or opens a dialog. |
| Other Activity | Top-level fields exist on attack/save/check/utility. Candidate types and otherActivityCompatible impose further restrictions. | Unsupported types warn and omit these fields. Nested midiProperties.otherActivityAsParentType is a separate, unresolved mapping. |
| Target confirmation | Cast and Forward force never in reviewed 14.0.9, independently of the stored value. | The schema and importer can retain a broader value than the effective control. |
| Effects / concentration | Requires applicable effects, effect targets and automation settings. Skip Concentration Save applies to HP consumption. Convenient Effects requires its optional integration. | Existing mappings remain; setting a flag does not supply missing effects or dependencies. |
| Overtime | Schema stores hidden subfields independently of isOverTimeFlag. Defaults must be read from schema metadata, not guessed from menu entries. | Current parser drops overtime subfields when Is Over Time is false. Activity Macro still stores command text. |
| Region behavior/light | Added schema fields and constraints are discovered. Region-sheet render can change target.override; light editing remains partly unreviewed. | Unsupported fields remain coverage gaps. No parser/export expansion accompanies discovery. |
| Fumble threshold | MIDI declares a NumberField without an integer/range bound. | YAML requires a safe integer/exact numeric string and rejects fractions or formula prefixes. |
| Effect change keys | MIDI registry keys/patterns describe applied targets, not native validation. Typed values are retained. | Generic CHANGES storage and strict serialization are supported; key-specific gameplay is unreviewed. |
| Midi-QOL incapacitation control | The stored path is flags.dae.disableIncapacitated, owned by DAE. | Existing section aliases are recorded; strict effect export rejects third-party flags. |
| Item MIDI flags | Declared or explicitly unresolved; no fabricated child DataField schemas. | No item-specific MIDI mapping is declared. Item Importer remains independent of Activity Importer. |

Strict live Activity YAML export rejects MIDI extension fields. Dedicated MIDI preview/comparison extraction is absent. Preserved original YAML/provenance and generic feature serialization do not establish a lossless export of a live MIDI Activity. Consult each stage instead of treating parse/build support as end-to-end support.

## Read-only candidates

probeFieldValues still separates raw validation, cleaning/post-clean validation, and contextual validation on cloned JSON data. Missing and null are distinct. Reviewed scalar extension validators may be used; custom callbacks, unresolved fields, generated/contextual defaults, container/reference checks and unschematized flags return incomplete where safety or context is unproven.

MIDI extension model preparation and joint validation are incomplete by design. No world documents are constructed, created, updated or deleted. No macros, MIDI conditions, gameplay rolls, sheet hooks or linked-document resolution run. MidiConditionField checks string type rather than expression correctness. Formula syntax acceptance does not prove referenced variables exist.

When MIDI is inactive/absent, the native catalog continues independently. MIDI source references remain classified as unresolved-schema-reference with no fabricated schema validators; the live flag registry is explicitly unavailable. Runtime module toggling is not needed for isolated source tests.

## Snapshots and verification

The existing source-only tools accept these pages without a new protocol:

~~~text
node tools/Field-Catalog.mjs assemble pages.json --out snapshot.json
node tools/Field-Catalog.mjs render snapshot.json --layer midi --out midi-reference.md
node tools/Field-Catalog.mjs diff before.json after.json --layer midi --out midi-changes.json
node tools/Field-Catalog.mjs --check-parity COMPANION_PATH
node --experimental-vm-modules tools/Test-MidiFieldCatalog.mjs
~~~

A complete all-layer capture can be projected to native/MIDI/extensions offline. A capture of a different single layer cannot supply missing data. Comparisons detect schema/choice, behavior, coverage and provenance changes separately from environment changes. Complete pagination does not mean complete knowledge of freeform paths or gameplay.

Run the native catalog, explicit YAML/template-completeness, report and existing read-only full smoke suites as well. runSmokeTests({suite:"catalog"}) includes MIDI paging, candidates and unchanged world-source checks. The synthetic source suite tests both availability states, independent providers, earlier/later extensions, changed inherited constraints, unknown fields and choice changes. It never changes a live world's module settings.


## Authoring with this reference

Use [the template authoring guide](template-authoring.md) with the relevant full templates. Schema discovery does not authorize arbitrary YAML fields; required/optional/contextual guidance and support stages determine what to author. Concrete examples and their prerequisites are listed [here](examples/README.md).
