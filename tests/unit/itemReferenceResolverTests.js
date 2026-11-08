/** In-memory checks for the companion-free document reference resolver against a stubbed world. */

import {
  createReference,
  resolveItemReferences,
  resolveReference,
  applyDroppedReference,
  chooseReferenceCandidate,
  clearReference,
  applyReference,
  validateItemReferences,
  hasUnresolvedReferences,
  summarizeReferences,
  REFERENCE_STATUS
} from "../../scripts/itemReferenceResolver.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stubWorld() {
  const documents = new Map();
  const add = document => { documents.set(document.uuid, document); return document; };
  const spell = (uuid, name, pack, identifier = "") => ({ uuid, name, type: "spell", documentName: "Item", parent: null, pack, system: { identifier } });
  const worldShield = add(spell("Item.worldShield0001", "Shield", null, "shield"));
  const packShield = add(spell("Compendium.dnd5e.spells24.Item.phbsplShield0000", "Shield", "dnd5e.spells24"));
  const alarm = add(spell("Compendium.dnd5e.spells24.Item.phbsplAlarm00000", "Alarm", "dnd5e.spells24"));
  const alertFeat = add({ uuid: "Compendium.dnd5e.feats24.Item.phbfeaAlert00000", name: "Alert", type: "feat", documentName: "Item", parent: null, pack: "dnd5e.feats24", system: { identifier: "alert" } });
  const bag = add({ uuid: "Item.worldBag00000001", name: "Adventurer's Pack", type: "container", documentName: "Item", parent: null, pack: null, system: { identifier: "" } });
  const actor = { uuid: "Actor.hero000000000001", name: "Hero", documentName: "Actor", items: [] };
  const actorBag = add({ uuid: "Actor.hero000000000001.Item.bag0000000000001", name: "Belt Pouch", type: "container", documentName: "Item", parent: actor, pack: null, system: {} });
  const embeddedAlarm = add({ uuid: "Actor.hero000000000001.Item.spell00000000001", name: "Alarm", type: "spell", documentName: "Item", parent: actor, pack: null, system: {} });
  actor.items.push(actorBag, embeddedAlarm);
  add(actor);
  const effect = add({ uuid: "Compendium.world.effects.ActiveEffect.effect0000000001", name: "Keen Edge", type: "enchantment", documentName: "ActiveEffect", parent: null, pack: "world.effects" });
  const indexOf = document => ({ _id: document.uuid.split(".").at(-1), uuid: document.uuid, name: document.name, type: document.type, system: document.system });
  const packs = [
    { documentName: "Item", collection: "dnd5e.spells24", metadata: { label: "Spells (SRD 2024)" }, index: [packShield, alarm].map(indexOf) },
    { documentName: "Item", collection: "dnd5e.feats24", metadata: { label: "Feats (SRD 2024)" }, index: [alertFeat].map(indexOf) },
    { documentName: "ActiveEffect", collection: "world.effects", metadata: { label: "Effects" }, index: [{ _id: "effect0000000001", uuid: effect.uuid, name: effect.name, type: effect.type }] }
  ];
  packs.get = collection => packs.find(pack => pack.collection === collection) ?? null;
  return { documents, items: [worldShield, bag], packs, actor, worldShield, packShield, alarm, alertFeat, bag, actorBag, embeddedAlarm, effect };
}

async function withStubWorld(world, run) {
  const previous = { items: globalThis.game?.items, packs: globalThis.game?.packs, fromUuid: globalThis.fromUuid };
  globalThis.game = globalThis.game ?? {};
  globalThis.game.items = world.items;
  globalThis.game.packs = world.packs;
  globalThis.fromUuid = async uuid => world.documents.get(uuid) ?? null;
  try { return await run(); } finally {
    globalThis.game.items = previous.items;
    globalThis.game.packs = previous.packs;
    globalThis.fromUuid = previous.fromUuid;
  }
}

function itemWith(...references) {
  return { name: "Reference fixture", type: "feat", advancement: [{ configuration: { items: [{}, {}] } }], references };
}

export async function runItemReferenceResolverTests() {
  const results = [];
  const test = async (name, run) => {
    try { await run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, details: { error: error.message } }); }
  };
  const world = stubWorld();

  await test("unique name resolves against compendium indexes and lands on the item path", () => withStubWorld(world, async () => {
    const reference = createReference({ kind: "item", path: "advancement[0].configuration.items[0].uuid", label: "Alarm", query: { name: "Alarm", itemTypes: ["spell"] } });
    const item = itemWith(reference);
    await resolveItemReferences(item);
    assert(reference.status === REFERENCE_STATUS.RESOLVED && reference.uuid === world.alarm.uuid, "Unique compendium match was not resolved.");
    assert(reference.source === "resolved" && reference.candidates.length === 1, "Automatic resolution bookkeeping lost.");
    assert(item.advancement[0].configuration.items[0].uuid === world.alarm.uuid, "Resolved UUID was not applied to the path.");
    assert(item._hasUnresolvedReferences === false && !hasUnresolvedReferences(item), "Item still reports unresolved references.");
  }));

  await test("name search ignores case and surrounding whitespace, and honours the type filter", () => withStubWorld(world, async () => {
    const spell = createReference({ kind: "item", path: "advancement[0].configuration.items[0].uuid", query: { name: "  alarm ", itemTypes: ["spell"] } });
    await resolveReference(spell);
    assert(spell.uuid === world.alarm.uuid, "Case-insensitive name match failed.");
    const feat = createReference({ kind: "item", path: "x", query: { name: "Alarm", itemTypes: ["feat"] } });
    await resolveReference(feat);
    assert(feat.status === REFERENCE_STATUS.UNRESOLVED && /No Item matching/.test(feat.reason), "Type filter did not exclude the spell.");
  }));

  await test("identifier matches stored identifiers and slugified names", () => withStubWorld(world, async () => {
    const stored = createReference({ kind: "item", path: "x", query: { identifier: "alert", itemTypes: ["feat"] } });
    await resolveReference(stored);
    assert(stored.uuid === world.alertFeat.uuid, "Stored identifier match failed.");
    const slug = createReference({ kind: "item", path: "x", query: { identifier: "adventurers-pack" } });
    await resolveReference(slug);
    assert(slug.uuid === world.bag.uuid, "Slugified name match failed.");
  }));

  await test("several matches are ambiguous until a candidate is chosen, and the choice survives re-resolution", () => withStubWorld(world, async () => {
    const reference = createReference({ kind: "item", path: "advancement[0].configuration.items[1].uuid", label: "Shield", query: { name: "Shield", itemTypes: ["spell"] } });
    const item = itemWith(reference);
    await resolveItemReferences(item);
    assert(reference.status === REFERENCE_STATUS.AMBIGUOUS && reference.candidates.length === 2 && reference.uuid === null, "Two matches were not reported as ambiguous.");
    assert(reference.candidates.some(candidate => candidate.location === "World") && reference.candidates.some(candidate => candidate.pack === "dnd5e.spells24"), "Candidates lost their locations.");
    assert(hasUnresolvedReferences(item), "Ambiguous reference did not block the item.");
    assert(chooseReferenceCandidate(reference, world.packShield.uuid), "Candidate choice was rejected.");
    assert(reference.status === REFERENCE_STATUS.RESOLVED && reference.source === "chosen", "Choice did not resolve the reference.");
    await resolveItemReferences(item);
    assert(reference.uuid === world.packShield.uuid && reference.source === "chosen", "Re-resolution overrode the user's choice.");
    assert(item.advancement[0].configuration.items[1].uuid === world.packShield.uuid, "Chosen UUID was not applied.");
    assert(!chooseReferenceCandidate(reference, "Item.notACandidate0"), "Unknown candidate was accepted.");
  }));

  await test("no match and missing query text explain themselves", () => withStubWorld(world, async () => {
    const missing = createReference({ kind: "item", path: "x", label: "Grant 1", query: { name: "Nonexistent Spell" } });
    await resolveReference(missing);
    assert(missing.status === REFERENCE_STATUS.UNRESOLVED && missing.reason.includes('"Nonexistent Spell"'), "Missing match reason lost the name.");
    const empty = createReference({ kind: "item", path: "x", query: {} });
    await resolveReference(empty);
    assert(empty.status === REFERENCE_STATUS.UNRESOLVED && /No UUID, Name or Identifier/.test(empty.reason), "Empty query reason missing.");
  }));

  await test("authored UUIDs win and are validated for existence, document type, embedding and item type", () => withStubWorld(world, async () => {
    const valid = createReference({ kind: "item", path: "x", query: { uuid: world.alarm.uuid, name: "Something Else", itemTypes: ["spell"] } });
    await resolveReference(valid);
    assert(valid.status === REFERENCE_STATUS.RESOLVED && valid.uuid === world.alarm.uuid && valid.resolvedName === "Alarm", "Valid UUID was not accepted over the name.");
    const missing = createReference({ kind: "item", path: "x", query: { uuid: "Compendium.dnd5e.spells24.Item.missing000000000" } });
    await resolveReference(missing);
    assert(missing.status === REFERENCE_STATUS.INVALID && /does not resolve/.test(missing.reason), "Missing UUID was not invalid.");
    const wrongDocument = createReference({ kind: "activeEffect", path: "x", query: { uuid: world.alarm.uuid } });
    await resolveReference(wrongDocument);
    assert(wrongDocument.status === REFERENCE_STATUS.INVALID && /needs an ActiveEffect/.test(wrongDocument.reason), "Item accepted for an ActiveEffect reference.");
    const embedded = createReference({ kind: "item", path: "x", query: { uuid: world.embeddedAlarm.uuid } });
    await resolveReference(embedded);
    assert(embedded.status === REFERENCE_STATUS.INVALID && /embedded/.test(embedded.reason), "Embedded Item UUID was accepted for an advancement reference.");
    const wrongType = createReference({ kind: "item", path: "x", query: { uuid: world.alertFeat.uuid, itemTypes: ["spell"] } });
    await resolveReference(wrongType);
    assert(wrongType.status === REFERENCE_STATUS.INVALID && /accepts spell/.test(wrongType.reason), "Item type filter ignored for UUIDs.");
    const effect = createReference({ kind: "activeEffect", path: "x", query: { name: "Keen Edge" } });
    await resolveReference(effect);
    assert(effect.status === REFERENCE_STATUS.RESOLVED && effect.uuid === world.effect.uuid, "ActiveEffect compendium search failed.");
  }));

  await test("a drop overrides automatic resolution, invalid drops leave the reference unchanged, and clearing re-opens it", () => withStubWorld(world, async () => {
    const reference = createReference({ kind: "item", path: "advancement[0].configuration.items[0].uuid", label: "Shield", query: { name: "Shield", itemTypes: ["spell"] } });
    const item = itemWith(reference);
    await resolveItemReferences(item);
    assert(reference.status === REFERENCE_STATUS.AMBIGUOUS, "Precondition: ambiguous.");
    const rejected = await applyDroppedReference(reference, world.actor.uuid);
    assert(rejected.accepted === false && /needs an Item/.test(rejected.reason) && reference.status === REFERENCE_STATUS.AMBIGUOUS, "Invalid drop changed the reference.");
    const accepted = await applyDroppedReference(reference, world.worldShield.uuid);
    assert(accepted.accepted && reference.status === REFERENCE_STATUS.RESOLVED && reference.source === "dropped" && reference.uuid === world.worldShield.uuid, "Valid drop was not applied.");
    applyReference(item, reference);
    await resolveItemReferences(item);
    assert(reference.uuid === world.worldShield.uuid && reference.source === "dropped", "Re-resolution replaced the dropped document.");
    await resolveItemReferences(item, { force: true });
    assert(reference.status === REFERENCE_STATUS.AMBIGUOUS, "Forced re-resolution did not recompute.");
    await applyDroppedReference(reference, world.alarm.uuid);
    clearReference(reference);
    assert(reference.status === REFERENCE_STATUS.UNRESOLVED && reference.uuid === null && reference.source === "cleared", "Clear did not reset the reference.");
    applyReference(item, reference);
    assert(item.advancement[0].configuration.items[0].uuid === null, "Cleared UUID was not removed from the path.");
    await resolveItemReferences(item);
    assert(reference.status === REFERENCE_STATUS.AMBIGUOUS, "Cleared reference was not resolved again.");
  }));

  await test("container references search only the destination collection and reject cross-collection drops", () => withStubWorld(world, async () => {
    const worldBag = createReference({ kind: "container", path: "containerRef.uuid", label: "Container", query: { name: "Adventurer's Pack" } });
    await resolveReference(worldBag, { kind: "world", folderId: null });
    assert(worldBag.status === REFERENCE_STATUS.RESOLVED && worldBag.uuid === world.bag.uuid && worldBag.query.itemTypes.join() === "container", "World container was not found.");
    const onActor = createReference({ kind: "container", path: "containerRef.uuid", query: { name: "Belt Pouch" } });
    await resolveReference(onActor, { kind: "actor", actorUuid: world.actor.uuid });
    assert(onActor.status === REFERENCE_STATUS.RESOLVED && onActor.uuid === world.actorBag.uuid, "Actor container was not found through the destination.");
    const worldBagOnActor = createReference({ kind: "container", path: "containerRef.uuid", query: { name: "Adventurer's Pack" } });
    await resolveReference(worldBagOnActor, { kind: "actor", actor: world.actor });
    assert(worldBagOnActor.status === REFERENCE_STATUS.UNRESOLVED, "World container leaked into the actor destination search.");
    const crossDrop = await applyDroppedReference(worldBagOnActor, world.bag.uuid, { kind: "actor", actor: world.actor });
    assert(crossDrop.accepted === false && /one collection/.test(crossDrop.reason), "Cross-collection container drop was accepted.");
    const packDrop = await applyDroppedReference(worldBagOnActor, world.actorBag.uuid, { kind: "actor", actor: world.actor });
    assert(packDrop.accepted && worldBagOnActor.uuid === world.actorBag.uuid, "Same-collection container drop was rejected.");
    const notAContainer = createReference({ kind: "container", path: "containerRef.uuid", query: { uuid: world.alarm.uuid } });
    await resolveReference(notAContainer);
    assert(notAContainer.status === REFERENCE_STATUS.INVALID && /accepts container/.test(notAContainer.reason), "Non-container UUID accepted as a container.");
    const inPack = createReference({ kind: "container", path: "containerRef.uuid", query: { name: "Adventurer's Pack" } });
    await resolveReference(inPack, { kind: "compendium", pack: "dnd5e.spells24" });
    assert(inPack.status === REFERENCE_STATUS.UNRESOLVED, "World container matched a compendium destination.");
  }));

  await test("import preflight resolves pending references, blocks unresolved ones and re-checks live documents", () => withStubWorld(world, async () => {
    const resolved = createReference({ kind: "item", path: "advancement[0].configuration.items[0].uuid", label: "Grant 1", query: { name: "Alarm", itemTypes: ["spell"] } });
    const ambiguous = createReference({ kind: "item", path: "advancement[0].configuration.items[1].uuid", label: "Grant 2", query: { name: "Shield", itemTypes: ["spell"] } });
    const item = itemWith(resolved, ambiguous);
    const issues = await validateItemReferences(item);
    assert(issues.length === 1 && issues[0].startsWith("Grant 2:") && /2 documents match/.test(issues[0]), "Ambiguous reference did not produce exactly one issue: " + JSON.stringify(issues));
    assert(item.advancement[0].configuration.items[0].uuid === world.alarm.uuid, "Resolved reference was not applied during preflight.");
    chooseReferenceCandidate(ambiguous, world.packShield.uuid);
    assert((await validateItemReferences(item)).length === 0, "Fully resolved item still reports issues.");
    world.documents.delete(world.packShield.uuid);
    try {
      const stale = await validateItemReferences(item);
      assert(stale.length === 1 && ambiguous.status === REFERENCE_STATUS.INVALID, "Deleted document was not caught at preflight.");
    } finally {
      world.documents.set(world.packShield.uuid, world.packShield);
    }
    assert((await validateItemReferences({ name: "No references" })).length === 0, "Items without references were blocked.");
  }));

  await test("summaries count statuses across items", () => withStubWorld(world, async () => {
    const a = itemWith(createReference({ kind: "item", path: "x", query: { name: "Alarm", itemTypes: ["spell"] } }));
    const b = itemWith(createReference({ kind: "item", path: "x", query: { name: "Shield" } }), createReference({ kind: "item", path: "y", query: { uuid: "Item.missing000000001" } }), createReference({ kind: "item", path: "z", query: { name: "Nothing" } }));
    await resolveItemReferences(a); await resolveItemReferences(b);
    const summary = summarizeReferences([a, b]);
    assert(summary.total === 4 && summary.resolved === 1 && summary.ambiguous === 1 && summary.invalid === 1 && summary.unresolved === 1, "Summary counts wrong: " + JSON.stringify(summary));
  }));

  return { results };
}
