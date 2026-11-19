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
