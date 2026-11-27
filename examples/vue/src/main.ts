import { computed, createApp, defineComponent, h, ref } from "vue";
import type { VNodeChild } from "vue";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  useMaskedInput,
  useNumberInput,
} from "@zealakit/pattern-input-vue";
import "./styles.css";

type Readable = {
  state: { value: unknown };
  formattedValue(): string;
  status(): string;
};

function readout(raw: string, field: Readable): VNodeChild {
  void field.state.value;
  const status = field.status();
  return h("div", { class: "readout" }, [
    h("span", `raw: ${raw || "∅"}`),
    h("span", `formatted: ${field.formattedValue() || "∅"}`),
    h("span", { class: "status", "data-status": status }, status),
  ]);
}

function card(
  id: string,
  title: string,
  badge: string,
  children: VNodeChild[],
  hint?: string,
): VNodeChild {
  return h("section", { class: "field-card" }, [
    h("div", { class: "field-header" }, [
      h("label", { for: id }, title),
      h("span", { class: "badge" }, badge),
    ]),
    ...children,
    hint ? h("p", { class: "hint" }, hint) : null,
  ]);
}

const PriceCard = defineComponent({
  setup() {
    const field = useNumberInput(() => ({
      maximumFractionDigits: 2,
      min: 0,
      max: 100000,
    }));
    return () =>
      card(
        "price",
        "Price",
        "number",
        [
          h("form", { onSubmit: (event: Event) => event.preventDefault() }, [
            h("input", {
              ...field.getInputProps({
                id: "price",
                "data-testid": "price",
                placeholder: "1,234.56",
              }),
              ref: field.inputRef as never,
            }),
          ]),
          readout(String(field.value() ?? ""), field),
        ],
        "ArrowUp/Down ±1, PageUp/Down ±10, Cmd/Ctrl+Z undo.",
      );
  },
});

const LocalizedPriceCard = defineComponent({
  setup() {
    const locale = ref("de-DE");
    const field = useNumberInput(() => ({
      locale: locale.value,
      maximumFractionDigits: 2,
    }));
    return () =>
      card(
        "price-de",
        "Localized price",
        "number · locale",
        [
          h("div", { class: "row" }, [
            h("input", {
              ...field.getInputProps({
                id: "price-de",
                "data-testid": "price-de",
                placeholder: locale.value === "de-DE" ? "1.234,56" : "1,234.56",
              }),
              ref: field.inputRef as never,
            }),
            h(
              "select",
              {
                "aria-label": "Locale",
                value: locale.value,
                onChange: (event: Event) => {
                  locale.value = (event.target as HTMLSelectElement).value;
                },
              },
              ["de-DE", "en-US", "vi-VN"].map((code) =>
                h("option", { value: code }, code),
              ),
            ),
          ]),
          readout(String(field.value() ?? ""), field),
        ],
        "Switching the locale reformats the live value.",
      );
  },
});

const PHONE_PRESETS = {
  US: { mask: "(999) 999-9999", placeholder: "(415) 555-0199", dial: "+1" },
  VN: { mask: "9999 999 999", placeholder: "0912 345 678", dial: "+84" },
  UK: { mask: "99999 999999", placeholder: "07700 900123", dial: "+44" },
} as const;
type Country = keyof typeof PHONE_PRESETS;

const PhoneCard = defineComponent({
  setup() {
    const country = ref<Country>("US");
    const field = useMaskedInput(() => ({
      mask: PHONE_PRESETS[country.value].mask,
    }));
    return () => {
      const preset = PHONE_PRESETS[country.value];
      return card(
        "phone",
        "Phone number",
        `${preset.dial} · ${preset.mask}`,
        [
          h("div", { class: "row" }, [
            h(
              "select",
              {
                "aria-label": "Phone country",
                "data-testid": "phone-country",
                value: country.value,
                onChange: (event: Event) => {
                  country.value = (event.target as HTMLSelectElement)
                    .value as Country;
                },
              },
              Object.entries(PHONE_PRESETS).map(([code, item]) =>
                h("option", { value: code }, `${code} ${item.dial}`),
              ),
            ),
            h("input", {
              ...field.getInputProps({
                id: "phone",
                "data-testid": "phone",
                placeholder: preset.placeholder,
              }),
              ref: field.inputRef as never,
            }),
          ]),
          readout(field.value(), field),
        ],
        "One exact mask per country; extra digits are rejected.",
      );
    };
  },
});

const TaxCard = defineComponent({
  setup() {
    const field = useMaskedInput(() => ({
      mask: ["999.999.999-99", "99.999.999/9999-99"],
    }));
    return () => {
      void field.state.value;
      return card(
        "tax",
        "Tax ID",
        field.value().length > 11 ? "CNPJ (14 digits)" : "CPF (11 digits)",
        [
          h("input", {
            ...field.getInputProps({
              id: "tax",
              "data-testid": "tax",
              placeholder: "123.456.789-00",
            }),
            ref: field.inputRef as never,
          }),
          h("div", { class: "actions" }, [
            h(
              "button",
              {
                type: "button",
                class: "preset-btn",
                onClick: () => field.setValue("12345678000190"),
              },
              "Paste sample CNPJ",
            ),
            h(
              "button",
              {
                type: "button",
                class: "preset-btn",
                onClick: () => field.clear(),
              },
              "Clear",
            ),
          ]),
          readout(field.value(), field),
        ],
        "The mask switches by length: CPF, then CNPJ.",
      );
    };
  },
});

const PaymentCard = defineComponent({
  setup() {
    const field = useMaskedInput(() => ({
      mask: ["9999 9999 9999 9999", "9999 999999 99999"],
      selectMask: (raw: string) => (/^3[47]/.test(raw) ? 1 : 0),
    }));
    return () => {
      void field.state.value;
      return card(
        "card",
        "Payment card",
        /^3[47]/.test(field.value()) ? "Amex · 4-6-5" : "Standard · 4-4-4-4",
        [
          h("input", {
            ...field.getInputProps({
              id: "card",
              "data-testid": "card",
              placeholder: "4111 1111 1111 1111",
            }),
            ref: field.inputRef as never,
          }),
          readout(field.value(), field),
        ],
        "selectMask picks the format from the card prefix.",
      );
    };
  },
});

const LICENSE_TOKENS = {
  A: { test: /[A-Za-z]/, transform: "upper" },
  H: { test: /[0-9A-Fa-f]/, transform: "upper" },
} as const;

const LicenseCard = defineComponent({
  setup() {
    const always = ref(true);
    const field = useMaskedInput(() => ({
      mask: "AA-9999-HH",
      tokens: LICENSE_TOKENS,
      showLiterals: always.value ? "always" : "filled",
      placeholderChar: "_",
    }));
    return () =>
      card(
        "license",
        "License key",
        "AA-9999-HH",
        [
          h("input", {
            ...field.getInputProps({ id: "license", "data-testid": "license" }),
            ref: field.inputRef as never,
          }),
          h("label", { class: "checkbox" }, [
            h("input", {
              type: "checkbox",
              checked: always.value,
              onChange: (event: Event) => {
                always.value = (event.target as HTMLInputElement).checked;
              },
            }),
            "Always show literals",
          ]),
          readout(field.value(), field),
        ],
        "Custom tokens A (letter) and H (hex), upper-cased.",
      );
  },
});

const OtpCard = defineComponent({
  setup() {
    const submitted = ref("");
    const slot = (index: number) =>
      h(InputOTPSlot, {
        index,
        ...(index === 0 ? { id: "code-0" } : {}),
        "data-testid": `code-slot-${index}`,
      });
    return () =>
      h("section", { class: "field-card" }, [
        h("div", { class: "field-header" }, [
          h("label", { for: "code-0" }, "Verification code"),
          h("span", { class: "badge" }, "otp · 6"),
        ]),
        h(
          "form",
          {
            class: "otp-form",
            onSubmit: (event: Event) => {
              event.preventDefault();
              submitted.value = String(
                new FormData(event.currentTarget as HTMLFormElement).get(
                  "code",
                ) ?? "",
              );
            },
          },
          [
            h(
              InputOTP,
              {
                maxLength: 6,
                name: "code",
                label: "Verification code",
                class: "otp-group",
                "data-testid": "code",
              },
              () => [
                h(InputOTPGroup, { class: "otp-chunk" }, () => [
                  slot(0),
                  slot(1),
                  slot(2),
                ]),
                h(
                  InputOTPSeparator,
                  { class: "otp-sep", "data-testid": "code-sep" },
                  () => "-",
                ),
                h(InputOTPGroup, { class: "otp-chunk" }, () => [
                  slot(3),
                  slot(4),
                  slot(5),
                ]),
              ],
            ),
            h("div", { class: "actions" }, [
              h("button", { type: "submit", class: "preset-btn" }, "Submit"),
            ]),
          ],
        ),
        h(
          "p",
          { class: "hint", "data-testid": "code-submitted" },
          `Submitted: ${submitted.value || "—"}`,
        ),
      ]);
  },
});

const ControlledPrice = defineComponent({
  setup() {
    const value = ref<number | null>(null);
    const rejected = ref(false);
    const field = useNumberInput(() => ({
      value: value.value,
      maximumFractionDigits: 2,
      onValueChange: (change) => {
        if (change.value !== null && change.value > 1000) {
          rejected.value = true;
          return;
        }
        rejected.value = false;
        value.value = change.value;
      },
    }));
    return () =>
      card(
        "controlled",
        "Controlled price",
        "max 1000",
        [
          h("input", {
            ...field.getInputProps({
              id: "controlled",
              "data-testid": "controlled",
            }),
            ref: field.inputRef as never,
          }),
        ],
        rejected.value
          ? "Rejected: values above 1000."
          : "Values above 1000 are rejected.",
      );
  },
});

const InvalidField = defineComponent({
  setup() {
    const field = useMaskedInput(() => ({
      mask: "999-999",
      describedBy: "invalid-error",
      validate: () => "This value is invalid",
    }));
    return () =>
      card("invalid", "Validation", "999-999", [
        h("input", {
          ...field.getInputProps({ id: "invalid", "data-testid": "invalid" }),
          ref: field.inputRef as never,
        }),
        h(
          "small",
          {
            id: "invalid-error",
            class: "error",
            "data-testid": "invalid-error",
          },
          field.status() === "invalid" ? "This value is invalid" : "",
        ),
      ]);
  },
});

const App = defineComponent({
  setup() {
    const cards = computed(() => [
      PriceCard,
      LocalizedPriceCard,
      PhoneCard,
      TaxCard,
      PaymentCard,
      LicenseCard,
      OtpCard,
      ControlledPrice,
      InvalidField,
    ]);
    return () =>
      h("main", { class: "page" }, [
        h("header", { class: "page-header" }, [
          h("h1", "Pattern Input — Vue"),
          h(
            "p",
            "Headless number, mask and OTP fields. Styling lives in this example.",
          ),
        ]),
        h(
          "div",
          { class: "demo-grid" },
          cards.value.map((component) => h(component)),
        ),
      ]);
  },
});

createApp(App).mount("#app");
