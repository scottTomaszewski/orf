---
id: nimble.features.mage.methodical-spellweaver
type: feature
system: nimble
name: Methodical Spellweaver
class: nimble.classes.mage
tags: [mage, spellshaper]
effects:
  - {target: spell.cost.modifier, add: -2, when: "spell.cost.min >= 0", source: methodical-spellweaver}
  - {target: spell.cost.min, max: 1}
---
Spend 1 extra action: the spell costs 2 less mana, minimum 1 (H2 p.34).

Encoding: the −2 is a contribution to `spell.cost.modifier` and the floor to `spell.cost.min`; applying them is a future `cast` event (gap noted in the spec).
