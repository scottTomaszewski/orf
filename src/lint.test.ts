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
      { id: "initiative.floor", name: "the minimum you can roll for Initiative", type: "integer", default: 0, ops: ["at_least"] },
    ],
  }),
  doc("res.md", { id: "nimble.system.resources", type: "resources", system: "nimble", name: "Resources",
    resources: [{ id: "hp", max: "hp.max", refresh: [{ on: "safe-rest", to: "max" }] }, { id: "wounds", max: "wounds.max", refresh: [] }] }),
  doc("ev.md", { id: "nimble.system.events", type: "events", system: "nimble", name: "Events", events: [{ id: "gain-wound", description: "fired by the engine when a Wound is gained" }] }),
  doc("pred.md", { id: "nimble.system.predicates", type: "predicates", system: "nimble", name: "Predicates",
    predicates: [{ id: "equipped", name: "equipped", args: ["armor", "shield"] }, { id: "level", name: "level", args: ["mage"] }, { id: "has", name: "has", args: [] }] }),
  doc("t.md", { id: "nimble.tables.starting-gold", type: "table", system: "nimble", name: "gold", columns: ["level", "gold"], rows: [[1, 50]] }),
  doc("gnome.md", { id: "nimble.ancestries.gnome", type: "ancestry", system: "nimble", name: "Gnome" }),
  doc("mage.md", { id: "nimble.classes.mage", type: "class", system: "nimble", name: "Mage" }),
  doc("mail.md", { id: "nimble.items.armor.rusty-mail", type: "armor", system: "nimble", name: "Rusty Mail" }),
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
  const d = lintDocument(content({ strength_requirement: 2 }, "{{ DEX }} {{ key }} {{ this.strength_requirement }} {{ wound.max }}"), reg);
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

test("character: a pick listed in the slot's options is valid", () => {
  const cl = doc("cl3.md", { id: "nimble.classes.mage.level-3", type: "class-level", system: "nimble", name: "Mage 3", class: "nimble.classes.mage", level: 3,
    choices: [{ slot: "school", count: 1, from: { options: ["fire", "ice"] } }] });
  const reg2 = buildRegistry([...base, cl]).registry;
  const ch = doc("pip.md", { id: "scott.characters.pip", type: "character", system: "nimble", name: "Pip", stats: { str: 0, dex: 0, int: 0, wil: 0 },
    choices: { "nimble.classes.mage.level-3.school": ["fire"], "nimble.classes.mage.level-4.key-stat": ["wil"] }, state: {} });
  expect(lintDocument(ch, reg2)).toEqual([]);
});

// ---- review fix pass ----
test("effects given as a mapping, and unknown effect keys, are errors", () => {
  expect(lintDocument(content({ effects: { target: "wounds.max", add: 1 } }), reg)[0].message).toMatch(/effects must be a list/);
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, whn: "dying" }] }), reg)[0].message).toMatch(/effects\[0\].*unknown key "whn"/);
});

test("a swallowed {{ }} (mapping with null value) and unbalanced parentheses are errors", () => {
  expect(lintDocument(content({ damage: { "{ 1d4 + dex }": null } }), reg)[0].message).toMatch(/damage.*looks like an unquoted \{\{/);
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: "if(dex > 1" }] }), reg).map((d) => d.message).join("\n")).toMatch(/unbalanced/);
});

test("grants on class and subclass docs, grants_by_level, and choice effect/when are checked", () => {
  const cls = doc("c.md", { id: "x.classes.c", type: "class", system: "nimble", name: "C", grants: ["x.nope"] });
  expect(lintDocument(cls, reg)[0].message).toMatch(/grants.*x\.nope/);
  const sub = doc("s.md", { id: "x.subclasses.s", type: "subclass", system: "nimble", name: "S", class: "nimble.classes.mage", grants_by_level: { 7: ["x.nope"] } });
  expect(lintDocument(sub, reg)[0].message).toMatch(/grants_by_level\[7\].*x\.nope/);
  const cl = doc("cl.md", { id: "nimble.classes.mage.level-6", type: "class-level", system: "nimble", name: "M6", class: "nimble.classes.mage", level: 6,
    choices: [{ slot: "k", count: 1, from: { options: ["int"] }, effect: { target: "{{ choice }}", add: "nope" }, when: "levl(mage) > 1" }] });
  const msgs = lintDocument(cl, reg).map((d) => d.message).join("\n");
  expect(msgs).toMatch(/nope/);
  expect(msgs).toMatch(/levl/);
});

test("character: stat picks must be in the slot's options; skills must be declared; references are type-checked; level 1-20", () => {
  const regS = buildRegistry([...base, doc("sk.md", { id: "nimble.system.skills", type: "variables", system: "nimble", name: "Skills",
    variables: [{ id: "skill.arcana.points", name: "a", type: "integer" }] })]).registry;
  const ch = doc("pip.md", {
    id: "scott.characters.pip", type: "character", system: "nimble", name: "Pip",
    stats: { str: 0, dex: 0, int: 0, wil: 0 },
    ancestry: "nimble.classes.mage",
    classes: [{ id: "nimble.ancestries.gnome", level: 99 }],
    skills: { arcana: 3, arcna: 1 },
    choices: { "nimble.classes.mage.level-4.key-stat": ["dex"] },
    equipment: [{ id: "nimble.classes.mage", equipped: true }],
    state: {},
  });
  const msgs = lintDocument(ch, regS).map((d) => d.message).join("\n");
  expect(msgs).toMatch(/ancestry.*not an ancestry/);
  expect(msgs).toMatch(/classes\[0\].*not a class/);
  expect(msgs).toMatch(/level.*1-20/);
  expect(msgs).toMatch(/arcna/);
  expect(msgs).not.toMatch(/"arcana"/);
  expect(msgs).toMatch(/key-stat.*dex/);
  expect(msgs).toMatch(/equipment\[0\].*not an item/);
});

test("amount/spent/choice resolve only in their contexts; this.x must exist on the document", () => {
  const d = lintDocument(content({ strength_requirement: 2 }, "{{ amount }} {{ choice }} {{ this.strength_requirement }} {{ this.nope }}"), reg);
  const msgs = d.map((x) => x.message);
  expect(msgs.filter((m) => /"amount"|"choice"|"this\.nope"/.test(m))).toHaveLength(3);
  expect(msgs.filter((m) => /this\.strength_requirement/.test(m))).toHaveLength(0);
});

test("has() takes a quoted document id and checks it", () => {
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: 'has("nimble.ancestries.gnome")' }] }), reg)).toEqual([]);
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: 'has("nimble.ancestries.elf")' }] }), reg)[0].message).toMatch(/elf/);
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: "has(nimble.ancestries.gnome)" }] }), reg)[0].message).toMatch(/has\(\) needs a quoted/);
});

// ---- format revision (2026-10-18): describe, don't script ----
test("clamp ops are at_least/at_most; min/max as effect keys are rejected with the new names", () => {
  expect(lintDocument(content({ effects: [{ target: "initiative.floor", at_least: 10 }] }), reg)).toEqual([]);
  const msgs = lintDocument(content({ effects: [{ target: "initiative.floor", min: 10 }] }), reg).map((d) => d.message).join("\n");
  expect(msgs).toMatch(/at_least/);
  expect(msgs).toMatch(/"min"/);
});

test("transfer is gone: it is an unknown effect key", () => {
  expect(lintDocument(content({ effects: [{ target: "wounds.max", add: 1, transfer: "equipped" }] }), reg)[0].message).toMatch(/unknown key "transfer"/);
});

test("bare equipped/carried are valid in when: only on item documents", () => {
  const item = doc("m.md", { id: "nimble.items.armor.rusty-mail", type: "armor", system: "nimble", name: "Rusty Mail",
    effects: [{ target: "armor.base", base: "6 + min(dex, 2)", when: "equipped" }, { target: "wounds.max", add: 1, when: "carried and not equipped(shield)" }] });
  expect(lintDocument(item, reg)).toEqual([]);
  const msgs = lintDocument(content({ effects: [{ target: "wounds.max", add: 1, when: "equipped" }] }), reg).map((d) => d.message).join("\n");
  expect(msgs).toMatch(/equipped.*item/);
});

test("handlers are removed from the format on every document type", () => {
  const ev = doc("ev2.md", { id: "nimble.system.events2", type: "events", system: "nimble", name: "Events", events: [{ id: "full-hp" }], handlers: { damage: [] } });
  expect(lintDocument(ev, reg)[0].message).toMatch(/handlers.*removed/);
  expect(lintDocument(content({ handlers: {} }), reg)[0].message).toMatch(/handlers.*removed/);
});

test("refresh may not name the removed verbs (damage, heal, spend, restore)", () => {
  const regR = buildRegistry([...base, content({ resources: [{ id: "x", refresh: [] }] })]).registry;
  expect(lintDocument(content({ resources: [{ id: "x", refresh: [{ on: "damage", to: "max" }] }] }), regR)[0].message).toMatch(/unknown event "damage"/);
});

test("a lookup {by, rows} is a valid value for any op and for a variable formula", () => {
  const ok = content({
    effects: [{ target: "wounds.max", add: { by: "level(mage)", rows: { 1: 0, 5: 1, 9: "2" } } }],
    variables: [{ id: "x.dice", name: "x", type: "dice", formula: { by: "level(mage)", rows: { 1: "1d6", 3: "1d8", 7: "2d8" } } }],
  });
  expect(lintDocument(ok, buildRegistry([...base, ok]).registry)).toEqual([]);
  const bad = content({ effects: [
    { target: "wounds.max", add: { by: "levl(mage)", rows: { 1: 0 } } },
    { target: "wounds.max", add: { by: "level(mage)", rows: { low: 0 } } },
    { target: "wounds.max", add: { by: "level(mage)", rows: { 1: "nope" } } },
    { target: "wounds.max", add: { rows: { 1: 0 } } },
  ] });
  const msgs = lintDocument(bad, reg).map((d) => d.message);
  expect(msgs.some((m) => /levl/.test(m))).toBe(true);
  expect(msgs.some((m) => /rows.*"low".*integer/.test(m))).toBe(true);
  expect(msgs.some((m) => /nope/.test(m))).toBe(true);
  expect(msgs.some((m) => /effects\[3\].add.*by/.test(m))).toBe(true);
});

test("effects accept a note; variables accept a description", () => {
  const d = content({
    effects: [{ target: "wounds.max", add: 1, note: "Dwarves are sturdy." }],
    variables: [{ id: "x.y", name: "x", type: "integer", default: 0, description: "A longer explanation shown as a tooltip." }],
  });
  const { registry, diagnostics } = buildRegistry([...base, d]);
  expect(diagnostics).toEqual([]);
  expect(registry.variables.get("x.y")?.description).toBe("A longer explanation shown as a tooltip.");
  expect(lintDocument(d, registry)).toEqual([]);
});
