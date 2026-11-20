import {
  createOtpController,
  type FieldControllerOptions,
  type FieldStatus,
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
  type OtpGroupProps,
  type OtpHiddenInputProps,
  type OtpOptions,
  type OtpSlotProps,
  resolveOtpOptions,
  toReactProps,
} from "@zealakit/pattern-input-core";
import {
  attachOtpGroup,
  createOtpSlotRegistry,
  type OtpDetach,
  type OtpSlotRef,
} from "@zealakit/pattern-input-core/dom";
import { useCallback, useMemo, useRef, useState } from "react";
import { useFieldController } from "./use-field-controller.js";

export type OtpInputOptions = FieldControllerOptions<string, OtpOptions>;

export type OtpFieldResult = {
  readonly value: string;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly controlled: boolean;
  getGroupProps(): Record<string, unknown> & {
    readonly ref: (element: HTMLElement | null) => void;
  };
  getSlotProps(index: number): Record<string, unknown> & {
    readonly ref: OtpSlotRef;
  };
  getHiddenInputProps(): Record<string, unknown>;
  setValue(value: string): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
};

export function useOtpInput(options: OtpInputOptions): OtpFieldResult {
  const { controller, state } = useFieldController(
    () => createOtpController(options),
    options,
  );
  const resolved = useMemo(() => resolveOtpOptions(options), [options]);

  const [registry] = useState(createOtpSlotRegistry);
  const detachRef = useRef<OtpDetach | null>(null);
  // Initial characters only: they feed SSR/hydration. After mount the DOM
  // binding is the sole writer of slot values (it must never be fought by a
  // reactive `value` prop).
  const initialSlots = useRef(state.slots).current;

  // Child refs run before the parent's, so every mounted slot is registered by
  // the time the group attaches; later slot changes arrive via the registry.
  const groupRef = useCallback(
    (element: HTMLElement | null) => {
      detachRef.current?.();
      detachRef.current = null;
      if (element !== null) {
        detachRef.current = attachOtpGroup(element, controller, registry);
      }
    },
    [controller, registry],
  );

  return {
    value: controller.value,
    formattedValue: controller.formattedValue,
    status: controller.status,
    controlled: controller.controlled,
    getGroupProps() {
      return {
        ...toReactProps(getOtpGroupProps(state, resolved)),
        ref: groupRef,
      };
    },
    getSlotProps(index) {
      return {
        ...toReactProps(getOtpSlotProps(state, resolved, index)),
        defaultValue: initialSlots[index] ?? "",
        ref: registry.refFor(index),
      };
    },
    getHiddenInputProps() {
      return toReactProps(getOtpHiddenInputProps(state, resolved));
    },
    setValue(value) {
      controller.setValue(value);
    },
    clear() {
      controller.clear();
    },
    focus() {
      const slots = registry.getSlots();
      const target =
        slots[controller.getState().activeIndex] ?? slots.find(Boolean);
      target?.focus();
    },
    undo() {
      return controller.undo();
    },
    redo() {
      return controller.redo();
    },
  };
}

export type { OtpGroupProps, OtpHiddenInputProps, OtpOptions, OtpSlotProps };
