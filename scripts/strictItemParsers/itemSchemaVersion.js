/**
 * Versioning and migrations for the Item Importer's strict YAML format.
 *
 * Documents created before schema metadata existed are schema version 0.
 * They remain accepted and are migrated in memory before normal parsing.
 */

export const ITEM_YAML_SCHEMA_KEY = "SCHEMA_VERSION";
export const ITEM_YAML_SCHEMA_VERSION = 1;

const LEGACY_SCHEMA_KEYS = ["Schema Version", "schemaVersion", "schema_version"];
const ITEM_ROOT_KEYS = [
  "WEAPON",
  "EQUIPMENT",
  "CONSUMABLE",
  "TOOL",
  "LOOT",
  "CONTAINER",
  "SPELL"
];

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneSafe(value) {
  if (Array.isArray(value)) return value.map(cloneSafe);
  if (!isPlainObject(value)) return value;
  const cloned = {};
  for (const [key, entry] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    cloned[key] = cloneSafe(entry);
  }
  return cloned;
}

function parseVersion(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Read schema metadata without mutating a document.
 * Missing metadata means legacy schema version 0.
 */
export function readItemYamlSchemaVersion(document) {
  if (!isPlainObject(document)) {
    return { version: null, key: null, explicit: false, valid: false };
  }

  if (Object.prototype.hasOwnProperty.call(document, ITEM_YAML_SCHEMA_KEY)) {
    const version = parseVersion(document[ITEM_YAML_SCHEMA_KEY]);
    return {
      version,
      key: ITEM_YAML_SCHEMA_KEY,
      explicit: true,
      valid: version !== null
    };
  }

  const legacyKey = LEGACY_SCHEMA_KEYS.find((key) =>
    Object.prototype.hasOwnProperty.call(document, key)
  );
  if (legacyKey) {
    const version = parseVersion(document[legacyKey]);
    return { version, key: legacyKey, explicit: true, valid: version !== null };
  }

  return { version: 0, key: null, explicit: false, valid: true };
}

function migrateLegacyItemData(data, migrations) {
  if (!isPlainObject(data)) return;

  const scroll = data.SCROLL_PROPERTIES;
  if (isPlainObject(scroll)
      && !Object.prototype.hasOwnProperty.call(scroll, "Vocal")
      && Object.prototype.hasOwnProperty.call(scroll, "Verbal")) {
    scroll.Vocal = scroll.Verbal;
    delete scroll.Verbal;
    migrations.push("SCROLL_PROPERTIES.Verbal renamed to Vocal");
  }

  const usage = data.USAGE;
  if (isPlainObject(usage)
      && !Object.prototype.hasOwnProperty.call(usage, "Uses Spent")
      && Object.prototype.hasOwnProperty.call(usage, "Uses Current")) {
    const max = parseVersion(usage["Uses Max"]);
    const current = parseVersion(usage["Uses Current"]);
    // Only migrate values that are already valid remaining-use counts. Invalid
    // legacy values must reach the strict parser unchanged so it can report the
    // original field and value instead of an error about a derived value.
    if (max !== null && max >= 0 && current !== null && current >= 0 && current <= max) {
      usage["Uses Spent"] = max - current;
      delete usage["Uses Current"];
      migrations.push("deprecated USAGE.Uses Current converted from remaining uses to Uses Spent");
    }
  }

  const preparation = data.PREPARATION;
  if (isPlainObject(preparation)
      && String(preparation.Method ?? "").trim().toLowerCase() === "prepared") {
    preparation.Method = "spell";
    migrations.push("PREPARATION.Method prepared normalized to spell");
  }
}

/**
 * Clone and migrate a strict-YAML document to the current schema.
 * Future versions fail closed so their fields are never silently discarded.
 */
export function migrateItemYamlDocument(document, options = {}) {
  const targetVersion = options.targetVersion ?? ITEM_YAML_SCHEMA_VERSION;
  const errors = [];
  const warnings = [];
  const migrations = [];
  const versionInfo = readItemYamlSchemaVersion(document);

  if (!isPlainObject(document)) {
    errors.push("YAML document is empty or not an object");
    return {
      document,
      sourceVersion: versionInfo.version,
      targetVersion,
      explicitVersion: versionInfo.explicit,
      migrations,
      warnings,
      errors
    };
  }

  if (!versionInfo.valid) {
    errors.push(`${versionInfo.key ?? ITEM_YAML_SCHEMA_KEY} must be a non-negative integer`);
  } else if (versionInfo.version < 0) {
    errors.push(`${versionInfo.key ?? ITEM_YAML_SCHEMA_KEY} cannot be negative`);
  } else if (versionInfo.version > targetVersion) {
    errors.push(
      `Unsupported Item YAML schema version ${versionInfo.version}; this importer supports up to ${targetVersion}`
    );
  }

  const migrated = cloneSafe(document);
  for (const key of LEGACY_SCHEMA_KEYS) delete migrated[key];

  if (errors.length === 0 && versionInfo.version === 0) {
    for (const rootKey of ITEM_ROOT_KEYS) {
      migrateLegacyItemData(migrated[rootKey], migrations);
    }
    if (!versionInfo.explicit) {
      warnings.push("Legacy strict YAML without SCHEMA_VERSION was accepted as schema version 0.");
    }
  }

  if (errors.length === 0) migrated[ITEM_YAML_SCHEMA_KEY] = targetVersion;

  return {
    document: migrated,
    sourceVersion: versionInfo.version,
    targetVersion,
    explicitVersion: versionInfo.explicit,
    migrations,
    warnings,
    errors
  };
}

export function isItemYamlMetadataKey(key) {
  return key === ITEM_YAML_SCHEMA_KEY || LEGACY_SCHEMA_KEYS.includes(key);
}
