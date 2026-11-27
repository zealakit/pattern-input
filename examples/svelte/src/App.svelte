<script lang="ts">
import {
  fieldAction,
  InputOTP,
  createMaskedInput,
  createNumberInput,
} from "@zealakit/pattern-input-svelte";
import "./styles.css";

const PHONE_PRESETS = {
  US: { mask: "(999) 999-9999", placeholder: "(415) 555-0199", dial: "+1" },
  VN: { mask: "9999 999 999", placeholder: "0912 345 678", dial: "+84" },
  UK: { mask: "99999 999999", placeholder: "07700 900123", dial: "+44" },
} as const;
type Country = keyof typeof PHONE_PRESETS;

const LICENSE_TOKENS = {
  A: { test: /[A-Za-z]/, transform: "upper" },
  H: { test: /[0-9A-Fa-f]/, transform: "upper" },
} as const;

let locale = $state("de-DE");
let country = $state<Country>("US");
let always = $state(true);
let controlled = $state<number | null>(null);
let rejected = $state(false);
let submitted = $state("");

const priceField = createNumberInput(() => ({
  maximumFractionDigits: 2,
  min: 0,
  max: 100000,
}));
const priceDeField = createNumberInput(() => ({
  locale,
  maximumFractionDigits: 2,
}));
const phoneField = createMaskedInput(() => ({
  mask: PHONE_PRESETS[country].mask,
}));
const taxField = createMaskedInput(() => ({
  mask: ["999.999.999-99", "99.999.999/9999-99"],
}));
const cardField = createMaskedInput(() => ({
  mask: ["9999 9999 9999 9999", "9999 999999 99999"],
  selectMask: (raw: string) => (/^3[47]/.test(raw) ? 1 : 0),
}));
const licenseField = createMaskedInput(() => ({
  mask: "AA-9999-HH",
  tokens: LICENSE_TOKENS,
  showLiterals: always ? "always" : "filled",
  placeholderChar: "_",
}));
const controlledField = createNumberInput(() => ({
  value: controlled,
  maximumFractionDigits: 2,
  onValueChange: (change) => {
    if (change.value !== null && change.value > 1000) {
      rejected = true;
      return;
    }
    rejected = false;
    controlled = change.value;
  },
}));
const invalidField = createMaskedInput(() => ({
  mask: "999-999",
  describedBy: "invalid-error",
  validate: () => "This value is invalid",
}));

$effect.pre(() => {
  priceField.sync();
  priceDeField.sync();
  phoneField.sync();
  taxField.sync();
  cardField.sync();
  licenseField.sync();
  controlledField.sync();
  invalidField.sync();
});

// Props follow the controller state (aria-invalid etc.), so derive them from
// each field store instead of spreading a one-time snapshot.
const priceProps = $derived.by(() => {
  void $priceField;
  return priceField.getInputProps({
    id: "price",
    "data-testid": "price",
    placeholder: "1,234.56",
  });
});
const priceDeProps = $derived.by(() => {
  void $priceDeField;
  return priceDeField.getInputProps({
    id: "price-de",
    "data-testid": "price-de",
    placeholder: locale === "de-DE" ? "1.234,56" : "1,234.56",
  });
});
const phoneProps = $derived.by(() => {
  void $phoneField;
  return phoneField.getInputProps({
    id: "phone",
    "data-testid": "phone",
    placeholder: PHONE_PRESETS[country].placeholder,
  });
});
const taxProps = $derived.by(() => {
  void $taxField;
  return taxField.getInputProps({
    id: "tax",
    "data-testid": "tax",
    placeholder: "123.456.789-00",
  });
});
const cardProps = $derived.by(() => {
  void $cardField;
  return cardField.getInputProps({
    id: "card",
    "data-testid": "card",
    placeholder: "4111 1111 1111 1111",
  });
});
const licenseProps = $derived.by(() => {
  void $licenseField;
  return licenseField.getInputProps({
    id: "license",
    "data-testid": "license",
  });
});
const controlledProps = $derived.by(() => {
  void $controlledField;
  return controlledField.getInputProps({
    id: "controlled",
    "data-testid": "controlled",
  });
});
const invalidProps = $derived.by(() => {
  void $invalidField;
  return invalidField.getInputProps({
    id: "invalid",
    "data-testid": "invalid",
  });
});

const preset = $derived(PHONE_PRESETS[country]);
const taxKind = $derived(
  $taxField.rawValue.length > 11 ? "CNPJ (14 digits)" : "CPF (11 digits)",
);
const cardKind = $derived(
  /^3[47]/.test($cardField.rawValue) ? "Amex · 4-6-5" : "Standard · 4-4-4-4",
);

function onOtpSubmit(event: SubmitEvent) {
  event.preventDefault();
  submitted = String(
    new FormData(event.currentTarget as HTMLFormElement).get("code") ?? "",
  );
}
</script>

<main class="page">
  <header class="page-header">
    <h1>Pattern Input — Svelte</h1>
    <p>Headless number, mask and OTP fields. Styling lives in this example.</p>
  </header>

  <div class="demo-grid">
    <section class="field-card">
      <div class="field-header">
        <label for="price">Price</label>
        <span class="badge">number</span>
      </div>
      <form onsubmit={(event) => event.preventDefault()}>
        <input {...priceProps} use:fieldAction={priceField} />
      </form>
      <div class="readout">
        <span>raw: {$priceField.rawValue ?? "∅"}</span>
        <span>formatted: {$priceField.formattedValue || "∅"}</span>
        <span class="status" data-status={$priceField.status}>{$priceField.status}</span>
      </div>
      <p class="hint">ArrowUp/Down ±1, PageUp/Down ±10, Cmd/Ctrl+Z undo.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="price-de">Localized price</label>
        <span class="badge">number · locale</span>
      </div>
      <div class="row">
        <input {...priceDeProps} use:fieldAction={priceDeField} />
        <select aria-label="Locale" bind:value={locale}>
          <option value="de-DE">de-DE</option>
          <option value="en-US">en-US</option>
          <option value="vi-VN">vi-VN</option>
        </select>
      </div>
      <div class="readout">
        <span>raw: {$priceDeField.rawValue ?? "∅"}</span>
        <span>formatted: {$priceDeField.formattedValue || "∅"}</span>
        <span class="status" data-status={$priceDeField.status}>{$priceDeField.status}</span>
      </div>
      <p class="hint">Switching the locale reformats the live value.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="phone">Phone number</label>
        <span class="badge">{preset.dial} · {preset.mask}</span>
      </div>
      <div class="row">
        <select aria-label="Phone country" data-testid="phone-country" bind:value={country}>
          {#each Object.entries(PHONE_PRESETS) as [code, item] (code)}
            <option value={code}>{code} {item.dial}</option>
          {/each}
        </select>
        <input {...phoneProps} use:fieldAction={phoneField} />
      </div>
      <div class="readout">
        <span>raw: {$phoneField.rawValue || "∅"}</span>
        <span>formatted: {$phoneField.formattedValue || "∅"}</span>
        <span class="status" data-status={$phoneField.status}>{$phoneField.status}</span>
      </div>
      <p class="hint">One exact mask per country; extra digits are rejected.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="tax">Tax ID</label>
        <span class="badge">{taxKind}</span>
      </div>
      <input {...taxProps} use:fieldAction={taxField} />
      <div class="actions">
        <button type="button" class="preset-btn" onclick={() => taxField.setValue("12345678000190")}>
          Paste sample CNPJ
        </button>
        <button type="button" class="preset-btn" onclick={() => taxField.clear()}>Clear</button>
      </div>
      <div class="readout">
        <span>raw: {$taxField.rawValue || "∅"}</span>
        <span>formatted: {$taxField.formattedValue || "∅"}</span>
        <span class="status" data-status={$taxField.status}>{$taxField.status}</span>
      </div>
      <p class="hint">The mask switches by length: CPF, then CNPJ.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="card">Payment card</label>
        <span class="badge">{cardKind}</span>
      </div>
      <input {...cardProps} use:fieldAction={cardField} />
      <div class="readout">
        <span>raw: {$cardField.rawValue || "∅"}</span>
        <span>formatted: {$cardField.formattedValue || "∅"}</span>
        <span class="status" data-status={$cardField.status}>{$cardField.status}</span>
      </div>
      <p class="hint">selectMask picks the format from the card prefix.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="license">License key</label>
        <span class="badge">AA-9999-HH</span>
      </div>
      <input {...licenseProps} use:fieldAction={licenseField} />
      <label class="checkbox">
        <input type="checkbox" bind:checked={always} /> Always show literals
      </label>
      <div class="readout">
        <span>raw: {$licenseField.rawValue || "∅"}</span>
        <span>formatted: {$licenseField.formattedValue || "∅"}</span>
        <span class="status" data-status={$licenseField.status}>{$licenseField.status}</span>
      </div>
      <p class="hint">Custom tokens A (letter) and H (hex), upper-cased.</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="code-0">Verification code</label>
        <span class="badge">otp · 6</span>
      </div>
      <form class="otp-form" onsubmit={onOtpSubmit}>
        <InputOTP
          maxLength={6}
          name="code"
          label="Verification code"
          data-testid="code"
          class="otp-group"
        >
          <InputOTP.Group class="otp-chunk">
            <InputOTP.Slot index={0} id="code-0" data-testid="code-slot-0" />
            <InputOTP.Slot index={1} data-testid="code-slot-1" />
            <InputOTP.Slot index={2} data-testid="code-slot-2" />
          </InputOTP.Group>
          <InputOTP.Separator data-testid="code-sep" class="otp-sep">-</InputOTP.Separator>
          <InputOTP.Group class="otp-chunk">
            <InputOTP.Slot index={3} data-testid="code-slot-3" />
            <InputOTP.Slot index={4} data-testid="code-slot-4" />
            <InputOTP.Slot index={5} data-testid="code-slot-5" />
          </InputOTP.Group>
        </InputOTP>
        <div class="actions"><button type="submit" class="preset-btn">Submit</button></div>
      </form>
      <p class="hint" data-testid="code-submitted">Submitted: {submitted || "—"}</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="controlled">Controlled price</label>
        <span class="badge">max 1000</span>
      </div>
      <input {...controlledProps} use:fieldAction={controlledField} />
      <p class="hint">{rejected ? "Rejected: values above 1000." : "Values above 1000 are rejected."}</p>
    </section>

    <section class="field-card">
      <div class="field-header">
        <label for="invalid">Validation</label>
        <span class="badge">999-999</span>
      </div>
      <input {...invalidProps} use:fieldAction={invalidField} />
      <small id="invalid-error" class="error" data-testid="invalid-error">
        {$invalidField.status === "invalid" ? "This value is invalid" : ""}
      </small>
    </section>
  </div>
</main>
