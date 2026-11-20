import { selectionToIndices } from "../shared/index.js";
import type { FieldBinding } from "./binding.js";
import {
  createFieldController,
  type FieldController,
  type FieldControllerOptions,
} from "./controller.js";

export type {
  ChangeReason,
  FieldController,
  FieldControllerOptions,
  PatternInputErrorCode,
  ValueChange,
} from "./controller.js";
export { createFieldController, PatternInputError } from "./controller.js";
export type { FieldBinding, FormattedField } from "./binding.js";
import type { MaskedEvent } from "../masked/index.js";
import type { MaskedOptions, MaskedState } from "../masked/index.js";
import type {
  NumberEvent,
  NumberOptions,
  NumberState,
} from "../number/index.js";
import type { OtpEvent, OtpOptions, OtpState } from "../otp/index.js";
import { maskedBinding, numberBinding, otpBinding } from "./binding.js";

export function createNumberController(
  options: FieldControllerOptions<number | null, NumberOptions>,
): FieldController<NumberState, NumberEvent, number | null, NumberOptions> {
  return createFieldController(numberBinding, options);
}

export function createMaskedController(
  options: FieldControllerOptions<string, MaskedOptions>,
): FieldController<MaskedState, MaskedEvent, string, MaskedOptions> {
  return createFieldController(maskedBinding, options);
}

export function createOtpController(
  options: FieldControllerOptions<string, OtpOptions>,
): FieldController<OtpState, OtpEvent, string, OtpOptions> {
  return createFieldController(otpBinding, options);
}

/**
 * The formatted substring of the current selection — what the user copies.
 * It always parses back into the same field (FR-16).
 */
export function getClipboardText<TState, TEvent, TValue, TOptions, TResolved>(
  state: TState,
  binding: FieldBinding<TState, TEvent, TValue, TOptions, TResolved>,
  resolved: TResolved,
): string {
  const formatted = binding.format(state, resolved);
  const range = selectionToIndices(formatted.map, binding.selectionOf(state));
  return formatted.text.slice(range.start, range.end);
}
