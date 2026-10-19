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
  - {id: key, name: your Key stat, type: integer, ops: [base], alias: KEY, description: "The higher of your class's two key stats; the class document contributes both and the fold keeps the higher."}
  - {id: secondary, name: your Secondary stat, type: integer, ops: [base]}
  - {id: level, name: your level, type: integer, default: 1, alias: LVL}
  - {id: hp.max, name: your maximum Hit Points, type: integer, default: 0, ops: [add]}
  - {id: wounds.max, name: your maximum Wounds, type: integer, default: 6, ops: [add, set]}
  - {id: hit_dice.max, name: your maximum Hit Dice, type: integer, formula: level, ops: [add]}
  - {id: hit_die.size, name: your Hit Die, type: integer, default: 6, ops: [base]}
  - {id: hit_die.heal.bonus, name: bonus healing per Hit Die, type: integer, default: 0, ops: [add], description: "Added to every Hit Die you spend during a Field Rest. The engine reads this when it resolves Catch Breath and Make Camp."}
  - {id: hit_die.heal.maximized, name: Hit Dice heal their maximum instead of being rolled, type: boolean, default: false, ops: [set], description: "When true, Catch Breath heals the die's maximum (as Make Camp always does). Oozeling sets it."}
  - {id: hit_die.heal.advantage, name: Hit Dice are rolled with advantage, type: boolean, default: false, ops: [set], description: "When true, Catch Breath rolls each Hit Die twice and keeps the higher. Wild One sets it in the wilderness."}
  - {id: speed, name: your Speed, type: integer, default: 6, ops: [add]}
  - {id: mana.max, name: your maximum mana, type: integer, default: 0, ops: [base, add]}
  - {id: spells.tier.max, name: the highest spell tier you can cast, type: integer, default: 0, ops: [base]}
  - {id: inventory.slots, name: your inventory slots, type: integer, formula: 10 + str}
  - {id: languages, name: the number of languages you know, type: integer, formula: 1 + int}
  - {id: initiative.bonus, name: your Initiative bonus, type: integer, formula: dex, ops: [add]}
  - {id: initiative.floor, name: the minimum you can roll for Initiative, type: integer, default: 0, ops: [at_least], description: "If your Initiative roll is lower than this, treat it as this. The engine applies it when Initiative is rolled."}
  - {id: dying, name: Dying, type: boolean, default: false, description: "Set by the engine at 0 HP; cleared when healed above 0."}
  - {id: bloodied, name: Bloodied, type: boolean, formula: "hp.current * 2 <= hp.max", description: "At or below half HP. Derived; nothing has to set it."}
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

Mana is one pool shared by every caster class; each caster's level-2 Mana feature contributes
its own `mana.max` formula as a `base` (CR2 p.13, p.45), so a multiclass caster gets the higher.

The `hit_die.heal.*`, `initiative.floor`, and `dying` variables are **read by the engine's Nimble
module**, which owns the rest, damage, and wound procedures (see `events.md`). Content changes
how those procedures behave only by contributing to these variables.

## Sources
Core Rules 2.0.3 p.6 (stats), p.9 (HP, Wounds, Dying), p.20-21 (creation, Hit Dice, inventory).
