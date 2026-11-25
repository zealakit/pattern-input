<script lang="ts">
  import { InputOTP, MaskedInput, NumberInput } from "../../dist/index.js";
</script>

<NumberInput aria-label="Amount" options={{ defaultValue: 12 }} />
<MaskedInput aria-label="Date" options={{ mask: "99/99/9999" }} />
<InputOTP maxLength={2} label="Code">
  <InputOTP.Slot index={0} />
  <InputOTP.Slot index={1} />
</InputOTP>
