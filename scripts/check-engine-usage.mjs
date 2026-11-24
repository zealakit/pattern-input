#!/usr/bin/env node
/**
 * G1 `check:engine-usage` — pattern-input variant (00-foundation-2 §1, X10).
 *
 * pattern-input does not use `@zealakit/ui-engine` (X10): it has no ids, no live
 * region and no page-global state. This guard therefore enforces the **duplicate**
 * and **source** rules only, with no manifest-peer rule, so the repo cannot grow
 * a local copy of engine-owned behaviour later.
 *
 * It fails when a package:
 *  - defines or reads its own `getGlobalState`, or a `Symbol.for("@zealakit/...`
 *    page-global key (NQ2);
 *  - creates its own announcement live region (NQ2);
 *  - adds a document-level `keydown`/`pointerdown`/`mousedown` listener for
 *    dismissal (NQ2);
 *  - deep-imports the engine or declares it anywhere it should not (NQ7, NS1);
 *  - uses an HTML/CSS sink the engine bans (NS3).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACKAGES = ["core", "vanilla", "react", "vue", "svelte"];
const ENGINE = "@zealakit/ui-engine";
const PUBLIC_SUBPATHS = new Set([
  ENGINE,
  `${ENGINE}/pointer`,
  `${ENGINE}/keyboard`,
  `${ENGINE}/position`,
  `${ENGINE}/package.json`,
]);

/**
 * Files allowed to keep a duplicate, with the decision that keeps it.
 *
 * @type {ReadonlyArray<{ file: string; rule: string; reason: string }>}
 */
const ALLOW_LIST = [];

const failures = [];

/** @param {string} code @param {string} message */
function fail(code, message) {
  failures.push(`[${code}] ${message}`);
}

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** @param {string} relative @param {string} rule */
function allowed(relative, rule) {
  return ALLOW_LIST.some(
    (entry) => entry.file === relative && entry.rule === rule,
  );
}

const SOURCE_BANS = [
  {
    pattern: /dangerouslySetInnerHTML|v-html|\{@html/g,
    code: "NS3",
    what: "framework HTML sink",
  },
  {
    pattern: /\.(inner|outer)HTML\s*=/g,
    code: "NS3",
    what: "innerHTML/outerHTML sink",
  },
  {
    pattern:
      /insertAdjacentHTML|createContextualFragment|new DOMParser|\.srcdoc\s*=/g,
    code: "NS3",
    what: "HTML parsing sink",
  },
  {
    pattern: /document\.write\(|new Function\(|\beval\(/g,
    code: "NS3",
    what: "eval-family sink",
  },
  {
    pattern: /setAttribute\(\s*["']style["']/g,
    code: "NS3",
    what: "style attribute sink",
  },
  { pattern: /\.style\.cssText\s*=/g, code: "NS3", what: "style.cssText sink" },
];

for (const name of PACKAGES) {
  const packageDir = path.join(rootDir, "packages", name);
  const manifestPath = path.join(packageDir, "package.json");
  if (!existsSync(manifestPath)) {
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  // X10: pattern-input needs no engine. Any declaration of it is a mistake.
  for (const field of ["dependencies", "peerDependencies", "devDependencies"]) {
    if (manifest[field]?.[ENGINE] !== undefined) {
      fail(
        "X10",
        `${name}: declares ${ENGINE} in ${field}; pattern-input does not use the engine`,
      );
    }
  }

  for (const file of walk(path.join(packageDir, "src")).filter((candidate) =>
    /\.(ts|tsx|js|svelte|vue)$/.test(candidate),
  )) {
    const relative = path.relative(rootDir, file);
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(
      /(?:from\s+|import\s*\()\s*["']([^"']*@zealakit\/ui-engine[^"']*)["']/g,
    )) {
      const specifier = match[1];
      if (!PUBLIC_SUBPATHS.has(specifier)) {
        fail(
          "NQ7",
          `${relative}: imports "${specifier}" (only the public entry points are allowed)`,
        );
      }
    }

    if (
      /(?:export\s+)?function\s+getGlobalState/.test(source) &&
      !allowed(relative, "get-global-state")
    ) {
      fail("NQ2", `${relative}: defines its own getGlobalState`);
    }
    if (
      /getGlobalState\s*(?:<[^>]*>)?\s*\(/.test(source) &&
      !allowed(relative, "get-global-state")
    ) {
      fail(
        "NQ2",
        `${relative}: reads package-global state through its own getGlobalState`,
      );
    }
    if (/Symbol\.for\(\s*["']@zealakit\//.test(source)) {
      fail("NQ2", `${relative}: defines its own page-global Symbol.for key`);
    }
    if (
      /setAttribute\(\s*["']aria-live["']/.test(source) ||
      /setAttribute\(\s*["']role["']\s*,\s*["'](?:status|alert)["']/.test(
        source,
      ) ||
      /["']aria-live["']\s*:/.test(source)
    ) {
      fail("NQ2", `${relative}: creates its own announcement live region`);
    }
    if (
      /document\.addEventListener\(\s*["'](keydown|pointerdown|mousedown)["']/.test(
        source,
      )
    ) {
      fail("NQ2", `${relative}: adds a document-level dismissal listener`);
    }

    for (const ban of SOURCE_BANS) {
      if (ban.pattern.test(source)) {
        fail(ban.code, `${relative}: ${ban.what}`);
      }
      ban.pattern.lastIndex = 0;
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(`\ncheck-engine-usage: ${failures.length} violation(s).`);
  process.exit(1);
}

console.log(
  `check-engine-usage: OK (${PACKAGES.length} packages, no engine dependency, ${ALLOW_LIST.length} allow-listed exception(s)).`,
);
