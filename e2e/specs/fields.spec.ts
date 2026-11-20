import { expect, test } from "@playwright/test";

const examples = [
  { name: "vanilla", url: "http://127.0.0.1:4173" },
  { name: "react", url: "http://127.0.0.1:4174" },
  { name: "vue", url: "http://127.0.0.1:4175" },
  { name: "svelte", url: "http://127.0.0.1:4176" },
  { name: "nextjs", url: "http://127.0.0.1:3010" },
] as const;

for (const example of examples) {
  test.describe(example.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(example.url);
    });

    test("AC-3 e2e: typing formats and keeps the caret", async ({ page }) => {
      const price = page.getByTestId("price");
      await price.click();
      await price.pressSequentially("1234.567");

      await expect(price).toHaveValue("1,234.56");
      const caret = await price.evaluate(
        (element) => (element as HTMLInputElement).selectionStart,
      );
      expect(caret).toBe(8);
    });

    test("AC-4 e2e: masked paste keeps literals and incomplete is not invalid", async ({
      page,
    }) => {
      const tax = page.getByTestId("tax");
      await tax.click();
      await tax.evaluate((element) => {
        const data = new DataTransfer();
        data.setData("text/plain", "123.456.789-00");
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(tax).toHaveValue("123.456.789-00");
      await expect(tax).not.toHaveAttribute("aria-invalid");

      await tax.fill("");
      await tax.evaluate((element) => {
        const data = new DataTransfer();
        data.setData("text/plain", "12345");
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(tax).not.toHaveAttribute("aria-invalid");
    });

    test("AC-5 e2e: OTP paste fills slots and focuses the last", async ({
      page,
    }) => {
      const first = page.getByTestId("code-slot-0");
      await first.click();
      await first.evaluate((element) => {
        const data = new DataTransfer();
        data.setData("text/plain", "123456");
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      await expect(page.getByTestId("code-slot-5")).toHaveValue("6");
      await expect(page.getByTestId("code-slot-5")).toBeFocused();
    });

    test("AC-7 e2e: a rejected controlled paste is not rendered", async ({
      page,
    }) => {
      const controlled = page.getByTestId("controlled");
      await controlled.click();
      await controlled.evaluate((element) => {
        const data = new DataTransfer();
        data.setData("text/plain", "5000");
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      await expect(controlled).toHaveValue("");
    });

    test("a11y: native inputs have no role and invalid only when invalid", async ({
      page,
    }) => {
      await expect(page.getByTestId("price")).not.toHaveAttribute("role");
      await expect(page.getByTestId("tax")).not.toHaveAttribute("role");
      const invalid = page.getByTestId("invalid");
      await invalid.click();
      await invalid.pressSequentially("123456");
      await invalid.blur();
      await expect(page.getByTestId("invalid-error")).toContainText("invalid");
    });
  });
}
