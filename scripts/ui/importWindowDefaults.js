/** Only the preferences exposed by Import options; source, destinations and stored content are excluded. */
export const IMPORT_OPTION_SETTINGS = Object.freeze({
    ai: Object.freeze({ autoParse: "ai-auto-parse-checkbox" }),
    ii: Object.freeze({
        autoParse: "ii-auto-parse-checkbox",
        useSemanticIcons: "ii-setting-semantic",
        createIdentified: "ii-setting-identified",
        matchIcons: "ii-setting-match-icons",
        compendiumImageMode: "ii-icon-mode"
    })
});

/** Read registered defaults so this control tracks future changes to module defaults. */
export async function restoreImportSettingDefaults(moduleId, prefix, settings = game.settings) {
    const entries = Object.keys(IMPORT_OPTION_SETTINGS[prefix]).map(key => {
        const definition = settings.settings.get(`${moduleId}.${key}`);
        if (!definition || definition.scope !== "client") throw new Error(`Missing client setting: ${moduleId}.${key}`);
        return { key, value: definition.default, previous: settings.get(moduleId, key) };
    });
    const applied = [];
    try {
        for (const entry of entries) {
            if (entry.previous === entry.value) continue;
            await settings.set(moduleId, entry.key, entry.value);
            applied.push(entry);
        }
    } catch (error) {
        const rollback = await Promise.allSettled(applied.map(entry => settings.set(moduleId, entry.key, entry.previous)));
        if (rollback.some(result => result.status === "rejected")) {
            throw new Error(`Could not restore every option after a settings error. Review Import options. ${error.message}`);
        }
        throw error;
    }
    return Object.fromEntries(entries.map(entry => [entry.key, entry.value]));
}

/** Bind without re-rendering the form, preserving destination and unsubmitted drafts. */
export function bindImportWindowDefaults(app, { moduleId, prefix, parse }) {
    const root = app.element;
    const button = root.querySelector("[data-import-defaults]");
    if (!button) return;
    button.addEventListener("click", async () => {
        if (app.importInProgress || app.comparisonActive || button.disabled) return;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const input = root.querySelector(`#${prefix}-input`);
        const source = input?.value;
        const editor = root.querySelector("#ii-normalized-input");
        const editedYaml = editor && editor.value !== app.normalizedText ? editor.value : null;
        try {
            const defaults = await restoreImportSettingDefaults(moduleId, prefix);
            if (app.element !== root || !root.isConnected) return;
            // Stop any parse queued with the old preferences before refreshing the preview once.
            for (const timer of ["parseTimeout", "parseStateTimeout", "stateTimeout"]) {
                if (app[timer]) clearTimeout(app[timer]);
                app[timer] = null;
            }
            if (prefix === "ii") app.parseGeneration++;
            if (prefix === "ai" && app.builderAutoParse !== null) app.builderAutoParse = defaults.autoParse;
            for (const [key, id] of Object.entries(IMPORT_OPTION_SETTINGS[prefix])) {
                const control = root.querySelector(`#${id}`);
                if (!control) continue;
                if (control.type === "checkbox") control.checked = defaults[key];
                else control.value = defaults[key];
            }
            const compare = root.querySelector(`#${prefix}-compare-checkbox`);
            if (compare) compare.checked = false;
            const suggest = root.querySelector("#ii-suggest-automation");
            if (suggest) suggest.checked = false;
            const seed = root.querySelector("#ii-icon-seed");
            if (seed) seed.value = "";
            const animations = root.querySelector("#ii-use-autoanimations");
            if (animations) animations.checked = !animations.disabled && animations.defaultChecked;
            app.viewLayout.reset();
            app._refreshViewSummaries?.();
            // Activity's only import option is auto-parse; its current reference edits remain valid.
            if (prefix === "ii" && input?.value.trim()) await parse();
            if (editedYaml !== null && app.element === root && input?.value === source && editor.value === app.normalizedText) editor.value = editedYaml;
            ui.notifications.info("Import and view options restored to defaults.");
        } catch (error) {
            ui.notifications.error(`Could not restore import options: ${error.message}`);
        } finally {
            button.disabled = false;
            button.removeAttribute("aria-busy");
        }
    }, { signal: app.viewLayout.controller.signal });
}
