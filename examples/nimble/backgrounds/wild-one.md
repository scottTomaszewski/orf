---
id: nimble.backgrounds.wild-one
type: background
system: nimble
name: Wild One
printing_diff: {second: "+KEY HP per Hit Die instead of advantage"}
effects:
  - {target: hit_die.heal.advantage, set: true, when: in_wilderness, source: wild-one}
---
When you spend Hit Dice in the wild, roll them with advantage (CR2 p.28). Encoded by setting the template boolean the Catch Breath handler passes to `roll()`. The second printing changes this to +KEY per die (`printing_diff`).
