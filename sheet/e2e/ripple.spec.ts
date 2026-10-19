import { expect, test } from "@playwright/test";
import { createCharacter, editRatfolk, expectWoundsMax, open, openCharacter, PIP, save, tab, writeRatfolk } from "./flows.js";
import { instant } from "./pace.js";

/** The format's promise, end to end in a real browser: write one file, every view picks it up; edit it, the numbers move. */
test("a homebrew ancestry ripples from Write to Play and back", async ({ page }) => {
  await open(page, "write", /write/i);
  await writeRatfolk(page, instant);
  await save(page, instant, "Ratfolk");
  await expect(page.getByText("one more Wound than most")).toBeVisible();   // {{ }} display text, no character yet

  await tab(page, instant, "Create", /create/i);
  await createCharacter(page, instant, PIP);
  await expectWoundsMax(page, instant, 7, "Ratfolk");

  await tab(page, instant, "Content", /content/i);
  await expect(page.getByText("homebrew/ancestry/ratfolk.md")).toBeVisible();
  await editRatfolk(page, instant, "2");
  await openCharacter(page, instant, PIP.name);
  await expectWoundsMax(page, instant, 8, "Ratfolk");
});
