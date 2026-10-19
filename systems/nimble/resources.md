---
id: nimble.system.resources
type: resources
system: nimble
name: Core resources
resources:
  - id: hp
    max: hp.max
    floor: 0
    refresh: [{on: safe-rest, to: max}]
  - id: temp_hp
    floor: 0
    refresh: [{on: safe-rest, to: 0}]
  - id: wounds
    max: wounds.max
    floor: 0
    refresh: [{on: safe-rest, add: -1}]
  - id: hit_dice
    max: hit_dice.max
    floor: 0
    refresh: [{on: safe-rest, to: max}]
  - id: mana
    max: mana.max
    floor: 0
    when: mana.max > 0
    refresh: [{on: safe-rest, to: max}]
  - id: actions
    max: actions.max
    floor: 0
    refresh: [{on: turn-end, to: max}]
---
Wounds count up: at `wounds.max` you die (CR2 p.9). Safe Rest restores all HP, Hit Dice, mana
and class resources, heals 1 Wound, and expires temp HP (CR2 p.17). Field Rests restore nothing
by themselves; Hit Dice spent during them heal HP (engine procedure; see `events.md`).

## Sources
Core Rules 2.0.3 p.9, p.17.
