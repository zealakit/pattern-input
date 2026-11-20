import type { ResolvedNumberOptions } from "./options.js";
import type { NumberState } from "./state.js";

export type NumberInputProps = {
  readonly type: "text";
  readonly inputmode: "decimal" | "numeric";
  readonly autocomplete: "off";
  readonly autocorrect: "off";
  readonly spellcheck: "false";
  readonly enterkeyhint: "done";
  readonly "aria-invalid"?: "true";
  readonly "aria-describedby"?: string;
  readonly "aria-required"?: "true";
  readonly disabled?: true;
  readonly readonly?: true;
};

const cache = new WeakMap<
  NumberState,
  { readonly resolved: ResolvedNumberOptions; readonly props: NumberInputProps }
>();

/**
 * DOM-attribute-shaped props for the host input. Deterministic per
 * `(state, resolved)`; never emits `role` (FR-24).
 */
export function getNumberInputProps(
  state: NumberState,
  resolved: ResolvedNumberOptions,
): NumberInputProps {
  const cached = cache.get(state);
  if (cached && cached.resolved === resolved) {
    return cached.props;
  }

  const props = Object.freeze({
    type: "text",
    inputmode: resolved.maximumFractionDigits > 0 ? "decimal" : "numeric",
    autocomplete: "off",
    autocorrect: "off",
    spellcheck: "false",
    enterkeyhint: "done",
    ...(state.status === "invalid" || resolved.invalid
      ? { "aria-invalid": "true" }
      : {}),
    ...(resolved.describedBy !== undefined
      ? { "aria-describedby": resolved.describedBy }
      : {}),
    ...(resolved.required ? { "aria-required": "true" } : {}),
    ...(resolved.disabled ? { disabled: true } : {}),
    ...(resolved.readOnly ? { readonly: true } : {}),
  }) as NumberInputProps;

  cache.set(state, { resolved, props });
  return props;
}
