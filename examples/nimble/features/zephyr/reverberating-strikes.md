---
id: nimble.features.zephyr.reverberating-strikes
type: feature
system: nimble
name: Reverberating Strikes
class: nimble.classes.zephyr
tags: [zephyr]
effects:
  - {target: damage.melee.bonus, add: level, source: reverberating-strikes}
---
Your melee attacks deal +{{ level | your level }} bludgeoning damage (H2 p.69).
