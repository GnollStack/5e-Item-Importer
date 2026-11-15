## OPTIONAL PASSIVE ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct roll activities or passive bonuses. Strict YAML description text does not generate automation.

Loot and Container items do not expose `system.activities` in dnd5e 6. Never emit an `Activities` section for either type. Keep active mechanics in the description for manual use. A different, activity-capable Item type is appropriate only when it fits the source and the requested workflow; do not silently change the Item type to add automation.

If the source grants a passive effect and premium/full mode is selected, append `effects` at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key. This requires the companion module to be active at import time. Use the complete Effect template from `modules/5e-activity-importer/templates/Base Activity Templates/`, or its MIDI variant when that automation is intended. Preserve source mechanics; never invent bonuses, UUIDs, macros, or module-specific effect keys. Without companion support, omit `effects` and retain the complete rules in the description.

The `effects` section is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Omit the section or use `effects: []` when there are no entries. On Foundry 14, use `DURATION.Value` (nonnegative integer or null for no finite duration) and one `DURATION.Units` value: years, months, days, hours, minutes, seconds, rounds, or turns.

Use canonical string `Change Type` and a status list. Preserve the YAML type of each `CHANGES[].Value`: a number, boolean, string, list, mapping, or null must match the intended change. Do not quote everything. Legacy numeric `Change Mode` and separate duration labels remain accepted input. Optional Activity ID and Effect ID values must contain exactly 16 alphanumeric characters; omit them when stable references are unnecessary.

This completed example demonstrates array nesting for a passive +1 AC ward. Include it only if the source actually grants that mechanic; it is an illustration, not a default effect.

```yaml
  effects:
    - DETAILS:
        Name: "Armor Ward"
        Effect Type: base
        Effect Suspended: false
        Apply Effect to Actor: true
        Status Conditions: []
      EFFECT_DESCRIPTION:
        Effect Description: "Grants +1 AC while this item's passive effect is active."
      DURATION:
        Value: null
        Units: seconds
      CHANGES:
        - Attribute Key: system.attributes.ac.bonus
          Change Type: add
          Change Phase: initial
          Value: 1
          Priority: 20
```

---
