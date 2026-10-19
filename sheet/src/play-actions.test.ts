import { expect, test } from "vitest";
import { evaluateCharacter } from "../../src/engine.js";
import { performAction } from "./play-actions.js";
import { realContent } from "./test-content.js";

const c = realContent();
const pip = c.docs.get("scott.characters.pip")!;
const fixedRng = (seq: number[]) => { let i = 0; return () => seq[i++ % seq.length]; };
const state = (d: typeof pip) => d.frontmatter.state as Record<string, unknown>;

test("damage 20 drops Pip to 0, adds a Wound, sets Dying, and logs it; safe rest restores", () => {
  const sheet = evaluateCharacter(pip, c.registry, c.docs);
  const r1 = performAction(pip, sheet, { kind: "damage", amount: 20, crit: false }, Math.random);
  expect(state(r1.character)).toMatchObject({ hp: 0, wounds: 2, dying: true });
  expect(r1.log.join("\n")).toMatch(/Dying/);
  const sheet2 = evaluateCharacter(r1.character, c.registry, c.docs);
  const r2 = performAction(r1.character, sheet2, { kind: "safe-rest" }, Math.random);
  expect(state(r2.character)).toMatchObject({ hp: 25, wounds: 1, dying: false, mana: 13, hit_dice: 4 });
});
test("catch breath rolls each Hit Die visibly and heals", () => {
  const sheet = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, state: { ...state(pip), hp: 10, hit_dice: 2 } } }, c.registry, c.docs);
  const r = performAction(sheet.attachments[0] && { ...pip, frontmatter: { ...pip.frontmatter, state: { ...state(pip), hp: 10, hit_dice: 2 } } }, sheet, { kind: "catch-breath", dice: 1 }, fixedRng([0.99]));
  expect(r.rolls).toEqual([{ text: "1d6", rolls: [6], total: 6 }]);
  expect(state(r.character)).toMatchObject({ hp: 15, hit_dice: 1 });   // 6 + STR -1
  expect(r.log.join("\n")).toMatch(/rolled 6/);
});
test("adjust mana, toggle a flag, equip an item", () => {
  const sheet = evaluateCharacter(pip, c.registry, c.docs);
  expect(state(performAction(pip, sheet, { kind: "adjust", resource: "mana", delta: -2 }, Math.random).character).mana).toBe(4);
  expect(state(performAction(pip, sheet, { kind: "adjust", resource: "mana", delta: +50 }, Math.random).character).mana).toBe(13);
  expect(state(performAction(pip, sheet, { kind: "toggle", flag: "in_wilderness", value: true }, Math.random).character).in_wilderness).toBe(true);
  const eq = performAction(pip, sheet, { kind: "equip", id: "nimble.items.armor.adventurers-garb", equipped: false }, Math.random).character.frontmatter.equipment as { id: string; equipped: boolean }[];
  expect(eq.find((e) => e.id === "nimble.items.armor.adventurers-garb")!.equipped).toBe(false);
});
test("initiative sets first-turn actions; turn end restores them", () => {
  const sheet = evaluateCharacter(pip, c.registry, c.docs);
  const r = performAction(pip, sheet, { kind: "encounter-start", roll: 14 }, Math.random);
  expect(state(r.character).actions).toBe(2);
  expect(state(performAction(r.character, sheet, { kind: "turn-end" }, Math.random).character).actions).toBe(3);
});
