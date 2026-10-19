---
id: nimble.items.weapons.dagger
type: weapon
system: nimble
name: Dagger
damage: "{{ 1d4 + dex }}"
slots: 1
effects: []
---
Deals {{ 1d4 + dex }}. A non-proficient wielder cannot crit (CR2 p.32); not encoded, because `crit.allowed` would be character-wide and the rule is per weapon (gap).
