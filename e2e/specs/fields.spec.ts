import { expect, type Locator, test } from "@playwright/test";

/**
 * Dispatch a synthetic paste. Firefox ignores `clipboardData` in the
 * `ClipboardEvent` constructor, so define it on a plain event instead; that
 * works in every engine.
 */
async function pasteText(target: Locator, text: string): Promise<void> {
  await target.evaluate((element, value) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => value, setData: () => {} },
    });
    element.dispatchEvent(event);
  }, text);
}

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
      await pasteText(tax, "123.456.789-00");
      await expect(tax).toHaveValue("123.456.789-00");
      await expect(tax).not.toHaveAttribute("aria-invalid");

      await tax.fill("");
      await pasteText(tax, "12345");
      await expect(tax).not.toHaveAttribute("aria-invalid");
    });

    test("AC-5 e2e: OTP paste fills slots and focuses the last", async ({
      page,
    }) => {
      const first = page.getByTestId("code-slot-0");
      await first.click();
      await pasteText(first, "123456");

      await expect(page.getByTestId("code-slot-5")).toHaveValue("6");
      await expect(page.getByTestId("code-slot-5")).toBeFocused();
    });

    test("OTP layout: one accessible group with a decorative separator", async ({
      page,
    }) => {
      const code = page.getByTestId("code");
      await expect(code).toHaveAttribute("role", "group");
      await expect(code.locator('[role="group"]')).toHaveCount(0);
      await expect(page.getByTestId("code-sep")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(page.getByTestId("code-sep")).not.toHaveAttribute("role");
    });

    test("AC-7 e2e: a rejected controlled paste is not rendered", async ({
      page,
    }) => {
      const controlled = page.getByTestId("controlled");
      await controlled.click();
      await pasteText(controlled, "5000");
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
