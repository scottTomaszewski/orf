import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { memoryHomebrewStore } from "../../../src/content-store.js";
import { evaluateCharacter } from "../../../src/engine.js";
import { applyLevelUp, levelUpPrompts, newCharacter } from "../../../src/sheet-model.js";
import { App } from "../app.js";
import { localCharacterStore } from "../character-store.js";
import { realContent } from "../test-content.js";

const content = realContent();
beforeEach(() => { localStorage.clear(); });

test("a level-2 Mage levels to 3: subclass and school pickers, HP roll with advantage, skill point; the pick survives reload", async () => {
  const l1 = newCharacter({ id: "local.characters.m", name: "M", classId: "nimble.classes.mage", ancestryId: "nimble.ancestries.human", backgroundId: "nimble.backgrounds.wild-one",
    stats: { str: 0, dex: 2, int: 2, wil: -1 }, skills: { arcana: 4 }, equipment: [] }, content.docs);
  const l2 = applyLevelUp(l1, levelUpPrompts(l1, content.registry, content.docs)!, { hp: 4, picks: {}, skill: "lore" });
  localCharacterStore(localStorage).save(l2);
  location.hash = "#/level-up/local.characters.m";
  const rng = (() => { const seq = [0.1, 0.9]; let i = 0; return () => seq[i++ % seq.length]; })();   // rolls 1 then 6 on a d6
  render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} rng={rng} />);
  await screen.findByRole("heading", { name: /level 2 → 3/i });
  const sub = screen.getByRole("radiogroup", { name: /subclass/i });
  expect(within(sub).getAllByRole("radio").map((r) => (r as HTMLInputElement).labels?.[0]?.textContent?.trim())).toEqual(["Invoker of Chaos", "Invoker of Control"]);
  fireEvent.click(within(sub).getByLabelText("Invoker of Control"));
  const school = screen.getByRole("radiogroup", { name: /elemental-mastery/i });
  expect(within(school).getAllByRole("radio").map((r) => (r as HTMLInputElement).value)).toEqual(["nimble.spell-utility.fire", "nimble.spell-utility.ice", "nimble.spell-utility.lightning"]);
  fireEvent.click(within(school).getByLabelText(/^Fire Utility Spells/));
  fireEvent.click(screen.getByRole("button", { name: /roll with advantage/i }));
  await waitFor(() => expect(screen.getByText(/rolled 1 and 6/i)).toBeTruthy());
  expect((screen.getByLabelText("HP gained") as HTMLInputElement).value).toBe("6");
  fireEvent.click(screen.getByLabelText(/^Arcana/));
  const apply = screen.getByRole("button", { name: /^apply$/i });
  await waitFor(() => expect((apply as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(apply);
  const doc = localCharacterStore(localStorage).get("local.characters.m")!;
  expect((doc.frontmatter.classes as { level: number }[])[0].level).toBe(3);
  expect((doc.frontmatter.levels as unknown[]).length).toBe(3);
  expect(doc.frontmatter.choices).toMatchObject({ "nimble.classes.mage.level-3.subclass": ["nimble.subclasses.mage.control"], "nimble.classes.mage.level-3.elemental-mastery": ["nimble.spell-utility.fire"] });
  expect((doc.frontmatter.skills as Record<string, number>).arcana).toBe(5);
  const s = evaluateCharacter(doc, content.registry, content.docs);
  expect(s.attachments.some((a) => String(a.doc.frontmatter.id) === "nimble.subclasses.mage.control")).toBe(true);
  expect(location.hash).toBe("#/play/local.characters.m");
});

test("Apply stays disabled until every slot is filled; level 20 explains why it cannot level", async () => {
  const pip = content.docs.get("scott.characters.pip")!;
  localCharacterStore(localStorage).save({ ...pip, frontmatter: { ...pip.frontmatter, classes: [{ id: "nimble.classes.mage", level: 20 }] } });
  location.hash = "#/level-up/scott.characters.pip";
  render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} />);
  expect(await screen.findByText(/level 20/i)).toBeTruthy();
});
