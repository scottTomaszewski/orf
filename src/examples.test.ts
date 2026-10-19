import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
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
