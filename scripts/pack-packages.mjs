import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleCoreIntoTarball } from "./bundle-core.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "artifacts");
// Core is private: it is never packed on its own, only bundled into each adapter.
const packages = [
  "@zealakit/pattern-input-vanilla",
  "@zealakit/pattern-input-react",
  "@zealakit/pattern-input-vue",
  "@zealakit/pattern-input-svelte",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of packages) {
  const result = spawnSync(
    "pnpm",
    ["--filter", name, "pack", "--pack-destination", output],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const file of await readdir(output)) {
  if (file.endsWith(".tgz")) {
    bundleCoreIntoTarball(join(output, file));
    console.log(`bundled core into ${file}`);
  }
}
