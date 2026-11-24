#!/usr/bin/env node
/**
 * G4 `check:dom-private` (NQ6, D27, 00-foundation-2 §1).
 *
 * A package's `src/dom/` (and its built `dist/dom/`) holds private, stateless
 * DOM candidates that may later move into the engine. They are never part of a
 * published surface: no `exports` key and no `files` glob may reach one, and no
 * public adapter entry may re-export from a core `dom` subpath.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACKAGES = ["core", "vanilla", "react", "vue", "svelte"];
const failures = [];

/** @param {string} code @param {string} message */
function fail(code, message) {
  failures.push(`[${code}] ${message}`);
}

for (const name of PACKAGES) {
  const packageDir = path.join(rootDir, "packages", name);
  const manifestPath = path.join(packageDir, "package.json");
  if (!existsSync(manifestPath)) {
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // A private package (core) may export `./dom`; only a published surface may not.
  if (manifest.private === true) {
    continue;
  }

  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    const values =
      typeof target === "string" ? [target] : Object.values(target ?? {});
    for (const value of values) {
      if (
        typeof value === "string" &&
        /(^|\/)dom(\/|$)/.test(value.replace(/^\.\//, ""))
      ) {
        fail(
          "NQ6",
          `${name}: exports["${key}"] reaches a private dom path (${value})`,
        );
      }
    }
  }

  for (const glob of manifest.files ?? []) {
    if (typeof glob === "string" && /(^|\/)dom(\/|$)/.test(glob)) {
      fail("NQ6", `${name}: files includes a private dom path (${glob})`);
    }
  }

  if (name !== "core") {
    const srcDir = path.join(packageDir, "src");
    if (!existsSync(srcDir)) {
      continue;
    }
    const entries = readdirSync(srcDir, { recursive: true }).filter(
      (file) =>
        typeof file === "string" && /\.(ts|tsx|js|svelte|vue)$/.test(file),
    );
    for (const entry of entries) {
      const source = readFileSync(path.join(srcDir, entry), "utf8");
      if (/from\s+["'][^"']*overlay-core\/dom/.test(source)) {
        fail(
          "NQ6",
          `${name}/src/${entry}: re-exports a core private dom subpath`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(`\ncheck-dom-private: ${failures.length} violation(s).`);
  process.exit(1);
}

console.log(
  "check-dom-private: OK (no private dom path reaches a published surface).",
);
