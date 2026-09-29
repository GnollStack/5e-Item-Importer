/** Native runtime checks: only schema queries and cloned-value validation, never document writes. */
export async function runFieldCatalogChecks(moduleId) {
  const tests = [];
  const warnings = [];
  const assert = (condition, message = "Assertion failed") => { if (!condition) throw new Error(message); };
  const check = async (name, fn) => {
    try { await fn(); tests.push({ name, passed: true, pass: true }); }
    catch (error) { tests.push({ name, passed: false, pass: false, error: error.message }); }
  };
  const sourceState = () => JSON.stringify([game.actors, game.items, game.scenes, game.journal, game.tables, game.playlists, game.messages, game.combats].map(collection =>
    Array.from(collection?.values?.() ?? [], document => [document.id, document._source])));
  const before = sourceState();
  const api = game.modules.get(moduleId)?.api?.diagnostics?.actions;
  const fields = [];
  const pages = [];
  await check("catalog is complete across continuation pages", () => {
    let cursor;
    do {
      const page = api.getFieldCatalog({ limit: 200, ...(cursor ? { cursor } : {}) });
      assert(page.success, page.errors?.join("; "));
      assert(page.offset === fields.length, "Missing or overlapping page");
      if (pages.length) assert(page.catalogId === pages[0].catalogId, "Catalog changed during paging");
      pages.push(page); fields.push(...page.fields); cursor = page.nextCursor;
      assert(pages.length < 100, "Pagination did not terminate");
    } while (cursor);
    assert(fields.length === pages[0].total && new Set(fields.map(field => field.id)).size === fields.length);
    assert(fields.length > 100, "Expected full native discovery, not an example fixture");
  });
  const first = pages[0];
  if (!first) return { success: false, tests, warnings };
  const item = moduleId === "5e-item-importer";
  await check("native type registry includes the complete verified 5.3.3 scope", () => {
    if (game.system.version !== "5.3.3") {
      warnings.push("Exact native type counts are verified for 5.3.3; current version requires review."); return;
    }
    if (item) {
      assert(first.types.filter(type => type.kind === "item").length === 13);
      assert(first.types.filter(type => type.kind === "advancement").length === 8);
      assert(first.types.filter(type => type.kind === "item" && type.importSupport === "supported").length === 7);
    } else {
      assert(first.types.filter(type => type.kind === "activity").length === 12);
      assert(first.types.filter(type => type.kind === "effect").map(type => type.type).sort().join(",") === "base,enchantment");
      assert(first.types.find(type => type.kind === "activity" && type.type === "order")?.importSupport === "catalog-only");
    }
  });
  await check("native discovery does not promote module extensions to import support", () => {
    assert(fields.every(field => !field.path.startsWith("flags.custom-dnd5e") && !field.provenance?.source?.export?.startsWith("Midi")));
    assert(fields.filter(field => first.types.some(type => type.kind === field.kind && type.type === field.type && type.importSupport === "catalog-only"))
      .every(field => ["unsupported", "excluded", "needs-review"].includes(field.coverage?.status)));
  });
  await check("known native structure has no silently unresolved schemas", () => {
    const failures = first.diagnostics.filter(entry => ["schema-unavailable", "activity-types-unavailable", "advancement-types-unavailable", "unresolved-native-field"].includes(entry.code));
    assert(!failures.length, JSON.stringify(failures));
    assert(fields.every(field => field.structure && field.classification && field.coverage && field.sheet));
  });
  await check("coverage manifests refer to real native fields", async () => {
    const mapping = await import(item ? "../itemFieldCatalogCoverage.js" : "../activityFieldCatalogCoverage.js");
    const audit = mapping.auditCoverageReferences(fields);
    assert(audit.success, JSON.stringify(audit.missing));
  });
  await check("field details preserve the exact page record", () => {
    const field = fields.find(entry => entry.path.includes("damage") && entry.path.endsWith("number")) ?? fields[0];
    const details = api.getFieldDetails({ fieldId: field.id });
    assert(details.success && JSON.stringify(details.field) === JSON.stringify(field));
    assert(!api.getFieldDetails({ fieldId: "game.items.create" }).success);
  });
  await check("filtered queries return complete and deterministic results", () => {
    const type = item ? "spell" : "save", kind = item ? "item" : "activity";
    const a = api.getFieldCatalog({ kind, type, query: "range", limit: 200 });
    const b = api.getFieldCatalog({ kind, type, query: "range", limit: 200 });
    assert(a.success && a.total > 0 && a.completeness.filtered && JSON.stringify(a) === JSON.stringify(b));
    assert(a.fields.every(field => field.type === type));
  });
  const find = (type, path, kind = item ? "item" : "activity") => {
    const field = fields.find(entry => entry.kind === kind && entry.type === type && entry.path === path);
    assert(field, "Missing native field: " + [kind, type, path].join("/")); return field;
  };
  const probe = (field, values, extra = {}) => {
    const input = { fieldId: field.id, values, ...extra }, original = JSON.stringify(input);
    const report = api.probeFieldValues(input);
    assert(report.success, report.errors?.join("; "));
    assert(JSON.stringify(input) === original && report.writeCount === 0, "Probe changed its input");
    return report.results;
  };
  await check("ID validation exposes invalid lengths without automatic padding", () => {
    const field = find(item ? "weapon" : "attack", "_id");
    const rows = probe(field, ["1234567890ABCDEF", "1234567890ABCDEFG"]);
    assert(rows[0].raw.valid && !rows[1].raw.valid);
  });
  if (item) {
    await check("preparation choices differ from broad native numeric acceptance", () => {
      const field = find("spell", "system.prepared");
      const rows = probe(field, [0, 1, 2, 3, -1, 1.5, "2", null], { includeMissing: true });
      assert(rows.slice(0, 4).every(row => row.raw.valid));
      assert(!rows[4].raw.valid && rows[4].cleaning.changed && rows[4].cleaning.after.value === 0);
      assert(!rows[5].raw.valid && rows[5].cleaning.after.value === 2);
      assert(!rows[6].raw.valid && rows[6].cleaning.after.value === 2);
      assert(rows.at(-1).submitted.present === false && rows[7].submitted.value === null);
      assert(field.sheet.options.some(option => JSON.stringify(option.ids) === "[0,1,2]"));
    });
    await check("spell range formulas retain source text and reject dice where deterministic", () => {
      const rows = probe(find("spell", "system.range.value"), ["30 + @mod", "1d6", "(", 30]);
      assert(rows[0].raw.valid && rows[0].cleaning.after.value === "30 + @mod");
      assert(!rows[1].raw.valid && !rows[2].raw.valid);
      assert(!rows[3].raw.valid && rows[3].cleaning.after.value === "30");
    });
    await check("native decimal fields are not mistaken for integers", () => {
      const rows = probe(find("weapon", "system.weight.value"), [1.25, -1, "1.25"]);
      assert(rows[0].raw.valid && !rows[1].raw.valid && !rows[2].raw.valid);
    });
    await check("ScaleValue discovers every native nested variant", () => {
      const variants = new Set(fields.filter(field => field.kind === "advancement" && field.type === "ScaleValue" && field.variant).map(field => field.variant));
      assert(variants.size === 5);
      assert(fields.some(field => field.type === "ScaleValue" && field.variant.endsWith("dice") && field.path.endsWith(".faces")));
    });
    await check("item child-document fields reference companion catalogs", () => {
      const effects = find("weapon", "effects");
      assert(["catalog-reference", "embedded-documents"].includes(effects.structure.kind));
      assert(!fields.some(field => field.kind === "item" && field.type === "weapon" && field.path.startsWith("effects[*].")));
    });
  } else {
    await check("damage denomination validates numbers separately from dice menu choices", () => {
      const field = find("attack", "damage.parts[*].denomination"), rows = probe(field, [6, 7, 1.5, -1, null]);
      assert(rows[0].raw.valid && rows[1].raw.valid && !rows[2].raw.valid && !rows[3].raw.valid && rows[4].raw.valid);
      assert(field.sheet.options.some(option => option.ids?.includes(6) && !option.ids.includes(7)));
    });
    await check("consumption level mode is contextual rather than an invented schema enum", () => {
      const field = find("save", "consumption.targets[*].scaling.mode"), rows = probe(field, ["level", "unknown"]);
      assert(rows.every(row => row.raw.valid));
      assert(field.sheet.options.some(option => option.ids?.includes("level") && option.condition?.includes("spellSlots")));
      assert(rows.every(row => row.contextual.status === "incomplete"));
    });
    await check("effect value probes preserve zero false empty collections objects and null", () => {
      const values = [0, false, [], {}, null, { nested: [0, false, null] }];
      const rows = probe(find("base", "system.changes[*].value", "effect"), values);
      assert(rows.every((row, index) => row.raw.valid && JSON.stringify(row.cleaning.after.value) === JSON.stringify(values[index])));
    });
    await check("native effect change types and phases use actual validators", () => {
      const types = probe(find("base", "system.changes[*].type", "effect"), ["add", "subtract", "made-up", 0]);
      assert(types[0].raw.valid && types[1].raw.valid && !types[2].raw.valid && !types[3].raw.valid);
      const phaseField = find("base", "system.changes[*].phase", "effect");
      const phases = probe(phaseField, ["initial", "final", "wrong", false, ""]);
      assert(phases[0].raw.valid && phases[1].raw.valid && phases[2].raw.valid && !phases[3].raw.valid && !phases[4].raw.valid);
      assert(phaseField.sheet.options.some(option => JSON.stringify(option.ids) === '["initial","final"]'));
    });
    await check("inactive damage and override settings remain visible in catalog", () => {
      for (const path of ["damage.parts[*].custom.enabled", "damage.parts[*].custom.formula", "range.override", "target.override"]) find("attack", path);
    });
  }
  const midiFields = [], midiPages = [];
  await check("MIDI catalog is complete across continuation pages with distinct provenance", () => {
    let cursor;
    do {
      const page = api.getFieldCatalog({ layer: "midi", limit: 200, ...(cursor ? { cursor } : {}) });
      assert(page.success, page.errors?.join("; "));
      assert(page.offset === midiFields.length);
      if (midiPages.length) assert(page.catalogId === midiPages[0].catalogId);
      midiPages.push(page); midiFields.push(...page.fields); cursor = page.nextCursor;
      assert(midiPages.length < 100);
    } while (cursor);
    assert(midiFields.length === midiPages[0].total && new Set(midiFields.map(field => field.id)).size === midiFields.length);
    assert(midiFields.every(field => field.layer === "midi" && field.provenance.native === false));
    assert(midiFields.every(field => !fields.some(native => native.id === field.id)));
  });
  await check("MIDI selected queries and details are deterministic without changing native identities", () => {
    const query = { layer: "midi", type: item ? "weapon" : "attack", limit: 200 };
    const a = api.getFieldCatalog(query), b = api.getFieldCatalog(query);
    assert(a.success && JSON.stringify(a) === JSON.stringify(b));
    assert(api.getFieldCatalog({ limit: 200 }).catalogId === first.catalogId);
    const field = midiFields[0];
    assert(field && api.getFieldDetails({ fieldId: field.id }).field.id === field.id);
    assert(!api.getFieldDetails({ fieldId: field.id, layer: "native" }).success);
  });
  const midiActive = game.modules.get("midi-qol")?.active === true;
  await check("MIDI unschematized flags report incomplete checks and preserve submitted values", () => {
    const field = midiFields.find(field => field.validation?.formalDataField === false);
    assert(field, "Expected a declared flag/pattern");
    const rows = probe(field, [false, 0, null, [], {}, { nested: [0, false] }]);
    assert(rows.every(row => row.raw.status === "incomplete" && row.cleaning.status === "incomplete" && row.contextual.status === "incomplete"));
  });
  if (midiActive && !item) {
    const midiFind = (type, path) => {
      const field = midiFields.find(field => field.type === type && field.path === path && field.fieldClass);
      assert(field, "Missing MIDI schema: " + type + "/" + path); return field;
    };
    await check("MIDI targeting schema accepts strings beyond sheet and YAML enums", () => {
      const field = midiFind("attack", "midiProperties.autoTargetType");
      const rows = probe(field, ["enemy", "not-a-sheet-option", false]);
      assert(rows[0].raw.valid && rows[1].raw.valid && !rows[2].raw.valid);
      assert(field.sheet.options.some(option => option.ids.includes("enemy") && !option.ids.includes("not-a-sheet-option")));
      assert(field.coverage.acceptedValues.includes("enemy") && field.coverage.stages.export === "unsupported");
    });
    await check("MIDI condition and macro probes check stored text without execution", () => {
      const text = "(() => { throw new Error('Catalog must not execute this'); })()";
      for (const path of ["useConditionText", "macroData.command"]) {
        const rows = probe(midiFind("attack", path), [text, "(", false]);
        assert(rows[0].raw.valid && rows[0].cleaning.after.value === text && !rows[2].raw.valid);
        assert(rows.every(row => row.contextual.status === "incomplete"));
      }
    });
    await check("MIDI trigger, consumption and inactive control rules remain separate from schema support", () => {
      const trigger = midiFind("attack", "midiProperties.triggeredActivityTargets");
      assert(trigger.sheet.visibleWhen.some(condition => condition.includes("none")));
      assert(midiFind("attack", "midiProperties.forceConsumeDialog").behavior.conditions.some(condition => condition.includes("forceConsumeDialog=always returns false")));
      assert(midiFind("attack", "midiProperties.skipConcentrationCheck").sheet.visibleWhen.some(condition => condition.includes("attributes.hp.value")));
      assert(midiFind("cast", "midiProperties.confirmTargets").sheet.options.some(option => JSON.stringify(option.ids) === '["never"]'));
      assert(midiFind("attack", "overTimeProperties.turnChoice").coverage.conversions.some(condition => condition.includes("drops overtime")));
      assert(midiFind("attack", "regionBehavior.enabled").coverage.status === "unsupported");
    });
    await check("MIDI Other Activity restrictions and inherited schema changes are discoverable", () => {
      for (const type of ["attack", "save", "check", "utility"]) midiFind(type, "otherActivityId");
      assert(!midiFields.some(field => field.fieldClass && ["heal", "damage", "cast", "forward"].includes(field.type) && field.path === "otherActivityId"));
      const changes = midiFields.filter(field => field.extension?.operation === "changed" && field.extension.nativeFieldId);
      assert(changes.length > 0 && changes.every(field => field.extension.baseline));
      assert(midiFields.some(field => field.configurationTarget?.includes("{name}") && field.pattern));
    });
  } else if (!midiActive) {
    await check("MIDI unavailable is explicitly classified without invented schemas", () => {
      assert(midiPages[0].environment.midi.schemaStatus === "unavailable");
      assert(!midiFields.some(field => field.fieldClass));
    });
  } else {
    await check("MIDI item-specific coverage stays with Item Importer and identifies gaps", () => {
      const macro = midiFields.find(field => field.type === "weapon" && field.path === "flags.midi-qol.onUseMacroName");
      assert(macro?.coverage.owner === moduleId && macro.coverage.status === "unsupported");
    });
  }
  await check("read-only catalog and probes leave world source data unchanged", () => assert(before === sourceState()));
  const failed = tests.filter(test => !test.passed).length;
  return { success: failed === 0, passed: tests.length - failed, failed, counts: { total: tests.length, passed: tests.length - failed, failed },
    warnings, tests, fieldCount: fields.length, typeCount: first.types.length, pageCount: pages.length,
    midiFieldCount: midiFields.length, midiPageCount: midiPages.length, worldSourcesUnchanged: before === sourceState(), writeCount: 0 };
}
