import { createApp, h, ref, defineComponent } from "vue";
import {
  MaskedInput,
  NumberInput,
  OtpInput,
  useNumberInput,
  useMaskedInput,
} from "@zealakit/pattern-input-vue";

const ControlledPrice = defineComponent({
  setup() {
    const value = ref<number | null>(null);
    const field = useNumberInput(() => ({
      value: value.value,
      maximumFractionDigits: 2,
      onValueChange: (change) => {
        if (change.value !== null && change.value > 1000) {
          return;
        }
        value.value = change.value;
      },
    }));
    return () =>
      h("input", {
        ...field.getInputProps({
          id: "controlled",
          "data-testid": "controlled",
        }),
        ref: field.inputRef,
      });
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
      h("div", [
        h("input", {
          ...field.getInputProps({ id: "invalid", "data-testid": "invalid" }),
          ref: field.inputRef,
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
    return () =>
      h("main", [
        h("h1", "Pattern Input — Vue"),
        h("label", { for: "price" }, "Price"),
        h(NumberInput, {
          options: { maximumFractionDigits: 2, min: 0, max: 100000 },
          inputProps: { id: "price", "data-testid": "price" },
        }),
        h("label", { for: "price-de" }, "Price (de-DE)"),
        h(NumberInput, {
          options: { locale: "de-DE", maximumFractionDigits: 2 },
          inputProps: { id: "price-de", "data-testid": "price-de" },
        }),
        h("label", { for: "tax" }, "Tax id"),
        h(MaskedInput, {
          options: { mask: "999.999.999-99" },
          inputProps: { id: "tax", "data-testid": "tax" },
        }),
        h("label", { for: "phone" }, "Phone"),
        h(MaskedInput, {
          options: { mask: ["(999) 999-9999", "+9 (999) 999-9999"] },
          inputProps: { id: "phone", "data-testid": "phone" },
        }),
        h("label", { for: "code-0" }, "Verification code"),
        h(OtpInput, {
          length: 6,
          options: { name: "code" },
          groupProps: {
            "data-testid": "code",
            "aria-label": "Verification code",
          },
          slotProps: {
            0: { id: "code-0", "data-testid": "code-slot-0" },
            1: { "data-testid": "code-slot-1" },
            2: { "data-testid": "code-slot-2" },
            3: { "data-testid": "code-slot-3" },
            4: { "data-testid": "code-slot-4" },
            5: { "data-testid": "code-slot-5" },
          },
        }),
        h("label", { for: "controlled" }, "Controlled price (max 1000)"),
        h(ControlledPrice),
        h("label", { for: "invalid" }, "Invalid field"),
        h(InvalidField),
      ]);
  },
});

createApp(App).mount("#app");
