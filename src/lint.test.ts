import { expect, test } from "vitest";
import type { Document } from "./document.js";
import { buildRegistry, type Registry } from "./registry.js";
import { lintDocument } from "./lint.js";

const doc = (path: string, frontmatter: Record<string, unknown>, body = ""): Document => ({ path, frontmatter, body, bodyStartLine: 1 });

const base = [
  doc("pkg.md", { id: "nimble", type: "package", system: "nimble", name: "Nimble", members: [] }),
  doc("vars.md", {
    id: "nimble.system.core", type: "variables", system: "nimble", name: "Core",
    variables: [
      { id: "str", name: "your Strength", type: "integer", default: 0, alias: "STR" },
      { id: "dex", name: "your Dexterity", type: "integer", default: 0, alias: "DEX" },
      { id: "int", name: "your Intelligence", type: "integer", default: 0, alias: "INT" },
      { id: "wil", name: "your Will", type: "integer", default: 0, alias: "WIL" },
      { id: "level", name: "your level", type: "integer", default: 1 },
      { id: "key", name: "your key stat", type: "integer", ops: ["base"] },
      { id: "wounds.max", name: "your maximum Wounds", type: "integer", default: 6, ops: ["add", "set"] },
      { id: "armor.base", name: "your Armor", type: "integer", ops: ["base"] },
      { id: "hp.max", name: "your maximum Hit Points", type: "integer", ops: ["add"] },
      { id: "dying", name: "Dying", type: "boolean", default: false },
    ],
  }),
  doc("res.md", { id: "nimble.system.resources", type: "resources", system: "nimble", name: "Resources",
    resources: [{ id: "hp", max: "hp.max", refresh: [{ on: "safe-rest", to: "max" }] }, { id: "wounds", max: "wounds.max", refresh: [] }] }),
  doc("ev.md", { id: "nimble.system.events", type: "events", system: "nimble", name: "Events", events: [{ id: "gain-wound", args: ["amount"] }] }),
  doc("pred.md", { id: "nimble.system.predicates", type: "predicates", system: "nimble", name: "Predicates",
    predicates: [{ id: "equipped", name: "equipped", args: ["armor", "shield"] }, { id: "level", name: "level", args: ["mage"] }] }),
  doc("t.md", { id: "nimble.tables.starting-gold", type: "table", system: "nimble", name: "gold", columns: ["level", "gold"], rows: [[1, 50]] }),
  doc("gnome.md", { id: "nimble.ancestries.gnome", type: "ancestry", system: "nimble", name: "Gnome" }),
  doc("mage.md", { id: "nimble.classes.mage", type: "class", system: "nimble", name: "Mage" }),
  doc("mage4.md", { id: "nimble.classes.mage.level-4", type: "class-level", system: "nimble", name: "Mage 4", class: "nimble.classes.mage", level: 4,
    choices: [{ slot: "key-stat", count: 1, from: { options: ["int", "wil"] } }] }),
];
const reg: Registry = buildRegistry(base).registry;

const content = (extra: Record<string, unknown>, body = "") =>
  doc("c.md", { id: "x.content.c", type: "feature", system: "nimble", name: "C", ...extra }, body);

test("clean document has no diagnostics", () => {
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: "not equipped(armor)" }] }, "You have {{ wounds.max }} Wounds."), reg)).toEqual([]);
});

test("package ids are bare; content ids are dotted", () => {
  expect(lintDocument(doc("p.md", { id: "nimble", type: "package", system: "nimble", name: "Nimble" }), reg)).toEqual([]);
  expect(lintDocument(doc("p.md", { id: "nimble", type: "ancestry", system: "nimble", name: "Nimble" }), reg)[0].message).toMatch(/dotted/);
});

test("missing id/type/system/name are reported", () => {
  const d = lintDocument(doc("n.md", { id: "bad id" }), reg);
  expect(d.map((x) => x.message).join("\n")).toMatch(/id.*bad id/);
  expect(d.map((x) => x.message).join("\n")).toMatch(/type/);
  expect(d.map((x) => x.message).join("\n")).toMatch(/name/);
});

test("system must name a loaded package", () => {
  const d = lintDocument(doc("n.md", { id: "x.y", type: "feature", system: "srd5e", name: "n" }), reg);
  expect(d[0].message).toMatch(/srd5e/);
});

test("effect with two ops errors naming the index", () => {
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, set: 2 }] }), reg)[0].message).toMatch(/effects\[0\].*exactly one/);
});

test("effect with no op errors", () => {
  expect(lintDocument(content({ effects: [{ target: "wounds.max" }] }), reg)[0].message).toMatch(/effects\[0\].*exactly one/);
});

test("unknown target is named", () => {
  expect(lintDocument(content({ effects: [{ target: "wound.max", add: 1 }] }), reg)[0].message).toMatch(/unknown target "wound\.max"/);
});

test("alias, key, and this. resolve; near miss is named with the expression", () => {
  const d = lintDocument(content({}, "{{ DEX }} {{ key }} {{ this.strength_requirement }} {{ wound.max }}"), reg);
  expect(d).toHaveLength(1);
  expect(d[0].message).toMatch(/unknown identifier "wound\.max" in "\{\{ wound\.max \}\}"/);
  expect(d[0].line).toBe(1);
});

test("op not allowed on target", () => {
  expect(lintDocument(content({ effects: [{ target: "armor.base", add: 1 }] }), reg)[0].message).toMatch(/add.*armor\.base/);
});

test("predicate argument must be declared; state boolean resolves", () => {
  const d = lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: "equipped(helmet) and dying" }] }), reg);
  expect(d).toHaveLength(1);
  expect(d[0].message).toMatch(/helmet/);
});

test("table id as first arg of table() resolves", () => {
  expect(lintDocument(content({}, '{{ table("nimble.tables.starting-gold", level, "gold") }}'), reg)).toEqual([]);
});

test("string property containing {{ }} is checked", () => {
  expect(lintDocument(content({ range: "{{ wil * 2 }} spaces", note: "{{ nope }}" }), reg)[0].message).toMatch(/nope/);
});

test("refresh on undeclared event", () => {
  const d = lintDocument(content({ resources: [{ id: "x", refresh: [{ on: "long-rest", to: "max" }] }] }), buildRegistry([...base, content({ resources: [{ id: "x", refresh: [] }] })]).registry);
  expect(d[0].message).toMatch(/long-rest/);
});

test("choice without from.type or from.options", () => {
  const d = lintDocument(doc("cl.md", { id: "nimble.classes.mage.level-5", type: "class-level", system: "nimble", name: "Mage 5", class: "nimble.classes.mage", level: 5,
    choices: [{ slot: "s", count: 1, from: {} }] }), reg);
  expect(d[0].message).toMatch(/choices\[0\].*from/);
});

test("character: state key must be a declared resource; choices keyed by registered slots", () => {
  const ch = doc("pip.md", {
    id: "scott.characters.pip", type: "character", system: "nimble", name: "Pip",
    stats: { str: -1, dex: 2, int: 3, wil: 0 },
    ancestry: "nimble.ancestries.gnome",
    classes: [{ id: "nimble.classes.mage", level: 4 }],
    levels: [{ level: 1, hp: 10 }],
    choices: { "nimble.classes.mage.level-4.key-stat": ["int"], "nimble.classes.mage.level-9.bogus": ["x"] },
    equipment: [{ id: "nimble.classes.mage", equipped: true }],
    state: { hp: 10, ki: 3 },
  });
  const msgs = lintDocument(ch, reg).map((x) => x.message).join("\n");
  expect(msgs).toMatch(/ki/);
  expect(msgs).toMatch(/level-9\.bogus/);
  expect(msgs).not.toMatch(/key-stat/);
});

test("character: stats must have the four integer stats", () => {
  const ch = doc("pip.md", { id: "scott.characters.pip", type: "character", system: "nimble", name: "Pip", stats: { str: 1, dex: "2" }, state: {} });
  const msgs = lintDocument(ch, reg).map((x) => x.message).join("\n");
  expect(msgs).toMatch(/dex/);
  expect(msgs).toMatch(/int/);
});

test("requires as stat map or id list", () => {
  expect(lintDocument(content({ requires: { str: 2 } }), reg)).toEqual([]);
  expect(lintDocument(content({ requires: ["nimble.ancestries.elf"] }), reg)[0].message).toMatch(/elf/);
});

test("event handlers: unknown event key, undeclared identifier in a step, and roll() allowed", () => {
  const ev = doc("ev2.md", {
    id: "nimble.system.events2", type: "events", system: "nimble", name: "Events",
    events: [{ id: "full-hp", args: [] }],
    handlers: {
      "long-rest": [{ restore: "hp", amount: "hp.max" }],
      damage: [
        { spend: "hp", amount: "amount - spent" },
        { when: "hp.current == 0 and not dying", fire: "gain-wound", amount: 1 },
        { restore: "hp", amount: "roll(6) + nope" },
        { spend: "ki", amount: 1 },
      ],
    },
  });
  const msgs = lintDocument(ev, reg).map((x) => x.message);
  expect(msgs.some((m) => /handlers\.long-rest.*unknown event/.test(m))).toBe(true);
  expect(msgs.some((m) => /nope/.test(m))).toBe(true);
  expect(msgs.some((m) => /ki/.test(m))).toBe(true);
  expect(msgs.filter((m) => /unknown (identifier|function) "(roll|amount|spent|crit)"/.test(m))).toEqual([]);
  expect(msgs).toHaveLength(3);
});

test("character: a pick listed in the slot's options is valid", () => {
  const cl = doc("cl3.md", { id: "nimble.classes.mage.level-3", type: "class-level", system: "nimble", name: "Mage 3", class: "nimble.classes.mage", level: 3,
    choices: [{ slot: "school", count: 1, from: { options: ["fire", "ice"] } }] });
  const reg2 = buildRegistry([...base, cl]).registry;
  const ch = doc("pip.md", { id: "scott.characters.pip", type: "character", system: "nimble", name: "Pip", stats: { str: 0, dex: 0, int: 0, wil: 0 },
    choices: { "nimble.classes.mage.level-3.school": ["fire"], "nimble.classes.mage.level-4.key-stat": ["wil"] }, state: {} });
  expect(lintDocument(ch, reg2)).toEqual([]);
});
