import { useCallback, useMemo, useRef } from "react";
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
  type OtpDetach,
} from "@zealakit/pattern-input-core/dom";
import { useFieldController } from "./use-field-controller.js";

export type OtpInputOptions = FieldControllerOptions<string, OtpOptions>;

export type OtpFieldResult = {
  readonly value: string;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly controlled: boolean;
  getGroupProps(): Record<string, unknown>;
  getSlotProps(index: number): Record<string, unknown>;
  getHiddenInputProps(): Record<string, unknown>;
  setValue(value: string): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
};

export function useOtpInput(initialOptions: OtpInputOptions): OtpFieldResult {
  const { controller, state } = useFieldController(
    () => createOtpController(initialOptions),
    initialOptions,
  );
  const resolved = useMemo(
    () => resolveOtpOptions(initialOptions),
    [initialOptions],
  );

  const groupRef = useRef<HTMLElement | null>(null);
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const slotsRef = useRef(new Map<number, HTMLInputElement>());
  const attachedRef = useRef<OtpDetach | null>(null);

  const getSlots = useCallback(
    () =>
      Array.from(slotsRef.current.entries())
        .sort(([a], [b]) => a - b)
        .map(([, element]) => element),
    [],
  );

  const attachGroup = useCallback(
    (element: HTMLElement | null) => {
      attachedRef.current?.();
      attachedRef.current = null;
      groupRef.current = element;
      if (element) {
        attachedRef.current = attachOtpGroup(element, controller, getSlots, {
          hiddenInput: hiddenRef.current ?? undefined,
        });
      }
    },
    [controller, getSlots],
  );

  const slotRef = useCallback(
    (index: number) => (element: HTMLInputElement | null) => {
      if (element) {
        slotsRef.current.set(index, element);
      } else {
        slotsRef.current.delete(index);
      }
      attachedRef.current?.refresh();
    },
    [],
  );

  return {
    value: controller.value,
    formattedValue: controller.formattedValue,
    status: controller.status,
    controlled: controller.controlled,
    getGroupProps() {
      return {
        ...toReactProps(
          getOtpGroupProps(state, resolved) as unknown as Record<
            string,
            unknown
          >,
        ),
        ref: attachGroup,
      };
    },
    getSlotProps(index: number) {
      const props = toReactProps(
        getOtpSlotProps(state, resolved, index) as unknown as Record<
          string,
          unknown
        >,
      );
      return { ...props, ref: slotRef(index) };
    },
    getHiddenInputProps() {
      return {
        ...toReactProps(
          getOtpHiddenInputProps(state, resolved) as unknown as Record<
            string,
            unknown
          >,
        ),
        ref: (element: HTMLInputElement | null) => {
          hiddenRef.current = element;
        },
      };
    },
    setValue(value) {
      controller.setValue(value);
    },
    clear() {
      controller.clear();
    },
    focus() {
      const slots = getSlots();
      (slots[controller.getState().activeIndex] ?? slots[0])?.focus();
    },
    undo() {
      return controller.undo();
    },
    redo() {
      return controller.redo();
    },
  };
}

export type { OtpGroupProps, OtpHiddenInputProps, OtpSlotProps, OtpOptions };
