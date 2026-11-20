import type { FieldStatus } from "../../dist/index.js";

export type VectorStep =
  | { readonly event: Record<string, unknown> }
  | { readonly typeText: string }
  | { readonly key: Record<string, unknown> }
  | { readonly approve: true }
  | { readonly reject: true }
  | { readonly supply: unknown }
  | { readonly setValue: unknown };

export type Vector = {
  readonly name: string;
  readonly field: "number" | "masked" | "otp";
  readonly options: Record<string, unknown>;
  readonly steps: readonly VectorStep[];
  readonly expect: {
    readonly value?: unknown;
    readonly formattedValue?: string;
    readonly status?: FieldStatus;
    readonly caret?: number;
    readonly changes?: number;
  };
};
