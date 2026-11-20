<script lang="ts">
import { InputOTP } from "../../dist/index.js";
</script>

<InputOTP maxLength={4}>
  {#each [0, 1, 3] as index (index)}
    <InputOTP.Slot {index} />
  {/each}
</InputOTP>
