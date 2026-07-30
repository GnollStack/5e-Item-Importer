/**
 * Safe custom-property support.
 *
 * Custom properties may only reference property IDs already registered by
 * dnd5e. Additional data is stored as namespaced module metadata; this module
 * intentionally has no API that accepts or writes arbitrary system paths.
 */

const MODULE_ID = "5e-item-importer";
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const PROPERTY_ID_RE = /^[a-z][a-z0-9_-]{0,63}$/i;
const NAMESPACED_KEY_RE = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/i;
const NORMALIZED_CUSTOM_PROPERTIES = Symbol("normalizedCustomProperties");

function markNormalized(result) {
  Object.defineProperty(result, NORMALIZED_CUSTOM_PROPERTIES, {
    value: true,
    enumerable: false
  });
  return result;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function runtimeRegistry(itemType) {
  const validProperties = globalThis.CONFIG?.DND5E?.validProperties
    ?? globalThis.game?.system?.config?.validProperties
    ?? null;
  const scopedValid = itemType ? validProperties?.[itemType] : null;
  if (scopedValid instanceof Map
      || scopedValid instanceof Set
      || Array.isArray(scopedValid)
      || isPlainObject(scopedValid)) {
    return scopedValid;
  }

  const registry = globalThis.CONFIG?.DND5E?.itemProperties
    ?? globalThis.game?.system?.config?.itemProperties
    ?? null;
  return registry;
}

function collectRegistryIds(registry, output = new Set()) {
  if (!registry) return output;
  if (registry instanceof Set) {
    for (const id of registry) if (PROPERTY_ID_RE.test(String(id))) output.add(String(id));
    return output;
  }
  if (registry instanceof Map) {
    for (const id of registry.keys()) if (PROPERTY_ID_RE.test(String(id))) output.add(String(id));
    return output;
  }
  if (Array.isArray(registry)) {
    for (const entry of registry) {
      const id = isPlainObject(entry) ? (entry.id ?? entry.value ?? entry.key) : entry;
      if (PROPERTY_ID_RE.test(String(id ?? ""))) output.add(String(id));
    }
    return output;
  }
  if (isPlainObject(registry)) {
    for (const key of Object.keys(registry)) {
      if (!UNSAFE_KEYS.has(key) && PROPERTY_ID_RE.test(key)) output.add(key);
    }
  }
  return output;
}

function normalizeRequestedIds(value) {
  const values = value instanceof Set
    ? [...value]
    : Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[\s,]+/)
        : value == null
          ? []
          : [value];
  return [...new Set(values.map((entry) => String(entry ?? "").trim()).filter(Boolean))].sort();
}

/** Resolve requested IDs against the active or explicitly supplied registry. */
export function resolveRegisteredPropertyIds(ids, options = {}) {
  const requested = normalizeRequestedIds(ids);
  const registry = options.registry ?? runtimeRegistry(options.itemType);
  const available = collectRegistryIds(registry);
  const accepted = [];
  const rejected = [];

  for (const id of requested) {
    if (!PROPERTY_ID_RE.test(id)) {
      rejected.push({ id, reason: "invalid-id" });
    } else if (!available.has(id)) {
      rejected.push({ id, reason: registry ? "not-registered" : "registry-unavailable" });
    } else {
      accepted.push(id);
    }
  }

  return { accepted, rejected, registryAvailable: !!registry };
}

function sanitizeMetadataValue(value, depth = 0) {
  if (depth > 3) return { valid: false, value: null };
  if (value === null || typeof value === "boolean") return { valid: true, value };
  if (typeof value === "number") {
    return { valid: Number.isFinite(value), value: Number.isFinite(value) ? value : null };
  }
  if (typeof value === "string") {
    return { valid: value.length <= 2000, value: value.slice(0, 2000) };
  }
  if (Array.isArray(value) && value.length <= 50) {
    const output = [];
    for (const entry of value) {
      const safe = sanitizeMetadataValue(entry, depth + 1);
      if (!safe.valid) return { valid: false, value: null };
      output.push(safe.value);
    }
    return { valid: true, value: output };
  }
  if (isPlainObject(value) && Object.keys(value).length <= 50) {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (UNSAFE_KEYS.has(key) || !PROPERTY_ID_RE.test(key)) return { valid: false, value: null };
      const safe = sanitizeMetadataValue(entry, depth + 1);
      if (!safe.valid) return { valid: false, value: null };
      output[key] = safe.value;
    }
    return { valid: true, value: output };
  }
  return { valid: false, value: null };
}

/**
 * Normalize CUSTOM_PROPERTIES input.
 * Expected shape: { Registered: [ids...], Metadata: { "namespace.key": value } }
 */
export function normalizeCustomProperties(input, options = {}) {
  const warnings = [];
  const errors = [];
  if (input == null) {
    return markNormalized({ registered: [], metadata: {}, warnings, errors, registryAvailable: false });
  }
  if (!isPlainObject(input)) {
    errors.push("CUSTOM_PROPERTIES must be a mapping");
    return markNormalized({ registered: [], metadata: {}, warnings, errors, registryAvailable: false });
  }

  const known = new Set(["Registered", "Metadata"]);
  for (const key of Object.keys(input)) {
    if (!known.has(key)) warnings.push(`Unknown CUSTOM_PROPERTIES key "${key}" was ignored.`);
  }

  const resolved = resolveRegisteredPropertyIds(input.Registered, options);
  for (const rejection of resolved.rejected) {
    const reason = rejection.reason === "not-registered"
      ? "is not registered by dnd5e"
      : rejection.reason === "registry-unavailable"
        ? "could not be verified because the dnd5e property registry is unavailable"
        : "is not a safe property ID";
    warnings.push(`Custom property "${rejection.id}" ${reason} and was ignored.`);
  }

  const metadata = {};
  const metadataInput = input.Metadata;
  if (metadataInput != null && !isPlainObject(metadataInput)) {
    errors.push("CUSTOM_PROPERTIES.Metadata must be a mapping of namespaced keys");
  } else {
    for (const [key, value] of Object.entries(metadataInput ?? {})) {
      if (UNSAFE_KEYS.has(key) || !NAMESPACED_KEY_RE.test(key)) {
        warnings.push(`Custom metadata key "${key}" is not namespaced and was ignored.`);
        continue;
      }
      const safe = sanitizeMetadataValue(value);
      if (!safe.valid) {
        warnings.push(`Custom metadata value for "${key}" is unsafe or too large and was ignored.`);
        continue;
      }
      metadata[key] = safe.value;
    }
  }

  return markNormalized({
    registered: resolved.accepted,
    metadata,
    warnings,
    errors,
    registryAvailable: resolved.registryAvailable
  });
}

/** Build only namespaced module flags; never system-data update paths. */
export function customPropertiesToFlagData(input, options = {}) {
  const normalized = input?.[NORMALIZED_CUSTOM_PROPERTIES]
    ? input
    : normalizeCustomProperties(
        input?.Registered || input?.Metadata
          ? input
          : { Registered: input?.registered, Metadata: input?.metadata },
        options
      );
  return {
    [MODULE_ID]: {
      customProperties: {
        version: 1,
        registered: [...new Set(normalized.registered ?? [])].sort(),
        metadata: { ...(normalized.metadata ?? {}) }
      }
    }
  };
}

/**
 * Explicit adapter contract for Item source creation. Merge `flags` into
 * `itemSource.flags`; add `registeredPropertyIds` to system.properties as IDs.
 */
export function customPropertiesToItemSourcePatch(input, options = {}) {
  const normalized = input?.[NORMALIZED_CUSTOM_PROPERTIES]
    ? input
    : normalizeCustomProperties(
        input?.Registered || input?.Metadata
          ? input
          : { Registered: input?.registered, Metadata: input?.metadata },
        options
      );
  return {
    registeredPropertyIds: [...new Set(normalized.registered ?? [])].sort(),
    flags: customPropertiesToFlagData(normalized, options),
    warnings: [...(normalized.warnings ?? [])],
    errors: [...(normalized.errors ?? [])]
  };
}
