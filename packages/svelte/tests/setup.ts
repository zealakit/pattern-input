import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { compile } from "svelte/compiler";

/** Register a DOM before the built adapter is imported. */
const window = new Window({ url: "http://localhost/" });

const values: Record<string, unknown> = {
  window,
  document: window.document,
  navigator: window.navigator,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  SVGElement: window.SVGElement,
  Node: window.Node,
  Text: window.Text,
  Comment: window.Comment,
  DocumentFragment: window.DocumentFragment,
  Document: window.Document,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  KeyboardEvent: window.KeyboardEvent,
  InputEvent: window.InputEvent,
  CompositionEvent: window.CompositionEvent,
  FocusEvent: window.FocusEvent,
  MutationObserver: window.MutationObserver,
  ResizeObserver: window.ResizeObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
};

for (const [key, value] of Object.entries(values)) {
  try {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  } catch {
    // Some Node globals may be non-configurable.
  }
}

/** Compile `.svelte` files on import so tests can load built components. */
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".svelte")) {
      const filename = fileURLToPath(url);
      const { js } = compile(readFileSync(filename, "utf8"), {
        generate: "client",
        filename,
        css: "injected",
      });
      return { format: "module", source: js.code, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
