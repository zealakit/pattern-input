import { useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  InputOTP,
  useMaskedInput,
  useNumberInput,
  type FieldStatus,
  type MaskedInputOptions,
} from "@zealakit/pattern-input-react";
import "./styles.css";

function Readout({
  raw,
  formatted,
  status,
}: {
  raw: string;
  formatted: string;
  status: FieldStatus;
}) {
  return (
    <div className="readout" aria-live="off">
      <span>raw: {raw || "∅"}</span>
      <span>formatted: {formatted || "∅"}</span>
      <span className="status" data-status={status}>
        {status}
      </span>
    </div>
  );
}

function Card({
  id,
  title,
  badge,
  hint,
  children,
}: {
  id: string;
  title: string;
  badge: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="field-card">
      <div className="field-header">
        <label htmlFor={id}>{title}</label>
        <span className="badge">{badge}</span>
      </div>
      {children}
      {hint ? <p className="hint">{hint}</p> : null}
    </section>
  );
}

function PriceCard() {
  const field = useNumberInput({
    maximumFractionDigits: 2,
    min: 0,
    max: 100000,
  });
  return (
    <Card
      id="price"
      title="Price"
      badge="number"
      hint="ArrowUp/Down ±1, PageUp/Down ±10, Cmd/Ctrl+Z undo."
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <input
          {...(field.getInputProps({
            id: "price",
            "data-testid": "price",
            placeholder: "1,234.56",
          }) as object)}
        />
      </form>
      <Readout
        raw={field.value === null ? "" : String(field.value)}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

function LocalizedPriceCard() {
  const [locale, setLocale] = useState("de-DE");
  const field = useNumberInput({ locale, maximumFractionDigits: 2 });
  return (
    <Card
      id="price-de"
      title="Localized price"
      badge="number · locale"
      hint="Switching the locale reformats the live value."
    >
      <div className="row">
        <input
          {...(field.getInputProps({
            id: "price-de",
            "data-testid": "price-de",
            placeholder: locale === "de-DE" ? "1.234,56" : "1,234.56",
          }) as object)}
        />
        <select
          aria-label="Locale"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
        >
          <option value="de-DE">de-DE</option>
          <option value="en-US">en-US</option>
          <option value="vi-VN">vi-VN</option>
        </select>
      </div>
      <Readout
        raw={field.value === null ? "" : String(field.value)}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

const PHONE_PRESETS = {
  US: { mask: "(999) 999-9999", placeholder: "(415) 555-0199", dial: "+1" },
  VN: { mask: "9999 999 999", placeholder: "0912 345 678", dial: "+84" },
  UK: { mask: "99999 999999", placeholder: "07700 900123", dial: "+44" },
} as const;

type Country = keyof typeof PHONE_PRESETS;

function PhoneCard() {
  const [country, setCountry] = useState<Country>("US");
  const preset = PHONE_PRESETS[country];
  const field = useMaskedInput({ mask: preset.mask });
  return (
    <Card
      id="phone"
      title="Phone number"
      badge={`${preset.dial} · ${preset.mask}`}
      hint="One exact mask per country; extra digits are rejected."
    >
      <div className="row">
        <select
          aria-label="Phone country"
          data-testid="phone-country"
          value={country}
          onChange={(event) => setCountry(event.target.value as Country)}
        >
          {Object.entries(PHONE_PRESETS).map(([code, item]) => (
            <option key={code} value={code}>
              {code} {item.dial}
            </option>
          ))}
        </select>
        <input
          {...(field.getInputProps({
            id: "phone",
            "data-testid": "phone",
            placeholder: preset.placeholder,
          }) as object)}
        />
      </div>
      <Readout
        raw={field.value}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

function TaxCard() {
  const field = useMaskedInput({
    mask: ["999.999.999-99", "99.999.999/9999-99"],
  });
  const kind = field.value.length > 11 ? "CNPJ (14 digits)" : "CPF (11 digits)";
  return (
    <Card
      id="tax"
      title="Tax ID"
      badge={kind}
      hint="The mask switches by length: CPF, then CNPJ."
    >
      <input
        {...(field.getInputProps({
          id: "tax",
          "data-testid": "tax",
          placeholder: "123.456.789-00",
        }) as object)}
      />
      <div className="actions">
        <button
          type="button"
          className="preset-btn"
          onClick={() => field.setValue("12345678000190")}
        >
          Paste sample CNPJ
        </button>
        <button type="button" className="preset-btn" onClick={field.clear}>
          Clear
        </button>
      </div>
      <Readout
        raw={field.value}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

const CARD_OPTIONS: MaskedInputOptions = {
  mask: ["9999 9999 9999 9999", "9999 999999 99999"],
  selectMask: (raw: string) => (/^3[47]/.test(raw) ? 1 : 0),
};

function PaymentCard() {
  const field = useMaskedInput(CARD_OPTIONS);
  const amex = /^3[47]/.test(field.value);
  return (
    <Card
      id="card"
      title="Payment card"
      badge={amex ? "Amex · 4-6-5" : "Standard · 4-4-4-4"}
      hint="selectMask picks the format from the card prefix."
    >
      <input
        {...(field.getInputProps({
          id: "card",
          "data-testid": "card",
          placeholder: "4111 1111 1111 1111",
        }) as object)}
      />
      <Readout
        raw={field.value}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

const LICENSE_TOKENS = {
  A: { test: /[A-Za-z]/, transform: "upper" },
  H: { test: /[0-9A-Fa-f]/, transform: "upper" },
} as const;

function LicenseCard() {
  const [always, setAlways] = useState(true);
  const field = useMaskedInput({
    mask: "AA-9999-HH",
    tokens: LICENSE_TOKENS,
    showLiterals: always ? "always" : "filled",
    placeholderChar: "_",
  });
  return (
    <Card
      id="license"
      title="License key"
      badge="AA-9999-HH"
      hint="Custom tokens A (letter) and H (hex), upper-cased."
    >
      <input
        {...(field.getInputProps({
          id: "license",
          "data-testid": "license",
        }) as object)}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          checked={always}
          onChange={(event) => setAlways(event.target.checked)}
        />
        Always show literals
      </label>
      <Readout
        raw={field.value}
        formatted={field.formattedValue}
        status={field.status}
      />
    </Card>
  );
}

function OtpCard() {
  const [submitted, setSubmitted] = useState("");
  return (
    <section className="field-card">
      <div className="field-header">
        <label htmlFor="code-0">Verification code</label>
        <span className="badge">otp · 6</span>
      </div>
      <form
        className="otp-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(
            String(new FormData(event.currentTarget).get("code") ?? ""),
          );
        }}
      >
        <InputOTP
          maxLength={6}
          name="code"
          label="Verification code"
          data-testid="code"
          className="otp-group"
        >
          <InputOTP.Group className="otp-chunk">
            <InputOTP.Slot index={0} id="code-0" data-testid="code-slot-0" />
            <InputOTP.Slot index={1} data-testid="code-slot-1" />
            <InputOTP.Slot index={2} data-testid="code-slot-2" />
          </InputOTP.Group>
          <InputOTP.Separator data-testid="code-sep" className="otp-sep">
            -
          </InputOTP.Separator>
          <InputOTP.Group className="otp-chunk">
            <InputOTP.Slot index={3} data-testid="code-slot-3" />
            <InputOTP.Slot index={4} data-testid="code-slot-4" />
            <InputOTP.Slot index={5} data-testid="code-slot-5" />
          </InputOTP.Group>
        </InputOTP>
        <div className="actions">
          <button type="submit" className="preset-btn">
            Submit
          </button>
        </div>
      </form>
      <p className="hint" data-testid="code-submitted">
        Submitted: {submitted || "—"}
      </p>
    </section>
  );
}

function ControlledPrice() {
  const [value, setValue] = useState<number | null>(null);
  const [rejected, setRejected] = useState(false);
  const field = useNumberInput({
    value,
    maximumFractionDigits: 2,
    onValueChange: (change) => {
      if (change.value !== null && change.value > 1000) {
        setRejected(true);
        return;
      }
      setRejected(false);
      setValue(change.value);
    },
  });
  return (
    <Card
      id="controlled"
      title="Controlled price"
      badge="max 1000"
      hint={
        rejected
          ? "Rejected: values above 1000."
          : "Values above 1000 are rejected."
      }
    >
      <input
        {...(field.getInputProps({
          id: "controlled",
          "data-testid": "controlled",
        }) as object)}
      />
    </Card>
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
    <Card id="invalid" title="Validation" badge="999-999">
      <input
        {...(field.getInputProps({
          id: "invalid",
          "data-testid": "invalid",
        }) as object)}
      />
      <small id="invalid-error" className="error" data-testid="invalid-error">
        {invalid ? "This value is invalid" : ""}
      </small>
    </Card>
  );
}

function App() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Pattern Input — React</h1>
        <p>
          Headless number, mask and OTP fields. Styling lives in this example.
        </p>
      </header>
      <div className="demo-grid">
        <PriceCard />
        <LocalizedPriceCard />
        <PhoneCard />
        <TaxCard />
        <PaymentCard />
        <LicenseCard />
        <OtpCard />
        <ControlledPrice />
        <InvalidField />
      </div>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<App />);
}
