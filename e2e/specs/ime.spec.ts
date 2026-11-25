import { expect, test } from "@playwright/test";

const examples = ["http://127.0.0.1:4173", "http://127.0.0.1:4174"] as const;

for (const url of examples) {
  // Chromium can synthesize real composition through CDP; other engines get a
  // protocol-level check with synthetic composition events (labelled as such).
  test(`[PI-IME-1] AC-6 e2e: composition commits once (${url})`, async ({
    page,
    browserName,
  }) => {
    await page.goto(url);
    const price = page.getByTestId("price");
    await price.click();

    if (browserName === "chromium") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.imeSetComposition", {
        text: "12",
        selectionStart: 2,
        selectionEnd: 2,
      });
      // The browser owns the preedit: it may show it, but it must not be
      // formatted or committed by us before compositionend.
      const preedit = await price.inputValue();
      expect(preedit.includes(",")).toBe(false);
      await session.send("Input.imeSetComposition", {
        text: "12.5",
        selectionStart: 4,
        selectionEnd: 4,
      });
      await session.send("Input.insertText", { text: "12.5" });
    } else {
      await price.evaluate((element) => {
        element.dispatchEvent(
          new CompositionEvent("compositionstart", { bubbles: true }),
        );
        element.dispatchEvent(
          new CompositionEvent("compositionupdate", {
            data: "12",
            bubbles: true,
          }),
        );
        element.dispatchEvent(
          new CompositionEvent("compositionend", {
            data: "12.5",
            bubbles: true,
          }),
        );
      });
    }

    await expect(price).toHaveValue("12.5");
  });
}

for (const url of examples) {
  test(`[PI-IME-3] Safari ordering: compositionend before the committing Enter (${url})`, async ({
    page,
  }) => {
    await page.goto(url);
    const price = page.getByTestId("price");
    await price.click();

    // Synthetic on every browser: Safari fires compositionend first, then the
    // committing key in the same task, with `isComposing` false. That key belongs
    // to the IME, so it must run no field command. ArrowUp stands in for it
    // because its effect (a step) is observable; a script-dispatched Enter has no
    // default action, so submission stays a manual check
    // (`_plans/evidence/pattern-input/IME-MANUAL.md`).
    const result = await price.evaluate(async (element: HTMLInputElement) => {
      const arrowUp = () => {
        const event = new KeyboardEvent("keydown", {
          key: "ArrowUp",
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      };
      element.value = "";
      element.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      element.value = "12.5";
      element.dispatchEvent(
        new CompositionEvent("compositionupdate", {
          data: "12.5",
          bubbles: true,
        }),
      );
      element.dispatchEvent(
        new CompositionEvent("compositionend", { data: "12.5", bubbles: true }),
      );
      const before = element.value;
      const committingRan = arrowUp();
      const afterCommitting = element.value;
      await new Promise((resolve) => setTimeout(resolve, 0));
      const nextRan = arrowUp();
      return {
        before,
        committingRan,
        afterCommitting,
        nextRan,
        afterNext: element.value,
      };
    });

    expect(result.committingRan, "the committing key ran no command").toBe(
      false,
    );
    expect(result.afterCommitting).toBe(result.before);
    expect(result.nextRan, "one task later the key is a command again").toBe(
      true,
    );
    expect(result.afterNext).not.toBe(result.before);
  });

  test(`[PI-IME-7] macOS Telex marked text stays unformatted until compositionend (${url})`, async ({
    page,
  }) => {
    await page.goto(url);
    const price = page.getByTestId("price");
    await price.click();

    await price.evaluate((element) => {
      element.value = "";
      element.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
      element.value = "12";
      element.dispatchEvent(
        new CompositionEvent("compositionupdate", {
          data: "12",
          bubbles: true,
        }),
      );
      // compositionupdate changes the marked text in place.
      element.value = "12.5";
      element.dispatchEvent(
        new CompositionEvent("compositionupdate", {
          data: "12.5",
          bubbles: true,
        }),
      );
      element.dispatchEvent(
        new CompositionEvent("compositionend", { data: "12.5", bubbles: true }),
      );
    });

    // No intermediate formatting: the final value is what the user typed.
    await expect(price).toHaveValue("12.5");
  });
}
