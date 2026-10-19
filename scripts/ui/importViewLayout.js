/** Presentation preferences only. No import settings, source text, or documents are stored here. */
export function normalizeViewPreferences(value = {}) {
    const booleans = object => Object.fromEntries(Object.entries(object ?? {})
        .filter(([key, entry]) => key.length < 300 && typeof entry === "boolean").slice(-100));
    return {
        preview: value?.preview === "compact" ? "compact" : "full",
        showYaml: value?.showYaml === true,
        showHelp: value?.showHelp === true,
        showHistory: value?.showHistory === true,
        panels: booleans(value?.panels),
        full: booleans(value?.full),
        compact: booleans(value?.compact)
    };
}

const sections = ".ai-section, .ii-section";
const headers = ".ai-section-header, .ii-section-header";
const attention = ".ai-section-issues, .ii-section-issues, .ai-parse-warning, .ii-parse-warning, .ai-parse-error, .ii-parse-error, .severity-warning, .severity-error, .ai-uuid-dropzone, .ii-batch-uuid-item, .ii-batch-grid, .ii-suggested-automation";
const requiresAttention = section => section.matches(attention) || Boolean(section.querySelector(attention));

/** Shared by both distributions, including the standalone Item Importer. */
export class ImportViewLayout {
    constructor(root, { moduleId, prefix, userId = game.user.id, worldId = game.world.id, storage = globalThis.localStorage }) {
        this.root = root;
        this.prefix = prefix;
        this.storage = storage;
        this.key = `${moduleId}.view.v1.${worldId}.${userId}`;
        try { this.preferences = normalizeViewPreferences(JSON.parse(storage.getItem(this.key))); }
        catch { this.preferences = normalizeViewPreferences(); }
        this.controller = new AbortController();
        this.bindMenu();
        this.bindPreview();
        for (const panel of this.root.querySelectorAll("details[data-view-panel]")) {
            panel.addEventListener("toggle", () => {
                const key = panel.dataset.viewPanel;
                if (panel.hasAttribute("data-managed-panel")) panel.hidden = !panel.open;
                if (Boolean(this.preferences.panels[key]) === panel.open) return;
                this.preferences.panels[key] = panel.open;
                this.save();
                this.syncMenu();
            }, { signal: this.controller.signal });
        }
        this.root.addEventListener("click", event => {
            const button = event.target.closest("[data-open-panel]");
            if (!button) return;
            const panel = [...this.root.querySelectorAll("details[data-view-panel]")]
                .find(panel => panel.dataset.viewPanel === button.dataset.openPanel);
            if (panel) { panel.hidden = false; panel.open = true; panel.querySelector("summary")?.focus(); }
        }, { signal: this.controller.signal });
        this.root.querySelector(`#${prefix}-input`)?.addEventListener("input", () => this.applyContext(), { signal: this.controller.signal });
        this.apply();
    }

    destroy() { this.controller.abort(); }

    save() {
        this.preferences = normalizeViewPreferences(this.preferences);
        try { this.storage.setItem(this.key, JSON.stringify(this.preferences)); }
        catch { /* Private browsing/storage limits must not block importing. */ }
    }

    bindMenu() {
        const menu = this.root.querySelector("[data-view-options]");
        if (!menu) return;
        const document = this.root.ownerDocument;
        const body = menu.querySelector("[data-view-options-body]");
        body.replaceChildren();
        const labelText = (key, fallback) => {
            const id = `II.View.${key}`;
            const translated = this.prefix === "ii" ? globalThis.game?.i18n?.localize?.(id) : null;
            return translated && translated !== id ? translated : fallback;
        };
        const label = document.createElement("label");
        label.textContent = labelText("Preview", "Preview detail");
        this.select = document.createElement("select");
        this.select.setAttribute("aria-label", labelText("Preview", "Preview detail"));
        for (const [value, text] of [["full", labelText("Full", "Full (default)")], ["compact", labelText("Compact", "Compact")]]) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = text;
            this.select.append(option);
        }
        label.append(this.select);
        body.append(label);
        this.select.addEventListener("change", () => {
            this.preferences.preview = this.select.value;
            this.save();
            this.applySections(true);
        }, { signal: this.controller.signal });
        const hint = document.createElement("p");
        hint.textContent = labelText("Hint", "Compact starts detail sections closed. Warnings and missing references stay expanded. Panels remember whether you left them open.");
        body.append(hint);
        for (const [key, title, available] of [
            ["showYaml", "Show generated YAML editor", !!this.root.querySelector("[data-optional-yaml]")],
            ["showHelp", "Keep input help visible", true],
            ["showHistory", labelText("ShowHistory", "Show Import History"), !!this.root.querySelector('[data-view-panel="history"]')]
        ]) {
            if (!available) continue;
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.viewFeature = key;
            label.append(checkbox, ` ${title}`);
            body.append(label);
            checkbox.addEventListener("change", () => {
                this.preferences[key] = checkbox.checked;
                if (key === "showYaml" && checkbox.checked) {
                    const panel = this.root.querySelector("[data-optional-yaml]");
                    panel.open = true;
                    this.preferences.panels[panel.dataset.viewPanel] = true;
                }
                if (key === "showHistory" && checkbox.checked) {
                    this.root.querySelector('[data-view-panel="history"]').open = true;
                    this.preferences.panels.history = true;
                }
                this.save();
                this.applyContext();
            }, { signal: this.controller.signal });
        }
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = labelText("Reset", "Reset layout");
        reset.dataset.viewReset = "true";
        reset.addEventListener("click", () => this.reset(), { signal: this.controller.signal });
        body.append(reset);
    }

    reset() {
        this.preferences = normalizeViewPreferences();
        try { this.storage.removeItem(this.key); } catch { /* Optional persistence. */ }
        this.apply();
    }

    syncMenu() {
        if (this.select) this.select.value = this.preferences.preview;
        for (const checkbox of this.root.querySelectorAll("[data-view-feature]")) {
            checkbox.checked = Boolean(this.preferences[checkbox.dataset.viewFeature]);
        }
    }

    apply() {
        for (const panel of this.root.querySelectorAll("details[data-view-panel]")) {
            panel.open = Boolean(this.preferences.panels[panel.dataset.viewPanel]);
            if (panel.hasAttribute("data-managed-panel")) panel.hidden = !panel.open;
        }
        this.syncMenu();
        this.applySections(true);
    }

    applyContext() {
        const hasSource = !!this.root.querySelector(`#${this.prefix}-input`)?.value.trim();
        for (const help of this.root.querySelectorAll("[data-input-help]")) help.hidden = hasSource && !this.preferences.showHelp;
        const yaml = this.root.querySelector("[data-optional-yaml]");
        if (yaml) yaml.hidden = !this.preferences.showYaml;
        const history = this.root.querySelector('[data-view-panel="history"]');
        if (history) history.hidden = !this.preferences.showHistory;
        const matching = !!this.root.querySelector("#ii-setting-match-icons")?.checked;
        for (const control of this.root.querySelectorAll("[data-image-matching]")) control.hidden = !matching;
        for (const control of this.root.querySelectorAll("[data-image-seed]")) control.hidden = !matching || this.root.querySelector("#ii-icon-mode")?.value !== "random";
    }

    // Delegate to the persistent output element so auto-parse does not retain old preview nodes.
    bindPreview() {
        const output = this.root.querySelector(`#${this.prefix}-parse-output`);
        output?.addEventListener("click", event => {
            const header = event.target.closest(headers);
            if (!header || !output.contains(header)) return;
            event.stopPropagation();
            const section = header.closest(sections);
            if (!section || requiresAttention(section)) return;
            section.classList.toggle("collapsed");
            this.preferences[this.preferences.preview][header.dataset.viewKey] = section.classList.contains("collapsed");
            this.save();
            header.setAttribute("aria-expanded", String(!section.classList.contains("collapsed")));
        }, { signal: this.controller.signal, capture: true });
        output?.addEventListener("keydown", event => {
            const header = event.target.closest(headers);
            if (!header || !["Enter", " "].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            header.click();
        }, { signal: this.controller.signal, capture: true });
    }

    applySections(force = false) {
        this.applyContext();
        const output = this.root.querySelector(`#${this.prefix}-parse-output`);
        if (!output) return;
        const mode = this.preferences.preview;
        output.dataset.previewDetail = mode;
        const resolver = this.root.querySelector('[data-action="resolveReferences"]');
        if (resolver) resolver.hidden = !output.querySelector(".ai-uuid-dropzone");
        for (const header of output.querySelectorAll(headers)) {
            const section = header.closest(sections);
            if (!section) continue;
            const path = [header.textContent.trim()];
            let parent = section.parentElement?.closest(sections);
            while (parent) {
                path.unshift(parent.querySelector(headers)?.textContent.trim() ?? "");
                parent = parent.parentElement?.closest(sections);
            }
            const key = path.join(" / ").slice(0, 299);
            const required = requiresAttention(section);
            if (force || !header.dataset.viewBound || required) {
                const collapsed = this.preferences[mode][key] ?? (mode === "compact" || section.hasAttribute("data-default-collapsed"));
                section.classList.toggle("collapsed", !required && collapsed);
                header.setAttribute("aria-expanded", String(!section.classList.contains("collapsed")));
            }
            header.setAttribute("aria-disabled", String(required));
            header.dataset.viewKey = key;
            header.dataset.viewBound = "true";
            header.setAttribute("role", "button");
            header.tabIndex = 0;
        }
    }
}
