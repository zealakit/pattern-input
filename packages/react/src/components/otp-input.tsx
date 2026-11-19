import type { HTMLAttributes, InputHTMLAttributes } from "react";
import { useOtpInput, type OtpInputOptions } from "../hooks/use-otp-input.js";

export type OtpInputComponentProps = OtpInputOptions & {
  readonly groupProps?: HTMLAttributes<HTMLDivElement>;
  readonly slotProps?: Record<
    number,
    Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue">
  >;
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
      {...groupProps}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          {...(field.getSlotProps(
            index,
          ) as InputHTMLAttributes<HTMLInputElement>)}
          {...(slotProps?.[index] ?? {})}
        />
      ))}
      <input
        {...(field.getHiddenInputProps() as InputHTMLAttributes<HTMLInputElement>)}
      />
    </div>
  );
}
