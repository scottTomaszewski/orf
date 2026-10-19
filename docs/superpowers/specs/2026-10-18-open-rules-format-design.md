# Open Rules Format: design

Date: 2026-10-18. Status: draft for review. Tracker: Linear SC-451 (project "Open Rules
Format"). The name "ORF" / "Open Rules Format" is a **placeholder**; a real name is an open
item and nothing in this document depends on it.

Companion research: [`../research/2026-10-18-prior-art-survey.md`](../research/2026-10-18-prior-art-survey.md)
(Foundry Active Effects, D&D Beyond Modifiers, GCS, PCGen, Dicecloud, expression languages,
and the 2023 ORF prototype). Claims below about those systems are sourced there.

Where a choice was made by Scott in conversation it is stated as a decision. Where I made a
call it is marked **(my call)** so it can be overturned cheaply.

## 1. Intent

TTRPG content (rules, classes, spells, monsters, items, whole systems) is published as PDFs,
print, or one proprietary data format per digital tool. Every VTT, character-sheet app, and
notes plugin re-enters the same content by hand, and creators without programmers cannot
reach any of them. Communities like 5eTools exist because no open interchange format does.

This project is an **open, system-agnostic content format** plus a reference engine, built so
that a non-technical creator can write a spell, a monster, a class, or an entire system once,
publish it, and have every tool that speaks the format pick it up immediately, including
errata as new revisions. The format and the engine are free and open. End-user products built
on them (a character-sheet site, a reader) may later be freemium; that is out of scope here.

The lessons come from Steel Compendium, which already does annotated-text-to-structured-data
for one system (Draw Steel), and from the 2023 ORF prototype, which computed a 5e character's
derived values from inputs. Steel Compendium is expected to eventually consume this format
rather than the other way round.

**Why now, and what success looks like.** The first deliverable is an interest test: a
recorded screen capture of the demo, posted to Reddit and relevant Discords. If the community
responds, Scott invests evenings and weekends. The personal motivation that outlives the
interest test: Scott plays Nimble with his kids and there is no decent online character sheet
for it, so a Nimble sheet built on this format is the first real use after the demo. That
keeps "system-agnostic" honest: 5e is the stress test, Nimble is the second system, and
nothing in the design may assume 5e.

## 2. Goals, non-goals, anti-goals

**Goals**

- A creator with no programming background can author content in a web form in minutes,
  including values that compute from character state.
- The same content renders as readable prose in a reader and as resolved numbers on a
  character sheet, from one source.
- Content from authors who have never met composes: a new feat can modify Armor Class without
  the system definition or the sheet knowing the feat exists.
- The engine expresses real 5e rules cleanly, including the ugly ones (Unarmored Defense
  variants, "use the higher of", multiclass spell slots, conditional bonuses).
- Content is versioned so errata is a new revision that consumers can adopt or pin.
- The format works as plain files outside our tools (an Obsidian vault of these files is
  valid content).

**Non-goals (for this phase)**

- Modeling character-building choices (level-up options, slot selection). Deferred to the
  phase after the demo. Section 11 records the direction.
- A marketplace, payments, accounts beyond what publishing needs.
- Translations, accessibility work, offline sync. All are requirements of the eventual product
  and must not be designed out, but none is built now.
- Draw Steel or Nimble content. 5e SRD is the sole system for this phase. Nimble is the
  declared next system, so the torture test should be read with "would this also express
  Nimble?" in mind, but no Nimble template is written now.
- Per-system UI component libraries and theming.

**Anti-goals** (would make this a failure even if it technically works)

- A format only programmers can author. If the torture test (section 7.4) cannot be written in
  a form a homebrewer would read and nod at, stop and redesign rather than ship.
- A closed vocabulary of modifiable things. D&D Beyond's 1,900 enumerated subtypes are the
  cautionary tale.
- Conditions as free text the engine ignores (D&D Beyond, GCS). Every `when` is evaluated.
- Silent no-ops: content that saves fine and does nothing. Unknown targets and variables are
  errors with a location.
- Imperative mutation of variables by content (`AC = AC + 1`). Content contributes; the system
  folds.

## 3. The demo (acceptance scenario)

The first milestone is one scripted demo that shows the value of a standard to an ecosystem.
Audience: TTRPG creators and tool authors, not programmers. It must be digestible in a few
minutes, which is why it is a spell and not a class.

**Decision (Scott):** the demo runs locally on one laptop and is recorded as a screen capture
for a Reddit post and Discord posts. Nothing is deployed, no accounts, no public registry.
The demo is an interest test, so it is sized to be the smallest thing that makes the
"ripple across tools" point. **My call:** two consumers (Reader and Sheet) are the minimum
that proves the point; the Card renderer is built only if cheap.

1. In the web authoring app, the creator clicks **New**, picks system **D&D 5e SRD** and type
   **Spell**, names it, and fills a short property form (level, school, range, components,
   duration). They type the description. Where a number depends on the caster they type an
   expression; autocomplete offers the system's variables (`spell.mod`, `spell.save_dc`,
   `spell.attack`). At least one value in the demo spell is computed.
2. They click **Publish**. The spell gets a stable identifier and revision 1.
3. Three consumers we built update with no change on their side: a **Reader** showing the
   spell as rules text ("1d10 + your spellcasting modifier"), a **Character Sheet** showing it
   for a specific wizard ("1d10 + 4", "DC 15"), and a **Card** renderer (statblock-style).
4. The creator changes one number, publishes revision 2, and all three consumers show the
   change.

The hover-to-see-provenance affordance ("DC 15 = 8 + prof 3 + int.mod 4") should be in the sheet
if cheap; it is the proof that the engine, not a template, produced the number.

A monster is an acceptable substitute for the spell if it demos better; the engine
requirements are the same.

## 4. Architecture overview

Five parts. Only the first three are "the standard"; the last two are our reference
implementations and anyone may build others.

1. **Content documents**: Markdown with YAML frontmatter. One document per entity (a spell, a
   feat, a monster, a class feature). Section 5.
2. **System templates**: a package of documents that defines a game system: its variables and
   how they compute, its content types and their suggested properties, its fold and stacking
   policies, its predicate vocabulary, its tables. Section 8. A system template is itself
   content in the same format.
3. **The engine**: parses documents, resolves a character's variables by folding contributions
   from all active content, evaluates expressions in two phases (compile-time numbers,
   roll-time dice), and reports provenance and errors. Sections 6 and 7.
4. **Registry / publishing**: stable identifiers, revisions, and a way for consumers to fetch
   and subscribe. Section 9.
5. **Consumers**: the authoring web app, Reader, Sheet, Card. Section 10.

```
creator ──► authoring app ──► content doc (md+yaml) ──► registry (id@rev)
                                                           │
            system template (md+yaml, same format) ───────┤
                                                           ▼
                                   engine: parse ─► fold contributions ─► evaluate ─► provenance
                                                           │
                              ┌────────────────────────────┼─────────────────────┐
                              ▼                            ▼                     ▼
                           Reader                        Sheet                  Card
                      (prose, symbolic)          (resolved per character)   (statblock)
```

## 5. Content format

**Decision (Scott):** Markdown body + YAML frontmatter, with the authoring UI rendering the
frontmatter as a property form (Obsidian-Properties style) so creators never see raw YAML.
Frontmatter alone "might scare people off"; a mix of fields and prose is the target.

### 5.1 Document shape

```markdown
---
id: srd5e.homebrew.ember-lash        # stable identity, see §9
type: spell                          # a content type the system template declares
system: srd5e@5.1                    # which system template this is written against
name: Ember Lash
level: 1
school: evocation
casting_time: 1 action
range: 60 feet
components: [V, S]
duration: instantaneous
tags: [fire, homebrew]
effects: []                          # §6; empty for a plain spell
---
A whip of cinders lashes out from your hand. Make a ranged spell attack
({{ spell.attack }} to hit) against one creature in range. On a hit, the target
takes {{ 1d10 + spell.mod }} fire damage and must succeed on a Dexterity saving
throw (DC {{ spell.save_dc }}) or be knocked prone.

**At Higher Levels.** The damage increases by 1d10 for each slot level above 1st.
```

- **Properties are open.** The system template *suggests* properties per content type (that is
  what populates the form). Creators may add any property. Unknown properties are preserved
  and rendered, never rejected. **Decision (Scott):** custom fields are essential; we cannot
  predict every variable a creator needs.
- **Reserved properties** (`id`, `type`, `system`, `name`, `effects`, `requires`, `tags`) have
  defined meaning. Everything else is the creator's.
- **Property values may be expressions.** A property whose value is a string containing
  `{{ }}` is computed like body text. (Suggested convention: a property named `*_formula` or a
  value wrapped in `{{ }}`. **My call:** use `{{ }}` everywhere; one rule to learn.)

### 5.2 Inline expressions in prose

`{{ expr }}` in body text or property values is evaluated by the engine. Two renderings:

- **Symbolic** (reader): variables render as their display names from the system template
  (`{{ 1d10 + spell.mod }}` → "1d10 + your spellcasting ability modifier").
- **Resolved** (sheet): variables substitute for the character; dice stay dice
  (`1d10 + 4`); pure numbers collapse (`DC 15`).

An optional display override follows a pipe, borrowed from 5eTools: `{{ spell.save_dc | your
spell save DC }}`. **My call:** keep this; 5eTools' prose reads well precisely because authors
control the text.

Expressions are sandboxed and total: they cannot call out, loop, or mutate. Section 7.

### 5.3 Character documents (my call)

A character is a document in the same format. Its frontmatter holds inputs (ability scores,
name) and **references to attached content by id**: classes with levels, features, spells,
and equipment, where an equipment entry carries instance state (`equipped: true`,
`attuned: true`). An effect is active on a character when its document is referenced by the
character, its `when` holds, and its lifecycle allows (an item's `transfer` and equipped
state; a spell effect's duration). Predicates like `equipped(armor)` and `has(feature)`
consult this list. Content in the registry that no character references does nothing to
anyone.

```yaml
---
id: demo.characters.mira
type: character
system: srd5e
name: Mira
abilities: {str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 11}
classes: [{id: srd5e.classes.wizard, level: 5}]
features: [srd5e.features.wizard.arcane-recovery]
spells: [srd5e.spells.fire-bolt, srd5e.homebrew.ember-lash]
equipment: [{id: srd5e.items.quarterstaff, equipped: true}]
---
```

For the demo, the sample wizard's spell list includes the id the creator will publish, so
revision 2 of the spell flows to the sheet with no edit to the character. (Alternative, if
it demos better: the character subscribes to a collection, `spells: [..., demo.homebrew.*]`.)

### 5.4 Why Markdown + frontmatter

It is the one authoring format with an existing ecosystem (Obsidian, Hugo, every static-site
tool), it keeps the Steel Compendium lessons applicable, and it means the format works from
day one as plain files. The cost is that "computed value" and "custom field" semantics have
no Markdown standard and are defined by this project.

## 6. The effects model: how content changes a character

This is the core of the design and the part the prior-art survey most informs.

### 6.1 The problem

A system template can define `AC`. It cannot know about every feat, spell, subclass, or item
that will ever modify AC, including ones written years from now. The naive answer, letting
content assign to variables (`OTHER_AC_BONUSES = OTHER_AC_BONUSES + 1`), makes the result
depend on evaluation order and makes every feature know the formula it is poking.

### 6.2 Declarative contributions

**Decision (Scott, on my proposal):** content never assigns. It **contributes** to a named
variable with an operation, optionally guarded by a condition, and the system template owns
how contributions fold. Every mature sheet engine surveyed converged on target + operation +
value; this design adds first-class conditions and stack identity, which they lack.

```yaml
# Feat granting +1 AC
effects:
  - target: ac.bonus
    add: 1

# Monk: Unarmored Defense
effects:
  - target: ac.base
    base: 10 + dex.mod + wis.mod
    when: not equipped(armor) and not equipped(shield)
    source: unarmored-defense

# Spell: Mage Armor (while active on the target)
effects:
  - target: ac.base
    base: 13 + dex.mod
    when: not equipped(armor)
    source: mage-armor
    duration: 8 hours
```

An effect record has:

| field | meaning |
|---|---|
| `target` | a variable from the system's registry (open namespace, dotted). Unknown target = error. |
| one operation key | `base` (candidates compete, highest wins), `add`, `mul`, `min`, `max`, `set` (hard override, applied last). **My call:** these six are Dicecloud's proven minimal set. `base` is the op for "alternative formulas for the same thing" (AC calculations, speed sources). `set` is rare and a variable must declare that it accepts `set`; an `add` to a variable that ends up `set` is reported as a shadowed contribution in provenance and as a lint warning, never silently dropped. `advantage`/`disadvantage` style flag ops come when 5e rolls need them. |
| `when` | a predicate in the expression grammar's boolean subset. Omitted = always. Evaluated, never decorative. |
| `source` | stack key, defaults to the document `id`. Used by stacking policy. |
| `duration`, `transfer` | lifecycle hints for consumers (how long an effect lasts; whether an item's effect applies while carried or only when equipped). **My call:** define the fields now, implement minimally. |

### 6.3 Fold rules

Each variable in the system registry declares how contributions fold. The default fold,
taken from Dicecloud because it is the cleanest statement of what 5e needs:

```
value = (max(base contributions) + Σ add) × Π mul
value = clamp(value, largest min, smallest max)
if any set: value = largest set          # after stacking policy has deduped
round per the variable's declared rounding (5e: floor)
```

"Choose the highest AC formula" therefore needs no special case: Unarmored Defense, Mage
Armor, and Draconic Resilience each contribute a `base` to `ac.base` and the largest applicable
one wins. Armor items also contribute a `base`, so when armor is equipped the unarmored
formulas drop out via their `when` and the armor's value stands. The system template composes `ac = ac.base + ac.bonus +
ac.shield`.

A variable may override the default fold (e.g. `speed` folds as max of alternatives; `hp.max`
folds as sum). Empty contribution set = the variable's declared default, never a crash (the
ORF prototype crashed here).

### 6.4 Stacking policy

5e: "the effects of the same spell cast multiple times don't combine"; typed bonuses in other
d20 games don't stack within a type. No surveyed engine except PCGen models this. Here:

- Every effect carries a `source` (defaults to document id). The system template declares a
  stacking policy per variable or globally: `same-source: highest` (5e default), `sum`, or a
  typed-bonus table (PCGen-style, for Pathfinder-likes later).
- Contributions are grouped by `source` and reduced by the policy *before* the fold.

### 6.5 Variable registry and errors

The system template publishes every variable with: id, display name (for symbolic rendering),
type (integer, dice, boolean, text, list), fold rule, allowed operations, default, and
rounding. The authoring app's autocomplete reads this registry. Content may **declare new
variables** in its own frontmatter (a subclass adding `ki.points`), which join the registry
for that character.

**Identifier convention (my call):** one canonical form, lowercase dotted (`dex.mod`,
`spell.save_dc`, `ac.base`, `prof`). The registry may declare short aliases (`DEX` for
`dex.mod`) that the grammar accepts and autocomplete offers; the torture test decides whether
aliases earn their keep. Prose never shows identifiers: symbolic rendering uses display names.

**Instance scope (my call):** most variables are character-global. Content that is an
*instance* (an armor, a weapon, an attack) has its own properties, and effects or expressions
inside that document may reference them with a `this.` prefix (`this.max_dex_bonus`,
`this.strength_requirement`). Nothing else is scoped. This is enough for armor caps and
weapon-specific damage riders in the torture test; attacks as first-class objects are not in
this phase, so item 15 is judged on Dueling and Defense, not Great Weapon Fighting's reroll.

Errors are loud and located. Unknown variable, unknown target, type mismatch, and dependency
cycles (with the cycle's members named) are reported per variable. The engine returns partial
results plus diagnostics rather than aborting. Resolving unknowns to zero, as PCGen, Dicecloud
and GCS do, is explicitly rejected.

### 6.6 Provenance

Every resolved value carries its contribution list (`ac = 15: base 10 + DEX 3 + WIS 2 from
unarmored-defense`). Consumers render it on hover. This is both the creator's feedback loop
(the D&D Beyond failure is "it saved and did nothing") and the demo's proof.

## 7. Expression and condition language

### 7.1 Requirements

- Dice literals first-class (`1d10`, `4d6kh3`), arithmetic, comparison, boolean operators.
- Dotted identifiers resolving to registry variables; display names for symbolic rendering.
- A fixed function set: `floor`, `ceil`, `round`, `max`, `min`, `if(cond, a, b)`, `abs`,
  plus system-template-defined helpers (section 8). No user-defined functions in content.
- One lookup form into system tables (`table(spell_slots, caster_level, 3)`).
- Predicates for conditions: `equipped(armor)`, `has(feature)`, `level(monk) >= 5`,
  `proficient(skill)`. The vocabulary comes from the system template; the grammar is shared.
- **Two evaluation phases**: *compile* (substitute variables, fold, keep dice symbolic:
  `{monk.level}d8` → `4d8`) and *roll* (a consumer rolls). Taken from Dicecloud. Sheets show
  compile-phase results; readers show symbolic.
- Integer semantics defined by the system (5e: floor division), not by the host language.
- Total and sandboxed: no loops, no I/O, no mutation. Unknown identifier is a hard error with
  position.

### 7.2 Choice of language

The survey found nothing off the shelf with dice literals, conditionals, and matching
implementations in more than one host language. Nunjucks and Liquid have no dice and silent
undefineds. CEL has Go and partial TypeScript but no dice and programmer syntax. Spreadsheet
formulas have no shared engine. JavaScript-eval approaches are not a sandbox for untrusted
homebrew.

**My call:** a small purpose-built grammar, specified as a PEG, with a language-neutral JSON
conformance corpus (expression, environment, expected symbolic output, expected resolved
output, expected errors). The reference implementation is TypeScript (section 10). A second
implementation in another language later proves the spec by passing the same corpus. The cost
is owning a grammar forever; the mitigation is keeping it small and freezing it early.

Syntax leans toward what players already read: Roll20/Foundry dice notation, plain
`+ - * /`, and words rather than symbols for logic (`and`, `or`, `not`) in `when` clauses.

### 7.3 Prose rendering rules

Readers render `{{ }}` symbolically using the registry display names; sheets render resolved.
Display overrides via `|`. A variable with no display name renders as its id, which is a lint
warning for the system template, not an error for the content.

### 7.4 The torture test (go/no-go gate)

Before any grammar or engine code is written beyond a spike, write the following 5e rules as
content documents in the proposed syntax and judge readability. If a homebrewer would not read
them and nod, redesign. This is the foundational work SC-451 asked for. **Scott judges the
gate**; the plan has a blocking review checkpoint here, not builder self-certification.

1. Monk Unarmored Defense (10 + DEX + WIS, no armor, no shield).
2. Barbarian Unarmored Defense (10 + DEX + CON, shield allowed).
3. Draconic Resilience (13 + DEX when unarmored; also +1 HP per level).
4. Mage Armor as a timed effect on another creature.
5. Light/medium/heavy armor AC with max-DEX caps and strength requirements.
6. Shield +2 only when equipped.
7. A feat granting +1 AC unconditionally.
8. Jack of All Trades (half proficiency to checks you are not proficient in).
9. Expertise on two chosen skills (choice deferred; model it as two fixed skills).
10. Multiclass spell slots (sum of caster-level fractions, table lookup).
11. Proficiency bonus from total level.
12. Speed: highest of several sources, plus unconditional bonuses (Mobile feat).
13. Same spell twice does not stack (Bless from two clerics).
14. Hit point maximum: sum of per-level contributions plus CON per level plus Tough.
15. A conditional damage bonus (Great Weapon Fighting / Dueling style).

The spell from the demo is the easy case and is not on this list on purpose.

## 8. System templates

A system template is a package of documents in the same format whose `type` values are
system-level (`variable`, `content-type`, `table`, `helper`, `policy`). It declares:

- **Variables** (section 6.5): id, display name, type, default, fold, rounding, allowed ops,
  and for derived variables their formula (`prof = 2 + floor((level - 1) / 4)`).
- **Content types** and their suggested properties (what the form shows for a Spell).
- **Tables** (spell slots by caster level, XP by level, carrying capacity).
- **Helper functions** callable from expressions (`caster_level(class)`). These are the
  successor to the ORF prototype's hardcoded `sum`/`max`/`getFromAll`. **My call:** helpers are
  defined in the system template, not in content, and are themselves expressions over the
  grammar, not host code.
- **Predicates** available in `when` (`equipped`, `has`, `proficient`, `level`).
- **Stacking policy** (section 6.4) and the system's rounding.
- **Display names** for symbolic rendering.

The 5e SRD template for this phase covers only what the demo and the torture test need:
abilities and modifiers, proficiency, level and class levels, AC, HP, speed, saves, skills,
spellcasting variables, the spell-slot table. It is CC-BY licensed content; the template cites
the SRD version it implements.

**Packaging and versioning (my call):** a system template is a **package**: a manifest
document (`type: package`) whose id is the package id (`srd5e`) and whose frontmatter lists
member document ids. Packages use the same integer revisions as every document
(`srd5e@3`); the manifest may carry a human-readable `label: "SRD 5.1"`. Content declares
`system: srd5e` (latest) or `system: srd5e@3` (pinned). Publishing a new manifest revision
is how a template update reaches consumers. Variables are grouped as lists inside a few
documents (`abilities.md`, `combat.md`, `spellcasting.md`), not one document each; the
registry loader flattens them. `requires` uses the same package mechanism for content that
depends on other content.

## 9. Identity, versioning, publishing

**My calls, all of them**, sized for the demo:

- **Identity**: a dotted code `namespace.collection.slug`, modeled on Steel Compendium's SCC
  codes, which already serve as permalinks, API keys, and cross-reference links there.
  Namespaces are owned by publishers. `srd5e.homebrew.ember-lash`.
- **Revisions**: integers per id. A publish creates `id@N`. Consumers may reference `id`
  (latest) or `id@N` (pinned). Deleting a revision is not supported; superseding is.
- **Registry (demo scale)**: a small HTTP service backed by files, serving documents by id and
  revision, with a feed or subscription endpoint consumers poll or receive pushes from. Plain
  files on disk are an equally valid registry (a folder in an Obsidian vault), which keeps the
  "works as plain files" goal honest.
- **Dependencies**: a document's `system` and `requires` declare what it needs. Missing
  dependencies are errors at load, not at render.

Authentication, ownership, moderation, and a marketplace are later phases.

## 10. Reference implementations for the demo

**Repo (decision, Scott):** build in the existing `scottTomaszewski/orf` repo until a real
name exists; a rename later is cheap. **My call:** the 2023 Go prototype is tagged
`prototype-2023` and removed from `main` (history keeps it; the survey documents what it did).
The repo is standalone, not a Steel Compendium workspace submodule, so the workspace's
worktree and deploy rules do not apply. Code stays MIT; the licence for the format
specification itself is an open item.

**My call on stack:** TypeScript throughout for this phase. The authoring app and consumers
are web pages, an eventual Obsidian plugin is TypeScript, and one language keeps the engine
and UI in one repo. The grammar spec and conformance corpus are language-neutral so a Go (or
other) implementation can follow when tooling needs it; Steel Compendium's pipeline is Go, so
that port is plausible but not scheduled.

- **Engine** (library): parser for documents and expressions, registry loader, fold and
  evaluation, provenance, diagnostics. No UI dependencies. Passes the conformance corpus.
- **Authoring app**: system picker, type picker, property form generated from the system's
  suggested properties plus "add property", body editor with `{{ }}` autocomplete from the
  registry, live Reader and Sheet preview, Publish button. Validation on save: unknown
  variables and targets are shown inline before publish.
- **Reader**: renders a document symbolically with system display names.
- **Sheet**: a fixed sample character (a 5th-level wizard) whose state is a document too;
  renders content resolved, with provenance on hover.
- **Card** (optional): statblock/card view of the same document; exists to make "three tools" true and
  to show a third rendering with no engine changes.
- **Registry**: as in section 9.

Left to the builder: framework choices, editor component, how previews subscribe to the
registry (polling is fine for the demo), build tooling, test framework beyond "the corpus
runs in CI".

## 11. Deferred: choices and mutable character state

Not built in this phase. Direction, so nothing designed now blocks it: Dicecloud's **slot**
model (a slot declares what type and tags it accepts, how many, uniqueness, and a condition;
library content declares which slots it can fill) is the strongest portable choice model
surveyed and maps onto "you are a level 2 Wizard, pick one of these spells". Character state
over time (level-ups, revisions of a character) should reuse the same revision mechanism as
content. The engine's contribution model already handles the result of a choice (a chosen
feature is just more content attached to the character), so choices are an authoring and
data-model concern, not an engine redesign.

## 12. Order of work

Each step is gated by the one before it.

1. **Torture test on paper.** Write the fifteen rules of section 7.4 as documents in proposed
   syntax. Iterate on syntax until readable. Output: the examples, which become the first
   conformance cases. Go/no-go for the whole project.
2. **Grammar spec and conformance corpus.** PEG for expressions and predicates; JSON cases
   for parse, symbolic render, resolved value, and errors.
3. **Engine.** Document parser, registry, fold, evaluate, provenance, diagnostics. Driven by
   the corpus.
4. **5e SRD system template** sufficient for the torture test and the demo.
5. **Authoring app + Reader + Sheet + registry** (Card if cheap).
6. **The demo** of section 3, rehearsed end to end and recorded.
7. **Post** to Reddit and Discords. Interest decides whether the next phase (Nimble template,
   choices, a real character sheet) is funded with evenings and weekends.

## 13. Open items

For Scott:

- The project's name.
- Whether the demo entity is a spell or a monster (both acceptable; spell is the default).
- Licence for the specification text (code is MIT).

Resolved 2026-10-18: laptop demo, recorded (section 3). Time budget: the demo is an
unsized spare-time interest test and should be planned as the smallest credible version;
sustained evenings-and-weekends investment follows only if the posts draw interest.

Builder's calls (not decisions, just flagged): exact PEG syntax for `when` clauses; whether
property-level expressions use `{{ }}` or a naming convention; registry transport details;
the sample character.
