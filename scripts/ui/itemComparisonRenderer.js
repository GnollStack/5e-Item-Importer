/**
 * 5e Item Importer - Comparison Renderer
 * Renders the side-by-side comparison view for imported items.
 */

import { ItemUtils } from "../itemUtils.js";

const esc = (str) => ItemUtils.escapeHtml(str);

/**
 * Render the full comparison view for one or more item comparisons.
 * @param {Array<Object>} comparisons - Array of comparison objects:
 *   { label, diffReport, expectedProps, actualProps }
 * @returns {string} HTML string
 */
export function renderComparisonView(comparisons) {
    let html = `<div class="ii-comparison-view">`;

    // Aggregate stats
    let totalMatches = 0;
    let totalMismatches = 0;
    let totalMissing = 0;
    let totalExtra = 0;

    for (const comp of comparisons) {
        totalMatches += comp.diffReport.matches;
        totalMismatches += comp.diffReport.mismatches.length;
        totalMissing += comp.diffReport.missing.length;
        totalExtra += comp.diffReport.extra.length;
    }

    html += `<div class="ii-comparison-summary">`;
    html += `<div class="ii-comparison-stat match"><i class="fas fa-check-circle"></i> ${totalMatches} Matched</div>`;
    if (totalMismatches > 0) {
        html += `<div class="ii-comparison-stat mismatch"><i class="fas fa-times-circle"></i> ${totalMismatches} Mismatched</div>`;
    }
    if (totalMissing > 0) {
        html += `<div class="ii-comparison-stat missing"><i class="fas fa-question-circle"></i> ${totalMissing} Missing</div>`;
    }
    if (totalExtra > 0) {
        html += `<div class="ii-comparison-stat extra"><i class="fas fa-plus-circle"></i> ${totalExtra} Extra</div>`;
    }
    if (totalMismatches === 0 && totalMissing === 0 && totalExtra === 0) {
        html += `<div class="ii-comparison-stat all-good"><i class="fas fa-thumbs-up"></i> Perfect Match!</div>`;
    }
    html += `</div>`;

    for (const comp of comparisons) {
        if (comparisons.length > 1) {
            html += `<div class="ii-comparison-block-label"><strong>${esc(comp.label)}</strong></div>`;
        }
        html += renderSingleComparison(comp);
    }

    html += `<div class="ii-comparison-actions">
        <button type="button" class="ii-btn-reset" data-action="closeComparison">
            <i class="fas fa-times"></i> Close Comparison
        </button>
    </div>`;

    html += `</div>`;
    return html;
}

/**
 * Render a batch comparison summary (for multi-item imports).
 * Shows per-item match/mismatch counts with expandable details.
 * @param {Array<Object>} comparisons - Array of comparison objects
 * @returns {string} HTML string
 */
export function renderBatchComparisonSummary(comparisons) {
    let html = `<div class="ii-comparison-view">`;

    let totalMatches = 0;
    let totalMismatches = 0;
    let totalMissing = 0;

    for (const comp of comparisons) {
        totalMatches += comp.diffReport.matches;
        totalMismatches += comp.diffReport.mismatches.length;
        totalMissing += comp.diffReport.missing.length;
    }

    html += `<div class="ii-comparison-summary">`;
    html += `<div class="ii-comparison-stat match"><i class="fas fa-check-circle"></i> ${totalMatches} Matched</div>`;
    if (totalMismatches > 0) {
        html += `<div class="ii-comparison-stat mismatch"><i class="fas fa-times-circle"></i> ${totalMismatches} Mismatched</div>`;
    }
    if (totalMissing > 0) {
        html += `<div class="ii-comparison-stat missing"><i class="fas fa-question-circle"></i> ${totalMissing} Missing</div>`;
    }
    if (totalMismatches === 0 && totalMissing === 0) {
        html += `<div class="ii-comparison-stat all-good"><i class="fas fa-thumbs-up"></i> All Items Match!</div>`;
    }
    html += `</div>`;

    html += `<div class="ii-comparison-batch-list">`;
    for (const comp of comparisons) {
        const dr = comp.diffReport;
        const hasIssues = dr.mismatches.length > 0 || dr.missing.length > 0 || dr.extra.length > 0;
        const statusClass = hasIssues ? "has-issues" : "all-match";
        const statusIcon = hasIssues ? "fa-exclamation-triangle" : "fa-check-circle";

        html += `<div class="ii-comparison-batch-item ${statusClass}">
            <div class="ii-comparison-batch-item-header">
                <i class="fas ${statusIcon}"></i>
                <span class="ii-comparison-batch-item-name">${esc(comp.label)}</span>
                <span class="ii-comparison-batch-item-stats">
                    ${dr.matches} match${dr.matches !== 1 ? "es" : ""}${hasIssues ? `, ${dr.mismatches.length + dr.missing.length} issue${dr.mismatches.length + dr.missing.length !== 1 ? "s" : ""}` : ""}
                </span>
            </div>`;

        if (hasIssues) {
            html += `<div class="ii-comparison-batch-item-issues">`;
            for (const m of dr.mismatches) {
                html += `<div class="ii-comparison-issue-compact">
                    <span>${esc(m.label)}:</span> <del>${esc(stripHtml(m.expected))}</del> &rarr; ${esc(stripHtml(m.actual))}
                </div>`;
            }
            for (const m of dr.missing) {
                html += `<div class="ii-comparison-issue-compact">
                    <span>${esc(m.label)}:</span> ${esc(stripHtml(m.expected))} &rarr; <em>(not found)</em>
                </div>`;
            }
            html += `</div>`;
        }

        html += `</div>`;
    }
    html += `</div>`;

    html += `<div class="ii-comparison-actions">
        <button type="button" class="ii-btn-reset" data-action="closeComparison">
            <i class="fas fa-times"></i> Close Comparison
        </button>
    </div>`;

    html += `</div>`;
    return html;
}

/**
 * Render a single comparison (one item).
 */
function renderSingleComparison({ diffReport, expectedProps, actualProps }) {
    let html = "";

    const issues = [...diffReport.mismatches, ...diffReport.missing, ...diffReport.extra];
    if (issues.length > 0) {
        html += `<div class="ii-comparison-issues">`;
        html += `<div class="ii-comparison-issues-header"><i class="fas fa-exclamation-triangle"></i> Discrepancies</div>`;

        for (const m of diffReport.mismatches) {
            html += `<div class="ii-comparison-issue">
                <span class="ii-comparison-issue-label">${esc(m.section)} &rsaquo; ${esc(m.label)}</span>
                <span class="ii-comparison-issue-expected">${esc(stripHtml(m.expected))}</span>
                <span class="ii-comparison-issue-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="ii-comparison-issue-actual">${esc(stripHtml(m.actual))}</span>
            </div>`;
        }
        for (const m of diffReport.missing) {
            html += `<div class="ii-comparison-issue">
                <span class="ii-comparison-issue-label">${esc(m.section)} &rsaquo; ${esc(m.label)}</span>
                <span class="ii-comparison-issue-expected">${esc(stripHtml(m.expected))}</span>
                <span class="ii-comparison-issue-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="ii-comparison-issue-actual ii-comparison-missing-value">(not found)</span>
            </div>`;
        }
        for (const m of diffReport.extra) {
            html += `<div class="ii-comparison-issue">
                <span class="ii-comparison-issue-label">${esc(m.section)} &rsaquo; ${esc(m.label)}</span>
                <span class="ii-comparison-issue-expected ii-comparison-missing-value">(not in template)</span>
                <span class="ii-comparison-issue-arrow"><i class="fas fa-arrow-right"></i></span>
                <span class="ii-comparison-issue-actual">${esc(stripHtml(m.actual))}</span>
            </div>`;
        }
        html += `</div>`;
    }

    const diffMap = buildDiffMap(diffReport);

    html += `<div class="ii-comparison-columns">`;
    html += `<div class="ii-comparison-col expected">
        <h4><i class="fas fa-file-alt"></i> Expected (Template)</h4>
        ${renderPropertyCard(expectedProps, "ii", diffMap)}
    </div>`;
    html += `<div class="ii-comparison-col actual">
        <h4><i class="fas fa-database"></i> Actual (Foundry)</h4>
        ${renderPropertyCard(actualProps, "ii", diffMap)}
    </div>`;
    html += `</div>`;

    return html;
}

/**
 * Build diff map for row highlighting.
 */
function buildDiffMap(diffReport) {
    const map = new Map();
    for (const m of diffReport.mismatches) map.set(`${m.section}|${m.label}`, "mismatch");
    for (const m of diffReport.missing) map.set(`${m.section}|${m.label}`, "missing");
    for (const m of diffReport.extra) map.set(`${m.section}|${m.label}`, "extra");
    return map;
}

/**
 * Render a property card from flat property array with diff highlighting.
 */
function renderPropertyCard(properties, prefix, diffMap) {
    if (!properties || properties.length === 0) {
        return `<div class="${prefix}-comparison-card"><em>No properties</em></div>`;
    }

    const sections = new Map();
    for (const prop of properties) {
        if (!sections.has(prop.section)) sections.set(prop.section, []);
        sections.get(prop.section).push(prop);
    }

    let html = `<div class="${prefix}-comparison-card">`;

    for (const [sectionName, props] of sections) {
        if (sectionName === "Header") continue;

        html += `<div class="${prefix}-section">
            <div class="${prefix}-section-header">
                <span class="${prefix}-section-title">${esc(sectionName)}</span>
            </div>
            <div class="${prefix}-section-content">`;

        for (const prop of props) {
            const key = `${prop.section}|${prop.label}`;
            const diffClass = diffMap?.get(key) ? ` ${diffMap.get(key)}` : "";
            html += `<div class="${prefix}-section-row${diffClass}">
                <span class="${prefix}-row-label">${esc(prop.label)}</span>
                <span class="${prefix}-row-value">${esc(prop.value)}</span>
            </div>`;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    return html;
}

/**
 * Strip HTML for issue display.
 */
function stripHtml(val) {
    if (val === null || val === undefined) return "";
    return String(val).replace(/<[^>]+>/g, "").trim();
}
