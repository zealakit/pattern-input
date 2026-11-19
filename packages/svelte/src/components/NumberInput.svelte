<script lang="ts">
import { fieldAction } from "../actions/field.js";
import {
  createNumberInput,
  type NumberInputOptions,
} from "../fields/number-input.js";

type Props = {
  value?: number | null;
  options?: Record<string, unknown>;
  onchange?: (change: unknown) => void;
  [key: string]: unknown;
};

let {
  value = $bindable(null),
  options = {},
  onchange,
  ...rest
}: Props = $props();

const field = createNumberInput(
  () =>
    ({
      ...(options as object),
      ...(value !== null ? { value } : {}),
      onValueChange: (change) => {
        value = change.value;
        onchange?.(change);
      },
    }) as NumberInputOptions,
);

$effect.pre(() => {
  field.sync();
});
</script>

<input
  use:fieldAction={field}
  {...field.getInputProps(rest)}
  value={typeof window === "undefined" ? field.formattedValue() : undefined}
/>
