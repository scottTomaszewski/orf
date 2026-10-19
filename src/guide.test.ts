import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { loadDocuments } from "./document-fs.js";
import { parseDocument } from "./document.js";
import { lintDocument } from "./lint.js";
import { buildRegistry } from "./registry.js";

/** Every ```markdown block in the creator guide is a real document that lints clean against the Nimble package. */
test("guide examples parse and lint clean", () => {
  const guide = readFileSync("docs/guide/writing-content.md", "utf8");
  const blocks = [...guide.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  expect(blocks.length).toBeGreaterThanOrEqual(3);
  const base = loadDocuments(["systems/nimble", "examples/nimble"]);
  const drafts = blocks.map((b, i) => parseDocument(b, `guide/example-${i}.md`));
  const { registry, diagnostics } = buildRegistry([...base, ...drafts]);
  expect(diagnostics).toEqual([]);
  for (const d of drafts) expect(lintDocument(d, registry)).toEqual([]);
});
