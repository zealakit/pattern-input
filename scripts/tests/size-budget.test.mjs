import assert from "node:assert/strict";
import { test } from "node:test";
import { sizeBudget } from "../lib/size-budget.mjs";

test("[X31] a large entry fails past 1 KB even when 10 % would allow more", () => {
  // 20 000 B: 10 % = 2 000 B, but 1 KB is the smaller allowance.
  assert.equal(sizeBudget(20_000), 21_024);
  assert.ok(20_000 + 1_500 > sizeBudget(20_000), "1 500 B growth must fail");
});

test("[X31] a small entry fails past 10 % even when 1 KB would allow more", () => {
  // 9 000 B: 10 % = 900 B, smaller than 1 KB.
  assert.equal(sizeBudget(9_000), 9_900);
  assert.ok(9_000 + 950 > sizeBudget(9_000), "950 B growth must fail");
});

test("[X31] growth under both allowances passes", () => {
  assert.ok(9_000 + 800 <= sizeBudget(9_000));
  assert.ok(20_000 + 900 <= sizeBudget(20_000));
});
