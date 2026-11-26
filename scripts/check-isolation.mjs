#!/usr/bin/env node
/**
 * X36 (00-ISO I1): a component repo never names another component.
 *
 * Forbidden: `@zealakit/<other component>` in any manifest, pnpm-workspace.yaml,
 * source, test, fixture, example, script or comment. Docs (README/CHANGELOG/plans)
 * and lockfiles are out of scope. Symlinks are followed and scanned, never skipped.
 *
 *   node scripts/check-isolation.mjs [--root <dir>]
 */
import {
  readFileSync,
  readdirSync,
  realpathSync,
  lstatSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = "pattern-input";
const COMPONENTS = [
  "overlay",
  "disclosure",
  "omniselect",
  "chrono",
  "notice",
  "pattern-input",
  "datagrid",
  "treeview",
  "quill",
].filter((name) => name !== SELF);
const NAMES = COMPONENTS.join("|");
const PATTERN = new RegExp(`@zealakit/(?:${NAMES})(?![a-zA-Z0-9])`, "g");
const SIBLING_PATH = new RegExp(
  `(?:^|[^\\w.-])(?:\\.\\./)+(?:${NAMES})(?=[/\\\\\\s"\x27\x60),;]|$)`,
  "g",
);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "artifacts",
  ".next",
  ".svelte-kit",
  "test-results",
  ".turbo",
  ".pnpm-store",
]);
const SKIP_FILE =
  /(^|\/)(README[^/]*|CHANGELOG[^/]*|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb|.*\.tsbuildinfo)$/i;
const DOC_DIR = /(^|\/)(plans|docs|_plans)(\/|$)/;

function* walk(dir, seen = new Set()) {
  let real;
  try {
    real = realpathSync(dir);
  } catch {
    return;
  }
  // A symlinked directory may point back into a parent: never loop.
  if (seen.has(real)) return;
  seen.add(real);
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = lstatSync(full);
    if (stats.isSymbolicLink()) {
      let target;
      try {
        target = realpathSync(full);
      } catch {
        continue;
      }
      const targetStats = statSync(target);
      if (targetStats.isDirectory()) {
        yield* walk(full, seen);
      } else if (targetStats.isFile()) {
        // Follow it: a symlinked file must not bypass the scan.
        yield { file: full, read: target };
      }
      continue;
    }
    if (stats.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* walk(full, seen);
      continue;
    }
    if (stats.isFile()) yield { file: full, read: full };
  }
}

function main() {
  const rootArg = process.argv.indexOf("--root");
  const rootDir = path.resolve(
    rootArg === -1
      ? path.dirname(path.dirname(fileURLToPath(import.meta.url)))
      : process.argv[rootArg + 1],
  );
  const failures = [];
  for (const { file, read } of walk(rootDir)) {
    const relative = path.relative(rootDir, file).split(path.sep).join("/");
    if (SKIP_FILE.test(relative)) continue;
    if (DOC_DIR.test(relative) && relative.endsWith(".md")) continue;
    let text;
    try {
      text = readFileSync(read, "utf8");
    } catch {
      continue;
    }
    for (const match of text.matchAll(PATTERN)) {
      const index = match.index ?? 0;
      const line = text.slice(0, index).split("\n").length;
      failures.push(`${relative}:${line}: ${match[0]}`);
    }
    for (const match of text.matchAll(SIBLING_PATH)) {
      const index = match.index ?? 0;
      const line = text.slice(0, index).split("\n").length;
      failures.push(`${relative}:${line}: sibling path ${match[0].trim()}`);
    }
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    console.error(
      `\ncheck-isolation: X36 — a component repo may not name another component. Only @zealakit/ui-engine is shared.`,
    );
    process.exit(1);
  }
  console.log("check-isolation: no other component named (X36).");
}

main();
