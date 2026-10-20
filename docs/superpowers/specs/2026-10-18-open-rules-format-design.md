# Open Rules Format: design

Date: 2026-10-18. Status: approved in principle 2026-10-18 (5e-first draft); **revised the same
day to Nimble-first** after Scott's product decision; revision confirmed by Scott 2026-10-18
(2.0.3, four classes, no accounts, High-Fantasy Steel UI, native execution). **Revised again
2026-10-18 after Scott's first gate review** ("describe, don't script": handlers and `transfer`
removed, lookups added, clamp ops renamed, labels first-class; §4.1). Second gate packet:
`examples/nimble/torture-test/README.md`. Tracker:
Linear SC-451 (project "Open Rules Format"). "ORF" / "Open Rules Format" began as a placeholder
name; **settled as the name 2026-10-19 (Scott)**: descriptive, not flashy. The sheet is "ORF Sheet
for Nimble".

Companion research:
- [`../research/2026-10-18-prior-art-survey.md`](../research/2026-10-18-prior-art-survey.md):
  Foundry Active Effects, D&D Beyond Modifiers, GCS, PCGen, Dicecloud, expression languages,
  the 2023 ORF prototype.
- [`../research/2026-10-18-nimble-recon.md`](../research/2026-10-18-nimble-recon.md): Nimble's
  license, character model, rest cycle, choice points, ugly rules, tooling, community.

Where a choice was made by Scott it is stated as a decision. Where I made a call it is marked
**(my call)** so it can be overturned cheaply.

## 1. Intent

TTRPG content is published as PDFs, print, or one proprietary data format per digital tool.
Every VTT, sheet app, and notes plugin re-enters the same content by hand, and creators without
programmers reach none of them. This project is an **open, system-agnostic content format**
plus a reference engine: a creator writes a spell, a feat, a class, or a whole system once, and
every tool that speaks the format picks it up, including errata as new revisions. Format and
engine are free and open.

**Product first, format underneath (decision, Scott).** Standards that got adopted in this
hobby came out of working software people already used, not out of specs. So the first
deliverable is a **free, data-driven character sheet for Nimble** that Scott will use at his
own table (he plays Nimble with his kids and there is no cross-device, level-up-aware sheet for
it). The format is the implementation detail that makes homebrew "just work" in that sheet.
The interest test is the sheet, posted to the Nimble Discord and subreddit and sent to Sly
Flourish, who is actively running Nimble. Judge interest by whether tool authors or Nimble Co.
want to integrate, not by upvotes.

**Interest test, revised 2026-10-19 (Scott).** The question is whether **content creators
adopt the format**, not whether players want a sheet (they do; that is known). The sheet is the
vehicle that makes the format's promise visible. The demo clip is recorded from the creator's
seat: write a document (in the sheet's Write view or any text editor), see it live with
provenance, change a number, see it ripple; the same file renders in Obsidian because ORF is
Markdown (§5.4).

**Business shape (decision, Scott, bounded by licenses).** Nimble's creator license lets a
tool embed the rules only if the tool is **completely free** (donations allowed), so the Nimble
sheet is the free proving ground. The Draw Steel Creator License permits selling, so a paid or
freemium **Draw Steel sheet** built on the same engine is the eventual product, and the
Steel Compendium pipeline becomes a content source for it. 5e stays a stress test for the
engine, not a product.

Lessons carried in: Steel Compendium (annotated text to structured data for Draw Steel) and
the 2023 ORF prototype (computed 5e derived values from inputs; see the prior-art survey for
what to keep and drop).

## 2. Goals, non-goals, anti-goals

**Goals**

- A Nimble player at the table can track HP, Wounds, Hit Dice, mana and class resources,
  Field Rests and Safe Rests, with the sheet applying the rules (what refreshes when, what a
  spent Hit Die heals) instead of the player remembering.
- Character creation and level-up are guided: the sheet offers the choices the class grants at
  each level and attaches the chosen content.
- The sheet works on a phone at the table and a laptop at home, with the character saved
  across devices.
- Content from authors who have never met composes: a homebrew ancestry or background can
  modify max Wounds or Hit Dice without the sheet or the system template knowing it exists.
- The same content renders as readable rules text and as resolved numbers from one source.
- The engine expresses real Nimble rules cleanly, including the ugly ones (recon §6), and the
  nastiest 5e shapes (competing base formulas, same-source stacking) as insurance.
- Content and system templates are versioned; Nimble 2.0.3 now and the
  second printing (the "3.0" playtest files) later are the first real test.
- The format works as plain files outside our tools.

**Non-goals (this phase)**

- 5e as a product. A handful of 5e rules may appear in the torture test; no 5e template ships.
- Draw Steel content. Design nothing that blocks it; build none of it now.
- A creator-facing authoring web app. Homebrew for the MVP is hand-written Markdown; the form
  comes after the sheet exists.
- Combat automation beyond resource tracking: no attack resolution, no monster side, no
  initiative tracker.
- Translations, accessibility work, offline sync, accounts beyond what saving a character
  across devices needs. Requirements of the eventual product; not designed out; not built now.
- All eleven classes. The MVP ships the system core plus the classes Scott's table plays
  (**decision, Scott: Mage, The Cheat, Oathsworn, Zephyr**, the classes his kids play). The template structure must make adding a class a data task.

**Anti-goals** (failure even if it technically works)

- A format only programmers can author.
- A closed vocabulary of modifiable things (D&D Beyond's 1,900 enumerated subtypes).
- Conditions as free text the engine ignores (D&D Beyond, GCS). Every `when` is evaluated.
- Silent no-ops: content that saves fine and does nothing. Unknown targets and variables are
  located errors.
- Imperative mutation of variables by content. Content contributes; the system folds.
- Violating the Nimble license: any paid tier, or shipping without the required notice.

## 3. The MVP (acceptance scenario)

A free web app, usable on a phone, carrying the Nimble license notice prominently.

1. **Create**: pick class, ancestry, background, stat array and placement, 4 skill points,
   starting kit. Every option comes from content documents; the sheet shows the rules text of
   each option as the player picks.
2. **Play**: the sheet shows current/max HP, Wounds, Hit Dice, mana or class pool, Armor
   with its formula visible, skills, saves with advantage/disadvantage flags, inventory slots,
   known spells by school and tier. Buttons: take damage (handles temp HP, 0 HP → Wound +
   Dying), spend a Hit Die (Catch Breath vs Make Camp formula), spend mana, **Field Rest**,
   **Safe Rest** (restores all HP/HD/mana, heals 1 Wound, expires temp HP). Hovering any
   number shows where it came from ("Armor 5 = 3 Cheap Hides + DEX 2").
3. **Level up**: the sheet lists what the new level grants, prompts for each choice (subclass
   at 3, Spellshaper picks, Key or Secondary stat bump, skill point and optional move, HP roll), and attaches the chosen content.
4. **Homebrew ripples**: a hand-written Markdown ancestry file dropped into the content folder
   appears as an option at creation and its effects (say, +1 max Wounds) show on the sheet
   with provenance. Edit the number, reload, the sheet updates. This is the format's proof and
   the clip for the post.

Scott's own table is the first user. The post goes out when the sheet has survived a few
sessions.

## 4. Architecture overview

1. **Content documents**: Markdown with YAML frontmatter, one per entity (ancestry, background,
   class, class level, subclass, feature, spell, item, boon, character). Section 5.
2. **System templates**: a package of documents defining a system: variables and formulas,
   **resources** and their refresh triggers, content types and their suggested properties,
   fold and stacking policies, predicate vocabulary, tables, **choice slots**. A template is
   content in the same format. Section 8.
3. **The engine**: parses documents, folds contributions from all active content into a
   character's variables, evaluates expressions in two phases (compile-time numbers,
   roll-time dice), reports provenance and diagnostics. Its **system module** (code, one per
   system, shipped with the engine) owns the procedures: damage, healing, rests, wounds,
   Dying, spending. Sections 4.1, 6 and 7.
4. **Registry / publishing**: stable ids, revisions, dependency declarations. For the MVP, a
   folder of files. Section 9.
5. **Consumers**: the Nimble sheet (the product), and a Reader view inside it. Section 10.

```
content docs (md+yaml) ──┐
system template (same) ──┼──► engine: parse ─► registry ─► fold ─► evaluate ─► provenance
character doc (same) ────┘                 │                      ▲
                                           │ system module (code): damage, rests, wounds
                                           ▼
                                  sheet (phone/laptop)  ·  reader view
```

### 4.1 What the format describes vs. what the engine does (decision, Scott, 2026-10-18)

The format describes **what is true** about a character: derived values (contributions and
their fold), conditions (`when`), lookups, resources and their refresh moments, choices,
grants, and descriptive fields (name, description, cost, dice, range, prose). The engine does
**what happens**: taking damage, healing, Field and Safe Rests, gaining Wounds, Dying,
spending and restoring. Those procedures are **code in the engine's system module**, written
once and imported by every tool (sheet, VTT plugin, Obsidian plugin). Content steers them only
through declared variables (`hit_die.heal.maximized`, `initiative.floor`, `actions.dying_cap`).

Why: the first torture test put rest and damage procedures into the format as event handlers.
Scott's review found them dense, error-prone ("will every healing ability need to remember
`fire: full-hp`?"), and a maintenance hazard once third parties write them. Sharing the engine
removes the duplication he worried about without putting a program in the data. A tool in
another language reimplements the module, exactly as it reimplements the fold. If a second
system shows the same procedure shape, a declarative trigger form is designed then, from two
real examples.

**Two authors.** System-template authors are few and can read density; they write the
variables, resources, moments, and the system module. Content creators are many and see about
five keys: `name`, prose, `effects` (target, one op, `when`), `resources`, and descriptive
fields. The second group decides adoption, and every design choice below is judged against
their view first.

**Abilities are fields, not scripts.** Elemental Surge is `trigger: initiative`,
`restores: {mana: wil}`, `expires: encounter-end`, and prose. A sheet shows it; a VTT may
automate from it; adding a field never breaks a reader.

## 5. Content format

**Decision (Scott):** Markdown body + YAML frontmatter; a UI renders frontmatter as a property
form so creators never see raw YAML; custom fields are essential. Aliases for "frontmatter
might scare people off": the file is the format, the form is the authoring surface (later).

### 5.1 Document shape

```markdown
---
id: nimble.ancestries.dwarf
type: ancestry
system: nimble
name: Dwarf
size: medium
effects:
  - target: hit_dice.max
    add: 2
  - target: wounds.max
    add: 1
  - target: speed
    add: -1
---
Stout and stubborn. You have {{ hit_dice.max }} Hit Dice and can suffer
{{ wounds.max }} Wounds before dying.
```

- **Properties are open.** The system template suggests properties per content type (that is
  what a form would show); creators may add any. Unknown properties are preserved and
  rendered, never rejected.
- **Reserved properties**: `id`, `type`, `system`, `name`, `effects`, `grants`, `choices`,
  `variables`, `resources`, `requires`, `tags`, `version`.
- **Property values may be expressions**: any string containing `{{ }}` is computed like body
  text **(my call: one rule to learn)**.

### 5.2 Inline expressions in prose

`{{ expr }}` renders **symbolically** in a reader (identifiers become their registry display
names: "your Intelligence") and **resolved** on a sheet (`(INT×3)+LVL` → 14). Dice stay dice.
Display override after a pipe, borrowed from 5eTools: `{{ mana.max | your maximum mana }}`
**(my call)**. Expressions are sandboxed and total.

### 5.3 Character documents (my call)

A character is a document. Frontmatter holds **inputs** (stats, name), **attached content by
id** (ancestry, background, class levels, chosen features, equipment with instance state),
**choice results** keyed by slot, **current resource values**, and a **level history**.

```yaml
---
id: scott.characters.pip
type: character
system: nimble@2          # package revision; see §8
name: Pip
stats: {str: -1, dex: 2, int: 2, wil: 0}   # creation array; level-up bumps are choice effects
ancestry: nimble.ancestries.gnome
background: nimble.backgrounds.scholar
classes: [{id: nimble.classes.mage, level: 4}]
skills: {arcana: 3, lore: 2, examination: 1, perception: 1}
levels:                    # per-level history; HP is a sum of these
  - {level: 1, hp: 10}
  - {level: 2, hp: 4, source: roll}
  - {level: 3, hp: 6, source: roll}
  - {level: 4, hp: 5, source: roll}
choices:
  nimble.classes.mage.level-3.subclass: [nimble.subclasses.mage.control]
  nimble.classes.mage.level-4.spellshaper: [nimble.features.mage.spellshaper.far-reach, nimble.features.mage.spellshaper.…]
  nimble.classes.mage.level-4.key-stat: [int]
equipment:
  - {id: nimble.items.armor.adventurers-garb, equipped: true}
  - {id: nimble.items.weapons.dagger, equipped: true}
state:
  hp: 17
  wounds: 1
  hit_dice: 2
  mana: 6
  temp_hp: 0
  conditions: []
---
```

An effect is active when its document is attached (directly, via a class level the character
has reached, or via a choice), its `when` holds (on an item, `when: equipped` or
`when: carried`), and its `duration` has not elapsed. Predicates like `equipped(armor)`,
`has(id)`, `level(mage)`, `dying` consult this document. `state` is the only part the engine
**writes**, through the system module's procedures and resource refreshes.

### 5.4 Why Markdown + frontmatter

The one authoring format with an ecosystem (Obsidian, Hugo, static-site tools); keeps Steel
Compendium's lessons; works as plain files on day one. Cost: "computed value", "custom field",
"effect", "resource" semantics are defined by this project, since Markdown has none.

**Guarantee (decision, Scott, 2026-10-19): ORF is a strict superset of Markdown.** Every ORF
document is a valid Markdown file with a YAML frontmatter block, and renders acceptably in any
Markdown tool that ignores the format: the properties show as a table, `{{ expr | display }}`
spans show their display text (or the expression when there is none). Nothing in the format may
require a non-Markdown construct. Content should use the display form wherever the raw expression
would read badly in a plain renderer.

**Portable spelling (decision, Scott, 2026-10-19).** `{{ }}` is not Markdown, so a plain renderer
shows the braces. The same construct may be spelled `<span data-orf="expr">display</span>`, which
every CommonMark renderer shows as the display text (raw inline HTML is the only construct that
can hide data and show text). The short form is what people type; the portable form is what the
Write view's Download, the CLI's `fmt --portable`, and any export emit; the engine and linter
accept both (`docs/spec/expressions.md` §6, `src/inline.ts`). Verified in Obsidian: reading view
shows the text, Live Preview shows the tag only while the cursor is inside it.

## 6. The effects model

### 6.1 Declarative contributions (decision, Scott, on my proposal)

Content never assigns to a variable. It **contributes** with an operation, optionally guarded
by a condition, and the system template owns the fold. Every surveyed engine converged on
target + operation + value; this design adds first-class conditions and stack identity.

```yaml
# Background: Devoted Protector
effects:
  - target: wounds.max
    add: 3
    when: ally_nearby            # a boolean the player toggles; see predicates

# Armor item: Chain Shirt
effects:
  - target: armor.base
    base: 9 + min(dex, 2)
    when: equipped
    source: armor
requires: {str: 2}

# Ancestry: Dwarf
effects:
  - target: wounds.max
    add: 1
```

| field | meaning |
|---|---|
| `target` | a registry variable (open namespace, dotted). Unknown = error. |
| one op | `base` (candidates compete, highest wins), `add`, `mul`, `at_least`, `at_most`, `set` (hard override, rare, variable must allow it; shadowed contributions reported, never dropped) **(my call: Dicecloud's set; clamps renamed after both the plan and the implementer misread `max` as "raise to")**. The value is a number, expression, or **lookup** (§6.1a) |
| `when` | predicate in the grammar's boolean subset; evaluated, never decorative. When false, the contribution does not exist; a variable with none holds its default, never null. On items the bare words `equipped` / `carried` mean this item (decision, Scott: replaces the old `transfer` field) |
| `source` | stack key, default = document id; stacking policy groups by it |
| `note` | free text shown beside the contribution in tooltips and provenance |
| `duration` | lifecycle hint: `encounter`, `safe-rest`, `until-full-hp`, a time, or a moment name (§6.4) |

Level gating belongs in the class-level document's `grants`, not in a `when`: the Mage's mana
formula lives on a `Mana` feature granted at level 2, so it needs no condition at all.

### 6.1a Lookups (decision, Scott: replaces nested `if` ladders)

Any op value or variable formula may be a step table keyed on an expression; the row with the
largest key at or below the value wins. Progressions read as the books print them:

```yaml
variables:
  - id: cheat.sneak_attack.dice
    name: your Sneak Attack dice
    type: dice
    formula:
      by: level(cheat)
      rows: {1: 1d6, 3: 1d8, 7: 2d8, 9: 2d10, 11: 2d12, 15: 2d20, 17: 3d20}
```

### 6.1b Labels and descriptions (decision, Scott: tooltips are first-class)

Every variable has a `name` (the phrase a sheet shows: "your Sneak Attack dice") and may have
a `description` (the tooltip). Every effect may carry a `note`. Moments carry a `description`.
The UI never shows an identifier; identifiers are for authors and diffs. Naming guidance for
template authors: name the thing, not the mechanism (`oathsworn.lay_on_hands.pool`, not
`oathsworn.healing.max`; `hit_die.heal.maximized`, not `always_max`).

### 6.2 Fold (default; a variable may override)

```
value = (max(base contributions) + Σ add) × Π mul
value = clamp(value, largest at_least, smallest at_most)
if any set: value = largest set
round per the variable's rounding
```

Nimble Armor: unarmored contributes `base: dex`; each armor contributes its own `base`
`when: equipped`; shield contributes `add`. Highest base wins, so no special case for "armor
vs unarmored". Empty contribution set = the variable's default, never a crash.

### 6.3 Stacking

Effects carry `source`. The template declares a policy per variable or globally:
`same-source: highest` (default), `sum`, or a typed-bonus table for d20-style systems later.

### 6.4 Resources, state, and moments (revised 2026-10-18)

Nimble's sheet is mostly resource bookkeeping, so **resources are first-class**, not plain
variables. A resource has a `max` (a variable, folded like any other), a `current` value stored
in the character's `state`, and **refresh rules** tied to moments.

```yaml
# in the system template
resources:
  - id: hp
    max: hp.max
    refresh: [{on: safe-rest, to: max}]
    floor: 0
  - id: wounds
    max: wounds.max
    refresh: [{on: safe-rest, add: -1}]          # heals one Wound
  - id: hit_dice
    max: hit_dice.max
    refresh: [{on: safe-rest, to: max}]
  - id: mana
    max: mana.max
    when: mana.max > 0
    refresh: [{on: safe-rest, to: max}]

# on the Mage's level-2 Mana feature
effects:
  - {target: mana.max, base: "(max(int, 0) * 3) + level", source: mage-mana}
```

**Moments** are named points in play the engine reports: built-in `catch-breath`,
`make-camp`, `safe-rest`, `encounter-start`, `encounter-end`, `turn-end`, `level-up`, plus
template-declared ones with a description (Nimble: `gain-wound`, `full-hp`). A refresh rule
is the only thing in the format that listens for a moment (`{on: gain-wound, to: max}` for
the Dragonborn breath). The refresh vocabulary is a short closed list, not a second language.

**There are no handlers.** Everything that happens to `state` is the system module's code
(§4.1). Content steers it through variables (`hit_die.heal.bonus add: key when:
in_wilderness` for Wild One).

**Conditions** (Dying, Bloodied, Raging, Concentrating) are boolean variables. Prefer a
formula to a flag whenever the state is computable (`bloodied: hp.current * 2 <= hp.max`);
the system module maintains the rest (`dying`); players toggle the situational ones
(`in_wilderness`, `ally_nearby`).

### 6.5 Variable registry, identifiers, scope, errors

The template publishes every variable: id, display name, type, default, fold, allowed ops,
rounding, `name`, `description`; and every resource, moment, predicate, and function. Content may declare new
variables and resources in its frontmatter; they join the registry for that character.

**Identifiers (my call):** canonical lowercase dotted (`dex`, `wounds.max`, `mana.max`,
`armor.base`); registry may declare upper-case aliases (`DEX`, `KEY`); prose never shows
identifiers. **`key`** resolves to the higher of the class's two Key stats and `secondary`
likewise, both declared by the class document.

**Instance scope (my call):** an item's effects and expressions may reference the item's own
properties with `this.` (`this.strength_requirement`). Nothing else is scoped.

**Errors are loud and located**: unknown variable or target, type mismatch, cycle (members
named), refresh naming an undeclared moment. Partial results plus diagnostics, never
abort, never silent zero.

### 6.6 Provenance

Every value carries its contribution list. The sheet renders it on hover. This is the
creator's feedback loop and the proof the engine produced the number.

## 7. Expression and condition language

Draft specs: [`../../spec/expressions.md`](../../spec/expressions.md),
[`../../spec/effects-and-resources.md`](../../spec/effects-and-resources.md),
[`../../spec/choices.md`](../../spec/choices.md).

### 7.1 Requirements

Dice literals (`1d6`, `2d4`; Nimble's "WIL d8" meaning WIL dice of d8 is `dice(wil, 8)`, with
`wil d8` accepted as sugar **(my call)**), arithmetic, comparison, boolean `and or not`, dotted identifiers, fixed functions
`floor ceil round abs max min if table dice`, template-defined helpers, one table lookup form,
predicates (`equipped(kind)`, `has(id)`, `level(class)`, `proficient(thing)`, state booleans
like `dying`), **two evaluation phases** (compile: variables substituted, dice symbolic; roll:
consumer-side), system-defined integer semantics, sandboxed and total, unknown identifier = hard
error with position.

### 7.2 Choice of language (my call)

Nothing off the shelf has dice literals, conditionals, and matching implementations across
host languages (survey §6). A small purpose-built PEG grammar with a language-neutral JSON
conformance corpus. Reference implementation TypeScript; a second implementation later
proves the spec. Syntax leans toward what players read: Roll20/Foundry dice notation, plain
arithmetic, words for logic.

### 7.3 The torture test (go/no-go gate; Scott judges)

Written as content documents in the proposed syntax **before** grammar or engine code beyond a
spike. If a Nimble homebrewer would not read them and nod, redesign. Nimble items, from recon
§6, plus two 5e shapes as insurance:

1. Armor: unarmored `dex`, Cloth `n + dex`, Mail `n + min(dex, 2)`, Plate flat; STR
   requirements; shields add; the highest applicable base wins.
2. Catch Breath vs Make Camp Hit Die healing (roll vs max, + STR with sign), with Oozeling
   (always max) and Wild One (+KEY in the wild) overrides: the procedure is engine code, the
   overrides are variables.
3. Mage mana max `(max(int,0)*3)+level`, unlocked at level 2.
4. Elemental Surge: temporary mana at Initiative, encounter lifetime, scaling WIL →
   WIL+1d4 → WIL+2d4 by level.
5. A class pool: Oathsworn's healing pool (5 × level, Safe Rest refresh) and one dice or
   charge pool from The Cheat or Zephyr, chosen from the class read.
6. Devoted Protector: `wounds.max add: 3 when: ally_nearby`.
7. Initiative → starting actions by digit count (engine code; the Cheat's floor is `at_least`).
8. Mana cost modifiers: upcast ceiling; Methodical Spellweaver −2 (min 1) for +1 action.
9. Event refreshes: Dragonborn "recharges whenever you gain a Wound"; Gnome "resets at full HP".
10. Level-up HP as per-level history (roll with advantage; 2.0.3 has no average option).
11. Non-proficient armor: Defend costs 2 actions; non-proficient weapon cannot crit.
12. Dying (engine code), with the two variables classes may override.
13. Spells known = schools × unlocked tier; Mage tier N at level 2N.
14. 5e insurance: Monk Unarmored Defense vs Mage Armor vs armor (competing bases).
15. 5e insurance: Bless cast twice does not stack (`same-source: highest`).

## 8. System templates

A package of documents (`type: variables | resources | events | predicates | functions |
table | content-type | slots | package`). The `nimble` package declares: the four stats and
`key`/`secondary`; skills (10) with points and cap; saves with advantage flags; `hp.max`
(fold `add`, fed by the level history), `wounds.max` (default 6), `hit_dice.max` (default
`level`), `hit_die.size` (fold base=max; class contributes), `armor.base`/`armor`;
`initiative`; `speed` 6; `inventory.slots` `10 + str`; `languages` `1 + int`; resources
`hp wounds hit_dice temp_hp actions`; moments of §6.4; predicates; content types with
suggested properties; **choice slots** (§11). The Field Rest / Safe Rest / damage / Dying
procedures are the engine's `nimble` system module, not template documents.

**Packaging and versioning (my call):** a manifest document (`type: package`, `id: nimble`)
lists members; integer revisions with a human `label`. Content declares `system: nimble`
(latest) or `system: nimble@2`. **Printing (decision, Scott):** the template encodes **2.0.3 (first printing)**: Armor (not
Defense), skill cap 12, roll-only level-up HP. The "3.0" files are the second-printing playtest
and are likely to change, so they are not encoded; their known differences are recorded as
`printing_diff` notes on the affected documents so a `nimble@2` revision can be cut when the
reprint is final. The sheet shows the package label (`"2.0.3"`).

Required notices (both verbatim, prominent in the app and in the package manifest):
"This app is free to use for anyone who already owns the content, is trying the system out, or
cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by
purchasing the official content at nimbleRPG.com." and "[Product Name] is an independent
product published under the Nimble 3rd Party Creator License. Nimble TTRPG © Nimble Co."

## 9. Identity, versioning, publishing (my calls, MVP-sized)

- Ids: `namespace.collection.slug`, modeled on Steel Compendium's SCC codes.
- Revisions: integers per id; `id@N` pins. Supersede, never delete.
- Registry for the MVP: a folder of files (the app bundles the `nimble` package and reads a
  user content folder or upload). Characters are documents the app stores; cross-device sync
  is a thin hosted store of character documents keyed by a share link **(my call: simplest
  thing that satisfies the phone + laptop goal; auth later)**.
- Dependencies: `system` and `requires` (content ids or stat minimums). Missing = load error.

## 10. Reference implementation

**Repo (decision, Scott):** `scottTomaszewski/orf` until a name exists. **My call:** Go
prototype tagged `prototype-2023` and removed from `main`; standalone repo, not a Steel
Compendium submodule; code MIT; spec licence open item; Nimble content under the Nimble
notice, in its own directory with its own LICENSE note.

**Stack (my call):** TypeScript throughout. Engine as a dependency-free library passing the
conformance corpus. Sheet as a web app installable to a phone home screen. Framework, editor,
state library, hosting are the builder's.

- **Engine** (`src/`): `document.ts` parser, `registry.ts`, `lint.ts`, `expr/` (parser,
  evaluator, values), `fold.ts` (stacking, set shadowing, provenance), `character.ts`
  (assembly: template docs, ancestry, background, class levels, grants, choices, subclasses,
  equipment), `engine.ts` (`evaluateCharacter` → `Sheet`: lazy cycle-checked fold, predicates,
  resources, `render`), `moments.ts` (refresh rules).
- **Nimble system module** (`src/systems/nimble.ts`): damage, heal, Catch Breath, Make Camp,
  Safe Rest, Initiative, turn and encounter ends, Dying, wound gain; reads the steering
  variables; fires `gain-wound` and `full-hp`. Takes rolls as arguments; never rolls.
- **Sheet**: create, play, level-up views (§3); provenance hover; Reader view of any attached
  document; content folder/upload for homebrew; license notice. **UI style (decision, Scott):
  the High-Fantasy Steel design language from Steel Compendium** (workspace `DESIGN.md`:
  charcoal surfaces, steel chrome, one teal accent, saturated color only for semantics,
  Cinzel/Petrona display with a serif body). Port the tokens and type roles as a standalone
  stylesheet; the Draw Steel marks and the commercial body face do not travel. Portability of
  the tokens is itself a deliverable: the Draw Steel sheet reuses them later.
- **Nimble package**: core + Mage, The Cheat, Oathsworn, Zephyr + the ancestries and backgrounds (data entry;
  the official Foundry system's compendium JSON is a cross-check, not a source to copy).

## 11. Choices (pulled forward in this revision; my call on shape)

A usable sheet needs level-up, so the Dicecloud **slot** model is in scope. A class-level
document `grants` content unconditionally and declares `choices` as slots:

```yaml
---
id: nimble.classes.mage.level-4
type: class-level
class: nimble.classes.mage
level: 4
grants: [nimble.features.mage.tier-2]
choices:
  - slot: spellshaper
    count: 2
    from: {type: feature, tags: [mage, spellshaper]}
    unique: character
  - slot: key-stat
    count: 1
    from: {options: [int, wil]}
    effect: {target: "{{ choice }}", add: 1}
---
```

Choice results live in the character's `choices` map keyed by `<class-level id>.<slot>`.
Chosen content is attached like any other. Retraining = editing a choice. The engine
validates `count`, `unique`, and `from`; the sheet renders the picker. Deferred: choices
whose options depend on earlier choices beyond tag filters; multiclassing UI.

## 12. Order of work

Each step gated by the one before.

1. **Torture test on paper** (§7.3) in proposed syntax, linted for shape and references.
   **Gate: Scott judges readability.** Round 1 (2026-10-18): approved the value layer,
   rejected the event layer; this revision is the result. Round 2: the regenerated packet.
2. **Grammar spec and conformance corpus** (expressions, predicates, lookups). **Done
   2026-10-18**: `src/expr/`, `conformance/expressions.json` (63 cases).
3. **Engine**: parser, registry, fold, evaluator, resources and moments, choices,
   provenance; the Nimble system module. **Done 2026-10-18** (plan
   `../plans/2026-10-18-phase2-engine.md`): `src/fold.ts`, `src/character.ts`, `src/engine.ts`,
   `src/moments.ts`, `src/systems/nimble.ts`; `npx tsx src/cli.ts sheet scott.characters.pip
   systems/nimble examples/nimble` prints Pip with provenance.
4. **Nimble package**: core, Mage, The Cheat, Oathsworn, Zephyr, ancestries, backgrounds, armor and weapons.
5. **Sheet**: create → play → level-up, phone-first, license notice, homebrew folder.
   **Built 2026-10-19** (plan `../plans/2026-10-19-phase3-sheet.md`): `sheet/` (Vite +
   Preact, High-Fantasy Steel tokens in `sheet/src/styles/steel.css`), on the level 1–5
   content plus Fire/Ice/Lightning/Radiant spells to tier 2. Visual check on a phone and the
   table test are next; levels 6–20 and the remaining ancestries, backgrounds, and items are
   the next data plan.
5a. **Creator surfaces** (done 2026-10-19, plan `../plans/2026-10-19-phase4-creator.md`): the
   name (ORF), the creator guide (`docs/guide/writing-content.md`, examples linted by test),
   authoring helpers in the engine (`src/authoring.ts`), the sheet's **Write** view (form from
   the system's content types, two-way source, live lint, save to homebrew), the Create
   stat-placement fix, a desktop visual pass, and a GitHub Pages workflow.
6. **Table test**: Scott's game for a few sessions; fix what hurts.
7. **Post**: Nimble Discord, subreddit, note to Sly Flourish, with a short clip of the
   homebrew ripple. Interest decides the next phase (remaining classes, authoring form,
   Draw Steel package).

## 13. Open items

For Scott:

- Confirm "thief" means The Cheat.
- Licence for the specification text (code MIT; Nimble content under the Nimble notice).

Settled 2026-10-18 by Scott's gate review: handlers out (engine module), `transfer` →
`when: equipped`, lookups in, `min`/`max` → `at_least`/`at_most`, the renames
(`oathsworn.lay_on_hands.pool`, `hit_die.heal.maximized`), descriptions and notes.
Settled 2026-10-19 by Scott: the name (ORF, Open Rules Format); the Markdown-superset guarantee
(§5.4); the interest test is creator adoption (§1).

Prior art found 2026-10-20: **Open Character Format** (pixelqueue/opencharacter), the closest
existing design — survey Report H. Lessons queued there: roll-level and incoming-change effect
targets, per-key stack policies, pack manifest license/credit keys, a possible ORF↔OCF export.

Open after the 2026-10-19 community conversations (notes and ideas in
`docs/ideas/2026-10-19-marketplace-and-portable-prose.md`): a creator marketplace as the likely
condition for success; what, if anything, the format offers against AI piracy; and the portable
form of `{{ expr | display }}` so plain Markdown editors show prose (leaning `<span data-orf>`).

Builder's calls, flagged: exact PEG for `when`; `wil d8` sugar; the hosted character store;
framework and hosting; how the sheet renders provenance on a phone.
