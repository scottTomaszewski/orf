# Phase 2: Grammar, Conformance Corpus, Engine, Nimble Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the linted Nimble content into numbers: parse and evaluate the expression language, fold contributions (with lookups and stacking) for a whole character, track resources across moments, and implement Nimble's rest/damage/Dying procedures as an engine system module, proven end to end on Pip.

**Architecture:** A hand-written recursive-descent parser produces an AST; an evaluator computes typed values (integer, boolean, dice, text) against an `Env`. `assembleCharacter` walks a character document to the set of attached documents (with item and choice context); `evaluateCharacter` builds a lazy, cycle-checked variable resolver over the fold and returns a `Sheet` (values, provenance, resources, diagnostics). `applyMoment` runs resource refresh rules; `src/systems/nimble.ts` implements the procedures that fire moments and mutate `state`. The linter gains a syntax check from the real parser. A JSON conformance corpus pins the grammar.

**Tech Stack:** TypeScript 5 (strict, NodeNext), Node 20, vitest, tsx, `yaml`. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (§4.1, §6, §7, §11), `docs/spec/expressions.md`, `docs/spec/effects-and-resources.md`, `docs/spec/choices.md`.

## Global Constraints

- No new runtime dependencies; `yaml` is the only one.
- Ops are exactly `base add mul at_least at_most set` (`src/registry.ts` `OPS`).
- Fold: `(max(base) + Σadd) × Πmul`, clamp `[largest at_least, smallest at_most]`, `set` wins (largest), round per variable (`rounding`, default `floor`). Formula = first `base` candidate; `default` only when nothing contributes and no formula.
- Stacking default `same-source: highest`: within one `source`, only the largest contribution per op counts.
- Lookup `{by, rows}`: the row with the largest integer key `<= by` wins; no row = the contribution does not exist (formula → default).
- Integers only; `/` rounds per the target variable's rounding (floor where there is no target). Division with dice, and comparison of dice, are errors. `and`/`or`/`not` on non-booleans are errors.
- Dice fold: dice + dice merges terms; int × dice scales counts and constant; `base` competition between dice compares averages.
- Unknown identifier at evaluation = diagnostic + the variable's default, never a crash, never silent zero without a diagnostic.
- Moments: built-in `catch-breath make-camp safe-rest encounter-start encounter-end turn-end level-up`; Nimble adds `gain-wound full-hp`. Only refresh rules listen.
- The engine never rolls; procedures that need a roll take the rolls as arguments.
- Commit messages: no AI attribution lines.

## Review Focus

1. A `when` that references `<resource>.current` while the resource does not exist (Mage below level 5 reading `mage.surge.current`): expect a diagnostic and `false`, not a crash. (Task 6 test.)
2. A variable formula cycle (`a` → `b` → `a`): expect one diagnostic naming both members and the default value for both. (Task 6 test.)
3. Equipment with an unmet `requires: {str: n}`: expect the item attached but its effects inactive and a diagnostic. (Task 5 test.)
4. `set` contributions shadowing `add` contributions: expect a warning diagnostic listing the shadowed sources and the `set` value. (Task 4 test.)
5. Damage larger than temp HP + HP while already Dying with a crit: expect exactly `wound.damage_while_dying + 1` Wounds, HP stays 0, no negative values. (Task 8 test.)

---

### Task 1: AST and parser

**Files:**
- Create: `src/expr/ast.ts`, `src/expr/parser.ts`
- Test: `src/expr/parser.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // ast.ts
  export type Expr =
    | { kind: "int"; value: number; pos: number }
    | { kind: "bool"; value: boolean; pos: number }
    | { kind: "string"; value: string; pos: number }
    | { kind: "dice"; count: number; sides: number; keep?: { mode: "kh" | "kl" | "dh" | "dl"; n: number }; pos: number }
    | { kind: "ident"; name: string; pos: number }          // dex, wounds.max, DEX, this.x, mana.current
    | { kind: "diceSugar"; count: Expr; sides: number; pos: number }   // wil d8
    | { kind: "unary"; op: "-" | "not"; arg: Expr; pos: number }
    | { kind: "binary"; op: "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">=" | "==" | "!=" | "and" | "or"; left: Expr; right: Expr; pos: number }
    | { kind: "call"; name: string; args: Expr[]; pos: number };
  export class ParseError extends Error { constructor(message: string, public pos: number) }
  // parser.ts
  export function parse(text: string): Expr;   // throws ParseError with 0-based pos
  ```
- Grammar: `docs/spec/expressions.md` §10 PEG, precedence §2. Keywords `and or not true false` are not identifiers; word operators need surrounding whitespace; `nothing` is an identifier.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/expr/parser.test.ts`
Expected: FAIL, cannot find module `./parser.js`

- [ ] **Step 3: Implement `ast.ts` and `parse(text)` in `parser.ts`**

Tokenizer + recursive descent over the PEG. Tokenize dice before identifiers (`4d6kh3`, `d8`); an identifier followed by whitespace, `d`, digits is dice sugar. Position is the 0-based index of the offending character; trailing input is `unexpected "<token>" at <pos>`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/expr/parser.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/expr/ast.ts src/expr/parser.ts src/expr/parser.test.ts
git commit -m "expr: AST and recursive-descent parser for the expression grammar"
```

---

### Task 2: Values and evaluator

**Files:**
- Create: `src/expr/value.ts`, `src/expr/evaluate.ts`
- Test: `src/expr/evaluate.test.ts`

**Interfaces:**
- Consumes: `parse`, `Expr` (Task 1).
- Produces:
  ```ts
  // value.ts
  export type DiceTerm = { count: number; sides: number; keep?: { mode: "kh" | "kl" | "dh" | "dl"; n: number } };
  export type Value =
    | { kind: "int"; value: number }
    | { kind: "bool"; value: boolean }
    | { kind: "text"; value: string }
    | { kind: "dice"; terms: DiceTerm[]; constant: number };   // sum of dice terms plus a constant
  export const int = (n: number): Value; export const bool = (b: boolean): Value; export const text = (s: string): Value;
  export function dice(count: number, sides: number, keep?: DiceTerm["keep"]): Value;
  export function average(v: Value): number;        // int → itself; dice → Σ count×(sides+1)/2 + constant (keep/drop ignored, documented)
  export function formatValue(v: Value): string;    // 7, true, "2d8 + 3", "1d6 - 1"; dice terms sorted by sides descending
  export function addValues(a: Value, b: Value): Value;   // int+int, dice+int, dice+dice (merge terms with equal sides and keep)
  export function scaleValue(v: Value, k: number): Value; // int × int; int × dice scales counts and constant
  // evaluate.ts
  export class EvalError extends Error { constructor(message: string, public pos: number) }
  export interface Env {
    lookup(name: string): Value | undefined;                       // identifiers (aliases resolved by the caller), this.x, <res>.current, key, secondary, choice, equipped, carried
    call?(name: string, args: Value[], raw: Expr[]): Value | undefined;   // helpers, predicates, table(); predicates receive identifier args as text values
    predicates?: Set<string>;                                      // names whose identifier args are passed as text, not evaluated
    rounding?: "floor" | "ceil" | "round" | "none";                // for `/`; default floor
  }
  export function evaluate(expr: Expr, env: Env): Value;   // throws EvalError
  export function evaluateText(text: string, env: Env): Value;   // parse + evaluate
  ```
- Built-ins in `evaluate`: `floor ceil round abs` (int only), `max min` (≥2 args; ints, or dice by average), `if(cond, a, b)` (lazy; branches typed alike), `dice(count, sides)` (count must be int ≥ 0; 0 → int 0), `table` delegated to `env.call`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { evaluateText, EvalError, type Env } from "./evaluate.js";
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/expr/evaluate.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Implement `value.ts` and `evaluate.ts`**

`EvalError` messages: `unknown identifier "x"`, `unknown function "f"`, `cannot compare dice`, `cannot divide dice`, `"and"/"or"/"not" need boolean operands`, `max()/min() need at least two arguments`, `if() branches must have the same type`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/expr/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/expr
git commit -m "expr: typed values (int, bool, text, symbolic dice) and evaluator with built-ins"
```

---

### Task 3: Conformance corpus and parser-backed lint syntax check

**Files:**
- Create: `conformance/expressions.json`, `src/expr/conformance.test.ts`
- Modify: `src/lint.ts` (`checkExpression`), `src/lint.test.ts`

**Interfaces:**
- Corpus entry shape (language-neutral):
  ```json
  { "name": "floor division", "expr": "7 / 2", "env": {"dex": 2}, "expect": {"kind": "int", "value": 3} }
  { "name": "dice compare", "expr": "1d6 > 3", "error": "compare dice" }
  { "name": "dice format", "expr": "1d8 + str", "env": {"str": -1}, "expect": {"kind": "dice", "format": "1d8 - 1"} }
  { "name": "parse error", "expr": "1 +", "parseError": true }
  ```
  `env` values are integers or booleans. At least 40 cases covering every row of `docs/spec/expressions.md` §1–§3 and §8, each of the Nimble formulas in `systems/nimble/*.md` (copied verbatim), and the torture-test expressions.
- Lint: `checkExpression` first calls `parse`; a `ParseError` becomes the diagnostic `syntax error in "<context>": <message> at column <pos+1>` and skips reference checks for that expression.

- [ ] **Step 1: Write the failing tests**

```ts
// src/expr/conformance.test.ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { evaluateText } from "./evaluate.js";
import { parse } from "./parser.js";
import { bool, formatValue, int } from "./value.js";
interface Case { name: string; expr: string; env?: Record<string, number | boolean>; expect?: { kind: string; value?: unknown; format?: string }; error?: string; parseError?: boolean }
const cases: Case[] = JSON.parse(readFileSync(new URL("../../conformance/expressions.json", import.meta.url), "utf8"));
test("corpus has at least 40 cases", () => expect(cases.length).toBeGreaterThanOrEqual(40));
for (const c of cases) test(c.name, () => {
  const env = { lookup: (n: string) => { const v = c.env?.[n]; return typeof v === "number" ? int(v) : typeof v === "boolean" ? bool(v) : undefined; } };
  if (c.parseError) { expect(() => parse(c.expr)).toThrow(); return; }
  if (c.error) { expect(() => evaluateText(c.expr, env)).toThrow(new RegExp(c.error)); return; }
  const v = evaluateText(c.expr, env);
  expect(v.kind).toBe(c.expect!.kind);
  if (c.expect!.value !== undefined) expect((v as { value: unknown }).value).toBe(c.expect!.value);
  if (c.expect!.format !== undefined) expect(formatValue(v)).toBe(c.expect!.format);
});
```

```ts
// append to src/lint.test.ts
test("expressions that do not parse are syntax errors with a column", () => {
  const msgs = lintDocument(content({ effects: [{ target: "wounds.max", add: "1 +" }] }), reg).map((d) => d.message).join("\n");
  expect(msgs).toMatch(/syntax error.*column 4/);
  expect(msgs).not.toMatch(/unknown identifier/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/expr/conformance.test.ts src/lint.test.ts`
Expected: FAIL (missing corpus file; lint test fails on missing "syntax error")

- [ ] **Step 3: Write `conformance/expressions.json` (≥ 40 cases) and the lint change**

- [ ] **Step 4: Run the whole suite and the content lint**

Run: `npm test && npm run lint-docs`
Expected: all PASS; both trees `OK`

- [ ] **Step 5: Commit**

```bash
git add conformance src/expr/conformance.test.ts src/lint.ts src/lint.test.ts
git commit -m "expr: JSON conformance corpus; lint checks expression syntax with the real parser"
```

---

### Task 4: Fold with lookups, stacking, provenance

**Files:**
- Create: `src/fold.ts`
- Test: `src/fold.test.ts`

**Interfaces:**
- Consumes: `Value`, `addValues`, `scaleValue`, `average` (Task 2); `VariableDef`, `Lookup` (`src/registry.ts`).
- Produces:
  ```ts
  export type Op = "base" | "add" | "mul" | "at_least" | "at_most" | "set";
  export interface Contribution { op: Op; value: Value; source: string; origin: string; note?: string; whenText?: string }  // origin = document id (or "<formula>")
  export interface Provenance { contributions: Contribution[]; shadowed: Contribution[]; dropped: Contribution[]; usedDefault: boolean }
  export interface Diagnostic { path: string; message: string; line?: number }   // re-export of registry's
  export function fold(def: VariableDef, contributions: Contribution[], opts?: { stacking?: "highest" | "sum" }): { value: Value; provenance: Provenance; diagnostics: Diagnostic[] }
  ```
  `dropped` = contributions removed by `same-source: highest`; `shadowed` = everything a `set` overrode (also a diagnostic `set on <id> from <origin> shadows: <origins>`). Booleans: the largest `set` (true > false), else default. Dice `base` competition by `average`. Rounding applied to int results only.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

(`mul` values are ints in Phase 2; `mul: 0.5` is out of scope because there are no floats — halving is `floor(x / 2)` in a formula.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/fold.test.ts` → FAIL, missing module.
- [ ] **Step 3: Implement `fold.ts`.**
- [ ] **Step 4: Run to verify pass** — `npx vitest run src/fold.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add src/fold.ts src/fold.test.ts && git commit -m "engine: fold with same-source stacking, set shadowing, dice bases, provenance"`

---

### Task 5: Character assembly

**Files:**
- Create: `src/character.ts`
- Test: `src/character.test.ts`

**Interfaces:**
- Consumes: `Document`, `Registry`.
- Produces:
  ```ts
  export interface Attachment {
    doc: Document;
    via: string;                       // "ancestry" | "background" | "class" | "class-level" | "grant:<id>" | "choice:<slot>" | "subclass-level:<n>" | "equipment" | "feature" | "spell"
    item?: { equipped: boolean; carried: true; requirementsMet: boolean };
    choice?: string;                   // the pick, for choice effects
    effectOverride?: Record<string, unknown>;   // a choice's effect template, with "{{ choice }}" substituted
  }
  export interface Assembly { character: Document; attachments: Attachment[]; classLevels: Map<string, number>; diagnostics: Diagnostic[] }
  export function assembleCharacter(character: Document, registry: Registry, docs: Map<string, Document>): Assembly;
  ```
  Walk: ancestry, background; each `classes[]` entry → class doc, every `class-level` doc with that `class` and `level <= character level` (grants attach recursively: a granted doc's own `grants` attach too), its `choices[]` slots → picks from `character.choices["<class-level id>.<slot>"]` (document picks attach with `via: choice:<slot>`; option picks produce an attachment of the class-level doc with `choice` and `effectOverride` when the slot has `effect`); subclass picks → `grants_by_level` entries `<= level`; `features[]`, `spells[]`; `equipment[]` → item attachments with `requirementsMet` = every `requires.{stat} <= stats.{stat}` (creation array only; diagnostic `equipment <id>: requires str 2, you have -1`). Missing document ids → diagnostic, skip. Each document attaches once (first `via` wins).

- [ ] **Step 1: Write the failing test** (loads the real Nimble trees)

```ts
import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
import { buildRegistry } from "./registry.js";
import { assembleCharacter } from "./character.js";
const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;

test("Pip attaches ancestry, background, class, levels 1-4, grants, picks, subclass, equipment", () => {
  const a = assembleCharacter(pip, registry, byId);
  const ids = a.attachments.map((x) => String(x.doc.frontmatter.id));
  for (const id of ["nimble.ancestries.gnome", "nimble.backgrounds.wild-one", "nimble.classes.mage", "nimble.classes.mage.level-1", "nimble.classes.mage.level-4",
    "nimble.features.mage.mana", "nimble.features.mage.elemental-spellcasting", "nimble.spell-schools.fire", "nimble.subclasses.mage.control",
    "nimble.features.mage.echo-casting", "nimble.items.armor.adventurers-garb", "nimble.items.weapons.staff"]) expect(ids).toContain(id);
  expect(ids).not.toContain("nimble.classes.mage.level-5");
  expect(a.classLevels.get("mage")).toBe(4);
  const bump = a.attachments.find((x) => x.choice === "int")!;
  expect(bump.effectOverride).toEqual({ target: "int", add: 1 });
  expect(a.attachments.find((x) => x.via === "equipment")!.item).toEqual({ equipped: true, carried: true, requirementsMet: true });
  expect(a.diagnostics).toEqual([]);
});
test("unmet equipment requirements and unknown ids are diagnostics", () => {
  const ch = { ...pip, frontmatter: { ...pip.frontmatter, equipment: [{ id: "nimble.items.armor.half-plate", equipped: true }, { id: "x.nope", equipped: false }] } };
  const a = assembleCharacter(ch, registry, byId);
  expect(a.attachments.find((x) => String(x.doc.frontmatter.id) === "nimble.items.armor.half-plate")!.item!.requirementsMet).toBe(false);
  const msgs = a.diagnostics.map((d) => d.message).join("\n");
  expect(msgs).toMatch(/half-plate.*requires str/);
  expect(msgs).toMatch(/x\.nope/);
});
```

- [ ] **Step 2: Run to verify failure** — FAIL, missing module.
- [ ] **Step 3: Implement `character.ts`.** (Check `half-plate.md` has `requires: {str: n}` with n > −1; if it uses `strength_requirement` only, read both keys.)
- [ ] **Step 4: Run to verify pass** — `npx vitest run src/character.test.ts`.
- [ ] **Step 5: Commit** — `git commit -m "engine: character assembly — classes, levels, grants, choices, subclasses, equipment"`

---

### Task 6: `evaluateCharacter` — the sheet

**Files:**
- Create: `src/engine.ts`
- Test: `src/engine.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 4, 5; `Registry`.
- Produces:
  ```ts
  export interface SheetVariable { id: string; name: string; description?: string; value: Value; provenance: Provenance }
  export interface SheetResource { id: string; max: number | undefined; current: number; floor: number }
  export interface Sheet {
    variables: Map<string, SheetVariable>;      // every registry variable (lazy-computed on first access, all computed before return)
    resources: Map<string, SheetResource>;      // only resources whose `when` holds
    attachments: Attachment[];
    diagnostics: Diagnostic[];
    value(id: string): Value;                   // alias-aware
    render(text: string): string;               // resolves {{ expr | display }} in prose to "value" (resolved mode); errors render as "⚠ <expr>"
  }
  export function evaluateCharacter(character: Document, registry: Registry, docs: Map<string, Document>): Sheet;
  ```
  Resolution rules: stats come from `character.stats` as `base` contributions with source `creation`; `level` = highest class level (single class in MVP); `hp.max` gets one `add` per `levels[]` entry (source `level-<n>`, origin `levels`); `skill.<k>.points` gets `add` from `character.skills`; `key`/`secondary` fold normally (class contributes); `<res>.current` reads `state`, diagnostic + `0` if the resource is absent; `this.x` reads the attachment's frontmatter; `equipped`/`carried` read the attachment's item context; predicates: `equipped(kind)` = any equipped item whose `type` or `category` or `kind` equals kind (`armor` matches type armor); `has("id")` = attached; `level(short)` = `classLevels`; `proficient(x)` = the class doc's `armor_proficiency`/`weapon_proficiency` text contains x case-insensitively or equals `All`; `knows(school)` = an attached `spell-school` doc whose id ends with `.<school>`; `table(...)` from `registry.tables`. Cycle: a stack of variable ids under evaluation; re-entry → one diagnostic `cycle: a → b → a` and defaults for the members. Unknown identifier in a `when` → diagnostic, contribution skipped. Lookups: evaluate `by`, pick row, evaluate row.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { formatValue } from "./expr/value.js";
const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const n = (s: ReturnType<typeof evaluateCharacter>, id: string) => (s.value(id) as { value: number }).value;

test("Pip's headline numbers (H2 p.32, CR2)", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.diagnostics).toEqual([]);
  expect(n(s, "int")).toBe(3);               // 2 creation + 1 level-4 choice
  expect(n(s, "key")).toBe(3);
  expect(n(s, "level")).toBe(4);
  expect(n(s, "hp.max")).toBe(25);
  expect(n(s, "mana.max")).toBe(13);
  expect(n(s, "armor")).toBe(4);             // garb 2 + dex 2 beats unarmored dex
  expect(n(s, "skill.arcana")).toBe(6);
  expect(n(s, "skill.might")).toBe(-1);
  expect(n(s, "hit_dice.max")).toBe(4);
  expect(n(s, "speed")).toBe(5);             // gnome -1
  expect(n(s, "initiative.bonus")).toBe(2);
  expect(n(s, "spells.tier.max")).toBe(2);
  expect(n(s, "dc.hero")).toBe(13);
  expect(s.value("bloodied")).toEqual({ kind: "bool", value: false });
  expect(s.variables.get("armor")!.provenance.contributions.map((c) => c.origin)).toContain("nimble.items.armor.adventurers-garb");
});
test("resources: present, absent, and current from state", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.resources.get("mana")).toEqual({ id: "mana", max: 13, current: 6, floor: 0 });
  expect(s.resources.get("hp")!.current).toBe(17);
  expect(s.resources.has("gnome.reroll")).toBe(true);
  expect(s.resources.has("mage.surge")).toBe(false);          // level < 5
});
test("render resolves inline expressions in prose", () => {
  const s = evaluateCharacter(pip, registry, byId);
  expect(s.render("Deals {{ 1d6 + str }}.")).toBe("Deals 1d6 - 1.");
  expect(s.render("{{ (max(int, 0) * 3) + level | (INT × 3) + level }}")).toBe("13");
});
test("equipment changes ripple: half-plate with unmet STR does not apply; wooden buckler adds", () => {
  const fm = { ...pip.frontmatter, equipment: [{ id: "nimble.items.armor.half-plate", equipped: true }, { id: "nimble.items.armor.wooden-buckler", equipped: true }] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(n(s, "armor")).toBe(4);              // unarmored dex 2 + buckler 2
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/half-plate/);
});
test("state toggles: in_wilderness sets hit_die.heal.advantage; ally_nearby adds Wounds for Devoted Protector", () => {
  const fm = { ...pip.frontmatter, background: "nimble.backgrounds.devoted-protector", state: { ...(pip.frontmatter.state as object), ally_nearby: true } };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(n(s, "wounds.max")).toBe(9);
});
test("level ladders via lookup: a level-9 Cheat has 2d10 Sneak Attack and Initiative floor 10", () => {
  const fm = { ...pip.frontmatter, id: "scott.characters.test", classes: [{ id: "nimble.classes.cheat", level: 9 }], choices: {}, levels: [{ level: 1, hp: 10 }] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, registry, byId);
  expect(formatValue(s.value("cheat.sneak_attack.dice"))).toBe("2d10");
  expect(n(s, "initiative.floor")).toBe(10);
});
test("a formula cycle is one diagnostic naming both members, not a crash", () => {
  const cyc = { path: "cyc.md", body: "", bodyStartLine: 1, frontmatter: { id: "x.cyc", type: "variables", system: "nimble", name: "c",
    variables: [{ id: "cyc.a", name: "a", type: "integer", default: 1, formula: "cyc.b + 1" }, { id: "cyc.b", name: "b", type: "integer", default: 2, formula: "cyc.a + 1" }] } };
  const reg2 = buildRegistry([...docs, cyc]).registry;
  const s = evaluateCharacter(pip, reg2, byId);
  expect(s.diagnostics.filter((d) => /cycle/.test(d.message))).toHaveLength(1);
  expect(s.diagnostics.find((d) => /cycle/.test(d.message))!.message).toMatch(/cyc\.a.*cyc\.b/);
  expect(n(s, "cyc.a")).toBe(1);
});
test("a when reading an absent resource's current is a diagnostic and false", () => {
  const feat = { path: "f.md", body: "", bodyStartLine: 1, frontmatter: { id: "x.f", type: "feature", system: "nimble", name: "f",
    effects: [{ target: "speed", add: 1, when: "mage.surge.current > 0" }] } };
  const byId2 = new Map(byId); byId2.set("x.f", feat);
  const fm = { ...pip.frontmatter, features: ["x.f"] };
  const s = evaluateCharacter({ ...pip, frontmatter: fm }, buildRegistry([...docs, feat]).registry, byId2);
  expect(n(s, "speed")).toBe(5);
  expect(s.diagnostics.map((d) => d.message).join()).toMatch(/mage\.surge\.current/);
});
```

(Check `state` in the character linter: `ally_nearby`/`in_wilderness` as state keys must be allowed. If `lintDocument` rejects non-resource state keys, extend Rule 6 in `src/lint.ts` to allow boolean variables declared in the registry, with a test, in this task.)

- [ ] **Step 2: Run to verify failure** — FAIL, missing module.
- [ ] **Step 3: Implement `engine.ts`.** Lazy resolver with memo + stack; contributions gathered per variable id once (index attachments' effects by resolved target up front; aliases resolved through `registry.aliases`); choice `effectOverride` substitutes `{{ choice }}` in `target` before resolution.
- [ ] **Step 4: Run to verify pass** — `npx vitest run src/engine.test.ts`; then `npm test`.
- [ ] **Step 5: Commit** — `git commit -m "engine: evaluateCharacter — lazy fold over attachments, predicates, resources, render, diagnostics"`

---

### Task 7: Moments and resource refresh

**Files:**
- Create: `src/moments.ts`
- Test: `src/moments.test.ts`

**Interfaces:**
- Consumes: `Sheet` (Task 6), `Registry`.
- Produces:
  ```ts
  export type State = Record<string, unknown>;        // the character's `state` mapping
  export interface MomentResult { state: State; changes: { resource: string; from: number; to: number; rule: string }[] }
  export function applyMoment(moment: string, sheet: Sheet, state: State): MomentResult;   // runs every present resource's refresh rules for this moment, in declaration order; clamps to [floor, max]
  export function clampResource(sheet: Sheet, id: string, value: number): number;
  ```
  `to: max` with an undefined max (e.g. `temp_hp`) → `to: 0`? No: a rule `to: max` on a max-less resource is a diagnostic at lint time (add to `src/lint.ts` Rule 5 with a test); at runtime it is skipped.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { loadDocuments } from "./document.js";
import { buildRegistry } from "./registry.js";
import { evaluateCharacter } from "./engine.js";
import { applyMoment } from "./moments.js";
const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const sheet = evaluateCharacter(pip, registry, byId);
const st = () => ({ ...(pip.frontmatter.state as Record<string, unknown>) });

test("safe-rest: hp and hit dice to max, one Wound healed, temp hp cleared, mana to max", () => {
  const r = applyMoment("safe-rest", sheet, { ...st(), temp_hp: 3 });
  expect(r.state).toMatchObject({ hp: 25, hit_dice: 4, wounds: 0, temp_hp: 0, mana: 13 });
  expect(r.changes.find((c) => c.resource === "wounds")).toMatchObject({ from: 1, to: 0, rule: "safe-rest add -1" });
});
test("wounds never go below floor; a rule for a moment with no listeners changes nothing", () => {
  expect(applyMoment("safe-rest", sheet, { ...st(), wounds: 0 }).state.wounds).toBe(0);
  expect(applyMoment("level-up", sheet, st()).changes).toEqual([]);
});
test("turn-end restores actions; full-hp refreshes the gnome reroll", () => {
  expect(applyMoment("turn-end", sheet, { ...st(), actions: 0 }).state.actions).toBe(3);
  expect(applyMoment("full-hp", sheet, { ...st(), "gnome.reroll": 0 }).state["gnome.reroll"]).toBe(1);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `moments.ts`** (and the lint rule for `to: max` on a max-less resource, test first in `src/lint.test.ts`).
- [ ] **Step 4: Run to verify pass** — `npm test`.
- [ ] **Step 5: Commit** — `git commit -m "engine: moments apply resource refresh rules with clamping and a change log"`

---

### Task 8: Nimble system module

**Files:**
- Create: `src/systems/nimble.ts`
- Test: `src/systems/nimble.test.ts`

**Interfaces:**
- Consumes: `Sheet`, `applyMoment`, `clampResource`, `State`.
- Produces:
  ```ts
  export interface Outcome { state: State; fired: string[]; log: string[] }
  export interface Ctx { sheet: Sheet; state: State }
  export function damage(ctx: Ctx, amount: number, crit?: boolean): Outcome;
  export function heal(ctx: Ctx, amount: number): Outcome;
  export function catchBreath(ctx: Ctx, rolls: number[][]): Outcome;   // one inner array per Hit Die spent: the die roll(s) the player made (two when hit_die.heal.advantage); engine keeps the higher
  export function makeCamp(ctx: Ctx, hitDice: number): Outcome;
  export function safeRest(ctx: Ctx): Outcome;
  export function encounterStart(ctx: Ctx, initiativeRoll: number): Outcome;   // first-turn actions: 1 / 2 / 3 by digit count of max(roll, initiative.floor); capped by actions.dying_cap while dying; refreshes encounter-start listeners
  export function turnEnd(ctx: Ctx): Outcome;
  export function encounterEnd(ctx: Ctx): Outcome;
  ```
  Rules (CR2 p.9, p.15, p.17): damage → temp_hp first, then hp; reaching 0 from above → wounds +1, `dying` = true, fire `gain-wound`; damage while already dying (amount > 0) → wounds + `wound.damage_while_dying` (+1 if crit), fire `gain-wound`; wounds at `wounds.max` → log "dead". heal → hp + amount (clamped), `dying` = false if hp > 0, fire `full-hp` when hp == max. catchBreath: per die spent (while hit_dice > 0): heal `(maximized ? size : best roll) + str + hit_die.heal.bonus`, minimum 0 per die; fires `catch-breath` then `full-hp` if applicable. makeCamp: per die `size + str + bonus`; fires `make-camp`. safeRest: hp to max, `dying` false, then `applyMoment("safe-rest")`. `dying`, `in_wilderness`, etc. live in `state` as booleans. Every outcome ends by applying the moment(s) it fired, in order, and merging their change logs into `log`.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";
import { loadDocuments } from "../document.js";
import { buildRegistry } from "../registry.js";
import { evaluateCharacter } from "../engine.js";
import * as nimble from "./nimble.js";
const docs = loadDocuments(["systems/nimble", "examples/nimble"]);
const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
const { registry } = buildRegistry(docs);
const pip = byId.get("scott.characters.pip")!;
const sheet = evaluateCharacter(pip, registry, byId);
const ctx = (over: Record<string, unknown> = {}) => ({ sheet, state: { ...(pip.frontmatter.state as object), ...over } as Record<string, unknown> });

test("damage eats temp hp first, then hp; dropping to 0 = 1 Wound and Dying", () => {
  const r = nimble.damage(ctx({ hp: 5, temp_hp: 3 }), 10);
  expect(r.state).toMatchObject({ hp: 0, temp_hp: 0, wounds: 2, dying: true });
  expect(r.fired).toEqual(["gain-wound"]);
});
test("damage while Dying: 2 Wounds, 3 on a crit; hp stays 0", () => {
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4).state.wounds).toBe(4);
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4, true).state.wounds).toBe(5);
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 2 }), 4).state.hp).toBe(0);
});
test("dead at max Wounds is logged", () => {
  expect(nimble.damage(ctx({ hp: 0, dying: true, wounds: 5 }), 1).log.join()).toMatch(/dead/i);
});
test("heal clears Dying above 0 and fires full-hp at max, which refreshes the gnome reroll", () => {
  const r = nimble.heal(ctx({ hp: 0, dying: true, "gnome.reroll": 0 }), 30);
  expect(r.state).toMatchObject({ hp: 25, dying: false, "gnome.reroll": 1 });
  expect(r.fired).toEqual(["full-hp"]);
});
test("catch breath: each die heals best roll + STR + bonus, spends hit dice; advantage keeps the higher", () => {
  // Pip: d6, STR -1, Wild One sets advantage only in the wilderness
  const r = nimble.catchBreath(ctx({ hp: 10, hit_dice: 2 }), [[4], [1]]);
  expect(r.state).toMatchObject({ hp: 13, hit_dice: 0 });                   // (4-1) + max(1-1, 0)
  const wild = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, state: { ...(pip.frontmatter.state as object), in_wilderness: true } } }, registry, byId);
  const r2 = nimble.catchBreath({ sheet: wild, state: { ...(pip.frontmatter.state as object), hp: 10, hit_dice: 1, in_wilderness: true } }, [[2, 5]]);
  expect(r2.state.hp).toBe(14);
});
test("make camp heals the maximum per die; oozeling maximizes catch breath too", () => {
  expect(nimble.makeCamp(ctx({ hp: 10, hit_dice: 2 }), 2).state.hp).toBe(20);   // (6-1) × 2
  const ooze = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, ancestry: "nimble.ancestries.oozeling" } }, registry, byId);
  expect(nimble.catchBreath({ sheet: ooze, state: { ...(pip.frontmatter.state as object), hp: 10, hit_dice: 1 } }, [[1]]).state.hp).toBe(15);
});
test("safe rest: full hp, hit dice, one Wound, mana; dying cleared", () => {
  const r = nimble.safeRest(ctx({ hp: 0, dying: true, wounds: 3, hit_dice: 0, mana: 0 }));
  expect(r.state).toMatchObject({ hp: 25, dying: false, wounds: 2, hit_dice: 4, mana: 13 });
});
test("initiative: digit count sets first-turn actions; the Cheat floors at 10; Dying caps at 1", () => {
  expect(nimble.encounterStart(ctx({ actions: 0 }), 7).state.actions).toBe(1);
  expect(nimble.encounterStart(ctx({ actions: 0 }), 14).state.actions).toBe(2);
  expect(nimble.encounterStart(ctx({ actions: 0 }), 21).state.actions).toBe(3);
  expect(nimble.encounterStart(ctx({ actions: 0, hp: 0, dying: true }), 21).state.actions).toBe(1);
  const cheatFm = { ...pip.frontmatter, id: "scott.characters.c", classes: [{ id: "nimble.classes.cheat", level: 1 }], choices: {}, levels: [{ level: 1, hp: 10 }] };
  const cheat = evaluateCharacter({ ...pip, frontmatter: cheatFm }, registry, byId);
  expect(nimble.encounterStart({ sheet: cheat, state: { actions: 0, hp: 10 } }, 7).state.actions).toBe(2);
});
test("turn end restores actions; encounter end zeroes encounter pools", () => {
  expect(nimble.turnEnd(ctx({ actions: 1 })).state.actions).toBe(3);
  const z = evaluateCharacter({ ...pip, frontmatter: { ...pip.frontmatter, id: "scott.characters.z", classes: [{ id: "nimble.classes.zephyr", level: 2 }], choices: {}, levels: [{ level: 1, hp: 13 }] } }, registry, byId);
  const r = nimble.encounterEnd({ sheet: z, state: { "zephyr.bursts": 2, hp: 13 } });
  expect(r.state["zephyr.bursts"]).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `src/systems/nimble.ts`.** Note: the Cheat's `level-1` doc must grant `nimble.features.cheat.cheat` for the floor test; verify and fix content if not.
- [ ] **Step 4: Run to verify pass** — `npm test`.
- [ ] **Step 5: Commit** — `git commit -m "nimble: system module — damage, heal, rests, initiative, turns; fires moments"`

---

### Task 9: CLI `sheet` command and 5e insurance test

**Files:**
- Modify: `src/cli.ts`, `src/cli.test.ts`
- Create: `src/insurance.test.ts`

**Interfaces:**
- `main(argv)`: if `argv[0] === "sheet"`, `argv[1]` is a character id and the rest are directories; prints every variable `id = value  (name)` sorted by id, then each contribution indented as `  ← <op> <value> from <origin>`, then resources `id: current/max`, then diagnostics; exit 1 only on diagnostics. Otherwise the existing lint behaviour.
- `src/insurance.test.ts`: fold-level tests over the `srd5e-mini` tree using a synthetic 5e character document `{type: character, system: srd5e, stats..., equipment: [chain-mail], spells: [mage-armor], features: [monk-unarmored-defense]}` — expect: chain mail equipped → `ac` 16 (the base competition); unequipped → monk unarmored defense wins over Mage Armor when higher; Bless attached twice (two documents, same `source: bless`) → one Bless. Read `systems/srd5e-mini` and `examples/insurance-5e` first; adjust expectations to the real variable ids (`ac.base`, `ac`, `dex.mod`).

- [ ] **Step 1: Write the failing tests** (cli: `main(["sheet", "scott.characters.pip", "systems/nimble", "examples/nimble"])` prints a line matching `/^armor = 4/m` and `/← base 4 from nimble\.items\.armor\.adventurers-garb/` and returns 0; insurance as described).
- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement.** The 5e character linter rules are Nimble-shaped (`stats` with four Nimble stats); if the linter rejects the 5e character, do not lint it in the test (the engine test does not need lint), and ledger that the character schema is system-specific (a known gap for Phase 3).
- [ ] **Step 4: Run** `npm test && npm run lint-docs`.
- [ ] **Step 5: Commit** — `git commit -m "cli: sheet command prints a character with provenance; 5e insurance engine tests"`

---

### Task 10: Docs: spec status, design doc, README for the engine

**Files:**
- Modify: `docs/spec/expressions.md` (status line → "implemented; corpus in `conformance/expressions.json`"), `docs/spec/effects-and-resources.md` (status), `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (§12 step 2–3 done; §10 engine file map), `README.md` (how to run `npm test`, `npm run lint-docs`, `npx tsx src/cli.ts sheet scott.characters.pip systems/nimble examples/nimble`; one paragraph on what the engine does and does not do).
- [ ] **Step 1:** Make the edits. Each doc names the real file paths from Tasks 1–9.
- [ ] **Step 2:** `npm test` still green; `git commit -m "docs: Phase 2 status — grammar, engine, Nimble module implemented"`.

---

## Self-review notes

- Spec coverage: §7 grammar (T1–T3), §6.1–6.3 fold/lookups/stacking (T4), §5.3 + §11 assembly and choices (T5), §6.4 resources and moments (T7), §4.1 system module (T8), §6.6 provenance (T4, T6, T9), §7.3 torture items 1, 3, 4(pool), 5, 6, 7, 9, 10, 12, 13(tier), 14, 15 exercised by T6–T9 tests. Not exercised: item 8 (cast-time cost modifiers; engine gap, documented) and 11's weapon half (documented gap).
- Type consistency: `Value`/`formatValue` from `src/expr/value.ts` used in T4, T6, T8; `Attachment` from T5 in T6; `Sheet` from T6 in T7–T9; `State`/`applyMoment` from T7 in T8.
- Proportion: tests are the bulk; implementation bodies are left to the executor except where the spec pins algorithms (fold order, damage order).
