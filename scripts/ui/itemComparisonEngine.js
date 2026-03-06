/**
 * 5e Item Importer - Comparison Engine
 * Compares expected (template) vs actual (Foundry) property arrays to produce a diff report.
 */

/**
 * Strip HTML tags from a string for clean comparison.
 * @param {*} val - Value to clean
 * @returns {string}
 */
function stripHtml(val) {
    if (val === null || val === undefined) return "";
    return String(val)
        .replace(/<[^>]+>/g, "")          // Strip HTML tags
        .replace(/&amp;/g, "&")           // Decode common HTML entities
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\u00A0/g, " ")          // Non-breaking space → space
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width characters
        .replace(/\s+/g, " ")             // Collapse all whitespace
        .trim();
}

/**
 * Compare two flat property arrays and produce a diff report.
 * @param {Array<{section: string, label: string, value: string}>} expected
 * @param {Array<{section: string, label: string, value: string}>} actual
 * @returns {{matches: number, mismatches: Array, missing: Array, extra: Array, total: number}}
 */
export function compareProperties(expected, actual) {
    const report = {
        matches: 0,
        mismatches: [],
        missing: [],
        extra: [],
        total: 0
    };

    // Build lookup from actual
    const actualMap = new Map();
    for (const prop of actual) {
        const key = `${prop.section}|${prop.label}`;
        actualMap.set(key, prop.value);
    }

    const matchedKeys = new Set();

    for (const prop of expected) {
        const key = `${prop.section}|${prop.label}`;
        report.total++;

        if (actualMap.has(key)) {
            matchedKeys.add(key);
            const actualVal = actualMap.get(key);
            const cleanExpected = stripHtml(prop.value);
            const cleanActual = stripHtml(actualVal);

            if (cleanExpected === cleanActual) {
                report.matches++;
            } else {
                report.mismatches.push({
                    section: prop.section,
                    label: prop.label,
                    expected: prop.value,
                    actual: actualVal
                });
            }
        } else {
            report.missing.push({
                section: prop.section,
                label: prop.label,
                expected: prop.value
            });
        }
    }

    // Find extra properties in actual that aren't in expected
    for (const prop of actual) {
        const key = `${prop.section}|${prop.label}`;
        if (!matchedKeys.has(key) && !expected.some(e => `${e.section}|${e.label}` === key)) {
            report.extra.push({
                section: prop.section,
                label: prop.label,
                actual: prop.value
            });
        }
    }

    return report;
}
