import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = "@zealakit/pattern-input-core";

/** Deterministic text big enough that gzip clearly passes the 1 KB tolerance. */
function bulk(length) {
  const chars = [];
  for (let index = 0; index < length; index += 1) {
    chars.push(String.fromCharCode(32 + ((index * 7919) % 95)));
  }
  return chars.join("");
}

function runCheck(files) {
  const base = mkdtempSync(join(tmpdir(), "size-core-"));
  try {
    const repo = join(base, "repo");
    mkdirSync(join(repo, "scripts", "lib"), { recursive: true });
    copyFileSync(
      join(root, "scripts", "check-size-regression.mjs"),
      join(repo, "scripts", "check-size-regression.mjs"),
    );
    copyFileSync(
      join(root, "scripts", "lib", "size-budget.mjs"),
      join(repo, "scripts", "lib", "size-budget.mjs"),
    );
    for (const [file, text] of Object.entries(files)) {
      const target = join(repo, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    return spawnSync(
      process.execPath,
      [join(repo, "scripts", "check-size-regression.mjs")],
      {
        cwd: repo,
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test("[X31] Core growth fails although Core is private and never published", () => {
  const result = runCheck({
    "packages/core/package.json": JSON.stringify({ name: CORE, private: true }),
    "packages/core/dist/index.js": `export const data = ${JSON.stringify(bulk(12_000))};\n`,
    "size-baseline.json": JSON.stringify({ packages: { [CORE]: { gzip: 0 } } }),
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, new RegExp(`${CORE}: \\d+ B gzip, baseline 0 B`));
});
