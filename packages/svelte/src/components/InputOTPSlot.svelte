<script lang="ts">
import { fromStore } from "svelte/store";
import { otpSlotAction } from "../actions/field.js";
import { getOtpContext } from "./otp-context.js";

type Props = {
  /** Zero-based slot index, below the root's `maxLength`. */
  index: number;
  [key: string]: unknown;
};

let { index, ...rest }: Props = $props();

const field = getOtpContext();
const state = fromStore(field);

// Re-run the getter whenever the field state changes (roving tabindex etc.).
const slotProps = $derived.by(() => {
  void state.current;
  return field.getSlotProps(index);
});

// Render the initial character as a value attribute only on the server; on the
// client the DOM binding owns `el.value` (D5).
const serverValue = $derived(
  typeof window === "undefined" ? { value: field.slotValue(index) } : {},
);
</script>

<!-- The field owns the behavior attributes; everything else passes through. -->
<input {...rest} {...slotProps} {...serverValue} use:otpSlotAction={{ field, index }} />
