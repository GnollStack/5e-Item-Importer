# Native field catalog

MIDI-QOL discovery is available through the same actions with layer: "midi"; the default remains native. See [MIDI layers, configuration rules and coverage](midi-field-catalog.md) for selecting layers, interpreting unschematized flags, probing candidates and comparing snapshots. layer: "extensions" preserves unattributed active changes; layer: "all" includes all layers with separate identities.

The importers expose a read-only catalog for inspecting native Foundry and D&D5e fields before extending an explicit YAML template. It combines discovered schemas, reviewed sheet annotations, and the importers' declared YAML mappings. It can also test supplied values and produce offline references and version comparisons.

The reviewed runtime is **Foundry 14.367 / D&D5e 5.3.3**. The catalog records the actual runtime and module configuration on every response. No system upgrade, migration, world-document creation, new YAML root, or importer UI is introduced.

## What is cataloged

| Provider | Native discovery | Current YAML support |
|---|---|---|
| `5e-item-importer` | All 13 current native Item types and eight advancement types, including their model variants | Existing seven Item roots; additional Item types and advancements are catalog-only |
| `5e-activity-importer` | All 12 current native Activity types and base/enchantment Active Effects | Existing eleven Activity roots and Effects; facility Order is catalog-only |

Each provider works without the other importer. Item activity/effect relationships point to the Activity catalog rather than duplicating its field coverage. Container placement and actor crew assignments remain deferred. Custom D&D 5e Counters and expanded third-party import support are outside this feature.

Native model identity is recorded separately from active replacement classes such as MIDI-QOL activities. Running CONFIG entries may contain module additions, so the report identifies their provenance rather than calling every current dropdown entry a native D&D5e option.

## Read a field correctly

A field record has three separate layers:

| Layer | What it establishes |
|---|---|
| Native schema | Stored path, field class, constraints, required/nullable/persisted state, literal or contextual default, choices, structure, and validation metadata |
| Sheet annotation | Reviewed control choices, conditional visibility, inactive-value behavior, source references, and review versions |
| YAML coverage | Canonical locations, compatibility aliases, accepted representations/conversions, parse/build/export/template/preview/comparison declarations, and referenced tests |

For example, the spell preparation dropdown has the reviewed choices `0/1/2`, while canonical YAML uses `unprepared/prepared/always`. An isolated native number field may accept additional numbers; that does not make them supported preparation states. Likewise, the damage die dropdown lists standard die denominations, while the native numeric field and the YAML parser have their own acceptance rules.

`declared` means a mapping has been identified, not that every possible value has passed a round trip. A referenced test is evidence to inspect, not a fresh test result. Unknown mappings remain `needs-review`; unsupported types remain `unsupported`; structural containers, metadata, derived values, and delegated relationships have explicit exclusion reasons. Sheet review is partial, and annotations become stale when the reviewed Foundry or system version changes.

Array elements use `[*]`; dynamic mapping keys use `{key}`. A variant is part of field identity. Open objects have no finite child schema: their presence is reported without inventing a list of all possible keys. Unresolved or context-dependent choices are never an authoritative empty set. Formula syntax validation does not prove that every `@variable` exists in a later roll.

## Query through the existing MCP connection

Enable the existing GM diagnostics gates: active GM, the importer's Debug Logging setting, and Enable MCP Diagnostics. MCP calls also require the bridge's Developer Tools gate. The actions are under:

```js
game.modules.get("5e-item-importer").api.diagnostics.actions
game.modules.get("5e-activity-importer").api.diagnostics.actions
```

Use the existing `call_module_debug_action` tool; no new bridge wrapper or protocol is required.

| Action | Arguments and behavior |
|---|---|
| `getFieldCatalog` | Optional `kind`, `type`, `query`, `status`, `limit`, `cursor`. Default limit 100, range 1–200. Kind/type/status are exact filters; query searches field identity, path, class, and YAML locations. |
| `getFieldDetails` | `{fieldId}`, using the exact identity returned by the catalog. Returns one complete field record. |
| `probeFieldValues` | `{fieldId, values: [], includeMissing?, context?: {source?, parent?}}`. Submit 1–25 candidates in total, including the optional missing-value probe. |

The `kind` values are `item`, `advancement`, `activity`, and `effect`, as applicable to the provider. `status` filters YAML coverage status, not sheet review status.

Example MCP query:

```json
{
  "moduleId": "5e-item-importer",
  "action": "getFieldCatalog",
  "args": {"kind": "item", "type": "spell", "query": "system.prepared"}
}
```

For every page, retain the complete JSON response and follow `nextCursor` until it is null, preserving the filters. Cursors bind the query and catalog fingerprint. If configuration changes and a cursor is rejected, restart the capture; do not mix old and new pages. A filtered capture is complete only for that query.

Responses include format version, provider, catalog identity, environment, diagnostics, completeness information, and `writeCount: 0`. The catalog format is independent of Item YAML and Activity/Effect serialization versions. Authoritative field data is paginated instead of passed through the older diagnostics serializer's lossy preview limits.

## Probe values without creating documents

After finding a field, pass its returned identity and actual JSON candidates:

```js
const actions = game.modules.get("5e-item-importer").api.diagnostics.actions;
const page = await actions.getFieldCatalog({kind: "item", type: "spell", query: "system.prepared"});
const field = page.fields.find(entry => entry.path === "system.prepared");
const report = await actions.probeFieldValues({
  fieldId: field.id,
  values: [0, 1, 2, 3, false, null, "always"],
  includeMissing: true
});
```

Each candidate reports raw field validation, cleaning with before/after values and post-clean validation, and contextual model validation separately. Missing is distinct from null; false, zero, empty strings, arrays, and objects retain their types. Returned native Sets and Maps use explicit type markers.

`context.source` supplies plain source data for optional model validation. Use the relevant document/model source shape; Item and Effect system fields use the document's `system` source. The probe clones submitted data, inserts the candidate at its cataloged model path, and checks the available model and additional system schemas. It does not construct documents or run document preparation, link resolution, import workflows, or gameplay hooks.

Parent-dependent validation remains `incomplete` even if `context.parent` is supplied. Collection elements, variants, unresolved embedded/polymorphic content, and missing required context also return an explicit incomplete result. Use existing whole-template validation and dry-run diagnostics for those cases. Generated/contextual defaults are not evaluated merely to probe an omitted or null value.

Probe inputs are plain JSON data. No arbitrary global/property lookup, JavaScript evaluation, or caller-supplied choice/target callbacks are allowed. Native validation and cleaning methods still reflect the running world's registered configuration. A successful probe is an observed case, not proof of every accepted value or YAML support.

## Save references and compare versions

The source checkout includes a local Node tool. It reads saved files only; it does not connect to Foundry. Keep captures and generated references in a private workspace directory outside shipped documentation because environment metadata includes installed modules.

```powershell
node tools/Field-Catalog.mjs assemble pages.json --out snapshot.json
node tools/Field-Catalog.mjs render snapshot.json --out reference.md
node tools/Field-Catalog.mjs diff before.json after.json --out changes.json
```

`assemble` accepts raw pages, arrays of pages, saved MCP result envelopes, and multiple input files. It checks page continuity, catalog/query consistency, field identities, and completion; missing, duplicated, mixed, or truncated captures fail rather than silently becoming partial references. Both providers can be assembled into one snapshot.

`render` produces a Markdown reference containing native metadata, sheet notes, YAML coverage, provenance, and unresolved information. `diff` reports additions, removals, changed contracts/options, coverage changes, and relevant environment changes while avoiding translation/timestamp noise. A removed and newly added field is not automatically asserted to be a rename. Valid diff reports exit successfully even when differences exist; inspect the report.

Callback names/presence are recorded, but callback code and closure behavior are not compared. Identical snapshots do not prove unchanged validation, generated defaults, or dynamic choices. Runtime version changes prompt review; use value probes and whole-template tests to check behavior.

These developer tools and their tests are excluded from production module archives. The runtime catalog actions and this guide are included.

## Verification and maintenance

Run the read-only live catalog suite through either provider:

```js
await game.modules.get("5e-item-importer").api.diagnostics.actions.runSmokeTests({suite: "catalog"});
await game.modules.get("5e-activity-importer").api.diagnostics.actions.runSmokeTests({suite: "catalog"});
```

The suite checks discovery, pagination, classifications, reviewed mapping paths, representative probes, and unchanged world-document counts. It does not run controlled creation fixtures. Source regression commands are listed in [tests/README.md](../tests/README.md).

When adding explicit YAML support, update the actual parser/builder/serializer and templates/comparison first, add meaningful round-trip assertions, then update the coverage declaration and evidence references. Discovering a field or passing a mapping-path audit must never automatically enable import support or mark the mapping verified. The existing [YAML coverage checklist](explicit-yaml-v2.md) remains the reviewed import contract.


## Authoring with this reference

Use [the template authoring guide](template-authoring.md) with the relevant full templates. Schema discovery does not authorize arbitrary YAML fields; required/optional/contextual guidance and support stages determine what to author. Concrete examples and their prerequisites are listed [here](examples/README.md).
