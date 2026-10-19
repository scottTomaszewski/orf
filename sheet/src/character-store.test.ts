import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { evaluateCharacter } from "../../src/engine.js";
import { fromShareLink, localCharacterStore, parseCharacterText, serializeCharacter, toShareLink } from "./character-store.js";
import { realContent } from "./test-content.js";

const pipText = readFileSync(join(__dirname, "../../examples/nimble/characters/pip.md"), "utf8");
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return { get length() { return m.size; }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null, key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => { m.delete(k); }, setItem: (k, v) => { m.set(k, String(v)); } };
}

test("save/list/get/remove round trip with a summary line", () => {
  const st = localCharacterStore(memoryStorage());
  const pip = parseCharacterText(pipText);
  st.save(pip);
  expect(st.list().map((c) => ({ id: c.id, name: c.name, summary: c.summary }))).toEqual([{ id: "scott.characters.pip", name: "Pip", summary: "Mage 4 · Gnome" }]);
  expect(st.get("scott.characters.pip")!.frontmatter.name).toBe("Pip");
  st.remove("scott.characters.pip");
  expect(st.list()).toEqual([]);
});
test("serialize(parse(text)) is stable and keeps the body", () => {
  const once = serializeCharacter(parseCharacterText(pipText));
  expect(serializeCharacter(parseCharacterText(once))).toBe(once);
  expect(once.startsWith("---\nid: scott.characters.pip\ntype: character\nsystem: nimble\nname: Pip\n")).toBe(true);
  expect(once).toContain("Sample character");
});
test("share link round-trips a character; bad payloads throw readable errors", () => {
  const pip = parseCharacterText(pipText);
  const link = toShareLink(pip, "https://example.test/sheet/");
  expect(link.startsWith("https://example.test/sheet/#/share/")).toBe(true);
  expect(fromShareLink(link.slice(link.indexOf("#"))).frontmatter.id).toBe("scott.characters.pip");
  expect(() => fromShareLink("#/share/%%%not-base64")).toThrow(/share link/i);
  expect(() => fromShareLink("#/share/" + btoa("---\nid: x.f\ntype: feature\nsystem: nimble\nname: f\n---\n"))).toThrow(/not a character/i);
  expect(() => parseCharacterText("---\nid: x\n---\n")).toThrow(/not a character/i);
});
test("a stored character whose feature was deleted still loads and evaluates with a diagnostic", () => {
  const st = localCharacterStore(memoryStorage());
  const pip = parseCharacterText(pipText);
  st.save({ ...pip, frontmatter: { ...pip.frontmatter, features: ["nimble.features.mage.gone"] } });
  const doc = st.get("scott.characters.pip")!;
  const c = realContent();
  const s = evaluateCharacter(doc, c.registry, c.docs);
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/gone/);
  expect((s.value("hp.max") as { value: number }).value).toBe(25);
});
