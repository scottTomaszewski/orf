import { describe, expect, test } from "vitest";
import { blankDocument, contentTypes, documentText, lintDraft, momentSuggestions, suggestedId, targetSuggestions } from "./authoring.js";
import { listDocumentFiles } from "./document-fs.js";
import { parseDocument } from "./document.js";
import { loadContent, type Loaded } from "./content-store.js";
import { readFileSync } from "node:fs";

function loaded(homebrew: { path: string; text: string }[] = []): Loaded {
  const files = listDocumentFiles(["systems/nimble", "examples/nimble"]).map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
  return loadContent({ files }, homebrew.map((f) => ({ ...f, origin: "homebrew" as const })));
}
const RATFOLK = "---\nid: nimble.ancestries.ratfolk\ntype: ancestry\nsystem: nimble\nname: Ratfolk\neffects:\n  - {target: wounds.max, add: 1}\n---\nHard to kill.\n";

describe("content types", () => {
  test("come from the content-types document with suggested properties", () => {
    const types = contentTypes(loaded().docs);
    expect(types.find((t) => t.id === "ancestry")).toEqual({ id: "ancestry", properties: ["size", "speed"] });
    expect(types.map((t) => t.id)).toContain("item");
  });
  test("fall back to the distinct types seen", () => {
    const docs = new Map([["x.a.b", parseDocument("---\nid: x.a.b\ntype: boon\nsystem: x\nname: A\n---\n", "a.md")]]);
    expect(contentTypes(docs)).toEqual([{ id: "boon", properties: [] }]);
  });
});

describe("blank documents and text", () => {
  test("blankDocument has the five keys, the suggested properties, and no body", () => {
    expect(blankDocument("ancestry", "nimble", ["size", "speed"])).toEqual({ frontmatter: { id: "", type: "ancestry", system: "nimble", name: "", size: "", speed: "", effects: [] }, body: "" });
  });
  test("documentText writes effects in flow style, drops empty optional properties, and round-trips", () => {
    const fm = { id: "nimble.ancestries.ratfolk", type: "ancestry", system: "nimble", name: "Ratfolk", size: "", speed: "", rarity: undefined, effects: [{ target: "wounds.max", add: 1, note: "Hard to kill." }] };
    const text = documentText(fm, "Hard to kill.");
    expect(text).toContain("  - {target: wounds.max, add: 1, note: Hard to kill.}\n");
    expect(text).not.toContain("size");
    expect(text.startsWith("---\nid: nimble.ancestries.ratfolk\n")).toBe(true);
    const back = parseDocument(text, "x.md");
    expect(back.frontmatter.effects).toEqual([{ target: "wounds.max", add: 1, note: "Hard to kill." }]);
    expect(back.body.trim()).toBe("Hard to kill.");
  });
  test("documentText keeps required keys even when empty and quotes expression values", () => {
    const text = documentText({ id: "", type: "item", system: "nimble", name: "", effects: [{ target: "armor.base", base: "2 + dex", when: "equipped" }] }, "");
    expect(text).toContain("name: \"\"\n");
    expect(parseDocument(text, "x.md").frontmatter.effects).toEqual([{ target: "armor.base", base: "2 + dex", when: "equipped" }]);
  });
});

describe("suggestedId", () => {
  const docs = loaded().docs;
  test("uses the id segment existing documents of that type use", () => {
    expect(suggestedId("ancestry", "Ratfolk", "nimble", docs)).toBe("nimble.ancestries.ratfolk");
    expect(suggestedId("weapon", "War Pick!", "nimble", docs)).toBe("nimble.items.weapons.war-pick");
  });
  test("falls back to the pluralised type", () => {
    expect(suggestedId("boon", "Lucky", "nimble", docs)).toBe("nimble.boons.lucky");
  });
});

describe("lintDraft", () => {
  test("a clean draft has no diagnostics and returns the document", () => {
    const r = lintDraft(RATFOLK, "homebrew/ancestry/ratfolk.md", loaded());
    expect(r.diagnostics).toEqual([]);
    expect(r.doc?.frontmatter.name).toBe("Ratfolk");
  });
  test("an unknown target is named", () => {
    const r = lintDraft(RATFOLK.replace("wounds.max", "wound.max"), "homebrew/x.md", loaded());
    expect(r.diagnostics.map((d) => d.message).join("\n")).toMatch(/wound\.max/);
  });
  test("a duplicate id against the bundle is reported", () => {
    const r = lintDraft(RATFOLK.replace("nimble.ancestries.ratfolk", "nimble.ancestries.dwarf"), "homebrew/x.md", loaded());
    expect(r.diagnostics.map((d) => d.message).join("\n")).toMatch(/duplicate document id "nimble.ancestries.dwarf"/);
  });
  test("broken YAML yields one diagnostic with a line and no document", () => {
    const r = lintDraft("---\nid: x.y\nname: \"a\" b\n---\n", "homebrew/x.md", loaded());
    expect(r.doc).toBeUndefined();
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].line).toBeTypeOf("number");
  });
  test("editing an existing homebrew file does not collide with itself", () => {
    const r = lintDraft(RATFOLK, "homebrew/ratfolk.md", loaded([{ path: "homebrew/ratfolk.md", text: RATFOLK }]));
    expect(r.diagnostics).toEqual([]);
  });
  test("only diagnostics about the draft are returned", () => {
    const r = lintDraft(RATFOLK, "homebrew/ratfolk.md", loaded([{ path: "homebrew/broken.md", text: "---\nid: x\nname: \"a\" b\n---\n" }]));
    expect(r.diagnostics).toEqual([]);
  });
});

describe("suggestions", () => {
  test("targets list declared variables with names and types, sorted", () => {
    const t = targetSuggestions(loaded().registry);
    expect(t.find((x) => x.id === "wounds.max")).toEqual({ id: "wounds.max", name: "your maximum Wounds", type: "integer" });
    expect(t.map((x) => x.id)).toEqual([...t.map((x) => x.id)].sort());
  });
  test("moments include the built-ins and the system's own", () => {
    const m = momentSuggestions(loaded().registry);
    expect(m).toContain("safe-rest");
    expect(m).toContain("gain-wound");
  });
});
