import { execSync } from "node:child_process";
import { expect, test } from "vitest";

/** The name is ORF (Open Rules Format); the sheet is ORF Sheet for Nimble. Only the design doc's history may mention the placeholders. Scans tracked files only, so stale generated bundles cannot trip it. */
test("no naming placeholders remain", () => {
  const root = new URL("..", import.meta.url).pathname;
  const cmd = `git grep -Il -e "\\[Product Name\\]" -e "placeholder name" -e "Placeholder name" -e "Nimble Sheet" -- . || true`;
  const hits = execSync(cmd, { cwd: root }).toString().trim().split("\n").filter(Boolean);
  expect(hits.filter((p) => !p.startsWith("docs/superpowers/") && p !== "src/naming.test.ts")).toEqual([]);
});
