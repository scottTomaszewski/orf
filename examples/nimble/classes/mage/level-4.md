---
id: nimble.classes.mage.level-4
type: class-level
system: nimble
name: Mage, level 4
class: nimble.classes.mage
level: 4
grants: []
choices:
  - {slot: spellshaper, count: 2, from: {type: feature, tags: [mage, spellshaper]}, unique: character}
  - {slot: key-stat, count: 1, from: {options: [int, wil]}, effect: {target: "{{ choice }}", add: 1}}
---
What a Mage gains at level 4. See the class read for the full table.
