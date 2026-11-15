/** Builds the shipped templates from templates/source. Plain text work: no Foundry, network or world access. */
import fs from "node:fs";
import path from "node:path";

export const SOURCE_FOLDER = "templates/source";
const VARIABLE = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;
const toLf = text => text.replace(/\r\n/g, "\n");
const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces each {{name}} with its value. A value may itself use other names. */
export function fill(text, vars, depth = 0) {
  if (depth > 8) throw new Error("Variables refer to each other in a circle: " + text);
  return text.replace(VARIABLE, (match, name) => {
    if (!Object.hasOwn(vars, name)) throw new Error("Unknown variable " + match);
    return fill(String(vars[name]), vars, depth + 1);
  });
}

/** One page per type of each set in pages.json; a set without types is a single page. */
export function listPages(plan) {
  const pages = [];
  for (const set of plan.sets) {
    for (const type of set.types ?? [""]) {
      const vars = { set: set.name, type, Type: capitalize(type), TYPE: type.toUpperCase(), ...plan.vars, ...set.vars, ...plan.typeVars?.[type] };
      pages.push({
        set: set.name, type, vars,
        flags: new Set([set.name, ...(set.flags ?? [])]),
        output: fill(set.output, vars),
        layout: fill(set.layout, vars),
        lookup: set.lookup.map(folder => fill(folder, vars))
      });
    }
  }
  return pages;
}

/** The text inside the first yaml fence: the page's field reference. */
export function firstYamlFence(text) {
  return text.match(/\x60{3}yaml[ \t]*\n([\s\S]*?)\x60{3}/)?.[1] ?? "";
}

/** True when the reference has the section, or the field inside the section ("SECTION.Field"). */
export function referenceHas(fence, need) {
  const [section, ...rest] = need.split(".");
  const field = rest.join(".");
  const block = fence.match(new RegExp("^  " + escapeRegExp(section) + ":[\\s\\S]*?(?=^  \\S|(?![\\s\\S]))", "m"))?.[0];
  if (block == null) return false;
  return !field || new RegExp("^\\s+(?:- )?" + escapeRegExp(field) + ":", "m").test(block);
}

/** Decides whether a shared guide row or check belongs on a page. */
export function guideRuleApplies(rule, { fence, type, flags, ownChecks = "" }) {
  if ((rule.needs ?? []).some(need => !referenceHas(fence, need))) return false;
  if (rule.types && !rule.types.includes(type)) return false;
  if (rule.notTypes?.includes(type)) return false;
  if (rule.sets && !rule.sets.some(name => flags.has(name))) return false;
  if (rule.unless && ownChecks.toLowerCase().includes(rule.unless)) return false;
  return true;
}

const tableCell = text => text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

/** The generated parts of a page's guide. Entries run from the base type to its add-ons. */
export function guideLines(part, { entries, rows, checks }, page, fence) {
  const context = { fence, type: page.type, flags: page.flags };
  if (part === "summary") {
    const root = fence.match(/^(?!SCHEMA_VERSION:)([A-Z][A-Z_]+):/m)?.[1];
    if (!root) throw new Error(page.output + ": the field reference has no root key.");
    const lines = [
      "- **Root key:** \x60" + root + "\x60",
      "- **When to use:** " + entries.map(entry => entry.useWhen.trim()).join(" "),
      "- **Smallest working block:** " + entries.map(entry => entry.smallest.trim()).join(" ")
    ];
    if (entries[0].parentItem) lines.push("- **Parent Item:** " + entries[0].parentItem.trim());
    return lines;
  }
  if (part === "not-for") return entries.flatMap(entry => entry.notFor ?? []).map(text => "- " + text.trim());
  if (part === "rows") {
    const own = entries.flatMap(entry => entry.sourceRows ?? []);
    return [...own, ...rows.filter(row => guideRuleApplies(row, context))].map(row => "| " + tableCell(row.says) + " | " + tableCell(row.write) + " |");
  }
  if (part === "checks") {
    const own = entries.flatMap(entry => entry.checks ?? []);
    const shared = checks.filter(check => guideRuleApplies(check, { ...context, ownChecks: own.join(" ") })).map(check => check.text);
    return [...own, ...shared].map((text, index) => (index + 1) + ". " + text.trim());
  }
  throw new Error(page.output + ": unknown guide part \"" + part + "\".");
}

/**
 * Renders one page. io.source(file) returns a source file's text or null; io.repo(file) returns a repository file's text.
 * Returns the page text with LF line ends and the source files it read.
 */
export function renderPage(page, io) {
  const used = new Set();
  const find = name => {
    for (const folder of page.lookup) {
      const file = folder + "/" + name, text = io.source(file);
      if (text != null) { used.add(file); return { file, text }; }
    }
    throw new Error("No source file \"" + name + "\" in " + page.lookup.join(", ") + ".");
  };
  let guide, fence;
  const loadGuide = () => {
    const found = { entries: [], rows: [], checks: [] };
    for (const folder of [...page.lookup].reverse()) {
      const file = folder + "/guide.json", text = io.source(file);
      if (text == null) continue;
      used.add(file);
      const data = JSON.parse(text);
      if (data.useWhen) found.entries.push(data);
      found.rows.push(...(data.sharedRows ?? []));
      found.checks.push(...(data.sharedChecks ?? []));
    }
    if (!found.entries.length) throw new Error("No guide.json with \"useWhen\" in " + page.lookup.join(", ") + ".");
    return found;
  };
  const expand = (file, text, stack, withGuide) => {
    if (stack.includes(file)) throw new Error("Source files include each other in a circle: " + [...stack, file].join(" > "));
    const out = [], open = [];
    const body = toLf(text).replace(/\n$/, "");
    for (const [index, line] of (body ? body.split("\n") : []).entries()) {
      try {
        const active = open.every(block => block.active);
        const directive = line.match(/^@@(\S+)(?:[ \t]+(.*?))?[ \t]*$/);
        if (!directive) { if (active) out.push(fill(line, page.vars)); continue; }
        const [, word, argument = ""] = directive;
        if (word === "#") continue;
        if (word === "if") open.push({ active: page.flags.has(argument), otherwise: false });
        else if (word === "else") {
          const block = open.at(-1);
          if (!block || block.otherwise) throw new Error("@@else without @@if.");
          block.active = !block.active; block.otherwise = true;
        } else if (word === "end") { if (!open.pop()) throw new Error("@@end without @@if."); }
        else if (!active) continue;
        else if (word === "include") { const found = find(fill(argument, page.vars)); out.push(...expand(found.file, found.text, [...stack, file], withGuide)); }
        else if (word === "file") out.push(...toLf(io.repo(fill(argument, page.vars))).replace(/\n+$/, "").split("\n"));
        else if (word === "guide") { if (withGuide) out.push(...guideLines(argument, guide ??= loadGuide(), page, fence)); }
        else throw new Error("Unknown directive @@" + word + ".");
      } catch (error) {
        if (!error.located) { error.message = file + ":" + (index + 1) + ": " + error.message; error.located = true; }
        throw error;
      }
    }
    if (open.length) throw new Error(file + ": @@if without @@end.");
    return out;
  };
  const layout = io.source(page.layout);
  if (layout == null) throw new Error("Missing layout " + page.layout + " for " + page.output + ".");
  used.add(page.layout);
  try {
    // The guide's shared rows depend on the field reference, so the page is rendered once without the guide first.
    fence = firstYamlFence(expand(page.layout, layout, [], false).join("\n"));
    return { text: expand(page.layout, layout, [], true).join("\n") + "\n", used };
  } catch (error) {
    error.message = page.output + ": " + error.message;
    throw error;
  }
}

function listFiles(folder, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...listFiles(path.join(folder, entry.name), prefix + entry.name + "/"));
    else files.push(prefix + entry.name);
  }
  return files;
}

function firstDifference(current, expected) {
  if (current == null) return "the file does not exist";
  const a = toLf(current).split("\n"), b = expected.split("\n");
  const index = a.findIndex((line, at) => line !== b[at]);
  const line = index < 0 ? a.length : index;
  return "line " + (line + 1) + ": has " + JSON.stringify((a[line] ?? "(end of file)").slice(0, 120)) + ", source gives " + JSON.stringify((b[line] ?? "(end of file)").slice(0, 120));
}

/**
 * Renders every page of a repository and compares it with the shipped file, ignoring the style of line ends.
 * With write, differing files are rewritten in the line-end style they already have.
 */
export function buildTemplates(root, { write = false } = {}) {
  const sourceRoot = path.join(root, SOURCE_FOLDER);
  const io = {
    source: file => { const target = path.join(sourceRoot, file); return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null; },
    repo: file => fs.readFileSync(path.join(root, file), "utf8")
  };
  const planText = io.source("pages.json");
  if (planText == null) throw new Error("Missing " + SOURCE_FOLDER + "/pages.json.");
  const pages = listPages(JSON.parse(planText));
  const used = new Set(["pages.json", "README.md"]);
  const results = pages.map(page => {
    const rendered = renderPage(page, io);
    for (const file of rendered.used) used.add(file);
    const target = path.join(root, page.output);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
    const differs = current == null || toLf(current) !== rendered.text;
    if (differs && write) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, current?.includes("\r\n") ? rendered.text.replace(/\n/g, "\r\n") : rendered.text);
    }
    return { output: page.output, differs, difference: differs ? firstDifference(current, rendered.text) : null };
  });
  // A source file no page reads, or a template no page writes, is a leftover that would drift unnoticed.
  const unused = listFiles(sourceRoot).filter(file => !used.has(file)).sort();
  const outputs = new Set(pages.map(page => page.output));
  // A stray is a file of an output's kind (same folder, same extension) that no page writes, so a hand-written
  // README.md next to a generated .txt is not one.
  const kinds = [...new Set(pages.map(page => path.posix.dirname(page.output) + "|" + path.posix.extname(page.output)))].map(kind => kind.split("|"));
  const strays = [...new Set(kinds.flatMap(([folder, extension]) =>
    fs.readdirSync(path.join(root, folder)).filter(name => path.posix.extname(name) === extension).map(name => folder + "/" + name).filter(file => !outputs.has(file))))].sort();
  return { pages: results, unused, strays };
}
