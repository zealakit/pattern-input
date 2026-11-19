<script lang="ts">
import { fieldAction } from "../actions/field.js";
import {
  createMaskedInput,
  type MaskedInputOptions,
} from "../fields/masked-input.js";

type Props = {
  value?: string;
  options?: Record<string, unknown>;
  onchange?: (change: unknown) => void;
  [key: string]: unknown;
};

let {
  value = $bindable(""),
  options = {},
  onchange,
  ...rest
}: Props = $props();

const field = createMaskedInput(
  () =>
    ({
      ...(options as object),
      ...(value !== "" ? { value } : {}),
      onValueChange: (change) => {
        value = change.value;
        onchange?.(change);
      },
    }) as MaskedInputOptions,
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
