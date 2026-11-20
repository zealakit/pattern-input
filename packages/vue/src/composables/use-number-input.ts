import { computed, toValue, type MaybeRefOrGetter } from "vue";
import {
  createNumberController,
  getNumberInputProps,
  type NumberOptions,
  resolveNumberOptions,
} from "@zealakit/pattern-input-core";
import { useFieldController, useInputElement } from "./use-field-controller.js";

export type NumberInputOptions = Parameters<typeof createNumberController>[0];

export function useNumberInput(options: MaybeRefOrGetter<NumberInputOptions>) {
  const { controller, state } = useFieldController(
    () => createNumberController(toValue(options)),
    options,
  );
  const { inputRef, getElement } = useInputElement(controller);
  const resolved = computed(() =>
    resolveNumberOptions(toValue(options) as unknown as NumberOptions),
  );

  return {
    state,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    inputRef,
    getInputProps(extra: Record<string, unknown> = {}) {
      return { ...getNumberInputProps(state.value, resolved.value), ...extra };
    },
    setValue: (value: number | null) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => getElement()?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
