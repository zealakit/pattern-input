<script lang="ts">
import type { Snippet } from "svelte";
import { otpGroupAction } from "../actions/field.js";
import { createOtpInput, type OtpInputOptions } from "../fields/otp-input.js";
import { setOtpContext } from "./otp-context.js";

type Props = {
  /** Number of slots; render one `InputOTP.Slot` per index `0..maxLength-1`. */
  maxLength: number;
  value?: string;
  defaultValue?: string;
  type?: "numeric" | "alphanumeric";
  transform?: "upper" | "lower";
  autocomplete?: "one-time-code" | "off";
  name?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  slotLabel?: (index: number, length: number) => string;
  validate?: (
    raw: string,
    ctx: { readonly status: string },
  ) => boolean | string | undefined;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  onchange?: (change: unknown) => void;
  children?: Snippet;
  [key: string]: unknown;
};

let {
  maxLength,
  value = $bindable(),
  defaultValue,
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
  onchange,
  children,
  ...rest
}: Props = $props();

const controlled = value !== undefined;

const field = createOtpInput(
  () =>
    ({
      length: Number(maxLength),
      ...(controlled ? { value } : {}),
      defaultValue,
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
      onValueChange: (change) => {
        value = change.value;
        onchange?.(change);
      },
    }) as OtpInputOptions,
);

$effect.pre(() => {
  field.sync();
});

setOtpContext(field);

// The getters read controller state imperatively; subscribing to the store
// makes Svelte re-run them (aria-invalid, aria-describedby, roving tabindex).
const groupProps = $derived.by(() => {
  void $field;
  return field.getGroupProps();
});
const hiddenProps = $derived.by(() => {
  void $field;
  return field.getHiddenInputProps();
});
</script>

<div {...rest} {...groupProps} use:otpGroupAction={field}>
  {@render children?.()}
  <input {...hiddenProps} />
</div>
