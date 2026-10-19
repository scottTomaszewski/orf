# Phase 4: Creator-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the prototype toward the people whose adoption decides the project: name the format ORF, give creators a one-page guide, fix the Create bugs, clean up the desktop look, and add an in-sheet authoring form with live lint, so the demo clip can be recorded from the creator's seat.

**Architecture:** Authoring logic is pure and lives in the engine (`src/authoring.ts`): blank documents per content type, serialization back to Markdown + frontmatter, and draft linting against the loaded registry. The sheet adds a `Write` view that renders a form from the content-type's suggested properties, keeps a source textarea in sync both ways, lints on every change, and saves to the homebrew store. CSS changes are tokens-only in `steel.css` and layout in `app.css`.

**Tech Stack:** TypeScript 5 strict, Node 20, Vite 6, Preact 10 + signals, vitest + jsdom + @testing-library/preact, `yaml`.

**Spec:** `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (§1, §3 step 4, §4.1 "two authors", §5, §13). Scott's 2026-10-19 message: "the real value of the demo is tailoring it to content creators"; "orf is 100% md compliant - its a superset"; "setting the stats to balanced doesnt restrict which stats you can pick".

## Global Constraints

- Never add co-authoring trailers or AI attribution to commits or PR bodies.
- Nimble notices verbatim (design doc §8): "This app is free to use for anyone who already owns the content, is trying the system out, or cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by purchasing the official content at nimbleRPG.com." and "[Product Name] is an independent product published under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co."
- Product name (ruling, this plan): the format is **ORF (Open Rules Format)**; the sheet is **ORF Sheet for Nimble** in notices, shown as "ORF Sheet" in the header.
- Every ORF document stays a valid Markdown file with YAML frontmatter; the guide and spec state this as a guarantee.
- The engine computes every rule; `sheet/` never computes one. No handlers in content.
- Nimble 2.0.3 content only; no Nimble art or logos.

## Review Focus

1. A draft whose `id` collides with a bundled document: the Write view must show the duplicate-id diagnostic, not silently overlay (open format decision stays open; the sheet surfaces it). Test in Task 5.
2. A draft with a `target` that no variable declares: live lint names it and the form still saves if the creator insists (warnings never block; errors block Save). Test in Task 5.
3. Editing a homebrew file that fails to parse: the Write view opens in source mode with the error, never a blank form. Test in Task 5.
4. Balanced array after a value is placed: the other stats' selects lose that value; re-picking a stat frees its old value. Test in Task 3.
5. The rename must leave zero `[Product Name]` or "placeholder name" strings outside the design doc's history line. Test in Task 1 (grep as a test).

---

### Task 1: Name the format ORF

**Files:**
- Modify: `package.json`, `README.md`, `sheet/README.md`, `sheet/index.html`, `sheet/package.json`, `sheet/src/notice.ts`, `systems/nimble/LICENSE-NOTICE.md`, `examples/nimble/LICENSE-NOTICE.md`, `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` (status paragraph, §5.4, §13), `docs/spec/expressions.md` (intro line)
- Test: `src/naming.test.ts`

**Interfaces:**
- Produces: `PRODUCT_NAME = "ORF Sheet for Nimble"`, `SHORT_NAME = "ORF Sheet"` in `sheet/src/notice.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/naming.test.ts
import { execSync } from "node:child_process";
import { test, expect } from "vitest";
test("no naming placeholders remain", () => {
  const out = execSync(`grep -rIl --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.worktrees --exclude-dir=.superpowers -e "\\[Product Name\\]" -e "placeholder name" -e "Nimble Sheet" . || true`, { cwd: new URL("..", import.meta.url).pathname }).toString().trim().split("\n").filter(Boolean);
  expect(out.filter((p) => !p.startsWith("./docs/superpowers/"))).toEqual([]);
});
```

- [ ] **Step 2: Run it** — `npm test -- naming` — Expected: FAIL listing README.md, sheet/README.md, notice.ts, both LICENSE-NOTICE files, index.html.
- [ ] **Step 3: Apply the name.** `notice.ts`: `PRODUCT_NAME = "ORF Sheet for Nimble"`, add `SHORT_NAME = "ORF Sheet"`, `ATTRIBUTION` unchanged in shape. `app.tsx` header shows `SHORT_NAME`; `about.tsx` title shows `PRODUCT_NAME`. LICENSE-NOTICE files: `[Product Name]` → `ORF Sheet for Nimble`. README title "# ORF: Open Rules Format"; first paragraph explains the name and the Markdown guarantee ("Every ORF document is a Markdown file with YAML frontmatter. Any Markdown tool renders it; ORF adds meaning to a few keys and to `{{ }}` spans."). `sheet/README.md` title "# ORF Sheet for Nimble". `index.html` title "ORF Sheet". `package.json` description. Design doc: status paragraph says the name was settled 2026-10-19 (keep the history sentence, so the grep exclusion is only `docs/superpowers/`), §5.4 gains the superset guarantee paragraph, §13 removes "The project's name" and adds it under settled. `docs/spec/expressions.md` intro: one line stating the guarantee. Storage keys (`nimble-sheet:*`, IndexedDB `nimble-sheet`) stay: renaming them would orphan existing characters.
- [ ] **Step 4: Run** `npm test -- naming` — Expected: PASS. Run `cd sheet && npx tsc --noEmit -p . && npm test` — Expected: green (fix any test asserting "Nimble Sheet").
- [ ] **Step 5: Commit** `git commit -am "name: ORF (Open Rules Format); product ORF Sheet for Nimble; Markdown superset guarantee"`

### Task 2: Creator guide

**Files:**
- Create: `docs/guide/writing-content.md`
- Modify: `README.md` (link), `sheet/src/views/about.tsx` (link), `docs/spec/effects-and-resources.md` (link at top)
- Test: `src/guide.test.ts`

**Interfaces:**
- Produces: the three example documents in the guide are extracted and must parse and lint clean against the Nimble registry (the test is the contract).

- [ ] **Step 1: Write the failing test**

```ts
// src/guide.test.ts — every ```markdown block in the guide is a document that lints clean
import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import { parseDocument } from "./document.js";
import { loadDocuments } from "./document-fs.js";
import { buildRegistry } from "./registry.js";
import { lintDocument } from "./lint.js";
test("guide examples parse and lint clean", () => {
  const guide = readFileSync("docs/guide/writing-content.md", "utf8");
  const blocks = [...guide.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  expect(blocks.length).toBeGreaterThanOrEqual(3);
  const base = loadDocuments(["systems/nimble", "examples/nimble"]);
  const drafts = blocks.map((b, i) => parseDocument(b, `guide/example-${i}.md`));
  const { registry, diagnostics } = buildRegistry([...base, ...drafts]);
  expect(diagnostics).toEqual([]);
  for (const d of drafts) expect(lintDocument(d, registry)).toEqual([]);
});
```

- [ ] **Step 2: Run** `npm test -- guide` — Expected: FAIL (ENOENT).
- [ ] **Step 3: Write the guide.** One page, ~150 lines. Sections: *What a document is* (frontmatter + body; renders anywhere Markdown does); *The five keys* (`id`, `type`, `name`, `effects`, prose; `resources` as the sixth when needed); *Effects in one table* (target, one of add/base/mul/at_least/at_most/set, optional `when`, optional `note`); *Three worked examples*: an ancestry (`nimble.ancestries.ratfolk`, wounds.max add 1 with a note), a background with a conditional effect (`when: in_wilderness`) and `{{ }}` prose with a display form, an item with `when: equipped` and a resource that refreshes on `safe-rest`; *Where values come from* (link to `systems/nimble/core.md`, `combat.md`, `resources.md`: how to find a target name); *Checking your work* (the sheet's Content → Problems, the CLI lint command); *What you cannot write* (no procedures; link to design §4.1). Examples use ids under `nimble.*` that do not exist in the bundle.
- [ ] **Step 4: Run** `npm test -- guide` — Expected: PASS. Link it from README "Writing content" and About.
- [ ] **Step 5: Commit** `git commit -am "docs: creator guide (five keys, three worked examples, linted by test)"`

### Task 3: Create view fixes

**Files:**
- Modify: `sheet/src/views/create.tsx`
- Test: `sheet/src/views/create.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
test("placing a Balanced value removes it from the other stats' options", async () => {
  // render CreateView with realContent(); click the Balanced array radio
  // select STR = +2; expect DEX's options to be ["—", "+1", "0"] (two +1 remain as one option; +2 gone)
  // select DEX = +1; expect INT's options to still include "+1" (one +1 left), not "+2"
  // select INT = +1; expect WIL's options to be ["—", "0"]
  // change STR to "0"; expect WIL's options to include "+2" again
});
```

- [ ] **Step 2: Run** `cd sheet && npm test -- create` — Expected: FAIL (DEX still offers +2).
- [ ] **Step 3: Implement.** Each stat's select lists `remaining(array, placed, s)`: the multiset of array values minus the values placed on *other* stats, deduplicated for display, plus the stat's own current value. Pure helper `remainingValues(values: number[], placed: Record<Stat,string>, stat: Stat): number[]` exported from `create.tsx`.
- [ ] **Step 4: Run** `npm test -- create` — Expected: PASS; whole sheet suite green.
- [ ] **Step 5: Commit** `git commit -am "create: stat placement offers only unused array values"`

### Task 4: Visual pass (desktop)

**Files:**
- Modify: `sheet/src/styles/steel.css`, `sheet/src/styles/app.css`, `sheet/src/app.tsx` (header markup), `sheet/src/views/play.tsx` (panel grid classes only), `sheet/src/views/create.tsx` (picker cards)
- Test: existing suites (CSS is configuration; no new test), `npm run build`

- [ ] **Step 1: Desktop layout.** `.app__main` gets `max-width: 64rem`; Play's panels use a new `.board` grid (`repeat(auto-fit, minmax(18rem, 1fr))`, resources first row spanning). Header: crest glyph ◆ + `SHORT_NAME` in Cinzel + a Petrona small-caps subtitle "for Nimble" + theme toggle; a 2px metal rule under it. Sidebar tabs on ≥800px get the metal gradient on the selected tab's left edge and `--fg-3` glyphs. Panel titles get a hairline rule (`border-bottom: 1px solid var(--fx-metal-faint)`) and `.steel-label` size .8rem. Pickers in Create become cards: `.pick` as a bordered block with the name in Petrona and the rules text revealed below the row (already) with a left-aligned "chosen" ◆. Buttons: uniform `.steel-btn` height; primary gets the metal gradient text color. Body copy max-width 70ch inside panels.
- [ ] **Step 2: Run** `cd sheet && npm test && npm run build` — Expected: green.
- [ ] **Step 3: Commit** `git commit -am "sheet: desktop layout, header, panel rules, picker cards"`

### Task 5: Authoring (engine side)

**Files:**
- Create: `src/authoring.ts`, `src/authoring.test.ts`

**Interfaces:**
- Produces:
  - `contentTypes(docs: Map<string, Document>): { id: string; properties: string[] }[]` from the `content-types` document (fallback: distinct `type` values seen, empty properties).
  - `blankDocument(type: string, system: string, properties: string[]): { frontmatter: Record<string, unknown>; body: string }` — `id: ""`, `type`, `system`, `name: ""`, each suggested property as `""`, `effects: []`.
  - `documentText(frontmatter: Record<string, unknown>, body: string): string` — `---\n<yaml>---\n<body>` using `yaml` with `flowCollectionPadding`, and effects/resources rows in flow style `{target: x, add: 1}` to match the repo's house style; omits properties whose value is `""`, `[]`, or `undefined` except `id/type/system/name/effects`.
  - `suggestedId(type: string, name: string, system: string, docs: Map<string, Document>): string` — `${system}.${plural(type)}.${slug(name)}` where plural comes from an existing document of that type's id segment (e.g. `nimble.ancestries.*`) and falls back to `${type}s`.
  - `lintDraft(text: string, path: string, loaded: Loaded): { doc?: Document; diagnostics: Diagnostic[] }` — parses (parse error → one diagnostic), rebuilds the registry over `loaded.files` minus any file at `path` plus the draft, returns registry diagnostics mentioning `path` plus `lintDocument(draft)`.
  - `targetSuggestions(registry: Registry): { id: string; name: string; type: string }[]` sorted by id; `momentSuggestions(registry: Registry): string[]`.

- [ ] **Step 1: Write failing tests** (`src/authoring.test.ts`, real content via `loadDocuments`): contentTypes returns ancestry with `[size, speed]`; blankDocument shape; documentText round-trips through `parseDocument` and renders an effect row in flow style on one line; suggestedId("ancestry","Ratfolk") → `nimble.ancestries.ratfolk`; lintDraft on a clean ratfolk → `[]`; on `target: wound.max` → one diagnostic naming the unknown target; on `id: nimble.ancestries.dwarf` → a duplicate-id diagnostic; on broken YAML → one diagnostic with `line`; lintDraft with `path` equal to an existing homebrew path does not report a duplicate against itself; targetSuggestions includes `wounds.max` with its name; momentSuggestions includes `safe-rest` and `gain-wound`.
- [ ] **Step 2: Run** `npm test -- authoring` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `src/authoring.ts`.
- [ ] **Step 4: Run** `npm test` — Expected: all green.
- [ ] **Step 5: Commit** `git commit -am "engine: authoring helpers (blank docs, serialization, draft lint, suggestions)"`

### Task 6: Write view (sheet side)

**Files:**
- Create: `sheet/src/views/write.tsx`, `sheet/src/views/write.test.tsx`
- Modify: `sheet/src/router.ts` (`{ view: "write"; path?: string }`), `sheet/src/app.tsx` (tab "Write" ✎ between Reader and Content; route case), `sheet/src/views/content.tsx` (each homebrew file row gets an "edit" link to `#/write/<encoded path>`; a "New document" button to `#/write`), `sheet/src/styles/app.css` (`.write` two-column ≥800px: form left, source + problems right)

**Interfaces:**
- Consumes: Task 5's API.
- Produces: route `#/write` (new) and `#/write/<path>` (edit homebrew file).

Behavior:
- Type select from `contentTypes`; changing the type on an unsaved blank re-blanks the form. Name input; id input auto-filled from `suggestedId` until the creator edits it. One input per suggested property (text; `{{ }}` allowed). Effects editor: rows of target (`<input list>` with `targetSuggestions`), op select (OPS), value input, `when` input, `note` input, remove button, "add effect". Resources editor: rows of id, max, refresh moment select (`momentSuggestions`) + `to: max`, "add resource". Body textarea.
- Source panel: a textarea holding `documentText(...)`; editing it re-parses and, when parse succeeds, refills the form (`doc.frontmatter` → form state, unknown keys kept in an "other properties" list rendered as key/value rows). Parse failure keeps the form as it was and shows the error; the source stays editable.
- Problems panel: `lintDraft` diagnostics on every change (debounce not needed; content is small). Errors block Save; warnings do not.
- Save: `homebrew.put([{ path, text }])` with `path = homebrew/<type>/<slug(id last segment)>.md` for new docs, the existing path for edits; then `reload()`, then navigate to `#/reader/<id>`. Download: a Blob link for the same text. "Open in Create" hint when type is ancestry/background/class.
- Opening `#/write/<path>` for a file that fails to parse: form hidden, source shown with the error (Review Focus 3).

- [ ] **Step 1: Write failing tests** (jsdom, `realContent()`, `memoryHomebrewStore`): (a) new ancestry: pick type ancestry, type name "Ratfolk" → id input shows `nimble.ancestries.ratfolk`; add effect target `wounds.max` add `1`; source textarea contains `{target: wounds.max, add: 1}`; Problems says none; click Save → homebrew store has `homebrew/ancestry/ratfolk.md`; location hash is `#/reader/nimble.ancestries.ratfolk`. (b) unknown target `wound.max` → Problems lists it and Save is disabled. (c) duplicate id `nimble.ancestries.dwarf` → Problems names the duplicate. (d) editing the source textarea to change `add: 1` to `add: 2` updates the effect row's value input to `2`. (e) `#/write/homebrew/broken.md` with unparsable YAML → an alert region with the error and the source textarea containing the file text; no form inputs. (f) Content view shows an "edit" link per homebrew file pointing at `#/write/homebrew/ratfolk.md`.
- [ ] **Step 2: Run** `cd sheet && npm test -- write` — Expected: FAIL.
- [ ] **Step 3: Implement** `write.tsx`, router, tab, content links, CSS.
- [ ] **Step 4: Run** `cd sheet && npm test && npm run build` — Expected: green.
- [ ] **Step 5: Commit** `git commit -am "sheet: Write view — form from content types, two-way source, live lint, save to homebrew"`

### Task 7: Demo, docs, hosting

**Files:**
- Modify: `sheet/README.md` (creator-first demo + recording checklist), `README.md` (what to try first), design doc §1 (interest test reframed: creators), §3 step 4, §12 (step 5 addendum; new step "Creator surfaces, 2026-10-19"), `docs/spec/effects-and-resources.md` (status line unchanged)
- Create: `.github/workflows/pages.yml` (build `sheet/` with `VITE_BASE=/orf/`, deploy to GitHub Pages via `actions/deploy-pages`); `sheet/vite.config.ts` reads `process.env.VITE_BASE ?? "./"`.
- Test: `cd sheet && VITE_BASE=/orf/ npm run build` and `grep -c '/orf/' sheet/dist/index.html` ≥ 1.

- [ ] **Step 1: README demo (creator seat).** Sequence: open Write, type a Ratfolk ancestry (or paste the guide example in the source pane), watch Problems go clean, Save, Create a Ratfolk, tap Wounds max → provenance names Ratfolk and the note, back to Write → edit, Save → the sheet updates. Second route for the text editor: same file in a folder, Content → Choose folder, Reload. Note that the same file opens in Obsidian with its properties table.
- [ ] **Step 2: Recording checklist** rewritten for the creator clip, under a minute, phone-width or desktop.
- [ ] **Step 3: Design doc**: §1 adds "Interest test, revised 2026-10-19 (Scott): the question is whether content creators adopt the format; the sheet is the vehicle." §12 adds step "5a. Creator surfaces (done 2026-10-19): name, guide, Write view, Create fixes, visual pass."
- [ ] **Step 4: Pages workflow** + vite base. Build check as above. Do not enable Pages from here; note the one command for Scott: `gh api -X POST repos/scottTomaszewski/orf/pages -f build_type=workflow`.
- [ ] **Step 5: Commit** `git commit -am "docs: creator-first demo and clip; Pages workflow"`
