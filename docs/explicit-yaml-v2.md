# Explicit Item YAML v2 and field coverage

Item exports now use `SCHEMA_VERSION: 2`. Versions 0 (including a missing version) and 1 are accepted and handled in memory; saved worlds are not migrated. Activity/Effect strict serialization descriptors 1 and 2 are accepted by the optional companion integration. The separate feature-envelope version is unchanged.

The seven supported roots remain WEAPON, EQUIPMENT, CONSUMABLE, TOOL, LOOT, CONTAINER and SPELL. Core import/export works without Activity Importer. Existing attachment, MIDI-QOL and DAE integration behavior is retained.

## Value rules

The verification target is D&D5e **5.3.3** on Foundry **14.367**. Installed `dnd5e.mjs`, its shared field classes, and `templates/items/details/`, `templates/activity/`, and effect forms are the reference. This is a fixed field contract, not a general document-path import API.

Missing keys use the existing parser/native defaults. Within the mapped fields, preserve explicit false, zero, empty collections and native nullable values according to each field's parser contract. Use YAML `null` only where nullable storage is supported; `n/a` is an empty/default compatibility marker, not a universal replacement for false, zero, null, or an empty list. An inactive native setting does not enable its controlling checkbox. Formula fields remain strings and are validated through the existing Foundry model validation path. Numeric fields accept exact finite numbers; integer fields reject fractions and expressions. Native units use their stored keys, not translated display labels.

### Formula and conditional-field limits

| Field family | Current accepted YAML values and conditions |
|---|---|
| `USAGE.Uses Spent` | Nonnegative integer already consumed. Must not exceed a literal maximum. |
| `USAGE.Uses Max` | Nonnegative integer or quoted deterministic formula such as `"1 + @prof"`. A formula is one line, at most 200 characters, contains an `@` reference or arithmetic syntax, and contains no dice terms or semicolons. Bare decimal maximum values are rejected. Native formula storage does not mean every formula is accepted by this parser. |
| `RECOVERY[]` | Imported only with a positive literal Uses Max or a formula maximum. `Type: formula` requires Formula; `Period: recharge` requires a threshold from 2 through 6. Supplied recovery formulas remain with recoverAll/loseAll. Empty recovery is `[]`. |
| Magic Bonus | Deterministic formula or number; no dice. Canonical `ATTUNEMENT.Magic Bonus` applies to Weapon, Equipment and every Consumable subtype. A stored bonus does not enable explicitly false Magical. |
| Tool Bonus | Finite number or formula, including dice; single line, at most 200 characters, no semicolons. Keep the full expression instead of reducing it to an integer. |
| Spell range, duration, target count, area count/dimensions | Formula strings, including constants and `@` expressions, preserved even when units, target type or shape hide the controls. Activation Value remains an integer. |
| Weapon range/reach, physical price/weight, container weight/volume capacity, material cost/supply | Exact nonnegative decimals where supported. Weapon range/reach and container capacities may be null; material cost/supply use nonnegative numbers. `PROPERTIES.Reach` is a boolean, separate from numeric `RANGE.Reach`. |
| Siege/vehicle speed, crew capacity, HP; armor/dexterity/strength | Integer controls, with null permitted only where the native field allows it. Cover additionally accepts a decimal from 0 through 1. Equipment Armor Class and Vehicle Armor Class address one native field; populated non-null values must agree. |
| Inactive native controls | Keep supplied ammunition selections, versatile/custom/scaling damage, armor/siege/vehicle values, spell materials, and range/target settings without changing their controlling toggles. |
| Importer metadata and contextual aliases | `Attunement By` is metadata and is ignored when Attunement is none. Consumable subtype aliases address one shared value; they are not independent inactive controls. `Reload Amount` remains warning-producing metadata with no native automation. |

For ammo, the current parser still requires `AMMUNITION_PROPERTIES.Ammunition Type`; for poison it requires `POISON_PROPERTIES.Poison Type`. These contextual labels must agree with canonical `ITEM.Consumable Subtype`. Ammo aliases map bolt -> crossbowBolt, needle -> blowgunNeedle, bullet -> firearmBullet, slingbullet -> slingBullet and energycell -> energyCell; arrow and poison IDs are unchanged. Omit inactive subtype aliases. The old `AMMUNITION_PROPERTIES.Magic Bonus` is accepted for ammo compatibility; do not populate it alongside canonical `ATTUNEMENT.Magic Bonus`.

### Explicit damage

Use `DAMAGE_DATA` at each damage/healing location listed below. The mapping stores both structured dice and a custom formula, including a custom formula whose toggle is false.

| YAML key | Native path within a damage value | Type / omitted default |
|---|---|---|
| Dice Count | `number` | Nullable non-negative integer; null |
| Die Denomination | `denomination` | Nullable non-negative integer; null |
| Bonus | `bonus` | Formula string; empty |
| Damage Types | `types` | List of registered damage/healing IDs; empty list |
| Custom Enabled | `custom.enabled` | Boolean; false |
| Custom Formula | `custom.formula` | Formula string; empty, preserved when disabled |
| Scaling Mode | `scaling.mode` | `none` (native empty string), `whole`, `half`; none |
| Scaling Dice Count | `scaling.number` | Nullable non-negative integer; 1 when omitted |
| Scaling Formula | `scaling.formula` | Formula string; empty, preserved when scaling is off |

```yaml
DAMAGE_DATA:
  Dice Count: 2
  Die Denomination: 6
  Bonus: "@mod"
  Damage Types: [fire, cold]
  Custom Enabled: false
  Custom Formula: "3 + @mod"
  Scaling Mode: half
  Scaling Dice Count: 0
  Scaling Formula: "@prof"
```

Legacy formula shorthand remains valid when `DAMAGE_DATA` is absent. Populated shorthand and explicit damage in the same damage value are an error; the importer never guesses which representation wins. Canonical exports use all nine explicit fields.


## Coverage checklist

Every row identifies native stored leaves and the declared YAML mapping. Brace notation lists individual sibling leaves, not arbitrary accepted paths. All paths below begin at the Item unless noted. A mapped path does not prove all native values are accepted or preserved: the value limits above and explicit exclusions below remain part of the contract. The native field catalog records schema, sheet and YAML evidence separately.

Mapping owners:
- **I**: `scripts/strictItemParsers/yamlItemParser.js` universal/type extractor -> `scripts/itemData.js` type builder -> `scripts/itemYamlExporter.js` matching type exporter.
- **E**: `scripts/itemExplicitFields.js` fixed descriptors / property-state overlay -> final `applyExplicitSource` in ItemData -> `exportExplicitItemFields`.
- **D**: `scripts/explicitYamlFields.js` explicit damage parser/exporter.
- **A**: existing public Activity Importer APIs and ItemData attachment transaction.
- Preview/comparison uses the existing extractors plus `itemExplicitRows`. Live exports read `_source`, so prepared labels, totals and inherited values cannot replace stored data.

Tests:
- **Core**: `tests/unit/itemCoreFeatureTests.js` and the type cases in `tests/foundry/itemImporterTests.js`.
- **Explicit**: named preparation, identity/source/state, formula, inactive-control, damage/reload, nullable and rejection cases in `tests/unit/explicitYamlTests.js`.
- **Create**: all-seven-type persistence/export/reparse cases in `scripts/diagnostics/explicitImportFixtures.js`, invoked by existing gated `runAutomation({suite:"explicit", ...})`.
- **Attachments**: existing full-suite atomic attachment/optional-companion fixtures and paired controlled automation.
- **Templates**: `tools/Test-TemplateCompleteness.mjs` checks the first YAML block of each full template against declared mappings, with explicit exceptions for the adjacent recovery-list schema and fixed Container quantity. It also checks canonical compact attachment syntax. `tools/Test-ExplicitYaml.mjs` includes the existing offline parser/serializer cases and template checks; compact quick starts remain covered by Core. Structural presence alone does not verify every value or native round trip.

| Applies to | Native leaf or leaves | Explicit YAML location | Mapping | Condition / default | Test |
|---|---|---|---|---|---|
| All seven | `name` | ITEM.Name | I | Required item name | Core/Create |
| All seven | `img`, `sort`, `system.identifier` | ITEM.Icon, Sort, Identifier | E | Supplied icon wins over automatic selection; sort integer 0 | Explicit/Create |
| All seven | `system.source.{book,page,custom,license,rules,revision}` | SOURCE.Book, Page, Custom, License, Rules, Revision | E | Strings; revision is numeric, native default 1 | Explicit/Create |
| All seven | `system.description.{value,chat}` | DESCRIPTION.Description; CHAT_FLAVOR.Chat Description | I+E | HTML/text; native null retained | Core/Explicit |
| Physical six | `system.{quantity,rarity}` | INVENTORY.Quantity; ITEM.Rarity | I | Quantity non-negative integer, default 1; Container builder fixes 1 and export omits Quantity | Core |
| Physical six | `system.weight.{value,units}`, `system.price.{value,denomination}` | COST_AND_WEIGHT.Weight Value, Weight Units, Price Value, Price Denomination | I | Non-negative decimal values; unit/currency IDs | Core/Create |
| Physical six | `system.identified`, `system.unidentified.{name,description}` | INVENTORY.Identified; UNIDENTIFIED_DESCRIPTION.Unidentified Name, Unidentified Description | I | Identified defaults true | Core/Create |
| Equippable five | `system.{attunement,attuned,equipped}` | ATTUNEMENT.Attunement, Attuned; INVENTORY.Equipped | I+E | Weapon, Equipment, Consumable, Tool, Container. Requirement none/required/optional is separate from current attuned state | Explicit/Create |
| Physical six | `system.properties[mgc,gear]` | PROPERTIES.Magical, NPC Equipment | I+E | NPC Equipment is native `gear`, shown for NPC inventory; retained elsewhere. False stays false even with a stored magic bonus | Explicit |
| Weapon | `system.type.{value,baseItem}` | ITEM.Weapon Type, Base Weapon | I | Existing subtype/base-weapon IDs | Core |
| Weapon | `system.properties[ada,amm,fin,fir,foc,hvy,lgt,lod,rch,rel,ret,sil,spc,thr,two,ver]` | PROPERTIES named weapon checkboxes | I | Existing full template lists every property; false defaults | Core |
| Weapon | `system.range.{value,long,reach,units}` | RANGE.Range Normal, Range Long, Reach, Range Units | I+E | Non-negative decimals; retain hidden reach/ranged values | Explicit/Create |
| Weapon | `system.ammunition.type`, `system.mastery`, `system.proficient` | AMMUNITION.Ammunition Type; MASTERY.Mastery; PROFICIENCY.Proficient | I+E | Ammo selection survives property off; proficiency automatic/null or 0/1 | Core/Explicit |
| Weapon | `system.damage.{base,versatile}` and their nine leaves | DAMAGE.DAMAGE_DATA; VERSATILE_DAMAGE.DAMAGE_DATA | D+E | Retain versatile data when Versatile is false | Explicit/Create |
| Weapon, Consumable | `system.magicalBonus` | ATTUNEMENT.Magic Bonus | I+E | Deterministic formula; does not enable explicitly false Magical | Core/Explicit |
| Weapon, Equipment | `system.armor.value`, `system.cover`, `system.crew.max` | SIEGE_PROPERTIES.Siege Armor Class / VEHICLE_PROPERTIES.Vehicle Armor Class; Cover; Crew Capacity | I+E | Native siege/vehicle controls, retained on other subtypes; crew non-negative integer, cover labels or decimal 0..1 | Core/Explicit/Create |
| Weapon, Equipment | `system.hp.{value,max,dt,conditions}` | SIEGE_PROPERTIES / VEHICLE_PROPERTIES: Hit Points Current, Hit Points Max, Hit Points Threshold, Health Conditions | I+E | Nullable non-negative integers and text; retain inactive controls | Core/Explicit |
| Weapon, Equipment | `system.speed.{value,units,conditions}` | SIEGE_PROPERTIES / VEHICLE_PROPERTIES: Speed, Speed Units, Speed Conditions | E | Non-negative integer speed, native unit ID; retain inactive controls | Explicit/Create |
| Equipment | `system.type.{value,baseItem}` | ITEM.Equipment Type, Base Equipment | I | Existing equipment/base IDs | Core |
| Equipment | `system.properties[ada,foc,stealthDisadvantage]` | PROPERTIES.Adamantine, Focus, Stealth Disadvantage | I | Boolean property membership | Core |
| Equipment | `system.armor.{value,dex,magicalBonus}`, `system.strength` | ARMOR.Armor Class, Max Dex Modifier; ATTUNEMENT.Magic Bonus; ARMOR.Strength Requirement | I+E | Integer AC/dex/strength, deterministic magic bonus; retained on non-armor types. Conflicting armor/vehicle AC is rejected | Core/Explicit |
| Equipment | `system.proficient` | PROFICIENCY.Proficient | I | Automatic/null or native 0/1 | Core |
| Consumable | `system.type.{value,subtype}` | ITEM.Consumable Type, Consumable Subtype | I+E | Ammo/poison aliases remain required for their active subtype and must agree with canonical Consumable Subtype; stored native subtype remains across type changes | Core/Explicit/Create |
| Consumable | `system.properties[ada,sil,ret]` | AMMUNITION_PROPERTIES.Adamantine, Silvered, Returning | I+E | Retained when consumable type is not ammo | Explicit |
| Consumable | `system.properties[concentration,somatic,vocal,ritual]` | SCROLL_PROPERTIES.Concentration, Somatic, Vocal, Ritual | I+E | Retained when type is not scroll; Verbal remains legacy Vocal alias | Core/Explicit |
| Consumable | `system.damage.base` nine leaves, `system.damage.replace` | DAMAGE.DAMAGE_DATA, Replace | D+E | Available to all consumable subtypes; ammunition damage labels remain input aliases | Explicit/Create |
| Tool | `system.type.{value,baseItem}` | ITEM.Tool Type, Base Tool | I | Existing tool IDs | Core |
| Tool | `system.{ability,proficient,bonus}` | ABILITY_CHECK.Ability, Proficient; PROPERTIES.Tool Bonus | I | YAML proficiency Automatic/null or 0, 0.5, 1, 2; native 1.5 is not accepted by the parser; bonus formula | Core/Explicit/Create |
| Tool | `system.properties[foc]` | PROPERTIES.Focus | E | Boolean, false default | Explicit/Create |
| Loot | `system.type.{value,subtype}` | ITEM.Loot Type, Loot Subtype | I+E | Native subtype may be empty | Explicit/Create |
| Container | `system.properties[weightlessContents]` | PROPERTIES.Weightless Contents | I | Boolean | Core |
| Container | `system.capacity.count`, `system.capacity.weight.{value,units}`, `system.capacity.volume.{value,units}` | CAPACITY.Item Count, Weight Capacity Value/Units, Volume Capacity Value/Units | I | Nullable count integer; capacity decimals and unit IDs | Core |
| Container | `system.currency.{pp,gp,ep,sp,cp}` | CURRENCY_CONTENTS.Platinum, Gold, Electrum, Silver, Copper | I | Non-negative integers, zero default | Core |
| Spell | `system.{level,school,ability}` | ITEM.Level, School, Ability | I+E | Existing 0..9 spell choices; school/ability may be blank | Core/Explicit |
| Spell | `system.properties[vocal,somatic,material,ritual,concentration]` | COMPONENTS.Vocal, Somatic, Material, Ritual; DURATION.Concentration | I | Independent booleans | Core/Explicit |
| Spell | `system.materials.{value,consumed,cost,supply}` | MATERIALS.Value, Consumed, Cost, Supply | I+E | Text/bool/non-negative decimals; retained when Material is false | Explicit/Create |
| Spell | `system.{method,prepared,sourceItem}` | PREPARATION.Method, Prepared, Source Item | I+E | Prepared unprepared/prepared/always maps 0/1/2; accepts legacy booleans. Source Item is the native identifier | Explicit/Create |
| Spell | `system.activation.{type,value,condition}` | ACTIVATION.Type, Value, Condition | I | Cost non-negative integer; source value survives disabled/uncounted timing | Core/Explicit/Create |
| Spell | `system.range.{value,units,special}`, `system.duration.{value,units,special}` | RANGE / DURATION: Value, Units, Special | I+E | Values are formulas, including when a non-scalar unit hides the control | Explicit/Create |
| Spell | `system.target.affects.{type,count,choice,special}` | TARGETS.Type, Count, Choice, Special | I+E | Count formula; preserve other values when Type is empty | Explicit/Create |
| Spell | `system.target.template.{type,count,size,width,height,units,contiguous,stationary}` | AREA.Shape, Count, Size, Width, Height, Units, Contiguous, Stationary | I+E | Count/dimensions formulas; preserve inactive dimensions and empty-shape settings | Explicit/Create |
| Activity-capable five | `system.uses.{spent,max,recovery[].period,recovery[].type,recovery[].formula}` | USAGE.Uses Spent, Uses Max; RECOVERY[].Period, Type, Formula | I | Weapon, Equipment, Consumable, Tool, Spell. Spent integer, deterministic max/recovery formulas with limits above; Uses Current requires a literal maximum | Core |
| Consumable | `system.uses.autoDestroy` | USAGE.Destroy on Empty | I | Boolean | Core |
| Activity-capable five | `system.activities` | Activities[] with one ACTIVITY_* root per entry | A | Optional companion; canonical descriptors 1/2 accepted | Attachments |
| All seven | `effects` | effects[]; activity APPLIED_EFFECTS[] | A | Loot/Container accept passive effects only; see Activity/Effect reference | Attachments |

## Explicit exclusions and metadata

| Field / relationship | Classification and reason |
|---|---|
| Item `_id`, `type` | Creation identity: Item ID is allocated by Foundry; type is selected by the seven YAML roots |
| `folder`, `ownership`, `_stats`, document pack/sheet configuration | Internal/document-management metadata, outside item mechanics/forms in this import contract |
| `system.container`, Container contents | Deferred container placement/relationships |
| `system.crew.value[]` | Deferred actor crew assignments; capacity `crew.max` is covered |
| Additional Item types / advancement models / facility Order activities | Deferred YAML import support; the read-only native catalog may describe these without adding new item or activity roots |
| Container `system.quantity` editing | Current builder fixes quantity at 1; canonical export omits Quantity. Other native quantities are not preserved |
| Tool proficiency `1.5` | Native schema can hold it, but the current strict parser warns and falls back to Automatic. Accepted YAML values are Automatic/null, 0, 0.5, 1 and 2 |
| Loot equipped/attunement state | Not native Loot fields; omitted from the Loot reference |
| Recovery with empty/zero maximum | Existing parser imports recovery only with a positive literal maximum or a formula maximum |
| Computed `labels`, `range.scalar`, target dimensions/scalars, prepared totals, `uses.value`, proficiency multipliers | Derived, not source data; export reads stored source |
| Tool `system.chatFlavor` | Legacy storage without a current native tool-sheet control; current chat description uses `system.description.chat` |
| `flags.5e-item-importer.reloadAmount` | Compatibility metadata for RELOAD.Reload Amount. Warning required: D&D5e 5.3.3 has no `system.reload` or native reload-amount automation |
| `flags.5e-item-importer.attunementRequirement` | Existing ATTUNEMENT.Attunement By text metadata; no matching core restriction field |
| CUSTOM_PROPERTIES / existing importer provenance and supported integration flags | Existing extension contract retained; no new arbitrary native paths or expanded MIDI-QOL/DAE support |
| Additional third-party fields/relationships | Deferred; existing export behavior must not silently claim unsupported native coverage |

## Verification commands

```powershell
node --experimental-vm-modules tools/Test-ExplicitYaml.mjs
```

In a source checkout, the existing MCP `runSmokeTests({suite:"full"})` runs read-only tests against live schemas and checks world counts. Controlled `runAutomation({suite:"explicit",runId:"yaml-v2",confirmMutation:true,cleanupBefore:true,cleanupAfter:true})` imports marked fixtures and cleans them in its existing finally block. Activity Importer must be active for paired attachment tests. No world upgrade/migration is part of these checks.

## Template completeness follow-up (2026-09-14)

The full references now use canonical labels and documented parser value types, including deterministic Uses Max formulas, current Consumable Magic Bonus, typed inline effects and explicit damage. Template guidance records the existing Container quantity and Tool proficiency limits instead of promising unsupported round trips.

The source-only completeness check covers all seven Item references; the companion check covers 24 Base/MIDI activity and effect references. These checks run inside the ordinary explicit YAML suite and fail missing canonical fields or ambiguous examples. Coverage is against declared importer mappings, with named structural alternatives, rather than a claim that every native field or combination is supported.

Current checks: Item offline 146/146 and live 187/187; Activity offline 108/108 and live 256/256. Live checks created no world documents. See [verification-template-completeness.json](verification-template-completeness.json) and [test commands](../tests/README.md).

## Completed verification

Verified on 2026-09-13 against Foundry 14.367 / D&D5e 5.3.3, with both importers, MIDI-QOL 14.0.9 and DAE 14.0.12 active.

- Live read-only suites: Item 185/185; Activity 256/256; no warnings or world document count changes.
- Offline regression/template suites: Item 137/137; Activity 84/84. These overlap the live suite coverage.
- Controlled persistence: all seven Item types, all eleven Activity types, all eight effect duration units, and paired inline typed effects / Save applications / Enchant riders passed. Explicit activity Sort is restored after native creation.
- Cleanup removed all ten marked parent/linked fixture Items across the two runs, including their embedded documents. Both modules reported zero remaining fixtures. Original actor/item/scene/token counts were retained.
- Existing quick starts, MIDI/DAE templates, optional-companion paths, descriptor compatibility, and comparison extraction passed their regression checks.

The Activity persistence diagnostic explicitly removes a fixed list of MIDI-added fields from its **test-only native snapshot**, records those exclusions, and separately verifies that the production serializer rejects the extended document. It does not claim support for round-tripping MIDI extensions. Existing MIDI/DAE import support remains in scope; expanded third-party export remains deferred.

Machine-readable evidence: [verification-yaml-v2.json](verification-yaml-v2.json).

## Stormglass follow-up verification
The [corrected complex weapon YAML](../tests/fixtures/stormglass-requiem.yaml) contains two activities and two linked effects. Its four supplied IDs each contain 16 alphanumeric characters. The earlier conversational copy accidentally added a character to each ID and correctly failed native preflight.
Damage comparison now derives expected and actual summaries consistently. An omitted versatile structure is hidden only when its entire stored value equals native defaults; unexpected inactive settings remain visible. Fresh weapon/tool imports remove an unchanged, captured native baseline only after all authored attachments and a matching primary replacement succeed.
Verified on 2026-09-13 with the same platform/integrations: Item live 187/187 and offline 139/139. The exact YAML through `createItem5e()` produced 2 activities, 2 correctly linked effects, 50 comparison matches, zero discrepancies and zero issues. Both marked test Items were cleaned up; zero fixtures remained. Counts stayed 20 actors / 30 Items / 2 scenes / 7 active-scene tokens. The user's earlier partial import was not modified.


## Authoring with this reference

Use [the template authoring guide](template-authoring.md) with the relevant full templates. Schema discovery does not authorize arbitrary YAML fields; required/optional/contextual guidance and support stages determine what to author. Concrete examples and their prerequisites are listed [here](examples/README.md).
