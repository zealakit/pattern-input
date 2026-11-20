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
import { computed, type MaybeRefOrGetter, onScopeDispose, toValue } from "vue";
import { useFieldController } from "./use-field-controller.js";

export type OtpInputOptions = Parameters<typeof createOtpController>[0];

export function useOtpInput(options: MaybeRefOrGetter<OtpInputOptions>) {
  const { controller, state } = useFieldController(
    () => createOtpController(toValue(options)),
    options,
  );
  const resolved = computed(() => resolveOtpOptions(toValue(options)));

  const registry = createOtpSlotRegistry();
  let detach: (() => void) | null = null;

  const groupRef = (element: HTMLElement | null): void => {
    detach?.();
    detach = null;
    if (element !== null) {
      detach = attachOtpGroup(element, controller, registry);
    }
  };

  onScopeDispose(() => {
    detach?.();
    detach = null;
  });

  return {
    state,
    value: () => controller.value,
    formattedValue: () => controller.formattedValue,
    status: () => controller.status,
    groupRef,
    /** Stable, idempotent function ref for slot `index`. */
    slotRef: registry.refFor,
    getGroupProps: () => getOtpGroupProps(state.value, resolved.value),
    getSlotProps: (index: number) =>
      getOtpSlotProps(state.value, resolved.value, index),
    getHiddenInputProps: () =>
      getOtpHiddenInputProps(state.value, resolved.value),
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
