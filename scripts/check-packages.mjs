#!/usr/bin/env node
// AC-9 / FR-27..FR-29 release gates, run against the packed tarballs.
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const artifacts = join(root, "artifacts");
const adapters = ["vanilla", "react", "vue", "svelte"];
const frameworkPeers = {
  vanilla: [],
  react: ["react", "react-dom"],
  vue: ["vue"],
  svelte: ["svelte"],
};

const errors = [];
const fail = (message) => errors.push(message);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function checkManifest(dir, adapter) {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const name = manifest.name;

  if (manifest.type !== "module") fail(`${name}: type must be module`);
  if (adapter === "svelte") {
    if (
      JSON.stringify(manifest.sideEffects) !== JSON.stringify(["**/*.svelte"])
    ) {
      fail(`${name}: sideEffects must be ["**/*.svelte"]`);
    }
  } else if (manifest.sideEffects !== false) {
    fail(`${name}: sideEffects must be false`);
  }
  if (manifest.files?.join(",") !== "dist,README.md,LICENSE") {
    fail(`${name}: files must be dist, README.md, LICENSE`);
  }
  if (!manifest.exports?.["."]?.types || !manifest.exports["."].import) {
    fail(`${name}: exports must provide types + import`);
  }
  if (!(manifest.engines?.node ?? "").includes("20")) {
    fail(`${name}: engines.node must require >=20`);
  }
  const deps = Object.keys(manifest.dependencies ?? {});
  if (deps.length > 0)
    fail(`${name}: runtime dependencies must be empty, got ${deps}`);
  const peers = Object.keys(manifest.peerDependencies ?? {}).sort();
  const expectedPeers = [...frameworkPeers[adapter]].sort();
  if (JSON.stringify(peers) !== JSON.stringify(expectedPeers)) {
    fail(
      `${name}: peerDependencies must be ${expectedPeers.join(", ") || "none"}, got ${peers.join(", ") || "none"}`,
    );
  }
}

function checkContents(dir, name) {
  const files = walk(dir);
  const hasVendor = files.some(
    (file) =>
      relative(dir, file).replaceAll("\\", "/") === "dist/vendor/core/index.js",
  );
  const hasVendorDom = files.some(
    (file) =>
      relative(dir, file).replaceAll("\\", "/") ===
      "dist/vendor/core/dom/index.js",
  );
  if (!hasVendor || !hasVendorDom) {
    fail(`${name}: dist/vendor/core (index + dom) is missing`);
  }
  for (const file of files) {
    if (/\.(css|scss|less)$/.test(file)) {
      fail(`${name}: unexpected stylesheet ${relative(dir, file)}`);
    }
  }
  for (const file of files.filter((entry) => entry.endsWith(".js"))) {
    const source = readFileSync(file, "utf8");
    if (source.includes("@zealakit/pattern-input-core")) {
      fail(`${name}: unresolved core specifier in ${relative(dir, file)}`);
    }
    if (/\bclassName\s*=|\bclassList\.|\.style\./.test(source)) {
      fail(`${name}: style/class write in ${relative(dir, file)}`);
    }
  }
}

function checkImport(adapter) {
  const entry =
    adapter === "svelte"
      ? "./packages/svelte/dist/fields/number-input.js"
      : `./packages/${adapter}/dist/index.js`;
  const script = `
    const mod = await import(${JSON.stringify(entry)});
    const hasWindow = typeof window !== "undefined";
    console.log(Object.keys(mod).length > 0, hasWindow);
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (output !== "true false") {
    fail(`${adapter}: import check failed (${output})`);
  }
}

const stagingRoot = mkdtempSync(join(tmpdir(), "pattern-input-check-"));
try {
  for (const adapter of adapters) {
    const tarball = join(
      artifacts,
      `zealakit-pattern-input-${adapter}-1.0.0-beta.1.tgz`,
    );
    const dir = join(stagingRoot, adapter);
    execFileSync("mkdir", ["-p", dir]);
    execFileSync("tar", ["-xzf", tarball, "-C", dir]);
    const packageDir = join(dir, "package");
    const name = `@zealakit/pattern-input-${adapter}`;

    checkManifest(packageDir, adapter);
    checkContents(packageDir, name);
    checkImport(adapter);
    console.log(`${name}: tarball checks passed`);
  }
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Package gates passed.");
