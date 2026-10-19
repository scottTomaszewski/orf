---
id: nimble.system.core
type: variables
system: nimble
name: Core variables
variables:
  - {id: str, name: your Strength, type: integer, default: 0, alias: STR}
  - {id: dex, name: your Dexterity, type: integer, default: 0, alias: DEX}
  - {id: int, name: your Intelligence, type: integer, default: 0, alias: INT}
  - {id: wil, name: your Will, type: integer, default: 0, alias: WIL}
  - {id: key, name: your Key stat, type: integer, ops: [base], alias: KEY}
  - {id: secondary, name: your Secondary stat, type: integer, ops: [base]}
  - {id: level, name: your level, type: integer, default: 1, alias: LVL}
  - {id: hp.max, name: your maximum Hit Points, type: integer, default: 0, ops: [add]}
  - {id: wounds.max, name: your maximum Wounds, type: integer, default: 6, ops: [add, set]}
  - {id: hit_dice.max, name: your maximum Hit Dice, type: integer, formula: level, ops: [add]}
  - {id: hit_die.size, name: your Hit Die, type: integer, default: 6, ops: [base]}
  - {id: hit_die.heal.bonus, name: bonus healing per Hit Die, type: integer, default: 0, ops: [add]}
  - {id: hit_die.heal.always_max, name: Hit Dice always heal their maximum, type: boolean, default: false, ops: [set]}
  - {id: speed, name: your Speed, type: integer, default: 6, ops: [add]}
  - {id: inventory.slots, name: your inventory slots, type: integer, formula: 10 + str}
  - {id: languages, name: the number of languages you know, type: integer, formula: 1 + int}
  - {id: initiative.bonus, name: your Initiative bonus, type: integer, formula: dex, ops: [add]}
  - {id: initiative.floor, name: the minimum you can roll for Initiative, type: integer, default: 0, ops: [max]}
  - {id: dying, name: Dying, type: boolean, default: false}
  - {id: bloodied, name: Bloodied, type: boolean, default: false}
  - {id: raging, name: Raging, type: boolean, default: false}
  - {id: concentrating, name: Concentrating, type: boolean, default: false}
  - {id: in_wilderness, name: in the wilderness, type: boolean, default: false}
  - {id: ally_nearby, name: a chosen ally is nearby, type: boolean, default: false}
---
Stats are small signed integers; the modifier *is* the stat (CR2 p.6). `key` and `secondary`
are contributed by the class document (`key base: int`, `key base: wil`; the fold keeps the
higher). `hp.max` is the sum of the character's per-level `levels[].hp` entries plus any
`add` contributions (Tough-style features). Wounds default to 6 (CR2 p.9). Hit Dice equal
level (CR2 p.21). Speed 6, inventory 10 + STR, languages Common + INT (CR2 p.20).

## Sources
Core Rules 2.0.3 p.6 (stats), p.9 (HP, Wounds, Dying), p.20-21 (creation, Hit Dice, inventory).
