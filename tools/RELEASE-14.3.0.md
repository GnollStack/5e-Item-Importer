# Importer development-candidate 14.3.0 validation

Release numbering note (2026-10-18): the owner renumbered this unpublished candidate to 14.2.0. The original validation dates, candidate identifiers, artifact paths and hashes below remain historical evidence; use a fresh 14.2.0 build for publication.

Completed 2026-10-15 (America/Denver). Prepared as a separate, unpublished release after the preserved 14.2.0 compatibility builds.

## Delivered scope

- Existing ApplicationV2 selectors offer editable native recipes. Activity supplies conditional effects, filtered bonuses, AC calculations, minimum proficiency, expiry, terrain, linked effects, Transform forms and shared effects. Free Item recipes cover multiple rarities and dawn/dusk recovery; compatible companion recipes are obtained through its public API.
- YAML/strict attachment schema 4 preserves reviewed MIDI-QOL and DAE authored settings, including inactive options and typed empty/false/zero/null values. Public Item API schema 3 and feature envelope schema 2 remain separate. Previously supported YAML remains readable.
- Reference preflight reports unresolved, ambiguous and recursive local activity links before writes. External effect references remain external through export and undo. Synchronous serialization does not fetch documents.
- Native and automation fields appear in previews and comparisons. Type-specific Activity preview/comparison context is covered by regression tests. Explicitly empty automation flag mappings clear previous values during Item updates; merge retains existing values.
- Templates, generated automation references, native/MIDI catalogs, README/listing fragments and the media repository's Unreleased changelogs describe the release.
- Seven Item roots and eleven Activity types remain the supported scope. Item is free and standalone; Activity is optional premium and remains protected. No additional roots, advancement authoring, facilities, Order/Teleport or broader expansion work was added.

## Documentation audit follow-up

The 2026-10-15 documentation audit found stale detail below the updated release summaries and corrected it before rebuilding both archives. All 31 full Activity/Effect/Item templates, the shared MIDI reference, schema coverage guides, authoring guides, README/listing fragments and test guidance now describe the current schema 4 contract. The corrections cover reviewed MIDI/DAE export and comparison support, inactive overtime settings, macro names, Tool proficiency 1.5, current platform targets, ten-field damage data and native effect-key examples. The catalog's Tool proficiency description and legacy MIDI fallback wording were corrected as well.

Recipe instructions now explain available choices, provider requirements, draft replacement, UUID prompts and the separate preview/import step. Canonical AUTOMATION fields are explicitly separated from the native/legacy template blocks. Historical verification results retain their original versions and counts under historical headings. The `explicit-yaml-v2.md` and `Active Effect Keys V2.txt` filenames remain stable for existing links; the latter is a historical candidate dictionary, not a promise that every listed integration key works in the current system.

Fresh checks passed: Activity/Item parser and template checks 307/307 and 212/212; authoring 24/24 and 9/9; completeness 24/24 and 7/7; MIDI catalog checks 19/19 and 10/10; catalog services 10/10 each; Node regressions 36/36 and 38/38; manifest diagnostics 23/23; shared-helper parity across 22 files. The 13-file MIDI template lint reported zero issues, and both generated automation references matched their source definitions. Package checks passed 11/11 and 10/10, and release-contract checks passed 52/52. No new live gameplay claims are inferred from this documentation audit.

Fresh archives were rebuilt after the corrections and compared byte-for-byte with source; hashes below reflect these rebuilt artifacts. The original 14.2.0 archives remain unchanged. Local documentation and release files are updated; nothing was published. Audit evidence is retained under `dist/verification/14.3.0/docs-*`.

## Verified environment and results

Foundry 14.369, dnd5e 6.0.6, MIDI-QOL 14.6.0 and DAE 14.6.0. Source assets and packaged manifests are 14.3.0; the running world's cached package metadata still reports 14.2.0 until a world/server restart. Client reloads loaded the changed source for validation.

| Check | Activity | Item |
| --- | ---: | ---: |
| Final paired full smoke | 324/324 | 205/205 |
| Native source round trips with MIDI/DAE active | 58/58 | 12/12 plus 3 diagnostics guards |
| Final live catalogs | 22/22 | 19/19 plus 3 diagnostics guards |
| Final served assets | 80/80 | 35/35 |
| Offline parser, serialization and full templates | 307/307 | 212/212 |
| Catalog core / service | 21/21; 10/10 | 20/20; 10/10 |
| MIDI catalog/parser checks | 19/19 | 10/10 |
| Authoring / template completeness | 24/24; 24/24 | 9/9; 7/7 |
| Node regression suite | 36/36 | 38/38 |
| Package content checks | 11/11 | 10/10 |

Also passed: 23 manifest diagnostics, 52 release-contract checks, and byte parity across 22 shared files.

The controlled activation matrix covered both native importers together, Activity alone, Item alone, DAE without MIDI, and the restored MIDI/DAE paired profile. Standalone full smoke results were Activity 324/324 and Item 205/205; native round trips were Activity 54/54 and Item 12/12 plus 3 guards. The DAE-only Activity native/recipe suite passed 55/55 and its behavior fixture passed. Native-only and DAE-only recipe choices were checked independently from active MIDI storage.

Disposable live fixtures passed:
- Activity native-source persistence with all eleven types, native defaults, typed effects and expiry: 29 steps. Unlike the 14.2 probes, these retain MIDI fields without test-only projections. The fixture begins from a native model so explicit null defaults are distinguished from MIDI's intentional pre-create default for an absent otherActivityId.
- Item creation/update and inline attachments: 31 steps.
- Native recipes: 18 steps, including conditional application, AC calculation, minimum proficiency, filtered bonuses, short-rest expiry and dawn/dusk recovery through the native recovery API. Calendar time was not advanced to simulate a full dawn/dusk boundary.
- MIDI/DAE integration: 16 steps, including a completed deterministic utility workflow, strict export, DAE application/suppression/resumption and Item undo retaining an independent effect.
- Mixed embedded/external references, behavior configuration, Transform settings and owned-document undo were also exercised in the native fixture suite.

These results establish storage and the specific behaviors listed; they do not claim every possible macro, expression, combat, region or calendar workflow was executed.

## UI and cleanup

Computer Use verified the Activity layout, native/integration recipe choices, healing preview with false/empty fields, default-No draft replacement and cancellation preserving the original draft. Item UI verified multiple rarities, dawn recovery and a companion-supplied conditional effect. Automated tests cover reference-prompt cancellation, invalid reference types, standalone-reference requirements and reusable recipe immutability.

Each mutating fixture passed its non-fixture source guard and verified cleanup. Final counts: 20 Actors, 37 Items, 2 Scenes, 5 Journals, 17 Playlists, 1 Message and 13 active-scene Tokens; zero importer fixtures. The original module activation configuration and world time (726) were restored. Whole-world byte equality across the longer activation matrix was not achieved because ongoing background playlist playback updated Playlist.sH4E04zrwAEi9fb1; those playback changes were retained. Temporary profile-switch code and its localStorage backup were removed.

Release-readiness recheck on 2026-10-15 found that the updated Discord support link had changed the Activity manifest and both READMEs since the previous build. Both archives were rebuilt and inspected again; every packaged file now matches source and the hashes below reflect this refresh. Runtime files were unchanged. Release-contract checks (52), package checks (11 Activity / 10 Item), and shared-helper parity (22 files) passed again. Source commits/tags, publication and hosted-installation verification remain separate release steps.

## Distribution artifacts

Fresh artifacts live in Activity Importer's dist/paired/V14.3.0, with a release-pair.json receipt:
- Protected Foundry premium Activity archive: 116 entries, SHA-256 F75DAA4A679FE6444E8A81796885530029C5195AF97473CCE13930B32BD962D4.
- Free GitHub Item archive: 90 entries, SHA-256 F70E889BDB66E2566A1957D210B2B3CE9AB56A74D1C8D39001DE0F89B879477F.

Archive verifiers passed. Every archived file was additionally compared byte-for-byte with source. Embedded and standalone manifests match; runtime imports, required assets and documentation links resolve. Source tests, tools, verification captures and temporary profile code are excluded. Premium recipe bodies are absent from the free archive. Activity retains protected: true, the Foundry-hosted manifest and no download field.

The original 14.2.0 archives are unchanged:
- Activity SHA-256 657C5C4FB5FCD28DE6F9E2E408538CCF1559F83D05E57B3DAFCD53C210B5DB9F.
- Item SHA-256 D56BABAD72539035050704837CA1803D7669D1A5B5E108D4519C9D30F4B654D2.

Machine-readable evidence is in Activity Importer's dist/verification/14.3.0; earlier failed probes remain there for traceability. Final reports use release-* or *-final names, with paired-explicit-defaults-final.json being the passing native-default persistence report. Nothing was committed, uploaded or published. Publishing and hosted installation remain separate.
