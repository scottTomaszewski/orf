import { expect, test } from "vitest";
import { loadDocuments } from "../document.js";
import { buildRegistry } from "../registry.js";
import { evaluateCharacter } from "../engine.js";
import * as nimble from "./nimble.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const sheet = evaluateCharacter(pip, registry, byId);
const base = pip.frontmatter.state as Record<string, unknown>;
const ctx = (over: Record<string, unknown> = {}) => ({ sheet, state: { ...base, ...over } });
const variant = (fm: Record<string, unknown>) => evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, ...fm } }, registry, byId);

test("damage eats temp hp first, then hp; dropping to 0 = 1 Wound and Dying", () => {
  const r = nimble.damage(ctx({ hp: 5, temp_hp: 3 }), 10);
  expect(r.state).toMatchObject({ hp: 0, temp_hp: 0, wounds: 2, dying: true });
  expect(r.fired).toEqual(["gain-wound"]);
});
test("damage while Dying: 2 Wounds, 3 on a crit; hp stays 0", () => {
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4).state.wounds).toBe(4);
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4, true).state.wounds).toBe(5);
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4).state.hp).toBe(0);
});
test("dead at max Wounds is logged", () => {
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 5 }), 1).log.join()).toMatch(/dead/i);
});
test("heal clears Dying above 0 and fires full-hp at max, which refreshes the gnome reroll", () => {
  const r = nimble.heal(ctx({ hp: 0, dying: true, "gnome.reroll": 0 }), 30);
  expect(r.state).toMatchObject({ hp: 25, dying: false, "gnome.reroll": 1 });
  expect(r.fired).toEqual(["full-hp"]);
});
test("catch breath: each die heals best roll + STR + bonus, spends hit dice; advantage keeps the higher", () => {
  const r = nimble.catchBreath(ctx({ hp: 10, hit_dice: 2 }), [[4], [1]]);
  expect(r.state).toMatchObject({ hp: 13, hit_dice: 0 });                   // (4-1) + max(1-1, 0)
  const wild = variant({ state: { ...base, in_wilderness: true } });
  const r2 = nimble.catchBreath({ sheet: wild, state: { ...base, hp: 10, hit_dice: 1, in_wilderness: true } }, [[2, 5]]);
  expect(r2.state.hp).toBe(14);
});
test("make camp heals the maximum per die; oozeling maximizes catch breath too", () => {
  expect(nimble.makeCamp(ctx({ hp: 10, hit_dice: 2 }), 2).state.hp).toBe(20);   // (6-1) × 2
  const ooze = variant({ ancestry: "nimble.ancestries.oozeling" });
  expect(nimble.catchBreath({ sheet: ooze, state: { ...base, hp: 10, hit_dice: 1 } }, [[1]]).state.hp).toBe(15);
});
test("safe rest: full hp, hit dice, one Wound, mana; dying cleared", () => {
  const r = nimble.safeRest(ctx({ hp: 0, dying: true, wounds: 3, hit_dice: 0, mana: 0 }));
  expect(r.state).toMatchObject({ hp: 25, dying: false, wounds: 2, hit_dice: 4, mana: 13 });
});
test("initiative: digit count sets first-turn actions; the Cheat floors at 10; Dying caps at 1", () => {
  expect(nimble.encounterStart(ctx({ actions: 0 }), 7).state.actions).toBe(1);
  expect(nimble.encounterStart(ctx({ actions: 0 }), 14).state.actions).toBe(2);
  expect(nimble.encounterStart(ctx({ actions: 0 }), 21).state.actions).toBe(3);
  expect(nimble.encounterStart(ctx({ actions: 0, hp: 0, dying: true }), 21).state.actions).toBe(1);
  const cheat = variant({ id: "scott.characters.c", classes: [{ id: "nimble.classes.cheat", level: 2 }], choices: {}, levels: [{ level: 1, hp: 10 }] });
  expect(nimble.encounterStart({ sheet: cheat, state: { actions: 0, hp: 10 } }, 7).state.actions).toBe(2);
});
test("turn end restores actions; encounter end zeroes encounter pools", () => {
  expect(nimble.turnEnd(ctx({ actions: 1 })).state.actions).toBe(3);
  const z = variant({ id: "scott.characters.z", classes: [{ id: "nimble.classes.zephyr", level: 2 }], choices: {}, levels: [{ level: 1, hp: 13 }] });
  const r = nimble.encounterEnd({ sheet: z, state: { "zephyr.bursts": 2, hp: 13 } });
  expect(r.state["zephyr.bursts"]).toBe(0);
});
