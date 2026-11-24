/**
 * Candidate A.5 `composition-guard` — private (D27), do not export.
 *
 * Engine rules (D35): zero dependencies, no `window`/`document` at import,
 * CSP-safe (no HTML sinks), framework-free, and no page-global state. Plan 04
 * extracts this into `@zealakit/ui-engine/keyboard` when omniselect's composition
 * semantics match pattern-input's (`[PI-IME-1…7]` is the diff base). Until then
 * this file stays private to `@zealakit/pattern-input-core` and is never in a
 * published `exports` map (guarded by `check:dom-private`).
 */

/** Composition tracking; the DOM owns the text while a composition is open. */
export type CompositionTracker = {
  readonly active: boolean;
  start(): void;
  update(text: string): void;
  end(): string;
};

export function createCompositionTracker(): CompositionTracker {
  let active = false;
  let data = "";

  return {
    get active() {
      return active;
    },
    start() {
      active = true;
      data = "";
    },
    update(text: string) {
      data = text;
    },
    end() {
      active = false;
      const value = data;
      data = "";
      return value;
    },
  };
}
