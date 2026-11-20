import type { EditableMap, EditableUnit } from "../shared/index.js";
import type { ResolvedNumberOptions } from "./options.js";

export type FormattedNumber = {
  readonly text: string;
  readonly map: EditableMap;
};

/**
 * Format canonical `rawText` (".", never a locale separator) into display text
 * plus the editable map. Every rawText character is exactly one map unit;
 * group separators are literals and get no unit.
 */
export function formatNumber(
  rawText: string,
  resolved: ResolvedNumberOptions,
): FormattedNumber {
  const units: EditableUnit[] = [];
  let text = "";

  const pushUnit = (value: string): void => {
    const start = text.length;
    text += value;
    units.push({ start, end: text.length });
  };
  const pushLiteral = (value: string): void => {
    text += value;
  };

  let body = rawText;
  if (body.startsWith("-")) {
    pushUnit("-");
    body = body.slice(1);
  }

  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot + 1);
  const hasDecimal = dot !== -1;

  if (resolved.groupSeparator === "") {
    for (const char of intPart) {
      pushUnit(char);
    }
  } else {
    const groupSize = 3;
    const lead = intPart.length % groupSize || groupSize;
    for (let index = 0; index < intPart.length; index += 1) {
      if (index > 0 && (index - lead) % groupSize === 0) {
        pushLiteral(resolved.groupSeparator);
      }
      pushUnit(intPart[index]);
    }
  }

  if (hasDecimal) {
    const start = text.length;
    text += resolved.decimalSeparator;
    units.push({ start, end: text.length });
    for (const char of fracPart) {
      pushUnit(char);
    }
  }

  return { text, map: { textLength: text.length, units } };
}
