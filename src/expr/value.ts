import type { KeepMode } from "./ast.js";

export type DiceTerm = { count: number; sides: number; keep?: { mode: KeepMode; n: number } };
export type Value =
  | { kind: "int"; value: number }
  | { kind: "bool"; value: boolean }
  | { kind: "text"; value: string }
  /** A sum of dice terms plus an integer constant; stays symbolic until a consumer rolls it. */
  | { kind: "dice"; terms: DiceTerm[]; constant: number };

export const int = (n: number): Value => ({ kind: "int", value: n });
export const bool = (b: boolean): Value => ({ kind: "bool", value: b });
export const text = (s: string): Value => ({ kind: "text", value: s });
export function dice(count: number, sides: number, keep?: DiceTerm["keep"]): Value {
  if (count === 0) return int(0);
  return { kind: "dice", terms: [{ count, sides, keep }], constant: 0 };
}

/** Expected value. Keep/drop modifiers are ignored (documented simplification). */
export function average(v: Value): number {
  if (v.kind === "int") return v.value;
  if (v.kind === "dice") return v.terms.reduce((s, t) => s + t.count * (t.sides + 1) / 2, v.constant);
  throw new Error(`no average for a ${v.kind}`);
}

const keepStr = (k?: DiceTerm["keep"]) => (k ? `${k.mode}${k.n}` : "");
export function formatValue(v: Value): string {
  switch (v.kind) {
    case "int": return String(v.value);
    case "bool": return String(v.value);
    case "text": return v.value;
    case "dice": {
      const terms = [...v.terms].sort((a, b) => b.sides - a.sides).map((t) => `${t.count}d${t.sides}${keepStr(t.keep)}`);
      let s = terms.join(" + ");
      if (v.constant > 0) s += ` + ${v.constant}`;
      else if (v.constant < 0) s += ` - ${-v.constant}`;
      return s;
    }
  }
}

function normalize(terms: DiceTerm[], constant: number): Value {
  const merged: DiceTerm[] = [];
  for (const t of terms) {
    if (t.count === 0) continue;
    const same = merged.find((m) => m.sides === t.sides && keepStr(m.keep) === keepStr(t.keep) && !t.keep);
    if (same) same.count += t.count; else merged.push({ ...t });
  }
  return merged.length === 0 ? int(constant) : { kind: "dice", terms: merged, constant };
}

export function addValues(a: Value, b: Value): Value {
  if (a.kind === "int" && b.kind === "int") return int(a.value + b.value);
  if (a.kind === "dice" && b.kind === "int") return normalize(a.terms, a.constant + b.value);
  if (a.kind === "int" && b.kind === "dice") return normalize(b.terms, b.constant + a.value);
  if (a.kind === "dice" && b.kind === "dice") return normalize([...a.terms, ...b.terms], a.constant + b.constant);
  throw new Error(`cannot add ${a.kind} and ${b.kind}`);
}

export function scaleValue(v: Value, k: number): Value {
  if (v.kind === "int") return int(v.value * k);
  if (v.kind === "dice") {
    if (k < 0) throw new Error("cannot multiply dice by a negative number");
    return normalize(v.terms.map((t) => ({ ...t, count: t.count * k })), v.constant * k);
  }
  throw new Error(`cannot multiply a ${v.kind}`);
}
