/**
 * The window behind "Compendiums to link first": the ordered list of compendiums whose spells and
 * creatures link before any other copy (the `referenceCompendiums` setting; the linking order is in
 * `scripts/referenceLinking.js`). Each importer opens it from a button in its settings. Shared file:
 * identical in both importers (parity list). Classes use the importer's prefix (`ai-refcomp-*` or
 * `ii-refcomp-*`); each module styles its own.
 */

import {
    REFERENCE_COMPENDIUMS_HINT, REFERENCE_COMPENDIUMS_LIMIT, REFERENCE_COMPENDIUMS_NAME, REFERENCE_COMPENDIUMS_SETTING,
    listReferencePacks, normalizePackIds, readPriorityPacks
} from "../referenceLinking.js";

const windowClasses = new Map();

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

/**
 * Move, add or remove one entry. Returns a new list; the input is not changed.
 * @param {string[]} list
 * @param {"up"|"down"|"remove"|"add"} action
 * @param {{index?: number, id?: string}} [target]
 */
export function editCompendiumList(list, action, { index = -1, id = "" } = {}) {
    const next = normalizePackIds(list);
    if (action === "add") return normalizePackIds([...next, id]);
    if (index < 0 || index >= next.length) return next;
    if (action === "remove") next.splice(index, 1);
    else if (action === "up" && index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]];
    else if (action === "down" && index < next.length - 1) [next[index + 1], next[index]] = [next[index], next[index + 1]];
    return next;
}

/**
 * HTML of the window body.
 * @param {object} state
 * @param {"ai"|"ii"} [state.prefix]
 * @param {string[]} state.chosen - Compendium ids, in order
 * @param {object[]} state.packs - `listReferencePacks()`
 * @param {boolean} [state.changed] - Unsaved changes
 */
export function renderCompendiumList({ prefix = "ai", chosen = [], packs = [], changed = false }) {
    const p = prefix;
    const known = new Map(packs.map(pack => [pack.id, pack]));
    const ids = normalizePackIds(chosen);
    const rows = ids.map((id, index) => {
        const pack = known.get(id);
        const label = pack ? pack.label : id;
        const missing = pack ? "" : ` <span class="${p}-refcomp-missing">not available in this world</span>`;
        const kind = pack ? ` <span class="${p}-refcomp-kind">${esc(pack.documentName === "Actor" ? "Actors" : "Items")}</span>` : "";
        const button = (action, icon, title, disabled) => `<button type="button" class="${p}-refcomp-button" data-refcomp="${action}" data-index="${index}"
            title="${esc(title)}" aria-label="${esc(`${title}: ${label}`)}"${disabled ? " disabled" : ""}><i class="fas ${icon}" aria-hidden="true"></i></button>`;
        return `<li class="${p}-refcomp-row" data-pack-id="${esc(id)}">
            <span class="${p}-refcomp-order">${index + 1}</span>
            <span class="${p}-refcomp-label">${esc(label)}${kind}${missing}</span>
            ${button("up", "fa-arrow-up", "Move up", index === 0)}${button("down", "fa-arrow-down", "Move down", index === ids.length - 1)}${button("remove", "fa-xmark", "Remove", false)}
          </li>`;
    }).join("");
    const empty = `<li class="${p}-refcomp-empty">No compendiums listed. Names link in the usual order: a world Item, a single match, then dnd5e's copy for the Default compendium setting.</li>`;
    const available = packs.filter(pack => !ids.includes(pack.id));
    const group = (documentName, title) => {
        const entries = available.filter(pack => pack.documentName === documentName);
        return entries.length ? `<optgroup label="${esc(title)}">${entries.map(pack => `<option value="${esc(pack.id)}">${esc(pack.label)}</option>`).join("")}</optgroup>` : "";
    };
    const full = ids.length >= REFERENCE_COMPENDIUMS_LIMIT;
    const options = group("Item", "Item compendiums (spells and items)") + group("Actor", "Actor compendiums (creatures)");
    return `<p class="${p}-refcomp-hint">${esc(REFERENCE_COMPENDIUMS_HINT)}</p>
      <ol class="${p}-refcomp-list" aria-label="${esc(REFERENCE_COMPENDIUMS_NAME)}">${rows || empty}</ol>
      <div class="${p}-refcomp-add">
        <select class="${p}-refcomp-select" aria-label="Compendium to add"${options && !full ? "" : " disabled"}>
          ${options ? `<option value="">Choose a compendium to add…</option>${options}` : `<option value="">Every compendium is listed</option>`}
        </select>
        <button type="button" class="${p}-refcomp-button" data-refcomp="add"${options && !full ? "" : " disabled"}><i class="fas fa-plus" aria-hidden="true"></i> Add</button>
      </div>
      <footer class="${p}-refcomp-footer">
        <span class="${p}-refcomp-status" aria-live="polite">${changed ? "Not saved yet." : ""}</span>
        <button type="button" class="${p}-refcomp-cancel" data-refcomp="cancel">Cancel</button>
        <button type="button" class="${p}-refcomp-save" data-refcomp="save"><i class="fas fa-save" aria-hidden="true"></i> Save</button>
      </footer>`;
}

/**
 * The settings-menu class of one importer, for `game.settings.registerMenu(..., { type })`. Made on
 * first use, so this file loads without Foundry (Node tests); null without ApplicationV2.
 * @param {string} moduleId
 * @param {"ai"|"ii"} prefix
 */
export function referenceCompendiumsMenu(moduleId, prefix) {
    const key = moduleId + ":" + prefix;
    if (windowClasses.has(key)) return windowClasses.get(key);
    const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
    if (!ApplicationV2) return null;
    const Window = class ReferenceCompendiumsWindow extends ApplicationV2 {
        static DEFAULT_OPTIONS = {
            id: `${prefix}-refcomp-window`,
            tag: "section",
            classes: [`${prefix}-refcomp-window`],
            window: { title: REFERENCE_COMPENDIUMS_NAME, icon: "fas fa-layer-group", resizable: true },
            position: { width: 560, height: "auto" }
        };

        constructor(options = {}) {
            super(options);
            this.chosen = readPriorityPacks(moduleId);
            this.saved = [...this.chosen];
        }

        async _renderHTML() {
            const body = document.createElement("div");
            body.className = `${prefix}-refcomp-body`;
            body.innerHTML = renderCompendiumList({ prefix, chosen: this.chosen, packs: listReferencePacks(),
                changed: JSON.stringify(this.chosen) !== JSON.stringify(this.saved) });
            // The body is new on every render, so its listener goes with it.
            body.addEventListener("click", event => this.#onClick(event));
            return body;
        }

        _replaceHTML(result, content) {
            content.replaceChildren(result);
        }

        async #onClick(event) {
            const button = event.target.closest?.("[data-refcomp]");
            if (!button || button.disabled) return;
            event.preventDefault();
            const action = button.dataset.refcomp;
            if (action === "cancel") return this.close();
            if (action === "save") {
                if (!globalThis.game?.user?.isGM) {
                    globalThis.ui?.notifications?.warn?.("Only a Gamemaster can change the compendiums to link first.");
                    return;
                }
                await globalThis.game.settings.set(moduleId, REFERENCE_COMPENDIUMS_SETTING, normalizePackIds(this.chosen));
                return this.close();
            }
            const index = Number(button.dataset.index);
            const id = action === "add" ? this.element?.querySelector(`.${prefix}-refcomp-select`)?.value ?? "" : "";
            if (action === "add" && !id) return;
            this.chosen = editCompendiumList(this.chosen, action, { index, id });
            await this.render();
            const focus = action === "add" ? `.${prefix}-refcomp-select` : `[data-refcomp="${action}"][data-index="${Math.max(0, Math.min(this.chosen.length - 1, action === "up" ? index - 1 : action === "down" ? index + 1 : index))}"]:not([disabled])`;
            this.element?.querySelector(focus)?.focus?.();
        }
    };
    windowClasses.set(key, Window);
    return Window;
}

/**
 * The options of the settings button that opens the window, for
 * `game.settings.registerMenu(moduleId, "referenceCompendiumsMenu", ...)` (each module writes that
 * call itself, as for the settings). Null without ApplicationV2.
 */
export function referenceCompendiumsMenuConfig(moduleId, prefix) {
    const type = referenceCompendiumsMenu(moduleId, prefix);
    return type ? { name: REFERENCE_COMPENDIUMS_NAME, label: "Choose compendiums", hint: REFERENCE_COMPENDIUMS_HINT,
        icon: "fas fa-layer-group", type, restricted: true } : null;
}
