import type { ResolvedOtpOptions } from "./options.js";
import type { OtpState } from "./state.js";

export type OtpGroupProps = {
  readonly role: "group";
  readonly "aria-label"?: string;
  readonly "aria-labelledby"?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: "true";
  readonly "aria-disabled"?: "true";
};

export type OtpSlotProps = {
  readonly type: "text";
  readonly inputmode: "numeric" | "text";
  readonly pattern?: string;
  readonly autocomplete: "one-time-code" | "off" | "one-time-code" | "off";
  readonly maxlength: number;
  readonly "aria-label": string;
  readonly tabindex: 0 | -1;
  readonly autocorrect: "off";
  readonly spellcheck: "false";
  readonly autocapitalize: "off";
  readonly disabled?: true;
};

export type OtpHiddenInputProps = {
  readonly type: "hidden";
  readonly name?: string;
  readonly value: string;
  readonly required?: true;
};

function isInvalid(state: OtpState, resolved: ResolvedOtpOptions): boolean {
  return state.status === "invalid" || resolved.invalid;
}

/** Group props: the whole field is one accessible control (FR-25). */
export function getOtpGroupProps(
  state: OtpState,
  resolved: ResolvedOtpOptions,
): OtpGroupProps {
  return {
    role: "group",
    ...(resolved.label !== null ? { "aria-label": resolved.label } : {}),
    ...(resolved.labelledBy !== null
      ? { "aria-labelledby": resolved.labelledBy }
      : {}),
    ...(resolved.describedBy !== null
      ? { "aria-describedby": resolved.describedBy }
      : {}),
    ...(isInvalid(state, resolved) ? { "aria-invalid": "true" as const } : {}),
    ...(resolved.disabled ? { "aria-disabled": "true" as const } : {}),
  };
}

/**
 * Slot props. Slot 0 carries `autocomplete` and a `maxlength` of the full
 * length so mobile autofill can deliver the whole code (handled as paste).
 * Roving `tabindex` keeps Tab entering and leaving the group once (FR-13).
 */
export function getOtpSlotProps(
  state: OtpState,
  resolved: ResolvedOtpOptions,
  index: number,
): OtpSlotProps {
  const numeric = resolved.type === "numeric";
  return {
    type: "text",
    inputmode: numeric ? "numeric" : "text",
    ...(numeric ? { pattern: "[0-9]*" } : {}),
    autocomplete: index === 0 ? resolved.autocomplete : "off",
    maxlength: index === 0 ? resolved.length : 1,
    "aria-label": resolved.slotLabel(index, resolved.length),
    tabindex: index === state.activeIndex ? 0 : -1,
    autocorrect: "off",
    spellcheck: "false",
    autocapitalize: "off",
    ...(resolved.disabled ? { disabled: true as const } : {}),
  };
}

/** Hidden input carrying the aggregate value for form submission. */
export function getOtpHiddenInputProps(
  state: OtpState,
  resolved: ResolvedOtpOptions,
): OtpHiddenInputProps {
  return {
    type: "hidden",
    ...(resolved.name !== null ? { name: resolved.name } : {}),
    value: state.rawValue,
    ...(resolved.required ? { required: true as const } : {}),
  };
}
