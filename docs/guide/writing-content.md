# Writing content for ORF

ORF (Open Rules Format) documents are Markdown files with a YAML header. You can write one in
any text editor, keep it in Obsidian, publish it on a site, and drop it into the sheet. The
sheet reads a handful of keys from the header; everything else is yours.

This page is for content creators: people writing an ancestry, a background, an item, a
feature, a spell. It is not the system-template guide (variables, resources, moments); that is
`docs/spec/effects-and-resources.md`.

## What a document is

```
---            ← header starts
id: ...        ← keys the sheet reads
type: ...
name: ...
---            ← header ends
Your text.     ← Markdown, shown to players
```

Any Markdown tool renders this: the header shows as a properties table, the body as prose.
ORF is a superset of Markdown. Nothing in it needs a tool that does not already exist.

## The five keys

| Key | What it is | Example |
|---|---|---|
| `id` | A unique dotted name: `<system>.<kind>.<slug>`. Lowercase, hyphens. | `nimble.ancestries.ratfolk` |
| `type` | The kind of document. The system lists its types; the sheet decides where each shows up. | `ancestry` |
| `name` | What players see. | `Ratfolk` |
| `effects` | How the document changes a character's numbers. A list; often empty. | see below |
| the body | Rules text. Markdown. May contain `{{ }}` values. | `Hard to kill.` |

`system: nimble` says which rules package the document belongs to. Add any other property you
like (`size`, `rarity`, `cost`, `flavor`): unknown properties are kept and shown, never rejected.
A sixth key, `resources`, is for things with a limited number of uses (below).

## Effects

An effect names a **target** (a number the system declares), **one operation**, and
optionally a condition and a note.

```yaml
effects:
  - {target: wounds.max, add: 1, note: "Hard to kill."}
```

| Operation | Meaning | Example |
|---|---|---|
| `add: n` | Adds to the target. Several `add`s stack. | `{target: speed, add: -1}` |
| `base: n` | Sets the starting value. When several documents offer a base, the highest wins. | `{target: armor.base, base: "2 + dex"}` |
| `mul: n` | Multiplies, after bases and adds. | `{target: hp.max, mul: 2}` |
| `at_least: n` / `at_most: n` | Clamps the final value. | `{target: speed, at_least: 4}` |
| `set: v` | Overrides outright. Only targets that allow `set` accept it. | `{target: hit_die.heal.maximized, set: true}` |

Values may be numbers, `true`/`false`, or small expressions in quotes: `"2 + dex"`,
`"max(str, dex)"`, `"level / 2"`.

- `when:` makes the effect conditional. On an item, `when: equipped` or `when: carried`.
  Anywhere, a system flag: `when: in_wilderness`. Combine with `and`, `or`, `not`.
- `note:` is one sentence the sheet shows next to the number, so players learn where it came
  from without opening the file.

Where do target names come from? The system template declares them with a plain-language
name. For Nimble: `systems/nimble/core.md` (HP, Wounds, Hit Dice, Speed, Initiative),
`systems/nimble/combat.md` (Armor, actions, Defend), `systems/nimble/skills.md`. The sheet's
Write view offers them as you type.

## Three worked examples

**An ancestry.** One effect, one note, one line of text.

```markdown
---
id: nimble.ancestries.ratfolk
type: ancestry
system: nimble
name: Ratfolk
size: small
effects:
  - {target: wounds.max, add: 1, note: "Ratfolk are hard to kill."}
---
Small, quick, and very hard to kill. You can suffer {{ wounds.max | one more Wound than most }}
before you die.
```

The `{{ wounds.max | one more Wound than most }}` span shows "one more Wound than most" in a
plain Markdown reader and the real number (7, or 8 for a dwarf) on the sheet. Use the text after
the `|` whenever the bare expression would read badly.

**A background with a condition.** The bonus only applies when a flag is on; the player
toggles the flag on the sheet.

```markdown
---
id: nimble.backgrounds.trail-cook
type: background
system: nimble
name: Trail Cook
effects:
  - {target: hit_die.heal.advantage, set: true, when: in_wilderness, note: "Hot food on the trail."}
---
You cook. When your party rests in the wild, your Hit Dice roll with advantage.
```

**An item with a limited use.** `when: equipped` ties the effect to wearing it. The
`resources` list declares a pool with a maximum and when it refills; the sheet tracks the
count and refills it at the named moment (`safe-rest`, `make-camp`, `catch-breath`,
`encounter-start`, `encounter-end`, `turn-end`, `level-up`, plus the system's own, such as
Nimble's `gain-wound` and `full-hp`).

```markdown
---
id: nimble.items.cloak-of-the-rat
type: item
system: nimble
name: Cloak of the Rat
rarity: uncommon
slots: 1
effects:
  - {target: speed, add: 1, when: equipped, note: "Cloak of the Rat."}
resources:
  - {id: cloak_of_the_rat.scurry, max: 1, refresh: [{on: safe-rest, to: max}]}
---
While worn, +1 Speed. Once per Safe Rest, you may move your full Speed as a free action.
```

## Checking your work

- In the sheet: **Write** shows problems as you type; **Content → Problems** lists every
  problem in every loaded file with its line. A broken file never takes the rest down.
- From a terminal, in this repository: `npx tsx src/cli.ts systems/nimble <your folder>`.

Common messages: `unknown target` (a typo, or a number the system does not declare),
`duplicate document id` (your `id` is already taken; pick another), `invalid YAML` (usually a
colon or quote inside a value: wrap the value in quotes).

## What you cannot write, on purpose

A document says what is **true**: this number goes up, this pool refills at that moment, this
bonus applies while worn. It never says what **happens**: taking damage, healing, resting,
gaining a Wound are rules the engine implements once, for every tool, from the system
template. If an ability needs a procedure the system does not have, write it in prose; the
sheet shows it, players apply it. (Design: `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` §4.1.)
