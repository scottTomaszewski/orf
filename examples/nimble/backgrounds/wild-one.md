---
id: nimble.backgrounds.wild-one
type: background
system: nimble
name: Wild One
effects:
  - {target: hit_die.heal.bonus, add: key, when: in_wilderness, source: wild-one}
---
When you spend Hit Dice in the wild, each heals +{{ key | your Key stat }} more (CR2 p.28, first printing wording: roll with advantage; encoded here as the second-printing +KEY form since advantage on a heal roll is a handler concern). `printing_diff: {first: roll with advantage}`.
