# Torture test: the gate packet (round 2)

Fifteen rules written as content documents in the proposed syntax. **Scott judges:** would a Nimble homebrewer read these and nod? Each item shows the rule, the YAML verbatim from the real documents (effects, resources, variables, choices, moments), and what a homebrewer reads it as. Specs: `docs/spec/expressions.md`, `docs/spec/effects-and-resources.md`, `docs/spec/choices.md`. Design: `docs/superpowers/specs/2026-10-18-open-rules-format-design.md` §4.1.

**What changed since round 1** (Scott's review, 2026-10-18): the event/handler language is gone; rest, damage, Dying and wound procedures are engine code in the Nimble system module, shared by every tool, and content steers them only through named variables. `transfer: equipped` became `when: equipped`. Nested `if` level ladders became lookups (`by` + `rows`). The clamp ops are `at_least`/`at_most`. `oathsworn.healing.max` is `oathsworn.lay_on_hands.pool`; `hit_die.heal.always_max` is `hit_die.heal.maximized`. Variables carry `description`, effects carry `note`, moments carry `description`. The Mage and Oathsworn mana formulas moved onto level-2 `Mana` features, so they need no `when`.

Everything here lints: `npm run lint-docs` (124 Nimble documents, 7 in the 5e insurance set) and `npm test` (60 tests).

## Armor: unarmored, cloth, mail with DEX cap, plate, shields

**Rule.** Unarmored Armor = DEX. Cloth: n + DEX. Mail: n + DEX (max 2). Plate: flat n. Shields add. STR requirements (CR2 p.33).

`systems/nimble/combat.md`

```yaml
effects:
  - target: armor.base
    base: dex
    source: unarmored
```

`examples/nimble/items/armor/adventurers-garb.md`

```yaml
effects:
  - {target: armor.base, base: "2 + dex", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(cloth)", source: unproficient-armor}
```

`examples/nimble/items/armor/chain-shirt.md`

```yaml
requires: {str: 2}
effects:
  - {target: armor.base, base: "9 + min(dex, 2)", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(mail)", source: unproficient-armor}
```

`examples/nimble/items/armor/half-plate.md`

```yaml
requires: {str: 3}
effects:
  - {target: armor.base, base: "14", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(plate)", source: unproficient-armor}
```

`examples/nimble/items/armor/wooden-buckler.md`

```yaml
effects:
  - {target: armor.bonus, add: 2, when: equipped, source: shield}
```

**Encoding notes.** The template contributes `armor.base base: dex` as the unarmored floor. Each worn armor contributes its own `base` while equipped; the fold keeps the highest, so no armor-vs-unarmored special case exists. Mail's DEX cap is `min(dex, 2)` inside the formula; Plate's is a flat number. Shields `add` to `armor.bonus`. STR requirements are a `requires: {str: n}` property the engine enforces at equip time.

## Catch Breath vs Make Camp, with Oozeling and Wild One

**Rule.** Catch Breath: spend Hit Dice, each heals roll + STR. Make Camp: each heals its max + STR (CR2 p.17). Oozeling: always max (CR2 p.26). Wild One: more per die in the wild (CR2 p.28).

`systems/nimble/events.md`

```yaml
events:
  - {id: gain-wound, description: "You gained a Wound (dropped to 0 HP, or took damage while Dying)."}
  - {id: full-hp, description: "Your HP reached its maximum."}
```

`examples/nimble/ancestries/oozeling.md`

```yaml
effects:
  - {target: hit_die.heal.maximized, set: true}
```

`examples/nimble/backgrounds/wild-one.md`

```yaml
effects:
  - {target: hit_die.heal.advantage, set: true, when: in_wilderness, source: wild-one}
```

**Encoding notes.** The two formulas are engine code (the Nimble module's Catch Breath and Make Camp procedures), not content. Content steers them through three template variables: `hit_die.heal.maximized` (Oozeling sets it), `hit_die.heal.advantage` (Wild One sets it when `in_wilderness`; 2.0.3 wording), and `hit_die.heal.bonus` (for the second printing's +KEY form). This is the pattern for every 'change how a core rule computes' feature: the format says what is true, the engine does what happens.

## Mage mana: (INT×3)+LVL, unlocked at level 2

**Rule.** Mana unlocks at level 2; max = (INT×3) + LVL; refreshes at Safe Rest; spell cost = tier (H2 p.32, CR2 p.45).

`examples/nimble/features/mage/mana.md`

```yaml
effects:
  - {target: mana.max, base: "(max(int, 0) * 3) + level", source: mage-mana, note: "Granted at level 2, so no level condition is needed here."}
```

`examples/nimble/classes/mage/level-2.md`

```yaml
grants: [nimble.features.mage.mana, nimble.features.mage.talented-researcher]
```

`systems/nimble/core.md`

(no effects; property-only document)

`systems/nimble/resources.md`

```yaml
resources:
  - id: hp
    max: hp.max
    floor: 0
    refresh: [{on: safe-rest, to: max}]
  - id: temp_hp
    floor: 0
    refresh: [{on: safe-rest, to: 0}]
  - id: wounds
    max: wounds.max
    floor: 0
    refresh: [{on: safe-rest, add: -1}]
  - id: hit_dice
    max: hit_dice.max
    floor: 0
    refresh: [{on: safe-rest, to: max}]
  - id: mana
    max: mana.max
    floor: 0
    when: mana.max > 0
    refresh: [{on: safe-rest, to: max}]
  - id: actions
    max: actions.max
    floor: 0
    refresh: [{on: turn-end, to: max}]
```

**Encoding notes.** The template owns one `mana` resource (`when: mana.max > 0`) and a `mana.max` variable with no formula of its own. The Mage's level-2 `Mana` feature contributes `mana.max base: (max(int, 0) * 3) + level`; the Oathsworn's contributes `wil + level`. Because the feature is granted at level 2, no `when` is needed: at level 1 nothing contributes, `mana.max` is its default 0, and the resource does not exist. A multiclass caster gets the higher base; the rules do not say otherwise.

## Elemental Surge: encounter-lifetime mana that scales

**Rule.** When you roll Initiative, regain WIL mana; unused expires at the end of combat. WIL+1d4 at 10, WIL+2d4 at 17 (H2 p.32-33).

`examples/nimble/classes/mage.md`

```yaml
effects:
  - {target: key, base: int, source: class-key}
  - {target: key, base: wil, source: class-key}
  - {target: secondary, base: str, source: class-secondary}
  - {target: secondary, base: dex, source: class-secondary}
  - {target: hit_die.size, base: 6, source: class-hit-die}
  - {target: save.int.advantage, add: 1}
  - {target: save.str.advantage, add: -1}
  - {target: spells.tier.max, base: "floor(level(mage) / 2)", source: mage-tiers}
variables:
  - id: mage.surge.max
    name: the mana you regain when you roll Initiative
    type: dice
    formula:
      by: level(mage)
      rows: {1: wil, 10: "wil + 1d4", 17: "wil + 2d4"}
  - {id: spell.cost.modifier, name: change to the mana cost of your spells, type: integer, default: 0, ops: [add]}
  - {id: spell.cost.min, name: the minimum mana a spell can cost, type: integer, default: 0, ops: [at_least]}
resources:
  - id: mage.surge
    max: mage.surge.max
    when: level(mage) >= 5
    refresh: [{on: encounter-start, to: max}, {on: encounter-end, to: 0}]
```

`examples/nimble/features/mage/elemental-surge.md`

```yaml
effects: []
```

**Encoding notes.** Encoded as a second resource `mage.surge` whose `max` is a dice-typed lookup by level (`rows: {1: wil, 10: wil + 1d4, 17: wil + 2d4}`) with refresh rules on `encounter-start` (to max) and `encounter-end` (to 0). **Gap:** spending mana should draw from surge first; that is an engine rule for the Nimble module, not something content declares.

## Class pools: Lay on Hands, Judgment Dice, Sneak Attack dice, Bursts of Speed

**Rule.** Oathsworn Lay on Hands 5×LVL per Safe Rest; Judgment Dice gained when attacked while holding none, spent on next melee attack, die grows 3/5/8/10; Cheat Sneak Attack 1d6 → 3d20; Zephyr DEX Bursts per Initiative (H2 p.14, 38, 68).

`examples/nimble/classes/oathsworn.md`

```yaml
effects:
  - {target: key, base: str, source: class-key}
  - {target: key, base: wil, source: class-key}
  - {target: secondary, base: dex, source: class-secondary}
  - {target: secondary, base: int, source: class-secondary}
  - {target: hit_die.size, base: 10, source: class-hit-die}
  - {target: save.str.advantage, add: 1}
  - {target: save.dex.advantage, add: -1}
  - target: spells.tier.max
    source: oathsworn-tiers
    base:
      by: level(oathsworn)
      rows: {1: 0, 2: 1, 4: 2, 6: 3, 8: 4, 10: 5, 13: 6, 17: 7}
variables:
  - {id: oathsworn.lay_on_hands.pool, name: your Lay on Hands pool, type: integer, formula: "5 * level(oathsworn)", description: "HP you can heal by touch between Safe Rests."}
  - id: oathsworn.judgment.die
    name: the size of your Judgment Dice
    type: integer
    formula:
      by: level(oathsworn)
      rows: {1: 6, 3: 8, 5: 10, 8: 12, 10: 20}
  - {id: oathsworn.judgment.count, name: how many Judgment Dice you roll, type: integer, default: 2, ops: [add]}
resources:
  - id: oathsworn.lay_on_hands
    max: oathsworn.lay_on_hands.pool
    refresh: [{on: safe-rest, to: max}]
  - id: oathsworn.judgment_dice
    max: 1
    refresh: [{on: encounter-end, to: 0}]
```

`examples/nimble/classes/cheat.md`

```yaml
variables:
  - id: cheat.sneak_attack.dice
    name: your Sneak Attack dice
    type: dice
    formula:
      by: level(cheat)
      rows: {1: 1d6, 3: 1d8, 7: 2d8, 9: 2d10, 11: 2d12, 15: 2d20, 17: 3d20}
```

`examples/nimble/classes/zephyr.md`

```yaml
variables:
  - {id: zephyr.bursts.max, name: your Bursts of Speed per encounter, type: integer, formula: "max(dex, 0)", ops: [add]}
resources:
  - id: zephyr.bursts
    max: zephyr.bursts.max
    when: level(zephyr) >= 2
    refresh: [{on: encounter-start, to: max}, {on: encounter-end, to: 0}]
```

`examples/nimble/features/oathsworn/radiant-judgment.md`

```yaml
effects: []
```

**Encoding notes.** Lay on Hands: resource `oathsworn.lay_on_hands` with `max: oathsworn.lay_on_hands.pool` (formula `5 * level(oathsworn)`). Judgment Dice: a resource holding 'one set' (max 1) refreshing to 0 at encounter end; die size is a lookup by level (`rows: {1: 6, 3: 8, 5: 10, 8: 12, 10: 20}`), count is a variable (default 2, Vengeance adds 1). Sneak Attack: a dice-typed lookup by level, seven rows, one line each. Bursts: resource with max `max(dex, 0)` refreshing to max at `encounter-start`. **Gap:** auto-spend on attack is an engine concern (no attack procedure yet).

## Devoted Protector: +3 max Wounds while an ally is nearby

**Rule.** Choose an ally; while they are nearby you have +3 max Wounds (CR2 p.28).

`examples/nimble/backgrounds/devoted-protector.md`

```yaml
effects:
  - {target: wounds.max, add: 3, when: ally_nearby, source: devoted-protector}
```

**Encoding notes.** `wounds.max add: 3 when: ally_nearby`. `ally_nearby` is a player-toggled boolean declared in the template. The engine recomputes `wounds.max` when it flips; what happens to a character whose current Wounds exceed the new max is a rules question the sheet should surface, not decide.

## Initiative sets first-turn actions; Human +1; Cheat floor of 10

**Rule.** Initiative d20 + DEX: one digit = 1 action, two digits = 2, 20+ = 3 (CR2 p.15). Human +1 Initiative. Cheat: if you roll under 10, treat it as 10 (H2 p.14).

`systems/nimble/events.md`

```yaml
events:
  - {id: gain-wound, description: "You gained a Wound (dropped to 0 HP, or took damage while Dying)."}
  - {id: full-hp, description: "Your HP reached its maximum."}
```

`examples/nimble/ancestries/human.md`

```yaml
effects:
  - {target: initiative.bonus, add: 1}
```

`examples/nimble/features/cheat/cheat.md`

```yaml
effects:
  - {target: initiative.floor, at_least: 10, source: cheat}
```

**Encoding notes.** The digit-count mapping is engine code in the Nimble module. Human contributes `initiative.bonus add: 1`. The Cheat contributes `initiative.floor at_least: 10`, which the engine applies as `max(roll, initiative.floor)` before counting digits. (The first draft wrote this as `max: 10` because `max` read as 'raise to'; the clamp ops are now `at_least`/`at_most` for exactly that reason.)

## Methodical Spellweaver: −2 mana (min 1) for +1 action

**Rule.** Spend 1 extra action: the spell costs 2 less mana, minimum 1 (H2 p.34).

`examples/nimble/features/mage/methodical-spellweaver.md`

```yaml
effects: []
```

**Encoding notes.** A per-cast option, so it carries **no standing effects**: a −2 that applied to every spell would be wrong. The Mage class declares `spell.cost.modifier` and `spell.cost.min` for a future `cast` event to read. **Gap:** per-cast choices (pay an action, take a discount) need a `cast` event and a way for a feature to offer an option at cast time; neither exists in Phase 1.

## Dragonborn breath recharges on gaining a Wound; Gnome reroll resets at full HP

**Rule.** Dragonborn: once per Safe Rest, recharges whenever you gain a Wound (CR2 p.24). Gnome: reroll one die, reset when healed to full HP (CR2 p.22).

`examples/nimble/ancestries/dragonborn.md`

```yaml
effects: []
resources:
  - {id: dragonborn.breath, max: 1, refresh: [{on: safe-rest, to: max}, {on: gain-wound, to: max}]}
```

`examples/nimble/ancestries/gnome.md`

```yaml
effects:
  - {target: speed, add: -1}
resources:
  - {id: gnome.reroll, max: 1, refresh: [{on: full-hp, to: max}, {on: safe-rest, to: max}]}
```

**Encoding notes.** Both are resources with two refresh rules. `gain-wound` and `full-hp` are **moments** declared by the template; the engine's Nimble module fires them from its damage and heal procedures. Any content can refresh on any declared moment, and refresh rules are the only thing in the format that listens for one.

## Max HP as a per-level history

**Rule.** Level-up HP: roll your Hit Die with advantage (CR2 p.21). The second printing adds a fixed-average option.

`examples/nimble/characters/pip.md`

```yaml
stats: {str: -1, dex: 2, int: 2, wil: 0}   # creation array; the level-4 Key stat bump is a choice effect
levels:
  - {level: 1, hp: 10, source: starting}
  - {level: 2, hp: 4, source: roll}
  - {level: 3, hp: 6, source: roll}
  - {level: 4, hp: 5, source: roll}
choices:
  nimble.classes.mage.level-3.subclass: [nimble.subclasses.mage.control]
  nimble.classes.mage.level-3.elemental-mastery: [fire]
  nimble.classes.mage.level-4.spellshaper: [nimble.features.mage.echo-casting, nimble.features.mage.stretch-time]
  nimble.classes.mage.level-4.key-stat: [int]
```

**Encoding notes.** The character document's `levels[]` list records each level's HP gain and its source; `hp.max` folds those entries plus any `add` contributions (Tough-style features). Max HP is therefore history, not a formula of level, which matches the rules exactly.

## Non-proficient armor costs 2 actions to Defend; non-proficient weapons cannot crit

**Rule.** Non-proficient armor: Defend costs an extra action. Non-proficient weapon: cannot crit (CR2 p.32).

`examples/nimble/items/armor/chain-shirt.md`

```yaml
requires: {str: 2}
effects:
  - {target: armor.base, base: "9 + min(dex, 2)", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(mail)", source: unproficient-armor}
```

`examples/nimble/items/weapons/staff.md`

```yaml
effects: []
```

**Encoding notes.** Armor contributes `defend.cost add: 1 when: equipped and not proficient(mail)`. The weapon half is **not encoded**: a `crit.allowed` flag on the character would turn off crits for every weapon when one unproficient weapon is equipped, and `proficient(weapon)` cannot name which weapon. Proficiency itself comes from the class document's `armor_proficiency`/`weapon_proficiency` properties, which are free text today; `proficient()` needs a declared vocabulary (gap).

## Dying: action cap, Wound costs, class overrides

**Rule.** At 0 HP: gain 1 Wound and Dying; actions capped at 1; attacking costs a Wound unless DC 10 STR save; damage while Dying = 2 Wounds, 3 on a crit (CR2 p.9). Zephyr level 20: max 2 actions while Dying (H2 p.69).

`systems/nimble/combat.md`

```yaml
effects:
  - target: armor.base
    base: dex
    source: unarmored
```

`systems/nimble/events.md`

```yaml
events:
  - {id: gain-wound, description: "You gained a Wound (dropped to 0 HP, or took damage while Dying)."}
  - {id: full-hp, description: "Your HP reached its maximum."}
```

**Encoding notes.** All engine code in the Nimble module: damage sets `dying` and adds `wound.damage_while_dying` Wounds (default 2, +1 on a crit) while Dying; turn end and Initiative cap actions at `actions.dying_cap` (default 1) while `dying`; healing above 0 clears `dying`. Content steers it only through those two variables: Zephyr 20 contributes `actions.dying_cap base: 2`. None of the four MVP classes override Dying below level 17, so no content document does yet. Death at max Wounds is an engine gap.

## Spells known = schools × unlocked tier

**Rule.** You know every spell in your known schools up to your unlocked tier; Mage unlocks tier N at level 2N (H2 p.32, CR2 p.45).

`examples/nimble/classes/mage.md`

```yaml
effects:
  - {target: key, base: int, source: class-key}
  - {target: key, base: wil, source: class-key}
  - {target: secondary, base: str, source: class-secondary}
  - {target: secondary, base: dex, source: class-secondary}
  - {target: hit_die.size, base: 6, source: class-hit-die}
  - {target: save.int.advantage, add: 1}
  - {target: save.str.advantage, add: -1}
  - {target: spells.tier.max, base: "floor(level(mage) / 2)", source: mage-tiers}
variables:
  - id: mage.surge.max
    name: the mana you regain when you roll Initiative
    type: dice
    formula:
      by: level(mage)
      rows: {1: wil, 10: "wil + 1d4", 17: "wil + 2d4"}
  - {id: spell.cost.modifier, name: change to the mana cost of your spells, type: integer, default: 0, ops: [add]}
  - {id: spell.cost.min, name: the minimum mana a spell can cost, type: integer, default: 0, ops: [at_least]}
resources:
  - id: mage.surge
    max: mage.surge.max
    when: level(mage) >= 5
    refresh: [{on: encounter-start, to: max}, {on: encounter-end, to: 0}]
```

`examples/nimble/features/mage/elemental-spellcasting.md`

```yaml
effects: []
```

`examples/nimble/classes/mage/level-3.md`

```yaml
grants: [nimble.features.mage.elemental-mastery]
choices:
  - {slot: subclass, count: 1, from: {type: subclass, tags: [mage]}, unique: character}
  - {slot: elemental-mastery, count: 1, from: {options: [fire, ice, lightning]}, unique: character}
```

**Encoding notes.** `spells.tier.max base: floor(level(mage) / 2)` on the class. Known schools are the level-1 grant (Fire, Ice, Lightning) plus choice slots whose options are school names. The sheet lists spells by filtering spell documents on `school in known and tier <= spells.tier.max`; no per-spell selection exists, which matches the rules.

## 5e insurance: Monk Unarmored Defense vs Mage Armor vs armor

**Rule.** Monk: AC 10 + DEX + WIS unarmored, no shield. Mage Armor: 13 + DEX unarmored. Chain mail: 16 (SRD 5.1).

`examples/insurance-5e/monk-unarmored-defense.md`

```yaml
effects:
  - {target: ac.base, base: "10 + dex.mod + wis.mod", when: "not equipped(armor) and not equipped(shield)", source: unarmored-defense}
```

`examples/insurance-5e/mage-armor.md`

```yaml
effects:
  - {target: ac.base, base: "13 + dex.mod", when: "not equipped(armor)", source: mage-armor, duration: 8 hours}
```

`examples/insurance-5e/chain-mail.md`

```yaml
effects:
  - {target: ac.base, base: 16, when: equipped, source: armor}
```

**Encoding notes.** Same shape as Nimble Armor: three `base` contributions to `ac.base` with `when` clauses; the highest applicable wins. Proves the fold is not Nimble-specific. Lives in `examples/insurance-5e/` with a 12-line `srd5e-mini` template.

## 5e insurance: Bless cast twice does not stack

**Rule.** Bless adds 1d4 to saves; the same spell cast twice on you does not stack (SRD 5.1).

`examples/insurance-5e/bless.md`

```yaml
effects:
  - {target: save.str, add: 1d4, source: bless}
  - {target: save.dex, add: 1d4, source: bless}
  - {target: save.con, add: 1d4, source: bless}
  - {target: save.int, add: 1d4, source: bless}
  - {target: save.wis, add: 1d4, source: bless}
  - {target: save.cha, add: 1d4, source: bless}
```

**Encoding notes.** One `bless` document contributing `save.* add: 1d4` with `source: bless`. Two instances on a character group by source and the policy `same-source: highest` keeps one. Nothing in the content says 'does not stack'; the system policy does.

## Known gaps (honest list)

- Engine-module rules not yet written: surge-first mana spending (Elemental Surge), encounter-lifetime Hit Dice (Zephyr Enduring Soul), Judgment Dice and Sneak Attack auto-spend on attack, Unyielding Resolve (ignore the first N Wounds), death at max Wounds, spell cost modifiers at cast time.
- Kinetic Momentum is a second burst counter instead of adding to `zephyr.bursts`: resources cannot yet refresh another resource.
- Distracted (The Cheat) and 'Reach' auras (Oathsworn) are target- or position-state predicates with no model yet.
- Unproficient-armor Defend cost is on each item (`when: equipped and not proficient(mail)`); it belongs in the template once `proficient()` can see the worn item's category.
- Non-proficient weapons cannot crit: not encoded, because a `crit.allowed` flag is character-wide and the rule is per weapon.
- `proficient()` and `knows()` have thin data sources: class `armor_proficiency` is free text and spell schools are plain documents; both need a declared vocabulary.
- Ability fields (`cost`, `trigger`, `restores`, `expires`) are described in the spec but the content-type documents do not yet list them per type.

## What you're approving

1. **The line** (§4.1): the format describes what is true; the engine's system module does what happens. No handlers, no scripting, in content or templates.
2. **The six-op fold**: `base` competes (highest), `add` sums, `mul` multiplies, `at_least`/`at_most` clamp, `set` overrides last and must be allowed by the variable.
3. **Lookups** (`by` + `rows`) as the one form for level ladders and other step tables, usable as any op value or formula.
4. **Resources and moments**: resources with `max`/`refresh`; moments as a short closed list that only refresh rules listen for.
5. **`when: equipped` / `when: carried`** on item effects, explicit, no hidden default.
6. **Labels first-class**: `name` + `description` on variables, `note` on effects, `description` on moments; the UI never shows an id.
7. **The slot model for choices** and the identifier convention, unchanged from round 1.

**Approve** = the Phase 2 plan is written (grammar + corpus + engine + Nimble module). **Decline** = name the items; the named parts are redesigned before any engine code.
