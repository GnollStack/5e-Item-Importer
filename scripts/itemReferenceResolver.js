/**
 * @file itemReferenceResolver.js
 * @description Companion-free document references for Item YAML: advancement grants
 * (Items and standalone ActiveEffects) and container placement. YAML may name a
 * document by UUID, name or identifier. A unique match resolves automatically;
 * anything else waits for the user to drop a document onto the reference, and a
 * drop always overrides the automatic choice. Import stays blocked until every
 * reference resolves. Nothing here depends on the Activity Importer.
 */

export const REFERENCE_STATUS = Object.freeze({
  PENDING: "pending",
  RESOLVED: "resolved",
  UNRESOLVED: "unresolved",
  AMBIGUOUS: "ambiguous",
  INVALID: "invalid"
});

/** Reference kinds and the Foundry document each one accepts. */
export const REFERENCE_DOCUMENTS = Object.freeze({
  item: "Item",
  activeEffect: "ActiveEffect",
  container: "Item"
});

/** Sources that record a user decision; automatic resolution never replaces them. */
const USER_SOURCES = new Set(["dropped", "chosen"]);

let referenceCounter = 0;

/**
 * Create a reference record. `path` names where the resolved UUID lands on the
 * parsed item (for example `advancement[0].configuration.items[1].uuid` or
 * `containerRef.uuid`); `applyReference` writes it there.
 * @param {object} spec
 * @param {"item"|"activeEffect"|"container"} spec.kind
 * @param {string} spec.path
 * @param {string} [spec.label]
 * @param {object} [spec.query] - { uuid, name, identifier, itemTypes, embedded }
 * @returns {object}
 */
export function createReference({ kind, path, label = "", query = {} }) {
  const documentName = REFERENCE_DOCUMENTS[kind];
  if (!documentName) throw new Error(`Unknown reference kind "${kind}".`);
  referenceCounter += 1;
  const cleanQuery = {
    documentName,
    uuid: text(query.uuid),
    name: text(query.name),
    identifier: text(query.identifier),
    itemTypes: Array.isArray(query.itemTypes) ? query.itemTypes.filter(Boolean) : [],
    embedded: query.embedded === true
  };
  // Containers may sit on the destination Actor; the collection check replaces the embedding rule.
  if (kind === "container") Object.assign(cleanQuery, { itemTypes: ["container"], embedded: true });
  return {
    id: `ref${referenceCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    kind,
    path,
    label: label || path,
    query: cleanQuery,
    uuid: null,
    resolvedName: null,
    status: REFERENCE_STATUS.PENDING,
    reason: "",
    candidates: [],
    source: "yaml"
  };
}

/** True when any reference on the item still needs a decision or a valid document. */
export function hasUnresolvedReferences(item) {
  return (item?.references ?? []).some(reference => reference.status !== REFERENCE_STATUS.RESOLVED || !reference.uuid);
}

/**
 * Resolve every reference that the user has not decided. Idempotent; safe to run
 * again when the destination changes.
 * @param {object} item - Parsed ItemData with `references`
 * @param {object} [options]
 * @param {object} [options.destination] - { kind, folderId?, actorUuid?, actor?, pack?, packDocument? }
 * @param {boolean} [options.force] - Re-resolve user decisions as well
 */
export async function resolveItemReferences(item, { destination = null, force = false } = {}) {
  const references = Array.isArray(item?.references) ? item.references : [];
  for (const reference of references) {
    if (!USER_SOURCES.has(reference.source) || force) await resolveReference(reference, destination);
    applyReference(item, reference);
  }
  if (item && typeof item === "object") item._hasUnresolvedReferences = hasUnresolvedReferences(item);
  return references;
}

/** Resolve one reference from its authored UUID or by searching the world and compendia. */
export async function resolveReference(reference, destination = null) {
  const query = reference.query ?? {};
  if (query.uuid) {
    const outcome = await inspectUuid(query.uuid, reference, destination);
    Object.assign(reference, outcome, { candidates: [], source: "yaml" });
    return reference;
  }
  const candidates = await findCandidates(reference, destination);
  reference.candidates = candidates;
  reference.source = "resolved";
  if (candidates.length === 1) {
    Object.assign(reference, { status: REFERENCE_STATUS.RESOLVED, uuid: candidates[0].uuid, resolvedName: candidates[0].name, reason: "" });
  } else if (candidates.length > 1) {
    Object.assign(reference, {
      status: REFERENCE_STATUS.AMBIGUOUS, uuid: null, resolvedName: null,
      reason: `${candidates.length} documents match; choose one or drop the intended document.`
    });
  } else {
    const wanted = describeQuery(reference);
    Object.assign(reference, {
      status: REFERENCE_STATUS.UNRESOLVED, uuid: null, resolvedName: null,
      reason: wanted ? `No ${query.documentName} matching ${wanted} was found.` : "No UUID, Name or Identifier was supplied."
    });
  }
  return reference;
}

/**
 * Apply a dropped document. Invalid drops leave the reference unchanged and return the reason.
 * @returns {Promise<{accepted: boolean, reason: string}>}
 */
export async function applyDroppedReference(reference, uuid, destination = null) {
  const outcome = await inspectUuid(uuid, reference, destination);
  if (outcome.status !== REFERENCE_STATUS.RESOLVED) return { accepted: false, reason: outcome.reason };
  Object.assign(reference, outcome, { candidates: [], source: "dropped" });
  return { accepted: true, reason: "" };
}

/** Pick one of the ambiguous candidates. */
export function chooseReferenceCandidate(reference, uuid) {
  const candidate = (reference.candidates ?? []).find(entry => entry.uuid === uuid);
  if (!candidate) return false;
  Object.assign(reference, { status: REFERENCE_STATUS.RESOLVED, uuid: candidate.uuid, resolvedName: candidate.name, reason: "", source: "chosen" });
  return true;
}

/** Forget the current document; automatic resolution may run again afterwards. */
export function clearReference(reference) {
  Object.assign(reference, {
    status: REFERENCE_STATUS.UNRESOLVED, uuid: null, resolvedName: null, source: "cleared",
    reason: "Cleared. Drop a document here or run Resolve references."
  });
}

/** Write the resolved UUID (or null) into the owning structure named by `path`. */
export function applyReference(item, reference) {
  if (!item || !reference?.path) return;
  setPath(item, reference.path, reference.uuid ?? null);
}

/**
 * Import-time preflight: resolves pending references, then re-checks every UUID
 * against the live world. Returns human-readable issues; empty means importable.
 */
export async function validateItemReferences(item, { destination = null } = {}) {
  const references = Array.isArray(item?.references) ? item.references : [];
  if (!references.length) return [];
  await resolveItemReferences(item, { destination });
  const issues = [];
  for (const reference of references) {
    if (reference.status !== REFERENCE_STATUS.RESOLVED || !reference.uuid) {
      issues.push(`${reference.label}: ${reference.reason || "no document is linked yet."}`);
      continue;
    }
    const outcome = await inspectUuid(reference.uuid, reference, destination);
    if (outcome.status !== REFERENCE_STATUS.RESOLVED) {
      Object.assign(reference, outcome);
      issues.push(`${reference.label}: ${outcome.reason}`);
    }
    applyReference(item, reference);
  }
  item._hasUnresolvedReferences = hasUnresolvedReferences(item);
  return issues;
}

/** Summaries for previews and notifications. */
export function summarizeReferences(items) {
  const summary = { total: 0, resolved: 0, unresolved: 0, ambiguous: 0, invalid: 0 };
  for (const item of items ?? []) {
    for (const reference of item?.references ?? []) {
      summary.total += 1;
      if (reference.status === REFERENCE_STATUS.RESOLVED) summary.resolved += 1;
      else if (reference.status === REFERENCE_STATUS.AMBIGUOUS) summary.ambiguous += 1;
      else if (reference.status === REFERENCE_STATUS.INVALID) summary.invalid += 1;
      else summary.unresolved += 1;
    }
  }
  return summary;
}

// ==========================================
// Internals
// ==========================================

async function inspectUuid(uuid, reference, destination) {
  const invalid = reason => ({ status: REFERENCE_STATUS.INVALID, uuid: null, resolvedName: null, reason });
  if (typeof uuid !== "string" || !uuid.trim()) return invalid("A document UUID is required.");
  let document = null;
  try { document = (await globalThis.fromUuid?.(uuid.trim())) ?? null; } catch { document = null; }
  if (!document) return invalid(`"${uuid}" does not resolve to a document in this world.`);
  const expected = reference.query?.documentName ?? "Item";
  if (document.documentName !== expected) {
    return invalid(`"${document.name ?? uuid}" is ${withArticle(document.documentName)}; ${reference.label} needs ${withArticle(expected)}.`);
  }
  if (!reference.query?.embedded && document.parent) {
    return invalid(`"${document.name}" is embedded in ${withArticle(document.parent.documentName)}; ${reference.label} needs a world or compendium ${expected}.`);
  }
  const itemTypes = reference.query?.itemTypes ?? [];
  if (itemTypes.length && !itemTypes.includes(document.type)) {
    return invalid(`"${document.name}" is a ${document.type} ${expected}; ${reference.label} accepts ${itemTypes.join(", ")}.`);
  }
  if (reference.kind === "container") {
    const issue = containerCollectionIssue(document, destination);
    if (issue) return invalid(issue);
  }
  return { status: REFERENCE_STATUS.RESOLVED, uuid: document.uuid ?? uuid.trim(), resolvedName: document.name ?? null, reason: "" };
}

/** dnd5e resolves container contents within one collection, so the parent must live where the import lands. */
function containerCollectionIssue(document, destination) {
  const kind = destination?.kind ?? "world";
  const where = document.parent ? `on the Actor "${document.parent.name}"` : document.pack ? `in the compendium "${document.pack}"` : "in the world Items directory";
  if (kind === "actor") {
    const actorUuid = destination.actor?.uuid ?? destination.actorUuid ?? null;
    if (!document.parent || document.parent.documentName !== "Actor" || (actorUuid && document.parent.uuid !== actorUuid)) {
      return `"${document.name}" is ${where}; the import destination is a different Actor, and dnd5e keeps container contents within one collection.`;
    }
    return "";
  }
  if (kind === "compendium") {
    const pack = destination.packDocument?.collection ?? destination.pack ?? null;
    if (!document.pack || (pack && document.pack !== pack)) {
      return `"${document.name}" is ${where}; the import destination is the compendium "${pack ?? "?"}", and dnd5e keeps container contents within one collection.`;
    }
    return "";
  }
  if (document.parent || document.pack) {
    return `"${document.name}" is ${where}; the import destination is the world Items directory, and dnd5e keeps container contents within one collection.`;
  }
  return "";
}

async function findCandidates(reference, destination) {
  const query = reference.query ?? {};
  const name = normalizeText(query.name);
  const identifier = normalizeText(query.identifier);
  if (!name && !identifier) return [];
  const matches = (candidateName, candidateIdentifier) =>
    (name && normalizeText(candidateName) === name)
    || (identifier && (normalizeText(candidateIdentifier) === identifier || slugify(candidateName) === identifier));
  const typeOk = type => !query.itemTypes?.length || query.itemTypes.includes(type);
  const found = [];

  if (reference.kind === "container") {
    for (const entry of await destinationContainers(destination)) {
      if (matches(entry.name, entry.identifier)) found.push(entry);
    }
    return dedupe(found);
  }

  const documentName = query.documentName;
  if (documentName === "Item") {
    for (const document of iterate(globalThis.game?.items)) {
      if (!typeOk(document.type) || !matches(document.name, document.system?.identifier)) continue;
      found.push(candidate(document.uuid, document.name, document.type, null, "World", document.system?.identifier));
    }
  }
  for (const pack of iterate(globalThis.game?.packs)) {
    if (pack?.documentName !== documentName) continue;
    for (const entry of iterate(pack.index)) {
      if (documentName === "Item" && !typeOk(entry.type)) continue;
      if (!matches(entry.name, entry.system?.identifier)) continue;
      found.push(candidate(entry.uuid ?? `Compendium.${pack.collection}.${documentName}.${entry._id}`, entry.name, entry.type ?? null,
        pack.collection, pack.metadata?.label ?? pack.collection, entry.system?.identifier));
    }
  }
  return dedupe(found);
}

async function destinationContainers(destination) {
  const kind = destination?.kind ?? "world";
  const containers = [];
  if (kind === "actor") {
    let actor = destination.actor ?? null;
    if (!actor && destination.actorUuid) {
      try { actor = await globalThis.fromUuid?.(destination.actorUuid); } catch { actor = null; }
    }
    for (const document of iterate(actor?.items)) {
      if (document.type === "container") containers.push(candidate(document.uuid, document.name, "container", null, actor.name, document.system?.identifier));
    }
    return containers;
  }
  if (kind === "compendium") {
    const pack = destination.packDocument ?? globalThis.game?.packs?.get?.(destination.pack) ?? null;
    for (const entry of iterate(pack?.index)) {
      if (entry.type !== "container") continue;
      containers.push(candidate(entry.uuid ?? `Compendium.${pack.collection}.Item.${entry._id}`, entry.name, "container",
        pack.collection, pack.metadata?.label ?? pack.collection, entry.system?.identifier));
    }
    return containers;
  }
  for (const document of iterate(globalThis.game?.items)) {
    if (document.type === "container") containers.push(candidate(document.uuid, document.name, "container", null, "World", document.system?.identifier));
  }
  return containers;
}

function candidate(uuid, name, type, pack, location, identifier = null) {
  return { uuid, name: name ?? "", type: type ?? null, pack: pack ?? null, location: location ?? (pack ?? "World"), identifier: identifier ?? null };
}

function dedupe(candidates) {
  const seen = new Set();
  return candidates.filter(entry => {
    if (!entry.uuid || seen.has(entry.uuid)) return false;
    seen.add(entry.uuid);
    return true;
  });
}

function describeQuery(reference) {
  const parts = [];
  if (reference.query?.name) parts.push(`the name "${reference.query.name}"`);
  if (reference.query?.identifier) parts.push(`the identifier "${reference.query.identifier}"`);
  const types = reference.query?.itemTypes ?? [];
  const described = parts.join(" or ");
  return described && types.length && reference.kind !== "container" ? `${described} (${types.join(", ")})` : described;
}

function iterate(collection) {
  if (!collection) return [];
  if (typeof collection[Symbol.iterator] === "function") return collection;
  if (typeof collection.values === "function") return collection.values();
  return Object.values(collection);
}

function text(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed && trimmed.toLowerCase() !== "n/a" ? trimmed : null;
}

function normalizeText(value) {
  return value === undefined || value === null ? "" : String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

/** Foundry's strict slugify, which dnd5e uses for default identifiers: spaces become dashes, other punctuation is dropped. */
function slugify(value) {
  return normalizeText(value).replace(/[\s-]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function withArticle(word) {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}

/** Set `a.b[0].c` on an object, creating intermediate objects/arrays as needed. */
function setPath(target, path, value) {
  const tokens = String(path).match(/[^.[\]]+/g) ?? [];
  let cursor = target;
  for (let index = 0; index < tokens.length - 1; index++) {
    const key = tokens[index];
    const next = tokens[index + 1];
    const property = Array.isArray(cursor) ? Number(key) : key;
    if (cursor[property] === undefined || cursor[property] === null) cursor[property] = /^\d+$/.test(next) ? [] : {};
    cursor = cursor[property];
  }
  const last = tokens.at(-1);
  if (last === undefined) return;
  cursor[Array.isArray(cursor) ? Number(last) : last] = value;
}
