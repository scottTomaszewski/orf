import { expect, test } from "vitest";
import { fold, type Contribution } from "./fold.js";
import { dice, int, bool, formatValue } from "./expr/value.js";
import type { VariableDef } from "./registry.js";

const def = (over: Partial<VariableDef> = {}): VariableDef => ({ id: "armor.base", name: "Armor", type: "integer", default: 0, declaredIn: "x", ...over });
const c = (op: Contribution["op"], value: ReturnType<typeof int>, source = "s", origin = "d"): Contribution => ({ op, value, source, origin });

test("highest base wins, adds sum, mul after adds, clamps, floor rounding", () => {
  const r = fold(def(), [c("base", int(2), "unarmored"), c("base", int(9), "armor"), c("add", int(2), "shield"), c("add", int(1), "ring"), c("mul", int(2), "iron")]);
  expect(r.value).toEqual(int(24));
  expect(fold(def(), [c("base", int(5)), c("at_most", int(3))]).value).toEqual(int(3));
  expect(fold(def(), [c("base", int(5)), c("at_least", int(10))]).value).toEqual(int(10));
});
test("empty = default with usedDefault; formula-less boolean default", () => {
  const r = fold(def({ default: 6 }), []);
  expect(r.value).toEqual(int(6)); expect(r.provenance.usedDefault).toBe(true);
  expect(fold(def({ type: "boolean", default: false }), []).value).toEqual(bool(false));
});
test("same-source highest drops duplicates; sum keeps them", () => {
  const two = [c("add", int(1), "bless", "cast1"), c("add", int(2), "bless", "cast2")];
  const r = fold(def(), two);
  expect(r.value).toEqual(int(2)); expect(r.provenance.dropped.map((x) => x.origin)).toEqual(["cast1"]);
  expect(fold(def(), two, { stacking: "sum" }).value).toEqual(int(3));
});
test("set overrides and reports what it shadowed", () => {
  const r = fold(def({ ops: ["add", "set"] }), [c("add", int(3), "a", "docA"), c("set", int(1), "b", "docB")]);
  expect(r.value).toEqual(int(1));
  expect(r.provenance.shadowed.map((x) => x.origin)).toEqual(["docA"]);
  expect(r.diagnostics[0].message).toMatch(/set.*docB.*shadows.*docA/);
});
test("dice bases compete by average; adds merge; mul scales", () => {
  const r = fold(def({ type: "dice" }), [c("base", dice(1, 6)), c("base", dice(1, 8)), c("add", int(-1)), c("mul", int(2))]);
  expect(formatValue(r.value)).toBe("2d8 - 2");
});
test("rounding ceil applies to the final integer", () => {
  expect(fold(def({ rounding: "ceil" }), [c("base", int(7)), c("mul", int(1))]).value).toEqual(int(7));
});
test("boolean set: true wins over false; no set = default", () => {
  expect(fold(def({ type: "boolean", default: false, ops: ["set"] }), [c("set", bool(false), "a"), c("set", bool(true), "b")]).value).toEqual(bool(true));
});
