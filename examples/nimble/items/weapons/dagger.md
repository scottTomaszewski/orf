---
id: nimble.items.weapons.dagger
type: weapon
system: nimble
name: Dagger
damage: "{{ 1d4 + dex }}"
slots: 1
effects:
  - {target: crit.allowed, set: false, when: "not proficient(weapon)", transfer: equipped, source: unproficient-weapon}
---
Deals {{ 1d4 + dex }}. A non-proficient wielder cannot crit (CR2 p.32).
