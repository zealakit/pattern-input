/** Public contract version; changes when getter/instance names change. */
export const CONTRACT_VERSION = "1.0.0";

/** Canonical getter names every adapter must expose per field kind (AC-2). */
export const GETTER_NAMES = {
  number: ["getInputProps"],
  masked: ["getInputProps"],
  otp: ["getGroupProps", "getSlotProps", "getHiddenInputProps"],
} as const;

/** Canonical instance members every adapter's field object must expose. */
export const INSTANCE_API = [
  "value",
  "formattedValue",
  "status",
  "setValue",
  "clear",
  "focus",
  "undo",
  "redo",
] as const;

export type FieldKind = keyof typeof GETTER_NAMES;

/** DOM attribute → React prop name for adapters that spread props. */
export const REACT_PROP_NAMES: Readonly<Record<string, string>> = Object.freeze(
  {
    inputmode: "inputMode",
    maxlength: "maxLength",
    autocomplete: "autoComplete",
    autocorrect: "autoCorrect",
    autocapitalize: "autoCapitalize",
    spellcheck: "spellCheck",
    enterkeyhint: "enterKeyHint",
    tabindex: "tabIndex",
    readonly: "readOnly",
  },
);

/** Map DOM-shaped getter output to React props (camelCase where React wants it). */
export function toReactProps(
  props: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    mapped[REACT_PROP_NAMES[key] ?? key] = value;
  }
  return mapped;
}
