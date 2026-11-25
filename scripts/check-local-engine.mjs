#!/usr/bin/env node
/**
 * G3 `check:local-engine` (00-foundation-2 §1, NS2).
 *
 * Refuse to publish while a Zealakit package resolves through `link:`/`file:`.
 *
 * The engine stays unpublished (D23), so every package repo is developed against
 * `link:../../../ui-engine`. A release must switch those to the published range
 * first; this guard makes publishing from the development state impossible. It
 * also covers `@zealakit/overlay-*`, which a repo may link while the overlay
 * pilot is the release candidate.
 *
 * It is deliberately **not** part of `pnpm check` (the branch is linked on
 * purpose) — it is chained in front of every publish and release script.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LOCAL_PREFIXES = ["link:", "file:"];
/** A local link is only a problem for packages this repo would publish. */
const LINKED_PACKAGES = [/^@zealakit\/ui-engine$/, /^@zealakit\/overlay-/];
const failures = [];

function isLinked(value) {
  return (
    typeof value === "string" &&
    LOCAL_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

const packagesDir = path.join(rootDir, "packages");
if (existsSync(packagesDir)) {
  for (const name of readdirSync(packagesDir)) {
    const manifestPath = path.join(packagesDir, name, "package.json");
    if (!existsSync(manifestPath)) {
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      for (const [dependency, value] of Object.entries(manifest[field] ?? {})) {
        if (
          LINKED_PACKAGES.some((pattern) => pattern.test(dependency)) &&
          isLinked(value)
        ) {
          failures.push(
            `${path.relative(rootDir, manifestPath)}: ${field}.${dependency} is "${value}"`,
          );
        }
      }
    }
  }
}

const lockfilePath = path.join(rootDir, "pnpm-lock.yaml");
if (existsSync(lockfilePath)) {
  const lockfile = readFileSync(lockfilePath, "utf8");
  for (const line of lockfile.split("\n")) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("specifier:") &&
      LOCAL_PREFIXES.some((prefix) =>
        trimmed.includes(`specifier: ${prefix}`),
      ) &&
      LINKED_PACKAGES.some(
        (pattern) => pattern.test(trimmed) || trimmed.includes("@zealakit/"),
      )
    ) {
      // Only the engine/overlay entries matter; core links are internal.
      if (trimmed.includes("ui-engine") || trimmed.includes("overlay-")) {
        failures.push(`pnpm-lock.yaml: ${trimmed}`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(
    "\ncheck-local-engine: this branch still depends on a local Zealakit package. Switching to the published range is a user-led release step (D23).",
  );
  process.exit(1);
}

console.log("check-local-engine: no local Zealakit link; safe to publish.");
