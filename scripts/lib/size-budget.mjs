/** X31: size-regression budget. */
export const ABSOLUTE_TOLERANCE = 1024;
export const RELATIVE_TOLERANCE = 0.1;

/**
 * An entry fails past **1 KB gzip OR 10 %**, so the allowance is the smaller of
 * the two, not the larger.
 */
export const sizeBudget = (reference) =>
  reference + Math.min(ABSOLUTE_TOLERANCE, Math.round(reference * RELATIVE_TOLERANCE));
