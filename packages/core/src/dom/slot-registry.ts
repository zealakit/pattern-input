/** Slots by index; `undefined` marks an index with no mounted element. */
export type OtpSlotList = readonly (HTMLInputElement | undefined)[];

/** A framework ref callback that registers (or unregisters) one slot. */
export type OtpSlotRef = (element: HTMLInputElement | null) => void;

export type OtpSlotRegistry = {
  /**
   * Register the element that renders slot `index`. Registering the element
   * that is already there is a no-op. Returns an idempotent unregister
   * function that only removes this exact element.
   */
  register(index: number, element: HTMLInputElement): () => void;
  /**
   * A ref callback for slot `index`, stable per index. Idempotent, so it is
   * safe for frameworks that re-invoke function refs on every render (Vue) or
   * twice in StrictMode (React 19): a repeated element changes nothing, and
   * subscribers never observe a transient "slot missing" state.
   */
  refFor(index: number): OtpSlotRef;
  /** Slots indexed by position; the same reference until the registry changes. */
  getSlots(): OtpSlotList;
  /** Notified after every register/unregister. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

const EMPTY: OtpSlotList = Object.freeze([]);

/**
 * Track the slot inputs of one OTP field by explicit index, so slots can be
 * rendered in any structure (groups, separators, custom wrappers) and in any
 * mount order. Framework adapters register from refs/actions/mount hooks.
 */
export function createOtpSlotRegistry(): OtpSlotRegistry {
  const elements = new Map<number, HTMLInputElement>();
  const listeners = new Set<() => void>();
  const refs = new Map<number, OtpSlotRef>();
  let snapshot: OtpSlotList | null = null;

  const changed = (): void => {
    snapshot = null;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const registry: OtpSlotRegistry = {
    register(index, element) {
      if (!Number.isInteger(index) || index < 0) {
        throw new RangeError(
          `OTP slot index must be an integer >= 0: ${index}`,
        );
      }
      if (elements.get(index) !== element) {
        elements.set(index, element);
        changed();
      }
      return () => {
        if (elements.get(index) === element) {
          elements.delete(index);
          changed();
        }
      };
    },
    refFor(index) {
      let ref = refs.get(index);
      if (ref === undefined) {
        let current: HTMLInputElement | null = null;
        let unregister: (() => void) | null = null;
        ref = (element) => {
          if (element === current) {
            return;
          }
          // Register the new element before releasing the old one, so a swap
          // is a single change and never exposes a missing slot.
          const release = unregister;
          current = element;
          unregister =
            element === null ? null : registry.register(index, element);
          release?.();
        };
        refs.set(index, ref);
      }
      return ref;
    },
    getSlots() {
      if (snapshot === null) {
        if (elements.size === 0) {
          snapshot = EMPTY;
        } else {
          const list: (HTMLInputElement | undefined)[] = new Array(
            Math.max(...elements.keys()) + 1,
          );
          for (const [index, element] of elements) {
            list[index] = element;
          }
          snapshot = Object.freeze(list);
        }
      }
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return registry;
}
