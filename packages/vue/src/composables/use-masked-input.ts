import { computed, toValue, type MaybeRefOrGetter } from "vue";
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
  const resolved = computed(() => resolveMaskedOptions(toValue(options)));

  return {
    state,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    inputRef,
    getInputProps(extra: Record<string, unknown> = {}) {
      return { ...getMaskedInputProps(state.value, resolved.value), ...extra };
    },
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => getElement()?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
