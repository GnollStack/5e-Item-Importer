/** The strict attachment contract is separate from the companion's version-2 feature envelope. */
// Serialization schema 5 (2026-11) added ACTIVITY_TELEPORT and condition effects. Schema 6 (dnd5e 6.1) adds an
// enchantment effect's own rider lists and the antimagic area behavior; both importers move together.
export const ACTIVITY_ATTACHMENT_SCHEMA_VERSION = 6;

export function getActivitySchemaCompatibility(api) {
    const serialization = api?.capabilities?.serialization;
    const activitySchemaVersion = serialization?.strictActivity?.schemaVersion ?? null;
    const effectSchemaVersion = serialization?.strictEffect?.schemaVersion ?? null;
    const compatible = activitySchemaVersion === ACTIVITY_ATTACHMENT_SCHEMA_VERSION
        && effectSchemaVersion === ACTIVITY_ATTACHMENT_SCHEMA_VERSION;
    return {
        compatible,
        activitySchemaVersion,
        effectSchemaVersion,
        reason: compatible ? null
            : "The active 5e Activity Importer must advertise schema 6 Activity and Effect support. Update both importers to compatible versions. The entire inline attachment batch was blocked; core Item imports remain available."
    };
}
