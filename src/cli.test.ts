import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...dirs: string[]) => {
  try {
    const stdout = execFileSync("npx", ["tsx", "src/cli.ts", ...dirs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, stdout: err.stdout };
  }
};

test("clean fixture dir exits 0 and prints OK with counts", () => {
  const r = run("src/__fixtures__/clean");
  expect(r.code).toBe(0);
  expect(r.stdout).toMatch(/^OK: 3 documents, 3 variables, 1 resources/);
});

test("bad fixture adds an unknown-identifier line and exits 1", () => {
  const r = run("src/__fixtures__/clean", "src/__fixtures__/bad");
  expect(r.code).toBe(1);
  expect(r.stdout).toMatch(/bad\.md:\d+: unknown identifier "wound\.max"/);
});

test("sheet command prints a character's variables with provenance and resources", () => {
  const r = run("sheet", "scott.characters.pip", "systems/nimble", "examples/nimble");
  expect(r.code).toBe(0);
  expect(r.stdout).toMatch(/^armor = 4 /m);
  expect(r.stdout).toMatch(/← base 4 from nimble\.items\.armor\.adventurers-garb/);
  expect(r.stdout).toMatch(/^mana: 6\/13$/m);
});
