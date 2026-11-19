import {
  createOtpController,
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
  resolveOtpOptions,
} from "@zealakit/pattern-input-core";
import { attachOtpGroup } from "@zealakit/pattern-input-core/dom";
import { createFieldStore } from "./create-field.js";

export type OtpInputOptions = Parameters<typeof createOtpController>[0];

export function createOtpInput(getOptions: () => OtpInputOptions) {
  const controller = createOtpController(getOptions());
  const base = createFieldStore(controller, getOptions);

  const getSlots = (node: HTMLElement): HTMLInputElement[] =>
    Array.from(
      node.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
    );

  return {
    ...base,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
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
      return attachOtpGroup(node, controller, () => getSlots(node));
    },
    attachGroup(node: HTMLElement): () => void {
      return attachOtpGroup(node, controller, () => getSlots(node));
    },
    setOptions: (options: OtpInputOptions) => controller.setOptions(options),
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => {
      const element = document.querySelector<HTMLInputElement>(
        'input:not([type="hidden"])',
      );
      element?.focus();
    },
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
