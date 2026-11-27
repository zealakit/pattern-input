import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import {
  useNumberInput,
  type NumberInputOptions,
} from "../hooks/use-number-input.js";

type PassthroughInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "value"
  | "defaultValue"
  | "type"
  | "inputMode"
  | "maxLength"
  | "autoComplete"
  | "autoCorrect"
  | "spellCheck"
  | "autoCapitalize"
  | "disabled"
  | "readOnly"
  | "required"
  | "onChange"
  | "min"
  | "max"
  | "step"
>;

export type NumberInputComponentProps = NumberInputOptions &
  PassthroughInputProps & {
    readonly inputProps?: Record<string, unknown>;
  };

const OPTION_KEYS: ReadonlySet<string> = new Set([
  "value",
  "defaultValue",
  "onValueChange",
  "onStatusChange",
  "devWarnings",
  "now",
  "validate",
  "invalid",
  "describedBy",
  "required",
  "disabled",
  "readOnly",
  "locale",
  "decimalSeparator",
  "groupSeparator",
  "minimumFractionDigits",
  "maximumFractionDigits",
  "rounding",
  "min",
  "max",
  "step",
  "largeStep",
  "allowNegative",
  "clampBehavior",
]);

/** Thin component rendering only the field's own `<input>`. */
export const NumberInput = forwardRef<
  HTMLInputElement,
  NumberInputComponentProps
>(function NumberInput({ inputProps, ...props }, ref) {
  const options: Record<string, unknown> = {};
  const dom: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (OPTION_KEYS.has(key)) {
      if (value !== undefined || key === "value") {
        options[key] = value;
      }
    } else {
      dom[key] = value;
    }
  }
  const field = useNumberInput(options as NumberInputOptions);
  const merged = field.getInputProps({ ...dom, ...(inputProps ?? {}), ref });
  return <input {...(merged as InputHTMLAttributes<HTMLInputElement>)} />;
});
