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
    // keydown of the committing Enter. That Enter must not submit or advance.
    const result = await price.evaluate((element) => {
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

      let submitted = false;
      const form = element.closest("form");
      form?.addEventListener("submit", (event) => {
        submitted = true;
        event.preventDefault();
      });
      const focusLeft = { value: false };
      element.addEventListener("focusout", () => {
        focusLeft.value = true;
      });

      const enter = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(enter);
      return {
        prevented: enter.defaultPrevented,
        submitted,
        focusLeft: focusLeft.value,
        stillFocused: document.activeElement === element,
      };
    });

    await expect(price).toHaveValue("12.5");
    // The committing Enter belongs to the IME: it must not submit the form and
    // must not move focus (no "advance" to the next field).
    expect(result.submitted, "the committing Enter did not submit").toBe(false);
    expect(result.focusLeft, "the committing Enter did not move focus").toBe(
      false,
    );
    expect(result.stillFocused, "the field keeps focus").toBe(true);
    test.info().annotations.push({
      type: "PI-IME-3",
      description: `${browserName}: prevented=${String(result.prevented)} submitted=${String(result.submitted)}`,
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
