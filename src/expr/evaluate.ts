import type { Expr } from "./ast.js";
import { parse } from "./parser.js";
import { addValues, bool, dice, int, scaleValue, text, average, type Value } from "./value.js";

export class EvalError extends Error {
  constructor(message: string, public pos: number) {
    super(message);
    this.name = "EvalError";
  }
}

export interface Env {
  /** Identifiers (aliases resolved by the caller), this.x, <resource>.current, key, secondary, choice, equipped, carried. */
  lookup(name: string): Value | undefined;
  /** Helpers, predicates, table(). Predicates receive identifier args as text values. */
  call?(name: string, args: Value[], raw: Expr[]): Value | undefined;
  /** Names whose identifier arguments are passed as text, not evaluated. */
  predicates?: Set<string>;
  /** Rounding for `/`; default floor. */
  rounding?: "floor" | "ceil" | "round" | "none";
}

const BUILTINS = new Set(["floor", "ceil", "round", "abs", "max", "min", "if", "dice", "table"]);

export function evaluateText(src: string, env: Env): Value {
  return evaluate(parse(src), env);
}

function needInt(v: Value, what: string, pos: number): number {
  if (v.kind !== "int") throw new EvalError(`${what} needs an integer, got ${v.kind === "dice" ? "dice" : v.kind}`, pos);
  return v.value;
}
function needBool(v: Value, what: string, pos: number): boolean {
  if (v.kind !== "bool") throw new EvalError(`${what} needs boolean operands`, pos);
  return v.value;
}
function roundDiv(a: number, b: number, mode: Env["rounding"]): number {
  const q = a / b;
  switch (mode ?? "floor") {
    case "floor": return Math.floor(q);
    case "ceil": return Math.ceil(q);
    case "round": return Math.round(q);
    case "none": return q;
  }
}

export function evaluate(e: Expr, env: Env): Value {
  switch (e.kind) {
    case "int": return int(e.value);
    case "bool": return bool(e.value);
    case "string": return text(e.value);
    case "dice": return dice(e.count, e.sides, e.keep);
    case "diceSugar": return dice(needInt(evaluate(e.count, env), "dice count", e.pos), e.sides);
    case "ident": {
      const v = env.lookup(e.name);
      if (v === undefined) throw new EvalError(`unknown identifier "${e.name}"`, e.pos);
      return v;
    }
    case "unary": {
      const a = evaluate(e.arg, env);
      if (e.op === "not") return bool(!needBool(a, '"not"', e.pos));
      return scaleValue(a, -1);
    }
    case "binary": return binary(e, env);
    case "call": return call(e, env);
  }
}

function binary(e: Extract<Expr, { kind: "binary" }>, env: Env): Value {
  if (e.op === "and" || e.op === "or") {
    const l = needBool(evaluate(e.left, env), `"${e.op}"`, e.pos);
    if (e.op === "and" && !l) return bool(false);
    if (e.op === "or" && l) return bool(true);
    return bool(needBool(evaluate(e.right, env), `"${e.op}"`, e.pos));
  }
  const l = evaluate(e.left, env);
  const r = evaluate(e.right, env);
  switch (e.op) {
    case "+": return addValues(l, r);
    case "-": return addValues(l, scaleValue(r, -1));
    case "*":
      if (l.kind === "int" && r.kind === "int") return int(l.value * r.value);
      if (l.kind === "int" && r.kind === "dice") return scaleValue(r, l.value);
      if (l.kind === "dice" && r.kind === "int") return scaleValue(l, r.value);
      throw new EvalError(`cannot multiply ${l.kind} by ${r.kind}`, e.pos);
    case "/":
      if (l.kind === "dice" || r.kind === "dice") throw new EvalError("cannot divide dice", e.pos);
      const divisor = needInt(r, "division", e.pos);
      if (divisor === 0) throw new EvalError("division by zero", e.pos);
      return int(roundDiv(needInt(l, "division", e.pos), divisor, env.rounding));
    default: {
      if (l.kind === "dice" || r.kind === "dice") throw new EvalError("cannot compare dice", e.pos);
      if (l.kind !== r.kind) throw new EvalError(`cannot compare ${l.kind} with ${r.kind}`, e.pos);
      const a = l.value, b = r.value;
      switch (e.op) {
        case "<": return bool(a < b);
        case "<=": return bool(a <= b);
        case ">": return bool(a > b);
        case ">=": return bool(a >= b);
        case "==": return bool(a === b);
        case "!=": return bool(a !== b);
      }
    }
  }
}

function call(e: Extract<Expr, { kind: "call" }>, env: Env): Value {
  const { name, args, pos } = e;
  if (env.predicates?.has(name)) {
    const vals = args.map((a) => (a.kind === "ident" ? text(a.name) : evaluate(a, env)));
    const v = env.call?.(name, vals, args);
    if (v === undefined) throw new EvalError(`unknown predicate "${name}"`, pos);
    return v;
  }
  if (name === "if") {
    if (args.length !== 3) throw new EvalError("if() needs three arguments", pos);
    const c = needBool(evaluate(args[0], env), "if() condition", pos);
    const chosen = evaluate(args[c ? 1 : 2], env);
    // type check the other branch lazily only when it is cheap: literals and dice; otherwise trust it
    const other = args[c ? 2 : 1];
    if (other.kind === "int" || other.kind === "bool" || other.kind === "dice" || other.kind === "string") {
      const ov = evaluate(other, env);
      const numeric = (v: Value) => v.kind === "int" || v.kind === "dice";
      if (!(numeric(chosen) && numeric(ov)) && chosen.kind !== ov.kind) throw new EvalError("if() branches must have the same type", pos);
    }
    return chosen;
  }
  if (!BUILTINS.has(name)) {
    const v = env.call?.(name, args.map((a) => evaluate(a, env)), args);
    if (v === undefined) throw new EvalError(`unknown function "${name}"`, pos);
    return v;
  }
  if (name === "table") {
    const v = env.call?.(name, args.map((a) => evaluate(a, env)), args);
    if (v === undefined) throw new EvalError("table() is not available here", pos);
    return v;
  }
  const vals = args.map((a) => evaluate(a, env));
  switch (name) {
    case "floor": case "ceil": case "round": case "abs": {
      if (vals.length !== 1) throw new EvalError(`${name}() needs one argument`, pos);
      const n = needInt(vals[0], `${name}()`, pos);
      return int(name === "abs" ? Math.abs(n) : name === "floor" ? Math.floor(n) : name === "ceil" ? Math.ceil(n) : Math.round(n));
    }
    case "max": case "min": {
      if (vals.length < 2) throw new EvalError(`${name}() needs at least two arguments`, pos);
      const pick = name === "max" ? Math.max : Math.min;
      if (vals.every((v) => v.kind === "int")) return int(pick(...vals.map((v) => (v as { value: number }).value)));
      if (vals.every((v) => v.kind === "int" || v.kind === "dice")) {
        let best = vals[0];
        for (const v of vals.slice(1)) if (pick(average(v), average(best)) === average(v) && average(v) !== average(best)) best = v;
        return best;
      }
      throw new EvalError(`${name}() needs numbers`, pos);
    }
    case "dice": {
      if (vals.length !== 2) throw new EvalError("dice() needs (count, sides)", pos);
      const c = needInt(vals[0], "dice() count", pos);
      if (c < 0) throw new EvalError("dice() count must not be negative", pos);
      return dice(c, needInt(vals[1], "dice() sides", pos));
    }
  }
  throw new EvalError(`unknown function "${name}"`, pos);
}
