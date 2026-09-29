/** Item-only MIDI coverage. Activity/effect support belongs to the optional companion. */
export function decorateMidiCatalogFields(fields) {
    return fields.map(field => {
        const status = field.layer === "extensions" ? "needs-review" : field.storage?.persisted === false ? "excluded" : "unsupported";
        return { ...field, coverage: { owner: "5e-item-importer", status, gap: status !== "excluded",
            yamlLocations: [], aliases: [], acceptedRepresentations: [], conversions: [], conditions: [],
            stages: Object.fromEntries(["parse", "build", "export", "template", "preview", "comparison"].map(stage => [stage, status])),
            evidence: [], references: ["scripts/strictItemParsers/yamlItemParser.js", "scripts/itemData.js", "scripts/itemYamlExporter.js"],
            reason: status === "excluded" ? "Derived MIDI state is not an authored YAML setting."
                : status === "needs-review" ? "Active extension ownership and coverage are unresolved."
                    : "Item Importer has no declared item-specific MIDI flag mapping. Inline activities/effects are owned by Activity Importer when available; Item parsing remains independent." } };
    });
}
