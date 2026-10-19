import { expect, test } from "vitest";
import { loadDocuments } from "./document-fs.js";
import { lintAll } from "./lint.js";
import { buildRegistry } from "./registry.js";

const lintTree = (dirs: string[]) => {
  const docs = loadDocuments(dirs);
  const { registry, diagnostics } = buildRegistry(docs);
  return { docs, diagnostics: [...diagnostics, ...lintAll(docs, registry)] };
};

test("Nimble template and examples lint clean", () => {
  const { docs, diagnostics } = lintTree(["systems/nimble", "examples/nimble"]);
  expect(diagnostics.map((d) => `${d.path}: ${d.message}`)).toEqual([]);
  expect(docs.length).toBeGreaterThan(100);
});

test("5e insurance template and examples lint clean", () => {
  const { diagnostics } = lintTree(["systems/srd5e-mini", "examples/insurance-5e"]);
  expect(diagnostics.map((d) => `${d.path}: ${d.message}`)).toEqual([]);
});

test("every torture-test note covers only documents that exist", () => {
  const docs = loadDocuments(["systems/nimble", "examples/nimble", "systems/srd5e-mini", "examples/insurance-5e"]);
  const ids = new Set(docs.map((d) => d.frontmatter.id));
  const notes = docs.filter((d) => d.frontmatter.type === "note");
  expect(notes).toHaveLength(15);
  for (const n of notes) for (const c of n.frontmatter.covers as string[]) expect(ids.has(c), `${n.path} covers ${c}`).toBe(true);
});

test("spells: every school a level-5 Mage or Oathsworn knows has its cantrips and tier 1-2 spells", () => {
  const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
  const spells = docs.filter((d) => d.frontmatter.type === "spell");
  const by = (school: string, tier: number) => spells.filter((d) => d.frontmatter.school === school && d.frontmatter.tier === tier);
  expect(by("fire", 0).map((d) => d.frontmatter.name).sort()).toEqual(["Flame Dart", "Heart's Fire"]);
  expect(by("fire", 1).map((d) => d.frontmatter.name)).toEqual(["Ignite"]);
  expect(by("fire", 2).map((d) => d.frontmatter.name)).toEqual(["Enchant Weapon"]);
  for (const s of ["ice", "lightning", "radiant"]) { expect(by(s, 0).length).toBeGreaterThan(0); expect(by(s, 1).length).toBeGreaterThan(0); }
  for (const d of spells) { expect([0, 1, 2]).toContain(d.frontmatter.tier); expect(typeof d.frontmatter.actions).toBe("number"); }
  expect(docs.find((d) => d.frontmatter.id === "nimble.system.creation")!.frontmatter.stat_arrays).toHaveLength(3);
});
