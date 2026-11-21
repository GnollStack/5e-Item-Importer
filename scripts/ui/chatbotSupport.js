/**
 * Chatbot support for both import windows: the Importer LLM Pack link for this release, the
 * "Copy problems" text a user pastes back into the chat that wrote the YAML, and the notice for
 * MIDI-QOL settings left out because MIDI-QOL cannot store them in this world.
 *
 * Shared file: keep it byte-identical in 5e Item Importer and 5e Activity Importer
 * (`node tools/Field-Catalog.mjs --check-parity <sibling>`). Plain functions without Foundry
 * imports, so the Node tests can run them; the `game` argument defaults to the global.
 */

/** The pack this release teaches. tools/Test-LlmPack.mjs checks it against llm-pack/pack.json. */
export const LLM_PACK_VERSION = "14.5.0";
export const LLM_PACK_URL = "https://github.com/GnollStack/bakshis-bazaar-archives/tree/main/importer-llm-pack/" + LLM_PACK_VERSION;

const MODULES = [["5e-item-importer", "5e Item Importer"], ["5e-activity-importer", "5e Activity Importer"]];

/** -1, 0 or 1 for two dotted version strings ("6.1.0" against "6.0.999"). */
export function compareVersions(left, right) {
    const a = String(left ?? "").split(/[.-]/).map(part => Number.parseInt(part, 10) || 0);
    const b = String(right ?? "").split(/[.-]/).map(part => Number.parseInt(part, 10) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference) return Math.sign(difference);
    }
    return 0;
}

/**
 * MIDI-QOL in this world: `active`, `missing` (not installed), `inactive` (installed and able to
 * run here, but not enabled) or `unsupported` (installed, but its manifest excludes this system
 * version, as MIDI-QOL 14.6.x does for dnd5e 6.1 and 14.7.0 for dnd5e 6.0). Foundry itself does not flag the last case.
 */
export function midiQolState(game = globalThis.game) {
    const module = game?.modules?.get?.("midi-qol");
    const system = game?.system ?? {};
    const base = { version: module?.version ?? "", systemVersion: system.version ?? "" };
    if (!module) return { state: "missing", ...base };
    if (module.active) return { state: "active", ...base };
    const requirement = [...(module.relationships?.systems ?? [])].find(entry => entry?.id === system.id);
    const { minimum, maximum } = requirement?.compatibility ?? {};
    const excluded = !!system.version && ((maximum && compareVersions(system.version, maximum) > 0)
        || (minimum && compareVersions(minimum, system.version) > 0));
    return { state: excluded ? "unsupported" : "inactive", ...base, minimum: minimum ?? null, maximum: maximum ?? null };
}

/** Parse results whose MIDI-QOL activity fields were left out: `[{ name, fields }]`. */
export function skippedMidiSettings(results) {
    return (Array.isArray(results) ? results : [])
        .filter(result => Array.isArray(result?.skippedMidiFields) && result.skippedMidiFields.length)
        .map(result => ({ name: result.activityData?.name || result.activityType || "Activity", fields: [...result.skippedMidiFields] }));
}

/**
 * The one notice for skipped MIDI-QOL settings, as two plain-text lines: what is left out, and a
 * short hint that MIDI-QOL gives the fullest automation. The hint never asks the user to enable
 * MIDI-QOL where it cannot run. Null when nothing was skipped.
 */
export function midiSkippedNotice(entries, state = midiQolState()) {
    if (!Array.isArray(entries) || !entries.length) return null;
    const count = entries.reduce((sum, entry) => sum + entry.fields.length, 0);
    const reason = {
        missing: "MIDI-QOL is not installed",
        inactive: "MIDI-QOL is not active in this world",
        unsupported: `MIDI-QOL ${state.version} does not run on dnd5e ${state.systemVersion}`
    }[state.state] ?? "MIDI-QOL is not active";
    const list = entries.map(entry => `${entry.name} (${entry.fields.join(", ")})`).join("; ");
    const summary = `${reason}, so ${count} MIDI-QOL setting${count === 1 ? "" : "s"} will be left out: ${list}. Everything else imports as written.`;
    const hint = {
        inactive: "MIDI-QOL gives Items their fullest automation: enable it and import the YAML again to add these settings.",
        unsupported: "MIDI-QOL gives Items their fullest automation where it runs: import the YAML again in a world where it is active to add these settings.",
        missing: "MIDI-QOL, a separate module, gives Items their fullest automation: import the YAML again in a world where it is active to add these settings."
    }[state.state] ?? "MIDI-QOL gives Items their fullest automation.";
    return { summary, hint };
}

/** One line naming the pack, both importers, dnd5e and MIDI-QOL, for the chatbot. */
export function setupLine(game = globalThis.game) {
    const parts = ["Importer LLM Pack " + LLM_PACK_VERSION];
    for (const [id, title] of MODULES) {
        const module = game?.modules?.get?.(id);
        parts.push(module?.active ? `${title} ${module.version}` : `${title} not active`);
    }
    if (game?.system?.id) parts.push(`${game.system.id} ${game.system.version}`);
    const midi = midiQolState(game);
    parts.push({
        active: `MIDI-QOL ${midi.version} active`,
        missing: "MIDI-QOL not installed",
        inactive: "MIDI-QOL not active",
        unsupported: `MIDI-QOL ${midi.version} cannot run on this dnd5e version`
    }[midi.state]);
    return parts.join("; ");
}

/**
 * Collect the messages of Activity Importer parse results as `{ level, text }`. A batch of more
 * than one block names each block. Embedded effects report through their activity.
 */
export function parseResultProblems(results, prefix = "") {
    const list = Array.isArray(results) ? results : [];
    const problems = [];
    list.forEach((result, index) => {
        const label = list.length > 1
            ? (result?.activityData?.name || result?.effectData?.name || result?.activityType || `Block ${index + 1}`) + ": "
            : "";
        const add = (level, messages, extra = "") => {
            for (const message of Array.isArray(messages) ? messages : []) {
                const text = String(message?.message ?? message ?? "").trim();
                if (text) problems.push({ level, text: prefix + label + extra + text });
            }
        };
        add("error", result?.errors);
        add("warning", result?.warnings);
        for (const embedded of result?.embeddedEffectResults ?? []) {
            const name = embedded?.effectData?.name ? embedded.effectData.name + ": " : "";
            add("error", embedded?.errors, name);
            add("warning", embedded?.warnings, name);
        }
    });
    return problems;
}

/** Drop repeated messages (same level and text, ignoring spacing and case). */
export function uniqueProblems(problems) {
    const seen = new Set();
    return (Array.isArray(problems) ? problems : []).filter(problem => {
        const key = problem.level + "|" + String(problem.text).replace(/\s+/g, " ").toLocaleLowerCase();
        if (!problem.text || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** True when the list holds an error or a warning (notes alone are not problems). */
export function hasProblems(problems) {
    return (Array.isArray(problems) ? problems : []).some(problem => problem.level === "error" || problem.level === "warning");
}

/** Copy plain text with Foundry's clipboard helper, or the browser's when it is missing. */
export async function copyPlainText(text, game = globalThis.game) {
    if (typeof game?.clipboard?.copyPlainText === "function") return game.clipboard.copyPlainText(text);
    return globalThis.navigator.clipboard.writeText(text);
}

/**
 * The text for "Copy problems": what the window reported, the setup, and the YAML, in the form
 * the pack's project instructions expect ("fix exactly what they name, answer with the whole YAML").
 */
export function problemsForChat({ windowTitle, problems, yaml, game = globalThis.game }) {
    const list = uniqueProblems(problems);
    const lines = [
        `The ${windowTitle} import window reported these problems with the YAML below. Fix exactly what they name and answer with the whole corrected YAML.`,
        "",
        "Setup: " + setupLine(game)
    ];
    for (const [level, heading] of [["error", "Errors"], ["warning", "Warnings"], ["note", "Notes"]]) {
        const entries = list.filter(problem => problem.level === level);
        if (entries.length) lines.push("", heading + ":", ...entries.map(problem => "- " + problem.text));
    }
    lines.push("", "The YAML:", "```yaml", String(yaml ?? "").trim(), "```");
    return lines.join("\n");
}
