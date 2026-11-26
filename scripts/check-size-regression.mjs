#!/usr/bin/env node
/**
 * Size baseline and regression check (00-foundation-3 §5, X31, P6).
 *
 * Records the gzip size of every published package's built output in
 * `size-baseline.json`, and fails when an entry grows past **1 KB OR 10 %** of
 * its baseline, whichever is smaller. Growth is reported, never blocked, at
 * publish time: `pnpm check` is where it fails, so a regression cannot land.
 *
 * Dependency-free on purpose (node:zlib) so the same file runs in every repo.
 *
 * Usage:
 *   node scripts/check-size-regression.mjs          # check against the baseline
 *   node scripts/check-size-regression.mjs --write  # rewrite the baseline
 */
import { sizeBudget } from "./lib/size-budget.mjs";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baselinePath = path.join(rootDir, "size-baseline.json");
const WRITE = process.argv.includes("--write");

/** Gzip of the whole built entry graph: every `.js` file under `dist`. */
function gzipSize(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".js")) {
        files.push(full);
      }
    }
  };
  walk(dir);
  const source = files
    .sort()
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  return gzipSync(source, { level: 9 }).length;
}

const measured = {};
const packagesDir = path.join(rootDir, "packages");
for (const name of readdirSync(packagesDir)) {
  const packageDir = path.join(packagesDir, name);
  const manifestPath = path.join(packageDir, "package.json");
  if (!existsSync(manifestPath)) {
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // Core is private but bundled into every adapter tarball at pack time; its
  // bytes ship, so they must be watched too (X31). Other private packages stay out.
  if (manifest.private === true && !manifest.name.endsWith("-core")) {
    continue;
  }
  const entry = path.join(packageDir, "dist", "index.js");
  if (!existsSync(entry)) {
    console.error(
      `${path.relative(rootDir, entry)}: missing — run the build first`,
    );
    process.exit(1);
  }
  measured[manifest.name] = { gzip: gzipSize(path.join(packageDir, "dist")) };
}

if (WRITE) {
  const previous = existsSync(baselinePath)
    ? (JSON.parse(readFileSync(baselinePath, "utf8")).packages ?? {})
    : {};
  const packages = { ...previous, ...measured };
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ note: "gzip bytes of each published entry (X31). Regenerate with --write.", packages }, null, 2)}\n`,
  );
  console.log(
    `check-size-regression: wrote ${Object.keys(measured).length} baseline entries.`,
  );
  process.exit(0);
}

if (!existsSync(baselinePath)) {
  console.error(
    "check-size-regression: size-baseline.json is missing. Run with --write.",
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8")).packages ?? {};
const failures = [];
for (const [name, { gzip }] of Object.entries(measured)) {
  const reference = baseline[name]?.gzip;
  if (typeof reference !== "number") {
    continue;
  }
  const budget = reference + sizeBudget(reference);
  if (gzip > budget) {
    failures.push(
      `${name}: ${gzip} B gzip, baseline ${reference} B, budget ${budget} B (${(((gzip - reference) / reference) * 100).toFixed(1)} % growth)`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(
    "\ncheck-size-regression: an entry grew past 1 KB or 10 % (X31). Shrink it, or regenerate the baseline deliberately with --write and explain why.",
  );
  process.exit(1);
}

console.log(
  `check-size-regression: ${Object.keys(measured).length} entries within 1 KB / 10 % of the baseline.`,
);
