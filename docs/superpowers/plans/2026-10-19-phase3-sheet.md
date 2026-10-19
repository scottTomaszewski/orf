# Phase 3: The Nimble Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, phone-first web app that creates, plays, and levels a Nimble character from the content documents, with provenance on every number, the Nimble license notice, and a homebrew folder whose edits ripple onto the sheet.

**Architecture:** A Vite + Preact app in `sheet/` imports the engine from `src/` unchanged. Content ships as a JSON bundle built from `systems/nimble` + `examples/nimble`; homebrew documents from a user folder overlay it in IndexedDB. Characters are documents too, stored in localStorage, exportable as `.md`, shareable as a URL fragment. Every view is a thin component over pure view-model functions (`src/sheet-model.ts`, engine-side and unit-tested) and the Nimble module's procedures. The High-Fantasy Steel language is ported as one token stylesheet.

**Tech Stack:** TypeScript 5, Node 20, Vite 8, Preact 10 + `@preact/signals`, vitest (+ jsdom + `@testing-library/preact` for component tests), `yaml` (already a dependency; browser-safe). Fonts from Google Fonts: Cinzel (display), Petrona (subheads, small caps), Source Serif 4 (body; the licensed Berlingske Slab does not travel).

**Spec:** `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` §3 (MVP scenario), §4.1, §10 (UI style decision), §11; `docs/spec/*.md`; workspace `DESIGN.md` of Steel Compendium (`/home/scott/code/steelCompendium/workspace/DESIGN.md`) for the look.

## Global Constraints

- **Free app, Nimble notice verbatim** (design §8): "This app is free to use for anyone who already owns the content, is trying the system out, or cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by purchasing the official content at nimbleRPG.com." and "[Product Name] is an independent product published under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co." The product name is the placeholder `Nimble Sheet` until Scott names it; both strings live in one constant.
- **No accounts, no server**: static build; all state in the browser; export/import files; share links carry the character.
- **Content is frozen**: rules text verbatim from Core Rules 2.0.3 / Heroes 2 (the free-app clause of the license allows it); the sheet never rewrites it.
- **Engine untouched by UI concerns**: the app imports `src/` and never forks it; sheet-side helpers that are pure over `Sheet`/`Registry`/documents go in `src/sheet-model.ts` with vitest tests.
- **Dice are rolled by the sheet, visibly** (consumer rolls; engine never rolls): every roll shows its dice and result and offers "enter manually".
- **High-Fantasy Steel rules** (DESIGN.md "Rules for new design work"): charcoal surfaces, one steel-teal accent, saturated color only for semantics, no decorative colored left borders, numeric adjusters are the bevelled ± stepper framing a sunken well and always visible, both slate (default) and light themes, Cinzel 900 uppercase display, Petrona 700 small-caps labels, ◆ rule.
- Phone first: every view works at 360px wide; touch targets ≥ 40px.
- No new runtime dependency beyond `preact`, `@preact/signals`.
- Commit messages: no AI attribution lines.

## Review Focus

1. A homebrew document that fails to parse (bad YAML) or lint: the sheet must still load, show the diagnostic in the Content view, and ignore that document. (Task 3 test.)
2. A character stored before a content change (a feature it references was deleted from the folder): the Play view must render with a diagnostic, never a blank screen. (Task 5 test.)
3. Level-up from 2 to 3 for a Mage: the subclass picker must offer exactly the two Mage subclasses and the Elemental Mastery picker the three schools; a saved pick must survive reload. (Task 8 test.)
4. Damage that drops to 0 then a Safe Rest: Wounds 1, Dying cleared, HP full, all from buttons; the log explains every change. (Task 7 test.)
5. A share link whose payload is corrupted or from another system: a clear error, not a crash. (Task 5 test.)

---

### Task 1: Spells content (Fire, Ice, Lightning, Radiant: cantrips through tier 2) and the creation template

**Files:**
- Create: `examples/nimble/spells/<school>/<slug>.md` (Fire, Ice, Lightning, Radiant; every cantrip and tier 1–2 spell in CR2 p.45–51), `systems/nimble/creation.md`
- Modify: `systems/nimble/content-types.md` (spell properties), `examples/nimble/torture-test/README.md` only if the generator is rerun (not required)
- Test: `src/examples.test.ts` (extend)

**Interfaces:**
- Spell document shape (verbatim text in the body; fields for tools):
  ```yaml
  ---
  id: nimble.spells.fire.flame-dart
  type: spell
  system: nimble
  name: Flame Dart
  school: fire            # matches the spell-school doc id suffix
  tier: 0                 # 0 = cantrip
  actions: 1
  target: single          # single | self | aoe
  range: 8                # or reach: 3 / reach: "Cone 4"
  damage: "{{ 1d10 }}"
  on_crit: Smoldering
  high_levels: "+5 damage every 5 levels"
  upcast: "+10 damage"    # tiered spells
  concentration: "Up to 1 minute"
  ---
  Range: 8. Damage: 1d10. On crit: Smoldering. High Levels: +5 damage every 5 levels.
  ```
  `KEY`, `LVL` in spell text become `{{ key }}` / `{{ level }}` inside `damage`/`upcast` only when the whole value is a formula; prose stays verbatim.
- `systems/nimble/creation.md` (`type: creation`): `stat_arrays: [{id: standard, name: Standard, values: [2, 2, 0, -1]}, {id: balanced, values: [2, 1, 1, 0]}, {id: min-max, values: [3, 1, -1, -1]}]`, `skill_points_at_creation: 4`, `skill_points_per_level: 1`, `starting_gold: 50`, `hp_per_level: roll-with-advantage` (CR2 p.20–21). Registry: `type: creation` is a template type (add to `TEMPLATE_TYPES` in `src/character.ts` so it attaches; no variables).
- `content-types.md`: `spell` properties `[school, tier, actions, target, range, reach, damage, on_crit, on_hit, high_levels, upcast, concentration]`; add `creation` type.

- [ ] **Step 1: Write the failing test** (append to `src/examples.test.ts`)

```ts
test("spells: every school a level-5 Mage or Oathsworn knows has its cantrips and tier 1-2 spells", () => {
  const spells = docs.filter((d) => d.frontmatter.type === "spell");
  const by = (school: string, tier: number) => spells.filter((d) => d.frontmatter.school === school && d.frontmatter.tier === tier);
  expect(by("fire", 0).map((d) => d.frontmatter.name).sort()).toEqual(["Flame Dart", "Heart's Fire"]);
  expect(by("fire", 1).map((d) => d.frontmatter.name)).toEqual(["Ignite"]);
  expect(by("fire", 2).map((d) => d.frontmatter.name)).toEqual(["Enchant Weapon"]);
  for (const s of ["ice", "lightning", "radiant"]) { expect(by(s, 0).length).toBeGreaterThan(0); expect(by(s, 1).length).toBeGreaterThan(0); }
  for (const d of spells) { expect([0, 1, 2]).toContain(d.frontmatter.tier); expect(typeof d.frontmatter.actions).toBe("number"); }
  expect(docs.find((d) => d.frontmatter.id === "nimble.system.creation")!.frontmatter.stat_arrays).toHaveLength(3);
});
```

- [ ] **Step 2: Run** `npx vitest run src/examples.test.ts` — Expected: FAIL (no spells).
- [ ] **Step 3: Enter the content** from the extracted text (`core203.txt` pages 45–51; the PDF at `/home/scott/Documents/Ringweave/Compendiums/Nimble/PDFs` is the authority where extraction garbled a line). One file per spell; body verbatim; condition sidebars (Smoldering, Defend) are not spells and go in a `notes:` property if needed.
- [ ] **Step 4: Run** `npm test && npm run lint-docs` — Expected: PASS; both trees OK (the linter must accept `type: spell`/`creation` docs; it does not validate unknown types today).
- [ ] **Step 5: Commit** `git add examples/nimble/spells systems/nimble src && git commit -m "content: spells for Fire, Ice, Lightning, Radiant (cantrips to tier 2); creation template"`

---

### Task 2: Sheet model — pure helpers the views need

**Files:**
- Create: `src/sheet-model.ts`
- Test: `src/sheet-model.test.ts`

**Interfaces:**
- Consumes: `Sheet`, `Registry`, `Document`, `assembleCharacter`, `evaluateCharacter`, `src/systems/nimble.ts`.
- Produces:
  ```ts
  export interface Option { id: string; name: string; doc: Document }
  export function creationOptions(docs: Map<string, Document>): { classes: Option[]; ancestries: Option[]; backgrounds: Option[]; statArrays: { id: string; name: string; values: number[] }[]; skillPoints: number };
  export function newCharacter(input: { id: string; name: string; classId: string; ancestryId: string; backgroundId: string; stats: Record<"str"|"dex"|"int"|"wil", number>; skills: Record<string, number>; equipment: { id: string; equipped: boolean }[] }, docs: Map<string, Document>): Document;   // level 1, levels: [{level: 1, hp: <class starting_hp>, source: starting}], state: {} (engine fills starts), system: nimble
  export function slotOptions(slot: SlotDef, registry: Registry, docs: Map<string, Document>, sheet: Sheet): Option[] | string[];   // documents matching from.type + tags (minus already-attached when unique: character), or the literal options
  export interface LevelUpPrompt { classLevelId: string; level: number; grants: Option[]; slots: { slot: SlotDef; count: number; options: Option[] | string[]; picked: string[] }[]; hpRoll: { die: number; advantage: true }; skillPoint: true }
  export function levelUpPrompts(character: Document, registry: Registry, docs: Map<string, Document>): LevelUpPrompt | undefined;   // for level+1 of the single class; undefined at 20
  export function applyLevelUp(character: Document, prompt: LevelUpPrompt, answers: { hp: number; picks: Record<string, string[]>; skill: string; moveSkill?: { from: string; to: string } }): Document;   // bumps classes[0].level, appends levels[], writes choices, skills
  export function spellsKnown(sheet: Sheet, docs: Map<string, Document>): { school: string; tier: number; spell: Document }[];   // knows(school) via attached spell-school docs; tier <= spells.tier.max
  export function skillRows(sheet: Sheet): { id: string; name: string; stat: string; points: number; total: number }[];
  export function saveRows(sheet: Sheet): { stat: string; bonus: number; advantage: number }[];
  export function rollDice(text: string, rng?: () => number): { total: number; rolls: number[]; text: string };   // "1d8 - 1" → rolls each term; keep/drop honored
  ```

- [ ] **Step 1: Write the failing tests** (Pip from the real trees, as `src/engine.test.ts` does)

```ts
test("creationOptions lists the four classes, ancestries, backgrounds, three stat arrays, 4 skill points", ...);   // classes names sorted: ["Mage", "Oathsworn", "The Cheat", "Zephyr"]
test("newCharacter: a level-1 gnome Mage with the standard array evaluates to HP 10, mana 0, armor = dex", ...);
test("levelUpPrompts for Pip (4 → 5) grants Elemental Surge and offers the secondary-stat slot with [str, dex]; applyLevelUp writes level 5, hp entry, choice", ...);
test("levelUpPrompts for a level-2 Mage offers subclass (2 options: Chaos, Control) and elemental-mastery [fire, ice, lightning]", ...);
test("spellsKnown for Pip: fire/ice/lightning cantrips + tier 1 + tier 2, no radiant, nothing above tier 2", ...);
test("rollDice('2d6 + 1') with a fixed rng returns rolls and total; '4d6kh3' keeps three", ...);
```

- [ ] **Step 2: Run** `npx vitest run src/sheet-model.test.ts` — Expected: FAIL, missing module.
- [ ] **Step 3: Implement `src/sheet-model.ts`.** `levelUpPrompts` reads the class-level doc for `level+1`; `hpRoll.die` = `hit_die.size`. Slot `unique: character` excludes already-attached docs.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "engine: sheet model — creation options, new character, level-up prompts, spells known, dice roller"`

---

### Task 3: Content bundle and content store (bundle + homebrew overlay)

**Files:**
- Create: `scripts/bundle-content.ts`, `sheet/src/content-store.ts`
- Test: `sheet/src/content-store.test.ts` (vitest, node environment, with an in-memory `Storage` stub)
- Modify: `package.json` (`"bundle-content": "tsx scripts/bundle-content.ts"`, `"predev"`/`"prebuild"` in `sheet/package.json` run it)

**Interfaces:**
- `scripts/bundle-content.ts`: writes `sheet/public/content/nimble.json` = `{ built: ISO date, files: [{ path, text }] }` from `systems/nimble` + `examples/nimble` (skips README/LICENSE as `listDocumentFiles` does; includes `LICENSE-NOTICE.md` text under `notice`).
- `sheet/src/content-store.ts`:
  ```ts
  export interface ContentFile { path: string; text: string; origin: "bundle" | "homebrew" }
  export interface Loaded { docs: Map<string, Document>; registry: Registry; diagnostics: Diagnostic[]; files: ContentFile[] }
  export interface HomebrewStore { list(): Promise<ContentFile[]>; put(files: ContentFile[]): Promise<void>; remove(path: string): Promise<void>; clear(): Promise<void> }
  export function memoryHomebrewStore(): HomebrewStore;             // for tests
  export function indexedDbHomebrewStore(): HomebrewStore;          // browser
  export function loadContent(bundle: { files: { path: string; text: string }[] }, homebrew: ContentFile[]): Loaded;   // parse leniently, build registry, lint; a homebrew file with the same path replaces the bundle's; parse/lint failures become diagnostics and the doc is dropped (registry/lint diagnostics keep the doc)
  export async function readDroppedFiles(files: FileList | File[]): Promise<ContentFile[]>;   // .md only; path = webkitRelativePath || name
  ```

- [ ] **Step 1: Write the failing tests**

```ts
test("loadContent builds the registry from the bundle; 124 docs, 74 variables", ...);
test("a homebrew ancestry overlays the bundle and appears in docs; its +1 wounds.max shows on Pip with provenance", ...);   // the ripple, engine-level
test("a homebrew file with invalid YAML yields a diagnostic naming the file and is dropped; everything else loads", ...);
test("a homebrew file that fails lint (unknown target) yields a diagnostic and the doc stays loaded", ...);
test("memoryHomebrewStore put/list/remove round-trips", ...);
```

- [ ] **Step 2: Run** — Expected: FAIL, missing modules.
- [ ] **Step 3: Implement** the script and the store. `loadContent` uses `parseDocument` per file in a try/catch, then `buildRegistry` + `lintAll`.
- [ ] **Step 4: Run** `npm run bundle-content && npm test` — Expected: bundle written; PASS. Add `sheet/public/content/` to `.gitignore` (generated).
- [ ] **Step 5: Commit** `git commit -m "sheet: content bundle script and content store with homebrew overlay"`

---

### Task 4: App scaffold, High-Fantasy Steel tokens, shell, About view

**Files:**
- Create: `sheet/package.json`, `sheet/vite.config.ts`, `sheet/tsconfig.json`, `sheet/index.html`, `sheet/src/main.tsx`, `sheet/src/app.tsx`, `sheet/src/styles/steel.css`, `sheet/src/styles/app.css`, `sheet/src/views/about.tsx`, `sheet/src/notice.ts`, `sheet/src/components/{stepper,panel,crest-rule}.tsx`
- Test: `sheet/src/app.test.tsx` (jsdom + testing-library)

**Interfaces:**
- `vite.config.ts`: `resolve.alias['@engine'] = path.resolve(__dirname, '../src')`; base `./`; vitest `environment: jsdom` for `sheet/src/**/*.test.tsx`.
- `sheet/tsconfig.json`: `jsx: react-jsx`, `jsxImportSource: preact`, `paths: {"@engine/*": ["../src/*"]}`.
- `notice.ts`: `export const PRODUCT_NAME = "Nimble Sheet"; export const FREE_NOTICE = "..."; export const ATTRIBUTION = \`${PRODUCT_NAME} is an independent product published under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co.\`` (strings verbatim from the design doc §8).
- `steel.css` tokens (port of `palette.css` + `steel-redesign.css --fx-*` + type roles; both `[data-theme="slate"]` default and `[data-theme="light"]`):
  ```css
  :root, [data-theme="slate"] { --bg:#1a1e21; --bg-raised:#22272b; --fg:rgba(255,250,244,.88); --fg-2:rgba(255,250,244,.62); --fg-3:rgba(255,250,244,.38); --line:rgba(255,250,244,.12);
    --accent:#4db8c7; --accent-soft:rgba(77,184,199,.12); --steel:#5a6368; --steel-light:#8e959a;
    --fx-metal:#a9b0b5; --fx-metal-bright:#d9dee1; --fx-metal-grad:linear-gradient(180deg,#e3e7e9 0%,#a9b0b5 48%,#686f74 100%); --fx-metal-line:rgba(176,183,187,.5); --fx-metal-faint:rgba(176,183,187,.16);
    --fx-card-bg:linear-gradient(160deg,#232a2e,#181c1f); --fx-bevel:inset 0 1px 0 rgba(255,255,255,.07); --fx-emboss:0 1px 0 rgba(0,0,0,.55),0 -1px 0 rgba(255,255,255,.04);
    --font-display:"Cinzel",serif; --display-weight:900; --display-scale:.9; --font-sub:"Petrona",serif; --sub-weight:700; --font-body:"Source Serif 4","Zilla Slab",serif;
    --sem-hp:#c75050; --sem-mana:#4d7fc7; --sem-wound:#b8923a; }   /* semantic hues: thin borders and glyphs only, never fills */
  [data-theme="light"] { --bg:#f6f8f8; --bg-raised:#ffffff; --fg:#1a1d20; --fg-2:rgba(26,29,32,.66); --fg-3:rgba(26,29,32,.42); --line:rgba(26,29,32,.12); --accent:#2a7b88; --accent-soft:rgba(42,123,136,.10);
    --fx-metal:#5f676c; --fx-metal-bright:#2c3338; --fx-metal-grad:linear-gradient(180deg,#9aa1a6 0%,#6a7176 48%,#474d51 100%); --fx-metal-line:rgba(95,103,108,.45); --fx-metal-faint:rgba(95,103,108,.14); --fx-card-bg:linear-gradient(160deg,#fff,#eef1f1); --fx-bevel:inset 0 1px 0 rgba(255,255,255,.8); --fx-emboss:none; }
  ```
  Components: `.steel-h1` (Cinzel, uppercase, `calc(1.5rem * var(--display-scale))`, emboss), `.steel-label` (Petrona small-caps), `.steel-panel` (card bg, 1px `--fx-metal-line` border all around, bevel), `hr.steel` (◆ centered), `Stepper` (bevelled − / + buttons framing a sunken well showing the value; always visible; props `value, min, max, onChange, label`), `Panel` (title slot in `.steel-label`).
- App shell: header with product name (`.steel-h1`) and theme toggle; bottom tab bar on phones / left rail ≥ 800px: Play, Create, Level Up, Reader, Content, About. Routing by `location.hash` (`#/play/<id>`, `#/create`, …). Loads the bundle (`fetch('content/nimble.json')`) + homebrew store on start; a `ContentContext` signal holds `Loaded`.
- `About` view: both notice strings, package label from the `nimble` package doc (`2.0.3 (first printing)`), link to nimbleRPG.com, the repo, and "content build date".

- [ ] **Step 1: Write the failing test**

```tsx
test("the app renders the product name, the free-use notice verbatim, and six tabs", async () => {
  render(<App loader={() => Promise.resolve(fakeLoaded())} />);
  expect(await screen.findByText(FREE_NOTICE)).toBeTruthy();
  expect(screen.getByText(ATTRIBUTION)).toBeTruthy();
  for (const t of ["Play", "Create", "Level Up", "Reader", "Content", "About"]) expect(screen.getByRole("tab", { name: t })).toBeTruthy();
});
test("Stepper calls onChange within bounds and shows the value", ...);
```

- [ ] **Step 2: Run** `cd sheet && npx vitest run` — Expected: FAIL (no app).
- [ ] **Step 3: Scaffold** (`npm create vite@latest` equivalent by hand: `preact` + `@preact/signals` deps; devDeps `vite`, `vitest`, `jsdom`, `@testing-library/preact`, `@preact/preset-vite`), write the tokens, shell, About, components. Google Fonts `<link>` for Cinzel 400..900, Petrona 400..700, Source Serif 4.
- [ ] **Step 4: Run** `cd sheet && npm test && npm run build` — Expected: PASS; `sheet/dist` produced. Open `npm run dev` once and confirm the About view renders at 360px (manual; note in the ledger).
- [ ] **Step 5: Commit** `git commit -m "sheet: Vite + Preact scaffold, High-Fantasy Steel tokens, shell, About with the Nimble notice"`

---

### Task 5: Character store, export/import, share link

**Files:**
- Create: `sheet/src/character-store.ts`
- Test: `sheet/src/character-store.test.ts`

**Interfaces:**
```ts
export interface CharacterStore { list(): StoredCharacter[]; get(id: string): Document | undefined; save(doc: Document): void; remove(id: string): void }
export interface StoredCharacter { id: string; name: string; summary: string; updated: string }   // summary = "Mage 4 · Gnome"
export function localCharacterStore(storage: Storage): CharacterStore;      // key `nimble-sheet:characters:<id>` holds the serialized .md text
export function serializeCharacter(doc: Document): string;                  // frontmatter YAML + "---" + body
export function parseCharacterText(text: string, path?: string): Document;  // parseDocument + must be type: character, else throws Error("not a character document")
export function toShareLink(doc: Document, base?: string): string;          // `${base}#/share/<base64url of serialized>`
export function fromShareLink(hash: string): Document;                      // throws Error with a readable message on bad base64/YAML/type
```
State writes (from procedures) go through `save` with the updated `state` mapping.

- [ ] **Step 1: Write the failing tests**: save/list/get round trip with an in-memory `Storage`; `serializeCharacter(parseCharacterText(pipText))` is stable; share link round-trips Pip; corrupted payload and a `type: feature` payload throw readable errors; `get` of a character whose referenced feature no longer exists still returns the document (the engine reports the diagnostic; verify via `evaluateCharacter`).
- [ ] **Step 2: Run** — FAIL.  **Step 3: Implement** (use `yaml` `stringify` with a key order: id, type, system, name, then the rest).  **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git commit -m "sheet: character store, .md export/import, share links"`

---

### Task 6: Create view

**Files:**
- Create: `sheet/src/views/create.tsx`
- Test: `sheet/src/views/create.test.tsx`

**Behavior:** steps on one scrolling page: name → class (cards with the class doc's rendered body) → ancestry → background → stat array (three radio options) and placement (assign each value to a stat via four selects; must use each value once) → skills (4 points via Steppers, cap per skill 4 at creation? no cap beyond total; show stat + points = total) → starting kit (class `starting_gear` ids if present, else "50 gp" note; equipment list with equip toggles) → "Create" button enabled when valid. Uses `creationOptions`, `newCharacter`, saves via the store, navigates to `#/play/<id>`. The rules text of the focused option shows in a side panel (≥ 800px) or an expandable row (phone) using `Sheet.render` of a throwaway sheet for `{{ }}`? No: on Create the character does not exist yet, so option bodies render symbolically (`display` text or raw expression) — use `renderSymbolic(text)` = replace `{{ expr | display }}` with `display`, else the expr.

- [ ] **Step 1: Write the failing test**: render with the real bundle (`loadContent` over the files on disk via node `fs` in the test); choose Mage, Gnome, Wild One, Standard array placed INT 2 DEX 2 WIL 0 STR −1, Arcana 3 Lore 1; click Create; the store now has one character whose `evaluateCharacter` gives hp.max 10, speed 5, skill.arcana 5.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `cd sheet && npm test` — PASS.
- [ ] **Step 5: Commit** `git commit -m "sheet: Create view"`

---

### Task 7: Play view (the sheet)

**Files:**
- Create: `sheet/src/views/play.tsx`, `sheet/src/components/{value,provenance-popover,resource,roll-dialog,log}.tsx`, `sheet/src/play-actions.ts`
- Test: `sheet/src/views/play.test.tsx`, `sheet/src/play-actions.test.ts`

**Interfaces:**
- `play-actions.ts` (pure, wraps the Nimble module and persists):
  ```ts
  export type Action =
    | { kind: "damage"; amount: number; crit: boolean } | { kind: "heal"; amount: number }
    | { kind: "catch-breath"; dice: number } | { kind: "make-camp"; dice: number } | { kind: "safe-rest" }
    | { kind: "encounter-start"; roll: number } | { kind: "turn-end" } | { kind: "encounter-end" }
    | { kind: "adjust"; resource: string; delta: number } | { kind: "toggle"; flag: string; value: boolean };
  export function performAction(character: Document, sheet: Sheet, action: Action, rng: () => number): { character: Document; log: string[]; rolls: { text: string; rolls: number[]; total: number }[] };
  ```
  Catch Breath rolls `dice` Hit Dice with the sheet's `rollDice` (two rolls each when `hit_die.heal.advantage`), passes them to `nimble.catchBreath`. Every action returns the character with `state` updated and a human log.
- Play view layout (phone, top to bottom): name/class/level/ancestry line; **HP** panel (current/max with Stepper, temp HP, Dying/Bloodied badges, Damage and Heal buttons with amount + crit checkbox); **Wounds** (filled ◆ per Wound up to max; adjuster); **Hit Dice** (current/max, "Catch Breath" and "Make Camp" buttons with a dice count); **Mana / class pools** (each present resource except hp/temp_hp/wounds/hit_dice/actions: Stepper); **Rest** row (Field Rest = the two buttons above; **Safe Rest**); **Encounter** row (Initiative roll → encounter start; Turn end; Encounter end; actions as ◆◆◆); **Stats** (4 values), **Armor** with formula visible (`armor.base + armor.bonus` rendered from provenance), **Saves** (stat ± advantage flags), **Skills** table, **Inventory** (slots used / `inventory.slots`, equip toggles that save `equipment[].equipped`), **Spells** (by school and tier from `spellsKnown`, each expandable to its text with `sheet.render`), **Features** (attached feature docs, expandable, rendered), **State toggles** (every boolean variable with no formula: `in_wilderness`, `ally_nearby`, `raging`, `concentrating`), **Log** (last 20 lines). Tapping any number opens the provenance popover: contributions as `op value from <doc name>` with `when` text and notes; shadowed/dropped shown struck.
- Diagnostics from `evaluateCharacter` render in a collapsible "Problems" panel at the top (warnings muted).

- [ ] **Step 1: Write the failing tests**
  - `play-actions.test.ts`: damage 20 on Pip → state hp 0, wounds 2, dying true, log mentions Dying; then safe-rest → hp 25, wounds 1, dying false; catch-breath 1 with fixed rng → log shows the roll and the healed amount; adjust mana −2 → 4; toggle in_wilderness → state.
  - `play.test.tsx`: renders Pip: shows "25" max HP, "13" mana max, Armor "4"; clicking Armor shows a popover containing "Adventurer's Garb"; clicking "Damage" with 20 then "Safe Rest" ends with HP 25 and Wounds 1; a Pip whose `features` names a missing id renders with a Problems panel (Review Focus 2).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `cd sheet && npm test` — PASS; `npm run build` ok; manual phone check at 360px.
- [ ] **Step 5: Commit** `git commit -m "sheet: Play view with provenance, resources, procedures, spells, log"`

---

### Task 8: Level Up view

**Files:**
- Create: `sheet/src/views/level-up.tsx`
- Test: `sheet/src/views/level-up.test.tsx`

**Behavior:** shows "Level N → N+1" with the class-level doc's rendered text; grants listed (rendered); one picker per slot (`slotOptions`; cards for documents, radio/checkbox for options; enforces `count`); HP: a "Roll with advantage" button (two rolls shown, higher kept, editable field) using `hit_die.size`; skill point: pick one skill (+1), optional move one point; "Apply" calls `applyLevelUp`, saves, navigates to Play. Disabled with a reason at level 20 or when picks are incomplete.

- [ ] **Step 1: Write the failing test**: a level-2 Mage (built with `newCharacter` then `applyLevelUp` once with hp 4) → Level Up shows the subclass picker with exactly "Invoker of Chaos" and "Invoker of Control" and the elemental-mastery options fire/ice/lightning; pick Control + fire, roll HP with a fixed rng, pick Arcana; Apply → stored character has level 3, three `levels[]` entries, both choices; reload the store and `evaluateCharacter` attaches `nimble.subclasses.mage.control` (Review Focus 3).
- [ ] **Step 2–5:** FAIL → implement → PASS → `git commit -m "sheet: Level Up view"`

---

### Task 9: Reader and Content views

**Files:**
- Create: `sheet/src/views/reader.tsx`, `sheet/src/views/content.tsx`
- Test: `sheet/src/views/content.test.tsx`

**Behavior:**
- Reader: a list of every loaded document grouped by type (search box filters by name); selecting one shows its frontmatter as a property table (labels from the content-type's suggested properties first) and its body with `{{ }}` resolved for the current character (if one is open) or symbolic otherwise; a "Sources" line from the doc's `## Sources` section; a link "open in Play" for features the character has.
- Content: shows the bundle build date and counts; **Homebrew folder**: "Choose folder" (File System Access API `showDirectoryPicker` when available; reads `*.md` recursively) and a fallback `<input type="file" multiple webkitdirectory>`; lists homebrew files with origin and a remove button; **Reload** re-reads the chosen folder (handle kept in IndexedDB when permitted) and re-runs `loadContent`, then re-evaluates the open character; **Problems** list from `Loaded.diagnostics` (path:line message). This is the homebrew-ripple surface for the demo.

- [ ] **Step 1: Write the failing test**: with a memory homebrew store, add a `nimble.ancestries.ratfolk` file with `wounds.max add: 1`; the Content view lists it; a Pip variant with that ancestry evaluates to wounds.max 7 with the ancestry name in provenance; add a second file with broken YAML → Problems shows its path and the first file still loads (Review Focus 1).
- [ ] **Step 2–5:** FAIL → implement → PASS → `git commit -m "sheet: Reader and Content views with homebrew folder and problems"`

---

### Task 10: Homebrew ripple acceptance and docs

**Files:**
- Create: `sheet/README.md` (run, build, the homebrew folder, recording checklist), `docs/superpowers/plans/2026-10-19-phase3-sheet.md` (this file; mark complete)
- Modify: `README.md` (sheet section), design doc §12 (step 5 status), `sheet/src/views/about.tsx` (link to the README)

**Acceptance (manual, recorded in the ledger with the exact steps):** `npm run dev` → Create a gnome Mage → Play shows numbers with provenance → Content: choose a folder containing `my-ancestry.md` (`wounds.max add: 1`) → Create a second character with it → Play shows Wounds max 7 and the popover names the file → edit the file to `add: 2`, Reload → 8. This is the clip for the post.

- [ ] **Step 1:** Write the docs. **Step 2:** `npm test` at the root and in `sheet/`; `npm run build` in `sheet/`. **Step 3:** `git commit -m "docs: Phase 3 sheet — run, homebrew folder, acceptance checklist"`

---

## Self-review notes

- Spec coverage: §3 Create (T6), Play (T7), Level up (T8), Homebrew ripple (T3, T9, T10); §8 notices (T4); §10 engine untouched, High-Fantasy Steel tokens (T4), share-link store (T5); §11 choices in the UI (T2, T8). Spells known (§3 play view) needs spell documents: T1.
- Not in this phase: levels 6–20 content (next plan), remaining ancestries/backgrounds/items (next plan), hosting/deploy (a `gh-pages` step once Scott names the product), multiclass, the authoring form.
- Type consistency: `Option`, `LevelUpPrompt`, `slotOptions` from T2 used in T6/T8; `Loaded`, `HomebrewStore` from T3 in T4/T9; `CharacterStore` from T5 in T6–T8; `performAction` from T7 only.
- Proportion: UI tasks describe behavior and the one test that pins it; component code is the executor's.
