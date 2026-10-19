---
id: nimble.items.weapons.mace
type: weapon
system: nimble
name: Mace
damage: "{{ 1d8 + str }}"
slots: 1
effects: []
---
Deals {{ 1d8 + str }}. A non-proficient wielder cannot crit (CR2 p.32); not encoded, because `crit.allowed` would be character-wide and the rule is per weapon (gap).
