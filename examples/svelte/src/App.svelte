<script lang="ts">
import {
  fieldAction,
  MaskedInput,
  NumberInput,
  InputOTP,
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

// The props must follow the controller state (aria-invalid changes on blur), so
// derive them from the field store instead of spreading a one-time snapshot.
let invalidProps = $derived.by(() => {
  void $invalidField;
  return invalidField.getInputProps({ id: "invalid", "data-testid": "invalid" });
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
  <InputOTP maxLength={6} name="code" label="Verification code" data-testid="code">
    <InputOTP.Group>
      <InputOTP.Slot index={0} id="code-0" data-testid="code-slot-0" />
      <InputOTP.Slot index={1} data-testid="code-slot-1" />
      <InputOTP.Slot index={2} data-testid="code-slot-2" />
    </InputOTP.Group>
    <InputOTP.Separator data-testid="code-sep">-</InputOTP.Separator>
    <InputOTP.Group>
      <InputOTP.Slot index={3} data-testid="code-slot-3" />
      <InputOTP.Slot index={4} data-testid="code-slot-4" />
      <InputOTP.Slot index={5} data-testid="code-slot-5" />
    </InputOTP.Group>
  </InputOTP>

  <label for="controlled">Controlled price (max 1000)</label>
  <input
    id="controlled"
    data-testid="controlled"
    {...controlledField.getInputProps()}
    use:fieldAction={controlledField}
  />

  <label for="invalid">Invalid field</label>
  <input {...invalidProps} use:fieldAction={invalidField} />
  <small id="invalid-error" class="error" data-testid="invalid-error">
    {$invalidField.status === "invalid" ? "This value is invalid" : ""}
  </small>
</main>
