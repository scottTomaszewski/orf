# Open Rules Format: design

Date: 2026-10-18. Status: approved in principle 2026-10-18 (5e-first draft); **revised the same
day to Nimble-first** after Scott's product decision; revision confirmed by Scott 2026-10-18
(2.0.3, four classes, no accounts, High-Fantasy Steel UI, native execution). **Phase 1 (torture
test) in review**: `examples/nimble/torture-test/README.md`. Tracker:
Linear SC-451 (project "Open Rules Format"). "ORF" / "Open Rules Format" is a **placeholder
name**; nothing depends on it.

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
   roll-time dice), applies **events** to character state (damage, spend, rest), reports
   provenance and diagnostics. Sections 6 and 7.
4. **Registry / publishing**: stable ids, revisions, dependency declarations. For the MVP, a
   folder of files. Section 9.
5. **Consumers**: the Nimble sheet (the product), and a Reader view inside it. Section 10.

```
content docs (md+yaml) ──┐
system template (same) ──┼──► engine: parse ─► registry ─► fold ─► evaluate ─► provenance
character doc (same) ────┘                 │                      ▲
                                           │ events: damage, spend HD, rest, level-up
                                           ▼
                                  sheet (phone/laptop)  ·  reader view
```

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
stats: {str: -1, dex: 2, int: 3, wil: 0}
ancestry: nimble.ancestries.gnome
background: nimble.backgrounds.scholar
classes: [{id: nimble.classes.mage, level: 4}]
skills: {arcana: 3, lore: 2, examination: 1, perception: 2}
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
has reached, or via a choice), its `when` holds, and its lifecycle allows (`transfer`,
equipped state, duration). Predicates like `equipped(armor)`, `has(id)`, `level(mage)`,
`dying` consult this document. `state` is the only part the engine **writes**, via events.

### 5.4 Why Markdown + frontmatter

The one authoring format with an ecosystem (Obsidian, Hugo, static-site tools); keeps Steel
Compendium's lessons; works as plain files on day one. Cost: "computed value", "custom field",
"effect", "resource" semantics are defined by this project, since Markdown has none.

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
    transfer: equipped
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
| one op | `base` (candidates compete, highest wins), `add`, `mul`, `min`, `max`, `set` (hard override, rare, variable must allow it; shadowed contributions reported, never dropped) **(my call: Dicecloud's proven set)** |
| `when` | predicate in the grammar's boolean subset; evaluated, never decorative |
| `source` | stack key, default = document id; stacking policy groups by it |
| `transfer` | `always` (default for features) / `equipped` / `carried` |
| `duration` | lifecycle hint: `encounter`, `safe-rest`, `until-full-hp`, a time, or an event name (§6.4) |

### 6.2 Fold (default; a variable may override)

```
value = (max(base contributions) + Σ add) × Π mul
value = clamp(value, largest min, smallest max)
if any set: value = largest set
round per the variable's rounding
```

Nimble Armor: unarmored contributes `base: dex`; each armor contributes its own `base`
while equipped; shield contributes `add`. Highest base wins, so no special case for "armor
vs unarmored". Empty contribution set = the variable's default, never a crash.

### 6.3 Stacking

Effects carry `source`. The template declares a policy per variable or globally:
`same-source: highest` (default), `sum`, or a typed-bonus table for d20-style systems later.

### 6.4 Resources, state, and events (new in this revision; my call on shape)

Nimble's sheet is mostly resource bookkeeping, so **resources are first-class**, not plain
variables. A resource has a `max` (a variable, folded like any other), a `current` value stored
in the character's `state`, and **refresh rules** tied to events.

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
  - id: temp_hp
    refresh: [{on: safe-rest, to: 0}]

# in the Mage class document
resources:
  - id: mana
    max: mana.max                                 # mana.max declared below
    refresh: [{on: safe-rest, to: max}]
    when: level(mage) >= 2
variables:
  - {id: mana.max, name: your maximum mana, formula: "(max(int, 0) * 3) + level"}
```

**Events** are the verbs the sheet exposes: `damage(n, crit)`, `heal(n)`, `spend(resource,
n)`, `restore(resource, n)`, `catch-breath(hit_dice: k)`, `make-camp(hit_dice: k)`,
`safe-rest`, `encounter-start`, `encounter-end`, `turn-end`, `level-up`, plus
**template-declared events** (`gain-wound`, `full-hp`, `rage-end`) that content can refresh
on (`refresh: [{on: gain-wound, to: max}]` for the Dragonborn ability). Event handlers are
declared in the template as ordered rules in the expression grammar; e.g. `damage` applies to
`temp_hp` first, then `hp`, and on reaching 0 fires `gain-wound(1)` and sets the `dying`
condition. Content may **not** define new event handlers in this phase; it may contribute to
the variables those handlers read (`hit_die.heal.bonus add: key when: in_wilderness` for Wild
One).

**Conditions** (Dying, Bloodied, Raging, Concentrating) are boolean variables in `state`,
set by events, readable in `when`.

### 6.5 Variable registry, identifiers, scope, errors

The template publishes every variable: id, display name, type, default, fold, allowed ops,
rounding; and every resource, event, predicate, and function. Content may declare new
variables and resources in its frontmatter; they join the registry for that character.

**Identifiers (my call):** canonical lowercase dotted (`dex`, `wounds.max`, `mana.max`,
`armor.base`); registry may declare upper-case aliases (`DEX`, `KEY`); prose never shows
identifiers. **`key`** resolves to the higher of the class's two Key stats and `secondary`
likewise, both declared by the class document.

**Instance scope (my call):** an item's effects and expressions may reference the item's own
properties with `this.` (`this.strength_requirement`). Nothing else is scoped.

**Errors are loud and located**: unknown variable or target, type mismatch, cycle (members
named), event referencing an undeclared resource. Partial results plus diagnostics, never
abort, never silent zero.

### 6.6 Provenance

Every value carries its contribution list. The sheet renders it on hover. This is the
creator's feedback loop and the proof the engine produced the number.

## 7. Expression and condition language

Draft specs written in Phase 1: [`../../spec/expressions.md`](../../spec/expressions.md),
[`../../spec/effects-resources-events.md`](../../spec/effects-resources-events.md),
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
   (always max) and Wild One (+KEY in the wild) overrides.
3. Mage mana max `(max(int,0)*3)+level`, unlocked at level 2.
4. Elemental Surge: temporary mana at Initiative, encounter lifetime, scaling WIL →
   WIL+1d4 → WIL+2d4 by level.
5. A class pool: Oathsworn's healing pool (5 × level, Safe Rest refresh) and one dice or
   charge pool from The Cheat or Zephyr, chosen from the class read.
6. Devoted Protector: `wounds.max add: 3 when: ally_nearby`.
7. Initiative → starting actions by digit count (an event handler in the template).
8. Mana cost modifiers: upcast ceiling; Methodical Spellweaver −2 (min 1) for +1 action.
9. Event refreshes: Dragonborn "recharges whenever you gain a Wound"; Gnome "resets at full HP".
10. Level-up HP as per-level history (roll with advantage; 2.0.3 has no average option).
11. Non-proficient armor: Defend costs 2 actions; non-proficient weapon cannot crit.
12. Dying state machine, with whatever overrides the four classes carry (else template only).
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
`hp wounds hit_dice temp_hp actions`; events of §6.4; predicates; the Field Rest / Safe
Rest handlers; content types with suggested properties; **choice slots** (§11).

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

- **Engine**: document parser, registry, fold, expression evaluator (compile/roll), events
  and resource state machine, provenance, diagnostics.
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
   **Gate: Scott judges readability.**
2. **Grammar spec and conformance corpus** (expressions, predicates, events).
3. **Engine**: parser, registry, fold, evaluator, resources and events, choices, provenance.
4. **Nimble package**: core, Mage, The Cheat, Oathsworn, Zephyr, ancestries, backgrounds, armor and weapons.
5. **Sheet**: create → play → level-up, phone-first, license notice, homebrew folder.
6. **Table test**: Scott's game for a few sessions; fix what hurts.
7. **Post**: Nimble Discord, subreddit, note to Sly Flourish, with a short clip of the
   homebrew ripple. Interest decides the next phase (remaining classes, authoring form,
   Draw Steel package).

## 13. Open items

For Scott:

- The project's name.
- Confirm "thief" means The Cheat.
- Licence for the specification text (code MIT; Nimble content under the Nimble notice).

Builder's calls, flagged: exact PEG for `when`; `wil d8` sugar; the hosted character store;
framework and hosting; how the sheet renders provenance on a phone.
