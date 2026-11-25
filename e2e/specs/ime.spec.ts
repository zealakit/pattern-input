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
    browserName,
  }) => {
    await page.goto(url);
    const price = page.getByTestId("price");
    await price.click();

    // Synthetic on every browser: Safari fires compositionend first, then the
    // keydown of the committing Enter. The value must be committed once.
    //
    // What this cannot assert: that the committing Enter submits nothing and moves
    // no focus. A script-dispatched Enter does neither in Chromium, Firefox or
    // WebKit (a real keypress does), so those assertions pass with the guard's
    // just-ended handling disabled. They are a manual check instead:
    // `_plans/evidence/pattern-input/IME-MANUAL.md`.
    const committed = await price.evaluate((element) => {
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
      const enter = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(enter);
      return element.value;
    });

    await expect(price).toHaveValue("12.5");
    expect(committed, "the composition is committed once").toBe("12.5");
    test.info().annotations.push({
      type: "PI-IME-3",
      description: `${browserName}: committed=${committed}. Submit/advance is a manual check (IME-MANUAL.md): a script-dispatched Enter cannot prove it.`,
    });
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
