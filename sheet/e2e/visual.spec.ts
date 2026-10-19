import { expect, test, type Locator, type Page } from "@playwright/test";
import { createCharacter, open, PIP, save, writeRatfolk } from "./flows.js";
import { instant } from "./pace.js";

/**
 * Visual baselines for every view, desktop and phone. A failure here is a rendering change: look at
 * the diff in playwright-report/, and if it is intended, `npm run e2e:update` and commit the PNGs.
 */

const shot = (page: Page, name: string, opts: { mask?: Locator[] } = {}) =>
  expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, stylePath: "e2e/screenshot.css", ...opts });

test("characters, empty", async ({ page }) => {
  await open(page, "play", /characters/i);
  await shot(page, "characters-empty");
});

test("about", async ({ page }) => {
  await open(page, "about", /ORF Sheet for Nimble/);
  await shot(page, "about");
});

test("create", async ({ page }) => {
  await open(page, "create", /create/i);
  await shot(page, "create");
});

test("reader on a class", async ({ page }) => {
  await open(page, "reader/nimble.classes.mage", /reader/i);
  await expect(page.getByRole("heading", { level: 2, name: "Mage" })).toBeVisible();
  await shot(page, "reader-mage");
});

test("content, nothing homebrewed", async ({ page }) => {
  await open(page, "content", /content/i);
  // the bundle's build date changes every build
  await shot(page, "content-empty", { mask: [page.getByRole("region", { name: "Bundle" }).locator(".muted")] });
});

test("write, a filled ancestry", async ({ page }) => {
  await open(page, "write", /write/i);
  await writeRatfolk(page, instant);
  await shot(page, "write-ratfolk");
});

test("write, a broken target", async ({ page }) => {
  await open(page, "write", /write/i);
  await writeRatfolk(page, instant);
  await page.getByRole("group", { name: "effect 1" }).getByLabel("target").fill("wound.max");
  await expect(page.getByRole("region", { name: "Problems" })).toContainText("unknown");
  await shot(page, "write-unknown-target");
});

test("play, a Ratfolk mage", async ({ page }) => {
  await open(page, "write", /write/i);
  await writeRatfolk(page, instant);
  await save(page, instant, "Ratfolk");
  await open(page, "create", /create/i);
  await createCharacter(page, instant, PIP);
  await shot(page, "play-pip");
  await page.getByRole("region", { name: "Wounds" }).getByRole("button", { name: "max 7" }).click();
  await expect(page.getByRole("dialog")).toContainText("Ratfolk");
  await expect(page).toHaveScreenshot("play-pip-wounds-popover.png");
});
