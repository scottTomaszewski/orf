---
id: nimble.items.weapons.staff
type: weapon
system: nimble
name: Staff
damage: "{{ 1d6 + str }}"
slots: 1
effects: []
---
Deals {{ 1d6 + str }}. A non-proficient wielder cannot crit (CR2 p.32); not encoded, because `crit.allowed` would be character-wide and the rule is per weapon (gap).
