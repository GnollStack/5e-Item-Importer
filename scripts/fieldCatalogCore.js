/**
 * Read-only native schema discovery shared by both importers.
 * Keep this file byte-identical in the two independent module packages.
 * Runtime handles deliberately remain outside the serializable catalog.
 */
export function fieldCatalogId(kind, type, path, variant = "") {
    return [kind, type, variant, path].map(value => encodeURIComponent(String(value))).join("/");
}

/** Preserve unsupported metadata explicitly; never stringify arbitrary runtime objects. */
export function toCatalogValue(value, seen = new WeakSet(), depth = 0) {
    if (value === undefined) return { kind: "undefined" };
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : { kind: "non-finite-number", value: String(value) };
    if (typeof value === "bigint") return { kind: "bigint", value: String(value) };
    if (typeof value === "function") return { kind: "function", name: value.name || "(anonymous)" };
    if (typeof value === "symbol") return { kind: "symbol", description: value.description ?? "" };
    if (depth > 20) return { kind: "unresolved", reason: "metadata-depth-limit" };
    if (seen.has(value)) return { kind: "unresolved", reason: "cyclic-metadata" };
    seen.add(value);
    let result;
    if (Array.isArray(value)) result = Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)
        ? toCatalogValue(value[index], seen, depth + 1) : { kind: "array-hole" });
    else if (value instanceof Set) result = { kind: "set", values: Array.from(value, entry => toCatalogValue(entry, seen, depth + 1)) };
    else if (value instanceof Map) result = { kind: "map", entries: Array.from(value, ([key, entry]) => [toCatalogValue(key, seen, depth + 1), toCatalogValue(entry, seen, depth + 1)]) };
    else if (value instanceof RegExp) result = { kind: "regexp", source: value.source, flags: value.flags };
    else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
        result = {};
        for (const key of Object.keys(value).sort()) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            Object.defineProperty(result, key, { enumerable: true, configurable: true, writable: true,
                value: Object.hasOwn(descriptor, "value") ? toCatalogValue(descriptor.value, seen, depth + 1)
                    : { kind: "unresolved", reason: "accessor-not-evaluated" } });
        }
    } else result = { kind: "unresolved", reason: "non-data-metadata", className: value.constructor?.name || "unknown" };
    seen.delete(value);
    return result;
}

export function collectCatalogEnvironment(provider) {
    const game = globalThis.game;
    const modules = game?.modules;
    const list = modules?.values ? Array.from(modules.values()) : [];
    const rules = globalThis.dnd5e?.settings?.rulesVersion;
    return {
        provider,
        foundryVersion: String(game?.version ?? game?.release?.version ?? ""),
        systemId: String(game?.system?.id ?? ""),
        systemVersion: String(game?.system?.version ?? ""),
        language: String(game?.i18n?.lang ?? ""),
        rulesVersion: typeof rules === "string" ? rules : null,
        activeModules: list.filter(entry => entry?.active).map(entry => ({
            id: String(entry.id), version: String(entry.version ?? "")
        })).sort((a, b) => a.id.localeCompare(b.id)),
        modelOverrides: [],
        choiceProvenance: "Schema callbacks and CONFIG-derived choices may use installed-world configuration."
    };
}

export function createCatalogAccumulator(provider) {
    return { types: [], fields: [], diagnostics: [], environment: collectCatalogEnvironment(provider),
        handles: new Map(), _typeIds: new Set(), _fieldIds: new Set() };
}

export function addCatalogDiagnostic(acc, code, message, details = {}) {
    acc.diagnostics.push({ severity: "warning", code, message, ...details });
}

export function isFieldKind(field, name) {
    let prototype = field;
    while (prototype) {
        if (prototype.constructor?.name === name) return true;
        prototype = Object.getPrototypeOf(prototype);
    }
    const cls = globalThis.foundry?.data?.fields?.[name];
    return typeof cls === "function" && field instanceof cls;
}

export function isModelSubclass(model, base) {
    return typeof model === "function" && typeof base === "function"
        && model !== base && model.prototype instanceof base;
}

function readChoices(field) {
    const choices = field.choices;
    if (typeof choices === "function") return { status: "dynamic", callback: choices.name || "(anonymous)", evaluated: false };
    if (choices === undefined || choices === null) return { status: "not-declared" };
    if (Array.isArray(choices) || choices instanceof Set) return {
        status: "declared", values: Array.from(choices, value => ({ value: toCatalogValue(value) }))
    };
    if (typeof choices === "object") return {
        status: "declared",
        values: Object.keys(choices).sort().map(value => {
            const descriptor = Object.getOwnPropertyDescriptor(choices, value);
            const entry = descriptor?.value;
            const label = typeof entry === "string" ? entry
                : entry && typeof entry.label === "string" ? entry.label : null;
            const numericKey = isFieldKind(field, "NumberField") && String(Number(value)) === value;
            return { value: numericKey ? Number(value) : value, key: value, ...(label === null ? {} : { label }),
                ...(typeof entry === "function" ? { modelClass: entry.name } : {}) };
        })
    };
    return { status: "unresolved", reason: "unsupported-choices-container" };
}

function describeDefault(field) {
    const initial = field.initial;
    if (typeof initial === "function") return { kind: "dynamic", callback: initial.name || "(anonymous)", evaluated: false };
    if (initial !== undefined) return { kind: "literal", value: toCatalogValue(initial) };
    return { kind: "implicit", evaluated: false, note: "No explicit initial value; field cleaning may supply an implicit default." };
}

function describeConstraints(field) {
    const result = {};
    for (const name of ["min", "max", "step", "integer", "positive", "blank", "trim", "textSearch",
        "deterministic", "serializable", "categories", "base64", "wildcard", "relative", "idOnly",
        "initialKeys", "initialKeysOnly", "expandKeys", "validateKey"]) {
        const value = field[name] !== undefined ? field[name] : field.options?.[name];
        if (value !== undefined) result[name] = toCatalogValue(value);
    }
    if (isFieldKind(field, "FormulaField")) {
        result.formula = true;
        result.deterministic = Boolean(field.options?.deterministic ?? field.deterministic);
        result.formulaContext = "Native syntax validation does not establish that referenced roll-data variables exist.";
    }
    if (isFieldKind(field, "DocumentIdField")) result.documentId = { validator: "native-document-id" };
    if (isFieldKind(field, "ForeignDocumentField")) result.documentReference = true;
    if (isFieldKind(field, "DocumentUUIDField")) result.uuidReference = true;
    return result;
}

function describeValidation(field, model) {
    let owner = Object.getPrototypeOf(field);
    while (owner && !Object.hasOwn(owner, "_validateType")) owner = Object.getPrototypeOf(owner);
    return {
        custom: typeof field.options?.validate === "function",
        customCallback: typeof field.options?.validate === "function" ? field.options.validate.name || "(anonymous)" : null,
        typeValidatorOwner: owner?.constructor?.name ?? null,
        modelClass: model?.name ?? null,
        schemaAcceptanceIsGameplaySupport: false
    };
}

function pathText(segments) {
    return segments.reduce((text, segment) => segment === "*" ? text + "[*]"
        : segment === "{key}" ? text + ".{key}"
            : /[.\[\]]/.test(segment) ? text + "[" + JSON.stringify(segment) + "]"
                : text ? text + "." + segment : segment, "");
}

function finiteMappingKeys(field) {
    const initialKeys = field.initialKeys;
    if (initialKeys === undefined || initialKeys === null) return [];
    if (Array.isArray(initialKeys) && initialKeys.every(key => typeof key === "string"
        || typeof key === "number" && Number.isFinite(key))) return Array.from(new Set(initialKeys.map(String))).sort();
    if (initialKeys && typeof initialKeys === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(initialKeys))) {
        return Object.keys(initialKeys).sort();
    }
    return null;
}

function addType(acc, spec) {
    const key = spec.kind + "/" + spec.type;
    if (acc._typeIds.has(key)) return;
    acc._typeIds.add(key);
    acc.types.push({
        kind: spec.kind, type: spec.type, label: spec.label ?? spec.type,
        modelClass: spec.typeModel?.name ?? spec.model?.name ?? null,
        importSupport: spec.importSupport ?? "catalog-only", source: spec.typeSource ?? spec.source ?? null,
        ...(spec.typeDetails ?? {})
    });
    if (spec.activeModel && spec.activeModel !== (spec.typeModel ?? spec.model)) {
        acc.environment.modelOverrides.push({ kind: spec.kind, type: spec.type,
            nativeModel: (spec.typeModel ?? spec.model)?.name ?? null, activeModel: spec.activeModel.name ?? "unknown" });
    }
}

/**
 * Append one known model root. prefixes are display/document paths, while
 * handle.pathSegments remains relative to handle.model and handle.rootSchema.
 * adapter(field, context) may describe references or explicitly known variants.
 */
export function addCatalogModel(acc, spec) {
    addType(acc, spec);
    let schema;
    try { schema = spec.schema ?? spec.model?.schema; }
    catch (error) {
        addCatalogDiagnostic(acc, "schema-unavailable", error.message, { kind: spec.kind, type: spec.type });
        return;
    }
    if (!schema?.fields) {
        addCatalogDiagnostic(acc, "schema-unavailable", "Native model does not expose schema fields.", { kind: spec.kind, type: spec.type });
        return;
    }
    const additionalModelSchemas = (spec.additionalModels ?? []).map(entry => {
        let additionalSchema = null;
        try { additionalSchema = entry.schema ?? entry.model?.schema ?? null; }
        catch (error) { addCatalogDiagnostic(acc, "additional-schema-unavailable", error.message,
            { kind: spec.kind, type: spec.type, prefix: entry.prefix }); }
        return { prefix: entry.prefix, model: entry.model ?? null, schema: additionalSchema };
    });
    const prefix = spec.prefix ? spec.prefix.split(".") : [];
    const visit = (field, relative, variant = spec.variant ?? "", ancestry = new Set(), state = {}) => {
        const fullSegments = [...prefix, ...relative];
        const path = pathText(fullSegments);
        const id = fieldCatalogId(spec.kind, spec.type, path, variant);
        if (acc._fieldIds.has(id)) return;
        acc._fieldIds.add(id);
        const record = {
            id, kind: spec.kind, type: spec.type, path, variant,
            fieldClass: field.constructor?.name ?? "unknown",
            classification: field.persisted === false ? "non-persisted" : "stored",
            storage: { persisted: field.persisted !== false, required: Boolean(field.required),
                nullable: Boolean(field.nullable), readonly: Boolean(field.readonly ?? field.options?.readOnly),
                gmOnly: Boolean(field.gmOnly) },
            constraints: describeConstraints(field), default: describeDefault(field),
            declaredOptions: toCatalogValue(field.options ?? {}),
            schemaChoices: readChoices(field), validation: describeValidation(field, spec.model),
            structure: { kind: "scalar", complete: true },
            provenance: { source: spec.source ?? null, schema: spec.model?.name ?? null,
                native: true, options: "Runtime schema metadata; callbacks were not evaluated." }
        };
        if (typeof field.label === "string" && field.label) record.label = field.label;
        if (typeof field.hint === "string" && field.hint) record.hint = field.hint;
        if (fullSegments.includes("flags") || fullSegments.includes("_stats") || fullSegments[0] === "ownership") record.classification = "metadata";
        if (isFieldKind(field, "ForeignDocumentField") || isFieldKind(field, "DocumentUUIDField")) record.classification = "relationship";
        const contextual = relative.includes("*") || relative.includes("{key}") || Boolean(variant) || Boolean(state.contextRequired);
        const handle = {
            field, model: state.model ?? spec.model ?? null, rootSchema: state.rootSchema ?? schema,
            pathSegments: state.pathSegments ?? relative.slice(), documentPathSegments: fullSegments,
            modelPath: pathText(state.pathSegments ?? relative), kind: spec.kind, type: spec.type, path, variant,
            contextSourcePrefix: state.contextSourcePrefix ?? spec.prefix ?? "",
            contextRequired: contextual,
            additionalModelSchemas,
            ...(state.selector ? { selector: state.selector } : {})
        };
        acc.fields.push(record);
        acc.handles.set(id, handle);
        if (containsUnresolvedMetadata(record.declaredOptions) || containsUnresolvedMetadata(record.default)) {
            addCatalogDiagnostic(acc, "unresolved-field-metadata", "Some field metadata could not be represented without evaluating runtime objects.", { fieldId: id });
        }
        if (ancestry.has(field) || relative.length > 40) {
            record.classification = "unresolved";
            handle.contextRequired = true;
            record.structure = { kind: "unresolved", complete: false, reason: "recursive-schema-boundary" };
            addCatalogDiagnostic(acc, "recursive-schema-boundary", "Recursion stopped at a cyclic or excessively deep schema.", { fieldId: id });
            return;
        }
        const nextAncestry = new Set(ancestry).add(field);
        let adapted;
        try { adapted = spec.adapter?.(field, { record, handle, relative, path, variant, schema, model: spec.model }); }
        catch (error) {
            adapted = { structure: { kind: "unresolved", complete: false, reason: error.message } };
            addCatalogDiagnostic(acc, "field-adapter-failed", error.message, { fieldId: id });
        }
        if (adapted) {
            if (adapted.structure) record.structure = adapted.structure;
            if (adapted.classification) record.classification = adapted.classification;
            if (adapted.default) record.default = adapted.default;
            if (adapted.constraints) Object.assign(record.constraints, adapted.constraints);
            if (adapted.contextRequired) handle.contextRequired = true;
            if (record.structure.complete === false) {
                handle.contextRequired = true;
                addCatalogDiagnostic(acc, "unresolved-native-field",
                    record.structure.reason ?? "Native field adapter is incomplete.", { fieldId: id });
            }
            for (const child of adapted.children ?? []) {
                visit(child.field, [...relative, ...(child.segments ?? [])], child.variant ?? variant, nextAncestry, {
                    ...state, ...(child.state ?? {})
                });
            }
            if (adapted.stop !== false) return;
        }
        if (isFieldKind(field, "EmbeddedCollectionField") || isFieldKind(field, "EmbeddedDocumentField")) {
            record.classification = "relationship";
            record.structure = { kind: "embedded-documents", complete: true,
                documentClass: field.model?.name ?? field.documentClass?.name ?? null,
                reference: fullSegments.at(-1) === "effects" ? { kind: "effect" } : null };
        } else if (field.fields && typeof field.fields === "object") {
            record.structure = { kind: "schema", complete: true, keys: Object.keys(field.fields).sort() };
            for (const name of record.structure.keys) visit(field.fields[name], [...relative, name], variant, nextAncestry, state);
        } else if (isFieldKind(field, "TypedSchemaField")) {
            record.structure = { kind: "variant", complete: true, discriminator: "type", variants: Object.keys(field.types ?? {}).sort() };
            for (const [key, child] of Object.entries(field.types ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
                const childVariant = [variant, path + ".type=" + key].filter(Boolean).join(";");
                for (const [name, nested] of Object.entries(child.fields ?? {})) visit(nested, [...relative, name], childVariant, nextAncestry, { ...state, contextRequired: true });
            }
        } else if (field.element) {
            const mapping = isFieldKind(field, "TypedObjectField");
            record.structure = { kind: mapping ? "mapping" : isFieldKind(field, "SetField") ? "set" : "array", complete: true };
            if (mapping && field.initialKeysOnly === true) {
                const keys = finiteMappingKeys(field);
                if (keys === null) {
                    record.classification = "unresolved";
                    handle.contextRequired = true;
                    record.structure = { kind: "mapping", complete: false, initializedKeysOnly: true,
                        reason: "Closed mapping keys are dynamic or are not a supported finite declaration." };
                    addCatalogDiagnostic(acc, "unresolved-mapping-keys", record.structure.reason, { fieldId: id });
                } else {
                    Object.assign(record.structure, { keys, initializedKeysOnly: true, keySource: "initialKeys",
                        keyProvenance: "installed schema/current configuration", keyRestrictionPhase: "initialization",
                        sourceKeyConstraint: "initialKeysOnly does not itself reject additional stored source keys.",
                        valueFieldClass: field.element.constructor?.name ?? "unknown" });
                    for (const key of keys) visit(field.element, [...relative, key], variant, nextAncestry, state);
                    visit(field.element, [...relative, "{key}"], variant, nextAncestry, state);
                }
            } else visit(field.element, [...relative, mapping ? "{key}" : "*"], variant, nextAncestry, state);
        } else if (isFieldKind(field, "ObjectField") || isFieldKind(field, "AnyField")) {
            const knownOpen = ["ObjectField", "AnyField", "DocumentOwnershipField"].includes(record.fieldClass);
            record.structure = { kind: knownOpen ? isFieldKind(field, "AnyField") ? "any-value" : "open-object" : "unresolved", complete: knownOpen,
                reason: knownOpen ? "No finite child schema is declared." : "Custom object field requires an explicit adapter." };
            if (!knownOpen) {
                record.classification = "unresolved";
                handle.contextRequired = true;
                addCatalogDiagnostic(acc, "unresolved-custom-field", record.structure.reason, { fieldId: id, fieldClass: record.fieldClass });
            }
        } else if (field.constructor?.recursive) {
            record.classification = "unresolved";
            handle.contextRequired = true;
            record.structure = { kind: "unresolved", complete: false, reason: "Recursive custom field has no recognized child schema." };
            addCatalogDiagnostic(acc, "unresolved-custom-field", record.structure.reason, { fieldId: id, fieldClass: record.fieldClass });
        } else if (!["StringField", "NumberField", "BooleanField"].some(name => isFieldKind(field, name))) {
            record.classification = "unresolved";
            handle.contextRequired = true;
            record.structure = { kind: "unresolved", complete: false, reason: "Custom field has no recognized scalar or structural adapter." };
            addCatalogDiagnostic(acc, "unresolved-custom-field", record.structure.reason, { fieldId: id, fieldClass: record.fieldClass });
        }
        if (record.schemaChoices.status === "unresolved") addCatalogDiagnostic(acc, "unresolved-choices", record.schemaChoices.reason, { fieldId: id });
    };
    for (const name of Object.keys(schema.fields).sort()) {
        if (!(spec.skipFields ?? []).includes(name)) visit(schema.fields[name], [name]);
    }
}

export function finishCatalog(acc) {
    const compare = (a, b) => a.id.localeCompare(b.id);
    acc.fields.sort(compare);
    acc.types.sort((a, b) => (a.kind + "/" + a.type).localeCompare(b.kind + "/" + b.type));
    acc.diagnostics.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    acc.environment.modelOverrides.sort((a, b) => (a.kind + "/" + a.type).localeCompare(b.kind + "/" + b.type));
    return { types: acc.types, fields: acc.fields, diagnostics: acc.diagnostics,
        environment: acc.environment, handles: acc.handles };
}

function containsUnresolvedMetadata(value) {
    if (!value || typeof value !== "object") return false;
    if (value.kind === "unresolved" && typeof value.reason === "string") return true;
    return Object.values(value).some(containsUnresolvedMetadata);
}
