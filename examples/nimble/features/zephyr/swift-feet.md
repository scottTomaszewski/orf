---
id: nimble.features.zephyr.swift-feet
type: feature
system: nimble
name: Swift Feet
class: nimble.classes.zephyr
tags: [zephyr]
effects:
  - {target: speed, add: 2, when: "not equipped(armor)", source: swift-feet}
  - {target: speed, add: 2, when: "not equipped(armor) and level(zephyr) >= 9", source: swift-feet-2}
  - {target: initiative.bonus, add: level, when: "not equipped(armor)", source: swift-feet}
---
While unarmored, +2 Speed and +{{ level | your level }} Initiative; another +2 Speed at level 9 (H2 p.68).
