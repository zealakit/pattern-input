import assert from "node:assert/strict";
import { test } from "node:test";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { MaskedInput } from "../dist/index.js";

/**
 * `[NQ11]` Vue hydration: server render, hydrate, zero warnings, identical ids
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

const make = () =>
  createSSRApp({
    // The Vue adapter takes one `options` object, not the React-style flat props.
    render: () =>
      h(MaskedInput, {
        options: { mask: "99/99/9999", defaultValue: "01/02/2026" },
      }),
  });

test("[NQ11] Vue: the masked input hydrates with zero warnings and identical ARIA", async () => {
  const html = await renderToString(make());
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const before = surface(container);
  assert.ok(before.length > 0, "the input has id or aria attributes");

  const warnings = collectWarnings();
  try {
    make().mount(container);
  } finally {
    warnings.restore();
  }

  const hydrationWarnings = warnings.messages.filter((message) =>
    /hydrat|mismatch/i.test(message),
  );
  assert.deepEqual(hydrationWarnings, [], "no hydration warnings");
  assert.equal(surface(container), before, "ids and aria-* survive hydration");
  container.remove();
});
