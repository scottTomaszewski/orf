---
id: nimble.ancestries.dragonborn
type: ancestry
system: nimble
name: Dragonborn
size: medium
effects: []
resources:
  - {id: dragonborn.breath, max: 1, refresh: [{on: safe-rest, to: max}, {on: gain-wound, to: max}]}
---
Breath weapon, once per Safe Rest; **recharges whenever you gain a Wound** (CR2 p.24). Encoded as a resource with two refresh triggers.
