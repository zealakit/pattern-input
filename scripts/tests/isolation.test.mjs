import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "check-isolation.mjs",
);
const other = (name) => ["@zealakit", name].join("/");
const foreign = "overlay";
const run = (root) =>
  spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });

test("[X36] another component in a manifest, a source file or a symlink fails", () => {
  const root = mkdtempSync(join(tmpdir(), "isolation-"));
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "@zealakit/pattern-input",
        dependencies: { [other(`${foreign}-react`)]: "1.0.0" },
      }),
    );
    mkdirSync(join(root, "src"));
    writeFileSync(
      join(root, "src", "x.ts"),
      `import { createPopover } from "${other(`${foreign}-vanilla`)}";\n`,
    );
    const outside = mkdtempSync(join(tmpdir(), "isolation-target-"));
    writeFileSync(
      join(outside, "linked.ts"),
      `// ${other(`${foreign}-vue`)}\n`,
    );
    symlinkSync(join(outside, "linked.ts"), join(root, "src", "linked.ts"));
    try {
      const result = run(root);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /package\.json:1/);
      assert.match(result.stderr, /src\/x\.ts:1/);
      assert.match(result.stderr, /src\/linked\.ts:1/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("[X36] own packages, the engine, docs and lockfiles pass", () => {
  const root = mkdtempSync(join(tmpdir(), "isolation-"));
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "@zealakit/pattern-input",
        dependencies: {
          "@zealakit/pattern-input-core": "workspace:*",
          "@zealakit/ui-engine": "^1.0.0-beta.1",
        },
      }),
    );
    writeFileSync(
      join(root, "README.md"),
      `Mentions ${other(`${foreign}-react`)} in docs only.\n`,
    );
    writeFileSync(
      join(root, "pnpm-lock.yaml"),
      `specifier: ${["link:..", foreign].join("/")}\n`,
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("[X36] B: symlinked directory, sibling relative import, config alias, treeview/quill and own-prefix files", () => {
  const root = mkdtempSync(join(tmpdir(), "isolation-"));
  const outside = mkdtempSync(join(tmpdir(), "isolation-dir-"));
  const UP = ["..", "..", ".."].join("/");
  const sibling = `${UP}/${foreign}/packages/vanilla/dist/index.js`;
  try {
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(outside, "nested"), { recursive: true });
    writeFileSync(
      join(outside, "nested", "bad.ts"),
      `export { x } from "${other(`${foreign}-react`)}";\n`,
    );
    symlinkSync(outside, join(root, "src", "linked-dir"), "dir");
    writeFileSync(
      join(root, "src", "relative.ts"),
      `export { y } from "${sibling}";\nimport { createFloating } from "${UP}/ui-engine/dist/floating/index.js";\nexport { z } from "../src/local.js";\n`,
    );
    writeFileSync(
      join(root, "vite.config.ts"),
      `export default { resolve: { alias: { "@sib": "${UP}/${foreign}/packages/react/src" } } };\n`,
    );
    writeFileSync(
      join(root, "src", "tree.ts"),
      `import "${other("treeview-core")}";\n`,
    );
    writeFileSync(
      join(root, "src", "quill.ts"),
      `import "${other("quill-react")}";\n`,
    );
    mkdirSync(join(root, "packages", `pattern-input-extra`, "src"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "packages", `pattern-input-extra`, "src", "own.ts"),
      `export { a } from "${other(`${foreign}-vue`)}";\n`,
    );
    const result = run(root);
    assert.equal(result.status, 1, "the guard must fail");
    assert.match(result.stderr, /src\/linked-dir\/nested\/bad\.ts:1/);
    assert.match(result.stderr, /src\/relative\.ts:1/);
    assert.match(result.stderr, /vite\.config\.ts:1/);
    assert.match(result.stderr, /src\/tree\.ts:1/);
    assert.match(result.stderr, /src\/quill\.ts:1/);
    assert.match(
      result.stderr,
      /packages\/pattern-input-extra\/src\/own\.ts:1/,
    );
    assert.doesNotMatch(result.stderr, /ui-engine\/dist/);
    assert.doesNotMatch(result.stderr, /src\/local\.js/);
  } finally {
    rmSync(outside, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
