import { expect, test } from "vitest";
import { loadDocuments } from "./document-fs.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { applyLevelUp, levelUpPrompts, spellsKnown } from "./sheet-model.js";
import * as nimble from "./systems/nimble.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;

test("I3: an incomplete skill move is ignored; a complete one moves a point", () => {
  const p = levelUpPrompts(pip, registry, byId)!;
  const a = applyLevelUp(pip, p, { hp: 5, picks: {}, skill: "stealth", moveSkill: { from: "arcana", to: "" } });
  expect(a.frontmatter.skills).toEqual({ arcana: 3, lore: 2, examination: 1, perception: 1, stealth: 1 });
  const b = applyLevelUp(pip, p, { hp: 5, picks: {}, skill: "stealth", moveSkill: { from: "arcana", to: "lore" } });
  expect(b.frontmatter.skills).toEqual({ arcana: 2, lore: 3, examination: 1, perception: 1, stealth: 1 });
});
test("I4: gainWounds adds Wounds, fires gain-wound, and reports death at max", () => {
  const sheet = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, ancestry: "nimble.ancestries.dragonborn" } }, registry, byId);
  const r = nimble.gainWounds({ sheet, state: { hp: 10, wounds: 1, "dragonborn.breath": 0 } }, 1);
  expect(r.state).toMatchObject({ wounds: 2, "dragonborn.breath": 1 });
  expect(r.fired).toEqual(["gain-wound"]);
  expect(nimble.gainWounds({ sheet, state: { hp: 10, wounds: 5 } }, 1).log.join()).toMatch(/dead/i);
});
test("I11: Pip knows the Fire utility spells (Elemental Mastery pick) but not Ice's", () => {
  const s = evaluateCharacter(pip, registry, byId);
  const known = spellsKnown(s, byId);
  const utility = known.filter((k) => k.spell.frontmatter.utility === true).map((k) => String(k.spell.frontmatter.name)).sort();
  expect(utility).toEqual(["Fire Step", "Firebrand", "Kindle"]);
  expect(known.filter((k) => !k.spell.frontmatter.utility).map((k) => String(k.spell.frontmatter.name))).toContain("Ignite");
  expect(s.attachments.some((a) => String(a.doc.frontmatter.id) === "nimble.spell-utility.fire")).toBe(true);
});
