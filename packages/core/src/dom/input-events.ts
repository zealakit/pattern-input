export type MappedInput = {
  readonly event: Record<string, unknown>;
  readonly prevent: true;
};

/**
 * Map a `beforeinput` `inputType` to a field event.
 * `null` means "not ours" — let the browser do it (unknown types fall through).
 * `insertCompositionText` is deliberately unmapped: IME owns the DOM (FR-17).
 */
export function mapInputType(
  inputType: string,
  data: string | null | undefined,
): MappedInput | null {
  const text = data ?? "";

  switch (inputType) {
    case "insertText":
    case "insertReplacementText":
      return text === ""
        ? null
        : { event: { type: "insert", text }, prevent: true };
    case "insertFromPaste":
    case "insertFromDrop":
      return text === ""
        ? null
        : { event: { type: "paste", text }, prevent: true };
    case "deleteContentBackward":
      return {
        event: { type: "delete", direction: "backward", unit: "char" },
        prevent: true,
      };
    case "deleteContentForward":
      return {
        event: { type: "delete", direction: "forward", unit: "char" },
        prevent: true,
      };
    case "deleteWordBackward":
      return {
        event: { type: "delete", direction: "backward", unit: "word" },
        prevent: true,
      };
    case "deleteWordForward":
      return {
        event: { type: "delete", direction: "forward", unit: "word" },
        prevent: true,
      };
    case "deleteSoftLineBackward":
    case "deleteHardLineBackward":
    case "deleteEntireSoftLine":
      return {
        event: { type: "delete", direction: "backward", unit: "line" },
        prevent: true,
      };
    case "deleteSoftLineForward":
    case "deleteHardLineForward":
      return {
        event: { type: "delete", direction: "forward", unit: "line" },
        prevent: true,
      };
    default:
      return null;
  }
}
