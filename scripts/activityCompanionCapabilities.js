/** The strict attachment contract is separate from the companion's version-2 feature envelope. */
// Serialization schema 5 (2026-11) adds ACTIVITY_TELEPORT and condition effects; both importers move together.
export const ACTIVITY_ATTACHMENT_SCHEMA_VERSION = 5;

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
            : "The active 5e Activity Importer must advertise schema 5 Activity and Effect support. Update both importers to compatible versions. The entire inline attachment batch was blocked; core Item imports remain available."
    };
}
