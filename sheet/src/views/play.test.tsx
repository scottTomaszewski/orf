import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { memoryHomebrewStore } from "../../../src/content-store.js";
import { App } from "../app.js";
import { localCharacterStore } from "../character-store.js";
import { realContent } from "../test-content.js";

const content = realContent();
const pip = content.docs.get("scott.characters.pip")!;
beforeEach(() => { localStorage.clear(); });
const open = (doc = pip) => {
  localCharacterStore(localStorage).save(doc);
  location.hash = `#/play/${encodeURIComponent(String(doc.frontmatter.id))}`;
  render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} />);
};

test("Pip's sheet shows HP, mana, Armor; tapping Armor shows its provenance", async () => {
  open();
  const hp = await screen.findByRole("region", { name: /hit points/i });
  expect(within(hp).getByText("25")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: /^mana$/i })).getByText("13")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /^Armor 4$/ }));
  const pop = await screen.findByRole("dialog");
  expect(within(pop).getByText(/Adventurer's Garb/)).toBeTruthy();
  expect(within(pop).getByText(/when equipped/)).toBeTruthy();
});
test("Damage 20 then Safe Rest ends with HP 25 and Wounds 1; the log explains", async () => {
  open();
  await screen.findByRole("region", { name: /hit points/i });
  fireEvent.input(screen.getByLabelText("damage amount"), { target: { value: "20" } });
  fireEvent.click(screen.getByRole("button", { name: /^damage$/i }));
  const hp = screen.getByRole("region", { name: /hit points/i });
  await waitFor(() => expect(within(hp).getByText(/dying/i)).toBeTruthy());
  expect(within(within(hp).getByRole("group", { name: "HP" })).getByText("0")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /safe rest/i }));
  await waitFor(() => expect(within(within(screen.getByRole("region", { name: /hit points/i })).getByRole("group", { name: "HP" })).getByText("25")).toBeTruthy());
  expect(within(screen.getByRole("region", { name: /wounds/i })).getByText(/1\s*\/\s*6/)).toBeTruthy();
  expect(screen.getByRole("log").textContent).toMatch(/wounds/i);
  expect(localCharacterStore(localStorage).get("scott.characters.pip")!.frontmatter.state).toMatchObject({ hp: 25, wounds: 1 });
});
test("spells known are listed by school and tier; a missing feature shows a Problems panel", async () => {
  open({ ...pip, frontmatter: { ...pip.frontmatter, features: ["nimble.features.mage.gone"] } });
  const spells = await screen.findByRole("region", { name: /spells/i });
  expect(within(spells).getByText("Ignite")).toBeTruthy();
  expect(within(spells).queryByText("Heal")).toBeNull();
  expect(screen.getByRole("region", { name: /problems/i }).textContent).toMatch(/gone/);
});
