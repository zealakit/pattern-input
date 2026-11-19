import { useMemo, useRef } from "react";
import type { Ref } from "react";
import {
  createNumberController,
  type FieldControllerOptions,
  type FieldStatus,
  type NumberInputProps,
  type NumberOptions,
  getNumberInputProps,
  resolveNumberOptions,
  toReactProps,
} from "@zealakit/pattern-input-core";
import { attachInput } from "@zealakit/pattern-input-core/dom";
import {
  useElementBinding,
  useFieldController,
} from "./use-field-controller.js";
import { composeRefs } from "../utils/merge-props.js";

export type NumberInputOptions = FieldControllerOptions<
  number | null,
  NumberOptions
>;

type InputExtras = Record<string, unknown> & {
  readonly ref?: Ref<HTMLInputElement>;
};

export type NumberFieldResult = {
  readonly value: number | null;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly controlled: boolean;
  getInputProps(extra?: InputExtras): Record<string, unknown>;
  setValue(value: number | null): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
};

export function useNumberInput(
  initialOptions: NumberInputOptions = {},
): NumberFieldResult {
  const { controller, state } = useFieldController(
    () => createNumberController(initialOptions),
    initialOptions,
  );
  const resolved = useMemo(
    () => resolveNumberOptions(initialOptions),
    [initialOptions],
  );
  const { ref, elementRef } = useElementBinding(controller, attachInput);
  const initialFormatted = useRef(state.formattedValue).current;

  return {
    value: controller.value,
    formattedValue: controller.formattedValue,
    status: controller.status,
    controlled: controller.controlled,
    getInputProps(extra: InputExtras = {}) {
      const { ref: userRef, ...rest } = extra;
      const base = toReactProps(
        getNumberInputProps(state, resolved),
      ) as unknown as Record<string, unknown>;
      return {
        ...base,
        defaultValue: initialFormatted,
        ...rest,
        ref: composeRefs(ref, userRef),
      };
    },
    setValue(value) {
      controller.setValue(value);
    },
    clear() {
      controller.clear();
    },
    focus() {
      elementRef.current?.focus();
    },
    undo() {
      return controller.undo();
    },
    redo() {
      return controller.redo();
    },
  };
}

export type { NumberInputProps };
export type { NumberOptions };
