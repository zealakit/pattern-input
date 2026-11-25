import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "@testing-library/react";
import { MaskedInput } from "../dist/index.js";

/**
 * `[NQ11]` React hydration: server render, hydrate, zero warnings, identical ids
 * and ARIA. The masked input wires `aria-describedby` to generated ids, which is
 * exactly the surface a hydration mismatch breaks.
 */

function collectWarnings() {
  const messages: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => messages.push(String(args[0]));
  console.warn = (...args: unknown[]) => messages.push(String(args[0]));
  return {
    messages,
    restore() {
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

function surface(root: ParentNode): string {
  return [...root.querySelectorAll("*")]
    .map((element, index) => {
      const attrs = [...element.attributes]
        .filter(
          (attribute) =>
            attribute.name === "id" || attribute.name.startsWith("aria-"),
        )
        .map((attribute) => `${attribute.name}=${attribute.value}`)
        .sort()
        .join(",");
      return `${index}:${element.tagName}:${attrs}`;
    })
    .join("|");
}

const tree = h(MaskedInput, { mask: "99/99/9999", defaultValue: "01/02/2026" });

test("[NQ11] React: the masked input hydrates with zero warnings and identical ARIA", async () => {
  const html = renderToString(tree);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const before = surface(container);
  assert.ok(before.length > 0, "the input has id or aria attributes");

  const warnings = collectWarnings();
  try {
    await act(async () => {
      hydrateRoot(container, tree);
    });
  } finally {
    warnings.restore();
  }

  const hydrationWarnings = warnings.messages.filter((message) =>
    /hydrat|did not match|server/i.test(message),
  );
  assert.deepEqual(hydrationWarnings, [], "no hydration warnings");
  assert.equal(surface(container), before, "ids and aria-* survive hydration");
  container.remove();
});
