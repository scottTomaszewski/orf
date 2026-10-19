---
id: nimble.classes.mage.level-5
type: class-level
system: nimble
name: Mage, level 5
class: nimble.classes.mage
level: 5
grants: [nimble.features.mage.elemental-surge]
choices:
  - {slot: secondary-stat, count: 1, from: {options: [str, dex]}, effect: {target: "{{ choice }}", add: 1}}
---
What a Mage gains at level 5. See the class read for the full table.
