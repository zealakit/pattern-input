#!/usr/bin/env node
/**
 * G8 `check:file-names` (00-foundation-3 §3, X30).
 *
 * Code files and folders are kebab-case everywhere a contributor looks:
 * `packages/<name>/src`, `scripts`, `tests`, `e2e`. Framework component files may keep
 * their framework's convention: `.svelte` files and `*.test.tsx` stay as they are
 * (X30), because the filename is the component name.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCAN = ["packages", "scripts", "tests", "e2e"];
const PACKAGE_DIRS = ["src", "tests", "e2e"];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  "fixtures",
  "snapshots",
  "test-results",
  "playwright-report",
]);

/** `.svelte` files are components; the filename is the component name (X30). */
function exempt(name) {
  // X30: the filename is the component name for Svelte files.
  if (name.endsWith(".svelte")) {
    return true;
  }
  // Documentation keeps its conventional uppercase name.
  return /^(README|CHANGELOG|LICENSE|MIGRATION|AGENTS|CONTRIBUTING)(\.[a-z]+)?$/i.test(
    name,
  );
}

const failures = [];

function check(dir, name) {
  if (SKIP_DIRS.has(name) || name.startsWith(".")) {
    return;
  }
  if (!exempt(name) && !KEBAB.test(name)) {
    failures.push(
      `${path.relative(rootDir, dir)}: "${name}" is not kebab-case`,
    );
    return;
  }
  const full = path.join(dir, name);
  if (statSync(full).isDirectory()) {
    for (const entry of readdirSync(full)) {
      check(full, entry);
    }
  }
}

function checkPackageDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) {
      continue;
    }
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) {
      continue;
    }
    if (PACKAGE_DIRS.includes(entry)) {
      for (const child of readdirSync(full)) {
        check(full, child);
      }
    } else if (entry.startsWith(".")) {
      continue;
    }
  }
}

for (const top of SCAN) {
  const dir = path.join(rootDir, top);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  if (top === "packages") {
    for (const entry of entries) {
      const full = path.join(dir, entry);
      if (!SKIP_DIRS.has(entry) && statSync(full).isDirectory()) {
        checkPackageDir(full);
      }
    }
  } else {
    for (const entry of entries) {
      check(dir, entry);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error("\ncheck-file-names: rename to kebab-case (X30).");
  process.exit(1);
}

console.log("check-file-names: every code file and folder is kebab-case.");
