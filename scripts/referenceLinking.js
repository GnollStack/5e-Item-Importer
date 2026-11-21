/**
 * Linking the documents that importer YAML names (a Cast's spell, a Summon or Transform creature,
 * a feat's granted items): which document a name links to, and the live search behind the
 * reference fields. Shared file: identical in both importers (parity list). It imports nothing
 * from Foundry; callers pass `game`, so the Node tests can use a fake one.
 *
 * Linking order for one name (owner decisions, 2026-11-15; the compendium list 2026-11-19):
 * 1. exactly one world document with the name links; several ask;
 * 2. the first compendium of the `referenceCompendiums` list that has the name links its copy,
 *    if it has exactly one; several there ask;
 * 3. exactly one compendium document links;
 * 4. a match in a compendium that is not the game system's own asks;
 * 5. otherwise the system copy whose rules match the preferred rules links, if exactly one does.
 */

export const REFERENCE_COMPENDIUMS_SETTING = "referenceCompendiums";
export const REFERENCE_COMPENDIUMS_MENU = "referenceCompendiumsMenu";
export const REFERENCE_COMPENDIUMS_NAME = "Compendiums to link first";
export const REFERENCE_COMPENDIUMS_HINT = "Compendiums whose spells and creatures link before any other copy, in the order listed: for example a module of spells already automated for MIDI-QOL. A world Item with the name still wins. 5e Activity Importer and 5e Item Importer share this list.";
export const REFERENCE_COMPENDIUMS_LIMIT = 50;

export const REFERENCE_RULES_SETTING = "referenceRules";
export const REFERENCE_RULES_DEFAULT = "world";
export const REFERENCE_RULES_CHOICES = Object.freeze({
    world: "Match the world's Rules Version",
    "2024": "2024 rules (Spells, Actors)",
    "2014": "2014 rules (Spells (SRD), Monsters (SRD))",
    ask: "Always ask"
});
export const REFERENCE_RULES_NAME = "Default compendium for linked spells and creatures";
export const REFERENCE_RULES_HINT = "When a spell or creature named in the YAML is in both of dnd5e's compendiums, link the copy from these rules. A world Item with that name always wins, then a compendium from Compendiums to link first; a match in another module's compendium is offered as a choice. 5e Activity Importer and 5e Item Importer share this setting.";
export const MIN_QUERY_LENGTH = 2;
export const RESULT_LIMIT = 20;

const IMPORTER_IDS = Object.freeze(["5e-activity-importer", "5e-item-importer"]);
const SOURCE_RANK = Object.freeze({ world: 0, priority: 1, preferred: 2, system: 3, other: 4 });

/** Lower case, trimmed, single spaces. */
export function normalizeName(value) {
    return value === undefined || value === null ? "" : String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** True for text that looks like a document UUID rather than a name. */
export function looksLikeUuid(value) {
    return /^(Compendium\.[^.\s]+\.[^.\s]+\.)?[A-Z][A-Za-z]+\.[A-Za-z0-9]{16}(\.[A-Z][A-Za-z]+\.[A-Za-z0-9]{16})*$/.test(String(value ?? "").trim());
}

/** "2014", "2024" or null, from a pack's `flags.dnd5e.rulesVersion` (legacy or modern). */
export function rulesOfPack(pack) {
    const version = pack?.metadata?.flags?.dnd5e?.rulesVersion ?? pack?.metadata?.flags?.[pack?.metadata?.system]?.rulesVersion;
    return version === "legacy" ? "2014" : version === "modern" ? "2024" : null;
}

/** True when the pack ships with the game system itself. */
export function isSystemPack(pack, game = globalThis.game) {
    const metadata = pack?.metadata ?? {};
    const systemId = game?.system?.id ?? "dnd5e";
    return metadata.packageType === "system" && (metadata.packageName ?? metadata.system ?? systemId) === systemId;
}

/** "Spells · dnd5e 2024", "Spells (SRD) · dnd5e 2014", "Premade Spells · Some Module". */
export function packSourceLabel(pack, game = globalThis.game) {
    const metadata = pack?.metadata ?? {};
    const label = metadata.label ?? pack?.collection ?? "Compendium";
    const packageName = metadata.packageName ?? "";
    const packageTitle = metadata.packageType === "system"
        ? (game?.system?.id ?? packageName)
        : (game?.modules?.get?.(packageName)?.title ?? packageName);
    const rules = rulesOfPack(pack);
    return [label, [packageTitle, rules].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

/**
 * The rules a setting value prefers: "2024", "2014" or "ask". "world" follows dnd5e's own
 * Rules Version setting (modern by default).
 */
export function preferredRules(setting, game = globalThis.game) {
    if (setting === "2024" || setting === "2014" || setting === "ask") return setting;
    let version = "modern";
    try { version = game?.settings?.get?.(game?.system?.id ?? "dnd5e", "rulesVersion") ?? "modern"; } catch { version = "modern"; }
    return version === "legacy" ? "2014" : "2024";
}

/** The preferred rules from one importer's setting, with a safe default when it is not registered. */
export function readPreferredRules(moduleId, game = globalThis.game) {
    let setting = REFERENCE_RULES_DEFAULT;
    try { setting = game?.settings?.get?.(moduleId, REFERENCE_RULES_SETTING) ?? REFERENCE_RULES_DEFAULT; } catch { setting = REFERENCE_RULES_DEFAULT; }
    return preferredRules(setting, game);
}

/**
 * The configuration of the shared world setting, for `game.settings.register(moduleId, "referenceRules", ...)`
 * (each module writes that call itself, so its settings checks find the key). When the value
 * changes, the active GM copies it to the other importer, so the two stay the same while both are active.
 */
export function referenceRulesSettingConfig(moduleId, { game = globalThis.game, name = REFERENCE_RULES_NAME, hint = REFERENCE_RULES_HINT, choices = REFERENCE_RULES_CHOICES } = {}) {
    return {
        name, hint, scope: "world", config: true, type: String, choices: { ...choices }, default: REFERENCE_RULES_DEFAULT,
        onChange: value => { mirrorReferenceRules(moduleId, value, game); }
    };
}

/** Copy the rules setting to the sibling importer. */
export function mirrorReferenceRules(moduleId, value, game = globalThis.game) {
    return mirrorReferenceSetting(moduleId, REFERENCE_RULES_SETTING, value, game);
}

/** Copy one shared reference setting to the sibling importer. Runs on the active GM only; equal values end the exchange. */
export function mirrorReferenceSetting(moduleId, key, value, game = globalThis.game) {
    if (!game?.user?.isGM) return false;
    const activeGM = game.users?.activeGM;
    if (activeGM && activeGM.id !== game.user.id) return false;
    let changed = false;
    for (const siblingId of IMPORTER_IDS) {
        if (siblingId === moduleId || !game.modules?.get?.(siblingId)?.active) continue;
        if (!game.settings?.settings?.has?.(`${siblingId}.${key}`)) continue;
        let current;
        try { current = game.settings.get(siblingId, key); } catch { continue; }
        if (JSON.stringify(current) === JSON.stringify(value)) continue;
        game.settings.set(siblingId, key, value);
        changed = true;
    }
    return changed;
}

/** A clean list of compendium ids: text, trimmed, no repeats, at most REFERENCE_COMPENDIUMS_LIMIT. */
export function normalizePackIds(value) {
    const seen = new Set();
    for (const entry of Array.isArray(value) ? value : []) {
        const id = typeof entry === "string" ? entry.trim() : "";
        if (id && !seen.has(id)) seen.add(id);
        if (seen.size >= REFERENCE_COMPENDIUMS_LIMIT) break;
    }
    return [...seen];
}

/**
 * The configuration of the shared compendium list, for `game.settings.register(moduleId, "referenceCompendiums", ...)`.
 * Edited in its own window (`scripts/ui/referenceCompendiums.js`), so it is not shown in the settings list itself.
 */
export function referenceCompendiumsSettingConfig(moduleId, { game = globalThis.game } = {}) {
    return {
        name: REFERENCE_COMPENDIUMS_NAME, hint: REFERENCE_COMPENDIUMS_HINT, scope: "world", config: false, type: Array, default: [],
        onChange: value => { mirrorReferenceSetting(moduleId, REFERENCE_COMPENDIUMS_SETTING, normalizePackIds(value), game); }
    };
}

/** The compendium ids to link first, from one importer's setting; [] when it is not registered. */
export function readPriorityPacks(moduleId, game = globalThis.game) {
    try { return normalizePackIds(game?.settings?.get?.(moduleId, REFERENCE_COMPENDIUMS_SETTING)); } catch { return []; }
}

/** The preferred rules and the compendium list of one importer, as `pickReference` and the searches take them. */
export function readReferenceOptions(moduleId, game = globalThis.game) {
    return { preference: readPreferredRules(moduleId, game), priority: readPriorityPacks(moduleId, game) };
}

/** A world document as a candidate. */
export function worldCandidate(document) {
    return {
        uuid: document.uuid, name: document.name ?? "", type: document.type ?? null, img: document.img ?? null,
        identifier: document.system?.identifier ?? null, source: "world", pack: null, system: false, rules: null, location: "World"
    };
}

/** A compendium index entry as a candidate. */
export function compendiumCandidate(pack, entry, documentName, game = globalThis.game) {
    const packId = pack?.collection ?? pack?.metadata?.id ?? null;
    const id = entry?._id ?? entry?.id;
    return {
        uuid: entry?.uuid ?? (packId && id ? `Compendium.${packId}.${documentName}.${id}` : null),
        name: entry?.name ?? "", type: entry?.type ?? null, img: entry?.img ?? null,
        identifier: entry?.system?.identifier ?? null, source: "compendium", pack: packId,
        system: isSystemPack(pack, game), rules: rulesOfPack(pack), location: packSourceLabel(pack, game)
    };
}

/** World Items or Actors the current user can see. */
export function accessibleWorldDocuments(documentName, game = globalThis.game) {
    const collection = documentName === "Actor" ? game?.actors : documentName === "Item" ? game?.items : null;
    return values(collection).filter(document => {
        if (!document || document.visible === false) return false;
        if (typeof document.testUserPermission !== "function") return true;
        try { return document.testUserPermission(game?.user, "LIMITED") === true; } catch { return false; }
    });
}

const fetchedIndexes = new WeakSet();

/** Visible packs of one document type, with their indexes loaded once. */
export async function visiblePacks(documentName, game = globalThis.game) {
    const packs = [];
    for (const pack of values(game?.packs)) {
        if (!pack || pack.visible === false) continue;
        if ((pack.documentName ?? pack.metadata?.type) !== documentName) continue;
        if (!sizeOf(pack.index) && typeof pack.getIndex === "function" && !fetchedIndexes.has(pack)) {
            fetchedIndexes.add(pack);
            try { await pack.getIndex(); } catch { /* an unreadable pack is skipped */ }
        }
        packs.push(pack);
    }
    return packs;
}

/**
 * Every visible document of one type that passes `test(name, entry)`, as candidates (world first).
 * @param {object} options
 * @param {"Item"|"Actor"} options.documentName
 * @param {string[]} [options.itemTypes] - Item types to keep; empty keeps all
 * @param {(candidate: object) => boolean} options.test
 */
export async function collectCandidates({ documentName, itemTypes = [], test, game = globalThis.game }) {
    const typeOk = type => documentName !== "Item" || !itemTypes?.length || itemTypes.includes(type);
    const found = [];
    for (const document of accessibleWorldDocuments(documentName, game)) {
        if (!typeOk(document.type)) continue;
        const candidate = worldCandidate(document);
        if (test(candidate)) found.push(candidate);
    }
    for (const pack of await visiblePacks(documentName, game)) {
        for (const entry of values(pack.index)) {
            if (!typeOk(entry?.type)) continue;
            const candidate = compendiumCandidate(pack, entry, documentName, game);
            if (candidate.uuid && test(candidate)) found.push(candidate);
        }
    }
    return dedupeCandidates(found);
}

/** Documents whose name is exactly `name` (case and spacing ignored). */
export async function exactNameCandidates({ name, documentName, itemTypes = [], game = globalThis.game }) {
    const needle = normalizeName(name);
    if (!needle) return [];
    return collectCandidates({ documentName, itemTypes, game, test: candidate => normalizeName(candidate.name) === needle });
}

/**
 * Decide which candidate a name links to. `candidates` are the exact matches; `priority` is the
 * ordered list of compendium ids to link first.
 * @returns {{status: "resolved"|"ambiguous"|"unresolved", match: object|null, candidates: object[], reason: string}}
 */
export function pickReference(candidates, { preference = "2024", priority = [] } = {}) {
    const list = dedupeCandidates(candidates ?? []);
    const packs = normalizePackIds(priority);
    const resolved = (match, reason) => ({ status: "resolved", match, candidates: list, reason });
    const ambiguous = reason => ({ status: "ambiguous", match: null, candidates: rankCandidates(list, preference, "", packs), reason });
    if (!list.length) return { status: "unresolved", match: null, candidates: [], reason: "none" };
    const world = list.filter(candidate => candidate.source === "world");
    if (world.length === 1) return resolved(world[0], "world");
    if (world.length > 1) return ambiguous("world");
    for (const packId of packs) {
        const listed = list.filter(candidate => candidate.pack === packId);
        if (listed.length === 1) return resolved(listed[0], "priority");
        if (listed.length > 1) return ambiguous("priority");
    }
    if (list.length === 1) return resolved(list[0], "only");
    if (list.some(candidate => !candidate.system)) return ambiguous("other-compendium");
    if (preference !== "2014" && preference !== "2024") return ambiguous("ask");
    const preferred = list.filter(candidate => candidate.rules === preference);
    return preferred.length === 1 ? resolved(preferred[0], "rules") : ambiguous("rules");
}

/** How well `name` matches the search text: 0 exact, 1 prefix, 2 word start, 3 anywhere, -1 not at all. */
export function matchScore(name, needle) {
    const value = normalizeName(name);
    if (!needle || !value) return -1;
    if (value === needle) return 0;
    if (value.startsWith(needle)) return 1;
    const index = value.indexOf(needle);
    if (index < 0) return -1;
    return /[\s(\-'/,:]/.test(value[index - 1]) ? 2 : 3;
}

/**
 * Order candidates: closest match to the search text, then name, then where the copy lives
 * (world, the listed compendiums in their order, preferred system rules, other system copies,
 * other compendiums).
 */
export function rankCandidates(candidates, preference = "2024", needle = "", priority = []) {
    const packs = normalizePackIds(priority);
    const rankOf = candidate => {
        if (candidate.source === "world") return SOURCE_RANK.world;
        const listed = candidate.pack ? packs.indexOf(candidate.pack) : -1;
        if (listed >= 0) return SOURCE_RANK.priority + listed / (packs.length + 1);
        if (candidate.system && candidate.rules && candidate.rules === preference) return SOURCE_RANK.preferred;
        return candidate.system ? SOURCE_RANK.system : SOURCE_RANK.other;
    };
    return [...candidates].sort((left, right) =>
        (needle ? matchScore(left.name, needle) - matchScore(right.name, needle) : 0)
        || normalizeName(left.name).localeCompare(normalizeName(right.name))
        || rankOf(left) - rankOf(right)
        || String(left.location).localeCompare(String(right.location)));
}

/**
 * Live search for a reference field: names containing the text, best matches first.
 * Returns [] for text shorter than MIN_QUERY_LENGTH or for a UUID (resolve that with fromUuid).
 */
export async function searchReferences({ query, documentName = "Item", itemTypes = [], preference = "2024", priority = [], limit = RESULT_LIMIT, game = globalThis.game }) {
    const needle = normalizeName(query);
    if (needle.length < MIN_QUERY_LENGTH || needle.length > 200 || looksLikeUuid(query)) return [];
    const found = await collectCandidates({ documentName, itemTypes, game, test: candidate => matchScore(candidate.name, needle) >= 0 });
    return rankCandidates(found, preference, needle, priority).slice(0, Math.max(1, Math.min(200, Number(limit) || RESULT_LIMIT)));
}

/**
 * Item and Actor compendiums the current user can see, for the compendium list window:
 * `{ id, label, documentName, system, rules }`, sorted by label.
 */
export function listReferencePacks(game = globalThis.game) {
    return values(game?.packs)
        .filter(pack => pack && pack.visible !== false && ["Item", "Actor"].includes(pack.documentName ?? pack.metadata?.type))
        .map(pack => ({
            id: pack.collection ?? pack.metadata?.id ?? "", label: packSourceLabel(pack, game),
            documentName: pack.documentName ?? pack.metadata?.type, system: isSystemPack(pack, game), rules: rulesOfPack(pack)
        }))
        .filter(entry => entry.id)
        .sort((left, right) => left.label.localeCompare(right.label));
}

/** Drop repeated UUIDs, keeping the first. */
export function dedupeCandidates(candidates) {
    const seen = new Set();
    return (candidates ?? []).filter(candidate => {
        if (!candidate?.uuid || seen.has(candidate.uuid)) return false;
        seen.add(candidate.uuid);
        return true;
    });
}

function values(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (typeof collection.values === "function") return [...collection.values()];
    if (typeof collection[Symbol.iterator] === "function") return [...collection];
    return Object.values(collection);
}

function sizeOf(collection) {
    if (!collection) return 0;
    if (typeof collection.size === "number") return collection.size;
    if (Array.isArray(collection)) return collection.length;
    return values(collection).length;
}
