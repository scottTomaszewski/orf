---
id: nimble.items.weapons.mace
type: weapon
system: nimble
name: Mace
damage: "{{ 1d8 + str }}"
slots: 1
effects:
  - {target: crit.allowed, set: false, when: "not proficient(weapon)", transfer: equipped, source: unproficient-weapon}
---
Deals {{ 1d8 + str }}. A non-proficient wielder cannot crit (CR2 p.32).
