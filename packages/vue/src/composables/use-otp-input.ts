import { toValue, type MaybeRefOrGetter } from "vue";
import {
  createOtpController,
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
  resolveOtpOptions,
} from "@zealakit/pattern-input-core";
import { attachOtpGroup } from "@zealakit/pattern-input-core/dom";
import { onScopeDispose } from "vue";
import { useFieldController } from "./use-field-controller.js";

export type OtpInputOptions = Parameters<typeof createOtpController>[0];

export function useOtpInput(options: MaybeRefOrGetter<OtpInputOptions>) {
  const { controller, state } = useFieldController(
    () => createOtpController(toValue(options)),
    options,
  );

  const slots = new Map<number, HTMLInputElement>();
  let group: HTMLElement | null = null;
  let detach: (() => void) | null = null;

  const getSlots = (): HTMLInputElement[] =>
    Array.from(slots.entries())
      .sort(([a], [b]) => a - b)
      .map(([, element]) => element);

  const groupRef = (element: HTMLElement | null): void => {
    detach?.();
    detach = null;
    group = element;
    if (element) {
      detach = attachOtpGroup(element, controller, getSlots);
    }
  };

  const slotRefs = new Map<
    number,
    (element: HTMLInputElement | null) => void
  >();
  const slotRef = (
    index: number,
  ): ((element: HTMLInputElement | null) => void) => {
    const existing = slotRefs.get(index);
    if (existing) {
      return existing;
    }
    const ref = (element: HTMLInputElement | null): void => {
      if (element) {
        slots.set(index, element);
      } else {
        slots.delete(index);
      }
      if (group) {
        const attached = detach as unknown as { refresh?: () => void } | null;
        attached?.refresh?.();
      }
    };
    slotRefs.set(index, ref);
    return ref;
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
    slotRef,
    getGroupProps: () =>
      getOtpGroupProps(state.value, resolveOtpOptions(toValue(options))),
    getSlotProps: (index: number) =>
      getOtpSlotProps(state.value, resolveOtpOptions(toValue(options)), index),
    getHiddenInputProps: () =>
      getOtpHiddenInputProps(state.value, resolveOtpOptions(toValue(options))),
    setValue: (value: string) => controller.setValue(value),
    clear: () => controller.clear(),
    focus: () => getSlots()[controller.getState().activeIndex]?.focus(),
    undo: () => controller.undo(),
    redo: () => controller.redo(),
  };
}
