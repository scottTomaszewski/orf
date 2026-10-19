# Torture test: the gate packet

Fifteen rules written as content documents in the proposed syntax. **Scott judges:** would a Nimble homebrewer read these and nod? Each item shows the rule, the YAML verbatim from the real documents (effects, resources, variables, choices; handlers are linked, not inlined), and what a homebrewer reads it as. Full grammar: `docs/spec/expressions.md`; effects, resources, events: `docs/spec/effects-resources-events.md`; choices: `docs/spec/choices.md`.

Everything here lints: `npm run lint-docs` (116 Nimble documents, 7 in the 5e insurance set) and `npm test` (44 tests).

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
  - {target: armor.base, base: "2 + dex", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(cloth)", transfer: equipped, source: unproficient-armor}
```

`examples/nimble/items/armor/chain-shirt.md`

```yaml
requires: {str: 2}
effects:
  - {target: armor.base, base: "9 + min(dex, 2)", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(mail)", transfer: equipped, source: unproficient-armor}
```

`examples/nimble/items/armor/half-plate.md`

```yaml
requires: {str: 3}
effects:
  - {target: armor.base, base: "14", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(plate)", transfer: equipped, source: unproficient-armor}
```

`examples/nimble/items/armor/wooden-buckler.md`

```yaml
effects:
  - {target: armor.bonus, add: 2, transfer: equipped, source: shield}
```

**What a homebrewer reads.** The template contributes `armor.base base: dex` as the unarmored floor. Each worn armor contributes its own `base` while equipped; the fold keeps the highest, so no armor-vs-unarmored special case exists. Mail's DEX cap is `min(dex, 2)` inside the formula; Plate's is a flat number. Shields `add` to `armor.bonus`. STR requirements are a `requires: {str: n}` property the engine enforces at equip time.

## Catch Breath vs Make Camp, with Oozeling and Wild One

**Rule.** Catch Breath: spend Hit Dice, each heals roll + STR. Make Camp: each heals its max + STR (CR2 p.17). Oozeling: always max (CR2 p.26). Wild One: more per die in the wild (CR2 p.28).

`systems/nimble/events.md`

Handlers are in that file (`handlers:` block); see also `docs/spec/effects-resources-events.md` §5.1.

`examples/nimble/ancestries/oozeling.md`

```yaml
effects:
  - {target: hit_die.heal.always_max, set: true}
```

`examples/nimble/backgrounds/wild-one.md`

```yaml
effects:
  - {target: hit_die.heal.bonus, add: key, when: in_wilderness, source: wild-one}
```

**What a homebrewer reads.** The two formulas live in the template's `catch-breath` and `make-camp` handlers. Content cannot edit handlers; instead the handler reads two template variables, `hit_die.heal.always_max` (Oozeling sets it) and `hit_die.heal.bonus` (Wild One adds KEY when `in_wilderness`). This is the pattern for every 'change how a core rule computes' feature.

## Mage mana: (INT×3)+LVL, unlocked at level 2

**Rule.** Mana unlocks at level 2; max = (INT×3) + LVL; refreshes at Safe Rest; spell cost = tier (H2 p.32, CR2 p.45).

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
  - {target: mana.max, base: "(max(int, 0) * 3) + level", when: "level(mage) >= 2", source: mage-mana}
  - {target: spells.tier.max, base: "floor(level(mage) / 2)", source: mage-tiers}
variables:
  - {id: mage.surge.max, name: the mana you regain when you roll Initiative, type: dice, formula: "if(level(mage) >= 17, wil + dice(2, 4), if(level(mage) >= 10, wil + dice(1, 4), wil))"}
  - {id: spell.cost.modifier, name: change to the mana cost of your spells, type: integer, default: 0, ops: [add]}
  - {id: spell.cost.min, name: the minimum mana a spell can cost, type: integer, default: 0, ops: [max]}
resources:
  - id: mage.surge
    max: mage.surge.max
    when: level(mage) >= 5
    refresh: [{on: encounter-start, to: max}, {on: encounter-end, to: 0}]
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

**What a homebrewer reads.** The template owns one `mana` resource and a `mana.max` variable with no formula of its own. The Mage class contributes `mana.max base: (max(int, 0) * 3) + level when: level(mage) >= 2`. The Oathsworn contributes `wil + level`. A multiclass caster gets the higher base; the rules do not say otherwise.

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
  - {target: mana.max, base: "(max(int, 0) * 3) + level", when: "level(mage) >= 2", source: mage-mana}
  - {target: spells.tier.max, base: "floor(level(mage) / 2)", source: mage-tiers}
variables:
  - {id: mage.surge.max, name: the mana you regain when you roll Initiative, type: dice, formula: "if(level(mage) >= 17, wil + dice(2, 4), if(level(mage) >= 10, wil + dice(1, 4), wil))"}
  - {id: spell.cost.modifier, name: change to the mana cost of your spells, type: integer, default: 0, ops: [add]}
  - {id: spell.cost.min, name: the minimum mana a spell can cost, type: integer, default: 0, ops: [max]}
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

**What a homebrewer reads.** Encoded as a second resource `mage.surge` with `max` = a dice-typed formula and refresh rules on `encounter-start` (to max) and `encounter-end` (to 0). **Gap:** spending mana should draw from surge first; that needs a `spend` handler rule owned by the class, which content cannot declare in this phase.

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
  - {target: mana.max, base: "wil + level", when: "level(oathsworn) >= 2", source: oathsworn-mana}
  - {target: spells.tier.max, base: "if(level(oathsworn) >= 17, 7, if(level(oathsworn) >= 13, 6, if(level(oathsworn) >= 10, 5, if(level(oathsworn) >= 8, 4, if(level(oathsworn) >= 6, 3, if(level(oathsworn) >= 4, 2, if(level(oathsworn) >= 2, 1, 0)))))))", source: oathsworn-tiers}
variables:
  - {id: oathsworn.healing.max, name: your Lay on Hands pool, type: integer, formula: "5 * level(oathsworn)"}
  - {id: oathsworn.judgment.die, name: the size of your Judgment Dice, type: integer, formula: "if(level(oathsworn) >= 10, 20, if(level(oathsworn) >= 8, 12, if(level(oathsworn) >= 5, 10, if(level(oathsworn) >= 3, 8, 6))))"}
  - {id: oathsworn.judgment.count, name: how many Judgment Dice you roll, type: integer, default: 2, ops: [add]}
resources:
  - id: oathsworn.healing
    max: oathsworn.healing.max
    refresh: [{on: safe-rest, to: max}]
  - id: oathsworn.judgment_dice
    max: 1
    refresh: [{on: encounter-end, to: 0}]
```

`examples/nimble/classes/cheat.md`

```yaml
effects:
  - {target: key, base: dex, source: class-key}
  - {target: key, base: int, source: class-key}
  - {target: secondary, base: wil, source: class-secondary}
  - {target: secondary, base: str, source: class-secondary}
  - {target: hit_die.size, base: 6, source: class-hit-die}
  - {target: save.dex.advantage, add: 1}
  - {target: save.wil.advantage, add: -1}
variables:
  - {id: cheat.sneak_attack.dice, name: your Sneak Attack dice, type: dice, formula: "if(level(cheat) >= 17, dice(3, 20), if(level(cheat) >= 15, dice(2, 20), if(level(cheat) >= 11, dice(2, 12), if(level(cheat) >= 9, dice(2, 10), if(level(cheat) >= 7, dice(2, 8), if(level(cheat) >= 3, dice(1, 8), dice(1, 6)))))))"}
```

`examples/nimble/classes/zephyr.md`

```yaml
effects:
  - {target: key, base: dex, source: class-key}
  - {target: key, base: str, source: class-key}
  - {target: secondary, base: int, source: class-secondary}
  - {target: secondary, base: wil, source: class-secondary}
  - {target: hit_die.size, base: 8, source: class-hit-die}
  - {target: save.dex.advantage, add: 1}
  - {target: save.int.advantage, add: -1}
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

**What a homebrewer reads.** Lay on Hands: resource with `max: oathsworn.healing.max` (formula `5 * level(oathsworn)`). Judgment Dice: a resource holding 'one set' (max 1) refreshing to 0 at encounter end; die size and count are variables (`oathsworn.judgment.die` nested `if` by level; `oathsworn.judgment.count` default 2, Vengeance adds 1). Sneak Attack: a dice-typed variable with a seven-way nested `if`. Bursts: resource with max `max(dex, 0)` refreshing to max at `encounter-start`. **Gaps:** auto-spend on attack (no attack event), and nested `if` chains read badly; a `steps(level(cheat), {3: 1d8, 7: 2d8, ...})` table-lookup form would be friendlier.

## Devoted Protector: +3 max Wounds while an ally is nearby

**Rule.** Choose an ally; while they are nearby you have +3 max Wounds (CR2 p.28).

`examples/nimble/backgrounds/devoted-protector.md`

```yaml
effects:
  - {target: wounds.max, add: 3, when: ally_nearby, source: devoted-protector}
```

**What a homebrewer reads.** `wounds.max add: 3 when: ally_nearby`. `ally_nearby` is a player-toggled boolean declared in the template. The engine recomputes `wounds.max` when it flips; what happens to a character whose current Wounds exceed the new max is a rules question the sheet should surface, not decide.

## Initiative sets first-turn actions; Human +1; Cheat floor of 10

**Rule.** Initiative d20 + DEX: one digit = 1 action, two digits = 2, 20+ = 3 (CR2 p.15). Human +1 Initiative. Cheat: if you roll under 10, treat it as 10 (H2 p.14).

`systems/nimble/events.md`

Handlers are in that file (`handlers:` block); see also `docs/spec/effects-resources-events.md` §5.1.

`examples/nimble/ancestries/human.md`

```yaml
effects:
  - {target: initiative.bonus, add: 1}
```

`examples/nimble/features/cheat/cheat.md`

```yaml
effects:
  - {target: initiative.floor, max: 10, source: cheat}
```

**What a homebrewer reads.** The digit-count mapping is a template handler on `encounter-start`. Human contributes `initiative.bonus add: 1`. The Cheat's floor is `initiative.floor max: 10` on a template variable the handler reads as `max(initiative_roll, initiative.floor)`. A clamp expressed as a `max` contribution reads oddly; the README should ask whether `floor: 10` as an op name would be clearer.

## Methodical Spellweaver: −2 mana (min 1) for +1 action

**Rule.** Spend 1 extra action: the spell costs 2 less mana, minimum 1 (H2 p.34).

`examples/nimble/features/mage/methodical-spellweaver.md`

```yaml
effects:
  - {target: spell.cost.modifier, add: -2, when: "spell.cost.min >= 0", source: methodical-spellweaver}
  - {target: spell.cost.min, max: 1}
```

**What a homebrewer reads.** Declared as contributions to `spell.cost.modifier` (add −2) and `spell.cost.min` (max 1). **Gap:** nothing applies them yet; a `cast` event with a cost handler is Phase 2. The encoding is readable; the mechanics are not yet wired.

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

**What a homebrewer reads.** Both are resources with two refresh rules; the template declares the `gain-wound` and `full-hp` events and fires them from its `damage` and `heal` handlers. Any content can refresh on any declared event.

## Max HP as a per-level history

**Rule.** Level-up HP: roll your Hit Die with advantage (CR2 p.21). The second printing adds a fixed-average option.

`examples/nimble/characters/pip.md`

```yaml
choices:
  nimble.classes.mage.level-3.subclass: [nimble.subclasses.mage.control]
  nimble.classes.mage.level-3.elemental-mastery: [fire]
  nimble.classes.mage.level-4.spellshaper: [nimble.features.mage.echo-casting, nimble.features.mage.stretch-time]
  nimble.classes.mage.level-4.key-stat: [int]
```

**What a homebrewer reads.** The character document's `levels[]` list records each level's HP gain and its source; `hp.max` folds those entries plus any `add` contributions (Tough-style features). Max HP is therefore history, not a formula of level, which matches the rules exactly.

## Non-proficient armor costs 2 actions to Defend; non-proficient weapons cannot crit

**Rule.** Non-proficient armor: Defend costs an extra action. Non-proficient weapon: cannot crit (CR2 p.32).

`examples/nimble/items/armor/chain-shirt.md`

```yaml
requires: {str: 2}
effects:
  - {target: armor.base, base: "9 + min(dex, 2)", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(mail)", transfer: equipped, source: unproficient-armor}
```

`examples/nimble/items/weapons/staff.md`

```yaml
effects:
  - {target: crit.allowed, set: false, when: "not proficient(weapon)", transfer: equipped, source: unproficient-weapon}
```

**What a homebrewer reads.** Items contribute `defend.cost add: 1 when: not proficient(mail)` and `crit.allowed set: false when: not proficient(weapon)`, both `transfer: equipped`. Proficiency itself comes from the class document's `armor_proficiency`/`weapon_proficiency` properties, which the `proficient()` predicate reads.

## Dying: action cap, Wound costs, class overrides

**Rule.** At 0 HP: gain 1 Wound and Dying; actions capped at 1; attacking costs a Wound unless DC 10 STR save; damage while Dying = 2 Wounds, 3 on a crit (CR2 p.9). Zephyr level 20: max 2 actions while Dying (H2 p.69).

`systems/nimble/events.md`

Handlers are in that file (`handlers:` block); see also `docs/spec/effects-resources-events.md` §5.1.

`systems/nimble/combat.md`

```yaml
effects:
  - target: armor.base
    base: dex
    source: unarmored
```

**What a homebrewer reads.** The `damage` handler sets `dying` and fires `gain-wound` with `wound.damage_while_dying` (default 2, +1 on crit). `actions.dying_cap` (default 1) is a template variable a class may raise with `base: 2`. None of the four MVP classes override Dying below level 17, so no content document does yet; the hooks exist.

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
  - {target: mana.max, base: "(max(int, 0) * 3) + level", when: "level(mage) >= 2", source: mage-mana}
  - {target: spells.tier.max, base: "floor(level(mage) / 2)", source: mage-tiers}
variables:
  - {id: mage.surge.max, name: the mana you regain when you roll Initiative, type: dice, formula: "if(level(mage) >= 17, wil + dice(2, 4), if(level(mage) >= 10, wil + dice(1, 4), wil))"}
  - {id: spell.cost.modifier, name: change to the mana cost of your spells, type: integer, default: 0, ops: [add]}
  - {id: spell.cost.min, name: the minimum mana a spell can cost, type: integer, default: 0, ops: [max]}
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

**What a homebrewer reads.** `spells.tier.max base: floor(level(mage) / 2)` on the class. Known schools are the level-1 grant (Fire, Ice, Lightning) plus choice slots whose options are school names. The sheet lists spells by filtering spell documents on `school in known and tier <= spells.tier.max`; no per-spell selection exists, which matches the rules.

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
  - {target: ac.base, base: "13 + dex.mod", when: "not equipped(armor)", source: mage-armor, transfer: always, duration: 8 hours}
```

`examples/insurance-5e/chain-mail.md`

```yaml
effects:
  - {target: ac.base, base: 16, transfer: equipped, source: armor}
```

**What a homebrewer reads.** Same shape as Nimble Armor: three `base` contributions to `ac.base` with `when` clauses; the highest applicable wins. Proves the fold is not Nimble-specific. Lives in `examples/insurance-5e/` with a 12-line `srd5e-mini` template.

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

**What a homebrewer reads.** One `bless` document contributing `save.* add: 1d4` with `source: bless`. Two instances on a character group by source and the policy `same-source: highest` keeps one. Nothing in the content says 'does not stack'; the system policy does.

## Known gaps (honest list)

- Surge-first mana spending (Mage Elemental Surge) and encounter-lifetime Hit Dice (Zephyr Enduring Soul): need a content-owned `spend` rule; Phase 1 models the pools, not the ordering.
- Spell cost modifiers (Methodical Spellweaver, Archmage): declared as variables; no `cast` event applies them yet.
- Auto-spent dice pools on attack (Oathsworn Judgment Dice; Cheat Sneak Attack on crit): no attack event in this phase.
- Unyielding Resolve (ignore the first N Wounds per encounter): needs a hook on `gain-wound`.
- Kinetic Momentum is a second burst counter instead of adding to `zephyr.bursts`: resources cannot yet refresh another resource.
- Level-scaled dice (Sneak Attack, Judgment die) are seven-deep nested `if` chains. Readable? Probably not. A step table form (`steps(level(cheat), {1: 1d6, 3: 1d8, 7: 2d8, ...})`) is the obvious fix.
- The Cheat's Initiative floor is a `max: 10` contribution, which reads backwards. A `floor:` op name may be clearer.
- Distracted (The Cheat) and 'Reach' auras (Oathsworn) are target- or position-state predicates with no model yet.
- Unproficient-armor Defend cost is on each item (`when: not proficient(mail)`); it belongs in the template once `proficient()` can see the worn item's category.
- Dueling-style one-weapon conditions (5e) and anything else needing attack objects.

## What you're approving

1. **The syntax is readable enough** to build the grammar implementation, conformance corpus, and engine against (Phase 2), with the gap fixes above as Phase 2 work items.
2. **The six-op fold**: `base` competes (highest), `add` sums, `mul` multiplies, `min`/`max` clamp, `set` overrides last and must be allowed by the variable.
3. **Resources and events as first-class**, with handlers owned by the system template and content influencing them through declared variables (`hit_die.heal.bonus`, `initiative.floor`, `wound.damage_while_dying`).
4. **The slot model for choices** (`choices:` on class levels; `choices:` map on the character; option lists for stats and schools).
5. **Identifier convention**: lowercase dotted ids, upper-case aliases, `key`/`secondary`, `this.`, `<resource>.current`; table ids and columns quoted.

**Approve** = the Phase 2 plan is written (grammar + corpus + engine). **Decline** = name the items; the named parts are redesigned before any engine code.
