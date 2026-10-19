---
id: nimble.classes.cheat
type: class
system: nimble
name: The Cheat
short: cheat
key_stats: [dex, int]
secondary_stats: [wil, str]
hit_die: 6
starting_hp: 10
saves: {advantage: dex, disadvantage: wil}
armor_proficiency: Leather
weapon_proficiency: DEX weapons
effects:
  - {target: key, base: dex, source: class-key}
  - {target: key, base: int, source: class-key}
  - {target: secondary, base: wil, source: class-secondary}
  - {target: secondary, base: str, source: class-secondary}
  - {target: hit_die.size, base: 6, source: class-hit-die}
  - {target: save.dex.advantage, add: 1}
  - {target: save.wil.advantage, add: -1}
variables:
  - id: cheat.sneak_attack.dice
    name: your Sneak Attack dice
    type: dice
    formula:
      by: level(cheat)
      rows: {1: 1d6, 3: 1d8, 7: 2d8, 9: 2d10, 11: 2d12, 15: 2d20, 17: 3d20}
---
Sneak Attack rides on crits, 1/turn, scaling 1d6 → 1d8 (3) → 2d8 (7) → 2d10 (9) → 2d12 (11) → 2d20 (15) → 3d20 (17) (H2 p.14-15).

Starting HP 10 is the character's level-1 `levels[].hp` entry; Hit Die d6.
Saves: advantage on DEX, disadvantage on WIL.

## Sources
H2 p.14.
