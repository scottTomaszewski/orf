import { expect, test } from "@playwright/test";
import { open, save, writeRatfolk } from "./flows.js";
import { instant } from "./pace.js";

/**
 * No view may be wider than the viewport. On a phone, horizontal overflow makes mobile Chromium
 * zoom the layout viewport out, which pushes the fixed tab bar off the visible screen: the app
 * looks fine in a screenshot and is unusable by touch.
 */
const VIEWS: [string, RegExp][] = [
  ["play", /characters/i], ["create", /create/i], ["reader/nimble.classes.mage", /reader/i],
  ["content", /content/i], ["write", /write/i], ["about", /ORF Sheet for Nimble/], ["level-up", /level up/i],
];

for (const [hash, heading] of VIEWS) {
  test(`${hash} fits the viewport`, async ({ page }) => {
    await open(page, hash, heading);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
}

test("a saved homebrew document fits the viewport in the reader", async ({ page }) => {
  await open(page, "write", /write/i);
  await writeRatfolk(page, instant);
  await save(page, instant, "Ratfolk");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(page.getByRole("tab", { name: "Create" })).toBeInViewport();
});
