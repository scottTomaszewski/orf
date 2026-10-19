import { addValues, average, bool, formatValue, int, scaleValue, ValueError, type Value } from "./expr/value.js";
import type { Diagnostic, VariableDef } from "./registry.js";

export type Op = "base" | "add" | "mul" | "at_least" | "at_most" | "set";

export interface Contribution {
  op: Op;
  value: Value;
  /** Stacking group; the policy groups by it. */
  source: string;
  /** Document id (or "<formula>", "creation", "levels"). */
  origin: string;
  note?: string;
  whenText?: string;
  /** File the contribution came from; used for diagnostics. */
  path?: string;
}

export interface Provenance {
  /** Contributions that took part in the fold, in fold order. */
  contributions: Contribution[];
  /** Everything a `set` overrode. */
  shadowed: Contribution[];
  /** Removed by the stacking policy. */
  dropped: Contribution[];
  usedDefault: boolean;
}

export interface FoldResult { value: Value; provenance: Provenance; diagnostics: Diagnostic[] }

const rank = (v: Value): number => (v.kind === "bool" ? (v.value ? 1 : 0) : average(v));

function defaultValue(def: VariableDef): Value {
  if (def.type === "boolean") return bool(def.default === true);
  if (typeof def.default === "number") return int(def.default);
  return int(0);
}

function applyRounding(v: Value, def: VariableDef): Value {
  if (v.kind !== "int") return v;
  switch (def.rounding ?? "floor") {
    case "floor": return int(Math.floor(v.value));
    case "ceil": return int(Math.ceil(v.value));
    case "round": return int(Math.round(v.value));
    case "none": return v;
  }
}

/** Within one source, keep only the largest contribution per op. */
function stack(contribs: Contribution[], policy: "highest" | "sum"): { kept: Contribution[]; dropped: Contribution[] } {
  if (policy === "sum") return { kept: contribs, dropped: [] };
  const best = new Map<string, Contribution>();
  const dropped: Contribution[] = [];
  for (const c of contribs) {
    const k = `${c.source}\u0000${c.op}`;
    const prev = best.get(k);
    if (!prev) { best.set(k, c); continue; }
    if (rank(c.value) > rank(prev.value)) { dropped.push(prev); best.set(k, c); } else dropped.push(c);
  }
  return { kept: contribs.filter((c) => !dropped.includes(c)), dropped };
}

export function fold(def: VariableDef, contributions: Contribution[], opts: { stacking?: "highest" | "sum" } = {}): FoldResult {
  const diagnostics: Diagnostic[] = [];
  const { kept, dropped } = stack(contributions, opts.stacking ?? "highest");
  const by = (op: Op) => kept.filter((c) => c.op === op);
  const sets = by("set");
  const nonSet = kept.filter((c) => c.op !== "set");

  if (sets.length > 0) {
    const winner = sets.reduce((a, b) => (rank(b.value) > rank(a.value) ? b : a));
    const losers = [...nonSet, ...sets.filter((s) => s !== winner)];
    if (losers.length > 0) {
      diagnostics.push({ path: winner.path ?? def.declaredIn, severity: "warning", message: `set ${formatValue(winner.value)} on ${def.id} from ${winner.origin} shadows: ${losers.map((c) => `${c.op} ${formatValue(c.value)} from ${c.origin}`).join(", ")}` });
    }
    return { value: applyRounding(winner.value, def), provenance: { contributions: [winner], shadowed: [...nonSet, ...sets.filter((s) => s !== winner)], dropped, usedDefault: false }, diagnostics };
  }

  if (kept.length === 0) {
    return { value: defaultValue(def), provenance: { contributions: [], shadowed: [], dropped, usedDefault: true }, diagnostics };
  }

  if (def.type === "boolean") {
    // booleans accept only `set`; anything else is a lint error upstream, fall back to default
    return { value: defaultValue(def), provenance: { contributions: [], shadowed: [], dropped, usedDefault: true }, diagnostics };
  }

  // The default is the base when nothing contributes a base (speed 6 with a gnome's add -1 = 5).
  const bases = by("base");
  const best = bases.length > 0 ? bases.reduce((a, b) => (rank(b.value) > rank(a.value) ? b : a)) : undefined;
  let value: Value = best ? best.value : defaultValue(def);
  const used: Contribution[] = best ? [best] : [];
  const bad = (c: Contribution, why: string) => diagnostics.push({ path: c.path ?? def.declaredIn, message: `${c.op} ${formatValue(c.value)} on ${def.id} from ${c.origin}: ${why}` });
  for (const c of by("add")) {
    try { value = addValues(value, c.value); used.push(c); } catch (e) { if (e instanceof ValueError) bad(c, e.message); else throw e; }
  }
  for (const c of by("mul")) {
    if (c.value.kind !== "int") { bad(c, "mul must be an integer"); continue; }
    try { value = scaleValue(value, c.value.value); used.push(c); } catch (e) { if (e instanceof ValueError) bad(c, e.message); else throw e; }
  }
  const floors = by("at_least"), ceilings = by("at_most");
  if (floors.length > 0 || ceilings.length > 0) {
    if (value.kind !== "int") diagnostics.push({ path: def.declaredIn, message: `at_least/at_most on ${def.id} need an integer value, got dice` });
    else {
      let n = value.value;
      for (const c of floors) { if (c.value.kind === "int") n = Math.max(n, c.value.value); used.push(c); }
      for (const c of ceilings) { if (c.value.kind === "int") n = Math.min(n, c.value.value); used.push(c); }
      value = int(n);
    }
  }
  return { value: applyRounding(value, def), provenance: { contributions: used, shadowed: [], dropped, usedDefault: false }, diagnostics };
}
