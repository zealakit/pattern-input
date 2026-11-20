import { useMemo, useRef } from "react";
import type { Ref } from "react";
import {
  createMaskedController,
  type FieldControllerOptions,
  type FieldStatus,
  getMaskedInputProps,
  type MaskedInputProps,
  type MaskedOptions,
  resolveMaskedOptions,
  toReactProps,
} from "@zealakit/pattern-input-core";
import { attachInput } from "@zealakit/pattern-input-core/dom";
import {
  useElementBinding,
  useFieldController,
} from "./use-field-controller.js";

export type MaskedInputOptions = FieldControllerOptions<string, MaskedOptions>;

type InputExtras = Record<string, unknown> & {
  readonly ref?: Ref<HTMLInputElement>;
};

export type MaskedFieldResult = {
  readonly value: string;
  readonly formattedValue: string;
  readonly status: FieldStatus;
  readonly controlled: boolean;
  getInputProps(extra?: InputExtras): Record<string, unknown>;
  setValue(value: string): void;
  clear(): void;
  focus(): void;
  undo(): boolean;
  redo(): boolean;
};

export function useMaskedInput(
  initialOptions: MaskedInputOptions,
): MaskedFieldResult {
  const { controller, state } = useFieldController(
    () => createMaskedController(initialOptions),
    initialOptions,
  );
  const resolved = useMemo(
    () => resolveMaskedOptions(initialOptions),
    [initialOptions],
  );
  const { refWith, elementRef } = useElementBinding(controller, attachInput);
  const initialFormatted = useRef(state.formattedValue).current;

  return {
    value: controller.value,
    formattedValue: controller.formattedValue,
    status: controller.status,
    controlled: controller.controlled,
    getInputProps(extra: InputExtras = {}) {
      const { ref: userRef, ...rest } = extra;
      const base = toReactProps(
        getMaskedInputProps(state, resolved),
      ) as unknown as Record<string, unknown>;
      return {
        ...base,
        defaultValue: initialFormatted,
        ...rest,
        ref: refWith(userRef),
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

export type { MaskedInputProps };
