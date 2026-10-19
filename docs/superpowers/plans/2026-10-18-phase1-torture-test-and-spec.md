# Phase 1: Torture Test and Grammar Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the go/no-go packet for the format: fifteen 5e rules written as content documents in the proposed syntax, a draft grammar spec, a minimal 5e SRD system template, and a linter that proves the documents are well-formed and reference only real variables.

**Architecture:** This phase is steps 1 and 2 of the design doc's order of work, up to Scott's gate. No expression evaluator is built. A small TypeScript package parses Markdown+frontmatter documents, builds a variable registry from system-template documents, and lints content documents (effect shape, target existence, identifier references inside `{{ }}` and `when`). The torture-test documents, the demo spell, and the sample character are the linter's fixtures and the gate's exhibits.

**Tech Stack:** TypeScript 5, Node 20 (on PATH via nvm), npm, vitest, `yaml` package. No framework. No parser generator yet (the grammar is specified in prose and PEG in this phase; implementation is Phase 2).

**Spec:** `docs/superpowers/specs/2026-10-18-open-rules-format-design.md`. Sections referenced below by number.

## Global Constraints

- Documents are Markdown with YAML frontmatter; frontmatter delimited by `---` lines at the top of the file (spec 5.1).
- Reserved properties: `id`, `type`, `system`, `name`, `effects`, `requires`, `tags`. All other properties are the creator's and must be preserved, never rejected (spec 5.1).
- Document ids are dotted lowercase: `^[a-z0-9-]+(\.[a-z0-9-]+)+$` (spec 9).
- Variable ids are dotted lowercase: `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$`; aliases are `^[A-Z][A-Z0-9_]*$` (spec 6.5).
- Effect operation keys, exactly one per effect: `base`, `add`, `mul`, `min`, `max`, `set` (spec 6.2).
- Unknown variable, unknown target, duplicate variable id: errors with file path and location. Never resolve to zero silently (spec 6.5, anti-goals).
- Inline expressions are `{{ expr }}` or `{{ expr | display text }}` (spec 5.2).
- Conditions use words `and`, `or`, `not` (spec 7.2).
- Repo is standalone `scottTomaszewski/orf`; Go prototype tagged `prototype-2023` and removed from `main` (spec 10). Commit messages carry no AI attribution (Scott's global rule).
- 5e content is SRD 5.1 (CC-BY-4.0); the template cites it.

## Review Focus

Inputs the spec implies but no task's test would otherwise exercise:

1. A body containing a `---` horizontal rule must not be mistaken for a second frontmatter block; a file with no frontmatter is a lint error, not a crash. (Task 2)
2. An effect with zero or two operation keys is an error naming the effect's index. (Task 4)
3. An identifier that is an alias (`DEX`) or `this.`-scoped resolves; a near-miss (`wis.modifier` for `wis.mod`) is an error that names the file, the expression, and the identifier. (Task 4)
4. The same variable id declared in two template documents is an error naming both files. (Task 3)
5. Unbalanced or nested `{{` in a body is an error with the line number. (Task 4)

---

### Task 1: Repo reset and TypeScript scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore` (replace), `README.md`, `src/smoke.test.ts`
- Delete: all Go sources and data (`*.go`, `go.mod`, `go.sum`, `main`, `bob.json`, `expected_bob.json`, `rules/`, `log/`, `engine/`, `evaluate/`, `functions/`, `orf/`, `util/`)

**Interfaces:**
- Produces: `npm test` runs vitest; `npm run lint-docs` is wired in Task 5.

- [ ] **Step 1: Tag the prototype**

```bash
cd /home/scott/code/orf && git tag prototype-2023 545bc86 && git push origin prototype-2023
```

- [ ] **Step 2: Remove Go sources from main**

```bash
git rm -r -q '*.go' go.mod go.sum main bob.json expected_bob.json rules log engine evaluate functions orf util
```
Expected: `git ls-files` shows only `LICENSE`, `.gitignore`, `docs/`.

- [ ] **Step 3: Scaffold**

`package.json`: name `orf` (placeholder), `"type": "module"`, scripts `test: vitest run`, `lint-docs: tsx src/cli.ts systems examples`, devDependencies `typescript ^5`, `vitest ^2`, `tsx ^4`, `@types/node ^20`; dependencies `yaml ^2`. `tsconfig.json`: `strict`, `module: NodeNext`, `target: ES2022`, `rootDir: src`, `noEmit: true`. `.gitignore`: `node_modules/`, `dist/`, `.superpowers/`. `README.md`: three lines: placeholder name, one-sentence purpose, pointer to the design doc.

- [ ] **Step 4: Smoke test**

`src/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => expect(1 + 1).toBe(2));
```
Run: `npm install && npm test`. Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: archive Go prototype under tag prototype-2023; TypeScript scaffold"
```

---

### Task 2: Document parser

**Files:**
- Create: `src/document.ts`, `src/document.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Document { path: string; frontmatter: Record<string, unknown>; body: string; bodyStartLine: number; }
  export class DocumentError extends Error { constructor(public path: string, message: string, public line?: number) }
  export function parseDocument(text: string, path: string): Document;   // throws DocumentError
  export function loadDocuments(dirs: string[]): Document[];              // recursive, *.md only, sorted by path
  ```

- [ ] **Step 1: Write failing tests**

```ts
test("parses frontmatter and body", () => {
  const d = parseDocument("---\nid: a.b\ntype: spell\n---\nHello\n", "x.md");
  expect(d.frontmatter).toEqual({ id: "a.b", type: "spell" });
  expect(d.body).toBe("Hello\n");
  expect(d.bodyStartLine).toBe(5);
});
test("a horizontal rule in the body is body, not frontmatter", () => {
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

- [ ] **Step 2: Run, expect failure** (`npm test`, "Cannot find module ./document").

- [ ] **Step 3: Implement** `parseDocument` with a line-based splitter (first line must be `---`; frontmatter ends at the next line that is exactly `---`); parse with `yaml.parse`; empty frontmatter object if the block is empty. `loadDocuments` uses `fs.readdirSync` recursively.

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** `feat: document parser for markdown+frontmatter`

---

### Task 3: Registry from system-template documents

**Files:**
- Create: `src/registry.ts`, `src/registry.test.ts`

**Interfaces:**
- Consumes: `Document` from Task 2.
- Produces:
  ```ts
  export interface VariableDef { id: string; name: string; type: "integer"|"dice"|"boolean"|"text"|"list"; default?: unknown; formula?: string; alias?: string; ops?: string[]; fold?: Record<string,string>; rounding?: "floor"|"ceil"|"round"|"none"; declaredIn: string; }
  export interface TableDef { id: string; columns: string[]; rows: unknown[][]; declaredIn: string; }
  export interface Registry { variables: Map<string, VariableDef>; aliases: Map<string, string>; tables: Map<string, TableDef>; predicates: Set<string>; functions: Set<string>; }
  export function buildRegistry(docs: Document[]): { registry: Registry; diagnostics: Diagnostic[] };
  export interface Diagnostic { path: string; message: string; line?: number; }
  ```
- Template document shapes the builder reads (these are the spec 8 declarations, pinned here):
  - `type: variables` → `variables: VariableDef[]` (without `declaredIn`).
  - `type: table` → `columns: string[]`, `rows: unknown[][]`; table id = document `id`.
  - `type: predicates` → `predicates: [{id, name, args: string[]}]`.
  - `type: functions` → `functions: [{id, name, args: string[]}]` (built-ins `floor ceil round max min abs if table` are always present).
  - Content documents may declare `variables: [...]` too (spec 6.5 "content may declare new variables"); those are included.

- [ ] **Step 1: Write failing tests**

```ts
test("collects variables, aliases, tables, predicates", () => {
  const { registry, diagnostics } = buildRegistry([varsDoc, tableDoc, predDoc]);
  expect(diagnostics).toEqual([]);
  expect(registry.variables.get("dex.mod")?.name).toBe("your Dexterity modifier");
  expect(registry.aliases.get("DEX")).toBe("dex.mod");
  expect(registry.tables.get("srd5e.tables.spell-slots")?.columns[0]).toBe("caster_level");
  expect(registry.predicates.has("equipped")).toBe(true);
  expect(registry.functions.has("floor")).toBe(true);
});
test("duplicate variable id across two documents names both files", () => {
  const { diagnostics } = buildRegistry([docWith("a.md", "ac.base"), docWith("b.md", "ac.base")]);
  expect(diagnostics[0].message).toMatch(/ac\.base.*a\.md.*b\.md/);
});
test("malformed variable id is a diagnostic", () => {
  const { diagnostics } = buildRegistry([docWith("a.md", "AC.Base")]);
  expect(diagnostics[0].message).toMatch(/AC\.Base/);
});
```

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** `buildRegistry`. Validate ids against the Global Constraints regexes; validate `ops` ⊆ the six operation keys.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: variable registry from system-template documents`

---

### Task 4: Expression reference extraction and lint rules

**Files:**
- Create: `src/expr-refs.ts`, `src/expr-refs.test.ts`, `src/lint.ts`, `src/lint.test.ts`

**Interfaces:**
- Consumes: `Document`, `Registry`, `Diagnostic`.
- Produces:
  ```ts
  export function extractInlineExpressions(body: string, startLine: number): { expr: string; display?: string; line: number }[]; // throws on unbalanced/nested {{
  export function extractReferences(expr: string): string[]; // identifiers not followed by "(", excluding keywords and, or, not, true, false
  export function lintDocument(doc: Document, registry: Registry): Diagnostic[];
  export function lintAll(docs: Document[], registry: Registry): Diagnostic[];
  ```
- Lint rules, each producing one `Diagnostic` with `path` and, where known, `line`:
  1. `id` present and matches the document-id regex; `type`, `system`, `name` present on every document type.
  2. Every `effects[i]` has `target` (string) and exactly one op key; `when`, `source` if present are strings. Message includes `effects[i]`.
  3. `target` resolves in `registry.variables` (aliases allowed, resolved to the canonical id). If the target's `ops` is declared, the op must be in it.
  4. Every identifier from `extractReferences` on each effect's op value and `when`, on every `{{ }}` in the body, and on every string property containing `{{ }}` must resolve: canonical id, alias, `this.<anything>`, a table id (as first arg of `table(...)`), or a predicate/function name. Message: `unknown identifier "wis.modifier" in "{{ 10 + dex.mod + wis.modifier }}"`.
  5. `type: character` documents: `abilities` object with six integer keys `str dex con int wis cha`; `classes[]` entries `{id, level}`; `equipment[]` entries `{id, equipped: boolean}`; `features`, `spells` arrays of strings. Referenced ids must exist among the loaded documents' `id`s.
  6. `system` is a string. If any loaded document has `type: package`, `system` must equal one of their `id`s (Task 7 adds `srd5e`; Task 4's own fixtures include a one-line package doc so this rule is tested here).

- [ ] **Step 1: Write failing tests**

```ts
test("extracts expressions with display override and line numbers", () => {
  const xs = extractInlineExpressions("a\n{{ 1d10 + spell.mod }} b {{ spell.save_dc | your spell save DC }}\n", 5);
  expect(xs).toEqual([
    { expr: "1d10 + spell.mod", line: 6 },
    { expr: "spell.save_dc", display: "your spell save DC", line: 6 },
  ]);
});
test("unbalanced braces throw with line", () => {
  expect(() => extractInlineExpressions("x\n{{ dex.mod\n", 1)).toThrow(/line 2/);
});
test("references skip functions, keywords, numbers and dice", () => {
  expect(extractReferences("floor((str.score - 10) / 2) + 1d8 and not equipped(armor)")).toEqual(["str.score", "armor"]);
});
test("effect with two ops is an error naming the index", () => {
  const d = lintDocument(docWithEffects([{ target: "ac.bonus", add: 1, set: 2 }]), reg);
  expect(d[0].message).toMatch(/effects\[0\].*exactly one/);
});
test("alias and this. resolve; near-miss is named", () => {
  const d = lintDocument(docWithBody("{{ DEX }} {{ this.max_dex_bonus }} {{ wis.modifier }}"), reg);
  expect(d).toHaveLength(1);
  expect(d[0].message).toMatch(/wis\.modifier/);
});
test("op not allowed on target", () => {
  const d = lintDocument(docWithEffects([{ target: "ac.base", add: 1 }]), regWhereAcBaseOpsIsBaseOnly);
  expect(d[0].message).toMatch(/add.*ac\.base/);
});
```
Note on the third test: `armor` is a predicate argument. Predicate arguments are a template-declared vocabulary (spec 8); for this phase the linter treats an identifier appearing as a predicate's argument as resolved if it is listed in that predicate's `args` in the registry. Adjust the test fixture's predicate `equipped` to have `args: ["armor", "shield", "weapon"]`, and assert `armor` is **not** reported by `lintDocument` even though `extractReferences` returns it.

- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.** `extractReferences` tokenizes with one regex pass: strip dice `\b\d+d\d+(kh|kl|dh|dl)?\d*\b`, numbers, and quoted strings; take `[A-Za-z_][A-Za-z0-9_.]*` not followed by `\s*\(`; drop keywords. Predicate-argument handling: a second pass records `name(args)` pairs so the linter can accept declared args.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: lint rules for effects, targets, and expression references`

---

### Task 5: CLI

**Files:**
- Create: `src/cli.ts`, `src/cli.test.ts`

**Interfaces:**
- Consumes: `loadDocuments`, `buildRegistry`, `lintAll`.
- Produces: `npx tsx src/cli.ts <dir>...` prints one line per diagnostic as `path:line: message`, sorted by path, exits 1 if any; prints `OK: N documents, V variables` and exits 0 otherwise. `DocumentError`s are reported as diagnostics, not stack traces.

- [ ] **Step 1: Test** via `child_process.execFileSync` on two fixture dirs under `src/__fixtures__/` (one clean, one with an unknown identifier); assert exit code and that the error line matches `/bad\.md:\d+: unknown identifier/`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** `main(argv: string[]): number` and call it when run directly.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** `feat: orf lint CLI`

---

### Task 6: Expression and condition grammar spec (draft)

**Files:**
- Create: `docs/spec/expressions.md`

No code. This is the syntax the torture-test documents use; it is what the gate judges. Pin exactly:

- [ ] **Step 1: Write the spec** with these sections and values:
  - **Lexical:** integers; dice `NdM` with optional `kh N | kl N | dh N | dl N`; identifiers (dotted lowercase) and aliases (upper); `this.` prefix; strings in double quotes only as function arguments.
  - **Operators**, lowest to highest precedence: `or`; `and`; `not`; comparison `< <= > >= == !=`; `+ -`; `* /`; unary `-`; call; parentheses. `/` on integers rounds per the target variable's `rounding` (5e: floor). Division with dice operands is an error.
  - **Functions:** `floor(x) ceil(x) round(x) abs(x) max(a, b, ...) min(a, b, ...) if(cond, a, b) table(id, rowKey, column)`. System templates may add helpers (`type: functions`), defined as expressions over this grammar with named args.
  - **Predicates** (boolean, template-declared): `equipped(kind)`, `has(id)`, `proficient(skill)`, `level(class)` returns integer, `wearing(kind)` is **not** defined (one word per concept).
  - **Inline form:** `{{ expr }}`, `{{ expr | display text }}`. Symbolic rendering substitutes each identifier with its registry `name`; dice and literals print as written; `+ -` print with spaces. Resolved rendering substitutes values, folds arithmetic between literals, leaves dice.
  - **Evaluation phases:** compile (variables → values, dice symbolic) and roll (consumer-side). Reader uses symbolic; Sheet uses compile.
  - **Effects grammar:** the YAML shape from spec 6.2 restated, with `when` as a predicate expression, the six ops, `source`, `duration`, `transfer: equipped | carried | always`.
  - **Fold:** spec 6.3 formula verbatim; stacking policy spec 6.4.
  - **Errors:** unknown identifier, unknown target, type mismatch, division by dice, cycle (members named). All carry path and position.
  - **Deliberately absent:** loops, assignment, user-defined functions in content, string manipulation, JavaScript.
  - A PEG block for the expression grammar (≈25 rules).

- [ ] **Step 2: Commit** `docs: draft expression and condition grammar`

---

### Task 7: Minimal 5e SRD system template

**Files:**
- Create: `systems/srd5e/package.md`, `systems/srd5e/abilities.md`, `systems/srd5e/core.md`, `systems/srd5e/combat.md`, `systems/srd5e/skills.md`, `systems/srd5e/spellcasting.md`, `systems/srd5e/tables/spell-slots.md`, `systems/srd5e/tables/multiclass-spell-slots.md`, `systems/srd5e/predicates.md`, `systems/srd5e/content-types.md`

Only what the torture test (spec 7.4) and the demo spell need. All `system: srd5e`, ids `srd5e.system.<file>`.

- [ ] **Step 1: Write the documents.**
  - `package.md`: `id: srd5e`, `type: package`, `label: "SRD 5.1"`, `license: CC-BY-4.0`, `members: [...]` listing every other id.
  - `abilities.md` (`type: variables`): for each of `str dex con int wis cha`: `<a>.score` (integer, default 10, alias e.g. `STR_SCORE`) and `<a>.mod` (formula `floor((<a>.score - 10) / 2)`, alias `STR`, name "your Strength modifier").
  - `core.md`: `level` (integer input supplied by the character document; there is no wildcard sum in the grammar, and a Phase 2 lint checks it equals the sum of class levels), `prof` (formula `2 + floor((level - 1) / 4)`, alias `PROF`, name "your proficiency bonus"), `hp.max` (fold add=sum, ops `[add]`), `speed` (fold base=max add=sum, ops `[base, add]`, default base 30), `class.<c>.level` for `wizard monk barbarian sorcerer fighter cleric bard rogue` (integer inputs, default 0).
  - `combat.md`: `ac.base` (ops `[base]`, fold base=max, default 10), `ac.bonus` (ops `[add]`), `ac.shield` (ops `[add]`), `ac` (formula `ac.base + ac.bonus + ac.shield`, alias `AC`, name "your Armor Class", rounding floor), `armor.max_dex` (ops `[min]`; `ac.base` formulas reference it), saves `save.<a>` for six abilities (formula `<a>.mod + if(proficient(save.<a>), prof, 0)`, ops `[add]`).
  - `skills.md`: the 18 SRD skills as `skill.<name>` (formula `<a>.mod + skill.<name>.prof_bonus`, name "your <Skill> modifier") and `skill.<name>.prof_bonus` (integer, default 0, ops `[base, add]`, fold base=max). Proficiency contributes `base: prof`, expertise `base: 2 * prof`, Jack of All Trades `base: floor(prof / 2)`; max picks the best.
  - `spellcasting.md`: `spell.ability_mod` (ops `[base]`, name "your spellcasting ability modifier", alias `SPELL_MOD`), `spell.attack` (formula `prof + spell.ability_mod`, alias `SPELL_ATTACK`, name "your spell attack bonus"), `spell.save_dc` (formula `8 + prof + spell.ability_mod`, alias `SPELL_SAVE_DC`, name "your spell save DC"), `caster.level` (ops `[add]`, name "your caster level"), `spell.slots.<1..9>` (formula `table(srd5e.tables.multiclass-spell-slots, caster.level, <n>)`).
  - `tables/spell-slots.md` and `tables/multiclass-spell-slots.md` (`type: table`, `columns: [caster_level, 1, 2, ..., 9]`, 20 rows from the SRD).
  - `predicates.md` (`type: predicates`): `equipped(kind)` args `[armor, shield, weapon, light_armor, medium_armor, heavy_armor]`; `has(id)`; `proficient(thing)` args: the 18 skills and `save.<a>`; `level(class)` args: the eight classes.
  - `content-types.md` (`type: content-types`): `spell` with suggested properties `level school casting_time range components duration`; `feat`; `feature` (with `class`); `item` with `equippable`, `kind`; `armor` with `kind base_ac max_dex strength_requirement`; `character`.

- [ ] **Step 2: Lint** `npx tsx src/cli.ts systems`. Expected: `OK`. Fix any id/alias mistakes.
- [ ] **Step 3: Commit** `feat(srd5e): minimal system template for the torture test`

---

### Task 8: Torture-test documents, demo spell, sample character

**Files:**
- Create: `examples/torture-test/01-monk-unarmored-defense.md` … `15-fighting-style-dueling-and-defense.md` (one per spec 7.4 item, numbered), `examples/demo/ember-lash.md`, `examples/demo/mira.md`, `examples/demo/fire-bolt.md`, `examples/srd/items/{leather-armor,chain-mail,plate,shield}.md`, `examples/srd/features/{wizard-spellcasting,bless}.md` as needed by the fixtures.

Each torture-test document: frontmatter per spec 5.1; body = the SRD rule text (CC-BY) followed by an `## Encoding notes` section stating what the effects say in plain words. Effects per the Task 6 grammar. Pinned encodings for the non-obvious ones (the rest follow from the template):

- 01 Monk: `target: ac.base`, `base: 10 + dex.mod + wis.mod`, `when: not equipped(armor) and not equipped(shield)`, `source: unarmored-defense`.
- 02 Barbarian: same with `con.mod`, `when: not equipped(armor)`.
- 03 Draconic Resilience: `ac.base base: 13 + dex.mod when: not equipped(armor)`; plus `hp.max add: level`.
- 04 Mage Armor: `ac.base base: 13 + dex.mod when: not equipped(armor)`, `source: mage-armor`, `duration: 8 hours`, `transfer: always`. Body prose uses `{{ 13 + dex.mod | 13 + the target's Dexterity modifier }}`.
- 05 Armor: `armor` content type; leather `ac.base base: 11 + dex.mod`, chain mail `ac.base base: 16`, `transfer: equipped`; medium armor (scale mail) `base: 14 + min(dex.mod, 2)`; strength requirement is a property (`strength_requirement: 13`) plus `speed add: -10 when: str.score < this.strength_requirement`.
- 06 Shield: `ac.shield add: 2`, `transfer: equipped`.
- 07 Feat: `ac.bonus add: 1`.
- 08 Jack of All Trades: for each skill, `skill.<n>.prof_bonus base: floor(prof / 2)`; `when: level(bard) >= 2`. (Fifteen-plus effects in one document is acceptable and is itself a data point for the gate: note it in the README.)
- 09 Expertise (fixed to Stealth and Perception): `skill.stealth.prof_bonus base: 2 * prof`, same for perception.
- 10 Multiclass slots: wizard class feature `caster.level add: class.wizard.level`; paladin-style half caster `caster.level add: floor(class.paladin.level / 2)`; slots come from the template formula. Include a character with wizard 3 / cleric 2 in the encoding notes with the expected `spell.slots.2` = 3.
- 11 Proficiency bonus: no content needed; document shows the template formula and a `{{ prof }}` in prose.
- 12 Speed: Mobile feat `speed add: 10`; a race document `speed base: 25`; monk Unarmored Movement `speed add: 10 when: not equipped(armor) and not equipped(shield) and level(monk) >= 2`.
- 13 Bless twice: two documents `bless.md` (effect `save.str add: 1d4` … for the six saves, `source: bless`) and an encoding note that the stacking policy `same-source: highest` reduces two Bless instances to one. Attack-roll bonus is omitted (attacks are out of phase).
- 14 HP max: rolled-per-level HP needs per-level state (deferred with choices), so encode the fixed-average rule: wizard class doc `hp.max add: 6 + (class.wizard.level - 1) * 4`; a `srd5e.rules.hp-constitution` document `hp.max add: con.mod * level`; Tough feat `hp.max add: 2 * level`. Note the deferral in the encoding notes.
- 15 Fighting styles: Defense `ac.bonus add: 1 when: equipped(armor)`; Dueling: pinned as a `when` on a `damage.melee_bonus` variable **declared in the document itself** (`variables: [{id: damage.melee_bonus, ...}]`) with `add: 2 when: equipped(weapon) and not equipped(shield)` and an encoding note that one-weapon-only cannot be expressed without attack objects. This gap is reported honestly in the README.
- `ember-lash.md`: spec 5.1 example verbatim, ids adjusted to `demo.homebrew.ember-lash`.
- `mira.md`: spec 5.3 example, with `features` including `srd5e.features.wizard.spellcasting` and that feature doc setting `spell.ability_mod base: int.mod` and `caster.level add: class.wizard.level`.

- [ ] **Step 1: Write the documents.**
- [ ] **Step 2: Lint** `npm run lint-docs`. Expected: `OK: N documents, V variables`. Every unknown identifier is a real mistake or a missing template variable; fix in the right place (template vs document).
- [ ] **Step 3: Add a vitest** `examples.test.ts` that runs `loadDocuments(["systems","examples"])`, `buildRegistry`, `lintAll` and asserts zero diagnostics, so CI guards the fixtures.
- [ ] **Step 4: Commit** `feat(examples): torture-test documents, demo spell, sample character`

---

### Task 9: Gate packet

**Files:**
- Create: `examples/torture-test/README.md`
- Modify: `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (status line only), `README.md`

- [ ] **Step 1: Write `examples/torture-test/README.md`** for Scott to judge from. For each of the 15 items: the rule in one line, the effects YAML block copied verbatim from the document, and one line of "what a homebrewer reads this as". Then a **Known gaps** section: Dueling's one-weapon condition, Great Weapon Fighting's reroll, per-level HP without choices, Jack of All Trades' verbosity. Then **What you're approving**: (1) this syntax is readable enough to proceed to the grammar implementation and engine; (2) the five-op fold model; (3) the identifier convention (dotted lowercase + aliases). Approve = Phase 2 plan is written; decline = redesign the named parts.
- [ ] **Step 2: Update** the design doc's status line to `Status: approved 2026-10-18; Phase 1 (torture test) in review` and add a `docs/spec/expressions.md` link under section 7.
- [ ] **Step 3: Run** `npm test && npm run lint-docs`. Expected: all pass, `OK`.
- [ ] **Step 4: Commit and push**

```bash
git add -A && git commit -m "docs: torture-test gate packet" && git push origin main
```

- [ ] **Step 5: Stop.** Scott judges the gate (spec 7.4). Phase 2 (grammar implementation, conformance corpus, engine) is planned only after approval.
