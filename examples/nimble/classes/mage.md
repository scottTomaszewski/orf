---
id: nimble.classes.mage
type: class
system: nimble
name: Mage
short: mage
key_stats: [int, wil]
secondary_stats: [str, dex]
hit_die: 6
starting_hp: 10
saves: {advantage: int, disadvantage: str}
armor_proficiency: Cloth
weapon_proficiency: Blades, Staves, Wands
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
---
Elemental caster. Mana unlocks at level 2 (the Mana feature); tier N unlocks at level 2N (H2 p.32). Elemental Surge (L5) regains WIL mana at Initiative, expiring at end of combat; WIL+1d4 at 10, WIL+2d4 at 17.

Starting HP 10 is the character's level-1 `levels[].hp` entry; Hit Die d6.
Saves: advantage on INT, disadvantage on STR.

## Sources
H2 p.32.
