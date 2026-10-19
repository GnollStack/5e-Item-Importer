import yaml from "../vendor/js-yaml.mjs";
import { writePath } from "../explicitYamlFields.js";

/** Recipe staging only. Import remains the window's existing explicit action. */
export async function prepareRecipeText(recipe, currentText = "") {
    const Dialog = globalThis.foundry?.applications?.api?.DialogV2;
    if (String(currentText).trim() && currentText.trim() !== recipe.text.trim()) {
        const replace = await Dialog?.confirm({ window: { title: "Replace current draft?" },
            content: "<p>Loading this template replaces the current text. Cancel to save your draft first.</p>", rejectClose: false, defaultYes: false });
        if (!replace) return null;
    }
    if (!recipe.links?.length) return recipe.text;
    const data = structuredClone(recipe.data);
    for (const link of recipe.links) {
        const uuid = await Dialog?.prompt({ window: { title: "Choose recipe reference" },
            content: `<p>Paste the UUID of an existing ${link.documentName} for this recipe.</p><input name="uuid" type="text" required aria-label="Document UUID">`,
            rejectClose: false, ok: { label: "Use Reference", callback: (_event, button) => button.form.elements.uuid.value.trim() } });
        if (!uuid) return null;
        const document = await globalThis.fromUuid?.(uuid);
        if (!document || document.documentName !== link.documentName || link.type && document.type !== link.type
            || link.standalone && (document.parent || document.isEmbedded)) {
            ui.notifications.warn("That UUID does not identify the required document. Your draft was kept.");
            return null;
        }
        writePath(data, link.path, link.list ? [uuid] : uuid);
    }
    return yaml.dump(data, { lineWidth: -1, noRefs: true }).trim();
}
