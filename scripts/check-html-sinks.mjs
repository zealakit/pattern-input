#!/usr/bin/env node
/**
 * G5 `check:html-sinks` (00-foundation-3 §3, NS3).
 *
 * No HTML-string sinks, inline-style attribute writes, dynamic code, string
 * timers or native `popover` attributes in the source of a published package.
 * Every sink is a CSP/Trusted-Types problem and an injection vector; the engine
 * exposes safe helpers (`/pointer`, `/position`, `announce`) for what these
 * patterns are usually reached for.
 *
 * Allow-list entries need a decision code and a reason. Comments are stripped
 * before matching so documentation can name a banned pattern.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** @type {ReadonlyArray<{ file: string; rule: string; reason: string }>} */
const ALLOW_LIST = [];

const RULES = [
  { name: "dangerouslySetInnerHTML", pattern: /dangerouslySetInnerHTML/ },
  { name: "v-html", pattern: /\bv-html\b/ },
  { name: "svelte-html", pattern: /\{@html\b/ },
  { name: "innerHTML", pattern: /\.innerHTML\s*[+]?=/ },
  { name: "outerHTML", pattern: /\.outerHTML\s*[+]?=/ },
  { name: "insertAdjacentHTML", pattern: /insertAdjacentHTML/ },
  { name: "document.write", pattern: /document\.write(ln)?\s*\(/ },
  { name: "createContextualFragment", pattern: /createContextualFragment/ },
  { name: "DOMParser", pattern: /new\s+DOMParser\s*\(/ },
  { name: "srcdoc", pattern: /\bsrcdoc\b/ },
  { name: "style-attribute", pattern: /setAttribute\(\s*["']style["']/ },
  { name: "cssText", pattern: /\.style\.cssText/ },
  { name: "eval", pattern: /\beval\s*\(/ },
  { name: "new Function", pattern: /new\s+Function\s*\(/ },
  { name: "string-timer", pattern: /(setTimeout|setInterval)\s*\(\s*["'`]/ },
  { name: "native-popover", pattern: /\bpopover\s*=\s*["'](auto|)["']/ },
];

const CODE = /\.(ts|tsx|js|mjs|cjs|svelte|vue)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".git"]);

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (CODE.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const failures = [];
const packagesDir = path.join(rootDir, "packages");
let names = [];
try {
  names = readdirSync(packagesDir);
} catch {
  names = [];
}

for (const name of names) {
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
  for (const file of walk(path.join(packagesDir, name, "src"))) {
    const relative = path.relative(rootDir, file);
    if (ALLOW_LIST.some((entry) => entry.file === relative)) {
      continue;
    }
    const source = stripComments(readFileSync(file, "utf8"));
    for (const rule of RULES) {
      if (rule.pattern.test(source)) {
        failures.push(`${relative}: ${rule.name}`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(
    `\ncheck-html-sinks: ${failures.length} sink(s) found. Use a safe DOM builder; an allow-list entry needs a decision code (NS3).`,
  );
  process.exit(1);
}

console.log("check-html-sinks: no HTML sinks in published sources.");
