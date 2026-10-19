---
id: nimble.features.mage.methodical-spellweaver
type: feature
system: nimble
name: Methodical Spellweaver
class: nimble.classes.mage
tags: [mage, spellshaper]
effects: []
actions: 1
---
Spend 1 extra action: the spell costs 2 less mana, minimum 1 (H2 p.34).

Encoding: a per-cast option. The class declares `spell.cost.modifier` and `spell.cost.min` for a future `cast` event to read; this document carries no standing effects because the discount applies only when the player chooses it for one cast (gap noted in the spec).
