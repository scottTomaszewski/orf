---
id: nimble.features.zephyr.kinetic-momentum
type: feature
system: nimble
name: Kinetic Momentum
class: nimble.classes.zephyr
tags: [zephyr]
effects: []
resources:
  - {id: zephyr.bursts.momentum, max: 99, start: 0, refresh: [{on: gain-wound, add: 1}, {on: encounter-end, to: 0}]}
---
Whenever you gain a Wound, gain 1 Burst of Speed (H2 p.68).
