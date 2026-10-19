import { expect, type Page } from "@playwright/test";
import type { Pace } from "./pace.js";

/**
 * The creator's-seat flow, written once: tests run it at `instant` pace and assert; the demo runs
 * it at `human` pace and records. Every step waits on what the viewer would see, never on time.
 */

export async function open(page: Page, hash: string, heading: RegExp): Promise<void> {
  await page.goto(`/#/${hash}`);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

/** Switch views the way a person does: the tab bar. */
export async function tab(page: Page, pace: Pace, name: string, heading: RegExp): Promise<void> {
  await pace.click(page.getByRole("tab", { name }));
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

export const RATFOLK = { name: "Ratfolk", id: "nimble.ancestries.ratfolk", path: "homebrew/ancestry/ratfolk.md", text: "Hard to kill: you can suffer {{ wounds.max | one more Wound than most }} before you die." };

/** Write view: an ancestry with one effect on wounds.max. Leaves the page on Write with Save enabled. */
export async function writeRatfolk(page: Page, pace: Pace, add = "1"): Promise<void> {
  await pace.select(page.getByLabel("type"), "ancestry");
  await pace.fill(page.getByLabel("name", { exact: true }), RATFOLK.name);
  await expect(page.getByLabel("id")).toHaveValue(RATFOLK.id);
  await pace.click(page.getByRole("button", { name: "add effect" }));
  const effect = page.getByRole("group", { name: "effect 1" });
  await pace.fill(effect.getByLabel("target"), "wounds.max");
  await pace.fill(effect.getByLabel("value"), add);
  await pace.fill(effect.getByLabel("note"), "Ratfolk are hard to kill.");
  await pace.fill(page.getByRole("textbox", { name: "text" }), RATFOLK.text);
  await expect(page.getByRole("textbox", { name: "source" })).toHaveValue(new RegExp(`target: wounds\\.max, add: ${add}`));
  await expect(page.getByRole("region", { name: "Problems" })).toContainText("None");
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
}

/** Save the open document; the Reader opens on it. */
export async function save(page: Page, pace: Pace, name: string): Promise<void> {
  await pace.click(page.getByRole("button", { name: "Save" }));
  await expect(page.getByRole("heading", { level: 1, name: /reader/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

export interface NewHero { name: string; cls: string; ancestry: string; background: string }
export const PIP: NewHero = { name: "Pip", cls: "Mage", ancestry: "Ratfolk", background: "Wild One" };

/** Create view: Balanced array, four skill points on Arcana. Ends on Play for the new character. */
export async function createCharacter(page: Page, pace: Pace, hero: NewHero): Promise<void> {
  await pace.fill(page.getByRole("textbox", { name: "Name" }), hero.name);
  const pick = (group: string, option: string) => page.getByRole("radiogroup", { name: group }).locator("label", { hasText: option }).first();
  await pace.click(pick("Class", hero.cls));
  await pace.click(pick("Ancestry", hero.ancestry));
  await pace.click(pick("Background", hero.background));
  await pace.click(pick("Stat array", "Balanced"));
  await pace.select(page.getByLabel("INT", { exact: true }), "2");
  await pace.select(page.getByLabel("DEX", { exact: true }), "1");
  await pace.select(page.getByLabel("WIL", { exact: true }), "1");
  await pace.select(page.getByLabel("STR", { exact: true }), "0");
  const arcana = page.getByRole("button", { name: "increase Arcana" });
  for (let i = 0; i < 4; i++) await pace.click(arcana);
  await pace.click(page.getByRole("button", { name: "Create", exact: true }));
  await expect(page.getByRole("heading", { level: 1, name: hero.name })).toBeVisible();
}

export const wounds = (page: Page) => page.getByRole("region", { name: "Wounds" });

/** Play: the Wounds max shows `max`; tapping it names where the number came from. */
export async function expectWoundsMax(page: Page, pace: Pace, max: number, from: string): Promise<void> {
  const value = wounds(page).getByRole("button", { name: `max ${max}` });
  await expect(value).toBeVisible();
  await pace.click(value);
  const pop = page.getByRole("dialog", { name: /where .* comes from/ });
  await expect(pop).toContainText(from);
  await pace.pause(1800);
  await pace.click(pop.getByRole("button", { name: "close" }));
}

/** Content → edit the saved ancestry → change the effect value → Save. */
export async function editRatfolk(page: Page, pace: Pace, add: string): Promise<void> {
  await pace.click(page.getByRole("link", { name: `edit ${RATFOLK.path}` }));
  await expect(page.getByLabel("name", { exact: true })).toHaveValue(RATFOLK.name);
  await pace.fill(page.getByRole("group", { name: "effect 1" }).getByLabel("value"), add);
  await expect(page.getByRole("textbox", { name: "source" })).toHaveValue(new RegExp(`add: ${add}`));
  await save(page, pace, RATFOLK.name);
}

/** Play tab → character list → the named character. */
export async function openCharacter(page: Page, pace: Pace, name: string): Promise<void> {
  await tab(page, pace, "Play", /characters/i);
  await pace.click(page.getByRole("button", { name: new RegExp(`^${name}\\b`) }));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}
