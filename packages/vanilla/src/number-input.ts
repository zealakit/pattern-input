import {
  createNumberController,
  type FieldControllerOptions,
  type FieldStatus,
  getNumberInputProps,
  type NumberInputProps,
  type NumberOptions,
  PatternInputError,
  resolveNumberOptions,
} from "@zealakit/pattern-input-core";
import { attachInput, isBrowser } from "@zealakit/pattern-input-core/dom";
import { applyProps, type AttributeProps } from "./apply-props.js";

export type NumberInputOptions = FieldControllerOptions<
  number | null,
  NumberOptions
>;

export type NumberInputInstance = {
  readonly value: number | null;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  getInputProps(): NumberInputProps;
  setValue(value: number | null): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
  setOptions(options: NumberInputOptions): void;
  subscribe(listener: (instance: NumberInputInstance) => void): () => void;
  destroy(): void;
};

const TEXT_LIKE = new Set(["", "text", "tel", "search"]);

function assertInput(el: HTMLInputElement): void {
  if (!(el instanceof HTMLInputElement)) {
    throw new PatternInputError("UNSUPPORTED_ELEMENT");
  }
  if (!TEXT_LIKE.has(el.getAttribute("type") ?? "")) {
    throw new PatternInputError("UNSUPPORTED_ELEMENT");
  }
}

/** Attach number behavior to a host-owned input. */
export function createNumberInput(
  el: HTMLInputElement,
  initialOptions: NumberInputOptions = {},
): NumberInputInstance {
  if (!isBrowser()) {
    throw new PatternInputError("NO_DOM");
  }
  assertInput(el);

  let options = initialOptions;
  let resolved = resolveNumberOptions(initialOptions);
  const controller = createNumberController(initialOptions);
  const detach = attachInput(el, controller);

  const listeners = new Set<(instance: NumberInputInstance) => void>();
  const owned = new Set<string>();
  const original = new Map<string, string | null>();
  let applied: AttributeProps = {};

  const instance: NumberInputInstance = {
    get value() {
      return controller.value;
    },
    get formattedValue() {
      return controller.formattedValue;
    },
    get status() {
      return controller.status;
    },
    getInputProps() {
      return getNumberInputProps(controller.getState(), resolved);
    },
    setValue(value) {
      controller.setValue(value);
    },
    clear() {
      controller.clear();
    },
    focus() {
      el.focus();
    },
    undo() {
      return controller.undo();
    },
    redo() {
      return controller.redo();
    },
    setOptions(next) {
      options = next;
      resolved = resolveNumberOptions(next);
      controller.setOptions(next);
      sync();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      detach();
      controller.destroy();
      for (const name of owned) {
        const previous = original.get(name) ?? null;
        if (previous === null) {
          el.removeAttribute(name);
        } else {
          el.setAttribute(name, previous);
        }
      }
      owned.clear();
      listeners.clear();
    },
  };

  function sync(): void {
    const props = getNumberInputProps(controller.getState(), resolved);
    for (const name of Object.keys(props)) {
      if (!original.has(name)) {
        original.set(name, el.getAttribute(name));
      }
      owned.add(name);
    }
    applyProps(el, props as unknown as AttributeProps, applied);
    applied = props as unknown as AttributeProps;
    for (const listener of listeners) {
      listener(instance);
    }
  }

  controller.subscribe(sync);
  sync();
  void options;

  return instance;
}
