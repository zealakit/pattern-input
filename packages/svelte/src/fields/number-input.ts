import {
  createNumberController,
  getNumberInputProps,
  resolveNumberOptions,
} from "@zealakit/pattern-input-core";
import { createFieldStore } from "./create-field.js";

export type NumberInputOptions = Parameters<typeof createNumberController>[0];

export function createNumberInput(getOptions: () => NumberInputOptions) {
  const controller = createNumberController(getOptions());
  const base = createFieldStore(controller, getOptions);

  return {
    ...base,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    getInputProps(extra: Record<string, unknown> = {}) {
      return {
        ...getNumberInputProps(
          controller.getState(),
          resolveNumberOptions(getOptions()),
        ),
        ...extra,
      };
    },
    setOptions: (options: NumberInputOptions) => controller.setOptions(options),
    setValue: (value: number | null) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: (node?: HTMLInputElement) => node?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
