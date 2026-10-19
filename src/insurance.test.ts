import { expect, test } from "vitest";
import { loadDocuments, type Document } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { formatValue } from "./expr/value.js";

const docs = loadDocuments(["systems/srd5e-mini", "examples/insurance-5e"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const monk = (fm: Record<string, unknown>): Document => ({ path: "monk.md", body: "", bodyStartLine: 1, frontmatter: {
  id: "x.characters.monk", type: "character", system: "srd5e", name: "Monk",
  stats: {}, state: {}, features: ["srd5e.features.monk.unarmored-defense"], ...fm } });
// 5e stats are not Nimble stats: this mini template reads dex.mod / wis.mod from state-free contributions, so a feature supplies them
const mods: Document = { path: "mods.md", body: "", bodyStartLine: 1, frontmatter: { id: "x.mods", type: "feature", system: "srd5e", name: "mods",
  effects: [{ target: "dex.mod", add: 2 }, { target: "wis.mod", add: 3 }] } };
const byId2 = new Map(byId); byId2.set("x.mods", mods);
const reg2 = buildRegistry([...docs, mods]).registry;
const ac = (fm: Record<string, unknown>) => (evaluateCharacter(monk({ features: ["srd5e.features.monk.unarmored-defense", "x.mods"], ...fm }), reg2, byId2).value("ac") as { value: number }).value;

test("competing bases: chain mail equipped beats unarmored defense; unarmored defense beats mage armor when higher", () => {
  expect(ac({ equipment: [{ id: "srd5e.items.armor.chain-mail", equipped: true }] })).toBe(16);
  expect(ac({ spells: ["srd5e.spells.mage-armor"] })).toBe(15);               // 10+2+3 vs 13+2
  expect(ac({ spells: ["srd5e.spells.mage-armor"], features: ["x.mods"] })).toBe(15);   // mage armor 15 vs unarmored 12
  expect(ac({ equipment: [{ id: "srd5e.items.armor.chain-mail", equipped: false }] })).toBe(15);
});
test("bless cast twice does not stack (same source, highest)", () => {
  const twice: Document = { ...byId.get("srd5e.spells.bless")!, frontmatter: { ...byId.get("srd5e.spells.bless")!.frontmatter, id: "srd5e.spells.bless-again" } };
  const byId3 = new Map(byId2); byId3.set("srd5e.spells.bless-again", twice);
  const reg3 = buildRegistry([...docs, mods, twice]).registry;
  const s = evaluateCharacter(monk({ spells: ["srd5e.spells.bless", "srd5e.spells.bless-again"] }), reg3, byId3);
  expect(formatValue(s.value("save.wis"))).toBe("1d4");
  expect(s.variables.get("save.wis")!.provenance.dropped).toHaveLength(1);
});
