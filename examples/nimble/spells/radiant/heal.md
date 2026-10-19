---
id: nimble.spells.radiant.heal
type: spell
system: nimble
name: Heal
school: radiant
tier: 1
actions: 1
target: single
reach: 1
healing: "{{ 1d6 + key | 1d6+KEY }}"
upcast: "Choose one: +1 target, +4 Reach, +1d6 healing"
---
Reach: 1. Heal a creature 1d6+KEY HP. Upcast: Choose one: +1 target, +4 Reach, +1d6 healing. If 5+ mana is spent, you may also heal 1 negative condition (e.g., Blind, Poisoned, 1 Wound).

## Sources
CR2 p.49.
