/** Randomized compendium image candidate collection and selection. */

const cache = new Map();
const stats = { hits: 0, misses: 0, evictions: 0 };
let cacheConfig = { enabled: true, ttlMs: 5 * 60 * 1000, maxEntries: 128 };

function now() {
  return Date.now();
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed) {
  let state = stableHash(seed) || 0x9e3779b9;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
}

function cacheGet(key) {
  if (!cacheConfig.enabled || !key) return undefined;
  const entry = cache.get(key);
  if (!entry) {
    stats.misses++;
    return undefined;
  }
  if (cacheConfig.ttlMs > 0 && now() - entry.createdAt > cacheConfig.ttlMs) {
    cache.delete(key);
    stats.misses++;
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  stats.hits++;
  return entry.value;
}

function cacheSet(key, value) {
  if (!cacheConfig.enabled || !key) return;
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { createdAt: now(), value });
  while (cache.size > cacheConfig.maxEntries) {
    cache.delete(cache.keys().next().value);
    stats.evictions++;
  }
}

function normalizeName(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nameScore(query, candidate) {
  const wanted = normalizeName(query);
  const actual = normalizeName(candidate);
  if (!wanted || !actual) return 0;
  if (wanted === actual) return 1;
  if (actual.startsWith(wanted) || wanted.startsWith(actual)) return 0.9;
  if (actual.includes(wanted) || wanted.includes(actual)) return 0.82;
  const wantedTokens = new Set(wanted.split(" "));
  const actualTokens = new Set(actual.split(" "));
  const overlap = [...wantedTokens].filter((token) => actualTokens.has(token)).length;
  return overlap / Math.max(wantedTokens.size, actualTokens.size, 1) * 0.75;
}

function normalizeCandidate(candidate, index = 0) {
  if (typeof candidate === "string") {
    return { img: candidate, name: "", score: 0, sourceIndex: index };
  }
  if (!candidate || typeof candidate !== "object") return null;
  const img = candidate.img ?? candidate.image ?? candidate.src ?? null;
  if (!img || typeof img !== "string") return null;
  const score = Number(candidate.score);
  return {
    ...candidate,
    img,
    name: String(candidate.name ?? candidate.label ?? ""),
    score: Number.isFinite(score) ? score : 0,
    sourceIndex: index
  };
}

function candidateSignature(candidates) {
  return candidates.map((candidate) =>
    `${candidate.img}|${candidate.uuid ?? ""}|${candidate.score}`
  ).join("\n");
}

export function configureCompendiumImageCandidateCache(options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "enabled")) {
    cacheConfig.enabled = !!options.enabled;
  }
  if (Number.isFinite(options.ttlMs) && options.ttlMs >= 0) {
    cacheConfig.ttlMs = Math.floor(options.ttlMs);
  }
  if (Number.isSafeInteger(options.maxEntries) && options.maxEntries > 0) {
    cacheConfig.maxEntries = options.maxEntries;
  }
  while (cache.size > cacheConfig.maxEntries) cache.delete(cache.keys().next().value);
  return { ...cacheConfig };
}

export function clearCompendiumImageCandidateCache(options = {}) {
  const prefix = options.prefix == null ? null : String(options.prefix);
  if (prefix === null) cache.clear();
  else {
    for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
  }
  if (options.resetStats) {
    stats.hits = 0;
    stats.misses = 0;
    stats.evictions = 0;
  }
}

export function getCompendiumImageCandidateCacheStats() {
  return { ...stats, size: cache.size, config: { ...cacheConfig } };
}

/**
 * Select from normalized candidates. Deterministic mode without an explicit
 * seed chooses the highest-ranked candidate; a seed makes random choice stable.
 */
export function selectCompendiumImageCandidate(candidates, options = {}) {
  const normalized = (Array.isArray(candidates) ? candidates : [])
    .map(normalizeCandidate)
    .filter(Boolean)
    .sort((a, b) =>
      b.score - a.score
        || a.name.localeCompare(b.name)
        || a.img.localeCompare(b.img)
        || String(a.uuid ?? "").localeCompare(String(b.uuid ?? ""))
    );
  if (normalized.length === 0) return null;

  const highestScore = normalized[0].score;
  const scoreWindow = Number.isFinite(options.scoreWindow)
    ? Math.max(0, options.scoreWindow)
    : 0.15;
  const pool = normalized.filter((candidate) => highestScore - candidate.score <= scoreWindow);
  const signature = candidateSignature(pool);
  const seed = options.seed ?? null;
  const chooseBest = options.deterministic === true && seed === null;
  const selectionKey = options.cacheKey
    ? `select:${options.cacheKey}:${stableHash(signature)}:${chooseBest ? "best" : seed == null ? "random" : stableHash(seed)}`
    : null;

  if (options.useCache !== false && selectionKey) {
    const cached = cacheGet(selectionKey);
    if (cached) return { ...cached };
  }

  let selected;
  if (chooseBest) {
    selected = { ...pool[0] };
  } else {
    const randomValue = seed != null
      ? seededUnit(`${seed}|${signature}`)
      : typeof options.random === "function"
        ? Number(options.random())
        : Math.random();
    const safeRandom = Number.isFinite(randomValue)
      ? Math.max(0, Math.min(0.999999999999, randomValue))
      : 0;
    selected = { ...pool[Math.floor(safeRandom * pool.length)] };
  }
  if (options.useCache !== false && selectionKey) cacheSet(selectionKey, selected);
  return selected;
}

/** Collect image-bearing Item index entries from local Foundry compendiums. */
export async function collectCompendiumImageCandidates(name, options = {}) {
  const query = String(name ?? "").trim();
  if (!query) return [];
  const requestedTypes = new Set(
    (Array.isArray(options.types)
      ? options.types
      : options.type
        ? [options.type]
        : options.itemType
          ? [options.itemType]
          : [])
      .map((type) => String(type))
  );
  const packsSource = options.packs ?? globalThis.game?.packs ?? [];
  const packs = Array.from(packsSource?.values?.() ?? packsSource ?? [])
    .filter((pack) => pack?.documentName === "Item" || pack?.metadata?.type === "Item")
    .filter((pack) => !options.packIds
      || options.packIds.includes(pack.collection ?? pack.metadata?.id));
  const packIds = packs.map((pack) => pack.collection ?? pack.metadata?.id ?? "unknown").sort();
  const requestedMinimumScore = Number(options.minimumScore ?? 0.35);
  const minimumScore = Number.isFinite(requestedMinimumScore) ? requestedMinimumScore : 0.35;
  const collectKey = options.cacheKey
    ? `collect:${options.cacheKey}`
    : `collect:${normalizeName(query)}:${[...requestedTypes].sort().join(",")}:${packIds.join(",")}:${minimumScore}`;
  if (options.useCache !== false) {
    const cached = cacheGet(collectKey);
    if (cached) return cached.map((entry) => ({ ...entry }));
  }

  const byImage = new Map();
  for (const pack of packs) {
    let index;
    try {
      index = await pack.getIndex({ fields: ["name", "img", "type"] });
    } catch {
      continue;
    }
    for (const entry of Array.from(index?.values?.() ?? index ?? [])) {
      if (!entry?.img || (requestedTypes.size && !requestedTypes.has(String(entry.type)))) continue;
      const score = nameScore(query, entry.name);
      if (score < minimumScore) continue;
      const packId = pack.collection ?? pack.metadata?.id ?? "";
      const candidate = {
        name: String(entry.name ?? ""),
        img: entry.img,
        type: entry.type ?? null,
        pack: packId,
        id: entry._id ?? entry.id ?? null,
        uuid: entry.uuid ?? (packId && (entry._id ?? entry.id)
          ? `Compendium.${packId}.Item.${entry._id ?? entry.id}`
          : null),
        score: Number(score.toFixed(3))
      };
      const existing = byImage.get(candidate.img);
      if (!existing || candidate.score > existing.score) byImage.set(candidate.img, candidate);
    }
  }

  const candidates = [...byImage.values()].sort((a, b) =>
    b.score - a.score || a.name.localeCompare(b.name) || a.img.localeCompare(b.img)
  );
  if (options.useCache !== false) cacheSet(collectKey, candidates);
  return candidates.map((entry) => ({ ...entry }));
}
