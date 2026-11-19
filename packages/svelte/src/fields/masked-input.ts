import {
  createMaskedController,
  getMaskedInputProps,
  resolveMaskedOptions,
} from "@zealakit/pattern-input-core";
import { createFieldStore } from "./create-field.js";

export type MaskedInputOptions = Parameters<typeof createMaskedController>[0];

export function createMaskedInput(getOptions: () => MaskedInputOptions) {
  const controller = createMaskedController(getOptions());
  const base = createFieldStore(controller, getOptions);

  return {
    ...base,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    getInputProps(extra: Record<string, unknown> = {}) {
      return {
        ...getMaskedInputProps(
          controller.getState(),
          resolveMaskedOptions(getOptions()),
        ),
        ...extra,
      };
    },
    setOptions: (options: MaskedInputOptions) => controller.setOptions(options),
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: (node?: HTMLInputElement) => node?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
