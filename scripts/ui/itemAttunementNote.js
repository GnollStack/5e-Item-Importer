import { MODULE_NAME } from "../itemConfig.js";
import { localize } from "./itemWorkflowServices.js";

export const ATTUNEMENT_AUTO_EXPAND_LIMIT = 90;

export function renderAttunementRequirement(app, html) {
    const item = app?.document ?? app?.item;
    const root = globalThis.jQuery && html instanceof globalThis.jQuery ? html.get(0) : html;
    if (!root) return;

    const existing = root.querySelector(".ii-attunement-note");
    const requirement = item?.getFlag?.(MODULE_NAME, "attunementRequirement")
        ?? item?.flags?.[MODULE_NAME]?.attunementRequirement;
    const requirementText = String(requirement ?? "").trim();
    const attunement = item?.system?.attunement;
    const applies = requirementText && attunement != null && attunement !== ""
        && attunement !== 0 && attunement !== "none";
    if (!applies) {
        existing?.remove();
        return;
    }

    const preserveOpenState = existing?.tagName === "DETAILS"
        && existing.dataset.requirement === requirementText;
    const shouldOpen = preserveOpenState
        ? existing.open
        : requirementText.length <= ATTUNEMENT_AUTO_EXPAND_LIMIT;
    const note = existing?.tagName === "DETAILS" ? existing : document.createElement("details");
    note.className = "ii-attunement-note";
    note.dataset.requirement = requirementText;
    note.title = requirementText;
    note.replaceChildren();

    const summary = document.createElement("summary");
    summary.className = "ii-attunement-note__summary";

    const linkIcon = document.createElement("i");
    linkIcon.className = "fas fa-link";
    linkIcon.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "ii-attunement-note__label";
    label.textContent = localize("II.Attunement.Summary", "Attunement Requirement");

    const preview = document.createElement("span");
    preview.className = "ii-attunement-note__preview";
    preview.textContent = requirementText;

    const chevron = document.createElement("i");
    chevron.className = "fas fa-chevron-right ii-attunement-note__chevron";
    chevron.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "ii-attunement-note__content";
    content.textContent = requirementText;
    content.title = requirementText;

    summary.append(linkIcon, label, preview, chevron);
    note.append(summary, content);
    note.open = shouldOpen;

    if (existing && existing !== note) existing.replaceWith(note);
    const attunementInput = root.querySelector('[name="system.attunement"]');
    const attunementRow = attunementInput?.closest(".split-group")
        ?? attunementInput?.closest(".form-group")
        ?? root.querySelector(".sheet-header");
    attunementRow?.insertAdjacentElement("afterend", note);
}
