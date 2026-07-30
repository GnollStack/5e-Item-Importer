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
