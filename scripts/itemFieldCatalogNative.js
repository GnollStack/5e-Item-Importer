import {
    createCatalogAccumulator, addCatalogModel, addCatalogDiagnostic, finishCatalog,
    isFieldKind, isModelSubclass, toCatalogValue
} from "./fieldCatalogCore.js";

const SUPPORTED_ITEMS = new Set(["weapon", "equipment", "consumable", "tool", "loot", "container", "spell"]);
const KNOWN_ITEMS = {
    background: "BackgroundData", class: "ClassData", consumable: "ConsumableData",
    container: "ContainerData", equipment: "EquipmentData", facility: "FacilityData",
    feat: "FeatData", loot: "LootData", race: "RaceData", spell: "SpellData",
    subclass: "SubclassData", tool: "ToolData", weapon: "WeaponData"
};

function exportedModel(namespace, type, registry, fallback) {
    const preferred = namespace?.[fallback];
    if (typeof preferred === "function") return preferred;
    const active = registry?.[type];
    return Object.values(namespace ?? {}).find(model => typeof model === "function"
        && (model === active || isModelSubclass(active, model))) ?? null;
}

function advancementTypes(system) {
    const base = system?.documents?.advancement?.Advancement;
    return Object.entries(system?.documents?.advancement ?? {})
        .filter(([, model]) => isModelSubclass(model, base))
        .map(([exportName, model]) => ({ exportName, model, type: model.typeName }))
        .filter(entry => typeof entry.type === "string" && entry.type)
        .sort((a, b) => a.type.localeCompare(b.type));
}

function references(kind, types) {
    return { structure: { kind: "catalog-reference", complete: types.length > 0,
        references: types.map(type => ({ kind, type })) }, contextRequired: true };
}

function advancementAdapter(system, model) {
    return (field, context) => {
        if (isFieldKind(field, "AdvancementDataField")) {
            const key = context.relative.at(-1);
            const nested = model.metadata?.dataModels?.[key];
            if (nested?.schema?.fields) return {
                structure: { kind: "schema", complete: true, modelClass: nested.name,
                    keys: Object.keys(nested.schema.fields).sort() },
                children: Object.entries(nested.schema.fields).map(([name, child]) => ({ field: child, segments: [name] }))
            };
            const defaults = model.metadata?.defaults?.[key];
            return { structure: { kind: "open-object", complete: true,
                reason: "This advancement declares defaults but no closed child data model." },
                ...(defaults === undefined ? {} : { default: { kind: "literal", value: toCatalogValue(defaults) } }) };
        }
        if (isFieldKind(field, "ScaleValueEntryField")) {
            const types = system?.dataModels?.advancement?.scaleValue?.TYPES;
            if (!types || !Object.keys(types).length) return {
                classification: "unresolved", structure: { kind: "unresolved", complete: false,
                    reason: "Native scale-value variant models are unavailable." }
            };
            return {
                structure: { kind: "variant", complete: true, discriminator: "configuration.type",
                    variants: Object.keys(types).sort() },
                contextRequired: true,
                children: Object.entries(types).sort(([a], [b]) => a.localeCompare(b)).flatMap(([type, nested]) =>
                    Object.entries(nested.schema?.fields ?? {}).map(([name, child]) => ({
                        field: child, segments: [name], variant: "configuration.type=" + type
                    })))
            };
        }
        return null;
    };
}

/** Discover all native Item types plus their native advancement variants. No world documents are read. */
export function discoverNativeCatalog() {
    const acc = createCatalogAccumulator("5e-item-importer");
    const system = globalThis.dnd5e;
    const namespace = system?.dataModels?.item;
    const registry = globalThis.CONFIG?.Item?.dataModels ?? {};
    const manifest = globalThis.game?.system?._source?.documentTypes?.Item
        ?? globalThis.game?.system?.documentTypes?.Item;
    const declaredTypes = manifest && typeof manifest === "object" ? Object.keys(manifest) : Object.keys(KNOWN_ITEMS);
    // 5.3.3 retains this manifest entry for migration but excludes it from Item creation.
    // A new registered/exported Backpack model must be investigated instead of being hidden as an alias.
    const legacyBackpack = declaredTypes.includes("backpack") && !namespace?.BackpackData && !registry.backpack;
    const currentTypes = declaredTypes.filter(type => type !== "backpack" || !legacyBackpack);
    acc.environment.nativeTypeAliases = legacyBackpack ? [{ kind: "item", type: "backpack", replacement: "container",
        source: "dnd5e.documents.Item5e._initializeSource", classification: "legacy-alias" }] : [];
    if (legacyBackpack) addCatalogDiagnostic(acc, "legacy-item-type-alias",
        "The manifest retains backpack for migration to container; it is not a separate editable Item type.",
        { severity: "info", kind: "item", type: "backpack", replacement: "container" });
    if (!manifest) addCatalogDiagnostic(acc, "manifest-types-unavailable",
        "Native manifest type metadata is unavailable; the reviewed 5.3.3 type list is being used.");
    const advancements = advancementTypes(system);
    const nativeActivities = Object.values(system?.documents?.activity ?? {})
        .filter(model => typeof model === "function" && typeof model.metadata?.type === "string")
        .map(model => model.metadata.type).sort();
    const baseItem = globalThis.foundry?.documents?.BaseItem ?? system?.documents?.Item5e;
    const nativeEffectTypes = Array.from(new Set([globalThis.CONST?.BASE_DOCUMENT_TYPE ?? "base",
        ...Object.keys(globalThis.game?.system?._source?.documentTypes?.ActiveEffect
            ?? globalThis.game?.system?.documentTypes?.ActiveEffect ?? { enchantment: {} })])).sort();
    for (const type of currentTypes.sort()) {
        const exportName = KNOWN_ITEMS[type] ?? type.charAt(0).toUpperCase() + type.slice(1) + "Data";
        const model = exportedModel(namespace, type, registry, exportName);
        const common = { kind: "item", type, typeModel: model,
            typeSource: { package: "dnd5e", namespace: "dnd5e.dataModels.item", export: model?.name ?? exportName },
            source: { package: "dnd5e", namespace: "dnd5e.dataModels.item", export: model?.name ?? exportName },
            importSupport: SUPPORTED_ITEMS.has(type) ? "supported" : "catalog-only" };
        if (!model) {
            addCatalogModel(acc, { ...common, model: null });
            continue;
        }
        addCatalogModel(acc, { ...common, model: baseItem, activeModel: registry[type],
            additionalModels: [{ prefix: "system", model }],
            source: { package: "foundry", namespace: "foundry.documents", export: "BaseItem" },
            adapter: (field, context) => {
                if (isFieldKind(field, "TypeDataField")) return references("item", [type]);
                if (context.path === "effects" && isFieldKind(field, "EmbeddedCollectionField")) {
                    return { ...references("effect", nativeEffectTypes), classification: "relationship" };
                }
                return null;
            } });
        addCatalogModel(acc, { ...common, model, prefix: "system", adapter: field => {
            if (isFieldKind(field, "ActivityField")) return references("activity", nativeActivities);
            if (isFieldKind(field, "AdvancementField")) return references("advancement", advancements.map(entry => entry.type));
            return null;
        } });
    }
    for (const { type, model, exportName } of advancements) {
        const config = globalThis.CONFIG?.DND5E?.advancementTypes?.[type];
        addCatalogModel(acc, { kind: "advancement", type, model,
            label: model.metadata?.title ?? type,
            source: { package: "dnd5e", namespace: "dnd5e.documents.advancement", export: exportName },
            importSupport: "catalog-only",
            activeModel: config?.documentClass,
            typeDetails: {
                applicableItemTypes: Array.from(config?.validItemTypes ?? model.metadata?.validItemTypes ?? []).sort(),
                applicabilityProvenance: "installed-world configuration",
                nativeTypeId: model.typeName
            },
            adapter: advancementAdapter(system, model) });
    }
    if (!advancements.length) addCatalogDiagnostic(acc, "advancement-types-unavailable",
        "Native advancement exports are unavailable; advancement coverage is incomplete.");
    const baseModel = system?.dataModels?.abstract?.ItemDataModel;
    const resolved = new Set(acc.types.filter(entry => entry.kind === "item").map(entry => entry.modelClass));
    for (const [exportName, model] of Object.entries(namespace ?? {})) {
        if (isModelSubclass(model, baseModel) && !resolved.has(model.name)) addCatalogDiagnostic(acc,
            "unclassified-native-item-export", "Exported Item data model has no manifest type mapping.",
            { exportName, modelClass: model.name });
    }
    for (const type of Object.keys(registry).filter(type => !declaredTypes.includes(type)).sort()) {
        addCatalogDiagnostic(acc, "runtime-item-extension", "Runtime Item type is not declared by the native system manifest.",
            { kind: "item", type, modelClass: registry[type]?.name ?? null });
    }
    for (const type of Object.keys(globalThis.CONFIG?.DND5E?.advancementTypes ?? {})
        .filter(type => !advancements.some(entry => entry.type === type)).sort()) {
        addCatalogDiagnostic(acc, "runtime-advancement-extension", "Runtime advancement has no matching native exported class.", { kind: "advancement", type });
    }
    for (const field of acc.fields.filter(entry => entry.structure.complete === false)) {
        if (!acc.diagnostics.some(entry => entry.fieldId === field.id)) addCatalogDiagnostic(acc,
            "unresolved-native-field", field.structure.reason ?? "Native field adapter is incomplete.", { fieldId: field.id });
    }
    return finishCatalog(acc);
}
