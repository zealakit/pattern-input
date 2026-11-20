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

let { value = $bindable(), options = {}, onchange, ...rest }: Props = $props();

const controlled = value !== undefined;

const field = createMaskedInput(
  () =>
    ({
      ...(options as object),
      ...(controlled ? { value } : {}),
      onValueChange: (change) => {
        value = change.value;
        onchange?.(change);
      },
    }) as MaskedInputOptions,
);

$effect.pre(() => {
  field.sync();
});

// The getter reads controller state imperatively; subscribing to the store
// makes Svelte re-run it (aria-invalid, aria-describedby).
const inputProps = $derived.by(() => {
  void $field;
  return field.getInputProps(rest);
});

// Render the initial text as a value attribute only on the server; on the
// client the DOM binding owns `el.value` (D5).
const serverValue = $derived(
  typeof window === "undefined" ? { value: field.formattedValue() } : {},
);
</script>

<input use:fieldAction={field} {...inputProps} {...serverValue} />
