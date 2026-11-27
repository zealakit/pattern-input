import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import {
  useMaskedInput,
  type MaskedInputOptions,
} from "../hooks/use-masked-input.js";

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

export type MaskedInputComponentProps = MaskedInputOptions &
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
  "mask",
  "tokens",
  "selectMask",
  "showLiterals",
  "placeholderChar",
  "inputMode",
]);

/** Thin component rendering only the field's own `<input>`. */
export const MaskedInput = forwardRef<
  HTMLInputElement,
  MaskedInputComponentProps
>(function MaskedInput({ inputProps, ...props }, ref) {
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
  const field = useMaskedInput(options as MaskedInputOptions);
  const merged = field.getInputProps({ ...dom, ...(inputProps ?? {}), ref });
  return <input {...(merged as InputHTMLAttributes<HTMLInputElement>)} />;
});
