## OPTIONAL ACTIVITIES AND ACTIVE EFFECTS

The core Item fields and description import without `5e-activity-importer`. Description enrichers create clickable text; they do not construct attack, saving throw, damage, healing, or condition activities. The importer does not generate those mechanics from strict YAML description text. Some item types receive generic system defaults, which do not reproduce arbitrary source rules.

For a functional item with source-defined rolls or effects, include the appropriate `Activities` and/or `effects` entries when Activity Importer is available for this workflow or the user requests its support. This includes a spell's primary save and damage, not only extra actions. Use the matching complete Activity Importer templates from `modules/5e-activity-importer/templates/Base Activity Templates/`, or the MIDI variants when that automation is intended. Preserve source mechanics, triggers, costs, and scaling; never invent mechanics, UUIDs, macros, or module-specific effect keys. If a rule cannot be represented, retain it in the description for manual resolution.

In free/core mode, or when companion support is unavailable or unspecified, omit these sections and preserve the full rules in the description. The resulting import does not promise automated use of those rules. Do not add empty placeholder entries. Both sections require the companion module to be active at import time, and the selected dnd5e Item type must support the requested activities.

Append supported sections at the same indentation as `DESCRIPTION` and `CHAT_FLAVOR`, beneath the Item type key:
- `Activities` is an array. Each entry contains exactly one `ACTIVITY_*` key and the corresponding activity body. Multiple activities of the same type are separate array entries; do not insert `---` inside this array.
- `effects` is an array of effect bodies beginning with `DETAILS`, without an `EFFECT:` wrapper. Use these for passive item effects. Effects applied by an activity belong in that activity's `APPLIED_EFFECTS` array instead; do not duplicate them here.
- For effects on Foundry 14, use DURATION.Value and DURATION.Units; units may be years, months, days, hours, minutes, seconds, rounds, or turns. Use a nonnegative integer Value, or null for no finite duration.

Use canonical string `Change Type` and a status list. Preserve the YAML type of each `CHANGES[].Value`: a number, boolean, string, list, mapping, or null must match the intended change. Do not quote everything. Legacy numeric `Change Mode` and separate duration labels remain accepted input. Optional Activity ID and Effect ID values must contain exactly 16 alphanumeric characters; omit them when stable references are unnecessary.

The completed examples below demonstrate array nesting for a passive +1 AC ward and an action that deals 1d6 fire damage. They are illustrative only: include them only if the source actually grants those mechanics, and use the full matching companion template for the requested activity type.

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
  Activities:
    - ACTIVITY_DAMAGE:
        ACTIVITY:
          Name: "Fire Burst"
          Icon: n/a
        ACTIVATION:
          Override Activation: true
          Activation Type: action
          Activation Cost: 1
          Condition: n/a
        DURATION:
          Override Duration: true
          Duration Time: inst
          Special Duration: n/a
          Duration Amount: n/a
          Concentration: false
        DAMAGE_DETAILS:
          Allow Critical: false
          Extra Critical Damage Formula: n/a
        DAMAGE:
          DAMAGE_PARTS:
            - DAMAGE_DATA:
                Dice Count: 1
                Die Denomination: 6
                Bonus: ""
                Damage Types: [fire]
                Modifiers: []
                Custom Enabled: false
                Custom Formula: ""
                Scaling Mode: none
                Scaling Dice Count: 1
                Scaling Formula: ""
        APPLIED_EFFECTS: []
```

---
