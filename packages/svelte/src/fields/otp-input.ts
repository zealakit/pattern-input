import {
  createOtpController,
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
  resolveOtpOptions,
} from "@zealakit/pattern-input-core";
import {
  attachOtpGroup,
  createOtpSlotRegistry,
} from "@zealakit/pattern-input-core/dom";
import { createFieldStore } from "./create-field.js";

export type OtpInputOptions = Parameters<typeof createOtpController>[0];

export function createOtpInput(getOptions: () => OtpInputOptions) {
  const controller = createOtpController(getOptions());
  const base = createFieldStore(controller, getOptions);
  const registry = createOtpSlotRegistry();

  return {
    ...base,
    /** Slots register here by index; see `otpSlotAction`. */
    registry,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    /** Character currently in slot `index` (server render only). */
    slotValue: (index: number) => controller.getState().slots[index] ?? "",
    getGroupProps() {
      return getOtpGroupProps(
        controller.getState(),
        resolveOtpOptions(getOptions()),
      );
    },
    getSlotProps(index: number) {
      return getOtpSlotProps(
        controller.getState(),
        resolveOtpOptions(getOptions()),
        index,
      );
    },
    getHiddenInputProps() {
      return getOtpHiddenInputProps(
        controller.getState(),
        resolveOtpOptions(getOptions()),
      );
    },
    attach(node: HTMLElement): () => void {
      return attachOtpGroup(node, controller, registry);
    },
    setOptions: (options: OtpInputOptions) => controller.setOptions(options),
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => {
      const slots = registry.getSlots();
      const target =
        slots[controller.getState().activeIndex] ?? slots.find(Boolean);
      target?.focus();
    },
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
