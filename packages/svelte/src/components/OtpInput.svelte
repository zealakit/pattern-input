<script lang="ts">
import { otpGroupAction } from "../actions/field.js";
import { createOtpInput, type OtpInputOptions } from "../fields/otp-input.js";

type Props = {
  length: number;
  value?: string;
  options?: Record<string, unknown>;
  slotProps?: Record<number, Record<string, unknown>>;
  onchange?: (change: unknown) => void;
  [key: string]: unknown;
};

let {
  length,
  value = $bindable(),
  options = {},
  slotProps = {},
  onchange,
  ...rest
}: Props = $props();

const controlled = value !== undefined;

const field = createOtpInput(
  () =>
    ({
      ...(options as object),
      length: Number(length),
      ...(controlled ? { value } : {}),
      onValueChange: (change) => {
        value = change.value;
        onchange?.(change);
      },
    }) as OtpInputOptions,
);

$effect.pre(() => {
  field.sync();
});

const indexes = $derived(
  Array.from({ length: Number(length) }, (_, index) => index),
);
</script>

<div use:otpGroupAction={field} {...field.getGroupProps()} {...rest}>
  {#each indexes as index (index)}
    <input {...field.getSlotProps(index)} {...(slotProps[index] ?? {})} />
  {/each}
  <input {...field.getHiddenInputProps()} />
</div>
