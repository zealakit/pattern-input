/**
 * Upper bound on characters inspected from one paste, autofill or setValue
 * payload. No field accepts more than a few dozen characters, so anything
 * beyond this is hostile or accidental and must not cost proportional work.
 */
export const MAX_INPUT_CHARS = 1024;
