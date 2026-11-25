import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

/**
 * `[NQ11]` server render, first half: importing a published package with no
 * `window` or `document` must not throw and must not create page-global engine
 * state. The hydrate-with-zero-warnings half is a todo row in
 * `hydration-matrix.json`, owned by the plan that wires the framework's SSR rig.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

test("[NQ11] every published entry imports without a DOM and creates no page state", async () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const saved = {
    window: globals.window,
    document: globals.document,
  };
  delete globals.window;
  delete globals.document;
  const statesBefore = Object.getOwnPropertySymbols(globalThis).length;

  try {
    const entries = readdirSync(path.join(root, "packages"))
      .map((name) => path.join(root, "packages", name, "dist", "index.js"))
      .filter((file) => {
        try {
          readFileSync(file);
          return true;
        } catch {
          return false;
        }
      });
    assert.ok(entries.length > 0, "at least one built entry");
    const imported: string[] = [];
    for (const entry of entries) {
      // A Svelte adapter ships raw `.svelte` files; importing one needs the Svelte
      // compiler, which is the browser-suite half of this template (todo row).
      // A Svelte adapter ships raw `.svelte` files (directly or one hop away);
      // importing one needs the Svelte compiler, which is the browser-suite half
      // of this template (todo row).
      const packageDir = path.dirname(path.dirname(entry));
      const hasSvelte = readdirSync(packageDir, { recursive: true }).some(
        (file) => String(file).endsWith(".svelte"),
      );
      if (hasSvelte) {
        continue;
      }
      await import(pathToFileURL(entry).href);
      imported.push(entry);
    }
    assert.ok(imported.length > 0, "at least one non-Svelte entry imported");
    const statesAfter = Object.getOwnPropertySymbols(globalThis).length;
    assert.equal(
      statesAfter,
      statesBefore,
      "importing must not create page-global state (the engine creates it lazily)",
    );
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value !== undefined) {
        Object.defineProperty(globalThis, key, {
          configurable: true,
          writable: true,
          value,
        });
      }
    }
  }
});
