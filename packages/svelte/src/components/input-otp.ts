import InputOTPRoot from "./InputOTP.svelte";
import InputOTPGroup from "./InputOTPGroup.svelte";
import InputOTPSeparator from "./InputOTPSeparator.svelte";
import InputOTPSlot from "./InputOTPSlot.svelte";

/**
 * Compound one-time-code field. Layout is entirely yours:
 *
 * ```svelte
 * <InputOTP maxLength={6} bind:value={code}>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={0} /> <InputOTP.Slot index={1} />
 *   </InputOTP.Group>
 *   <InputOTP.Separator>-</InputOTP.Separator>
 *   <InputOTP.Group>
 *     <InputOTP.Slot index={3} />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 */
export const InputOTP = Object.assign(InputOTPRoot, {
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});

export { InputOTPGroup, InputOTPSeparator, InputOTPSlot };
