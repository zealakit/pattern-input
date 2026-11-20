import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import {
  useMaskedInput,
  type MaskedInputOptions,
} from "../hooks/use-masked-input.js";

export type MaskedInputComponentProps = MaskedInputOptions & {
  readonly inputProps?: Record<string, unknown>;
};

/** Thin component rendering only the field's own `<input>`. */
export const MaskedInput = forwardRef<
  HTMLInputElement,
  MaskedInputComponentProps
>(function MaskedInput({ inputProps, ...options }, ref) {
  const field = useMaskedInput(options as MaskedInputOptions);
  const props = field.getInputProps({ ...(inputProps ?? {}), ref });
  return <input {...(props as InputHTMLAttributes<HTMLInputElement>)} />;
});
