# Release packaging

The free 5e Item Importer and premium 5e Activity Importer share a development release version and use separate archives. The free module can be published first while the premium module remains private. Both repositories must be available locally for a paired build; a standalone free build never needs access to the private premium repository.

## Build both modules

From either repository:

```powershell
./tools/Build-PairedRelease.ps1 -CheckOnly
./tools/Build-PairedRelease.ps1
```

The companion defaults to its sibling directory. For a different checkout layout, pass `-CompanionPath C:/path/to/other-importer`. An optional `-OutputDirectory` selects an artifact directory; relative paths are resolved from the repository containing the script.

Before writing artifacts, the command checks:

- Both package versions match and use `major.minor.patch`.
- Both manifests declare matching Foundry and dnd5e minimum/verified versions and matching optional maximums. The current baseline is Foundry 14 / dnd5e 5.3.0, verified on 14.367 / 5.3.3.
- Activity Importer recommends the available free Item Importer. Item Importer may omit its premium recommendation while that companion is unreleased. Every recommendation that is present must verify the shared version, have a compatible minimum, and point to the other manifest's actual URL.
- Neither module makes the companion a hard requirement or pins a maximum version.
- The shared release contract, paired entry point, and contract tests match across repositories.
- Release contract tests accept future patch versions and reject stale recommendations, unequal pairs, hard dependencies, and stale GitHub download tags.

The build invokes each module's existing archive builder and verifier. Output defaults to `dist/paired/V<version>/` with separate `5e-item-importer/` and `5e-activity-importer/` folders. Each contains only that module's ZIP and standalone `module.json`. A `release-pair.json` receipt records both versions, editions, paths, and SHA-256 hashes only after both archives pass. A failed rebuild removes the previous receipt; partial artifacts without a new receipt are not a completed pair.

The command builds local artifacts. Publishing and premium access remain separate steps. Publish only the free folder to the public Item Importer release; the premium folder belongs in the private Activity Importer release until the premium pipeline is ready. Do not upload the entire paired directory to the free release.

## Prepare the next version

1. Update `version` in both source manifests to the same next release number.
2. Update each existing companion recommendation's `compatibility.verified` to that number. Do not restore the free module's premium install recommendation until Activity Importer has an accessible distribution route. Keep the existing `minimum` when the older API remains compatible; raise it only for an actual compatibility change.
3. Update each version-pinned GitHub `download` tag to `V<version>`. Keep current manifest URLs and distribution settings.
4. Update release notes and run the Foundry verification matrix below, then build the pair from the source intended for release.

The tools read versions from the manifests; there are no current-release version constants to edit in the build scripts or companion diagnostics. Package versions are coordinated, while YAML/API schema versions change only when their contracts change. Runtime capability checks continue to tolerate compatible installations updated one module at a time. Foundry/dnd5e support versions are distinct from package versions, but both importers must advertise the same support targets. Change both manifests, the matching runtime advisory/diagnostic constants, and documentation together. A declared minimum is not evidence that the exact minimum was tested; live checks currently use Foundry 14.367 / dnd5e 5.3.3.

## Foundry verification before publishing

The local packaging command does not claim to run Foundry or combat automation. Use the gated MCP `runSmokeTests` action for runtime and full source suites and validate served assets for both modules. Verify these configurations in a test world:

| Configuration | Required behavior |
|---|---|
| Free Item Importer alone | Parse/import all seven core Item types and export core YAML; incoming attachments warn and are skipped. |
| Both modules active | Parse and validate nested attachments, persist linked activities/effects, and export supported full Item YAML. |
| Compatible unequal versions | Core operations remain available; integration uses only detected public capabilities. |

Use the separately gated fixture automation when checking persistence and cleanup. Re-run affected checks after changes; do not report a packaging check as proof of live standalone behavior.

## Build or verify one module

For the current free-only publication, run the standalone Item Importer builder and upload only its `dist/5e-item-importer.zip` and matching `dist/module.json`. Build from the committed/tagged source intended for release. No premium publication is required; the paired build remains available for coordinated local verification.

```powershell
./tools/Build-Release.ps1
./tools/Verify-Release.ps1 -ArchivePath ./dist/5e-item-importer.zip
./tools/Test-ReleaseContract.ps1
```

The standalone builder writes `dist/5e-item-importer.zip` and `dist/module.json`, validates its own release contract, and requires no sibling checkout. Production archives exclude tests, tools, GitHub metadata, private LLM instructions, and `dist/`. Verification also checks required runtime assets, safe ZIP paths, pinned GitHub download tags, matching standalone manifests, and the vetted js-yaml 4.3.2 bundle and MIT notice.

## MIDI catalog selections and parity

The same assemble/render/diff commands accept MIDI pages. Select layer:midi in the MCP query; --layer midi can project a complete all-layer snapshot offline. It cannot invent missing layers. Follow every nextCursor, retaining filters and catalog metadata.

The parity check now covers sixteen shared files, including fieldCatalogMidi.js, fieldCatalogMidiRules.js, Test-MidiFieldCatalog.mjs and midiFieldCatalogTests.js. Provider-specific coverage stays independent. Run node --experimental-vm-modules tools/Test-MidiFieldCatalog.mjs alongside the native and report checks. See [the MIDI guide](../docs/midi-field-catalog.md).


## Template authoring checks

Run `node --experimental-vm-modules tools/Test-TemplateAuthoring.mjs` for marked example/file parity, source parser results, prerequisites and semantic assertions. Run `node --test tools/template-authoring.test.mjs` for negative documentation cases. The existing explicit YAML/completeness suites additionally check the declared MIDI template mappings. Keep native completeness, MIDI tests, full read-only smoke suites and shared-helper parity passing. These checks do not execute gameplay or establish independent LLM generation reliability.
