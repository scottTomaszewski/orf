import { expect, test } from "vitest";
import { loadDocuments, type Document } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { applyLevelUp, creationOptions, levelUpPrompts, newCharacter, rollDice, skillRows, spellsKnown } from "./sheet-model.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const n = (s: ReturnType<typeof evaluateCharacter>, id: string) => (s.value(id) as { value: number }).value;
const fixedRng = (seq: number[]) => { let i = 0; return () => seq[i++ % seq.length]; };

test("creationOptions lists the four classes, ancestries, backgrounds, three stat arrays, 4 skill points", () => {
  const o = creationOptions(byId);
  expect(o.classes.map((c) => c.name).sort()).toEqual(["Mage", "Oathsworn", "The Cheat", "Zephyr"]);
  expect(o.ancestries.length).toBe(5);
  expect(o.backgrounds.length).toBe(2);
  expect(o.statArrays.map((a) => a.id)).toEqual(["standard", "balanced", "min-max"]);
  expect(o.skillPoints).toBe(4);
});

test("newCharacter: a level-1 gnome Mage with the standard array evaluates to HP 10, mana 0, armor = dex", () => {
  const doc = newCharacter({ id: "test.characters.nib", name: "Nib", classId: "nimble.classes.mage", ancestryId: "nimble.ancestries.gnome", backgroundId: "nimble.backgrounds.wild-one",
    stats: { str: -1, dex: 2, int: 2, wil: 0 }, skills: { arcana: 3, lore: 1 }, equipment: [] }, byId);
  const s = evaluateCharacter(doc, registry, byId);
  expect(s.diagnostics).toEqual([]);
  expect(n(s, "hp.max")).toBe(10);
  expect(n(s, "mana.max")).toBe(0);
  expect(n(s, "armor")).toBe(2);
  expect(n(s, "skill.arcana")).toBe(5);
  expect(s.resources.get("hp")!.current).toBe(10);
  expect(s.resources.get("wounds")!.current).toBe(0);
});

test("levelUpPrompts for Pip (4 → 5) grants Elemental Surge and offers secondary-stat [str, dex]; applyLevelUp writes level 5, hp, choice", () => {
  const p = levelUpPrompts(pip, registry, byId)!;
  expect(p.level).toBe(5);
  expect(p.grants.map((g) => g.name)).toEqual(["Elemental Surge"]);
  expect(p.slots).toHaveLength(1);
  expect(p.slots[0].options).toEqual(["str", "dex"]);
  expect(p.hpRoll).toEqual({ die: 6, advantage: true });
  const next = applyLevelUp(pip, p, { hp: 5, picks: { [`${p.classLevelId}.secondary-stat`]: ["dex"] }, skill: "stealth" });
  const s = evaluateCharacter(next, registry, byId);
  expect(n(s, "level")).toBe(5);
  expect(n(s, "hp.max")).toBe(30);
  expect(n(s, "dex")).toBe(3);
  expect(n(s, "skill.stealth.points")).toBe(1);
  expect(s.resources.has("mage.surge")).toBe(true);
});

test("levelUpPrompts for a level-2 Mage offers subclass (Chaos, Control) and elemental-mastery [fire, ice, lightning]", () => {
  const l1 = newCharacter({ id: "test.characters.m", name: "M", classId: "nimble.classes.mage", ancestryId: "nimble.ancestries.human", backgroundId: "nimble.backgrounds.wild-one",
    stats: { str: 0, dex: 2, int: 2, wil: -1 }, skills: { arcana: 4 }, equipment: [] }, byId);
  const l2 = applyLevelUp(l1, levelUpPrompts(l1, registry, byId)!, { hp: 4, picks: {}, skill: "lore" });
  const p = levelUpPrompts(l2, registry, byId)!;
  expect(p.level).toBe(3);
  const sub = p.slots.find((s) => s.slot.id.endsWith(".subclass"))!;
  expect((sub.options as { name: string }[]).map((o) => o.name).sort()).toEqual(["Invoker of Chaos", "Invoker of Control"]);
  expect(p.slots.find((s) => s.slot.id.endsWith(".elemental-mastery"))!.options).toEqual(["fire", "ice", "lightning"]);
  expect(levelUpPrompts({ ...pip, frontmatter: { ...pip.frontmatter, classes: [{ id: "nimble.classes.mage", level: 20 }] } }, registry, byId)).toBeUndefined();
});

test("spellsKnown for Pip: fire/ice/lightning cantrips, tier 1 and tier 2; no radiant; nothing above tier 2", () => {
  const s = evaluateCharacter(pip, registry, byId);
  const known = spellsKnown(s, byId);
  expect(new Set(known.map((k) => k.school))).toEqual(new Set(["fire", "ice", "lightning"]));
  expect(Math.max(...known.map((k) => k.tier))).toBe(2);
  expect(known.find((k) => k.spell.frontmatter.name === "Ignite")).toBeTruthy();
  expect(known.find((k) => k.spell.frontmatter.name === "Heal")).toBeUndefined();
});

test("skillRows: ten rows with stat, points, total", () => {
  const rows = skillRows(evaluateCharacter(pip, registry, byId));
  expect(rows).toHaveLength(10);
  expect(rows.find((r) => r.id === "arcana")).toEqual({ id: "arcana", name: "Arcana", stat: "int", points: 3, total: 6 });
});

test("rollDice('2d6 + 1') with a fixed rng returns rolls and total; '4d6kh3' keeps three", () => {
  expect(rollDice("2d6 + 1", fixedRng([0, 0.99]))).toEqual({ text: "2d6 + 1", rolls: [1, 6], total: 8 });
  const r = rollDice("4d6kh3", fixedRng([0, 0.5, 0.99, 0.99]));
  expect(r.rolls).toEqual([1, 4, 6, 6]);
  expect(r.total).toBe(16);
  expect(rollDice("1d8 - 1", fixedRng([0.99])).total).toBe(7);
});
