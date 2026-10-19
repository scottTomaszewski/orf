import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { memoryHomebrewStore } from "../../src/content-store.js";
import { evaluateCharacter } from "../../src/engine.js";
import { App } from "./app.js";
import { fromShareLink, localCharacterStore, parseCharacterText, toShareLink } from "./character-store.js";
import { performAction } from "./play-actions.js";
import { realContent } from "./test-content.js";

const content = realContent();
const pip = content.docs.get("scott.characters.pip")!;
const state = (d: typeof pip) => d.frontmatter.state as Record<string, unknown>;
beforeEach(() => { localStorage.clear(); });
const app = () => render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} rng={() => 0.99} />);

test("C2: a share link imports the character and opens it; a corrupted link shows an error", async () => {
  location.hash = toShareLink(pip, "").slice(0);
  app();
  expect(await screen.findByRole("region", { name: /hit points/i })).toBeTruthy();
  expect(localCharacterStore(localStorage).get("scott.characters.pip")).toBeTruthy();
});
test("C2b: a corrupted share link shows a readable error, not a blank page", async () => {
  location.hash = "#/share/%%%garbage";
  app();
  expect((await screen.findByRole("alert")).textContent).toMatch(/share link/i);
});
test("I1: characters from another system are rejected on import and share", () => {
  const foreign = "---\nid: x.characters.f\ntype: character\nsystem: srd5e\nname: F\nstats: {}\nstate: {}\n---\n";
  expect(() => parseCharacterText(foreign, "f.md", "nimble")).toThrow(/system "srd5e"/);
  expect(() => fromShareLink("#/share/" + btoa(foreign), "nimble")).toThrow(/system/);
  expect(parseCharacterText(foreign, "f.md").frontmatter.system).toBe("srd5e");   // no system constraint = accepted
});
test("I2: a character with a null equipment entry renders a problem, never a blank screen", async () => {
  localCharacterStore(localStorage).save({ ...pip, frontmatter: { ...pip.frontmatter, equipment: [null] } });
  location.hash = "#/play/scott.characters.pip";
  app();
  expect(await screen.findByRole("region", { name: /hit points/i })).toBeTruthy();
  expect(screen.getByRole("region", { name: /problems/i }).textContent).toMatch(/equipment/);
});
test("I2b: a rendering error inside a view shows an error boundary message with the character id", async () => {
  localCharacterStore(localStorage).save({ ...pip, frontmatter: { ...pip.frontmatter, classes: "oops" } });
  location.hash = "#/play/scott.characters.pip";
  app();
  const el = await screen.findByText(/something went wrong|problems/i);
  expect(el).toBeTruthy();
});
test("I4: the HP stepper goes through damage/heal, so Dying follows the rules; the Wounds stepper fires gain-wound", () => {
  const sheet = evaluateCharacter(pip, content.registry, content.docs);
  const down = performAction(pip, sheet, { kind: "set-hp", value: 0 }, Math.random);
  expect(state(down.character)).toMatchObject({ hp: 0, wounds: 2, dying: true });
  const sheet2 = evaluateCharacter(down.character, content.registry, content.docs);
  const up = performAction(down.character, sheet2, { kind: "set-hp", value: 3 }, Math.random);
  expect(state(up.character)).toMatchObject({ hp: 3, dying: false });
  const w = performAction(pip, sheet, { kind: "set-wounds", value: 2 }, Math.random);
  expect(state(w.character).wounds).toBe(2);
  expect(w.log.join()).toMatch(/gain-wound|Wound/);
  expect(state(performAction(pip, sheet, { kind: "set-wounds", value: 0 }, Math.random).character).wounds).toBe(0);
});
test("I5: Initiative is rolled by the sheet (d20 + bonus) when no roll is given; manual Catch Breath rolls; dice-max pools get rolled", () => {
  const sheet = evaluateCharacter(pip, content.registry, content.docs);
  const r = performAction(pip, sheet, { kind: "encounter-start" }, () => 0.99);   // d20 → 20, +2 bonus
  expect(r.rolls[0]).toMatchObject({ text: "1d20 + 2", total: 22 });
  expect(state(r.character).actions).toBe(3);
  const cb = performAction({ ...pip, frontmatter: { ...pip.frontmatter, state: { ...state(pip), hp: 10, hit_dice: 2 } } }, sheet, { kind: "catch-breath", dice: 1, rolls: [[4]] }, Math.random);
  expect(state(cb.character).hp).toBe(13);
  const m10 = { ...pip, frontmatter: { ...pip.frontmatter, id: "scott.characters.m10", classes: [{ id: "nimble.classes.mage", level: 10 }], choices: {}, levels: [{ level: 1, hp: 10 }], state: { hp: 10, "mage.surge": 0 } } };
  const s10 = evaluateCharacter(m10, content.registry, content.docs);
  const es = performAction(m10, s10, { kind: "encounter-start", roll: 15 }, () => 0.99);   // surge max wil + 1d4 → rolled 4
  expect(state(es.character)["mage.surge"]).toBe(4);
  expect(es.rolls.some((x) => /1d4/.test(x.text))).toBe(true);
});
test("I6/I8: mana max, hit dice max, and saves are tappable values; wound marks differ by shape", async () => {
  localCharacterStore(localStorage).save(pip);
  location.hash = "#/play/scott.characters.pip";
  app();
  await screen.findByRole("region", { name: /hit points/i });
  expect(screen.getByRole("button", { name: /^max 13$/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /^max 4$/ })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^save/i }).length).toBe(4);
  const wounds = screen.getByRole("region", { name: /wounds/i });
  expect(within(wounds).getAllByText("◆")).toHaveLength(1);
  expect(within(wounds).getAllByText("◇")).toHaveLength(5);
});
test("I7: the Reader resolves values for the character open in Play, and only for documents it has", async () => {
  const beta = { ...pip, frontmatter: { ...pip.frontmatter, id: "scott.characters.beta", name: "Beta", stats: { str: -1, dex: 2, int: 1, wil: 0 } } };
  localCharacterStore(localStorage).save(pip);
  localCharacterStore(localStorage).save(beta);
  location.hash = "#/play/scott.characters.beta";
  app();
  await screen.findByRole("region", { name: /hit points/i });
  fireEvent.click(screen.getByRole("tab", { name: "Reader" }));
  fireEvent.input(await screen.findByLabelText(/search/i), { target: { value: "nimble.features.mage.mana" } });
  fireEvent.click(await screen.findByRole("button", { name: /^Mana$/ }));
  const article = await screen.findByRole("article");
  expect(article.textContent).toMatch(/resolved for Beta/);
  expect(article.textContent).toMatch(/\b10\b/);   // (1×3)+4 for Beta, not 13 for Pip
  fireEvent.input(screen.getByLabelText(/search/i), { target: { value: "lay on hands" } });
  fireEvent.click(await screen.findByRole("button", { name: /^Lay on Hands$/ }));
  await waitFor(() => expect(screen.getByRole("article").textContent).toMatch(/5 × level/));
});
test("I10: the Content view offers a folder input on every browser and explains Reload without a folder", async () => {
  location.hash = "#/content";
  app();
  await screen.findByRole("region", { name: /homebrew/i });
  expect(document.querySelector('input[type="file"][webkitdirectory]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /^reload$/i }));
  expect(await screen.findByText(/add the files again|choose folder/i)).toBeTruthy();
});
