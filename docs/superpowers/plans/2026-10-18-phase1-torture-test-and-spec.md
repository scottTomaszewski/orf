# Phase 1: Torture Test and Grammar Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the go/no-go packet for the format: Nimble's hardest rules written as content documents in the proposed syntax, a draft grammar spec covering expressions, effects, resources, events and choice slots, a minimal Nimble system template, and a linter proving the documents are well-formed and reference only declared things.

**Architecture:** Steps 1 and 2 of the design doc's order of work, up to Scott's gate. No evaluator is built. A small TypeScript package parses Markdown+frontmatter, builds a registry (variables, resources, events, predicates, functions, tables, slots) from system-template documents, and lints content documents: effect shape, target existence, identifier references inside `{{ }}` and `when`, resource/refresh shape, character-document shape, choice-slot shape. The torture-test documents, the Nimble core template, and a sample character are the fixtures and the gate exhibits.

**Tech Stack:** TypeScript 5, Node 20 (on PATH via nvm), npm, vitest, `yaml`. No framework, no parser generator yet.

**Spec:** `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (Nimble-first revision). Research: `docs/superpowers/research/2026-10-18-nimble-recon.md` (page cites for every rule).

## Global Constraints

- Documents are Markdown with YAML frontmatter delimited by `---` at the top (spec 5.1).
- Reserved properties: `id`, `type`, `system`, `name`, `effects`, `grants`, `choices`, `variables`, `resources`, `requires`, `tags`, `version`. Others preserved, never rejected (spec 5.1).
- Document ids: `^[a-z0-9-]+(\.[a-z0-9-]+)+$`. Variable, resource, event, slot ids: `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$`. Aliases: `^[A-Z][A-Z0-9_]*$` (spec 6.5, 9).
- Effect ops, exactly one per effect: `base add mul min max set` (spec 6.1). `transfer` ∈ `always equipped carried`.
- Unknown variable, target, resource, event, slot, or duplicate id: error with path and line. Never silent zero (spec 6.5).
- Inline expressions `{{ expr }}` / `{{ expr | display }}`; logic words `and or not` (spec 5.2, 7.2).
- Nimble content lives under `systems/nimble/` and `examples/nimble/` with the license notice in `systems/nimble/LICENSE-NOTICE.md`; code is MIT (spec 10). The template encodes second-printing values with first-printing differences noted in a `printing_diff` property (spec 8).
- Repo `scottTomaszewski/orf`; Go prototype tagged `prototype-2023` and removed from `main`. Commit messages carry no AI attribution.

## Review Focus

1. A `---` horizontal rule in the body is body, not frontmatter; no frontmatter is a lint error, not a crash. (Task 2)
2. An effect with zero or two op keys errors naming `effects[i]`. (Task 4)
3. An alias (`DEX`), `key`, or `this.x` resolves; a near miss (`wound.max` for `wounds.max`) errors naming file, expression, identifier. (Task 4)
4. The same variable or resource id declared in two documents errors naming both files. (Task 3)
5. A `refresh.on` naming an undeclared event, or a `choices[].from` with neither `type` nor `options`, errors with the document id and index. (Task 4)

---

### Task 1: Repo reset and TypeScript scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore` (replace), `README.md`, `src/smoke.test.ts`
- Delete: all Go sources and data (`*.go`, `go.mod`, `go.sum`, `main`, `bob.json`, `expected_bob.json`, `rules/`, `log/`, `engine/`, `evaluate/`, `functions/`, `orf/`, `util/`)

**Interfaces:** Produces `npm test` (vitest) and the `lint-docs` script wired in Task 5.

- [ ] **Step 1: Tag the prototype**
```bash
cd /home/scott/code/orf && git tag prototype-2023 545bc86 && git push origin prototype-2023
```
- [ ] **Step 2: Remove Go sources**
```bash
git rm -r -q '*.go' go.mod go.sum main bob.json expected_bob.json rules log engine evaluate functions orf util
```
Expected: `git ls-files` shows only `LICENSE`, `.gitignore`, `docs/`.
- [ ] **Step 3: Scaffold.** `package.json`: name `orf`, `"type": "module"`, scripts `test: vitest run`, `lint-docs: tsx src/cli.ts systems examples`; devDependencies `typescript ^5`, `vitest ^2`, `tsx ^4`, `@types/node ^20`; dependencies `yaml ^2`. `tsconfig.json`: `strict`, `module: NodeNext`, `target: ES2022`, `noEmit: true`. `.gitignore`: `node_modules/`, `dist/`, `.superpowers/`. `README.md`: placeholder name, one-sentence purpose, link to the design doc, the Nimble attribution line.
- [ ] **Step 4: Smoke test** `src/smoke.test.ts` asserting `1 + 1 === 2`. Run `npm install && npm test`. Expected: 1 passed.
- [ ] **Step 5: Commit** `chore: archive Go prototype under tag prototype-2023; TypeScript scaffold`

---

### Task 2: Document parser

**Files:** Create `src/document.ts`, `src/document.test.ts`

**Interfaces:**
```ts
export interface Document { path: string; frontmatter: Record<string, unknown>; body: string; bodyStartLine: number; }
export class DocumentError extends Error { constructor(public path: string, message: string, public line?: number) }
export function parseDocument(text: string, path: string): Document;   // throws DocumentError
export function loadDocuments(dirs: string[]): Document[];              // recursive *.md, sorted by path
```

- [ ] **Step 1: Failing tests**
```ts
test("parses frontmatter and body", () => {
  const d = parseDocument("---\nid: a.b\ntype: spell\n---\nHello\n", "x.md");
  expect(d.frontmatter).toEqual({ id: "a.b", type: "spell" });
  expect(d.body).toBe("Hello\n");
  expect(d.bodyStartLine).toBe(5);
});
test("a horizontal rule in the body is body", () => {
  const d = parseDocument("---\nid: a.b\n---\nabove\n\n---\n\nbelow\n", "x.md");
  expect(d.body).toContain("---");
  expect(d.frontmatter).toEqual({ id: "a.b" });
});
test("missing frontmatter is a DocumentError naming the path", () => {
  expect(() => parseDocument("just text", "y.md")).toThrow(/y\.md.*frontmatter/);
});
test("invalid YAML is a DocumentError with a line", () => {
  expect(() => parseDocument("---\nid: [\n---\n", "z.md")).toThrow(DocumentError);
});
```
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** with a line splitter (first line `---`, block ends at the next line that is exactly `---`); `yaml.parse`; empty block → `{}`.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: document parser for markdown+frontmatter`

---

### Task 3: Registry from system-template documents

**Files:** Create `src/registry.ts`, `src/registry.test.ts`

**Interfaces:**
```ts
export interface Diagnostic { path: string; message: string; line?: number; }
export interface VariableDef { id: string; name: string; type: "integer"|"dice"|"boolean"|"text"|"list"; default?: unknown; formula?: string; alias?: string; ops?: string[]; fold?: Record<string,string>; rounding?: "floor"|"ceil"|"round"|"none"; declaredIn: string; }
export interface ResourceDef { id: string; max?: string; floor?: number; refresh: { on: string; to?: string|number; add?: number }[]; when?: string; declaredIn: string; }
export interface EventDef { id: string; args: string[]; declaredIn: string; }
export interface PredicateDef { id: string; name: string; args: string[]; declaredIn: string; }
export interface TableDef { id: string; columns: string[]; rows: unknown[][]; declaredIn: string; }
export interface SlotDef { id: string; declaredIn: string; }   // "<class-level id>.<slot>"
export interface Registry {
  variables: Map<string, VariableDef>; aliases: Map<string, string>;
  resources: Map<string, ResourceDef>; events: Map<string, EventDef>;
  predicates: Map<string, PredicateDef>; functions: Set<string>;
  tables: Map<string, TableDef>; slots: Map<string, SlotDef>;
  packages: Map<string, { id: string; label?: string; members: string[] }>;
  documentIds: Set<string>;
}
export function buildRegistry(docs: Document[]): { registry: Registry; diagnostics: Diagnostic[] };
```
Template document shapes the builder reads (spec 8, pinned here):
- `type: variables` → `variables: VariableDef[]`; `type: resources` → `resources: ResourceDef[]`; `type: events` → `events: EventDef[]`; `type: predicates` → `predicates: PredicateDef[]`; `type: functions` → `functions: [{id, args}]` on top of built-ins `floor ceil round abs max min if table dice`; `type: table` → `columns`, `rows`, id = document id; `type: package` → `label`, `members`.
- **Any** document may carry `variables:` and `resources:` (spec 6.5); they are included. `type: class-level` documents contribute slots: each `choices[i].slot` registers `<doc id>.<slot>`.
- Built-in events always present: `damage heal spend restore catch-breath make-camp safe-rest encounter-start encounter-end turn-end level-up` (spec 6.4).

- [ ] **Step 1: Failing tests**
```ts
test("collects variables, aliases, resources, events, predicates, tables, slots, packages", () => {
  const { registry, diagnostics } = buildRegistry([varsDoc, resDoc, evDoc, predDoc, tableDoc, classLevelDoc, pkgDoc]);
  expect(diagnostics).toEqual([]);
  expect(registry.variables.get("wounds.max")?.default).toBe(6);
  expect(registry.aliases.get("DEX")).toBe("dex");
  expect(registry.resources.get("hit_dice")?.refresh[0]).toEqual({ on: "safe-rest", to: "max" });
  expect(registry.events.has("gain-wound")).toBe(true);
  expect(registry.events.has("safe-rest")).toBe(true);           // built-in
  expect(registry.predicates.get("equipped")?.args).toContain("armor");
  expect(registry.tables.get("nimble.tables.hit-die-average")?.columns[0]).toBe("die");
  expect(registry.slots.has("nimble.classes.mage.level-4.spellshaper")).toBe(true);
  expect(registry.packages.get("nimble")?.members).toContain("nimble.system.core");
});
test("duplicate variable id across two documents names both files", () => {
  const { diagnostics } = buildRegistry([varDoc("a.md", "wounds.max"), varDoc("b.md", "wounds.max")]);
  expect(diagnostics[0].message).toMatch(/wounds\.max.*a\.md.*b\.md/);
});
test("duplicate resource id is a diagnostic", () => { /* same shape for resources */ });
test("malformed variable id is a diagnostic", () => {
  expect(buildRegistry([varDoc("a.md", "Wounds.Max")]).diagnostics[0].message).toMatch(/Wounds\.Max/);
});
```
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.** Validate ids against the regexes; `ops` ⊆ the six; `refresh[].on` is checked in Task 4 (needs the full registry).
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: registry of variables, resources, events, predicates, tables, slots`

---

### Task 4: Expression reference extraction and lint rules

**Files:** Create `src/expr-refs.ts`, `src/expr-refs.test.ts`, `src/lint.ts`, `src/lint.test.ts`, fixtures under `src/__fixtures__/`

**Interfaces:**
```ts
export function extractInlineExpressions(body: string, startLine: number): { expr: string; display?: string; line: number }[]; // throws DocumentError on unbalanced/nested {{
export function extractReferences(expr: string): { identifiers: string[]; calls: { name: string; args: string[] }[] };
export function lintDocument(doc: Document, registry: Registry): Diagnostic[];
export function lintAll(docs: Document[], registry: Registry): Diagnostic[];
```
`extractReferences`: strip dice (`\b\d*d\d+(kh|kl|dh|dl)?\d*\b`), numbers, double-quoted strings; identifiers are `[A-Za-z_][A-Za-z0-9_.]*` not followed by `(`; keywords `and or not true false` dropped; calls recorded with their raw argument identifiers.

Lint rules (each one `Diagnostic` with path and line where known):
1. `id` matches the document-id regex; `type`, `system`, `name` present. `system` (bare or `@N`) names a loaded package if any package is loaded.
2. `effects[i]`: `target` string; exactly one op key; `when`, `source` strings if present; `transfer` ∈ allowed set.
3. `target` resolves to a variable (alias allowed → canonical). If the variable declares `ops`, the op must be in it.
4. Every identifier in: effect op values and `when`; `{{ }}` in body; string properties containing `{{ }}`; variable `formula`; resource `max` and `when` — must resolve to a canonical id, alias, `key`/`secondary`, `this.*`, a state boolean (`dying bloodied raging concentrating`, declared as variables in the template), a predicate/function name, or a table id as first arg of `table(`. Predicate arguments must be in that predicate's declared `args`. Message: `unknown identifier "wound.max" in "{{ wound.max }}"`.
5. `resources[i].refresh[j].on` names a declared or built-in event; `to` is `"max"`, `0`, or a number; `add` is a number; `max` identifier resolves.
6. `type: character`: `stats` object with integer `str dex int wil`; `ancestry`, `background` document ids that exist; `classes[]` `{id, level}`; `levels[]` `{level, hp}`; `choices` keys are registered slots and values are arrays of existing document ids or stat names; `equipment[]` `{id, equipped: boolean}`; `state` object with keys that are declared resource ids or `conditions`.
7. `type: class-level`: `class` and `level` present; `grants[]` ids exist; `choices[i]` has `slot`, `count` (integer ≥ 1), and `from` with either `type` (+ optional `tags`) or `options`; `unique` ∈ `slot character` if present.
8. `requires` if present is an object of `{stat: integer}` or a list of document ids that exist.

- [ ] **Step 1: Failing tests**
```ts
test("extracts expressions with display override and line numbers", () => {
  const xs = extractInlineExpressions("a\n{{ 1d6 + str }} b {{ mana.max | your maximum mana }}\n", 5);
  expect(xs).toEqual([{ expr: "1d6 + str", line: 6 }, { expr: "mana.max", display: "your maximum mana", line: 6 }]);
});
test("unbalanced braces throw with line", () => {
  expect(() => extractInlineExpressions("x\n{{ dex\n", 1)).toThrow(/line 2/);
});
test("references skip functions, keywords, numbers, dice; calls carry args", () => {
  const r = extractReferences("(max(int, 0) * 3) + level and not equipped(armor) + dice(wil, 8)");
  expect(r.identifiers).toEqual(["int", "level", "wil"]);
  expect(r.calls).toEqual([{ name: "max", args: ["int"] }, { name: "equipped", args: ["armor"] }, { name: "dice", args: ["wil"] }]);
});
test("effect with two ops errors naming the index", () => {
  expect(lintDocument(withEffects([{ target: "wounds.max", add: 1, set: 2 }]), reg)[0].message).toMatch(/effects\[0\].*exactly one/);
});
test("alias, key, and this. resolve; near miss is named", () => {
  const d = lintDocument(withBody("{{ DEX }} {{ key }} {{ this.strength_requirement }} {{ wound.max }}"), reg);
  expect(d).toHaveLength(1);
  expect(d[0].message).toMatch(/wound\.max/);
});
test("op not allowed on target", () => {
  expect(lintDocument(withEffects([{ target: "defense.base", add: 1 }]), regWhereDefenseBaseIsBaseOnly)[0].message).toMatch(/add.*defense\.base/);
});
test("refresh on undeclared event", () => {
  expect(lintDocument(withResources([{ id: "x", refresh: [{ on: "long-rest", to: "max" }] }]), reg)[0].message).toMatch(/long-rest/);
});
test("choice without from.type or from.options", () => {
  expect(lintDocument(classLevelWith([{ slot: "s", count: 1, from: {} }]), reg)[0].message).toMatch(/choices\[0\].*from/);
});
test("character state key must be a declared resource", () => {
  expect(lintDocument(characterWith({ state: { ki: 3 } }), reg)[0].message).toMatch(/ki/);
});
```
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.** Fixtures: `src/__fixtures__/clean/` (a one-document package, a variables doc with `dex`, `key`, `wounds.max`, `defense.base` with `ops: [base]`, state booleans, a predicates doc with `equipped` args, a resources doc) and `src/__fixtures__/bad/bad.md` (unknown identifier) for Task 5.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: lint rules for effects, references, resources, characters, choice slots`

---

### Task 5: CLI

**Files:** Create `src/cli.ts`, `src/cli.test.ts`

**Interfaces:** `npx tsx src/cli.ts <dir>...` prints `path:line: message` per diagnostic sorted by path, exits 1 if any; else `OK: N documents, V variables, R resources` and exits 0. `DocumentError`s become diagnostics.

- [ ] **Step 1: Test** via `execFileSync` on `src/__fixtures__/clean` (exit 0, stdout starts `OK:`) and on `clean` + `bad` (exit 1, a line matching `/bad\.md:\d+: unknown identifier/`).
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** `main(argv: string[]): number`.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: lint CLI`

---

### Task 6: Grammar and format spec (draft)

**Files:** Create `docs/spec/expressions.md`, `docs/spec/effects-resources-events.md`, `docs/spec/choices.md`

No code. This is what the gate judges. Pin exactly:

- [ ] **Step 1: `expressions.md`.** Lexical: integers; dice `NdM` with optional `kh N | kl N | dh N | dl N`; `dice(count, sides)` function and `wil d8` sugar; identifiers (dotted lowercase), aliases (upper), `key`, `secondary`, `this.`; double-quoted strings only as arguments. Precedence low→high: `or`; `and`; `not`; `< <= > >= == !=`; `+ -`; `* /`; unary `-`; call; parentheses. `/` rounds per the target variable's `rounding`. Functions `floor ceil round abs max min if table dice`; template helpers as named-arg expressions. Predicates: `equipped(kind)`, `has(id)`, `level(class)`, `proficient(thing)`, and state booleans. Inline form and both renderings (symbolic uses registry names; resolved folds literals, leaves dice). Phases compile/roll. Errors. Deliberately absent. A PEG block (≈25 rules).
- [ ] **Step 2: `effects-resources-events.md`.** Effect record (spec 6.1 table), fold (6.2), stacking (6.3). Resource record (`id max floor refresh[] when`), refresh rule (`on to add`), built-in events with argument lists, template-declared events, and the **handler language**: a template `type: events` document declares handlers as ordered steps, e.g.
  ```yaml
  handlers:
    damage:
      - spend: temp_hp, amount: min(amount, temp_hp.current)
      - spend: hp, amount: amount - spent
      - when: hp.current == 0 and not dying
        fire: gain-wound, amount: 1
        set: dying
    gain-wound:
      - spend: wounds, amount: amount        # wounds count up; "spend" lowers remaining
    catch-breath:
      - repeat: hit_dice
        restore: hp, amount: roll(hit_die.size) + str + hit_die.heal.bonus
  ```
  State: `<resource>.current` readable in expressions; conditions as booleans. Content may contribute to variables handlers read (`hit_die.heal.bonus`) but may not declare handlers in this phase.
- [ ] **Step 3: `choices.md`.** Class-level document, `grants`, `choices[]` (`slot count from{type,tags}|from{options} unique effect`), character `choices` map keyed `<class-level id>.<slot>`, attachment semantics, retraining as edit, validation rules (count, unique, from), what is deferred.
- [ ] **Step 4: Commit** `docs: draft grammar, effects/resources/events, and choices specs`

---

### Task 7: Minimal Nimble system template

**Files:** Create `systems/nimble/LICENSE-NOTICE.md`, `systems/nimble/package.md`, `systems/nimble/core.md`, `systems/nimble/skills.md`, `systems/nimble/combat.md`, `systems/nimble/resources.md`, `systems/nimble/events.md`, `systems/nimble/predicates.md`, `systems/nimble/content-types.md`, `systems/nimble/tables/hit-die-average.md`

Second-printing values; first-printing differences recorded in a `printing_diff` property on the affected document. Every rule cites a recon §/page in an `## Sources` body section.

- [ ] **Step 1: Write the documents.**
  - `LICENSE-NOTICE.md`: both required Nimble notices verbatim (spec 8).
  - `package.md`: `id: nimble`, `type: package`, `label: "Second printing (playtest Oct 2026)"`, `members: [...]`.
  - `core.md` (`type: variables`): `str dex int wil` (integer, default 0, aliases `STR DEX INT WIL`, names "your Strength" etc.); `key` and `secondary` (declared as variables with `fold: {base: max}`, ops `[base]`; class documents contribute `base: int` etc.); `level` (integer input); `hp.max` (ops `[add]`, name "your maximum Hit Points"; the character's `levels[].hp` entries contribute `add`); `wounds.max` (default 6, ops `[add, set]`, name "your maximum Wounds"); `hit_dice.max` (formula `level`, ops `[add]`); `hit_die.size` (type integer, ops `[base]`, fold base=max; class contributes `base: 6` etc.); `hit_die.heal.bonus` (ops `[add]`, default 0); `speed` (default 6, ops `[add]`); `inventory.slots` (formula `10 + str`); `languages` (formula `1 + int`); `initiative.bonus` (formula `dex`, ops `[add]`); state booleans `dying bloodied raging concentrating in_wilderness ally_nearby` (type boolean, default false).
  - `skills.md`: 10 skills `skill.<name>` with formula `<stat> + skill.<name>.points`, `skill.<name>.points` integer input default 0; `skill.cap` default 10 with `printing_diff: {first: 12}`.
  - `combat.md`: `defense.base` (ops `[base]`, default formula contribution `dex` from the template itself, name "your Defense"), `defense.shield` (ops `[add]`), `defense` (formula `defense.base + defense.shield`, alias `DEFENSE`), saves `save.<stat>` (formula `<stat>`), `save.<stat>.advantage` (integer, ops `[add]`, +1 advantaged / −1 disadvantaged; class and ancestry contribute), `actions.max` (default 3), `dc.hero` (formula `10 + key`).
  - `resources.md` (`type: resources`): `hp` (max `hp.max`, floor 0, refresh safe-rest to max), `temp_hp` (refresh safe-rest to 0), `wounds` (max `wounds.max`, refresh safe-rest add −1), `hit_dice` (max `hit_dice.max`, refresh safe-rest to max), `actions` (max `actions.max`, refresh turn-end to max).
  - `events.md` (`type: events`): declares `gain-wound full-hp rage-end` and handlers for `damage heal spend restore catch-breath make-camp safe-rest encounter-start encounter-end turn-end level-up` per the Task 6 handler language, including Initiative → starting actions (`actions.current = if(initiative_roll >= 20, 3, if(initiative_roll >= 10, 2, 1))` on `encounter-start`).
  - `predicates.md`: `equipped(kind)` args `armor shield weapon light_armor cloth leather mail plate`; `has(id)`; `level(class)` args the 11 classes; `proficient(thing)` args `armor weapon` plus armor categories.
  - `content-types.md`: `ancestry`, `background` (`requires`), `class` (`key_stats`, `hit_die`, `starting_hp`, `saves`), `class-level`, `subclass`, `feature`, `spell` (`school tier cost actions range`), `item`, `armor` (`category defense dex_cap strength_requirement`), `weapon`, `boon`, `character`.
  - `tables/hit-die-average.md`: columns `die, average`; rows `4,3 / 6,4 / 8,5 / 10,7 / 12,8`.
- [ ] **Step 2: Lint** `npx tsx src/cli.ts systems`. Expected `OK`.
- [ ] **Step 3: Commit** `feat(nimble): minimal system template, second printing`

---

### Task 8: Torture-test documents, Mage and Berserker skeletons, sample character

**Files:** Create `examples/nimble/torture-test/01-…15-*.md` (one per spec 7.3 item), `examples/nimble/classes/mage.md`, `examples/nimble/classes/mage/level-{1..5}.md`, `examples/nimble/classes/berserker.md`, `examples/nimble/classes/berserker/level-{1..5}.md`, `examples/nimble/items/armor/{adventurers-garb,cheap-hides,chain-shirt,half-plate,wooden-buckler}.md`, `examples/nimble/ancestries/{dwarf,gnome,oozeling,dragonborn,human}.md`, `examples/nimble/backgrounds/{devoted-protector,wild-one}.md`, `examples/nimble/features/…` as the torture items need, `examples/nimble/characters/pip.md`, and for items 14–15 `examples/insurance-5e/` with a 12-line `systems/srd5e-mini/` template (just `dex.mod wis.mod ac.base save.*` and an `armor` predicate).

Each torture document: frontmatter per spec; body = the rule's text paraphrased (cite recon §/page) then `## Encoding notes` in plain words. Pinned encodings for the non-obvious:

- 01 Defense: template contributes `defense.base base: dex`; Adventurer's Garb `base: 2 + dex`; Cheap Hides `base: 3 + dex`; Chain Shirt `base: 9 + min(dex, 2)`, `requires: {str: 2}`; Half Plate `base: 14`, `requires: {str: 3}`; Wooden Buckler `defense.shield add: 2`. All `transfer: equipped`, `source: armor`.
- 02 Hit Die healing: lives in the template handler (`catch-breath` roll + str + bonus; `make-camp` max + str + bonus). Oozeling: `hit_die.heal.mode set: "max"` is **not** allowed (text set); pin instead a boolean variable `hit_die.heal.always_max` (template-declared, ops `[set]`) that the handler reads; Oozeling `set: true`. Wild One: `hit_die.heal.bonus add: key when: in_wilderness`.
- 03 Mage mana: `mage.md` declares `resources: [{id: mana, max: mana.max, refresh: [{on: safe-rest, to: max}], when: level(mage) >= 2}]` and `variables: [{id: mana.max, formula: "(max(int, 0) * 3) + level"}]`.
- 04 Elemental Surge: a second resource `mana.surge` with `max: if(level(mage) >= 17, wil + 2d4, if(level(mage) >= 10, wil + 1d4, wil))`, `refresh: [{on: encounter-start, to: max}, {on: encounter-end, to: 0}]`; encoding note: `spend: mana` draws from `mana.surge` first (handler rule in the Mage doc is **not** allowed this phase; note the gap honestly).
- 05 Fury Dice: resource `fury_dice` with `max: key`, `refresh: [{on: rage-end, to: 0}]`; variable `fury_die.size` with formula `if(level(berserker) >= 17, 12, if(level(berserker) >= 13, 10, if(level(berserker) >= 9, 8, if(level(berserker) >= 6, 6, 4))))`; a feature granting `damage.str_attack.bonus add: dice(fury_dice.current, fury_die.size)`; encoding note on spend-for-mitigation.
- 06 Devoted Protector: `wounds.max add: 3 when: ally_nearby`.
- 07 Initiative: template handler only; the document is the Human ancestry `initiative.bonus add: 1` and encoding notes quoting the handler.
- 08 Mana cost: Methodical Spellweaver `spell.cost.modifier add: -2`, `spell.cost.min set: 1` **as declared variables on the Mage doc**; encoding note that cost application is a Phase 2 handler.
- 09 Event refreshes: Dragonborn resource `breath` `{max: 1, refresh: [{on: safe-rest, to: max}, {on: gain-wound, to: max}]}`; Gnome `{on: full-hp, to: max}`.
- 10 Level-up HP: `pip.md` `levels[]` with `source: roll|average`; encoding note that `hp.max` folds the entries.
- 11 Proficiency: `defend.cost` (template variable default 1) `add: 1 when: equipped(armor) and not proficient(armor)`; `crit.allowed set: false when: equipped(weapon) and not proficient(weapon)`.
- 12 Dying: handler rules in the template plus Berserker features `actions.dying_cap base: 2` (Enduring Rage) and `wound.damage_while_dying set: 1` (Unstoppable Force), both template-declared variables.
- 13 Spells known: Mage `spells.tier.max` formula `floor(level(mage) / 2)`; schools as `grants` of `nimble.spell-schools.fire` etc.; encoding note on "every spell in known schools up to tier".
- 14 5e competing bases, 15 Bless stacking: as in the prior plan revision, under `examples/insurance-5e/`.
- `pip.md`: spec 5.3 example, consistent with the Mage level documents written.

- [ ] **Step 1: Write the documents.**
- [ ] **Step 2: Lint** `npm run lint-docs`. Expected `OK`. Fix in the right place (template vs document).
- [ ] **Step 3: Add `src/examples.test.ts`** running `loadDocuments(["systems", "examples"])`, `buildRegistry`, `lintAll`, asserting zero diagnostics.
- [ ] **Step 4: Commit** `feat(examples): Nimble torture-test documents, class skeletons, sample character`

---

### Task 9: Gate packet

**Files:** Create `examples/nimble/torture-test/README.md`; modify the design doc status line, `README.md`

- [ ] **Step 1: Write the README** for Scott to judge from: per item, the rule in one line, the YAML copied verbatim, one line of "what a homebrewer reads this as". **Known gaps** section: surge-first mana spending, cost application, one-weapon Dueling (5e), anything that needed a template-declared helper variable rather than plain content. **What you're approving**: (1) this syntax is readable enough to build the grammar and engine against; (2) the six-op fold; (3) resources + events as first-class with the handler language owned by the template; (4) the slot model for choices; (5) identifier convention. Approve = Phase 2 plan; decline = redesign the named parts.
- [ ] **Step 2: Update** the design doc status to `Status: Nimble-first revision approved <date>; Phase 1 in review`, link the three spec files from section 7.
- [ ] **Step 3: Run** `npm test && npm run lint-docs`. Expected: pass, `OK`.
- [ ] **Step 4: Commit and push** `docs: torture-test gate packet`; `git push origin main`.
- [ ] **Step 5: Stop.** Scott judges the gate.
