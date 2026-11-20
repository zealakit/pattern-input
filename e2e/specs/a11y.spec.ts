import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const examples = [
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
  "http://127.0.0.1:4175",
  "http://127.0.0.1:4176",
  "http://127.0.0.1:3010",
] as const;

for (const url of examples) {
  test(`AC-8: axe audit ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious).toEqual([]);
  });
}
