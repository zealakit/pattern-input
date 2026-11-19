import { Window } from "happy-dom";

/** Register a DOM before the built adapter is imported. */
const window = new Window({ url: "http://localhost/" });

const values: Record<string, unknown> = {
  window,
  document: window.document,
  navigator: window.navigator,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  Node: window.Node,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  KeyboardEvent: window.KeyboardEvent,
  InputEvent: window.InputEvent,
  CompositionEvent: window.CompositionEvent,
  getComputedStyle: window.getComputedStyle.bind(window),
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
