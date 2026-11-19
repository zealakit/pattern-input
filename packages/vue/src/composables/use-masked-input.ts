import { toValue, type MaybeRefOrGetter } from "vue";
import {
  createMaskedController,
  getMaskedInputProps,
  resolveMaskedOptions,
} from "@zealakit/pattern-input-core";
import { useFieldController, useInputElement } from "./use-field-controller.js";

export type MaskedInputOptions = Parameters<typeof createMaskedController>[0];

export function useMaskedInput(options: MaybeRefOrGetter<MaskedInputOptions>) {
  const { controller, state } = useFieldController(
    () => createMaskedController(toValue(options)),
    options,
  );
  const { inputRef, getElement } = useInputElement(controller);

  return {
    state,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    inputRef,
    getInputProps(extra: Record<string, unknown> = {}) {
      const resolved = resolveMaskedOptions(toValue(options));
      return { ...getMaskedInputProps(state.value, resolved), ...extra };
    },
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => getElement()?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
