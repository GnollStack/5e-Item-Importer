/**
 * The reference field of the import windows: the linked document with Change and Clear, or the
 * matches for the name with a Search button. Change and Search open a small search window of its
 * own, whose results update as you type; a UUID can be pasted there, and a document can be
 * dropped on the field. Shared file: identical in both importers (parity list). Classes use the
 * window's prefix (`ai-refpick-*` or `ii-refpick-*`); each module styles its own.
 */

import { MIN_QUERY_LENGTH, RESULT_LIMIT, looksLikeUuid } from "../referenceLinking.js";

const SEARCH_DELAY_MS = 150;
const bindings = new WeakMap();
let pickerCounter = 0;
let optionCounter = 0;
let SearchWindowClass = null;

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

/**
 * HTML for one reference field.
 * @param {object} state
 * @param {"ai"|"ii"} [state.prefix]
 * @param {"linked"|"searching"|"finding"} state.mode - linked document, needs a choice, or lookup still running
 * @param {object} [state.linked] - { name, uuid, location, img, auto }
 * @param {string} [state.query] - The name from the YAML; the search window starts with it
 * @param {object[]} [state.candidates] - Matches to list in the field (an ambiguous name)
 * @param {string} [state.noun] - "spell", "creature", "item"
 * @param {string} [state.label] - Accessible name of the field
 * @param {string} [state.hostClass] - Extra classes on the field (the window's pending markers)
 * @param {string} [state.attributes] - Extra attributes on the field (already escaped)
 * @param {string} [state.message] - Why the field needs a choice
 */
export function renderReferencePicker(state) {
    const p = state.prefix || "ai";
    const noun = state.noun || "document";
    const hostClass = [`${p}-refpick`, `is-${state.mode}`, state.hostClass].filter(Boolean).join(" ");
    const attributes = state.attributes ? " " + state.attributes : "";
    const label = esc(state.label || `Linked ${noun}`);
    if (state.mode === "linked" && state.linked) {
        const linked = state.linked;
        return `<div class="${esc(hostClass)}"${attributes} data-refpick="linked" data-refpick-uuid="${esc(linked.uuid)}" data-refpick-query="${esc(linked.name || "")}" role="group" aria-label="${label}">
          <span class="${p}-refpick-linked">
            ${linked.img ? `<img class="${p}-refpick-icon" src="${esc(linked.img)}" alt="" loading="lazy">` : `<i class="fas fa-link ${p}-refpick-icon" aria-hidden="true"></i>`}
            <span class="${p}-refpick-name" title="${esc(linked.uuid)}">${esc(linked.name || linked.uuid)}</span>
            ${linked.location ? `<span class="${p}-refpick-source">${esc(linked.location)}</span>` : ""}
            ${linked.auto ? `<span class="${p}-refpick-auto" title="Linked automatically by name">auto</span>` : ""}
          </span>
          <span class="${p}-refpick-actions">
            <button type="button" class="${p}-refpick-change" data-refpick-action="change" title="Search for a different ${esc(noun)}">Change</button>
            <button type="button" class="${p}-refpick-clear" data-refpick-action="clear" title="Clear this link" aria-label="Clear ${label}"><i class="fas fa-times" aria-hidden="true"></i></button>
          </span>
        </div>`;
    }
    if (state.mode === "finding") {
        return `<div class="${esc(hostClass)}"${attributes} data-refpick="finding" data-refpick-query="${esc(state.query || "")}" role="group" aria-label="${label}">
          <span class="${p}-refpick-finding"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Finding ${esc(state.query || noun)}…</span>
        </div>`;
    }
    const candidates = Array.isArray(state.candidates) ? state.candidates : [];
    const message = state.message || (candidates.length > 1
        ? `${candidates.length} matches: choose one, search, or drop ${article(noun)} ${noun} here.`
        : `Search for the ${noun}, or drop it here.`);
    return `<div class="${esc(hostClass)}"${attributes} data-refpick="searching" data-refpick-query="${esc(state.query || "")}" role="group" aria-label="${label}">
      <span class="${p}-refpick-row">
        <span class="${p}-refpick-message">${esc(message)}</span>
        <button type="button" class="${p}-refpick-search" data-refpick-action="search" title="Open a search window for the ${esc(noun)}"><i class="fas fa-search" aria-hidden="true"></i> Search…</button>
      </span>
      ${candidates.length ? `<ul class="${p}-refpick-results" role="listbox" aria-label="${esc(`Matching ${noun}s`)}">${renderOptions(p, candidates)}</ul>` : ""}
    </div>`;
}

function article(noun) {
    return /^[aeiou]/i.test(noun) ? "an" : "a";
}

function renderOptions(p, candidates) {
    return candidates.map(candidate => `<li class="${p}-refpick-option" role="option" tabindex="-1" id="${p}-refpick-opt-${++optionCounter}" data-refpick-uuid="${esc(candidate.uuid)}" aria-selected="false">
        ${candidate.img ? `<img class="${p}-refpick-icon" src="${esc(candidate.img)}" alt="" loading="lazy">` : `<i class="fas fa-file ${p}-refpick-icon" aria-hidden="true"></i>`}
        <span class="${p}-refpick-name">${esc(candidate.name)}</span>
        <span class="${p}-refpick-source">${esc(candidate.location || (candidate.source === "world" ? "World" : candidate.pack || ""))}</span>
      </li>`).join("");
}

/**
 * Make a rendered field work. Safe to call again after a re-render; the handlers are replaced.
 * @param {HTMLElement} host - The element `renderReferencePicker` produced
 * @param {object} handlers
 * @param {"ai"|"ii"} [handlers.prefix]
 * @param {(query: string) => Promise<object[]>} handlers.search - Live results for the text
 * @param {(uuid: string) => Promise<object|null>} [handlers.describeUuid] - A pasted UUID as a candidate, or null
 * @param {(uuid: string) => Promise<boolean|void>} handlers.pick - Link this document (validate there); false keeps the window open
 * @param {() => Promise<void>|void} [handlers.clear] - Remove the link
 * @param {(event: DragEvent) => string|null} [handlers.uuidFromDrop] - The dropped document's UUID
 * @param {string} [handlers.noun]
 */
export function bindReferencePicker(host, handlers) {
    if (!host) return;
    const existing = bindings.get(host);
    if (existing) { existing.handlers = handlers; return; }
    const binding = { handlers, window: null };
    bindings.set(host, binding);
    const noun = () => binding.handlers.noun || "document";

    binding.pick = async uuid => {
        try { return await binding.handlers.pick(uuid); }
        catch (error) {
            globalThis.ui?.notifications?.error?.(`Reference field: ${error.message}`);
            return false;
        }
    };

    host.addEventListener("click", event => {
        const action = event.target.closest?.("[data-refpick-action]")?.dataset.refpickAction;
        if (action === "change" || action === "search") {
            event.preventDefault();
            openSearchWindow(host, binding, host.dataset.refpickQuery ?? "");
        } else if (action === "clear") {
            event.preventDefault();
            Promise.resolve(binding.handlers.clear?.()).catch(error => globalThis.ui?.notifications?.error?.(`Reference field: ${error.message}`));
        }
    });

    // The matches listed in the field for an ambiguous name.
    host.addEventListener("mousedown", event => {
        const option = event.target.closest?.("[data-refpick-uuid]");
        if (!option || option === host) return;
        event.preventDefault();
        binding.pick(option.dataset.refpickUuid);
    });
    host.addEventListener("keydown", event => {
        const option = event.target.closest?.(".ai-refpick-option, .ii-refpick-option");
        if (!option || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        binding.pick(option.dataset.refpickUuid);
    });

    host.addEventListener("dragover", event => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        host.classList.add("drag-over");
    });
    host.addEventListener("dragleave", event => {
        if (!host.contains(event.relatedTarget)) host.classList.remove("drag-over");
    });
    host.addEventListener("drop", event => {
        event.preventDefault();
        event.stopPropagation();
        host.classList.remove("drag-over");
        const uuid = (binding.handlers.uuidFromDrop ?? uuidFromDragEvent)(event);
        if (uuid) binding.pick(uuid);
        else globalThis.ui?.notifications?.warn?.(`Drop ${article(noun())} ${noun()} from the sidebar or a compendium.`);
    });
}

/** The UUID in a Foundry drag event, or null. */
export function uuidFromDragEvent(event) {
    let data = null;
    try {
        const editor = globalThis.foundry?.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
        data = editor?.getDragEventData?.(event) ?? null;
    } catch { data = null; }
    if (!data) {
        try { data = JSON.parse(event.dataTransfer?.getData?.("text/plain") ?? ""); } catch { data = null; }
    }
    return typeof data?.uuid === "string" && data.uuid.trim() ? data.uuid.trim() : null;
}

// ==========================================
// Search window
// ==========================================

/** Open (or bring forward) the search window of one field. */
export function openSearchWindow(host, binding, query = "") {
    if (binding.window?.rendered) {
        binding.window.bringToFront?.();
        binding.window.element?.querySelector?.("input")?.focus();
        return binding.window;
    }
    const Window = searchWindowClass();
    if (!Window) return null;
    const p = binding.handlers.prefix || "ai";
    const noun = binding.handlers.noun || "document";
    const rect = host.getBoundingClientRect();
    const width = 440;
    const height = 520;
    const viewWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewHeight = document.documentElement.clientHeight || window.innerHeight;
    // Beside the field when there is room, otherwise below it; always on screen.
    const besideLeft = rect.right + 12;
    const left = besideLeft + width <= viewWidth - 8 ? besideLeft : Math.max(8, Math.min(rect.left, viewWidth - width - 8));
    const top = Math.max(8, Math.min(rect.top - 40, viewHeight - height - 8));
    const app = new Window({ host, binding, prefix: p, noun, query }, {
        id: `${p}-refpick-window-${++pickerCounter}`,
        classes: [`${p}-refpick-window`],
        window: { title: `Find ${article(noun)} ${noun}`, icon: "fas fa-search" },
        position: { width, height, left, top }
    });
    binding.window = app;
    app.render({ force: true });
    return app;
}

/** The search window class, made on first use so the module loads without Foundry (Node tests). */
function searchWindowClass() {
    if (SearchWindowClass) return SearchWindowClass;
    const ApplicationV2 = globalThis.foundry?.applications?.api?.ApplicationV2;
    if (!ApplicationV2) return null;
    SearchWindowClass = class ReferenceSearchWindow extends ApplicationV2 {
        static DEFAULT_OPTIONS = {
            tag: "section",
            window: { resizable: true, minimizable: false },
            position: { width: 440, height: 520 }
        };

        constructor(refpick, options = {}) {
            super(options);
            this.refpick = { ...refpick, sequence: 0, active: -1, timer: null, watch: null, ownerApp: refpick.host.closest(".application") };
        }

        async _renderHTML() {
            const { prefix: p, noun, query } = this.refpick;
            const body = document.createElement("div");
            body.className = `${p}-refpick-window-body`;
            body.innerHTML = `<label class="${p}-refpick-bar">
                <i class="fas fa-search" aria-hidden="true"></i>
                <input type="text" class="${p}-refpick-input" value="${esc(query)}" maxlength="200" autocomplete="off" spellcheck="false"
                  role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${this.id}-results"
                  aria-label="${esc(`Search for the ${noun}`)}" placeholder="${esc(`Type ${article(noun)} ${noun} name or paste a UUID`)}">
              </label>
              <p class="${p}-refpick-window-note" aria-live="polite"></p>
              <ul class="${p}-refpick-results" id="${this.id}-results" role="listbox" aria-label="${esc(`Matching ${noun}s`)}"></ul>
              <p class="${p}-refpick-window-hint">Arrow keys and Enter, or click a match. Escape closes this window.</p>`;
            return body;
        }

        _replaceHTML(result, content) {
            content.replaceChildren(result);
        }

        async _onRender(context, options) {
            await super._onRender?.(context, options);
            const { prefix: p } = this.refpick;
            const input = this.element.querySelector(`.${p}-refpick-input`);
            const list = this.element.querySelector(`.${p}-refpick-results`);
            input.addEventListener("input", () => {
                clearTimeout(this.refpick.timer);
                this.refpick.timer = setTimeout(() => this.#search(input.value), SEARCH_DELAY_MS);
            });
            input.addEventListener("keydown", event => this.#onKey(event, input));
            list.addEventListener("mousedown", event => {
                const option = event.target.closest?.("[data-refpick-uuid]");
                if (!option) return;
                event.preventDefault();
                this.#pick(option.dataset.refpickUuid);
            });
            // The importer window closed: this search has nothing left to fill.
            clearInterval(this.refpick.watch);
            this.refpick.watch = setInterval(() => {
                if (this.refpick.ownerApp && !this.refpick.ownerApp.isConnected) this.close();
            }, 500);
            input.focus();
            input.select();
            this.#search(input.value);
        }

        _onClose(options) {
            super._onClose?.(options);
            clearTimeout(this.refpick.timer);
            clearInterval(this.refpick.watch);
            if (this.refpick.binding.window === this) this.refpick.binding.window = null;
        }

        #options() {
            return [...(this.element?.querySelectorAll(`.${this.refpick.prefix}-refpick-option`) ?? [])];
        }

        #onKey(event, input) {
            const options = this.#options();
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                if (!options.length) return;
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                this.refpick.active = (this.refpick.active + step + options.length) % options.length;
                options.forEach((option, index) => {
                    const active = index === this.refpick.active;
                    option.classList.toggle("is-active", active);
                    option.setAttribute("aria-selected", active ? "true" : "false");
                    if (active) {
                        input.setAttribute("aria-activedescendant", option.id);
                        option.scrollIntoView?.({ block: "nearest" });
                    }
                });
            } else if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                // The highlighted match, or the first (best) one, as in most search boxes.
                const chosen = options[this.refpick.active] ?? options[0] ?? null;
                if (chosen) this.#pick(chosen.dataset.refpickUuid);
                else this.#search(input.value);
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                this.close();
            }
        }

        async #pick(uuid) {
            const linked = await this.refpick.binding.pick(uuid);
            if (linked !== false) this.close();
        }

        async #search(text) {
            clearTimeout(this.refpick.timer);
            const { prefix: p, noun, binding } = this.refpick;
            const note = this.element?.querySelector(`.${p}-refpick-window-note`);
            const list = this.element?.querySelector(`.${p}-refpick-results`);
            const input = this.element?.querySelector(`.${p}-refpick-input`);
            if (!list || !note) return;
            const query = String(text ?? "").trim();
            const sequence = ++this.refpick.sequence;
            let results = [];
            let message = "";
            if (looksLikeUuid(query)) {
                const candidate = binding.handlers.describeUuid ? await binding.handlers.describeUuid(query) : null;
                if (sequence !== this.refpick.sequence || !this.rendered) return;
                results = candidate ? [candidate] : [];
                message = candidate ? "Press Enter or click to link this UUID." : `No ${noun} has that UUID in this world.`;
            } else if (query.length < MIN_QUERY_LENGTH) {
                message = `Type at least ${MIN_QUERY_LENGTH} letters to search.`;
            } else {
                results = await binding.handlers.search(query);
                if (sequence !== this.refpick.sequence || !this.rendered) return;
                if (!results.length) message = `No ${noun} matches "${query}".`;
                else if (results.length >= RESULT_LIMIT) message = `The first ${results.length} matches. Type more to narrow them down.`;
                else message = results.length === 1 ? "1 match." : `${results.length} matches.`;
            }
            this.refpick.active = -1;
            list.innerHTML = renderOptions(p, results);
            list.scrollTop = 0;
            note.textContent = message;
            input?.setAttribute("aria-expanded", results.length ? "true" : "false");
            input?.removeAttribute("aria-activedescendant");
        }
    };
    return SearchWindowClass;
}
