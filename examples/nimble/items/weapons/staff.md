---
id: nimble.items.weapons.staff
type: weapon
system: nimble
name: Staff
damage: "{{ 1d6 + str }}"
slots: 1
effects:
  - {target: crit.allowed, set: false, when: "not proficient(weapon)", transfer: equipped, source: unproficient-weapon}
---
Deals {{ 1d6 + str }}. A non-proficient wielder cannot crit (CR2 p.32).
