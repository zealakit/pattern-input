<script lang="ts">
import { InputOTP } from "../../dist/index.js";

let { value = $bindable(), ...rest } = $props();
</script>

<InputOTP maxLength={6} label="Code" bind:value {...rest}>
  <InputOTP.Group data-group="a">
    <InputOTP.Slot index={0} />
    <InputOTP.Slot index={1} />
    <InputOTP.Slot index={2} />
  </InputOTP.Group>
  <InputOTP.Separator data-testid="sep">-</InputOTP.Separator>
  <InputOTP.Group data-group="b">
    <InputOTP.Slot index={3} />
    <InputOTP.Slot index={4} />
    <InputOTP.Slot index={5} />
  </InputOTP.Group>
</InputOTP>
