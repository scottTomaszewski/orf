# Effects, lookups, and resources (draft, revised 2026-10-18)

Status: draft for the readability gate (second round). Design context: design doc §6.

**The one rule this spec follows:** the format describes *what is true* about a character.
What *happens* to a character (damage, healing, rests, wounds, spending) is engine code,
shared by every tool. Content never scripts; it contributes values, declares conditions, and
describes itself.

## 1. Effects: how content changes a character

An `effects:` list in any document's frontmatter. Content never assigns; it **contributes**.

```yaml
effects:
  - target: wounds.max        # a registry variable (alias allowed)
    add: 3                     # exactly one operation key
    when: ally_nearby          # optional boolean expression
    source: devoted-protector  # optional stack key; default = document id
    note: Only while your chosen ally is within reach.   # optional, shown in tooltips
```

| field | rule |
|---|---|
| `target` | must resolve in the registry; unknown = error |
| operation | exactly one of `base add mul at_least at_most set`; its value is a number, boolean, expression, or lookup (§2) |
| `base` | candidates compete; the largest applicable base wins |
| `add` | summed |
| `mul` | multiplied (after adds) |
| `at_least` / `at_most` | clamp the folded value from below / above |
| `set` | hard override, applied last; the variable must list `set` in `ops`; anything it shadows is reported in provenance and as a lint warning, never dropped silently |
| `when` | boolean expression, evaluated every time; omitted = always. On an item, the bare words `equipped` and `carried` mean this item |
| `source` | stacking group (§4) |
| `note` | free text a sheet shows next to the contribution |
| `duration` | optional lifecycle hint: `encounter`, `safe-rest`, `until-full-hp`, a time such as `8 hours`, or a declared moment; consumers end the effect when it elapses |

Each variable declares which ops it accepts (`ops`), its fold, its rounding, its default, a
`name` (the phrase a sheet shows) and an optional `description` (the tooltip). A contribution
using an op the variable does not accept is an error.

**When `when` is false** the contribution does not exist. A variable with no contributions
holds its declared default (or its formula); it is never null. Sheets show provenance, so
"mana 0, no active sources" is visible, not mysterious.

**Items.** An item's effects apply only when its `when` holds. Armor and weapons write
`when: equipped`; a trinket that works from a pack writes `when: carried`; combine freely
(`when: equipped and not proficient(mail)`). There is no hidden default.

**Level gating.** Prefer granting a feature from the class-level document over
`when: level(mage) >= 2` on a standing effect. The grant *is* the condition.

## 2. Lookups: step tables instead of `if` ladders

Any op value, and any variable `formula`, may be a **lookup**: the row with the largest key
that is less than or equal to the value of `by` wins.

```yaml
variables:
  - id: cheat.sneak_attack.dice
    name: your Sneak Attack dice
    type: dice
    formula:
      by: level(cheat)
      rows: {1: 1d6, 3: 1d8, 7: 2d8, 9: 2d10, 11: 2d12, 15: 2d20, 17: 3d20}
effects:
  - target: spells.tier.max
    base:
      by: level(oathsworn)
      rows: {1: 0, 2: 1, 4: 2, 6: 3, 8: 4, 10: 5, 13: 6, 17: 7}
```

Keys are integers. Row values are numbers, booleans, or expressions, typed alike. If no row
matches (the value of `by` is below every key), the contribution does not exist and a formula
yields the variable's default; write a row for `1` when you mean "always".

## 3. Fold (default; a variable may override via `fold`)

```
value = (max(base contributions) + Σ add) × Π mul
value = clamp(value, largest at_least, smallest at_most)
if any set: value = largest set
round per the variable's rounding (default: floor)
```

- A variable with a `formula` uses it as a `base` candidate. Its `default` is the base when
  nothing contributes a base: `speed` (default 6) with a gnome's `add: -1` is 5. Provenance
  marks a value as defaulted only when nothing contributed at all.
- Dice values fold by adding dice and constants (`1d8 + str`); `base` competition between
  dice compares averages. `mul` on dice multiplies the constant part and the dice count.
- Booleans accept `set` only.

Nimble Armor: the template contributes `base: dex` (unarmored); each armor contributes its
own `base` with `when: equipped`; shields contribute `armor.bonus add: n`. Highest base wins,
so no special case for "armor vs unarmored". Empty contribution set = the default, never a crash.

## 4. Stacking

Contributions are grouped by `source` before folding. The template declares a policy per
variable or globally:

- `same-source: highest` (Nimble and 5e default): within one source, only the largest
  contribution of each op counts. Two Bless castings, one Bless.
- `same-source: sum`: everything stacks.
- `typed`: a PCGen-style bonus-type table (for d20-likes later; not now).

## 5. Resources

A resource is a pool with a max (a variable), a current value (character `state`), and
refresh rules. Declared in the template (`type: resources`) or on any content document
(`resources:` on a class, ancestry, feature).

```yaml
resources:
  - id: mana
    max: mana.max                  # expression; usually a declared variable
    floor: 0                       # optional lower bound (default 0)
    when: mana.max > 0             # optional: resource exists only when true
    refresh:
      - {on: safe-rest, to: max}   # set to max
      - {on: encounter-end, to: 0} # set to a number
      - {on: gain-wound, add: 1}   # add (negative allowed)
```

`<id>.current` is readable in expressions. Refresh rules run in declaration order when the
named **moment** occurs. A refresh naming an undeclared moment is an error.

Nimble core resources: `hp` (max `hp.max`, floor 0), `temp_hp`, `wounds` (max `wounds.max`;
Wounds count **up**, so "heal a Wound" is `add: -1`), `hit_dice` (max `hit_dice.max`),
`actions` (max `actions.max`, refresh `turn-end` to max).

## 6. Moments

A moment is a named point in play that the engine reports. Refresh rules are the only thing
in the format that listens for one. Built in: `catch-breath`, `make-camp`, `safe-rest`,
`encounter-start`, `encounter-end`, `turn-end`, `level-up`. A template declares more
(`type: events`), each with a `description`; Nimble adds `gain-wound` and `full-hp`.

```yaml
events:
  - {id: gain-wound, description: "You gained a Wound."}
  - {id: full-hp, description: "Your HP reached its maximum."}
```

There are **no handlers**. Taking damage, healing, Field and Safe Rests, Dying, wound gain,
Initiative, spending and restoring are procedures in the engine's system module (for the MVP,
`nimble` in TypeScript), written once and imported by every tool. Content steers them only
through the variables they read: `hit_die.heal.bonus`, `hit_die.heal.maximized`,
`hit_die.heal.advantage`, `initiative.floor`, `actions.dying_cap`, `wound.damage_while_dying`.
A tool in another language reimplements the module the same way it reimplements the fold.

If a second system ever needs the same procedure shape, a declarative trigger form is
designed then, with two real examples in hand. Not before.

## 7. Describing abilities (fields, not scripts)

An ability that *does* something (Elemental Surge, Lay on Hands, a spell) is described with
plain fields a tool can act on: `actions`, `cost: {mana: 2}`, `range`, `damage: "{{ 2d8 + key }}"`,
`restores: {mana: wil}`, `trigger: initiative`, `expires: encounter-end`, and prose. A sheet
shows them; a VTT may automate from them. Adding a field is cheap and never breaks a reader.
The content-type documents in the template list the suggested fields per type.

## 8. Provenance

Every folded value carries its contribution list `(source document, op, value, when-result,
note)`. Every resource change carries the moment or procedure that caused it. Sheets render
both; labels come from `name`/`description`, never from ids.

## 9. Known gaps

- Surge-first mana spending (Mage Elemental Surge) and encounter-lifetime Hit Dice (Zephyr
  Enduring Soul): engine-module rules, not yet written.
- Spell cost modifiers (Methodical Spellweaver, Archmage) are variables the engine's cast
  procedure will read; no cast procedure yet.
- Encounter-scoped dice pools auto-spent by attacks (Oathsworn Judgment Dice): the pool and
  its refresh are modelled; the auto-spend is an engine concern.
- Unyielding Resolve (ignore the first N Wounds per encounter): engine gap.
- Death at maximum Wounds: engine gap.
