import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
import { buildRegistry } from "./registry.js";
import { assembleCharacter } from "./character.js";

const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;

test("Pip attaches ancestry, background, class, levels 1-4, grants, picks, subclass, equipment", () => {
  const a = assembleCharacter(pip, registry, byId);
  const ids = a.attachments.map((x) => String(x.doc.frontmatter.id));
  for (const id of ["nimble.ancestries.gnome", "nimble.backgrounds.wild-one", "nimble.classes.mage", "nimble.classes.mage.level-1", "nimble.classes.mage.level-4",
    "nimble.features.mage.mana", "nimble.features.mage.elemental-spellcasting", "nimble.spell-schools.fire", "nimble.subclasses.mage.control",
    "nimble.features.mage.echo-casting", "nimble.items.armor.adventurers-garb", "nimble.items.weapons.staff"]) expect(ids).toContain(id);
  expect(ids).not.toContain("nimble.classes.mage.level-5");
  expect(a.classLevels.get("mage")).toBe(4);
  const bump = a.attachments.find((x) => x.choice === "int")!;
  expect(bump.effectOverride).toEqual({ target: "int", add: 1 });
  expect(a.attachments.find((x) => x.via === "equipment")!.item).toEqual({ equipped: true, carried: true });
  expect(a.diagnostics).toEqual([]);
});
test("unknown equipment ids are diagnostics; requirements are left to the engine", () => {
  const ch = { ...pip, frontmatter: { ...pip.frontmatter, equipment: [{ id: "nimble.items.armor.half-plate", equipped: true }, { id: "x.nope", equipped: false }] } };
  const a = assembleCharacter(ch, registry, byId);
  expect(a.attachments.find((x) => String(x.doc.frontmatter.id) === "nimble.items.armor.half-plate")!.item).toEqual({ equipped: true, carried: true });
  const msgs = a.diagnostics.map((d) => d.message).join("\n");
  expect(msgs).toMatch(/x\.nope/);
});
