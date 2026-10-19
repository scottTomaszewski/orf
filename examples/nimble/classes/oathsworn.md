---
id: nimble.classes.oathsworn
type: class
system: nimble
name: Oathsworn
short: oathsworn
key_stats: [str, wil]
secondary_stats: [dex, int]
hit_die: 10
starting_hp: 17
saves: {advantage: str, disadvantage: dex}
armor_proficiency: All
weapon_proficiency: STR weapons
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
---
Mana at level 2 (the Mana feature), tiers up to 7 (H2 p.38). Lay on Hands: a pool of 5×LVL HP to heal by touch, refreshed at Safe Rest. Judgment Dice: gained when attacked while holding none, spent on your next melee attack this encounter; 2d6, die grows at 3/5/8/10.

Starting HP 17 is the character's level-1 `levels[].hp` entry; Hit Die d10.
Saves: advantage on STR, disadvantage on DEX.

## Sources
H2 p.38.
