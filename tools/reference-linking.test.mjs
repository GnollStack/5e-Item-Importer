// Tests for scripts/referenceLinking.js. Shared file: identical in both importers (parity list).
import test from "node:test";
import assert from "node:assert/strict";
import {
    REFERENCE_COMPENDIUMS_LIMIT, REFERENCE_COMPENDIUMS_SETTING, REFERENCE_RULES_SETTING, exactNameCandidates, listReferencePacks,
    looksLikeUuid, matchScore, mirrorReferenceRules, mirrorReferenceSetting, normalizeName, normalizePackIds, packSourceLabel,
    pickReference, preferredRules, rankCandidates, readPreferredRules, readReferenceOptions, referenceCompendiumsSettingConfig,
    rulesOfPack, searchReferences
} from "../scripts/referenceLinking.js";
import { editCompendiumList, referenceCompendiumsMenu, referenceCompendiumsMenuConfig, renderCompendiumList } from "../scripts/ui/referenceCompendiums.js";

const index = entries => new Map(entries.map(entry => [entry._id, entry]));
const systemPack = (name, label, rulesVersion, documentName, entries) => ({
    collection: `dnd5e.${name}`, documentName, visible: true,
    metadata: { id: `dnd5e.${name}`, label, packageType: "system", packageName: "dnd5e", flags: { dnd5e: { rulesVersion } } },
    index: index(entries)
});
const modulePack = (moduleId, name, label, documentName, entries) => ({
    collection: `${moduleId}.${name}`, documentName, visible: true,
    metadata: { id: `${moduleId}.${name}`, label, packageType: "module", packageName: moduleId, flags: {} },
    index: index(entries)
});
const spell = (id, name) => ({ _id: id, name, type: "spell", img: "icons/spell.webp" });

function fakeGame({ rulesVersion = "modern", worldItems = [], extraPacks = [], settings = {}, user = { id: "gm1", isGM: true }, activeGM = "gm1", modules = {} } = {}) {
    const packs = [
        systemPack("spells", "Spells (SRD)", "legacy", "Item", [spell("srdThunderwave01", "Thunderwave"), spell("srdThunderclap01", "Thunderclap"), spell("srdFireball0001", "Fireball")]),
        systemPack("spells24", "Spells", "modern", "Item", [spell("phbsplThunderwav", "Thunderwave"), spell("phbsplFireball00", "Fireball"), spell("phbsplWish00000", "Wish")]),
        systemPack("actors24", "Actors", "modern", "Actor", [{ _id: "mmWolf0000000000", name: "Wolf", type: "npc" }]),
        systemPack("monsters", "Monsters (SRD)", "legacy", "Actor", [{ _id: "srdWolf000000000", name: "Wolf", type: "npc" }]),
        { collection: "world.hidden", documentName: "Item", visible: false, metadata: { label: "Hidden", packageType: "world", packageName: "world" }, index: index([spell("hiddenThunder001", "Thunderwave")]) },
        ...extraPacks
    ];
    const store = new Map(Object.entries(settings));
    const registered = new Set(Object.keys(settings));
    const writes = [];
    return {
        writes,
        system: { id: "dnd5e" },
        user,
        users: { activeGM: activeGM ? { id: activeGM } : null },
        items: worldItems.map(item => ({ ...item, uuid: `Item.${item._id}`, system: {}, testUserPermission: () => item.hidden !== true })),
        actors: [],
        packs,
        modules: new Map(Object.entries({ "5e-activity-importer": { active: true }, "5e-item-importer": { active: true }, "gambits-premades": { active: true, title: "Gambit's Premades" }, ...modules })),
        settings: {
            settings: { has: key => registered.has(key) },
            get: (moduleId, key) => {
                if (moduleId === "dnd5e" && key === "rulesVersion") return rulesVersion;
                if (!store.has(`${moduleId}.${key}`)) throw new Error("not registered");
                return store.get(`${moduleId}.${key}`);
            },
            set: (moduleId, key, value) => { store.set(`${moduleId}.${key}`, value); writes.push([moduleId, key, value]); }
        }
    };
}

const thunderwaveFrom = async game => pickReference(await exactNameCandidates({ name: "thunderwave", documentName: "Item", itemTypes: ["spell"], game }), { preference: preferredRules("world", game) });

test("rules come from the pack's dnd5e rules version", () => {
    assert.equal(rulesOfPack({ metadata: { flags: { dnd5e: { rulesVersion: "legacy" } } } }), "2014");
    assert.equal(rulesOfPack({ metadata: { flags: { dnd5e: { rulesVersion: "modern" } } } }), "2024");
    assert.equal(rulesOfPack({ metadata: {} }), null);
});

test("the world's Rules Version decides 'world'; explicit choices win", () => {
    assert.equal(preferredRules("world", fakeGame({ rulesVersion: "modern" })), "2024");
    assert.equal(preferredRules("world", fakeGame({ rulesVersion: "legacy" })), "2014");
    assert.equal(preferredRules("2014", fakeGame({ rulesVersion: "modern" })), "2014");
    assert.equal(preferredRules("ask", fakeGame()), "ask");
    assert.equal(preferredRules("world", {}), "2024", "no dnd5e setting: modern, dnd5e's default");
    assert.equal(readPreferredRules("5e-activity-importer", fakeGame()), "2024", "an unregistered setting falls back to world");
    assert.equal(readPreferredRules("5e-activity-importer", fakeGame({ settings: { [`5e-activity-importer.${REFERENCE_RULES_SETTING}`]: "2014" } })), "2014");
});

test("a 2024 world links Thunderwave from Spells, a 2014 world from Spells (SRD)", async () => {
    const modern = await thunderwaveFrom(fakeGame({ rulesVersion: "modern" }));
    assert.equal(modern.status, "resolved");
    assert.equal(modern.match.uuid, "Compendium.dnd5e.spells24.Item.phbsplThunderwav");
    assert.equal(modern.reason, "rules");
    const legacy = await thunderwaveFrom(fakeGame({ rulesVersion: "legacy" }));
    assert.equal(legacy.match.uuid, "Compendium.dnd5e.spells.Item.srdThunderwave01");
});

test("hidden packs are never searched", async () => {
    const candidates = await exactNameCandidates({ name: "Thunderwave", documentName: "Item", itemTypes: ["spell"], game: fakeGame() });
    assert.equal(candidates.length, 2);
    assert.ok(candidates.every(candidate => !candidate.uuid.includes("world.hidden")));
});

test("a world copy wins; two world copies ask; a world copy the user cannot see is ignored", async () => {
    const one = await thunderwaveFrom(fakeGame({ worldItems: [{ _id: "worldThunder0001", name: "Thunderwave", type: "spell" }] }));
    assert.equal(one.status, "resolved");
    assert.equal(one.reason, "world");
    assert.equal(one.match.uuid, "Item.worldThunder0001");
    const two = await thunderwaveFrom(fakeGame({ worldItems: [{ _id: "worldThunder0001", name: "Thunderwave", type: "spell" }, { _id: "worldThunder0002", name: "thunderwave ", type: "spell" }] }));
    assert.equal(two.status, "ambiguous");
    const hidden = await thunderwaveFrom(fakeGame({ worldItems: [{ _id: "worldThunder0001", name: "Thunderwave", type: "spell", hidden: true }] }));
    assert.equal(hidden.match.uuid, "Compendium.dnd5e.spells24.Item.phbsplThunderwav");
});

test("a copy in another module's compendium asks, with the preferred rules first", async () => {
    const game = fakeGame({ extraPacks: [modulePack("gambits-premades", "gps-spells", "GPS Spells", "Item", [spell("gpsThunderwave01", "Thunderwave")])] });
    const result = await thunderwaveFrom(game);
    assert.equal(result.status, "ambiguous");
    assert.equal(result.reason, "other-compendium");
    assert.deepEqual(result.candidates.map(candidate => candidate.uuid), [
        "Compendium.dnd5e.spells24.Item.phbsplThunderwav",
        "Compendium.dnd5e.spells.Item.srdThunderwave01",
        "Compendium.gambits-premades.gps-spells.Item.gpsThunderwave01"
    ]);
    assert.equal(result.candidates[2].location, "GPS Spells · Gambit's Premades");
});

test("'Always ask' asks between the two dnd5e copies but still links a single match", async () => {
    const game = fakeGame({ settings: { [`5e-activity-importer.${REFERENCE_RULES_SETTING}`]: "ask" } });
    const preference = readPreferredRules("5e-activity-importer", game);
    assert.equal(pickReference(await exactNameCandidates({ name: "Thunderwave", documentName: "Item", itemTypes: ["spell"], game }), { preference }).reason, "ask");
    const wish = pickReference(await exactNameCandidates({ name: "Wish", documentName: "Item", itemTypes: ["spell"], game }), { preference });
    assert.equal(wish.status, "resolved");
    assert.equal(wish.reason, "only");
});

test("nothing found is unresolved; item types filter", async () => {
    const game = fakeGame();
    assert.equal(pickReference(await exactNameCandidates({ name: "Nope", documentName: "Item", game })).status, "unresolved");
    assert.equal((await exactNameCandidates({ name: "Thunderwave", documentName: "Item", itemTypes: ["weapon"], game })).length, 0);
});

test("creatures follow the same rules", async () => {
    const game = fakeGame({ rulesVersion: "legacy" });
    const wolf = pickReference(await exactNameCandidates({ name: "Wolf", documentName: "Actor", game }), { preference: preferredRules("world", game) });
    assert.equal(wolf.match.uuid, "Compendium.dnd5e.monsters.Actor.srdWolf000000000");
});

test("source labels name the pack, the system and its rules", () => {
    const game = fakeGame();
    assert.equal(packSourceLabel(game.packs[1], game), "Spells · dnd5e 2024");
    assert.equal(packSourceLabel(game.packs[0], game), "Spells (SRD) · dnd5e 2014");
});

test("match scores: exact, prefix, word start, anywhere", () => {
    assert.equal(matchScore("Thunderwave", "thunderwave"), 0);
    assert.equal(matchScore("Thunderwave", "thun"), 1);
    assert.equal(matchScore("Wall of Fire", "fire"), 2);
    assert.equal(matchScore("Bonfire", "fire"), 3);
    assert.equal(matchScore("Wish", "fire"), -1);
});

test("live search: two characters, best matches and preferred rules first, UUIDs left to fromUuid", async () => {
    const game = fakeGame();
    assert.deepEqual(await searchReferences({ query: "t", game }), []);
    assert.deepEqual(await searchReferences({ query: "Compendium.dnd5e.spells24.Item.phbsplThunderwav", game }), []);
    const results = await searchReferences({ query: "thun", itemTypes: ["spell"], preference: "2024", game });
    assert.deepEqual(results.map(result => `${result.name}|${result.rules}`), ["Thunderclap|2014", "Thunderwave|2024", "Thunderwave|2014"]);
    const limited = await searchReferences({ query: "e", itemTypes: ["spell"], game, limit: 2 });
    assert.equal(limited.length, 0, "one character is too short");
    assert.equal((await searchReferences({ query: "re", itemTypes: ["spell"], game, limit: 2 })).length, 2);
});

test("rankCandidates puts exact names before partial ones", () => {
    const ranked = rankCandidates([
        { uuid: "a", name: "Fireball, Delayed", source: "compendium", system: true, rules: "2024", location: "x" },
        { uuid: "b", name: "Fireball", source: "compendium", system: true, rules: "2014", location: "y" }
    ], "2024", normalizeName("fireball"));
    assert.deepEqual(ranked.map(entry => entry.uuid), ["b", "a"]);
});

test("UUID detection", () => {
    assert.ok(looksLikeUuid("Compendium.dnd5e.spells24.Item.phbsplThunderwav"));
    assert.ok(looksLikeUuid("Item.abcdefghijklmnop"));
    assert.ok(looksLikeUuid("Actor.abcdefghijklmnop.Item.abcdefghijklmnop"));
    assert.ok(!looksLikeUuid("Thunderwave"));
});

// ---------- Compendiums to link first (referenceCompendiums) ----------

const premadePacks = () => [
    modulePack("gambits-premades", "gps-spells", "GPS Spells", "Item", [spell("gpsThunderwave01", "Thunderwave")]),
    modulePack("cauldron", "cpr-spells", "CPR Spells", "Item", [spell("cprThunderwave01", "Thunderwave"), spell("cprFireball00001", "Fireball")]),
    modulePack("cauldron", "cpr-twice", "CPR Twice", "Item", [spell("cprTwiceWish0001", "Wish"), spell("cprTwiceWish0002", "Wish")])
];
const pickFrom = async (game, name, priority) => pickReference(await exactNameCandidates({ name, documentName: "Item", itemTypes: ["spell"], game }),
    { preference: preferredRules("world", game), priority });

test("a listed compendium links its copy first, in the order of the list", async () => {
    const game = fakeGame({ extraPacks: premadePacks(), modules: { cauldron: { active: true, title: "Cauldron" } } });
    const cauldronFirst = await pickFrom(game, "Thunderwave", ["cauldron.cpr-spells", "gambits-premades.gps-spells"]);
    assert.equal(cauldronFirst.status, "resolved");
    assert.equal(cauldronFirst.reason, "priority");
    assert.equal(cauldronFirst.match.uuid, "Compendium.cauldron.cpr-spells.Item.cprThunderwave01");
    const gambitFirst = await pickFrom(game, "Thunderwave", ["gambits-premades.gps-spells", "cauldron.cpr-spells"]);
    assert.equal(gambitFirst.match.uuid, "Compendium.gambits-premades.gps-spells.Item.gpsThunderwave01");
    // Not in the first listed pack: the next one that has it links.
    const fireball = await pickFrom(game, "Fireball", ["gambits-premades.gps-spells", "cauldron.cpr-spells"]);
    assert.equal(fireball.match.uuid, "Compendium.cauldron.cpr-spells.Item.cprFireball00001");
    // In no listed pack: the usual order (here the module copy of Thunderwave makes it ask).
    assert.equal((await pickFrom(game, "Thunderwave", ["dnd5e.nothing"])).reason, "other-compendium");
    assert.equal((await pickFrom(fakeGame(), "Thunderwave", ["cauldron.cpr-spells"])).reason, "rules", "a listed pack that is not installed changes nothing");
});

test("two copies in a listed compendium ask, listed copies first; a world copy still wins", async () => {
    const game = fakeGame({ extraPacks: premadePacks() });
    const wish = await pickFrom(game, "Wish", ["cauldron.cpr-twice"]);
    assert.equal(wish.status, "ambiguous");
    assert.equal(wish.reason, "priority");
    assert.deepEqual(wish.candidates.map(candidate => candidate.pack), ["cauldron.cpr-twice", "cauldron.cpr-twice", "dnd5e.spells24"]);
    const world = fakeGame({ extraPacks: premadePacks(), worldItems: [{ _id: "worldThunder0001", name: "Thunderwave", type: "spell" }] });
    assert.equal((await pickFrom(world, "Thunderwave", ["cauldron.cpr-spells"])).reason, "world");
});

test("live search ranks listed compendiums after world copies and before the preferred rules", async () => {
    const game = fakeGame({ extraPacks: premadePacks(), worldItems: [{ _id: "worldThunder0001", name: "Thunderwave", type: "spell" }] });
    const results = await searchReferences({ query: "thunderwave", itemTypes: ["spell"], preference: "2024", priority: ["cauldron.cpr-spells", "gambits-premades.gps-spells"], game });
    assert.deepEqual(results.map(result => result.pack ?? "world"), ["world", "cauldron.cpr-spells", "gambits-premades.gps-spells", "dnd5e.spells24", "dnd5e.spells"]);
});

test("the compendium list setting: clean values, read back, mirrored to the other importer", () => {
    assert.deepEqual(normalizePackIds([" a.b ", "a.b", "", 3, null, "c.d"]), ["a.b", "c.d"]);
    assert.deepEqual(normalizePackIds("a.b"), []);
    assert.equal(normalizePackIds(Array.from({ length: 80 }, (_, i) => "p." + i)).length, REFERENCE_COMPENDIUMS_LIMIT);
    const activityKey = `5e-activity-importer.${REFERENCE_COMPENDIUMS_SETTING}`;
    const itemKey = `5e-item-importer.${REFERENCE_COMPENDIUMS_SETTING}`;
    const game = fakeGame({ settings: { [activityKey]: ["cauldron.cpr-spells"], [itemKey]: [] } });
    assert.deepEqual(readReferenceOptions("5e-activity-importer", game), { preference: "2024", priority: ["cauldron.cpr-spells"] });
    assert.deepEqual(readReferenceOptions("5e-item-importer", fakeGame()), { preference: "2024", priority: [] }, "unregistered: an empty list");
    assert.equal(mirrorReferenceSetting("5e-activity-importer", REFERENCE_COMPENDIUMS_SETTING, ["cauldron.cpr-spells"], game), true);
    assert.deepEqual(game.writes, [["5e-item-importer", REFERENCE_COMPENDIUMS_SETTING, ["cauldron.cpr-spells"]]]);
    assert.equal(mirrorReferenceSetting("5e-item-importer", REFERENCE_COMPENDIUMS_SETTING, ["cauldron.cpr-spells"], game), false, "equal lists end the exchange");
    const config = referenceCompendiumsSettingConfig("5e-activity-importer", { game });
    assert.equal(config.scope, "world");
    assert.equal(config.config, false, "edited in its own window");
    assert.deepEqual(config.default, []);
});

test("the compendium list window: Item and Actor packs, editing, and its markup", () => {
    const game = fakeGame({ extraPacks: premadePacks() });
    const packs = listReferencePacks(game);
    assert.ok(packs.every(pack => pack.id !== "world.hidden"), "hidden packs are not offered");
    assert.deepEqual(packs.filter(pack => pack.documentName === "Actor").map(pack => pack.id).sort(), ["dnd5e.actors24", "dnd5e.monsters"]);
    let list = editCompendiumList([], "add", { id: "cauldron.cpr-spells" });
    list = editCompendiumList(list, "add", { id: "gambits-premades.gps-spells" });
    list = editCompendiumList(list, "add", { id: "cauldron.cpr-spells" });
    assert.deepEqual(list, ["cauldron.cpr-spells", "gambits-premades.gps-spells"], "adding twice keeps one");
    assert.deepEqual(editCompendiumList(list, "up", { index: 1 }), ["gambits-premades.gps-spells", "cauldron.cpr-spells"]);
    assert.deepEqual(editCompendiumList(list, "down", { index: 1 }), list, "the last one cannot move down");
    assert.deepEqual(editCompendiumList(list, "remove", { index: 0 }), ["gambits-premades.gps-spells"]);
    const html = renderCompendiumList({ prefix: "ii", chosen: ["cauldron.cpr-spells", "gone.pack"], packs, changed: true });
    assert.match(html, /CPR Spells/);
    assert.match(html, /gone\.pack <span class="ii-refcomp-missing">not available in this world<\/span>/);
    assert.match(html, /Not saved yet\./);
    assert.doesNotMatch(html, /<option value="cauldron\.cpr-spells">/, "a listed pack is not offered again");
    assert.match(html, /<optgroup label="Actor compendiums \(creatures\)">/);
    assert.match(renderCompendiumList({ prefix: "ai", chosen: [], packs }), /No compendiums listed\./);
    assert.match(renderCompendiumList({ prefix: "ai", chosen: [], packs: [{ id: "x<y", label: "<b>", documentName: "Item" }] }), /&lt;b&gt;/, "labels are escaped");
    assert.equal(referenceCompendiumsMenu("5e-activity-importer", "ai"), null, "no window class without Foundry");
    assert.equal(referenceCompendiumsMenuConfig("5e-activity-importer", "ai"), null);
});

test("the active GM copies the setting to the other importer once", () => {
    const key = `5e-item-importer.${REFERENCE_RULES_SETTING}`;
    const game = fakeGame({ settings: { [key]: "world", [`5e-activity-importer.${REFERENCE_RULES_SETTING}`]: "2014" } });
    assert.equal(mirrorReferenceRules("5e-activity-importer", "2014", game), true);
    assert.deepEqual(game.writes, [["5e-item-importer", REFERENCE_RULES_SETTING, "2014"]]);
    assert.equal(mirrorReferenceRules("5e-item-importer", "2014", game), false, "equal values end the exchange");
    const player = fakeGame({ settings: { [key]: "world" }, user: { id: "p1", isGM: false } });
    assert.equal(mirrorReferenceRules("5e-activity-importer", "2014", player), false);
    const otherGM = fakeGame({ settings: { [key]: "world" }, activeGM: "gm2" });
    assert.equal(mirrorReferenceRules("5e-activity-importer", "2014", otherGM), false);
    const inactive = fakeGame({ settings: { [key]: "world" }, modules: { "5e-item-importer": { active: false } } });
    assert.equal(mirrorReferenceRules("5e-activity-importer", "2014", inactive), false);
});
