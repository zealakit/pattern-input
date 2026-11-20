import type { HTMLAttributes, InputHTMLAttributes } from "react";
import { useOtpInput, type OtpInputOptions } from "../hooks/use-otp-input.js";

export type OtpInputComponentProps = OtpInputOptions & {
  readonly groupProps?: Record<string, unknown>;
  readonly slotProps?: Record<number, Record<string, unknown>>;
};

/** Group wrapper + N slot inputs + hidden aggregate input. */
export function OtpInput({
  groupProps,
  slotProps,
  ...options
}: OtpInputComponentProps) {
  const field = useOtpInput(options as OtpInputOptions);
  const length = Number(options.length);

  return (
    <div
      {...(field.getGroupProps() as HTMLAttributes<HTMLDivElement>)}
      {...(groupProps as HTMLAttributes<HTMLDivElement>)}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          {...(field.getSlotProps(
            index,
          ) as InputHTMLAttributes<HTMLInputElement>)}
          {...((slotProps?.[index] ??
            {}) as InputHTMLAttributes<HTMLInputElement>)}
        />
      ))}
      <input
        {...(field.getHiddenInputProps() as InputHTMLAttributes<HTMLInputElement>)}
      />
    </div>
  );
}
