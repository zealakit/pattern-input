import {
  createMaskedInput,
  createNumberInput,
  createOtpInput,
} from "@zealakit/pattern-input-vanilla";

function byId(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input #${id}`);
  }
  return element;
}

createNumberInput(byId("price"), {
  maximumFractionDigits: 2,
  min: 0,
  max: 100000,
});

createNumberInput(byId("price-de"), {
  locale: "de-DE",
  maximumFractionDigits: 2,
});

createMaskedInput(byId("tax"), { mask: "999.999.999-99" });

createMaskedInput(byId("phone"), {
  mask: ["(999) 999-9999", "+9 (999) 999-9999"],
});

const codeGroup = document.getElementById("code");
if (codeGroup) {
  createOtpInput(codeGroup, { length: 6, name: "code" });
}

function createControlled(element: HTMLInputElement) {
  let value: number | null = null;
  const onChange = (change: { value: number | null }) => {
    if (change.value !== null && change.value > 1000) {
      return;
    }
    value = change.value;
    field.setOptions({ value, onValueChange: onChange });
  };
  const field = createNumberInput(element, { value, onValueChange: onChange });
  return field;
}

createControlled(byId("controlled"));

const invalidError = document.getElementById("invalid-error");
const invalid = createMaskedInput(byId("invalid"), {
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
