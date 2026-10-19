import { expect, test } from "vitest";
import { parse, ParseError } from "./parser.js";

test("precedence: or < and < not < compare < add < mul < unary", () => {
  const e = parse("not a > 1 + 2 * 3 or b and c");
  expect(e).toMatchObject({ kind: "binary", op: "or",
    left: { kind: "unary", op: "not", arg: { kind: "binary", op: ">", right: { kind: "binary", op: "+", right: { kind: "binary", op: "*" } } } },
    right: { kind: "binary", op: "and" } });
});
test("dice literals with keep/drop; bare d8", () => {
  expect(parse("4d6kh3")).toMatchObject({ kind: "dice", count: 4, sides: 6, keep: { mode: "kh", n: 3 } });
  expect(parse("d8")).toMatchObject({ kind: "dice", count: 1, sides: 8 });
});
test("identifiers: dotted, alias, this., .current; keywords are not identifiers", () => {
  expect(parse("wounds.max")).toMatchObject({ kind: "ident", name: "wounds.max" });
  expect(parse("DEX")).toMatchObject({ kind: "ident", name: "DEX" });
  expect(parse("this.strength_requirement")).toMatchObject({ kind: "ident", name: "this.strength_requirement" });
  expect(parse("nothing")).toMatchObject({ kind: "ident", name: "nothing" });
  expect(parse("true_damage")).toMatchObject({ kind: "ident", name: "true_damage" });
  expect(parse("true")).toMatchObject({ kind: "bool", value: true });
});
test("calls with strings and nested args; dice sugar", () => {
  expect(parse('table("nimble.tables.starting-gold", level, "gold")')).toMatchObject({ kind: "call", name: "table", args: [{ kind: "string" }, { kind: "ident" }, { kind: "string" }] });
  expect(parse("if(level(mage) >= 2, (max(int, 0) * 3) + level, 0)").kind).toBe("call");
  expect(parse("wil d8")).toMatchObject({ kind: "diceSugar", count: { kind: "ident", name: "wil" }, sides: 8 });
});
test("unary minus and parentheses", () => {
  expect(parse("-(dex + 1)")).toMatchObject({ kind: "unary", op: "-", arg: { kind: "binary", op: "+" } });
});
test("syntax errors carry a position", () => {
  expect(() => parse("1 +")).toThrow(ParseError);
  try { parse("max(1, 2"); } catch (e) { expect((e as ParseError).pos).toBe(8); }
  expect(() => parse("1 2")).toThrow(/unexpected/);
  expect(() => parse("")).toThrow(ParseError);
});
