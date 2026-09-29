# Tests

These comprehensive developer suites are tracked in the source repository but
are intentionally excluded from production Foundry release archives. The
installed module retains a compact read-only MCP smoke suite under
`scripts/diagnostics/`.

From a Foundry browser console in a source checkout:

```js
const { ItemImporterTests } = await import("/modules/5e-item-importer/tests/foundry/itemImporterTests.js");
await ItemImporterTests.runStructured();
```

With MCP diagnostics enabled in a source checkout, the same comprehensive suite
is available through the module diagnostics API:

```js
await game.modules.get("5e-item-importer").api.diagnostics.actions.runSmokeTests({ suite: "full" });
```

Production releases omit this directory and default to the compact runtime
suite instead.

The focused standalone feature suite can be loaded with:

```js
const { runItemCoreFeatureTests } = await import("/modules/5e-item-importer/tests/unit/itemCoreFeatureTests.js");
await runItemCoreFeatureTests();
```

The Foundry platform/workflow regressions can be loaded with:

```js
const { runItemPlatformFeatureTests } = await import("/modules/5e-item-importer/tests/foundry/itemPlatformFeatureTests.js");
await runItemPlatformFeatureTests();
```

Neither suite should create Foundry world documents. Use the module's gated MCP
automation actions only when fixture mutation is explicitly intended.


## Explicit YAML v2 regression checks

Run `node --experimental-vm-modules tools/Test-ExplicitYaml.mjs` for read-only parser/serializer regressions and full-template checks. Native validation also runs in the existing full Foundry suite. The fixed creation tests use the existing `runAutomation` action with `{suite:"explicit",confirmMutation:true,cleanupBefore:true,cleanupAfter:true}` and remove their marked fixtures in finally. See the [coverage checklist](../docs/explicit-yaml-v2.md) for individual fields and exclusions.

## Stormglass import regression
The [Stormglass Requiem fixture](fixtures/stormglass-requiem.yaml) is the corrected complex weapon example with two activities and two linked effects. With diagnostics and mutation gates enabled in a source checkout, run:
```js
await game.modules.get("5e-item-importer").api.diagnostics.actions.runAutomation({
  suite: "stormglass", runId: "stormglass-comparison",
  confirmMutation: true, cleanupBefore: true, cleanupAfter: true
});
```
This fixed fixture uses the real Item creation workflow, validates all four IDs, checks activity/effect counts and links, and requires zero comparison discrepancies. Existing automation cleanup removes marked fixtures in finally.


## Reference-template completeness

The full reference templates are checked against this importer's current catalog coverage declarations. This is a check of the authored YAML blocks and their documented structural alternatives, including nested damage, lists, and inline effect fields. A mention in prose does not satisfy a missing field. It does not claim every native field or every runtime combination is supported.

```powershell
node --experimental-vm-modules tools/Test-TemplateCompleteness.mjs
node --test tools/template-completeness.test.mjs
```

The ordinary `tools/Test-ExplicitYaml.mjs` suite also runs the reference checks. Synthetic regressions verify that removed fields, conflicting canonical/legacy controls, and misleading value placeholders fail. Keep parser acceptance, native validation, sheet behavior, and template completeness as separate conclusions. Legacy compatibility fixtures remain valid; quick-start examples remain compact.

## Native field catalog regressions

The catalog suite runs against the active native models through the existing diagnostics gates and creates no world documents:

```js
await game.modules.get("5e-item-importer").api.diagnostics.actions.runSmokeTests({suite: "catalog"});
```

Run the source-only walker/provider, query/probe, and offline report regressions from the repository root:

```powershell
node --experimental-vm-modules tools/Test-FieldCatalogCore.mjs
node --experimental-vm-modules tools/Test-FieldCatalog.mjs
node --test tools/field-catalog-reports.test.mjs
```

The live suite checks full pagination, field identities, native-path coverage audits, representative raw/cleaned/contextual probes, unsupported-type classification, and unchanged world counts. Offline tests cover schema structures and variants, bounded inputs, omitted/null/false/zero values, stale cursors, complete snapshot assembly, and meaningful snapshot diffs. A mapping-path audit checks that declared paths exist; it does not prove every YAML value or sheet control.

Use the [catalog guide](../docs/native-field-catalog.md) for capture and report commands. Keep captures outside shipped documentation. The catalog runtime checks ship under `scripts/diagnostics/`; these source-only test files and tools remain excluded from production archives.

## MIDI field catalog regressions

Run node --experimental-vm-modules tools/Test-MidiFieldCatalog.mjs for isolated MIDI schema/registry, unavailable-module, immutable-candidate and coverage regressions. Activity Importer additionally tests its real YAML parser and strict serializer. The existing live runSmokeTests({suite:"catalog"}) checks complete MIDI paging and unchanged world document sources; runSmokeTests({suite:"full"}) remains the read-only regression suite.

Source-reviewed gameplay rules, declared mappings, named parser tests and candidate validation are separate evidence. These tests do not execute MIDI workflows, macros, conditions or resource consumption. See [the MIDI guide](../docs/midi-field-catalog.md).


## Template authoring checks

Run `node --experimental-vm-modules tools/Test-TemplateAuthoring.mjs` for marked example/file parity, source parser results, prerequisites and semantic assertions. Run `node --test tools/template-authoring.test.mjs` for negative documentation cases. The existing explicit YAML/completeness suites additionally check the declared MIDI template mappings. Keep native completeness, MIDI tests, full read-only smoke suites and shared-helper parity passing. These checks do not execute gameplay or establish independent LLM generation reliability.
