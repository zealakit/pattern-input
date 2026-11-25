#!/usr/bin/env node
/**
 * G6 `check:internal-leak` (00-foundation-3 §3, NQ12).
 *
 * A public type surface must never mention `@zealakit/ui-engine/internal` or the
 * types it exports. `/internal` is `~1.0.0-beta.1` on purpose; leaking one of its
 * types would freeze it into the 1.0 contract.
 *
 * Scans the built `.d.ts` files and any API report of every published package.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MARKERS = ["@zealakit/ui-engine/internal"];
const failures = [];

function walk(dir, files = [], filter) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry === "node_modules") {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files, filter);
    } else if (filter(entry)) {
      files.push(full);
    }
  }
  return files;
}

const packagesDir = path.join(rootDir, "packages");
for (const name of readdirSync(packagesDir)) {
  const manifestPath = path.join(packagesDir, name, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }
  if (manifest.private === true) {
    continue;
  }
  const packageDir = path.join(packagesDir, name);
  const files = [
    ...walk(path.join(packageDir, "dist"), [], (file) =>
      file.endsWith(".d.ts"),
    ),
    ...walk(packageDir, [], (file) => file.endsWith(".api.md")),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const marker of MARKERS) {
      if (text.includes(marker)) {
        failures.push(`${path.relative(rootDir, file)}: mentions ${marker}`);
      }
    }
  }
  if (!existsSync(path.join(packageDir, "dist"))) {
    failures.push(
      `${path.relative(rootDir, packageDir)}: no dist — run the build first`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(
    "\ncheck-internal-leak: a public type surface mentions /internal. Copy the type into the public entry or stop exporting it (NQ12).",
  );
  process.exit(1);
}

console.log("check-internal-leak: no /internal type in a public surface.");
