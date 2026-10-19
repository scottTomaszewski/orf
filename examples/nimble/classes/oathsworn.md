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
---
Mana at level 2, max WIL+LVL, tiers up to 7 (H2 p.38). Lay on Hands: a pool of 5×LVL HP to heal by touch, refreshed at Safe Rest. Judgment Dice: gained when attacked while holding none, spent on your next melee attack this encounter; 2d6, die grows at 3/5/8/10.

Starting HP 17 is the character's level-1 `levels[].hp` entry; Hit Die d10.
Saves: advantage on STR, disadvantage on DEX.

## Sources
H2 p.38.
