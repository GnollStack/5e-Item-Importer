/** Pure source documentation checks. No Foundry, network, imports or world writes. */
import { structuralPaths } from "./template-completeness.mjs";
export function concreteExample(markdown) {
  const section = markdown.match(/<!-- AUTHORING-EXAMPLE:START -->([\s\S]*?)<!-- AUTHORING-EXAMPLE:END -->/);
  const matches = [...(section?.[1] ?? "").matchAll(/\x60{3}yaml\r?\n([\s\S]*?)\x60{3}/g)];
  if (matches.length !== 1) throw new Error("Expected exactly one marked concrete YAML example.");
  return matches[0][1].trim();
}
export function checkMidiTemplateCoverage({ markdown, type, requirements, yaml }) {
  const issues = [];
  const fence = markdown.match(/\x60{3}yaml\s*\n([\s\S]*?)\x60{3}/)?.[1];
  if (!fence) return [{ code: "missing-main-yaml" }];
  let data;
  try { data = yaml.load(fence); } catch (error) { return [{ code: "invalid-main-yaml", message: error.message }]; }
  const paths = structuralPaths(data);
  const selected = requirements.filter(row => type === "effect" ? row.kind === "effect" : row.kind === "activity" && row.type === type);
  for (const row of selected) {
    if (!paths.has(row.path)) issues.push({ code: "missing-midi-mapping", path: row.path, nativePath: row.nativePath });
    // A bracketed enum guide must include the declared YAML choices, not only current sheet options.
    for (const value of paths.get(row.path) ?? []) {
      if (typeof value === "string" && /^\[[^\]]+\]$/.test(value) && row.acceptedValues?.length) {
        const choices = value.slice(1, -1).split("|");
        for (const choice of row.acceptedValues) if (!choices.includes(choice)) {
          issues.push({ code: "missing-midi-enum-choice", path: row.path, choice });
        }
      }
    }
  }
  return issues;
}
export function inspectConcreteDocuments(documents) {
  const issues = [];
  const visit = (value, path) => {
    if (typeof value === "string" && /^\[[^\[\]\r\n]+\]$/.test(value)) issues.push({ code: "unfilled-placeholder", path });
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "Change Mode")) issues.push({ code: "noncanonical-change-mode", path });
    if (value.DAMAGE_DATA && ["Damage Formula", "Damage Type", "Custom Damage Formula"].some(key => value[key] != null && !["", "n/a"].includes(value[key]))) {
      issues.push({ code: "ambiguous-damage", path });
    }
    for (const [key, entry] of Object.entries(value)) visit(entry, path ? path + "." + key : key);
  };
  for (const [index, document] of documents.entries()) visit(document, String(index));
  return issues;
}
