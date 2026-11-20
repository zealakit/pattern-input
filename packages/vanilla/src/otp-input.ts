import {
  createOtpController,
  type FieldControllerOptions,
  type FieldStatus,
  getOtpGroupProps,
  type OtpGroupProps,
  getOtpHiddenInputProps,
  type OtpHiddenInputProps,
  type OtpOptions,
  getOtpSlotProps,
  type OtpSlotProps,
  PatternInputError,
  resolveOtpOptions,
} from "@zealakit/pattern-input-core";
import {
  attachOtpGroup,
  isBrowser,
  type OtpSlotList,
} from "@zealakit/pattern-input-core/dom";
import { applyProps, type AttributeProps } from "./apply-props.js";

export type OtpInputOptions = FieldControllerOptions<string, OtpOptions> & {
  /** Slot inputs by index; leave an index `undefined` for a slot you do not render. */
  readonly slots?: () => OtpSlotList;
  readonly hiddenInput?: HTMLInputElement;
};

export type OtpInputInstance = {
  readonly value: string;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  getGroupProps(): OtpGroupProps;
  getSlotProps(index: number): OtpSlotProps;
  getHiddenInputProps(): OtpHiddenInputProps;
  refresh(): void;
  setValue(value: string): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
  setOptions(options: OtpInputOptions): void;
  subscribe(listener: (instance: OtpInputInstance) => void): () => void;
  destroy(): void;
};

type Tracked = {
  applied: AttributeProps;
  readonly owned: Set<string>;
  readonly original: Map<string, string | null>;
};

function track(
  map: WeakMap<Element, Tracked>,
  el: Element,
  props: AttributeProps,
): void {
  const existing = map.get(el) ?? {
    applied: {},
    owned: new Set<string>(),
    original: new Map<string, string | null>(),
  };
  for (const name of Object.keys(props)) {
    if (!existing.original.has(name)) {
      existing.original.set(name, el.getAttribute(name));
    }
    existing.owned.add(name);
  }
  applyProps(el, props, existing.applied);
  existing.applied = props;
  map.set(el, existing);
}

/** Attach OTP behavior to a group of host-owned slot inputs. */
export function createOtpInput(
  group: HTMLElement,
  initialOptions: OtpInputOptions,
): OtpInputInstance {
  if (!isBrowser()) {
    throw new PatternInputError("NO_DOM");
  }

  const options = initialOptions;
  let resolved = resolveOtpOptions(options);
  const controller = createOtpController(options);
  const getSlots =
    options.slots ??
    (() =>
      Array.from(
        group.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
      ));

  const attached = attachOtpGroup(group, controller, getSlots, {
    hiddenInput: options.hiddenInput,
  });

  const tracked = new WeakMap<Element, Tracked>();
  const listeners = new Set<(instance: OtpInputInstance) => void>();

  const instance: OtpInputInstance = {
    get value() {
      return controller.value;
    },
    get formattedValue() {
      return controller.formattedValue;
    },
    get status() {
      return controller.status;
    },
    getGroupProps() {
      return getOtpGroupProps(controller.getState(), resolved);
    },
    getSlotProps(index) {
      return getOtpSlotProps(controller.getState(), resolved, index);
    },
    getHiddenInputProps() {
      return getOtpHiddenInputProps(controller.getState(), resolved);
    },
    refresh() {
      attached.refresh();
      sync();
    },
    setValue(value) {
      controller.setValue(value);
    },
    clear() {
      controller.clear();
    },
    focus() {
      const slots = getSlots();
      const active =
        slots[controller.getState().activeIndex] ?? slots.find(Boolean);
      (active ?? group).focus();
    },
    undo() {
      return controller.undo();
    },
    redo() {
      return controller.redo();
    },
    setOptions(next) {
      resolved = resolveOtpOptions(next);
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
      attached();
      controller.destroy();
      restore(group);
      for (const slot of getSlots()) {
        if (slot !== undefined) {
          restore(slot);
        }
      }
      if (options.hiddenInput) {
        restore(options.hiddenInput);
      }
      listeners.clear();
    },
  };

  function restore(el: Element): void {
    const entry = tracked.get(el);
    if (!entry) {
      return;
    }
    for (const name of entry.owned) {
      const previous = entry.original.get(name) ?? null;
      if (previous === null) {
        el.removeAttribute(name);
      } else {
        el.setAttribute(name, previous);
      }
    }
    tracked.delete(el);
  }

  function sync(): void {
    const state = controller.getState();
    track(
      tracked,
      group,
      getOtpGroupProps(state, resolved) as unknown as AttributeProps,
    );
    const slots = getSlots();
    // Inputs past the field length are host-owned extras: leave them alone.
    const count = Math.min(slots.length, resolved.length);
    for (let index = 0; index < count; index += 1) {
      const slot = slots[index];
      if (slot === undefined) {
        continue;
      }
      track(
        tracked,
        slot,
        getOtpSlotProps(state, resolved, index) as unknown as AttributeProps,
      );
    }
    if (options.hiddenInput) {
      track(
        tracked,
        options.hiddenInput,
        getOtpHiddenInputProps(state, resolved) as unknown as AttributeProps,
      );
    }
    for (const listener of listeners) {
      listener(instance);
    }
  }

  controller.subscribe(sync);
  sync();

  return instance;
}
