import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Step 1b matrices (00-foundation-3 §4): the APG and NQ14 nesting rows.
 *
 * A row is `covered` when a test exercises it, or `todo` with the plan that will
 * fill it. This file keeps the matrices honest: no empty matrix, no silent row,
 * every `todo` owned by a plan file that exists.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const plansRoot = path.resolve(here, "../../../_plans");

const MATRICES = [
  "apg-matrix.json",
  "nesting-matrix.json",
  "hydration-matrix.json",
];
const STATUSES = new Set(["covered", "todo"]);

function load(name) {
  return JSON.parse(readFileSync(path.join(here, name), "utf8"));
}

for (const name of MATRICES) {
  const { rows } = load(name);

  test(`[NQ5] ${name} has rows and no unnamed behaviour`, () => {
    assert.ok(
      Array.isArray(rows) && rows.length > 0,
      `${name} must not be empty`,
    );
    for (const row of rows) {
      const label = row.component ?? row.composition ?? row.adapter;
      assert.ok(label, `${name}: every row names a component or composition`);
      assert.ok(
        (row.behaviour ?? row.rule ?? "").length > 10,
        `${name}: "${label}" needs a behaviour, not a placeholder`,
      );
      assert.ok(
        STATUSES.has(row.status),
        `${name}: "${label}" status must be covered or todo`,
      );
    }
  });

  test(`[NQ5] every todo row in ${name} names a plan that exists`, () => {
    for (const row of rows.filter((entry) => entry.status === "todo")) {
      assert.ok(row.owner, `${name}: a todo row must name its owning plan`);
      const prefix = String(row.owner).split("-")[0];
      const matches = existsSync(plansRoot)
        ? readdirSync(plansRoot).some((file) => file.startsWith(`${prefix}-`))
        : false;
      assert.ok(
        matches,
        `${name}: owner "${row.owner}" has no file in _plans/`,
      );
    }
  });
}
