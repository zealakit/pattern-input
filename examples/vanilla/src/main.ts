import {
  createMaskedInput,
  createNumberInput,
  createOtpInput,
  type FieldStatus,
} from "@zealakit/pattern-input-vanilla";
import "./styles.css";

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}

const input = (id: string) => byId(id, HTMLInputElement);
const select = (id: string) => byId(id, HTMLSelectElement);
const text = (id: string) => byId(id, HTMLElement);

function paintReadout(
  key: string,
  raw: string,
  formatted: string,
  status: FieldStatus,
): void {
  const root = document.querySelector(`[data-readout="${key}"]`);
  if (!root) {
    return;
  }
  const part = (name: string) => root.querySelector(`[data-part="${name}"]`);
  const rawEl = part("raw");
  const formattedEl = part("formatted");
  const statusEl = part("status");
  if (rawEl) rawEl.textContent = `raw: ${raw || "∅"}`;
  if (formattedEl) formattedEl.textContent = `formatted: ${formatted || "∅"}`;
  if (statusEl instanceof HTMLElement) {
    statusEl.textContent = status;
    statusEl.dataset.status = status;
  }
}

// Price
const price = createNumberInput(input("price"), {
  maximumFractionDigits: 2,
  min: 0,
  max: 100000,
});
const paintPrice = () =>
  paintReadout(
    "price",
    price.value === null ? "" : String(price.value),
    price.formattedValue,
    price.status,
  );
price.subscribe(paintPrice);
paintPrice();

// Localized price
function localizedOptions(locale: string) {
  return { locale, maximumFractionDigits: 2 };
}
const priceDe = createNumberInput(input("price-de"), localizedOptions("de-DE"));
const paintPriceDe = () =>
  paintReadout(
    "price-de",
    priceDe.value === null ? "" : String(priceDe.value),
    priceDe.formattedValue,
    priceDe.status,
  );
priceDe.subscribe(paintPriceDe);
paintPriceDe();
select("locale").addEventListener("change", (event) => {
  const locale = (event.target as HTMLSelectElement).value;
  priceDe.setOptions(localizedOptions(locale));
  input("price-de").placeholder = locale === "de-DE" ? "1.234,56" : "1,234.56";
});

// Phone
const PHONE_PRESETS = {
  US: { mask: "(999) 999-9999", placeholder: "(415) 555-0199", dial: "+1" },
  VN: { mask: "9999 999 999", placeholder: "0912 345 678", dial: "+84" },
  UK: { mask: "99999 999999", placeholder: "07700 900123", dial: "+44" },
} as const;
const phone = createMaskedInput(input("phone"), {
  mask: PHONE_PRESETS.US.mask,
});
const paintPhone = () =>
  paintReadout("phone", phone.value, phone.formattedValue, phone.status);
phone.subscribe(paintPhone);
paintPhone();
select("phone-country").addEventListener("change", (event) => {
  const preset =
    PHONE_PRESETS[
      (event.target as HTMLSelectElement).value as keyof typeof PHONE_PRESETS
    ];
  phone.setOptions({ mask: preset.mask });
  input("phone").placeholder = preset.placeholder;
  text("phone-badge").textContent = `${preset.dial} · ${preset.mask}`;
});

// Tax ID
const tax = createMaskedInput(input("tax"), {
  mask: ["999.999.999-99", "99.999.999/9999-99"],
});
const paintTax = () => {
  paintReadout("tax", tax.value, tax.formattedValue, tax.status);
  text("tax-badge").textContent =
    tax.value.length > 11 ? "CNPJ (14 digits)" : "CPF (11 digits)";
};
tax.subscribe(paintTax);
paintTax();
text("tax-sample").addEventListener("click", () =>
  tax.setValue("12345678000190"),
);
text("tax-clear").addEventListener("click", () => tax.clear());

// Payment card
const card = createMaskedInput(input("card"), {
  mask: ["9999 9999 9999 9999", "9999 999999 99999"],
  selectMask: (raw) => (/^3[47]/.test(raw) ? 1 : 0),
});
const paintCard = () => {
  paintReadout("card", card.value, card.formattedValue, card.status);
  text("card-badge").textContent = /^3[47]/.test(card.value)
    ? "Amex · 4-6-5"
    : "Standard · 4-4-4-4";
};
card.subscribe(paintCard);
paintCard();

// License key
const LICENSE_TOKENS = {
  A: { test: /[A-Za-z]/, transform: "upper" },
  H: { test: /[0-9A-Fa-f]/, transform: "upper" },
} as const;
function licenseOptions(always: boolean) {
  return {
    mask: "AA-9999-HH",
    tokens: LICENSE_TOKENS,
    showLiterals: always ? ("always" as const) : ("filled" as const),
    placeholderChar: "_",
  };
}
const license = createMaskedInput(input("license"), licenseOptions(true));
const paintLicense = () =>
  paintReadout(
    "license",
    license.value,
    license.formattedValue,
    license.status,
  );
license.subscribe(paintLicense);
paintLicense();
input("license-literals").addEventListener("change", (event) => {
  license.setOptions(
    licenseOptions((event.target as HTMLInputElement).checked),
  );
});

// OTP
createOtpInput(text("code"), { length: 6, name: "code" });
byId("form", HTMLFormElement).addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  text("code-submitted").textContent = `Submitted: ${
    String(new FormData(form).get("code") ?? "") || "—"
  }`;
});

// Controlled price
function createControlled(element: HTMLInputElement) {
  let value: number | null = null;
  const hint = text("controlled-hint");
  const onChange = (change: { value: number | null }) => {
    if (change.value !== null && change.value > 1000) {
      hint.textContent = "Rejected: values above 1000.";
      return;
    }
    hint.textContent = "Values above 1000 are rejected.";
    value = change.value;
    field.setOptions({ value, onValueChange: onChange });
  };
  const field = createNumberInput(element, { value, onValueChange: onChange });
  return field;
}
createControlled(input("controlled"));

// Validation
const invalidError = document.getElementById("invalid-error");
const invalid = createMaskedInput(input("invalid"), {
  mask: "999-999",
  describedBy: "invalid-error",
  validate: () => "This value is invalid",
});
invalid.subscribe(() => {
  if (invalidError) {
    invalidError.textContent =
      invalid.status === "invalid" ? "This value is invalid" : "";
  }
});
