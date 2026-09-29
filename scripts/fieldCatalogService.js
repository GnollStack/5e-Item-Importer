/** Shared read-only catalog queries and value probes. Keep both importer copies identical. */
export const FIELD_CATALOG_FORMAT_VERSION = 1;
const MAX_PAGE = 200;
const MAX_PROBES = 25;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function plainInput(value, depth = 0) {
  if (depth > 40) throw new Error("Input exceeds the supported nesting depth (40).");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(entry => plainInput(entry, depth + 1));
  if (value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    const out = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (UNSAFE_KEYS.has(key) || !Object.hasOwn(descriptor, "value")) throw new Error("Only plain data properties are accepted.");
      out[key] = plainInput(descriptor.value, depth + 1);
    }
    return out;
  }
  throw new Error("Submit JSON values only; functions, accessors and non-finite numbers are not accepted.");
}

/** Native return values may contain Sets; retain their contents and distinguish their type. */
function outputValue(value, seen = new WeakSet()) {
  if (value === undefined) return { $type: "undefined" };
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : { $type: "number", value: String(value) };
  if (typeof value !== "object") return { $type: typeof value };
  if (seen.has(value)) return { $type: "cycle", unresolved: true };
  seen.add(value);
  let out;
  if (value instanceof Set) out = { $type: "Set", values: Array.from(value, entry => outputValue(entry, seen)) };
  else if (value instanceof Map) out = { $type: "Map", entries: Array.from(value, ([key, entry]) => [outputValue(key, seen), outputValue(entry, seen)]) };
  else if (Array.isArray(value)) out = value.map(entry => outputValue(entry, seen));
  else {
    out = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      Object.defineProperty(out, key, { enumerable: true, configurable: true, writable: true,
        value: Object.hasOwn(descriptor, "value") ? outputValue(descriptor.value, seen) : { $type: "accessor", unresolved: true } });
    }
  }
  seen.delete(value);
  return out;
}

export function stableCatalogString(value) {
  if (Array.isArray(value)) return "[" + value.map(stableCatalogString).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCatalogString(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

function fingerprint(value) {
  let hash = 2166136261;
  const text = stableCatalogString(value);
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function integer(value, fallback, max) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1 || result > max) throw new Error(`Expected an integer between 1 and ${max}.`);
  return result;
}

function normalizeQuery(input) {
  const query = {};
  const layer = catalogLayer(input);
  if (layer !== "native") query.layer = layer;
  for (const key of ["kind", "type", "query", "status"]) {
    if (input[key] === undefined || input[key] === "") continue;
    if (typeof input[key] !== "string") throw new Error(`${key} must be a string.`);
    query[key] = input[key].trim();
  }
  return query;
}

function catalogLayer(input, inferIdentity = false) {
  const layer = input.layer ?? (inferIdentity && /^(midi|extensions)\//.test(input.fieldId ?? "") ? input.fieldId.split("/")[0] : "native");
  if (!["native", "midi", "extensions", "all"].includes(layer)) throw new Error("layer must be native, midi, extensions, or all.");
  return layer;
}

function matching(field, query) {
  return (!query.kind || field.kind === query.kind)
    && (!query.type || field.type === query.type)
    && (!query.status || field.coverage?.status === query.status)
    && (!query.query || [field.id, field.path, field.variant, field.configurationTarget, field.fieldClass, ...(field.coverage?.yamlLocations ?? [])]
      .some(value => String(value).toLocaleLowerCase().includes(query.query.toLocaleLowerCase())));
}

function failure(error) {
  return { success: false, available: true, formatVersion: FIELD_CATALOG_FORMAT_VERSION,
    errors: [error?.message ?? String(error)], writeCount: 0 };
}

function cloneCandidate(value) { return value === undefined ? undefined : structuredClone(value); }
function described(value) { return value === undefined ? { present: false } : { present: true, value: outputValue(value) }; }
function fieldValidation(field, value, source) {
  if (typeof field?.validate !== "function") return { status: "unavailable", valid: null, reason: "Field has no exposed validator." };
  try {
    const result = field.validate(cloneCandidate(value), { strict: true, partial: false, fallback: false,
      dropInvalidEmbedded: false, source: source ? plainInput(source) : {} });
    if (result) return { status: "rejected", valid: false, error: result.message ?? String(result) };
    return { status: "accepted", valid: true };
  } catch (error) { return { status: "rejected", valid: false, error: error.message ?? String(error) }; }
}

function fieldCleaning(field, value, source) {
  if (typeof field?.clean !== "function") return { status: "unavailable", reason: "Field has no exposed cleaner." };
  if ((value === undefined || value === null) && typeof field.initial === "function") {
    return { status: "incomplete", reason: "A generated or contextual default is not evaluated for this isolated probe." };
  }
  try {
    const cleaned = field.clean(cloneCandidate(value), { partial: false, migrate: false }, { modelSource: source ? plainInput(source) : {} });
    const before = described(value), after = described(cleaned);
    return { status: "completed", changed: stableCatalogString(before) !== stableCatalogString(after), before, after,
      validation: fieldValidation(field, cleaned, source) };
  } catch (error) { return { status: "rejected", error: error.message ?? String(error) }; }
}

function sourceForHandle(handle, context) {
  const source = context?.source;
  if (!source) return null;
  const prefix = handle.contextSourcePrefix;
  if (!prefix) return plainInput(source);
  let current = source;
  for (const key of prefix.split(".")) current = current?.[key];
  return current && typeof current === "object" ? plainInput(current) : null;
}

function unresolvedChildren(schema, source, allowSystem = false, seen = new Set()) {
  if (!schema || !source || typeof source !== "object" || seen.has(schema)) return false;
  const next = new Set(seen).add(schema);
  for (const [key, field] of Object.entries(schema.fields ?? {})) {
    const value = source[key];
    if (value === undefined || value === null || (typeof value === "object" && !Object.keys(value).length)) continue;
    const names = [];
    for (let node = field; node; node = Object.getPrototypeOf(node)) names.push(node.constructor?.name);
    if (names.some(name => ["ActivityField", "AdvancementField", "EmbeddedCollectionField", "EmbeddedDocumentField"].includes(name))) return true;
    if (names.includes("TypeDataField")) { if (allowSystem && key === "system") continue; return true; }
    if (field.fields && unresolvedChildren(field, value, false, next)) return true;
    if (field.element && typeof value === "object") {
      for (const entry of Object.values(value)) {
        const elementNames = [];
        for (let node = field.element; node; node = Object.getPrototypeOf(node)) elementNames.push(node.constructor?.name);
        if (elementNames.some(name => ["ActivityField", "AdvancementField", "TypeDataField"].includes(name))) return true;
        if (unresolvedChildren(field.element, entry, false, next)) return true;
      }
    }
  }
  return false;
}

function contextualValidation(handle, value, context) {
  const incomplete = reason => ({ status: "incomplete", valid: null, scope: "running-world", reason });
  if (handle.contextualReason) return incomplete(handle.contextualReason);
  if (!context?.source) return incomplete("Supply context.source for full model validation; isolated field acceptance is not document acceptance.");
  if (!handle.model || !handle.rootSchema) return incomplete("The catalog has no resolved model for this field.");
  if (context.source.type !== undefined && context.source.type !== handle.type) return incomplete("context.source.type differs from the catalogued native type.");
  if (context.parent !== undefined) return incomplete("Parent source was supplied, but parent-dependent document preparation is not run by this data-only probe; use the whole-template diagnostics for that context.");
  if (handle.contextRequired || handle.pathSegments?.some(part => ["*", "[*]", "{key}"].includes(part))) {
    return incomplete("This field belongs to a collection or variant; use whole-template diagnostics for complete contextual validation.");
  }
  const source = sourceForHandle(handle, context);
  if (!source) return incomplete(`context.source must contain the ${handle.contextSourcePrefix || "model"} object.`);
  const segments = handle.pathSegments;
  if (!Array.isArray(segments) || !segments.length) return incomplete("No concrete model-relative path is available.");
  const additional = handle.additionalModelSchemas ?? [];
  try {
    let cursor = source;
    for (const key of segments.slice(0, -1)) {
      if (UNSAFE_KEYS.has(key)) return incomplete("The field path cannot be used as a source property.");
      if (!cursor[key] || typeof cursor[key] !== "object") return incomplete("The supplied source is missing a parent structure required by this field.");
      cursor = cursor[key];
    }
    const key = segments.at(-1);
    if (UNSAFE_KEYS.has(key)) return incomplete("The field path cannot be used as a source property.");
    if (value === undefined) delete cursor[key]; else cursor[key] = cloneCandidate(value);
    if (unresolvedChildren(handle.rootSchema, source, additional.some(entry => entry.prefix === "system"))) return incomplete("The candidate source contains polymorphic or embedded documents that require separate contextual validation.");
    for (const extra of additional) {
      if (source[extra.prefix] && unresolvedChildren(extra.schema, source[extra.prefix])) return incomplete("The candidate system source contains polymorphic or embedded documents requiring separate validation.");
    }
    const before = outputValue(source);
    const cleaned = typeof handle.model.cleanData === "function"
      ? handle.model.cleanData(plainInput(source), { copy: true, migrate: false, expand: false }, { source: plainInput(context.source), modelSource: plainInput(source) })
      : handle.rootSchema.clean(plainInput(source), { partial: false, migrate: false });
    for (const extra of additional) {
      if (!extra.model || !extra.schema || !source[extra.prefix]) return incomplete("Supply a complete system source for the selected native document type.");
      if (source.type !== undefined && source.type !== handle.type) return incomplete("context.source.type differs from the catalogued native type.");
      if (unresolvedChildren(extra.schema, source[extra.prefix])) return incomplete("The system source contains polymorphic or embedded documents requiring separate validation.");
      const system = extra.model.cleanData(plainInput(source[extra.prefix]), { copy: true, migrate: false, expand: false },
        { source: plainInput(source), modelSource: plainInput(source[extra.prefix]) });
      const extraResult = extra.schema.validate(system, { strict: true, partial: false, fallback: false, dropInvalidEmbedded: false, source: system });
      if (extraResult) throw new Error(extraResult.message ?? String(extraResult));
      if (typeof extra.model.validateJoint === "function") extra.model.validateJoint(system);
      cleaned[extra.prefix] = system;
    }
    const result = handle.rootSchema.validate(cleaned, { strict: true, partial: false, fallback: false,
      dropInvalidEmbedded: false, source: cleaned });
    if (result) throw new Error(result.message ?? String(result));
    if (typeof handle.model.validateJoint === "function") handle.model.validateJoint(cleaned);
    return { status: "accepted", valid: true, scope: "running-world", modelClass: handle.model.name,
      changed: stableCatalogString(before) !== stableCatalogString(outputValue(cleaned)), before, after: outputValue(cleaned),
      limitation: "Model data validation only; no document construction, parent-dependent preparation, link resolution or gameplay hooks were run." };
  } catch (error) {
    return { status: "rejected", valid: false, scope: "running-world", modelClass: handle.model.name,
      error: error.message ?? String(error) };
  }
}

/** Each call re-discovers metadata so stale pages can be detected instead of silently mixed. */
export function createFieldCatalogService({ provider, discover, decorate, extend, decorateExtensions = fields => fields }) {
  function catalog(layer = "native") {
    let native = discover();
    if (!(native.handles instanceof Map)) throw new Error("Native discovery did not supply field handles.");
    if (layer !== "native") {
      if (typeof extend !== "function") throw new Error("Extension discovery is unavailable for this provider.");
      native = extend(native);
    }
    const fields = [...decorate(native.fields.filter(field => !field.layer || field.layer === "native"), native.environment),
      ...decorateExtensions(native.fields.filter(field => field.layer && field.layer !== "native"), native.environment)]
      .filter(field => layer === "all" || (field.layer ?? "native") === layer).sort((a, b) => a.id.localeCompare(b.id));
    if (new Set(fields.map(field => field.id)).size !== fields.length) throw new Error("Duplicate native field identities were discovered.");
    const environment = native.environment;
    const catalogId = provider + ":" + fingerprint({ environment, types: native.types, fields, diagnostics: native.diagnostics });
    return { ...native, fields, environment, catalogId, layer };
  }
  function envelope(data) {
    return { success: true, available: true, formatVersion: FIELD_CATALOG_FORMAT_VERSION, provider, moduleId: provider,
      catalogId: data.catalogId, environment: data.environment, types: data.types, diagnostics: data.diagnostics,
      completeness: { discoveredFields: data.fields.length,
        selectedLayer: data.layer, layers: ["native", "midi", "extensions", "all"],
        schemaFields: data.fields.filter(field => field.fieldClass).length,
        unschematizedFields: data.fields.filter(field => field.validation?.formalDataField === false).length,
        unresolvedBehaviorFields: data.fields.filter(field => field.behavior && (field.behavior.status !== "source-reviewed" || field.behavior.unresolved?.length)).length,
        unsupportedFields: data.fields.filter(field => field.coverage?.status === "unsupported").length,
        unattributedFields: data.fields.filter(field => field.layer === "extensions").length,
        ...(data.environment.midi ? { midi: { active: data.environment.midi.active, schemaStatus: data.environment.midi.schemaStatus,
          registryEntries: data.environment.midi.registryEntries, complete: false } } : {}),
        unresolvedFields: data.fields.filter(field => /unresolved|unknown/.test(field.classification ?? "")).length,
        unreviewedSheetFields: data.fields.filter(field => field.sheet?.status !== "reviewed").length,
        coverageNeedsReview: data.fields.filter(field => field.coverage?.status === "needs-review").length,
        meaning: "All discovered nodes are returned or classified. Open objects and unresolved/contextual behavior are not claimed as exhaustively known." },
      writeCount: 0 };
  }
  return Object.freeze({
    getFieldCatalog(input = {}) {
      try {
        input = plainInput(input);
        const data = catalog(catalogLayer(input)), query = normalizeQuery(input), limit = integer(input.limit, 100, MAX_PAGE);
        const fields = data.fields.filter(field => matching(field, query));
        let offset = 0;
        if (input.cursor !== undefined && input.cursor !== null) {
          if (typeof input.cursor !== "string") throw new Error("cursor must be the continuation string returned by getFieldCatalog.");
          const parts = input.cursor.split("|");
          if (parts.length !== 3 || parts[0] !== data.catalogId || parts[1] !== fingerprint(query)) throw new Error("Catalog or query changed; restart pagination without a cursor.");
          offset = Number(parts[2]);
          if (!Number.isInteger(offset) || offset < 0 || offset > fields.length) throw new Error("Invalid catalog cursor offset.");
        }
        const next = offset + limit;
        return { ...envelope(data), kind: "native-field-catalog-page", query, total: fields.length, offset, limit,
          nextCursor: next < fields.length ? `${data.catalogId}|${fingerprint(query)}|${next}` : null,
          fields: fields.slice(offset, next), completeness: { ...envelope(data).completeness, filtered: Object.keys(query).length > 0 } };
      } catch (error) { return failure(error); }
    },
    getFieldDetails(input = {}) {
      try {
        input = plainInput(input);
        if (typeof input.fieldId !== "string") throw new Error("fieldId is required; use an identity returned by getFieldCatalog.");
        const data = catalog(catalogLayer(input, true)), field = data.fields.find(entry => entry.id === input.fieldId);
        if (!field) throw new Error("Unknown catalogued field identity.");
        return { ...envelope(data), kind: "native-field-details", field };
      } catch (error) { return failure(error); }
    },
    probeFieldValues(input = {}) {
      try {
        input = plainInput(input);
        if (typeof input.fieldId !== "string") throw new Error("fieldId is required; arbitrary property/global paths are not accepted.");
        const values = input.values ?? [];
        if (!Array.isArray(values) || values.length + (input.includeMissing === true ? 1 : 0) < 1
          || values.length + (input.includeMissing === true ? 1 : 0) > MAX_PROBES) throw new Error(`Submit 1 to ${MAX_PROBES} values, including any missing-value probe.`);
        const context = input.context ?? {};
        if (context.source !== undefined && (!context.source || typeof context.source !== "object" || Array.isArray(context.source))) throw new Error("context.source must be a plain model/document source object.");
        if (context.parent !== undefined && (!context.parent || typeof context.parent !== "object" || Array.isArray(context.parent))) throw new Error("context.parent must be plain source data; live documents are not accepted.");
        const data = catalog(catalogLayer(input, true)), handle = data.handles.get(input.fieldId), field = data.fields.find(entry => entry.id === input.fieldId);
        if (!handle || !field) throw new Error("Unknown or unresolved catalogued field identity.");
        const candidates = [...values, ...(input.includeMissing === true ? [undefined] : [])];
        const source = sourceForHandle(handle, context);
        return { success: true, available: true, formatVersion: FIELD_CATALOG_FORMAT_VERSION, kind: "native-field-probes",
          provider, catalogId: data.catalogId, environment: data.environment, fieldId: field.id,
          results: candidates.map(value => ({ submitted: described(value),
            raw: handle.probeReason ? { status: "incomplete", valid: null, reason: handle.probeReason } : fieldValidation(handle.field, value, source),
            cleaning: handle.probeReason ? { status: "incomplete", reason: handle.probeReason } : fieldCleaning(handle.field, value, source),
            contextual: contextualValidation(handle, value, context) })),
          ...(field.layer ? { layer: field.layer, sheet: field.sheet, behavior: field.behavior,
            completeness: { gameplay: false, yamlSupport: false, contextual: !handle.extensionProbe } } : {}),
          limitations: ["Observed native field cases are not an exhaustive proof of accepted values or YAML support.",
            "Formula validation does not verify that every @variable exists.",
            "Running-world model validation may use module-modified registries. No linked documents, parent preparation or gameplay actions are evaluated."],
          writeCount: 0 };
      } catch (error) { return failure(error); }
    }
  });
}
