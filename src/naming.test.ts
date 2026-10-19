import { execSync } from "node:child_process";
import { expect, test } from "vitest";

/** The name is ORF (Open Rules Format); the sheet is ORF Sheet for Nimble. Only the design doc's history may mention the placeholders. */
test("no naming placeholders remain", () => {
  const root = new URL("..", import.meta.url).pathname;
  const cmd = `grep -rIl --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.worktrees --exclude-dir=.superpowers --exclude-dir=.git -e "\\[Product Name\\]" -e "placeholder name" -e "Placeholder name" -e "Nimble Sheet" . || true`;
  const hits = execSync(cmd, { cwd: root }).toString().trim().split("\n").filter(Boolean);
  expect(hits.filter((p) => !p.startsWith("./docs/superpowers/") && p !== "./src/naming.test.ts")).toEqual([]);
});
