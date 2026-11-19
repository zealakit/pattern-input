export type {
  OtpOptions,
  OtpSlotLabel,
  ResolvedOtpOptions,
} from "./options.js";
export { OtpOptionsError, resolveOtpOptions } from "./options.js";
export type { OtpState } from "./state.js";
export {
  buildOtpState,
  createOtpState,
  distributeSlots,
  emptySlots,
  firstEmptyIndex,
  otpRawValue,
  otpStatusOf,
} from "./state.js";
export type { OtpEvent } from "./reducer.js";
export { normalizeOtpChar, otpReducer } from "./reducer.js";
export { otpKeyToEvent } from "./keymap.js";
export type {
  OtpGroupProps,
  OtpHiddenInputProps,
  OtpSlotProps,
} from "./prop-getters.js";
export {
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
} from "./prop-getters.js";
