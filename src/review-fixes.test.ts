import { expect, test } from "vitest";
import { loadDocuments, type Document } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { evaluateText } from "./expr/evaluate.js";
import { int, formatValue } from "./expr/value.js";
import { lintDocument } from "./lint.js";
import * as nimble from "./systems/nimble.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const base = pip.frontmatter.state as Record<string, unknown>;
const mk = (id: string, fm: Record<string, unknown>): Document => ({ path: `${id}.md`, body: "", bodyStartLine: 1, frontmatter: { id, type: "feature", system: "nimble", name: id, ...fm } });
const withFeature = (feat: Document, fm: Record<string, unknown> = {}) => {
  const b = new Map(byId); b.set(String(feat.frontmatter.id), feat);
  return evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, features: [String(feat.frontmatter.id)], ...fm } }, buildRegistry([...docs, feat]).registry, b);
};
const n = (s: ReturnType<typeof evaluateCharacter>, id: string) => (s.value(id) as { value: number }).value;

// 1. lint-clean content never crashes the sheet
test("fix 1: bad op values are diagnostics, not crashes", () => {
  for (const effects of [[{ target: "speed", add: true }], [{ target: "speed", add: "1d6 - 1d4" }], [{ target: "speed", add: "true + 1" }], [{ target: "speed", add: "-(1d6)" }]]) {
    const s = withFeature(mk("x.bad", { effects }));
    expect(s.diagnostics.length).toBeGreaterThan(0);
    expect(n(s, "speed")).toBe(5);
  }
});
// 2. boolean formulas work
test("fix 2: bloodied is true at low HP", () => {
  const s = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, state: { ...base, hp: 5 } } }, registry, byId);
  expect(s.value("bloodied")).toEqual({ kind: "bool", value: true });
});
// 3. only attached documents' resources and variables appear
test("fix 3: other classes' and ancestries' resources and variables are not on Pip", () => {
  const s = evaluateCharacter(pip, registry, byId);
  for (const r of ["dragonborn.breath", "oathsworn.lay_on_hands", "zephyr.bursts.momentum"]) expect(s.resources.has(r)).toBe(false);
  expect(s.variables.has("oathsworn.lay_on_hands.pool")).toBe(false);
  expect(s.resources.has("gnome.reroll")).toBe(true);
  const noAncestry = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, ancestry: undefined } }, registry, byId);
  expect(noAncestry.resources.has("gnome.reroll")).toBe(false);
});
// 4. missing state: wounds start at 0
test("fix 4: a resource missing from state starts at its declared start (wounds 0), else max", () => {
  const s = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, state: {} } }, registry, byId);
  expect(s.resources.get("wounds")!.current).toBe(0);
  expect(s.resources.get("hp")!.current).toBe(25);
});
// 5. ceil/round see the exact quotient
test("fix 5: ceil(7 / 2) is 4 and round(5 / 2) is 3; bare division still floors", () => {
  const env = { lookup: () => undefined };
  expect(evaluateText("ceil(7 / 2)", env)).toEqual(int(4));
  expect(evaluateText("round(5 / 2)", env)).toEqual(int(3));
  expect(evaluateText("floor(7 / 2)", env)).toEqual(int(3));
  expect(evaluateText("7 / 2", env)).toEqual(int(3));
});
// 6. dice sugar negative count
test("fix 6: negative dice-sugar count is an error", () => {
  expect(() => evaluateText("neg d8", { lookup: (k) => (k === "neg" ? int(-1) : undefined) })).toThrow(/negative/);
});
// 7. variable types enforced
test("fix 7: dice into an integer variable is a diagnostic and skipped", () => {
  const s = withFeature(mk("x.dice", { effects: [{ target: "armor.bonus", add: "1d4" }] }));
  expect(n(s, "armor")).toBe(4);
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/armor\.bonus.*integer.*dice/);
});
// 8. set shadow diagnostic: value, path of the setting doc, warning severity
test("fix 8: set shadow diagnostic names the value, comes from the setting document, is a warning", () => {
  const s = withFeature(mk("x.set", { effects: [{ target: "wounds.max", set: 4 }] }), { background: "nimble.backgrounds.devoted-protector", state: { ...base, ally_nearby: true } });
  const d = s.diagnostics.find((x) => /shadows/.test(x.message))!;
  expect(d.message).toMatch(/set 4 .*x\.set.*shadows.*devoted-protector/);
  expect(d.path).toBe("x.set.md");
  expect(d.severity).toBe("warning");
});
// 9. full-hp only on the transition; safe rest fires it
test("fix 9: full-hp fires on reaching max, not when already there; safe rest fires it", () => {
  const sheet = evaluateCharacter(pip, registry, byId);
  expect(nimble.heal({ sheet, state: { ...base, hp: 25, "gnome.reroll": 0 } }, 5).fired).toEqual([]);
  expect(nimble.catchBreath({ sheet, state: { ...base, hp: 25, hit_dice: 0, "gnome.reroll": 0 } }, []).fired).toEqual(["catch-breath"]);
  expect(nimble.safeRest({ sheet, state: { ...base, hp: 3, "gnome.reroll": 0 } }).fired).toContain("full-hp");
});
// 10. advantage read; rolls validated
test("fix 10: without advantage only the first roll counts; out-of-range rolls are rejected; an empty roll spends nothing", () => {
  const sheet = evaluateCharacter(pip, registry, byId);
  expect(nimble.catchBreath({ sheet, state: { ...base, hp: 10, hit_dice: 2 } }, [[1, 6]]).state.hp).toBe(10);   // 1 - 1 = 0
  const r = nimble.catchBreath({ sheet, state: { ...base, hp: 10, hit_dice: 2 } }, [[99]]);
  expect(r.state.hit_dice).toBe(2); expect(r.log.join()).toMatch(/99/);
  expect(nimble.catchBreath({ sheet, state: { ...base, hp: 10, hit_dice: 2 } }, [[]]).state.hit_dice).toBe(2);
});
// 11. choice validation
test("fix 11: too many picks, unknown slots, and unreached slots are diagnostics; extra picks ignored", () => {
  const fm = { ...pip.frontmatter, choices: { ...(pip.frontmatter.choices as object), "nimble.classes.mage.level-4.key-stat": ["int", "wil"], "nimble.classes.mage.level-5.bogus": ["x"] } };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(n(s, "int")).toBe(3); expect(n(s, "wil")).toBe(0);
  const msgs = s.diagnostics.map((d) => d.message).join("\n");
  expect(msgs).toMatch(/key-stat.*2 picks.*count 1/);
  expect(msgs).toMatch(/level-5\.bogus/);
});
// 12. dice resource max; helpers rejected by lint
test("fix 12: a dice-valued resource max is kept as dice, not an error; helper documents are rejected by lint", () => {
  const fm = { ...pip.frontmatter, id: "scott.characters.m10", classes: [{ id: "nimble.classes.mage", level: 10 }], choices: {}, levels: [{ level: 1, hp: 10 }], state: {} };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(s.diagnostics.filter((d) => /mage\.surge/.test(d.message))).toEqual([]);
  expect(s.resources.get("mage.surge")!.maxDice).toBe("1d4 + 0".replace(" + 0", ""));
  const helpers = mk("nimble.system.helpers", { type: "functions", functions: [{ id: "half", args: ["x"], expr: "floor(x / 2)" }] });
  expect(lintDocument(helpers, registry).map((d) => d.message).join()).toMatch(/helper.*not implemented/);
});
// 13. requirements use the sheet's stats; only equipped gear is diagnosed
test("fix 13: requirements use the sheet's STR including choice bumps; carried gear is not diagnosed", () => {
  const fm = { ...pip.frontmatter, stats: { str: 2, dex: 2, int: 2, wil: 0 }, choices: { ...(pip.frontmatter.choices as object), "nimble.classes.mage.level-4.key-stat": ["int"] },
    equipment: [{ id: "nimble.items.armor.half-plate", equipped: true }] };
  const strFeat = mk("x.str", { effects: [{ target: "str", add: 1 }] });
  const s = withFeature(strFeat, fm);
  expect(n(s, "str")).toBe(3);
  expect(n(s, "armor")).toBeGreaterThan(4);
  expect(s.diagnostics.filter((d) => /half-plate/.test(d.message))).toEqual([]);
  const carried = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, equipment: [{ id: "nimble.items.armor.half-plate", equipped: false }] } }, registry, byId);
  expect(carried.diagnostics.filter((d) => /half-plate/.test(d.message))).toEqual([]);
  expect(formatValue(carried.value("armor"))).toBe("2");
});
