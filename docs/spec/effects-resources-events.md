# Effects, resources, and events (draft, Phase 1)

Status: draft for the readability gate. Design context: design doc §6.

## 1. Effects: how content changes a character

An `effects:` list in any document's frontmatter. Content never assigns; it **contributes**.

```yaml
effects:
  - target: wounds.max      # a registry variable (alias allowed)
    add: 3                   # exactly one operation key
    when: ally_nearby        # optional boolean expression
    source: devoted-protector  # optional stack key; default = document id
    transfer: always         # optional: always | equipped | carried
    duration: encounter      # optional lifecycle hint
```

| field | rule |
|---|---|
| `target` | must resolve in the registry; unknown = error |
| operation | exactly one of `base add mul min max set`; value is a number, boolean, or expression |
| `base` | candidates compete; the largest applicable base wins |
| `add` | summed |
| `mul` | multiplied (after adds) |
| `min` / `max` | clamp the folded value |
| `set` | hard override, applied last; the variable must list `set` in `ops`; any contribution it shadows is reported in provenance and as a lint warning, never dropped silently |
| `when` | evaluated every time; omitted = always |
| `source` | stacking group (§3) |
| `transfer` | `always` (features, default); `equipped` (items: only while `equipped: true`); `carried` (items: while in inventory) |
| `duration` | `encounter`, `safe-rest`, `until-full-hp`, a time such as `8 hours`, or a declared event name; consumers end the effect when it elapses |

Each variable declares which ops it accepts (`ops`), its fold, its rounding, and its default.
A contribution using an op the variable does not accept is an error.

## 2. Fold (default; a variable may override via `fold`)

```
value = (max(base contributions) + Σ add) × Π mul
value = clamp(value, largest min, smallest max)
if any set: value = largest set
round per the variable's rounding (Nimble: floor)
```

If a variable has no `base` contributions, its `default` is the base. If it has none at all,
the default stands. Empty sets never crash and never become zero unless the default is zero.

Nimble Armor: the template contributes `armor.base base: dex`; each worn armor contributes its
own `base` with `transfer: equipped`; shields contribute `armor.shield add: n`;
`armor = armor.base + armor.shield`. The Zephyr's Iron Defense contributes
`armor.base base: dex + str when: not equipped(armor)`; at 13 it contributes
`armor.base mul: 2 when: not equipped(armor)`.

## 3. Stacking

Contributions are grouped by `source` before folding. The template declares a policy per
variable or globally:

- `same-source: highest` (Nimble and 5e default): within one source, only the largest
  contribution of each op counts. Two Bless castings, one Bless.
- `same-source: sum`: everything stacks.
- `typed`: a PCGen-style bonus-type table (for d20-likes later; not in Phase 1).

## 4. Resources

A resource is a pool with a max (a variable), a current value (character `state`), and
refresh rules. Declared in the template (`type: resources`) or on any content document
(`resources:` on a class, ancestry, feature).

```yaml
resources:
  - id: mana
    max: mana.max                  # expression; usually a declared variable
    floor: 0                       # optional lower bound (default 0)
    when: level(mage) >= 2         # optional: resource exists only when true
    refresh:
      - {on: safe-rest, to: max}   # set to max
      - {on: encounter-end, to: 0} # set to a number
      - {on: gain-wound, add: 1}   # add (negative allowed)
```

`<id>.current` is readable in expressions. Refresh rules fire in declaration order when the
named event fires. A refresh naming an undeclared event is an error.

Nimble core resources: `hp` (max `hp.max`, floor 0), `temp_hp`, `wounds` (max `wounds.max`;
Wounds count **up**, so "heal a Wound" is `add: -1`), `hit_dice` (max `hit_dice.max`),
`actions` (max `actions.max`, refresh `turn-end` to max).

## 5. Events

Events are the verbs a sheet exposes. Built-in events, with arguments:

| event | args | meaning |
|---|---|---|
| `damage` | `amount`, `crit` (bool) | take damage |
| `heal` | `amount` | regain HP |
| `spend` | `resource`, `amount` | spend a resource |
| `restore` | `resource`, `amount` | regain a resource |
| `catch-breath` | `hit_dice` | Field Rest, 10 minutes |
| `make-camp` | `hit_dice` | Field Rest, 8 hours |
| `safe-rest` | | |
| `encounter-start` | `initiative_roll` | Initiative rolled |
| `encounter-end` | | |
| `turn-end` | | |
| `level-up` | `level` | |

Templates declare more (`type: events`): Nimble adds `gain-wound(amount)`, `full-hp`, and
class-pool events as needed. Content may **refresh on** any declared event but cannot declare
handlers in this phase.

### 5.1 Handlers (template only)

A `type: events` document declares, per event, an ordered list of steps. Each step is one of:

| step | fields | meaning |
|---|---|---|
| `spend` / `restore` | `resource`, `amount` (expr) | adjust a resource within its bounds; the amount actually moved becomes `spent` |
| `set` / `clear` | a state boolean | toggle a condition |
| `fire` | an event name plus its args | fire another event, synchronously |
| `when` | a boolean expr guarding the step | |
| `repeat` | a resource or integer expr | run the nested steps that many times, stopping when a `spend` cannot proceed |

Nimble's core handlers, as the template will write them:

```yaml
handlers:
  damage:
    - spend: temp_hp
      amount: min(amount, temp_hp.current)
    - spend: hp
      amount: amount - spent
    - when: hp.current == 0 and not dying
      fire: gain-wound
      amount: 1
    - when: hp.current == 0 and not dying
      set: dying
    - when: dying and spent == 0 and amount > 0          # damage while already Dying
      fire: gain-wound
      amount: if(crit, 3, 2)
  gain-wound:
    - spend: wounds
      amount: -amount                                      # wounds count up
  heal:
    - restore: hp
      amount: amount
    - when: hp.current > 0
      clear: dying
    - when: hp.current == hp.max
      fire: full-hp
  catch-breath:
    - repeat: hit_dice
      steps:
        - spend: hit_dice
          amount: 1
        - restore: hp
          amount: if(hit_die.heal.always_max, hit_die.size, roll(hit_die.size)) + str + hit_die.heal.bonus
  make-camp:
    - repeat: hit_dice
      steps:
        - spend: hit_dice
          amount: 1
        - restore: hp
          amount: hit_die.size + str + hit_die.heal.bonus
  safe-rest:
    - restore: hp
      amount: hp.max
    - restore: hit_dice
      amount: hit_dice.max
    - spend: wounds
      amount: 1                                            # heal one Wound
    - spend: temp_hp
      amount: temp_hp.current
    # resources with {on: safe-rest} refresh rules fire after the handler
  encounter-start:
    - restore: actions
      amount: if(initiative_roll >= 20, 3, if(initiative_roll >= 10, 2, 1)) - actions.current
  turn-end:
    - restore: actions
      amount: actions.max
```

Content influences handlers only through the variables they read: Wild One contributes
`hit_die.heal.bonus add: key when: in_wilderness`; Oozeling contributes
`hit_die.heal.always_max set: true`; The Cheat's Initiative floor contributes
`initiative.floor max: 10`, which the template's `encounter-start` applies as
`max(initiative_roll, initiative.floor)`.

## 6. Provenance

Every folded value carries its contribution list `(source document, op, value, when-result)`.
Every resource change carries the event and step that caused it. Sheets render both.

## 7. Known gaps in this phase

- "Spend surge mana first" (Mage Elemental Surge) needs a handler rule owned by content.
  Phase 1 encodes `mana.surge` as a separate resource and notes the gap.
- Spell cost modifiers (Methodical Spellweaver, Archmage) are declared as variables the
  template's future `cast` handler will read; no `cast` event exists yet.
- Encounter-scoped dice pools that are auto-spent by attacks (Oathsworn Judgment Dice) need
  an attack event; Phase 1 models the pool and its refresh, not the auto-spend.
