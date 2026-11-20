/** Small DOM helpers shared by the adapter tests. */

export function createInput(
  attributes: Record<string, string> = {},
): HTMLInputElement {
  const input = document.createElement("input");
  for (const [name, value] of Object.entries(attributes)) {
    input.setAttribute(name, value);
  }
  document.body.append(input);
  return input;
}

export function setCaret(
  input: HTMLInputElement,
  start: number,
  end = start,
): void {
  input.setSelectionRange(start, end);
}

export function dispatchBeforeInput(
  input: HTMLInputElement,
  data: string,
  inputType = "insertText",
): void {
  input.dispatchEvent(
    new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      data,
      inputType,
    }),
  );
}

export function resetDom(): void {
  document.body.replaceChildren();
}
