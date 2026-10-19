import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { evaluateCharacter } from "../../../src/engine.js";
import { memoryHomebrewStore } from "../../../src/content-store.js";
import { App } from "../app.js";
import { localCharacterStore } from "../character-store.js";
import { realContent } from "../test-content.js";

beforeEach(() => { localStorage.clear(); location.hash = "#/create"; });

test("creating a gnome Mage saves a character that evaluates to HP 10, speed 5, Arcana 5", async () => {
  const content = realContent();
  render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} />);
  await screen.findByRole("heading", { name: /create/i });
  fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Nib" } });
  fireEvent.click(screen.getByLabelText("Mage"));
  fireEvent.click(screen.getByLabelText("Gnome"));
  fireEvent.click(screen.getByLabelText("Wild One"));
  fireEvent.click(screen.getByLabelText(/Standard/));
  const place = (stat: string, v: string) => fireEvent.change(screen.getByLabelText(stat), { target: { value: v } });
  place("STR", "-1"); place("DEX", "2"); place("INT", "2"); place("WIL", "0");
  const skills = screen.getByRole("group", { name: /skills/i });
  for (let i = 0; i < 3; i++) fireEvent.click(within(skills).getByRole("button", { name: "increase Arcana" }));
  fireEvent.click(within(skills).getByRole("button", { name: "increase Lore" }));
  fireEvent.click(screen.getByLabelText("Adventurer's Garb"));
  const btn = screen.getByRole("button", { name: /^create$/i });
  await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(btn);
  const list = localCharacterStore(localStorage).list();
  expect(list).toHaveLength(1);
  expect(list[0].name).toBe("Nib");
  const doc = localCharacterStore(localStorage).get(list[0].id)!;
  const s = evaluateCharacter(doc, content.registry, content.docs);
  expect(s.diagnostics).toEqual([]);
  const n = (id: string) => (s.value(id) as { value: number }).value;
  expect(n("hp.max")).toBe(10); expect(n("speed")).toBe(5); expect(n("skill.arcana")).toBe(5); expect(n("armor")).toBe(4);
  expect(location.hash).toBe(`#/play/${encodeURIComponent(list[0].id)}`);
});

test("Create stays disabled until every stat value is placed exactly once and the skill points are spent", async () => {
  render(<App loader={async () => realContent()} homebrew={memoryHomebrewStore()} storage={localStorage} />);
  await screen.findByRole("heading", { name: /create/i });
  fireEvent.input(screen.getByLabelText("Name"), { target: { value: "X" } });
  fireEvent.click(screen.getByLabelText("Mage")); fireEvent.click(screen.getByLabelText("Gnome")); fireEvent.click(screen.getByLabelText("Wild One"));
  fireEvent.click(screen.getByLabelText(/Standard/));
  const place = (stat: string, v: string) => fireEvent.change(screen.getByLabelText(stat), { target: { value: v } });
  place("STR", "2"); place("DEX", "2"); place("INT", "2"); place("WIL", "2");
  const skills = screen.getByRole("group", { name: /skills/i });
  for (let i = 0; i < 4; i++) fireEvent.click(within(skills).getByRole("button", { name: "increase Arcana" }));
  expect((screen.getByRole("button", { name: /^create$/i }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/each value once/i)).toBeTruthy();
});
