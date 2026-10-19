import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { listDocumentFiles } from "./document-fs.js";
import { evaluateCharacter } from "./engine.js";
import { loadContent, memoryHomebrewStore, type ContentFile } from "./content-store.js";

const bundle = { files: listDocumentFiles(["systems/nimble", "examples/nimble"]).map((path) => ({ path, text: readFileSync(path, "utf8") })) };
const ratfolk: ContentFile = { path: "homebrew/ratfolk.md", origin: "homebrew", text: `---
id: nimble.ancestries.ratfolk
type: ancestry
system: nimble
name: Ratfolk
size: small
effects:
  - {target: wounds.max, add: 1, note: "Hard to kill."}
---
Ratfolk are hard to kill (+1 max Wounds).
` };

test("loadContent builds the registry from the bundle", () => {
  const l = loadContent(bundle, []);
  expect(l.docs.size).toBe(141);
  expect(l.registry.variables.size).toBe(74);
  expect(l.diagnostics).toEqual([]);
});
test("a homebrew ancestry overlays the bundle; its +1 wounds.max shows on Pip with provenance", () => {
  const l = loadContent(bundle, [ratfolk]);
  expect(l.docs.has("nimble.ancestries.ratfolk")).toBe(true);
  expect(l.files.find((f) => f.path === "homebrew/ratfolk.md")!.origin).toBe("homebrew");
  const pip = l.docs.get("scott.characters.pip")!;
  const s = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, ancestry: "nimble.ancestries.ratfolk" } }, l.registry, l.docs);
  expect((s.value("wounds.max") as { value: number }).value).toBe(7);
  expect(s.variables.get("wounds.max")!.provenance.contributions.map((c) => c.origin)).toContain("nimble.ancestries.ratfolk");
});
test("a homebrew file with invalid YAML yields a diagnostic naming the file and is dropped; everything else loads", () => {
  const bad: ContentFile = { path: "homebrew/bad.md", origin: "homebrew", text: "---\nid: x.bad\nname: \"Creative\" Accounting\n---\n" };
  const l = loadContent(bundle, [ratfolk, bad]);
  expect(l.docs.has("nimble.ancestries.ratfolk")).toBe(true);
  expect(l.docs.has("x.bad")).toBe(false);
  expect(l.diagnostics.map((d) => d.path)).toContain("homebrew/bad.md");
});
test("a homebrew file that fails lint (unknown target) yields a diagnostic and the doc stays loaded", () => {
  const lintBad: ContentFile = { path: "homebrew/lintbad.md", origin: "homebrew", text: "---\nid: nimble.ancestries.lintbad\ntype: ancestry\nsystem: nimble\nname: Lintbad\neffects:\n  - {target: wound.max, add: 1}\n---\n" };
  const l = loadContent(bundle, [lintBad]);
  expect(l.docs.has("nimble.ancestries.lintbad")).toBe(true);
  expect(l.diagnostics.map((d) => d.message).join()).toMatch(/wound\.max/);
});
test("a homebrew file with the same path as a bundle file replaces it", () => {
  const gnomePath = bundle.files.find((f) => f.path.endsWith("ancestries/gnome.md"))!.path;
  const l = loadContent(bundle, [{ path: gnomePath, origin: "homebrew", text: bundle.files.find((f) => f.path === gnomePath)!.text.replace("add: -1", "add: -2") }]);
  expect(l.docs.get("nimble.ancestries.gnome")!.frontmatter.effects).toEqual([{ target: "speed", add: -2 }]);
  expect(l.files.filter((f) => f.path === gnomePath)).toHaveLength(1);
});
test("memoryHomebrewStore put/list/remove round-trips", async () => {
  const st = memoryHomebrewStore();
  await st.put([ratfolk]);
  expect((await st.list()).map((f) => f.path)).toEqual(["homebrew/ratfolk.md"]);
  await st.remove("homebrew/ratfolk.md");
  expect(await st.list()).toEqual([]);
});
