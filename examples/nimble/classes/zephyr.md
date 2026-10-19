---
id: nimble.classes.zephyr
type: class
system: nimble
name: Zephyr
short: zephyr
key_stats: [dex, str]
secondary_stats: [int, wil]
hit_die: 8
starting_hp: 13
saves: {advantage: dex, disadvantage: int}
armor_proficiency: None
weapon_proficiency: Melee
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
---
Unarmored martial artist. Bursts of Speed (L2): DEX bursts per Initiative, one maneuver free per burst (H2 p.68).

Starting HP 13 is the character's level-1 `levels[].hp` entry; Hit Die d8.
Saves: advantage on DEX, disadvantage on INT.

## Sources
H2 p.68.
