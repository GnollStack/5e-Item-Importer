# Concrete authoring examples

Each file is complete YAML for its stated destination. Examples are stored-data/validation examples; gameplay remains a separate check. Source descriptions are the Intent entries below. Full references retain their first YAML block for field completeness; marked concrete blocks match these files.

| Example | Intent | Prerequisites |
| --- | --- | --- |
| [core-weapon](core-weapon.yaml) | A free/core weapon import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-equipment](core-equipment.yaml) | A free/core equipment import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-consumable](core-consumable.yaml) | A free/core consumable import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-tool](core-tool.yaml) | A free/core tool import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-container](core-container.yaml) | A free/core container import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-loot](core-loot.yaml) | A free/core loot import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [core-spell](core-spell.yaml) | A free/core spell import. Preserve the complete description; it does not automatically create source-specific activities or effects. | 5e Item Importer. Activity Importer is not required for this example. |
| [full-native-weapon](full-native-weapon.yaml) | A complete native item with two authored activities, shared parent-item charges and a passive ward. | Both importers; equip and attune the weapon to use its passive ward. |
| [full-midi-weapon](full-midi-weapon.yaml) | Tempest's Oath: five activities, six shared charges, a hidden MIDI save follow-up, an applied prone effect and a passive AC ward. | Both importers and MIDI-QOL. Check module automation settings and token targets. End the prone effect when the creature stands; the catalog has not tested this combat sequence. |

For complete Items, use Item Importer. For individual Activity/Effect files, use Activity Importer; Forward examples are complete two-document batches. The core Item examples intentionally preserve descriptive mechanics without authoring companion automation.

Bundled Fireball/Wolf references require their listed compendium entries. Effect duration processing and standing from prone require normal world handling; validation does not simulate them. Tempest's Oath stores a MIDI follow-up identifier whose gameplay resolution is not a native Forward dependency check.

Run the source-only Test-TemplateAuthoring tool and the appropriate live read-only diagnostics. Do not describe a parse-only or schema-only result as a gameplay result. Machine-specific reports belong in ignored private maintenance storage.
