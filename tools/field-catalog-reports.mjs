/**
 * Pure report functions for saved native-field-catalog MCP pages.
 * No Foundry globals, network requests, callback evaluation, or document access.
 */
export const REPORT_FORMAT_VERSION = 1;
const PAGE_KIND = "native-field-catalog-page";
const SNAPSHOT_KIND = "native-field-catalog-snapshot";
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const ignoredMetadata = new Set(["capturedAt", "generatedAt", "captureTime", "timestamp", "label", "localizedLabel", "displayLabel"]);
const pageQueryKeys = new Set(["offset", "limit", "cursor", "nextCursor"]);

export function canonicalize(value, { mechanical = false } = {}) {
  if (Array.isArray(value)) return value.map(entry => canonicalize(entry, { mechanical }));
  if (!object(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => !mechanical || !ignoredMetadata.has(key))
    .map(key => [key, canonicalize(value[key], { mechanical })]));
}
const stable = (value, options) => JSON.stringify(canonicalize(value, options));
const mechanical = value => canonicalize(value, { mechanical: true });
const queryOf = page => Object.fromEntries(Object.entries(page.query ?? {}).filter(([key]) => !pageQueryKeys.has(key)));
const providerOf = page => typeof page.provider === "string" ? page.provider
  : page.provider?.id ?? page.moduleId ?? stable(page.provider);
const identity = page => stable([providerOf(page), queryOf(page)]);
const typeId = type => type.id ?? stable([type.kind ?? "", type.type ?? "", type.variant ?? ""]);
const variantId = field => stable([field.kind ?? "", field.type ?? "", field.variant]);
const presence = (value, key) => own(value, key) ? { present: true, value: value[key] } : { present: false };
const unique = entries => [...new Map(entries.map(entry => [stable(entry), entry])).values()];

/** Accept raw pages, arrays, and known MCP result envelopes, never arbitrary JSON subtrees. */
export function unwrapCatalogPages(input) {
  if (Array.isArray(input)) return input.flatMap(unwrapCatalogPages);
  if (!object(input)) throw new Error("Expected a catalog page or MCP result envelope.");
  if (input.isError === true) throw new Error("Cannot assemble an MCP error response.");
  if (input.kind === PAGE_KIND) return [input];
  if (object(input.structuredContent)) {
    try { return unwrapCatalogPages(input.structuredContent); } catch (error) {
      if (!Array.isArray(input.content)) throw error;
    }
  }
  if (Array.isArray(input.content)) {
    const text = input.content.filter(block => block.type === "text" && typeof block.text === "string");
    if (!text.length) throw new Error("MCP response contains no catalog JSON text.");
    return text.flatMap(block => {
      let parsed;
      try { parsed = JSON.parse(block.text); } catch { throw new Error("MCP text is not valid catalog JSON."); }
      return unwrapCatalogPages(parsed);
    });
  }
  for (const key of ["result", "results", "data", "response"]) {
    if (object(input[key]) || Array.isArray(input[key])) return unwrapCatalogPages(input[key]);
  }
  throw new Error("No native-field-catalog-page found in the supplied JSON.");
}

function validatePage(page) {
  if (page.formatVersion !== REPORT_FORMAT_VERSION) throw new Error("Unsupported catalog report format version.");
  if (!providerOf(page) || typeof page.catalogId !== "string" || !page.catalogId) throw new Error("Page requires provider and catalogId.");
  for (const key of ["total", "offset", "limit"]) {
    if (!Number.isSafeInteger(page[key]) || page[key] < (key === "limit" ? 1 : 0)) throw new Error("Invalid page " + key + ".");
  }
  if (!Array.isArray(page.fields) || page.fields.length > page.limit || page.offset + page.fields.length > page.total) {
    throw new Error("Page fields violate its pagination bounds.");
  }
  if (!Array.isArray(page.types) || !object(page.environment) || !object(page.completeness)) throw new Error("Page metadata is incomplete.");
  if (!object(page.query ?? {})) throw new Error("Page query must be an object.");
  if (!Array.isArray(page.diagnostics ?? [])) throw new Error("Page diagnostics must be an array.");
  if (!page.fields.length && page.total !== 0) throw new Error("Empty nonterminal catalog page.");
  if (own(page, "nextCursor")) {
    const remaining = page.offset + page.fields.length < page.total;
    if (remaining && (page.nextCursor === null || page.nextCursor === undefined)) throw new Error("Nonterminal page has no next cursor.");
    if (!remaining && page.nextCursor !== null && page.nextCursor !== undefined) throw new Error("Terminal page has an unexpected next cursor.");
  }
}

function assembleCatalog(pages) {
  pages.forEach(validatePage);
  pages = [...pages].sort((a, b) => a.offset - b.offset);
  const first = pages[0];
  const baseline = stable({
    catalogId: first.catalogId, provider: first.provider, moduleId: first.moduleId,
    environment: mechanical(first.environment), query: queryOf(first), total: first.total, types: mechanical(first.types)
  });
  let expected = 0;
  const ids = new Set();
  for (const page of pages) {
    const signature = stable({
      catalogId: page.catalogId, provider: page.provider, moduleId: page.moduleId,
      environment: mechanical(page.environment), query: queryOf(page), total: page.total, types: mechanical(page.types)
    });
    if (signature !== baseline) throw new Error("Pages have incompatible catalog, environment, query, total, or type metadata.");
    if (page.offset !== expected) throw new Error("Missing, duplicate, or overlapping catalog pages at offset " + expected + ".");
    for (const field of page.fields) {
      if (!object(field) || typeof field.id !== "string" || !field.id) throw new Error("Every field requires a stable string ID.");
      if (ids.has(field.id)) throw new Error("Duplicate catalog field ID: " + field.id);
      ids.add(field.id);
    }
    expected += page.fields.length;
  }
  if (expected !== first.total || (first.total === 0 && pages.length !== 1)) throw new Error("Catalog capture is incomplete or duplicated.");
  const typeIds = first.types.map(typeId);
  if (new Set(typeIds).size !== typeIds.length) throw new Error("Duplicate catalog type identity.");
  const reports = unique(pages.map(page => page.completeness));
  const completeness = {
    ...first.completeness,
    paginationComplete: true,
    selection: queryOf(first),
    capturedPages: pages.length
  };
  if (reports.length > 1) completeness.pageReports = reports;
  return {
    provider: clone(first.provider ?? first.moduleId), ...(first.moduleId ? { moduleId: first.moduleId } : {}),
    catalogId: first.catalogId, environment: clone(first.environment), query: queryOf(first),
    total: first.total, types: [...clone(first.types)].sort((a, b) => typeId(a).localeCompare(typeId(b))),
    fields: pages.flatMap(page => clone(page.fields)).sort((a, b) => a.id.localeCompare(b.id)),
    diagnostics: unique(pages.flatMap(page => clone(page.diagnostics ?? []))),
    completeness
  };
}

/** A complete selected query is not a claim that all native sheet behavior is known. */
export function assembleSnapshot(inputs) {
  const pages = unwrapCatalogPages(inputs);
  if (!pages.length) throw new Error("No catalog pages were supplied.");
  const groups = new Map();
  for (const page of pages) {
    validatePage(page);
    const key = identity(page);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(page);
  }
  return canonicalize({
    formatVersion: REPORT_FORMAT_VERSION,
    kind: SNAPSHOT_KIND,
    catalogs: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => assembleCatalog(group))
  });
}

export function validateSnapshot(snapshot) {
  if (!object(snapshot) || snapshot.kind !== SNAPSHOT_KIND || snapshot.formatVersion !== REPORT_FORMAT_VERSION
      || !Array.isArray(snapshot.catalogs) || !snapshot.catalogs.length) throw new Error("Expected a supported catalog snapshot.");
  const ids = new Set();
  for (const catalog of snapshot.catalogs) {
    if (!object(catalog) || !providerOf(catalog) || typeof catalog.catalogId !== "string"
        || !object(catalog.environment) || !object(catalog.query) || !Array.isArray(catalog.fields) || !Array.isArray(catalog.types)
        || !Number.isSafeInteger(catalog.total) || catalog.total !== catalog.fields.length
        || catalog.completeness?.paginationComplete !== true) {
      throw new Error("Snapshot is incomplete.");
    }
    if (catalog.types.some(type => !object(type)) || new Set(catalog.types.map(typeId)).size !== catalog.types.length) {
      throw new Error("Invalid snapshot type identities.");
    }
    const id = identity(catalog);
    if (ids.has(id)) throw new Error("Duplicate snapshot catalog.");
    ids.add(id);
    const fieldIds = catalog.fields.map(field => field.id);
    if (fieldIds.some(id => typeof id !== "string" || !id) || new Set(fieldIds).size !== fieldIds.length) throw new Error("Invalid snapshot field IDs.");
  }
  return snapshot;
}

/** Select complete captured catalogs by layer; an all-layer capture can be projected without fetching data. */
export function selectSnapshotLayer(snapshot, layer) {
  validateSnapshot(snapshot);
  if (!["native", "midi", "extensions", "all"].includes(layer)) throw new Error("Invalid catalog layer.");
  if (layer === "all") return clone(snapshot);
  const catalogs = snapshot.catalogs.filter(catalog => [layer, "all"].includes(catalog.query.layer ?? "native")).map(catalog => {
    const copy = clone(catalog);
    if (catalog.query.layer === "all") {
      copy.fields = copy.fields.filter(field => (field.layer ?? "native") === layer);
      copy.total = copy.fields.length;
      copy.query = { ...copy.query, layer };
      if (layer === "native") delete copy.query.layer;
      copy.completeness = { paginationComplete: true, selectedLayer: layer, selection: copy.query,
        capturedFields: copy.total, projectedFromCompleteCapture: true, sourceCompleteness: copy.completeness,
        meaning: "Complete projection of the saved selection; source schema, sheet and behavior uncertainties still apply." };
    }
    return copy;
  });
  if (!catalogs.length) throw new Error("The snapshot has no complete capture of the requested layer.");
  return validateSnapshot({ ...clone(snapshot), catalogs });
}

function changesFor(before, after) {
  const changes = [];
  for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (ignoredMetadata.has(key)) continue;
    // Literal defaults are stored data; a data property named "label" is not a translation.
    const normalize = ["default", "constraints", "structure"].includes(key) ? canonicalize : mechanical;
    const a = normalize(presence(before, key)), b = normalize(presence(after, key));
    if (stable(a) !== stable(b)) changes.push({ property: key, before: a, after: b });
  }
  return changes;
}
function indexBy(entries, key) { return new Map(entries.map(entry => [key(entry), entry])); }
function compareCollection(before, after, key, catalog) {
  const a = indexBy(before, key), b = indexBy(after, key);
  const added = [], removed = [], changed = [];
  for (const id of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (!a.has(id)) added.push({ catalog, id, value: b.get(id) });
    else if (!b.has(id)) removed.push({ catalog, id, value: a.get(id) });
    else {
      const changes = changesFor(a.get(id), b.get(id));
      if (changes.length) changed.push({ catalog, id, changes });
    }
  }
  return { added, removed, changed };
}
const variantsOf = catalog => unique(catalog.fields.filter(field => field.variant !== null && field.variant !== undefined && field.variant !== "")
  .map(field => ({ kind: field.kind, type: field.type, variant: field.variant })));
const mergeChanges = (target, source) => {
  for (const key of ["added", "removed", "changed"]) target[key].push(...source[key]);
};

/** Environment differences are reported independently; they are not assigned causal blame. */
export function compareSnapshots(before, after) {
  validateSnapshot(before); validateSnapshot(after);
  const a = indexBy(before.catalogs, identity), b = indexBy(after.catalogs, identity);
  const report = {
    formatVersion: REPORT_FORMAT_VERSION, kind: "native-field-catalog-diff",
    environmentChanges: [], catalogChanges: { added: [], removed: [] },
    types: { added: [], removed: [], changed: [] },
    variants: { added: [], removed: [], changed: [] },
    fields: { added: [], removed: [], changed: [] },
    completenessChanges: []
  };
  for (const id of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (!a.has(id)) { report.catalogChanges.added.push({ id, provider: b.get(id).provider, query: b.get(id).query }); continue; }
    if (!b.has(id)) { report.catalogChanges.removed.push({ id, provider: a.get(id).provider, query: a.get(id).query }); continue; }
    const first = a.get(id), second = b.get(id);
    const environment = changesFor(first.environment, second.environment);
    if (environment.length) report.environmentChanges.push({ catalog: id, changes: environment });
    mergeChanges(report.types, compareCollection(first.types, second.types, typeId, id));
    mergeChanges(report.variants, compareCollection(variantsOf(first), variantsOf(second), variantId, id));
    mergeChanges(report.fields, compareCollection(first.fields, second.fields, field => field.id, id));
    const completeness = changesFor(
      Object.fromEntries(Object.entries(first.completeness).filter(([key]) => !["capturedPages", "pageReports"].includes(key))),
      Object.fromEntries(Object.entries(second.completeness).filter(([key]) => !["capturedPages", "pageReports"].includes(key)))
    );
    if (completeness.length) report.completenessChanges.push({ catalog: id, changes: completeness });
  }
  report.hasChanges = report.environmentChanges.length > 0 || report.completenessChanges.length > 0
    || Object.values(report.catalogChanges).some(entries => entries.length > 0)
    || [report.types, report.variants, report.fields].some(group => Object.values(group).some(entries => entries.length > 0));
  return canonicalize(report);
}

const escapeMarkdown = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/\\/g, "&#92;").replace(/\|/g, "&#124;").replace(new RegExp(String.fromCharCode(96), "g"), "&#96;").replace(/[\r\n]+/g, " ");
const display = value => value === undefined ? "Not reported / unknown" : escapeMarkdown(typeof value === "string" ? value : stable(value));

/** Render all field metadata; false, zero, null and empty collections retain their identity. */
export function renderMarkdown(snapshot) {
  validateSnapshot(snapshot);
  const lines = [
    snapshot.catalogs.every(catalog => !catalog.query.layer || catalog.query.layer === "native") ? "# Native field catalog" : "# Field catalog: native and MIDI layers", "",
    "This is a captured environment report. Native field acceptance does not establish YAML importer support.",
    "Schema acceptance, reviewed sheet behavior, declared mappings, tested YAML cases and tested gameplay are separate evidence.",
    "Unknown or unresolved choices are not an empty list of allowed values. Defaults may require context or generation.",
    "Pagination completeness describes the selected query; schema, sheet, and coverage uncertainties remain explicit.", ""
  ];
  for (const catalog of snapshot.catalogs) {
    lines.push("## " + escapeMarkdown(providerOf(catalog)), "",
      "| Report information | Value |", "| --- | --- |",
      "| Environment | " + display(catalog.environment) + " |",
      "| Query | " + display(catalog.query) + " |",
      "| Layer | " + display(catalog.query.layer ?? "native") + " |",
      "| Fields | " + catalog.total + " |",
      "| Completeness | " + display(catalog.completeness) + " |",
      "| Diagnostics | " + display(catalog.diagnostics) + " |", "",
      "### Types", "", "| Kind | Type | Import support | Model / provenance |", "| --- | --- | --- | --- |");
    for (const type of catalog.types) lines.push("| " + display(type.kind) + " | " + display(type.type) + " | "
      + display(type.importSupport) + " | " + display(type) + " |");
    lines.push("", "### Fields", "");
    for (const field of catalog.fields) {
      lines.push("#### " + escapeMarkdown(field.id), "", "| Property | Recorded value |", "| --- | --- |");
      for (const key of Object.keys(field).sort()) lines.push("| " + escapeMarkdown(key) + " | " + display(field[key]) + " |");
      for (const key of ["constraints", "default", "schemaChoices", "sheet", "coverage"]) {
        if (!own(field, key)) lines.push("| " + key + " | Not reported / unknown |");
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
