import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { applyMoment } from "./moments.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const sheet = evaluateCharacter(pip, registry, byId);
const st = () => ({ ...(pip.frontmatter.state as Record<string, unknown>) });

test("safe-rest: hp and hit dice to max, one Wound healed, temp hp cleared, mana to max", () => {
  const r = applyMoment("safe-rest", sheet, { ...st(), temp_hp: 3 });
  expect(r.state).toMatchObject({ hp: 25, hit_dice: 4, wounds: 0, temp_hp: 0, mana: 13 });
  expect(r.changes.find((c) => c.resource === "wounds")).toMatchObject({ from: 1, to: 0, rule: "safe-rest add -1" });
});
test("wounds never go below floor; a moment with no listeners changes nothing", () => {
  expect(applyMoment("safe-rest", sheet, { ...st(), wounds: 0 }).state.wounds).toBe(0);
  expect(applyMoment("level-up", sheet, st()).changes).toEqual([]);
});
test("turn-end restores actions; full-hp refreshes the gnome reroll", () => {
  expect(applyMoment("turn-end", sheet, { ...st(), actions: 0 }).state.actions).toBe(3);
  expect(applyMoment("full-hp", sheet, { ...st(), "gnome.reroll": 0 }).state["gnome.reroll"]).toBe(1);
});
