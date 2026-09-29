# Explicit template authoring

Use this guide with the selected full reference templates. Item YAML schema 2, Activity/Effect serialization schema 2, feature envelopes and catalog format versions are separate contracts. Current field documentation targets D&D5e 5.3.3 / Foundry 14.367; reviewed MIDI behavior targets 14.0.9. Check current versions and coverage when that environment changes.

## Assemble the reference set

| Task | Supply to the LLM |
| --- | --- |
| Core Item | This guide, templates/README.md, the one matching strict Item template and source description. |
| Complete Item | Core set plus each relevant Activity/Effect template. Confirm both importers are available. |
| Direct Activity/Effect | This guide, Activity Importer's generation guide and each matching template. Specify the parent Item type. |
| MIDI automation | Add MIDI variants, MIDI Common Fields Reference.md and docs/midi-field-catalog.md. Confirm intended integrations and known settings. |
| Preserve existing data | Add the actual stored source values or trustworthy export and coverage limitations; a description cannot reconstruct hidden stored settings. |

A hyperlink is not proof that the LLM has received its contents. Provide the needed files, or use an agent able to read them. Full templates keep essential rules locally; deeper integration/reference behavior remains in the named companion documents. A large unfiltered catalog capture is not required for ordinary generation.

## State the task

Before writing YAML, identify the destination, source mechanics, confirmed modules and whether this is creation or preservation. Free/core Item output is the default when Activity Importer availability is unknown. An explicit free/core request wins even when the companion exists. Premium/full and creation/preservation are prompt instructions, never YAML keys.

For source conversion, do not invent damage, bonuses, costs, targets, durations, class restrictions or automation. Creative homebrew requests may define new mechanics; keep the item description and structured fields consistent. A lookup/enricher preserves interactive text, but does not create an Activity.

For preservation, retain all supported supplied inactive values independently of their controlling toggles. A parser limitation is a limitation: for example, inactive MIDI overtime subfields are dropped and native Tool proficiency 1.5 is unsupported. Do not claim lossless preservation when the importer cannot represent a value.

Ask for a missing fact if it changes a material mechanic or a required link. Do not manufacture UUIDs, document IDs, macro names or roll-data variables. If a mechanic has no supported mapping, retain it in the description with a clear manual-handling note. Resolve missing required links before final importable output.

## Choose fields deliberately

| Status | Authoring behavior |
| --- | --- |
| Required | Supply a concrete valid value at the stated location. |
| Conditionally required | State the controlling choice and whether the requirement is parser, schema or intended gameplay behavior. |
| Optional | Omit for new data when unsupplied; preserve a supported supplied value. |
| Context-dependent | Supply or resolve the required parent, actor, document or workflow context. Validation may remain incomplete. |
| Compatibility input | Read older input where supported; write the canonical spelling and avoid conflicting aliases. |
| Unsupported / needs review | Do not invent a YAML path from a native or module schema path. Preserve source rules as text and disclose the gap. |

The full reference shows the supported authoring surface. It is not a demand to populate every field for a newly created item. The first YAML fence remains the full reference because the loader/completeness tooling selects it. Runnable examples follow it.

Numeric formulas are still formulas: preserve their strings and @references. Non-formula integers reject fractions. Missing, null, false, zero, empty text and empty collections are different. n/a is a field-specific compatibility unset marker. Use all nine DAMAGE_DATA members for a newly authored explicit damage value; keep shorthand out of that same value.

For complete Items, each Activities list entry contains one ACTIVITY_* block; each effects entry begins with DETAILS without an EFFECT wrapper. APPLIED_EFFECTS belongs inside its activity. Use --- only between YAML documents, never as a substitute for separate list entries. Ordinary Actor effects and Item enchantments require different target keys.

## References, resources and automation

Parent-item charges use CONSUMPTION itemUses with the target omitted. A different Item or material requires a real eligible reference. Resource consumption and roll/configuration dialogs are independent. MIDI forceConsumeDialog=always overrides autoConsume=true; the never setting requests automatic consumption; default defers to workflow settings.

Native Forward accepts an exact ID, identifier or unique exact name of a non-Forward activity on the Item/in the batch, with planner checks. MIDI Trigger Activity/Other Activity resolution belongs to MIDI and requires its separate context. Do not claim that native Forward planning validates MIDI links. Trigger Condition is optional; target pools and Roll As should match the intended workflow.

Cast needs a spell Item UUID; direct-link Summon/Transform needs an Actor UUID. Names may assist lookup but are not resolved links. Published bundled examples intentionally name their required compendium entries; availability must still be checked in the user's world.

Effects need correct ownership, target, phase, duration and application conditions. A registered change key is not a document DataField validator. Prefer status lists for conditions, named Change Type and Change Phase for typed changes. DAE and MIDI metadata are not interchangeable. No macro execution is necessary to use the examples.

## Evidence and validation

Schema acceptance, sheet options, declared parser support, tested YAML cases and tested gameplay are different evidence. Inspect parse/build/export/template/preview/comparison separately. Strict live MIDI activity export rejects extensions; dedicated MIDI preview/comparison extraction is absent. A Base template can still produce MIDI-extended documents in an active MIDI world.

1. Parse the generated YAML and inspect every warning.
2. Validate Item source and the full attachment batch through the existing diagnostics/dry-run flow.
3. Confirm intended data survived: damage, costs, target/DC, references, effects and inactive settings.
4. Resolve contextual references before import. Review unknown or unsupported fields.
5. Test intended gameplay separately on suitable test actors when authorized. Passing the earlier checks is not a combat test.

Read-only actions include Item Importer validateText and Activity Importer analyzeText/analyzeItemText. Capture-only or isolated field checks can report incomplete context; do not treat that as complete import preflight. These diagnostics require the existing GM/debug/MCP gates. No generated document should call diagnostics or contain report metadata.

## Ready-to-use prompt

```text
Use the supplied generation guide and matching explicit templates.
Destination: [Item Importer core / complete Item / direct Activity or Effect].
Task: [create from the following source / preserve the following stored data].
Confirmed modules and versions: [actual environment].
Parent Item type and available references: [known context].

Keep source rules and structured mechanics consistent. Use canonical keys and
preserve meaningful value types. Include only supported mechanics and supplied
settings. Ask about missing material information or required references before
producing final importable output. Keep unsupported mechanics in the description
with a manual-handling note. Return one YAML code block with no placeholders.
```

Replace the prompt placeholders; they are not YAML. Supply the source text/data after the prompt.

See [concrete examples](examples/README.md) and [catalog evidence](native-field-catalog.md). Independent LLM reliability requires a separate evaluation using only the documented input set; author-assisted fixture checks alone do not establish it.
