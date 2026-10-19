import { expect, test } from "vitest";
import type { Document } from "./document.js";
import { buildRegistry } from "./registry.js";

const doc = (path: string, frontmatter: Record<string, unknown>): Document => ({ path, frontmatter, body: "", bodyStartLine: 1 });

const varsDoc = doc("vars.md", {
  id: "nimble.system.core", type: "variables", system: "nimble", name: "Core",
  variables: [
    { id: "dex", name: "your Dexterity", type: "integer", default: 0, alias: "DEX" },
    { id: "wounds.max", name: "your maximum Wounds", type: "integer", default: 6, ops: ["add", "set"] },
  ],
});
const resDoc = doc("res.md", {
  id: "nimble.system.resources", type: "resources", system: "nimble", name: "Resources",
  resources: [{ id: "hit_dice", max: "hit_dice.max", refresh: [{ on: "safe-rest", to: "max" }] }],
});
const evDoc = doc("ev.md", {
  id: "nimble.system.events", type: "events", system: "nimble", name: "Events",
  events: [{ id: "gain-wound", args: ["amount"] }],
});
const predDoc = doc("pred.md", {
  id: "nimble.system.predicates", type: "predicates", system: "nimble", name: "Predicates",
  predicates: [{ id: "equipped", name: "equipped", args: ["armor", "shield"] }],
});
const tableDoc = doc("t.md", {
  id: "nimble.tables.starting-gold", type: "table", system: "nimble", name: "Starting gold",
  columns: ["level", "gold"], rows: [[1, 50], [2, 100]],
});
const classLevelDoc = doc("cl.md", {
  id: "nimble.classes.mage.level-4", type: "class-level", system: "nimble", name: "Mage 4",
  class: "nimble.classes.mage", level: 4,
  choices: [{ slot: "spellshaper", count: 2, from: { type: "feature", tags: ["spellshaper"] } }],
});
const pkgDoc = doc("pkg.md", { id: "nimble", type: "package", system: "nimble", name: "Nimble", label: "2.0.3", members: ["nimble.system.core"] });

const varDoc = (path: string, id: string) =>
  doc(path, { id: `x.${path}`, type: "variables", system: "nimble", name: path, variables: [{ id, name: id, type: "integer" }] });

test("collects variables, aliases, resources, events, predicates, tables, slots, packages", () => {
  const { registry, diagnostics } = buildRegistry([varsDoc, resDoc, evDoc, predDoc, tableDoc, classLevelDoc, pkgDoc]);
  expect(diagnostics).toEqual([]);
  expect(registry.variables.get("wounds.max")?.default).toBe(6);
  expect(registry.aliases.get("DEX")).toBe("dex");
  expect(registry.resources.get("hit_dice")?.refresh[0]).toEqual({ on: "safe-rest", to: "max" });
  expect(registry.events.has("gain-wound")).toBe(true);
  expect(registry.events.has("safe-rest")).toBe(true);
  expect(registry.predicates.get("equipped")?.args).toContain("armor");
  expect(registry.functions.has("floor")).toBe(true);
  expect(registry.tables.get("nimble.tables.starting-gold")?.columns[0]).toBe("level");
  expect(registry.slots.has("nimble.classes.mage.level-4.spellshaper")).toBe(true);
  expect(registry.packages.get("nimble")?.members).toContain("nimble.system.core");
  expect(registry.documentIds.has("nimble.classes.mage.level-4")).toBe(true);
});

test("duplicate variable id across two documents names both files", () => {
  const { diagnostics } = buildRegistry([varDoc("a.md", "wounds.max"), varDoc("b.md", "wounds.max")]);
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0].message).toMatch(/wounds\.max.*a\.md.*b\.md/);
});

test("duplicate resource id is a diagnostic", () => {
  const r = (path: string) => doc(path, { id: `r.${path}`, type: "resources", system: "nimble", name: path, resources: [{ id: "mana", refresh: [] }] });
  const { diagnostics } = buildRegistry([r("a.md"), r("b.md")]);
  expect(diagnostics[0].message).toMatch(/mana.*a\.md.*b\.md/);
});

test("malformed variable id is a diagnostic", () => {
  const { diagnostics } = buildRegistry([varDoc("a.md", "Wounds.Max")]);
  expect(diagnostics[0].message).toMatch(/Wounds\.Max/);
});

test("unknown op in variable ops is a diagnostic", () => {
  const d = doc("a.md", { id: "x.a", type: "variables", system: "nimble", name: "a", variables: [{ id: "hp.max", name: "hp", type: "integer", ops: ["add", "override"] }] });
  expect(buildRegistry([d]).diagnostics[0].message).toMatch(/override/);
});

test("variables and resources declared on any content document are included", () => {
  const mage = doc("mage.md", {
    id: "nimble.classes.mage", type: "class", system: "nimble", name: "Mage",
    variables: [{ id: "mana.max", name: "your maximum mana", type: "integer", formula: "(max(int, 0) * 3) + level" }],
    resources: [{ id: "mana", max: "mana.max", refresh: [{ on: "safe-rest", to: "max" }] }],
  });
  const { registry, diagnostics } = buildRegistry([mage]);
  expect(diagnostics).toEqual([]);
  expect(registry.variables.get("mana.max")?.declaredIn).toBe("mage.md");
  expect(registry.resources.get("mana")?.declaredIn).toBe("mage.md");
});

test("duplicate document id across two files names both", () => {
  const a = doc("a.md", { id: "x.y.z", type: "feature", system: "nimble", name: "A" });
  const b = doc("b.md", { id: "x.y.z", type: "feature", system: "nimble", name: "B" });
  const { diagnostics } = buildRegistry([a, b]);
  expect(diagnostics[0].message).toMatch(/document id "x\.y\.z".*a\.md.*b\.md/);
});

test("slots carry their options list", () => {
  const cl = doc("cl.md", { id: "nimble.classes.mage.level-3", type: "class-level", system: "nimble", name: "Mage 3", class: "nimble.classes.mage", level: 3,
    choices: [{ slot: "school", count: 1, from: { options: ["fire", "ice"] } }] });
  const { registry } = buildRegistry([cl]);
  expect(registry.slots.get("nimble.classes.mage.level-3.school")?.options).toEqual(["fire", "ice"]);
});

test("resource max and floor keep numeric values; bad type/rounding are diagnostics", () => {
  const d = doc("r.md", { id: "x.r", type: "resources", system: "nimble", name: "r", resources: [{ id: "breath", max: 1, floor: 0, refresh: [] }] });
  const { registry, diagnostics } = buildRegistry([d]);
  expect(diagnostics).toEqual([]);
  expect(registry.resources.get("breath")?.max).toBe(1);
  const v = doc("v.md", { id: "x.v", type: "variables", system: "nimble", name: "v", variables: [{ id: "a", name: "a", type: "integr" }, { id: "b", name: "b", type: "integer", rounding: "sometimes" }] });
  const msgs = buildRegistry([v]).diagnostics.map((x) => x.message).join("\n");
  expect(msgs).toMatch(/integr/);
  expect(msgs).toMatch(/sometimes/);
});

test("registry records each document's type", () => {
  const { registry } = buildRegistry([doc("g.md", { id: "nimble.ancestries.gnome", type: "ancestry", system: "nimble", name: "Gnome" })]);
  expect(registry.documentTypes.get("nimble.ancestries.gnome")).toBe("ancestry");
});
