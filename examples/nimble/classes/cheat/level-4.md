---
id: nimble.classes.cheat.level-4
type: class-level
system: nimble
name: The Cheat, level 4
class: nimble.classes.cheat
level: 4
grants: []
choices:
  - {slot: underhanded, count: 1, from: {type: feature, tags: [cheat, underhanded]}, unique: character}
  - {slot: key-stat, count: 1, from: {options: [dex, int]}, effect: {target: "{{ choice }}", add: 1}}
---
What a The Cheat gains at level 4. See the class read for the full table.
