import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MaskedInput,
  NumberInput,
  InputOTP,
  useNumberInput,
  useMaskedInput,
} from "@zealakit/pattern-input-react";

function ControlledPrice() {
  const [value, setValue] = useState<number | null>(null);
  const field = useNumberInput({
    value,
    maximumFractionDigits: 2,
    onValueChange: (change) => {
      if (change.value !== null && change.value > 1000) {
        return;
      }
      setValue(change.value);
    },
  });
  return (
    <input
      {...(field.getInputProps({
        id: "controlled",
        "data-testid": "controlled",
      }) as object)}
    />
  );
}

function InvalidField() {
  const field = useMaskedInput({
    mask: "999-999",
    describedBy: "invalid-error",
    validate: () => "This value is invalid",
  });
  const invalid = field.status === "invalid";
  return (
    <>
      <input
        {...(field.getInputProps({
          id: "invalid",
          "data-testid": "invalid",
        }) as object)}
      />
      <small id="invalid-error" className="error" data-testid="invalid-error">
        {invalid ? "This value is invalid" : ""}
      </small>
    </>
  );
}

function App() {
  return (
    <main>
      <h1>Pattern Input — React</h1>

      <label htmlFor="price">Price</label>
      <NumberInput
        inputProps={{ id: "price", "data-testid": "price" }}
        maximumFractionDigits={2}
        min={0}
        max={100000}
      />

      <label htmlFor="price-de">Price (de-DE)</label>
      <NumberInput
        inputProps={{ id: "price-de", "data-testid": "price-de" }}
        locale="de-DE"
        maximumFractionDigits={2}
      />

      <label htmlFor="tax">Tax id</label>
      <MaskedInput
        inputProps={{ id: "tax", "data-testid": "tax" }}
        mask="999.999.999-99"
      />

      <label htmlFor="phone">Phone</label>
      <MaskedInput
        inputProps={{ id: "phone", "data-testid": "phone" }}
        mask={["(999) 999-9999", "+9 (999) 999-9999"]}
      />

      <label htmlFor="code-0">Verification code</label>
      <InputOTP
        maxLength={6}
        name="code"
        label="Verification code"
        data-testid="code"
      >
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

      <label htmlFor="controlled">Controlled price (max 1000)</label>
      <ControlledPrice />

      <label htmlFor="invalid">Invalid field</label>
      <InvalidField />
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<App />);
}
