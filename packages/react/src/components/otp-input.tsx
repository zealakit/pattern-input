import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useContext,
  useMemo,
} from "react";
import {
  type OtpFieldResult,
  type OtpInputOptions,
  useOtpInput,
} from "../hooks/use-otp-input.js";
import { composeRefs } from "../utils/merge-props.js";

const OtpContext = createContext<OtpFieldResult | null>(null);

function useOtpField(): OtpFieldResult {
  const field = useContext(OtpContext);
  if (field === null) {
    throw new Error(
      "InputOTP.Slot must be rendered inside <InputOTP>. Group and Separator are plain layout elements.",
    );
  }
  return field;
}

export type InputOTPProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  keyof OtpInputOptions | "children"
> &
  Omit<OtpInputOptions, "length"> & {
    /** Number of slots; render one `InputOTP.Slot` per index `0..maxLength-1`. */
    readonly maxLength: number;
    readonly children?: ReactNode;
  };

const InputOTPRoot = forwardRef<HTMLDivElement, InputOTPProps>(
  function InputOTP(props, forwardedRef) {
    const {
      maxLength,
      children,
      value,
      defaultValue,
      onValueChange,
      onStatusChange,
      devWarnings,
      now,
      type,
      transform,
      autocomplete,
      name,
      label,
      labelledBy,
      describedBy,
      slotLabel,
      validate,
      invalid,
      disabled,
      required,
      ...divProps
    } = props;

    const field = useOtpInput({
      length: maxLength,
      value,
      defaultValue,
      onValueChange,
      onStatusChange,
      devWarnings,
      now,
      type,
      transform,
      autocomplete,
      name,
      label,
      labelledBy,
      describedBy,
      slotLabel,
      validate,
      invalid,
      disabled,
      required,
    });

    const { ref: groupRef, ...groupProps } = field.getGroupProps();
    const ref = useMemo(
      () => composeRefs(groupRef, forwardedRef),
      [groupRef, forwardedRef],
    );

    return (
      <OtpContext.Provider value={field}>
        {/* Behavior attributes (role, aria-*) win over consumer props. */}
        <div
          {...divProps}
          {...(groupProps as HTMLAttributes<HTMLDivElement>)}
          ref={ref}
        >
          {children}
          <input
            {...(field.getHiddenInputProps() as InputHTMLAttributes<HTMLInputElement>)}
          />
        </div>
      </OtpContext.Provider>
    );
  },
);

export type InputOTPGroupProps = HTMLAttributes<HTMLDivElement>;

/** Visual grouping of slots; adds no accessibility semantics of its own. */
const InputOTPGroup = forwardRef<HTMLDivElement, InputOTPGroupProps>(
  function InputOTPGroup(props, ref) {
    return <div {...props} ref={ref} />;
  },
);

export type InputOTPSlotProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "type" | "maxLength" | "children"
> & {
  /** Zero-based slot index, below the root's `maxLength`. */
  readonly index: number;
};

/**
 * One character slot. The field owns the behavior attributes (`type`,
 * `inputMode`, `maxLength`, `tabIndex`, `autoComplete`, `aria-label`); every
 * other attribute passes through.
 */
const InputOTPSlot = forwardRef<HTMLInputElement, InputOTPSlotProps>(
  function InputOTPSlot({ index, ...props }, forwardedRef) {
    const field = useOtpField();
    const { ref: slotRef, ...slotProps } = field.getSlotProps(index);
    const ref = useMemo(
      () => composeRefs(slotRef, forwardedRef),
      [slotRef, forwardedRef],
    );
    return (
      <input
        {...props}
        {...(slotProps as InputHTMLAttributes<HTMLInputElement>)}
        ref={ref}
      />
    );
  },
);

export type InputOTPSeparatorProps = HTMLAttributes<HTMLDivElement>;

/** Decorative divider between groups; hidden from assistive technology. */
const InputOTPSeparator = forwardRef<HTMLDivElement, InputOTPSeparatorProps>(
  function InputOTPSeparator(props, ref) {
    return <div aria-hidden="true" {...props} ref={ref} />;
  },
);

/**
 * Compound one-time-code field. Layout is entirely yours:
 *
 * ```tsx
 * <InputOTP maxLength={6}>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={0} />
 *     <InputOTP.Slot index={1} />
 *     <InputOTP.Slot index={2} />
 *   </InputOTP.Group>
 *   <InputOTP.Separator />
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={3} />
 *     <InputOTP.Slot index={4} />
 *     <InputOTP.Slot index={5} />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 */
export const InputOTP = Object.assign(InputOTPRoot, {
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});

export { InputOTPGroup, InputOTPSeparator, InputOTPSlot };
