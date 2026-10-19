import { expect, test } from "vitest";
import { DocumentError, parseDocument } from "./document.js";

test("parses frontmatter and body", () => {
  const d = parseDocument("---\nid: a.b\ntype: spell\n---\nHello\n", "x.md");
  expect(d.frontmatter).toEqual({ id: "a.b", type: "spell" });
  expect(d.body).toBe("Hello\n");
  expect(d.bodyStartLine).toBe(5);
});

test("a horizontal rule in the body is body, not frontmatter", () => {
  const d = parseDocument("---\nid: a.b\n---\nabove\n\n---\n\nbelow\n", "x.md");
  expect(d.body).toContain("---");
  expect(d.frontmatter).toEqual({ id: "a.b" });
});

test("missing frontmatter is a DocumentError naming the path", () => {
  expect(() => parseDocument("just text", "y.md")).toThrow(/y\.md.*frontmatter/);
});

test("invalid YAML is a DocumentError with a line", () => {
  expect(() => parseDocument("---\nid: [\n---\n", "z.md")).toThrow(DocumentError);
});

test("empty frontmatter block is an empty object", () => {
  const d = parseDocument("---\n---\nbody\n", "e.md");
  expect(d.frontmatter).toEqual({});
  expect(d.bodyStartLine).toBe(3);
});

test("loadDocumentsLenient collects per-file errors instead of throwing", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { loadDocumentsLenient } = await import("./document.js");
  const dir = mkdtempSync(join(tmpdir(), "orf-"));
  writeFileSync(join(dir, "a.md"), "---\nid: a.b\n---\nok\n");
  writeFileSync(join(dir, "b.md"), "no frontmatter\n");
  const { docs, errors } = loadDocumentsLenient([dir]);
  expect(docs).toHaveLength(1);
  expect(errors).toHaveLength(1);
  expect(errors[0].path).toMatch(/b\.md$/);
});
