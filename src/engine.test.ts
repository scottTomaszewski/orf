import { expect, test } from "vitest";
import { loadDocuments } from "./document-fs.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { formatValue } from "./expr/value.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const n = (s: ReturnType<typeof evaluateCharacter>, id: string) => (s.value(id) as { value: number }).value;

test("Pip's headline numbers (H2 p.32, CR2)", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.diagnostics).toEqual([]);
  expect(n(s, "int")).toBe(3);               // 2 creation + 1 level-4 choice
  expect(n(s, "key")).toBe(3);
  expect(n(s, "level")).toBe(4);
  expect(n(s, "hp.max")).toBe(25);
  expect(n(s, "mana.max")).toBe(13);
  expect(n(s, "armor")).toBe(4);             // garb 2 + dex 2 beats unarmored dex
  expect(n(s, "skill.arcana")).toBe(6);
  expect(n(s, "skill.might")).toBe(-1);
  expect(n(s, "hit_dice.max")).toBe(4);
  expect(n(s, "speed")).toBe(5);             // gnome -1
  expect(n(s, "initiative.bonus")).toBe(2);
  expect(n(s, "spells.tier.max")).toBe(2);
  expect(n(s, "dc.hero")).toBe(13);
  expect(s.value("bloodied")).toEqual({ kind: "bool", value: false });
  expect(s.variables.get("armor.base")!.provenance.contributions.map((c) => c.origin)).toContain("nimble.items.armor.adventurers-garb");
});
test("resources: present, absent, and current from state", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.resources.get("mana")).toEqual({ id: "mana", max: 13, current: 6, floor: 0 });
  expect(s.resources.get("hp")!.current).toBe(17);
  expect(s.resources.has("gnome.reroll")).toBe(true);
  expect(s.resources.has("mage.surge")).toBe(false);          // level < 5
});
test("render resolves inline expressions in prose", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.render("Deals {{ 1d6 + str }}.")).toBe("Deals 1d6 - 1.");
  expect(s.render("{{ (max(int, 0) * 3) + level | (INT × 3) + level }}")).toBe("13");
});
test("equipment changes ripple: half-plate with unmet STR does not apply; wooden buckler adds", () => {
  const fm = { ...pip.frontmatter, equipment: [{ id: "nimble.items.armor.half-plate", equipped: true }, { id: "nimble.items.armor.wooden-buckler", equipped: true }] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(n(s, "armor")).toBe(4);              // unarmored dex 2 + buckler 2
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/half-plate/);
});
test("state toggles: ally_nearby adds Wounds for Devoted Protector; dying from state", () => {
  const fm = { ...pip.frontmatter, background: "nimble.backgrounds.devoted-protector", state: { ...(pip.frontmatter.state as object), ally_nearby: true, dying: true } };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(n(s, "wounds.max")).toBe(9);
  expect(s.value("dying")).toEqual({ kind: "bool", value: true });
});
test("level ladders via lookup: a level-9 Cheat has 2d10 Sneak Attack and Initiative floor 10", () => {
  const fm = { ...pip.frontmatter, id: "scott.characters.test", classes: [{ id: "nimble.classes.cheat", level: 9 }], choices: {}, levels: [{ level: 1, hp: 10 }] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(formatValue(s.value("cheat.sneak_attack.dice"))).toBe("2d10");
  expect(n(s, "initiative.floor")).toBe(10);
});
test("a formula cycle is one diagnostic naming both members, not a crash", () => {
  const cyc = { path: "cyc.md", body: "", bodyStartLine: 1, frontmatter: { id: "x.cyc", type: "variables", system: "nimble", name: "c",
    variables: [{ id: "cyc.a", name: "a", type: "integer", default: 1, formula: "cyc.b + 1" }, { id: "cyc.b", name: "b", type: "integer", default: 2, formula: "cyc.a + 1" }] } };
  const reg2 = buildRegistry([...docs, cyc]).registry;
  const byId2 = new Map(byId); byId2.set("x.cyc", cyc);   // a template doc attaches to every character of the system
  const s = evaluateCharacter(pip, reg2, byId2);
  expect(s.diagnostics.filter((d) => /cycle/.test(d.message))).toHaveLength(1);
  expect(s.diagnostics.find((d) => /cycle/.test(d.message))!.message).toMatch(/cyc\.a.*cyc\.b/);
  expect(n(s, "cyc.a")).toBe(1);
});
test("a when reading an absent resource's current is a diagnostic and false", () => {
  const feat = { path: "f.md", body: "", bodyStartLine: 1, frontmatter: { id: "x.f", type: "feature", system: "nimble", name: "f",
    effects: [{ target: "speed", add: 1, when: "mage.surge.current > 0" }] } };
  const byId2 = new Map(byId); byId2.set("x.f", feat);
  const fm = { ...pip.frontmatter, features: ["x.f"] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, buildRegistry([...docs, feat]).registry, byId2);
  expect(n(s, "speed")).toBe(5);
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/mage\.surge\.current/);
});

test("render resolves the portable span spelling exactly like the short one", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.render('Deals <span data-orf="1d6 + str">1d6 plus Strength</span>.')).toBe("Deals 1d6 - 1.");
  expect(s.render("{{ wounds.max }} and <span data-orf=\"wounds.max\">w</span>")).toBe(`${n(s, "wounds.max")} and ${n(s, "wounds.max")}`);
});
