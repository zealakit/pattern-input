import type { ResolvedMaskedOptions } from "./options.js";
import type { MaskedState } from "./state.js";

export type MaskedInputProps = {
  readonly type: "text";
  readonly inputmode: "text" | "numeric";
  readonly autocomplete: "off";
  readonly autocorrect: "off";
  readonly spellcheck: "false";
  readonly autocapitalize: "characters" | "off";
  readonly maxlength?: number;
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
  readonly "aria-required"?: "true";
  readonly disabled?: true;
  readonly readonly?: true;
};

const cache = new WeakMap<
  MaskedState,
  { readonly resolved: ResolvedMaskedOptions; readonly props: MaskedInputProps }
>();

/**
 * DOM-attribute-shaped props for the host input. No `role`, no `placeholder`
 * (consumer-owned), and `aria-invalid` only for a real invalid state.
 */
export function getMaskedInputProps(
  state: MaskedState,
  resolved: ResolvedMaskedOptions,
): MaskedInputProps {
  const cached = cache.get(state);
  if (cached && cached.resolved === resolved) {
    return cached.props;
  }

  const props = Object.freeze({
    type: "text",
    inputmode: resolved.inputMode,
    autocomplete: "off",
    autocorrect: "off",
    spellcheck: "false",
    autocapitalize:
      resolved.hasLetterSlots && resolved.allLetterSlotsUpper
        ? "characters"
        : "off",
    ...(resolved.showLiterals === "filled"
      ? { maxlength: resolved.maxFormattedLength }
      : {}),
    ...(state.status === "invalid" || resolved.invalid
      ? { "aria-invalid": "true" }
      : {}),
    ...(resolved.describedBy !== undefined
      ? { "aria-describedby": resolved.describedBy }
      : {}),
    ...(resolved.required ? { "aria-required": "true" } : {}),
    ...(resolved.disabled ? { disabled: true } : {}),
    ...(resolved.readOnly ? { readonly: true } : {}),
  }) as MaskedInputProps;

  cache.set(state, { resolved, props });
  return props;
}
