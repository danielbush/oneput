import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";
import { scanSource, checkFindings } from "./sinks.mjs";
import { exceptions, fixturePaths } from "./exceptions.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const excluded = new Set([
  "node_modules",
  ".git",
  ".svelte-kit",
  "dist",
  "build",
  "coverage",
  ".output",
  ".test-results",
]);
async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);
    // The deprecated package is outside this contract and is never changed here.
    if (relative(root, full) === "packages/oneput-native-container") continue;
    if (entry.isDirectory() && !excluded.has(entry.name))
      output.push(...(await files(full)));
    else if (
      entry.isFile() &&
      /\.(?:[cm]?[jt]sx?|svelte|html)$/.test(entry.name)
    )
      output.push(full);
  }
  return output;
}
const errors = [];
const paths = new Set();
let count = 0;
for (const directory of ["packages", "apps", "scripts"]) {
  for (const path of await files(resolve(root, directory))) {
    const name = relative(root, path);
    paths.add(name);
    const findings = scanSource(name, await readFile(path, "utf8"));
    count += findings.length;
    errors.push(...checkFindings(name, findings, exceptions, fixturePaths));
  }
}
for (const entry of exceptions) {
  if (!paths.has(entry.path))
    errors.push(`Missing sink exception path: ${entry.path}`);
}
for (const path of Object.keys(fixturePaths)) {
  if (!paths.has(path)) errors.push(`Missing fixture exception path: ${path}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `HTML sink scan: ${paths.size} files, ${count} listed sinks; no unlisted sinks.`,
  );
