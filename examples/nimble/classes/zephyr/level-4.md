---
id: nimble.classes.zephyr.level-4
type: class-level
system: nimble
name: Zephyr, level 4
class: nimble.classes.zephyr
level: 4
grants: [nimble.features.zephyr.unyielding-resolve]
choices:
  - {slot: martial-art, count: 1, from: {type: feature, tags: [zephyr, martial-art]}, unique: character}
  - {slot: key-stat, count: 1, from: {options: [dex, str]}, effect: {target: "{{ choice }}", add: 1}}
---
What a Zephyr gains at level 4. See the class read for the full table.
