export type { Detach } from "./attach-input.js";
export { attachInput } from "./attach-input.js";
export type { OtpDetach, OtpSlotSource } from "./attach-otp.js";
export { attachOtpGroup } from "./attach-otp.js";
export type {
  OtpSlotList,
  OtpSlotRef,
  OtpSlotRegistry,
} from "./slot-registry.js";
export { createOtpSlotRegistry } from "./slot-registry.js";
export { isBrowser, platform } from "./env.js";
export { mapInputType } from "./input-events.js";
