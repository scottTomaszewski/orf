import { expect, test } from "vitest";
import { extractInlineExpressions, extractReferences } from "./expr-refs.js";

test("extracts expressions with display override and line numbers", () => {
  const xs = extractInlineExpressions("a\n{{ 1d6 + str }} b {{ mana.max | your maximum mana }}\n", 5);
  expect(xs).toEqual([
    { expr: "1d6 + str", line: 6 },
    { expr: "mana.max", display: "your maximum mana", line: 6 },
  ]);
});

test("unbalanced braces throw with line", () => {
  expect(() => extractInlineExpressions("x\n{{ dex\n", 1)).toThrow(/line 2/);
});

test("nested braces throw with line", () => {
  expect(() => extractInlineExpressions("{{ a {{ b }} }}", 1)).toThrow(/line 1/);
});

test("references skip functions, keywords, numbers, dice; calls carry args", () => {
  const r = extractReferences("(max(int, 0) * 3) + level and not equipped(armor) + dice(wil, 8)");
  expect(r.identifiers).toEqual(["int", "level", "armor", "wil"]);
  expect(r.calls).toEqual([
    { name: "max", args: ["int"], strings: [] },
    { name: "equipped", args: ["armor"], strings: [] },
    { name: "dice", args: ["wil"], strings: [] },
  ]);
});

test("dice literals with keep/drop suffixes and quoted strings are not identifiers", () => {
  const r = extractReferences('2d6 + 4d6kh3 + d8 + table("x", level, "gold")');
  expect(r.identifiers).toEqual(["level"]);
  expect(r.calls).toEqual([{ name: "table", args: ["level"], strings: ["x", "gold"] }]);
});
