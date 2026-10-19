import { expect, test } from "vitest";
import { evaluateText, type Env } from "./evaluate.js";
import { int, bool, dice, formatValue, average } from "./value.js";

const env = (vars: Record<string, ReturnType<typeof int>>, extra: Partial<Env> = {}): Env => ({ lookup: (n) => vars[n], ...extra });
const V = { dex: int(2), str: int(-1), level: int(4), wil: int(0) };

test("arithmetic with floor division", () => {
  expect(evaluateText("(2 + 3) * 2 - 1", env(V))).toEqual(int(9));
  expect(evaluateText("7 / 2", env(V))).toEqual(int(3));
  expect(evaluateText("-7 / 2", env(V))).toEqual(int(-4));
  expect(evaluateText("7 / 2", env(V, { rounding: "ceil" }))).toEqual(int(4));
});
test("identifiers and comparison and logic", () => {
  expect(evaluateText("dex >= 2 and not (str > 0)", env(V))).toEqual(bool(true));
  expect(evaluateText("level == 4 or false", env(V))).toEqual(bool(true));
  expect(() => evaluateText("dex and true", env(V))).toThrow(/boolean/);
  expect(() => evaluateText("nope + 1", env(V))).toThrow(/unknown identifier "nope"/);
});
test("functions", () => {
  expect(evaluateText("min(dex + 3, 12)", env(V))).toEqual(int(5));
  expect(evaluateText("max(dex, 0, str)", env(V))).toEqual(int(2));
  expect(evaluateText("if(level >= 2, (max(dex, 0) * 3) + level, 0)", env(V))).toEqual(int(10));
  expect(evaluateText("abs(str)", env(V))).toEqual(int(1));
  expect(() => evaluateText("max(1)", env(V))).toThrow(/at least two/);
});
test("dice stay symbolic and fold with constants", () => {
  expect(formatValue(evaluateText("1d8 + str", env(V)))).toBe("1d8 - 1");
  expect(formatValue(evaluateText("2d6 + 1d6 + 2", env(V)))).toBe("3d6 + 2");
  expect(formatValue(evaluateText("dice(wil + 2, 4)", env(V)))).toBe("2d4");
  expect(evaluateText("dice(wil, 4)", env(V))).toEqual(int(0));
  expect(formatValue(evaluateText("wil d8 + 1", env({ ...V, wil: int(3) })))).toBe("3d8 + 1");
  expect(formatValue(evaluateText("2 * (1d6 + 1)", env(V)))).toBe("2d6 + 2");
  expect(average(dice(2, 8))).toBe(9);
  expect(() => evaluateText("1d6 > 3", env(V))).toThrow(/compare dice/);
  expect(() => evaluateText("1d6 / 2", env(V))).toThrow(/divide dice/);
});
test("predicates receive identifier args as text; table goes through env.call", () => {
  const calls: unknown[] = [];
  const e = env(V, { predicates: new Set(["level"]), call: (name, args) => { calls.push([name, args]); return name === "level" ? int(4) : int(50); } });
  expect(evaluateText("level(mage) >= 2", e)).toEqual(bool(true));
  expect(calls[0]).toEqual(["level", [{ kind: "text", value: "mage" }]]);
  expect(evaluateText('table("nimble.tables.starting-gold", level, "gold")', e)).toEqual(int(50));
  expect(() => evaluateText("bogus(1)", env(V))).toThrow(/unknown function "bogus"/);
});
test("if is lazy and typed alike", () => {
  expect(evaluateText("if(true, 1, nope)", env(V))).toEqual(int(1));
  expect(() => evaluateText("if(true, 1, false)", env(V))).toThrow(/same type/);
});
