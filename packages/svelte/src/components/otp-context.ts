import { getContext, setContext } from "svelte";
import type { createOtpInput } from "../fields/otp-input.js";

export type OtpField = ReturnType<typeof createOtpInput>;

const OTP_FIELD = Symbol("pattern-input-otp");

export function setOtpContext(field: OtpField): void {
  setContext(OTP_FIELD, field);
}

export function getOtpContext(): OtpField {
  const field = getContext<OtpField | undefined>(OTP_FIELD);
  if (field === undefined) {
    throw new Error("InputOTP.Slot must be rendered inside <InputOTP>.");
  }
  return field;
}
