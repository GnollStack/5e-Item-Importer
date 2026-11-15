# Template source

The templates in `templates/YAML Templates/` are generated from this folder. Edit the files here, never a generated template, then run:

```
node tools/Build-Templates.mjs           # rewrite the templates that changed
node tools/Build-Templates.mjs --check   # change nothing; fail when a template differs from this source
```

Commit the source and the regenerated templates together. `node --test` runs the same check, and it also fails when a file in this folder is read by no page or a template in the output folder is written by no page. This folder is tracked in git and left out of the release package.

## Folders

| Path | Holds |
| --- | --- |
| `pages.json` | The pages to write: one set (`item`), its output path, the folders it reads, and the variables. |
| `layouts/item.md` | The page skeleton shared by the 8 Item templates. |
| `shared/` | Text written once and used by several types: head sections, common reference sections (`reference/`), shared parts of the detailed reference (`details/`), and the guide checks that apply to every type (`guide.json`). |
| `types/<type>/` | What only that type has: `reference.yaml`, `configuration.md`, `example.md`, `details.md`, its guide (`guide.json`), and any head text of its own. |

## How a page is assembled

A page starts from its layout. Each `@@include <name>` line is replaced by the first file with that name in `types/<type>/`, then `shared/`. So a file in `types/<type>/` replaces the shared file of the same name for that type. A type's own text is written directly in its `reference.yaml`, `configuration.md`, `example.md` and `details.md`, between the include lines.

| Line | Effect |
| --- | --- |
| `@@include <name>` | Insert a source file. Its final line break is not part of it; a blank line before that is. |
| `@@if <set>` … `@@else` … `@@end` | Keep the lines only on pages of that set. Not used here yet; there is one set. |
| `@@file <path>` | Insert a repository file as written, for the example copied from `docs/examples/`. Variables and `@@` lines inside it are left alone. |
| `@@guide summary`, `not-for`, `rows`, `checks` | Insert that part of the guide (see below). |
| `@@# <text>` | A note for maintainers; not written to the page. |

`{{name}}` is replaced by a variable: `{{type}}`, `{{Type}}`, `{{TYPE}}`, `{{set}}`, and `{{rootKey}}` from `pages.json`. An unknown name stops the build.

## Guide data

`guide.json` in a type folder holds that type's `useWhen`, `smallest`, `notFor`, `sourceRows` (`says`, `write`) and `checks`.

`shared/guide.json` holds `sharedChecks`, and may hold `sharedRows`. Each is added to a page only when its conditions hold:

| Key | Condition |
| --- | --- |
| `needs` | The page's field reference has every listed section, or field as `SECTION.Field`. |
| `types`, `notTypes` | The page's type is, or is not, in the list. |
| `sets` | The page belongs to one of the listed sets. |
| `unless` | None of the type's own checks contains this text. |

A type's own rows and checks come first, then the shared ones in file order. Checks are numbered when the page is written.

The build tools (`tools/Build-Templates.mjs`, `tools/template-build.mjs` and its test) are shared with 5e Activity Importer and kept identical in both repositories.
