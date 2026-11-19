<script lang="ts">
import { otpGroupAction } from "../actions/field.js";
import { createOtpInput, type OtpInputOptions } from "../fields/otp-input.js";

type Props = {
  length: number;
  value?: string;
  options?: Record<string, unknown>;
  onchange?: (change: unknown) => void;
  [key: string]: unknown;
};

let {
  length,
  value = $bindable(""),
  options = {},
  onchange,
  ...rest
}: Props = $props();

const field = createOtpInput(
  () =>
    ({
      ...(options as object),
      length: Number(length),
      ...(value !== "" ? { value } : {}),
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
    <input {...field.getSlotProps(index)} />
  {/each}
  <input {...field.getHiddenInputProps()} />
</div>
