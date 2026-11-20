import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runVector, type Vector } from "../support/run-vector.ts";

const files = ["number", "masked", "otp", "controlled"] as const;

for (const file of files) {
  const vectors = JSON.parse(
    readFileSync(new URL(`../vectors/${file}.json`, import.meta.url), "utf8"),
  ) as Vector[];

  test(`vectors: ${file}.json is plain, structured-clonable JSON`, () => {
    assert.ok(Array.isArray(vectors));
    assert.ok(vectors.length > 0);
    assert.doesNotThrow(() => structuredClone(vectors));
  });

  for (const vector of vectors) {
    test(`vector: ${vector.name}`, () => {
      runVector(vector);
    });
  }
}

test("vectors: combined coverage is at least 8 per field and 5 controlled", () => {
  const count = (name: string): number =>
    (
      JSON.parse(
        readFileSync(
          new URL(`../vectors/${name}.json`, import.meta.url),
          "utf8",
        ),
      ) as Vector[]
    ).length;

  assert.ok(count("number") >= 8);
  assert.ok(count("masked") >= 8);
  assert.ok(count("otp") >= 8);
  assert.ok(count("controlled") >= 5);
});
