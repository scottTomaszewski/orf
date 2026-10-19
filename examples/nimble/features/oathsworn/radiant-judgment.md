---
id: nimble.features.oathsworn.radiant-judgment
type: feature
system: nimble
name: Radiant Judgment
class: nimble.classes.oathsworn
tags: [oathsworn]
effects: []
---
When attacked while holding no Judgment Dice, gain them: {{ oathsworn.judgment.count | 2 }} dice of d{{ oathsworn.judgment.die }}. They are expended on your next melee attack this encounter, hit or miss (H2 p.38). Encoded as the `oathsworn.judgment_dice` resource (one set) with the die size and count as variables; the auto-spend needs an attack event (gap).
