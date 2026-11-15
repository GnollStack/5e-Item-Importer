#!/usr/bin/env node
/** Writes the shipped templates from templates/source, or checks that they match it. No Foundry or network access. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTemplates, SOURCE_FOLDER } from "./template-build.mjs";

const help = [
  "Usage:",
  "  node tools/Build-Templates.mjs           write every template that differs from " + SOURCE_FOLDER,
  "  node tools/Build-Templates.mjs --check   change nothing; fail when a template differs from its source",
  "",
  "Edit the files under " + SOURCE_FOLDER + ", never a generated template. " + SOURCE_FOLDER + "/README.md describes the source."
].join("\n");

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h") || argv.some(argument => argument !== "--check")) {
  process.stdout.write(help + "\n");
  process.exitCode = argv.includes("--help") || argv.includes("-h") ? 0 : 1;
} else {
  const check = argv.includes("--check");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const { pages, unused, strays } = buildTemplates(root, { write: !check });
    const differing = pages.filter(page => page.differs);
    for (const page of differing) console.log((check ? "DIFFERS  " : "WROTE    ") + page.output + (check ? "\n         " + page.difference : ""));
    for (const file of unused) console.log("UNUSED   " + SOURCE_FOLDER + "/" + file + " is read by no page");
    for (const file of strays) console.log("STRAY    " + file + " is not written by any page");
    const failed = unused.length || strays.length || (check && differing.length);
    if (check) console.log(failed ? "Templates do not match their source. Run node tools/Build-Templates.mjs after editing " + SOURCE_FOLDER + "." : "Templates match their source (" + pages.length + " pages).");
    else console.log(differing.length + " of " + pages.length + " templates written.");
    process.exitCode = failed ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
