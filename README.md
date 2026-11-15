<div align="center">

# 5e Item Importer

**Stop manually typing items.**

[![Latest Release](https://img.shields.io/github/v/release/GnollStack/5e-Item-Importer?label=Latest%20Release&style=flat-square)](https://github.com/GnollStack/5e-Item-Importer/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/5e-item-importer.zip?label=Downloads&style=flat-square&color=green)](https://github.com/GnollStack/5e-Item-Importer/releases)
[![Latest Downloads](https://img.shields.io/github/downloads/GnollStack/5e-Item-Importer/latest/5e-item-importer.zip?label=Latest%20Downloads&style=flat-square)](https://github.com/GnollStack/5e-Item-Importer/releases/latest)
[![Foundry VTT v14](https://img.shields.io/badge/Foundry-v14-orange?style=flat-square)](https://foundryvtt.com)
[![Patreon: Bazaar Patron](https://img.shields.io/badge/Patreon-Bazaar%20Patron-F96854?style=flat-square&logo=patreon&logoColor=white)](https://www.patreon.com/cw/GnollStack)
[![Discord: Bakshi's Bazaar](https://img.shields.io/badge/Discord-Bakshi%27s%20Bazaar-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/tcdYk54fxC)

*For GMs who want D&D 5e items imported from text instead of typed by hand.*

[Preview](#preview) · [Quick Start](#quick-start) · [Features](#features) · [Templates](#template-reference) · [Installation](#installation) · [Changelog](https://github.com/GnollStack/bakshis-bazaar-archives/blob/main/5e-item-importer/CHANGELOG.md) · [Compatibility](#compatibility) · [API](#developer-api) · [Bakshi's Bazaar](#bakshis-bazaar) · [Community](#community) · [Contributing](#contributing) · [AI Use](#ai-use) · [License](#license-permissions)

</div>

---

<div align="center">

## Feature Index

| Feature | What it does |
| :--- | :--- |
| **[Paste a Stat Block](#natural-language-parser)** | Copy an item from a book, PDF or website and import it. |
| **[Fill In a Template](#strict-format-parser)** | Build tricky homebrew field by field. |
| **[Let a Chatbot Fill It In](#chatbot-workflow)** | Have Claude, ChatGPT or another chatbot fill in the template from an item's rules text. |
| **[Feats & Features](#features-and-advancement)** | Class features, feats and monster traits, with everything a feat grants. |
| **[A Whole Shop at Once](#batch-imports)** | Import a merchant's stock or a loot pile in one paste, bags with their contents. |
| **[Safe Imports](#import-workflow)** | Preview first, choose where it goes, and undo this session's imports. |
| **[Activity Importer Companion](#activity-importer-companion)** | Premium: Items arrive with working attacks, saves, healing and effects. |

*5e Item Importer is free and works on its own. Paste a stat block or fill in a template. The premium [5e Activity Importer companion](#activity-importer-companion) makes imported Items work at the table.*

</div>

---

<div align="center">

<a id="preview"></a>

## Preview

</div>

<div align="center">

<img width="640" height="865" alt="5e Item Importer preview" src="https://raw.githubusercontent.com/GnollStack/bakshis-bazaar-archives/main/5e-item-importer/images/5e-item-importer-preview.png" />

</div>

### See it in Action on YouTube

- [5e Importer V13.2.0](https://youtu.be/THrikJq0EY4)
- [5e Importer V13.7.2](https://youtu.be/dyhUoiNYxmA?si=DozAjOLjFGEmcAk-)

---

<div align="center">

<a id="quick-start"></a>

## Quick Start

</div>

1. Install and enable **5e Item Importer** in your world.
2. Open the **Items Directory** in Foundry.
3. Click **Import Item**.
4. Paste the item text and click **Preview**.
5. Review the result, choose a destination, and click **Import**.

---

<div align="center">

<a id="features"></a>

## Features

</div>

<a id="natural-language-parser"></a>

### Paste a Stat Block

*Best for: items from books, PDFs, websites and your notes.*

Copy the item as it's printed, paste it into **Import Item**, and click **Preview**. The importer picks out the name, type, rarity, price, weight, damage, properties and description, and shows you the Item before anything is created. It reads the usual stat block layout best:

```text
Stormglass Rapier
Weapon (rapier), rare (requires attunement)
Cost: 2500 gp, Weight: 2 lb.
Damage: 1d8 piercing
Properties: Finesse

This slender blade is forged from blue crystal that hums before a storm. The wielder has a +1 bonus to attack and damage rolls made with this magic weapon.
```

Put the name alone on the first line and leave a blank line before the description. If a value comes out wrong, fix it in the preview or use a template. The [stat block guide](templates/Naturalized%20Item%20Template.md) lists the phrases the importer recognizes, with more examples.

---

<a id="strict-format-parser"></a>
<a id="template-reference"></a>

### Fill In a Template

*Best for: tricky homebrew, and anything pasted text gets wrong.*

Pick a template in the window, fill in the fields, and click **Preview**. Every setting has its own field, so nothing is guessed, and the preview names anything to fix. There are templates for weapons, armor and other equipment, consumables, tools, loot, containers, spells and features, plus ready-made recipes such as an item with several rarities or charges that return at dawn. For a quick draft, a few lines such as `name:` and `type:` are enough.

The [template guide](templates/README.md) has every template, ready-to-import examples, and the rules for each field. A filled-in template looks like this:

<a id="validated-yaml-stormglass-rapier"></a>

<details>
<summary><strong>⚔️ Stormglass Rapier (`WEAPON`)</strong></summary>


```yaml
SCHEMA_VERSION: 7
WEAPON:
  ITEM:
    Name: "Stormglass Rapier"
    Rarities: [rare]
    Weapon Type: martialM
    Base Weapon: rapier

  INVENTORY:
    Quantity: 1
    Identified: true
    Equipped: false

  COST_AND_WEIGHT:
    Price Value: 2500
    Price Denomination: gp
    Weight Value: 2
    Weight Units: lb

  PROPERTIES:
    Adamantine: false
    Ammunition: false
    Magical: true
    Finesse: true
    Firearm: false
    Focus: false
    Heavy: false
    Light: false
    Loading: false
    Reach: false
    Reload: false
    Returning: false
    Silvered: false
    Special: true
    Thrown: false
    Two-Handed: false
    Versatile: false

  ATTUNEMENT:
    Attunement: required
    Attunement By: n/a
    Magic Bonus: 1

  RANGE:
    Reach: 5
    Range Normal: n/a
    Range Long: n/a
    Range Units: ft

  DAMAGE:
    Damage Formula: "1d8[piercing] + 1d6[lightning]"
    Damage Type: piercing

  MASTERY:
    Mastery: vex

  PROFICIENCY:
    Proficient: Automatic

  USAGE:
    Uses Spent: 0
    Uses Max: 3

  RECOVERY:
    - Period: dawn
      Type: formula
      Formula: "1d3"

  DESCRIPTION:
    Description: |
      <p>This slender blade is forged from blue crystal that hums before a storm.</p>
      <p>You have a +1 bonus to attack and damage rolls made with this magic weapon.</p>
      <p><strong>Stormglass Edge.</strong> When [[lookup @name]]{the creature} hits with this weapon, the target takes an extra [[/damage 1d6 lightning average]].</p>
      <p><strong>Thunderhead Lunge.</strong> [[lookup @name]]{The creature} can expend 1 charge to force the target to make a [[/save con 14 format=long]] or be &Reference[deafened] until the end of its next turn.</p>

  UNIDENTIFIED_DESCRIPTION:
    Unidentified Name: "Blue Crystal Rapier"
    Unidentified Description: |
      <p>A finely balanced rapier with a translucent blue blade and a faint static hum.</p>

  CHAT_FLAVOR:
    Chat Description: |
      [[lookup @name]]{The creature} thrusts with a storm-bright blade.
```

</details>

---

<a id="chatbot-workflow"></a>

### Let a Chatbot Fill It In

*Best for: turning rules text into Items without typing the template yourself.*

The templates are written strictly so chatbots like Claude, ChatGPT and Gemini fill them in correctly, quickly, and only in a way Foundry can understand. Give yours the free [Importer LLM Pack](https://github.com/GnollStack/bakshis-bazaar-archives/tree/main/importer-llm-pack/14.4.0) and it writes complete Items from an item's rules text, one at a time or a whole batch. For best results:

1. Create a chat or project in your chatbot, a Claude or ChatGPT Project works well, paste the pack's project instructions, and upload the files its README lists for your modules.
2. Paste the item's rules text and ask for the Item along with what you want said item to do.
3. Paste the answer into **Import Item** and click **Preview**.
4. If anything is flagged, **Copy problems** gives the chatbot exactly what to fix.

**You use your own chatbot;** <ins>**the module never contacts one**</ins>. Preview shows exactly what will be created and flags anything the importer can't use before it reaches your world. With the [Activity Importer companion](#activity-importer-companion), the chatbot can add the Item's activities, such as attacks and saves, and its effects as well. The import window links the pack for your installed version.

---

<a id="features-and-advancement"></a>

### Feats & Features

*Best for: class features, feats, species traits and monster traits.*

Paste a feature with its header line, such as "General Feat (Prerequisite: Level 4+)" or "3rd-level Fighter feature", or use the Feature template. Uses per rest or recharge, prerequisites and the full text come along.

A feat can also carry what it grants, such as an ability score increase, spells, proficiencies or a choice from a list, so dropping it on a character applies them. Spells and items can be named instead of linked: the preview links each one it finds and gives you a drop zone for any it can't.

---

<a id="batch-imports"></a>

### A Whole Shop at Once

Paste a merchant's stock, a treasure hoard or a whole adventuring kit in one go. The preview lists every Item, and you choose which to import. A bag or chest can bring its contents, which arrive inside it. The [template guide](templates/README.md#several-items-in-one-paste) shows how to write several Items in one paste.

---

<a id="import-workflow"></a>

### Safe Imports

Choose where Items go: a world folder, a character, or a compendium you can edit. If an Item with the same name already exists, add a copy, update it, merge, or skip it; an update shows what will change first. Spells, items and containers an Item mentions are linked by name, and anything not found gets a drop zone in the preview.

**Copy problems** copies whatever the preview flags together with your YAML. **View options > Show Import History** keeps this session's imports with **Undo**. The [import-window guide](docs/import-window.md) covers every control.

---

<a id="activity-importer-companion"></a>

### Activity Importer Companion

5e Item Importer creates Items on its own. Add the premium **5e Activity Importer** and the same import brings the Item's attacks, saves, damage, healing and effects, so it works at the table right away.

- **One menu:** **Import Item** joins Activity Importer's **Add Activity / Effect** menu in the Items Directory. Turn off **Merge with Activity Importer Dropdown** to keep a separate button.
- **Mechanics included:** templates can carry activities and effects; [full-native-weapon.yaml](docs/examples/full-native-weapon.yaml) is a complete example.
- **Checked first:** activities, effects and the spells or creatures they link are checked before anything is written.
- **With or without MIDI-QOL:** MIDI-QOL settings are kept where it runs, and left out with a note where it doesn't.
- **Share it:** right-click an Item and choose **Copy Full Item YAML** or **Download Full Item YAML** to export it with its mechanics.

Without the companion, the Item itself still imports, and the preview says the mechanics will be skipped.

<div align="center">

![Importing Rimeheart as a complete spear with activities and effects](https://raw.githubusercontent.com/GnollStack/bakshis-bazaar-archives/main/activity-Importer-5e/gifs/Import-Full-Item.gif)

</div>

Activity Importer is available to [Bazaar Patrons](https://www.patreon.com/cw/GnollStack) through Foundry Premium Content and works with 5e Item Importer 14.4.0 or later.

---

### More Details

<details>
<summary><strong>Settings</strong></summary>

Open **Configure Settings → 5e Item Importer**. Each setting applies to your browser only, except Enable MCP Diagnostics, which applies to the world.

| Setting | Default | What it does |
| --- | --- | --- |
| Auto-Parse on Input | On | Previews while you type |
| Auto-Parse Delay (ms) | 1000 | How long to wait after typing stops |
| Default Item Type | Adventuring Gear | Used when the text doesn't name a type |
| Create Items as Identified | On | Imported Items start identified |
| Match Icons from Compendiums | On | Takes the icon of a matching compendium Item |
| Compendium Image Selection | Best deterministic match | Or a random pick among the top matches |
| Use Semantic Random Icons | On | A random fitting dnd5e icon, such as a sword for a longsword; wins over compendium icons |
| Merge with Activity Importer Dropdown | On | Puts **Import Item** in Activity Importer's menu |
| Replace Generated Default Activities | On | Stops dnd5e adding its default attack or check when your YAML has its own |
| Show Parse Results, Show YAML Normalization Warnings, Debug Logging | Off | Extra troubleshooting messages |
| Enable MCP Diagnostics | Off | Advanced diagnostics; leave off during play |

Presets and your last destination are saved in your browser.

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

**A pasted stat block came out wrong.**
> Check the preview before importing. Clear labels such as `Damage:`, `Properties:` and `Weight:` help. For complicated Items, use a template.

**Icons aren't matching automatically.**
> Turn on **Match Icons from Compendiums** in the module settings. It works best when the name includes a known base item or type, such as "Stormglass Rapier" or "Potion of Sunlit Breath". **Use Semantic Random Icons** wins over it, so turn that off to prefer compendium icons, and use **Compendium Image Selection** to choose between the best match and a random top match.

**Description is empty.**
> For pasted text, leave a blank line between the stats and the description.
> In a template, write `Description: |` and indent the text beneath it, as the templates show.

</details>

---

<div align="center">

<a id="installation"></a>

## Installation

</div>

1. Foundry -> **Add-on Modules** -> **Install Module**.
2. Search "5e Item Importer", or paste this manifest URL:

```text
https://github.com/GnollStack/5e-Item-Importer/releases/latest/download/module.json
```

3. Enable the module in your world.

| Requirement | Version |
| --- | --- |
| Foundry VTT | v14 only, build 14.367 or later; verified on 14.370 |
| dnd5e | 6.0.6 minimum; verified on 6.0.6 and 6.1.0 |
| [5e Activity Importer](https://foundryvtt.com/packages/5e-activity-importer) | Optional premium companion; see [Activity Importer Companion](#activity-importer-companion) |

---

<div align="center">

<a id="compatibility"></a>

## Compatibility

</div>

**Foundry VTT:** v14 only, build 14.367 or later; verified on **14.370**. For a world that stays on Foundry v13, use 5e Item Importer 13.9.1.

**Game system:** **dnd5e** 6.0.6 minimum; verified on **6.0.6** and **6.1.0**.

**Optional modules:** **5e Activity Importer** 14.4.0 or later adds activities and effects to imported Items; Item Importer works fully without it, and an older companion shows an update message for attachments while Items still import. **Token Name Lookup** can make `[[lookup @name]]` text prefer token names.

---

<div align="center">

<a id="developer-api"></a>

## Developer API

</div>

Macros and other modules can import, export and undo Items through `game.modules.get("5e-item-importer").api`.

<details>
<summary><strong>API reference</strong></summary>

```js
const api = game.modules.get("5e-item-importer").api;
api.schemaVersion; // Public API schema 3
api.capabilities.exportModes; // ["core", "full"]
const preview = api.parseWithInsights(sourceText);
await api.import(sourceText, {
  destination: { kind: "actor", actorUuid: actor.uuid },
  duplicateMode: "merge",
  confirmExisting: true
});
const coreYaml = await api.export(item);       // Standalone default: Item fields only
const fullYaml = await api.exportFull(item);   // Explicit companion export
const sameFullYaml = await api.export(item, { mode: "full" });
await api.copyExport(item);
await api.downloadExport(item);
```

API undo is intentionally explicit: `api.history.undo(sessionId, { confirmed: true })`. The legacy `api.import(text, folderId)` signature remains supported.

`api.import()` creates one Item. A `CONTAINER` with nested `CONTENTS` returns an error that points to the import window's batch flow, and an Item with an unresolved reference (a granted item, choice pool entry, or container) returns the missing references as issues without creating anything.

New strict YAML starts with `SCHEMA_VERSION: 7`. Older versions (0 to 6) still import, and YAML that declares a newer version than the installed importer knows is refused instead of half-imported. Schema 7 added food properties and Unidentified Contents; 6 added feature advancement, container contents and document references; 5 added the `FEAT` root and combat recovery periods; 4 added typed automation storage.

**Core export** (`api.export()`, the default, and **Copy Core Item YAML**) writes the Item without activities or effects. **Full export** (`api.exportFull()`, `{ mode: "full" }` and the Full Item YAML menu entries) adds them through Activity Importer; when something can't be written out exactly, it stops with an error instead of dropping it. Batch exports separate Items with `---`.

Item properties without a field of their own use this shape:

```yaml
CUSTOM_PROPERTIES:
  Registered:
    - "registeredPropertyId"
  Metadata:
    my-module.note: "Namespaced metadata only"
```

`Registered` takes only property ids that dnd5e registers for that Item type. `Metadata` needs namespaced keys and is stored in the importer's flags, never in `system` data.

`api.parse(text, { trace: true })` returns the parsed Item together with where each value came from. Check that a function exists before calling it, since the API grows between versions.

</details>

---

<div align="center">

<a id="bakshis-bazaar"></a>

## Bakshi's Bazaar

*5e Item Importer is free. My premium modules are released as **Bakshi's Bazaar** for [Bazaar Patrons](https://www.patreon.com/cw/GnollStack) and install through Foundry's Premium Content.*

</div>

| Module | What it adds |
| --- | --- |
| **[5e Activity Importer](https://foundryvtt.com/packages/5e-activity-importer)** | Import Items together with their activities and Active Effects. See [Activity Importer Companion](#activity-importer-companion). |
| **[Custom Currency 5e](https://foundryvtt.com/packages/custom-currency-5e)** | Custom coins, exchange rates, regional markets, and physical coin items on native dnd5e sheets. |
| **[FileSmith](https://foundryvtt.com/packages/filesmith)** | Folder colors, multi-select, clipboard actions, and move undo for Foundry's sidebar. |
| **[Immersive Vision FX](https://foundryvtt.com/packages/immersive-vision-fx)** | Soft vision and light edges, creature vision profiles, cave light, and eyeshine. |
| **[Traffick](https://foundryvtt.com/packages/traffick)** | Party trading, merchant catalogs, perceived prices, and appraisal checks for dnd5e. |

A Bazaar Patron membership includes:

- Every Bakshi's Bazaar premium module while your membership is active, including ongoing updates and new modules as they're added.
- Patron-only channels in the [Bakshi's Bazaar Discord](https://discord.gg/tcdYk54fxC).
- Priority module support.
- A direct place to share feedback and feature suggestions. Suggestions are welcome and taken seriously, but development priorities remain at my discretion.

Everyone is welcome in the [Bakshi's Bazaar Discord](https://discord.gg/tcdYk54fxC): the public channels cover release announcements, questions, and feature ideas, and patrons also get the patron-only channels and priority support. Bug reports for 5e Item Importer still go to [GitHub issues](https://github.com/GnollStack/5e-Item-Importer/issues), as described under Community.

---

<div align="center">

<a id="community"></a>

## Community

</div>

- **Report bugs** — [open an issue](https://github.com/GnollStack/5e-Item-Importer/issues) with your Foundry version, module version, steps to reproduce, console logs, and screenshots or short clips when useful.
- **Ask on Discord** — anyone can ask questions in the public channels of the [Bakshi's Bazaar Discord](https://discord.gg/tcdYk54fxC). Bazaar Patrons get priority support in the patron-only channels.
- **Request features** — tell me what happened at your table and what you wish the module could do.
- **Star the repo** — if the module is useful at your table, a star helps other GMs find it.
- **Watch releases** — follow the repo for updates, compatibility notes, and new feature releases.

---

<div align="center">

<a id="contributing"></a>

## Contributing

</div>

Bug reports, feature ideas, reproduction notes, documentation fixes, and localization ideas are welcome.

<details>
<summary><strong>Contribution policy</strong></summary>

I am not generally accepting unsolicited code PRs for features, refactors, architecture, or behavior changes. This is still my module and my codebase; I will decide how features are designed and implemented unless I explicitly say otherwise.

- **Bug reports** — include Foundry version, module version, a console log, and the steps to reproduce. Screenshots or short clips help a lot.
- **Feature requests** — tell me what happened at your table and what you wish the module could do.
- **Pull requests** — please do not open code PRs unless I ask for one. Open an issue with the idea instead.
- **Code ownership** — core implementation, architecture, and release decisions remain with me unless stated otherwise.
- **Translations and docs** - UI strings use Foundry's public localization setup in `lang/en.json`, primarily under `II.*` keys. Typo fixes, wording suggestions, and translation files are welcome by issue first; the code-contribution policy above still applies.

I may adapt, decline, or implement submitted ideas. Any accepted contribution or submitted project material may be released under the same EULA as the rest of the module.

</details>

---

<div align="center">

<a id="ai-use"></a>

## AI-Assisted Development

</div>

This module is developed and maintained with the help of AI-assisted tools for coding, debugging, and testing.

I care about the quality, behavior, performance, security, and long-term maintainability of this module, and I take full responsibility for what ships. AI assistance does not replace review, testing, debugging, or security and design judgment.

AI is used here as a tool under my direction to make Foundry better and allow for long term mod support while still having a life outside of building and maintaining my free and premium modules.

If you are uncomfortable using software developed with AI-assisted tools, this module is not for you.

---

<div align="center">

<a id="license-permissions"></a>

## ⚖️ License & Permissions

</div>

### Proprietary EULA
This module is licensed under the **GnollStack Proprietary EULA**.
It is **Free for Personal Use**, meaning you can use it in your home games, stream it, or modify it for your own table without restriction.

The bundled js-yaml 4.3.2 dependency remains under its MIT license; its copyright and permission notice are included in `THIRD_PARTY_NOTICES.txt`.

However, **Commercial Redistribution is Strictly Prohibited.**
You may **NOT** sell this module, bundle it within paid content (such as Patreon maps or adventures), or host it as a commercial service without prior written consent.

### Commercial Licensing
I am open to partnerships! If you are a map maker, adventure writer, or developer who wishes to use this module commercially, please contact me. I offer commercial licenses for:
* Bundling this module with paid VTT content.
* Official integration into commercial systems.
* Custom feature development for your specific product.

### Contact
For licensing inquiries or permission slips:
* **Discord:** `GnollStack` (Preferred)
* **Email:** `Somedudeed@gmail.com`
* *Please do not open GitHub Issues for commercial licensing discussions. But feel free to contact me via Discord or Email*

---

<div align="center">

**Author:** [GnollStack](https://github.com/GnollStack) · **Compatibility:** Foundry VTT v14 only (verified v14.369)

[⬆ Back to Top](#5e-item-importer)

</div>
