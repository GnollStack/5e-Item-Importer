import { IMPORT_OPTION_SETTINGS } from "../ui/importWindowDefaults.js";

/** Gated, document-free UI regression fixture. Restores client preferences and singleton state. */
export async function runImportViewFixtures({ Window, Actions, moduleId, prefix, text, Renderer }) {
    const key = `${moduleId}.view.v1.${game.world.id}.${game.user.id}`;
    const saved = localStorage.getItem(key);
    const singleton = Window.instance;
    const optionSettings = Object.fromEntries(Object.keys(IMPORT_OPTION_SETTINGS[prefix]).map(key => [key, game.settings.get(moduleId, key)]));
    const snapshot = () => JSON.stringify([game.items, game.actors, game.scenes].map(collection => collection.contents.map(doc => doc.toObject())));
    const before = snapshot();
    const checks = [];
    const check = (name, success) => checks.push({ name, success: Boolean(success) });
    const tick = () => new Promise(resolve => setTimeout(resolve, 20));
    const app = new Window({ id: `${prefix}-view-fixture` });
    let measurements;
    try {
        localStorage.removeItem(key);
        await app.render(true);
        const root = app.element;
        const input = root.querySelector(`#${prefix}-input`);
        const output = root.querySelector(`#${prefix}-parse-output`);
        check("Full preview is the default", app.viewLayout.preferences.preview === "full");
        check("Tool panels start closed", [...root.querySelectorAll("[data-view-panel]")].every(panel => !panel.open));
        check("A single View options menu", root.querySelectorAll("[data-view-options]").length === 1);
        const historyPanel = root.querySelector('[data-view-panel="history"]');
        const historyToggle = root.querySelector('[data-view-feature="showHistory"]');
        check("Import History is hidden by default", historyPanel.hidden && !historyToggle.checked);
        const historyMarkup = historyPanel.innerHTML;
        historyToggle.checked = true;
        historyToggle.dispatchEvent(new Event("change", { bubbles: true }));
        check("History opt-in shows the existing history panel", !historyPanel.hidden && historyPanel.open && historyPanel.innerHTML === historyMarkup);
        historyToggle.checked = false;
        historyToggle.dispatchEvent(new Event("change", { bubbles: true }));
        if (prefix === "ii") app._renderHistory();
        else root.dispatchEvent(new CustomEvent("ai:history-changed"));
        check("History stays hidden when its contents refresh", historyPanel.hidden && historyPanel.innerHTML === historyMarkup);
        historyToggle.checked = true;
        historyToggle.dispatchEvent(new Event("change", { bubbles: true }));
        await tick();
        check("History preference persists independently of its entries", JSON.parse(localStorage.getItem(key)).showHistory === true);
        input.value = text;
        await Actions.parse.call(app);
        check("Real parser produces a preview", app.parseState === "valid" && output.querySelector(".ai-section, .ii-section"));
        check("Full preview keeps every section open", !output.querySelector(".collapsed:not([data-default-collapsed])"));
        check("Input help is hidden after preview", [...root.querySelectorAll("[data-input-help]")].every(help => help.hidden));
        check("Preset management is beside the unified picker", !!root.querySelector('[data-open-panel="presets"]') && !root.querySelector("#ai-preset-select"));
        check("Auto-parse moved into options", !!root.querySelector('[data-view-panel="options"] input[id$="auto-parse-checkbox"]'));
        root.querySelector('[data-open-panel="presets"]').click();
        check("Manage opens its panel", root.querySelector('[data-view-panel="presets"]').open && !root.querySelector('[data-view-panel="presets"]').hidden);
        root.querySelector('[data-view-panel="presets"]').open = false;
        if (prefix === "ii") {
            check("Generated YAML editor is optional and initially hidden", root.querySelector("[data-optional-yaml]").hidden);
            const toggle = root.querySelector('[data-view-feature="showYaml"]');
            toggle.checked = true;
            toggle.dispatchEvent(new Event("change", { bubbles: true }));
            check("Editor opt-in exposes generated strict YAML", !root.querySelector("[data-optional-yaml]").hidden && root.querySelector("#ii-normalized-input").value.includes("SCHEMA_VERSION:"));
            check("Exports are available independently of the editor", !root.querySelector("[data-generated-tools]").hidden);
            check("Builder appears for a valid single Item", !root.querySelector('[data-action="openActivityBuilder"]') || !root.querySelector('[data-action="openActivityBuilder"]').hidden);
            const match = root.querySelector("#ii-setting-match-icons");
            const mode = root.querySelector("#ii-icon-mode");
            const originalMatch = match.checked, originalMode = mode.value;
            match.checked = false; app.viewLayout.applyContext();
            check("Image matching details hide when disabled", [...root.querySelectorAll("[data-image-matching], [data-image-seed]")].every(el => el.hidden));
            match.checked = true; mode.value = "random"; app.viewLayout.applyContext();
            check("Random seed appears only when applicable", !root.querySelector("[data-image-seed]").hidden);
            match.checked = originalMatch; mode.value = originalMode; app.viewLayout.applyContext();
        }
        const markup = output.innerHTML;
        const previewText = output.textContent;
        const result = app.currentParseResults ?? app.currentParseResult;
        const fullSection = output.querySelector(".ai-section:not([data-default-collapsed]) > .ai-section-header, .ii-section:not([data-default-collapsed]) > .ii-section-header");
        const compact = () => {
            app.viewLayout.select.value = "compact";
            app.viewLayout.select.dispatchEvent(new Event("change", { bubbles: true }));
        };
        compact();
        check("Compact keeps every preview field", output.textContent === previewText && output.querySelector(".collapsed"));
        check("Compact actually hides ordinary detail bodies", getComputedStyle(output.querySelector(".collapsed > .ai-section-content, .collapsed > .ii-section-content")).display === "none");
        check("Layout change keeps source and parsed data", input.value === text && (app.currentParseResults ?? app.currentParseResult) === result);
        fullSection.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        check("Keyboard expands a compact section", fullSection.getAttribute("aria-expanded") === "true");
        output.innerHTML = markup;
        app._setupCollapsibleSections();
        check("Section choice survives preview replacement", output.querySelector(".ai-section:not([data-default-collapsed]) > .ai-section-header, .ii-section:not([data-default-collapsed]) > .ii-section-header").getAttribute("aria-expanded") === "true");
        // Simulate nested issues and unresolved references without touching any documents.
        output.innerHTML = `<div class="ii-section"><div class="ii-section-header">Outer</div><div class="ii-section-content">
          <div class="ai-section ai-section-issues"><div class="ai-section-header">Warnings</div><div class="ai-section-content">Warning fixture</div></div>
          <div class="ai-section"><div class="ai-section-header">References</div><div class="ai-section-content"><div class="ai-uuid-dropzone">Unresolved fixture</div></div></div>
          </div></div>`;
        app._setupCollapsibleSections();
        check("Compact exposes warnings and all their ancestors", !output.querySelector(".collapsed:not([data-default-collapsed])"));
        output.querySelector(".ii-section-header").click();
        check("Required findings cannot be accidentally collapsed", !output.querySelector(".collapsed:not([data-default-collapsed])"));
        if (prefix === "ii") check("Resolve action is contextual", !root.querySelector('[data-action="resolveReferences"]') || !root.querySelector('[data-action="resolveReferences"]').hidden);
        const panel = root.querySelector("[data-view-panel]");
        panel.open = true;
        await tick();
        check("Opening a panel remembers it without duplicated menu controls", app.viewLayout.preferences.panels[panel.dataset.viewPanel] && !root.querySelector("[data-view-toggle]"));
        const duplicateMode = root.querySelector("#ii-duplicate-mode");
        if (duplicateMode) duplicateMode.value = "merge";
        const destination = app._getDestination?.();
        root.querySelector("[data-view-reset]").click();
        await tick();
        check("Reset layout restores full preview and closed panels", app.viewLayout.preferences.preview === "full" && !panel.open);
        check("Reset layout preserves input and import mode", input.value === text && (!duplicateMode || duplicateMode.value === "merge"));
        check("Reset layout preserves destination", JSON.stringify(app._getDestination?.()) === JSON.stringify(destination));
        output.innerHTML = markup;
        app._setupCollapsibleSections();
        check("Reset clears compact section choices", !output.querySelector(".collapsed:not([data-default-collapsed])"));
        compact();
        input.value = prefix === "ai" ? "ACTIVITY_UTILITY:\n  ACTIVATION: [" : "WEAPON:\n  ITEM: [";
        await Actions.parse.call(app);
        check("Parse errors remain visible in Compact", app.parseState === "error" && output.querySelector(`.${prefix}-parse-error`)?.getClientRects().length);
        check("Parse errors keep import disabled", root.querySelector(prefix === "ai" ? '[data-action="addActivity"]' : '[data-action="import"]').disabled);
        const resolve = root.querySelector('[data-action="resolveReferences"]');
        if (resolve) check("Resolve action hides after invalid input", resolve.hidden);
        if (prefix === "ai") {
            input.value = "EFFECT:\n  DETAILS:\n    Name: View Fixture Effect\n  CHANGES:\n    - Attribute Key: system.attributes.ac.bonus\n      Change Mode: 2\n      Value: '1'\n      Priority: 20";
            await Actions.parse.call(app);
            check("Effect preview also supports Compact", app.parseState === "valid" && output.querySelector(".collapsed") && output.textContent.includes("View Fixture Effect"));
            input.value = text + "\n\n" + input.value;
            await Actions.parse.call(app);
            check("Activity and Effect batches retain separate cards", app.parseState === "valid" && output.querySelectorAll(".ai-batch-item").length === 2);
        } else {
            input.value = "SCHEMA_VERSION: 4\nLOOT:\n  ITEM:\n    Name: View Fixture Ruby\n    Loot Type: gem\n---\nSCHEMA_VERSION: 4\nLOOT:\n  ITEM:\n    Name: View Fixture Sapphire\n    Loot Type: gem";
            await Actions.parse.call(app);
            check("Batch selectors and per-item import modes stay visible in Compact", app.selectedBatchItems.size === 2 && [...output.querySelectorAll(".ii-entry-mode")].length === 2 && [...output.querySelectorAll(".ii-entry-mode")].every(select => select.getClientRects().length));
            check("Builder hides for batches", !root.querySelector('[data-action="openActivityBuilder"]') || root.querySelector('[data-action="openActivityBuilder"]').hidden);
            const batchHeader = output.querySelector(".ii-section-header");
            batchHeader?.click();
            check("Batch selection controls cannot be collapsed", batchHeader?.getAttribute("aria-expanded") === "true" && app.selectedBatchItems.size === 2);
        }
        if (prefix === "ii") {
            const prose = "Moonlit Lantern\nWondrous item, uncommon\nThis silver lantern sheds bright light in a 30-foot radius.";
            input.value = prose;
            await Actions.parse.call(app);
            const generated = app.normalizedText;
            check("Natural text generates strict YAML rather than echoing prose", app.parseState === "valid" && generated !== prose && generated.includes("SCHEMA_VERSION:") && generated.includes("Moonlit Lantern"));
            check("Inspecting generated YAML preserves original prose", input.value === prose);
            const editor = root.querySelector("#ii-normalized-input");
            editor.value = generated.replaceAll("Moonlit Lantern", "Moonlit Lantern Edited");
            check("Editing secondary YAML does not silently alter source or preview", input.value === prose && app.currentParseResult.item.name === "Moonlit Lantern");
            await Actions.reparseNormalized.call(app);
            check("Use and preview applies secondary edits to the main source", input.value.includes("Moonlit Lantern Edited") && app.currentParseResult.item.name === "Moonlit Lantern Edited");
            input.value = text;
            const olderParse = Actions.parse.call(app);
            input.value = "SCHEMA_VERSION: 4\nLOOT:\n  ITEM:\n    Name: Newest Preview\n    Loot Type: gem";
            await Actions.parse.call(app);
            await olderParse;
            check("A slower previous parse cannot overwrite generated YAML", app.currentParseResult.item.name === "Newest Preview" && app.normalizedText.includes("Newest Preview"));
            const warning = "Unique insight warning";
            app.currentParseResult.warnings = [warning];
            app.currentParseResult._workflow.insights.suggestions = [{ severity: "warning", message: warning }, { severity: "warning", message: "Insight-only warning" }];
            output.innerHTML = Renderer.renderItemCard(app.currentParseResult.item, app.currentParseResult);
            app._setupCollapsibleSections();
            check("Review consolidates duplicate parser and insight findings", output.textContent.split(warning).length === 2);
            check("Insight-only warnings remain expanded in Compact", output.querySelector(".ii-section-issues").textContent.includes("Insight-only warning") && !output.querySelector(".ii-section-issues").classList.contains("collapsed"));
        }
        panel.open = true;
        await tick();
        await app.close();
        await app.render(true);
        check("Reopen remembers preview and panel preferences", app.viewLayout.preferences.preview === "compact" && app.element.querySelector("[data-view-panel]").open);
        app.element.querySelector("[data-view-reset]").click();
        await tick();
        const content = app.element.querySelector(".window-content");
        measurements = { width: app.element.getBoundingClientRect().width, height: app.element.getBoundingClientRect().height, scrollHeight: content.scrollHeight, clientHeight: content.clientHeight };
        check("No horizontal overflow", content.scrollWidth <= content.clientWidth + 1);
        if (prefix === "ii") {
            const summary = app.element.querySelector("#ii-destination-summary");
            check("Destination and duplicate mode are visible outside closed picker", summary.getClientRects().length && app.element.querySelector("#ii-duplicate-mode").getClientRects().length);
            check("Destination summary is meaningful", summary.textContent.includes(" / ") && !summary.textContent.includes("undefined"));
            check("Options have an active summary", app.element.querySelector("#ii-options-summary").textContent.length > 0);
            const kind = app.element.querySelector("#ii-destination-kind");
            for (const value of ["actor", "compendium", "world"]) {
                kind.value = value;
                app._refreshViewSummaries();
                const label = kind.selectedOptions[0].textContent;
                check(`${value} destination stays explicit when collapsed`, summary.textContent.startsWith(label));
            }
        }
        // Cancellation must preserve an existing draft, including parsed preview identity.
        const currentInput = app.element.querySelector(`#${prefix}-input`);
        currentInput.value = text;
        await Actions.parse.call(app);
        const originalParse = app.currentParseResult ?? app.currentParseResults;
        const Dialog = foundry.applications.api.DialogV2;
        const confirm = Dialog.confirm;
        let asked = false;
        try {
            Dialog.confirm = async () => { asked = true; return false; };
            const choice = [...app.element.querySelector(`#${prefix}-template-select`).options].find(option => option.value && !option.value.startsWith("saved:") && !option.value.startsWith("preset:") && !option.parentElement.label?.includes("recipes"));
            await Actions.insertTemplate.call(app, null, { templateId: prefix === "ii" ? choice.value.slice(8) : choice.value });
            check("Cancelling template replacement preserves source and preview", asked && currentInput.value === text && (app.currentParseResult ?? app.currentParseResults) === originalParse);
        } finally { Dialog.confirm = confirm; }
        if (prefix === "ai") {
            const item = game.items.contents.find(item => item.system?.activities);
            app.droppedItem = item;
            app.droppedItemUuid = item?.uuid;
            await Actions.switchMode.call(app, null, { dataset: { mode: "effect" } });
            const effectDraft = "EFFECT:\n  DETAILS:\n    Name: Retained Effect Draft";
            app.element.querySelector("#ai-input").value = effectDraft;
            await Actions.switchMode.call(app, null, { dataset: { mode: "activity" } });
            check("Activity tab restores its draft and target", app.element.querySelector("#ai-input").value === text && app.droppedItem === item);
            await Actions.switchMode.call(app, null, { dataset: { mode: "effect" } });
            check("Effect tab restores its own draft", app.element.querySelector("#ai-input").value === effectDraft);
            const actor = game.actors.contents.find(actor => actor.visible);
            const referenceText = "ACTIVITY_SUMMON:\n  ACTIVITY:\n    Name: Reference Search Fixture\n  SUMMONS_PROFILES:\n    Mode: By Direct Link\n    PROFILES:\n      - Display Name: Fixture Actor\n        Count: '1'";
            app.element.querySelector("#ai-input").value = referenceText;
            await Actions.parse.call(app);
            const search = app.element.querySelector(".ai-uuid-search");
            check("Missing reference has an inline Search action", !!search);
            check("Resolve All appears beside missing-reference count", !app.element.querySelector("[data-reference-summary]").hidden);
            if (actor && search) {
                const prompt = Dialog.prompt;
                let prompts = 0;
                try {
                    Dialog.prompt = async options => { prompts++; return prompts === 1 ? actor.name : options.content.includes(actor.uuid) ? actor.uuid : null; };
                    search.click();
                    for (let attempt = 0; attempt < 500 && search.disabled; attempt++) await tick();
                    check("Inline search applies the chosen Actor only to its reference field", prompts === 2 && app.currentParseResults[0].activityData.profiles[0].uuid === actor.uuid);
                    check("Resolving a field clears the contextual unresolved count", app.element.querySelector("[data-reference-summary]").hidden);
                } finally { Dialog.prompt = prompt; }
            }
        }
        const defaultsRoot = app.element;
        const defaultsInput = defaultsRoot.querySelector(`#${prefix}-input`);
        const defaultsSource = defaultsInput.value;
        const defaultsDestination = JSON.stringify(app._getDestination?.());
        const selectedItem = app.droppedItemUuid;
        const previousActivityParse = app.currentParseResults;
        const historyBefore = defaultsRoot.querySelector('[data-view-panel="history"]').innerHTML;
        const presetKey = prefix === "ii" ? "savedPresets" : "presets";
        const presetsBefore = JSON.stringify(game.settings.get(moduleId, presetKey));
        for (const [settingKey, id] of Object.entries(IMPORT_OPTION_SETTINGS[prefix])) {
            const value = game.settings.settings.get(`${moduleId}.${settingKey}`).default;
            const changed = typeof value === "boolean" ? !value : "random";
            await game.settings.set(moduleId, settingKey, changed);
            const control = defaultsRoot.querySelector(`#${id}`);
            if (control.type === "checkbox") control.checked = changed;
            else control.value = changed;
        }
        defaultsRoot.querySelector(`#${prefix}-compare-checkbox`).checked = true;
        app.viewLayout.preferences.preview = "compact";
        app.viewLayout.preferences.showHistory = true;
        app.viewLayout.preferences.showYaml = true;
        app.viewLayout.preferences.showHelp = true;
        app.viewLayout.save();
        app.viewLayout.apply();
        if (prefix === "ii") {
            defaultsRoot.querySelector("#ii-suggest-automation").checked = true;
            defaultsRoot.querySelector("#ii-icon-seed").value = "keep-no-seed";
            defaultsRoot.querySelector("#ii-use-autoanimations").checked = !defaultsRoot.querySelector("#ii-use-autoanimations").defaultChecked;
            defaultsRoot.querySelector("#ii-normalized-input").value = "Unapplied YAML draft";
        }
        const defaultsButton = defaultsRoot.querySelector("[data-import-defaults]");
        defaultsButton.click();
        for (let attempt = 0; attempt < 500 && defaultsButton.disabled; attempt++) await tick();
        check("Restore defaults completes", !defaultsButton.disabled);
        check("Import settings restore their registered defaults in storage and controls", Object.entries(IMPORT_OPTION_SETTINGS[prefix]).every(([settingKey, id]) => {
            const expected = game.settings.settings.get(`${moduleId}.${settingKey}`).default;
            const control = defaultsRoot.querySelector(`#${id}`);
            return game.settings.get(moduleId, settingKey) === expected && (control.type === "checkbox" ? control.checked : control.value) === expected;
        }));
        check("Restore defaults also resets view options", app.viewLayout.preferences.preview === "full" && !app.viewLayout.preferences.showHistory && !app.viewLayout.preferences.showYaml && !app.viewLayout.preferences.showHelp && defaultsRoot.querySelector('[data-view-panel="history"]').hidden);
        check("Restore defaults resets Compare", !defaultsRoot.querySelector(`#${prefix}-compare-checkbox`).checked);
        check("Restore defaults preserves source and destination", defaultsInput.value === defaultsSource && JSON.stringify(app._getDestination?.()) === defaultsDestination && app.droppedItemUuid === selectedItem);
        check("Restore defaults preserves history and presets", defaultsRoot.querySelector('[data-view-panel="history"]').innerHTML === historyBefore && JSON.stringify(game.settings.get(moduleId, presetKey)) === presetsBefore);
        if (prefix === "ii") {
            check("Restore defaults clears seed and automation suggestion preference", !defaultsRoot.querySelector("#ii-icon-seed").value && !defaultsRoot.querySelector("#ii-suggest-automation").checked);
            const animations = defaultsRoot.querySelector("#ii-use-autoanimations");
            check("Animation default respects availability", animations.checked === (!animations.disabled && animations.defaultChecked));
            check("Restore defaults preserves an unapplied YAML draft", defaultsRoot.querySelector("#ii-normalized-input").value === "Unapplied YAML draft");
        } else {
            check("Restore defaults preserves resolved Activity references", app.currentParseResults === previousActivityParse);
        }
    } catch (error) {
        checks.push({ name: "fixture execution", success: false, error: error.stack || String(error) });
    } finally {
        await app.close();
        for (const [settingKey, value] of Object.entries(optionSettings)) await game.settings.set(moduleId, settingKey, value);
        Window.instance = singleton;
        if (saved === null) localStorage.removeItem(key);
        else localStorage.setItem(key, saved);
    }
    check("All world Item, Actor, and Scene sources unchanged", snapshot() === before);
    check("Original import settings restored", Object.entries(optionSettings).every(([settingKey, value]) => game.settings.get(moduleId, settingKey) === value));
    check("Original layout preferences restored", localStorage.getItem(key) === saved);
    return { success: checks.every(check => check.success), checks, measurements };
}
