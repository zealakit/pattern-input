<script lang="ts">
import {
  fieldAction,
  MaskedInput,
  NumberInput,
  OtpInput,
  createMaskedInput,
  createNumberInput,
} from "@zealakit/pattern-input-svelte";

let controlled = $state<number | null>(null);

const controlledField = createNumberInput(() => ({
  value: controlled,
  maximumFractionDigits: 2,
  onValueChange: (change) => {
    if (change.value !== null && change.value > 1000) {
      return;
    }
    controlled = change.value;
  },
}));

const invalidField = createMaskedInput(() => ({
  mask: "999-999",
  describedBy: "invalid-error",
  validate: () => "This value is invalid",
}));

$effect.pre(() => {
  controlledField.sync();
  invalidField.sync();
});
</script>

<main>
  <h1>Pattern Input — Svelte</h1>

  <label for="price">Price</label>
  <NumberInput
    options={{ maximumFractionDigits: 2, min: 0, max: 100000 }}
    id="price"
    data-testid="price"
  />

  <label for="price-de">Price (de-DE)</label>
  <NumberInput
    options={{ locale: "de-DE", maximumFractionDigits: 2 }}
    id="price-de"
    data-testid="price-de"
  />

  <label for="tax">Tax id</label>
  <MaskedInput
    options={{ mask: "999.999.999-99" }}
    id="tax"
    data-testid="tax"
  />

  <label for="phone">Phone</label>
  <MaskedInput
    options={{ mask: ["(999) 999-9999", "+9 (999) 999-9999"] }}
    id="phone"
    data-testid="phone"
  />

  <label for="code-0">Verification code</label>
  <OtpInput
    length={6}
    options={{ name: "code" }}
    data-testid="code"
    aria-label="Verification code"
    slotProps={{
      0: { id: "code-0", "data-testid": "code-slot-0" },
      1: { "data-testid": "code-slot-1" },
      2: { "data-testid": "code-slot-2" },
      3: { "data-testid": "code-slot-3" },
      4: { "data-testid": "code-slot-4" },
      5: { "data-testid": "code-slot-5" },
    }}
  />

  <label for="controlled">Controlled price (max 1000)</label>
  <input
    id="controlled"
    data-testid="controlled"
    {...controlledField.getInputProps()}
    use:fieldAction={controlledField}
  />

  <label for="invalid">Invalid field</label>
  <input
    id="invalid"
    data-testid="invalid"
    {...invalidField.getInputProps()}
    use:fieldAction={invalidField}
  />
  <small id="invalid-error" class="error" data-testid="invalid-error">
    {$invalidField.status === "invalid" ? "This value is invalid" : ""}
  </small>
</main>
