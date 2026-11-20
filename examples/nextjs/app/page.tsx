"use client";

import { useState } from "react";
import {
  MaskedInput,
  NumberInput,
  OtpInput,
  useMaskedInput,
  useNumberInput,
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
      id="controlled"
      data-testid="controlled"
      {...(field.getInputProps() as object)}
    />
  );
}

function InvalidField() {
  const field = useMaskedInput({
    mask: "999-999",
    describedBy: "invalid-error",
    validate: () => "This value is invalid",
  });
  return (
    <>
      <input
        id="invalid"
        data-testid="invalid"
        {...(field.getInputProps() as object)}
      />
      <small id="invalid-error" data-testid="invalid-error">
        {field.status === "invalid" ? "This value is invalid" : ""}
      </small>
    </>
  );
}

export default function Home() {
  return (
    <main>
      <h1>Pattern Input — Next.js</h1>

      <label htmlFor="price">Price</label>
      <NumberInput
        inputProps={{ id: "price", "data-testid": "price" }}
        maximumFractionDigits={2}
        min={0}
        max={100000}
      />

      <label htmlFor="tax">Tax id</label>
      <MaskedInput
        inputProps={{ id: "tax", "data-testid": "tax" }}
        mask="999.999.999-99"
      />

      <label htmlFor="code-0">Verification code</label>
      <OtpInput
        length={6}
        name="code"
        groupProps={{
          "data-testid": "code",
          "aria-label": "Verification code",
        }}
        slotProps={{
          0: { id: "code-0", "data-testid": "code-slot-0" },
          1: { "data-testid": "code-slot-1" },
          2: { "data-testid": "code-slot-2" },
          3: { "data-testid": "code-slot-3" },
          4: { "data-testid": "code-slot-4" },
          5: { "data-testid": "code-slot-5" },
        }}
      />

      <label htmlFor="controlled">Controlled price (max 1000)</label>
      <ControlledPrice />

      <label htmlFor="invalid">Invalid field</label>
      <InvalidField />
    </main>
  );
}
