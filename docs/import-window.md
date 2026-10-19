# Using the Item Importer window

This guide covers the unreleased window improvements. Older screenshots may show **Parse** instead of **Preview**, or an always-visible normalized YAML panel. Item Importer remains free and standalone with its existing supported Item types.

## Prepare, preview and import

1. Open **Import Item** from the Items Directory. With Activity Importer enabled, use the shared directory dropdown.
2. Paste a natural-language Item description, supported stat block or strict YAML into **Item source**. You can edit YAML directly in this main box. Templates, recipes and saved presets share the picker beside it; **Manage** opens Save/Delete controls. Replacing an existing draft asks for confirmation.
3. Click **Preview**, or use **Ctrl+Enter**, and inspect the mechanics and **Review** findings. Auto-parse is enabled by default. Technical **Parser details** start collapsed.
4. Check the destination summary and duplicate policy. **Change** opens the folder, Actor or compendium choices. Choose whether to create another Item, update imported fields, fill missing fields or skip a duplicate; batch entries retain their individual overrides.
5. Click **Import** after resolving errors and required references. Enable **Compare after import** in **Import options** beforehand if you want a comparison with the resulting Item data. Test intended gameplay separately.

Natural-text parsing detects supported fields; it does not reconstruct every rule as automation. Keep the source description and review the generated values. The [natural-language template](../templates/Naturalized%20Item%20Template.md) gives useful input patterns, and the [generation guide](../templates/README.md) covers strict YAML.

## Inspect or edit generated YAML

The optional second editor is useful when starting with prose: it lets you inspect the strict YAML produced from the preview while retaining the original description above.

1. Enable **View options > Show generated YAML editor**. It is hidden by default, and the choice is remembered.
2. Preview the Item source. The editor shows supported parsed values and defaults, including supported attachments. This is the generated representation of the Item, not a list containing only phrases detected in the source; use **Review** and **Parser details** for parsing findings.
3. Edit the generated YAML if needed. These edits do not change the main source or the current preview yet.
4. Choose **Use and preview** to put the edited YAML into **Item source** and preview it. This replaces the prose in the main box, so save a preset first if you want to keep that original wording for later editing.

**Copy generated YAML** and **Download YAML** are available even when the editor is hidden. They export the current parsed preview, not unapplied changes in the second editor. Apply those edits with **Use and preview** before copying or downloading them. An export error is shown explicitly; the exporter does not substitute prose or silently omit unsupported attachments. Fix the reported issue before relying on the output.

## Import options and attachments

**Import options** groups Auto-parse, Compare after import, identification, icons, image selection and available automation preferences. The image selection mode appears when **Match compendium icons** is enabled. The optional random seed appears only for **Random top match**. Hiding those controls retains their values.

**Add activities or effects** appears for a valid single-Item preview when the compatible premium Activity Importer companion is available. It does not appear for empty input or a batch. It returns attachment data to the Item preview; the normal **Import** action performs the write. Required references have contextual resolution controls, including Search and drag-and-drop when the companion provides them. Resolve ambiguous or missing links before importing.

Warnings, errors, missing references and batch selection controls remain visible in both preview modes. Suggestions from natural text still require review; previewing does not execute macros, effects or MIDI-QOL workflows.

## Choose what to show

Open **View options** to adjust the window. Preferences are remembered separately for each importer, world and user in the current browser.

| Option | Default and behavior |
| --- | --- |
| **Preview detail** | **Full** keeps the mechanical preview expanded. **Compact** starts detail sections closed. Technical Parser details remain collapsed initially. |
| **Keep input help visible** | Off. Shortcut and drop help hides once source text is present. |
| **Show generated YAML editor** | Off. Enable the secondary editor described above. |
| **Show Import History** | Off. Enable session entries, Undo and report download. |
| Panel headings | Click a heading, or focus a preview heading and press Enter/Space. Open and closed states are remembered. |

History stays hidden until you enable it, including after new imports. When enabled, it expands after an import. Hiding it keeps its records and Undo eligibility intact. History is session-only and clears when the client reloads; download a report if you need a record. Undo checks whether the imported documents are still eligible before reversing an import; it does not provide a general world backup.

## Restore defaults

| Button | What it resets |
| --- | --- |
| **View options > Reset layout** | View preferences only: Full previews, optional help, generated YAML editor and History off, and panel/preview expansion defaults. Import options are retained. |
| **Import options > Restore defaults** | The controls in Import options and all View options. Auto-parse, semantic icons, identification and compendium image preferences return to their registered defaults. Compare after import and natural-text automation suggestions turn off, the random seed clears, and the animation option returns to its initial available state. The preview refreshes with these defaults. |

Both buttons preserve Item source, unapplied generated-YAML edits, the selected destination and duplicate policy, saved presets and import history. They affect this importer only. **Restore defaults** is scoped to the import window; unrelated module settings and integration configuration are unchanged. The editor is hidden again after either reset; enable it to resume your preserved edits.

See [authoring rules](template-authoring.md), [example prerequisites](examples/README.md), and [schema 4 automation](automation-schema-4.md) for supported data and integration requirements.
