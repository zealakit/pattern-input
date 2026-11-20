import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import {
  useNumberInput,
  type NumberInputOptions,
} from "../hooks/use-number-input.js";

export type NumberInputComponentProps = NumberInputOptions & {
  readonly inputProps?: Record<string, unknown>;
};

/** Thin component rendering only the field's own `<input>`. */
export const NumberInput = forwardRef<
  HTMLInputElement,
  NumberInputComponentProps
>(function NumberInput({ inputProps, ...options }, ref) {
  const field = useNumberInput(options as NumberInputOptions);
  const props = field.getInputProps({ ...(inputProps ?? {}), ref });
  return <input {...(props as InputHTMLAttributes<HTMLInputElement>)} />;
});
