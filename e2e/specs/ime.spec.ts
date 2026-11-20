import { expect, test } from "@playwright/test";

const examples = ["http://127.0.0.1:4173", "http://127.0.0.1:4174"] as const;

for (const url of examples) {
  // Chromium can synthesize real composition through CDP; other engines get a
  // protocol-level check with synthetic composition events (labelled as such).
  test(`AC-6 e2e: composition commits once (${url})`, async ({
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
