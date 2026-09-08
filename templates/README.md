# Item Importer generation guide

5e Item Importer is free and works standalone. The forthcoming optional premium 5e Activity Importer adds authored activity/effect import and full Item YAML export when installed. It is not included in this free release. Premium examples below apply only when companion availability is explicitly confirmed or premium output is requested. The same strict Item format supports both workflows.

## Choose a generation mode

| Mode | What the LLM should generate |
|---|---|
| **Free/core (default)** | Core Item fields and complete source rules in descriptions. Omit `Activities` and `effects` entirely. |
| **Premium/full** | The same core Item fields and descriptions, plus supported source-defined activities/effects using the premium companion's matching strict templates. |

Choose premium/full only when explicitly requested or when Activity Importer availability is confirmed. Unknown availability defaults to free/core. An explicit free/core request wins even when both modules are installed. These names are prompt instructions, not YAML keys or a new schema version.

Give an LLM your source text and the relevant [strict Item template](YAML%20Templates/) with one of these prompts:

```text
Generate a free/core Item for the standalone 5e Item Importer using the supplied
strict template. Preserve all source rules in descriptions. Omit Activities
and effects. Return only one YAML code block, without mode fields or commentary.
```

```text
Generate a premium/full Item for 5e Item Importer. I have the premium
5e Activity Importer available and have supplied its matching Activity/Effect
templates. Preserve the full source rules in descriptions and add only supported
source-defined attachments. Return only one YAML code block, without mode fields
or commentary. Do not invent UUIDs, bonuses, or automation requirements.
```

Activity Importer must be active when attachments are imported. If it is absent, the base Item still imports and attachments are skipped with warnings. Core YAML export remains available independently; full export needs the companion serializers for activities/effects.

Free imports retain normal dnd5e Item fields and system behavior. Description enrichers provide clickable text but do not generate source-specific activities. Loot and Container support passive `effects` only and must never include `Activities`. MIDI-QOL and DAE are separate optional integrations; select their fields only when that automation is intended and available.
