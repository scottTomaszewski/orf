---
id: nimble.items.armor.half-plate
type: armor
system: nimble
name: Half Plate
category: plate
slots: 1
strength_requirement: 3
requires: {str: 3}
effects:
  - {target: armor.base, base: "14", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(plate)", source: unproficient-armor}
---
Plate armor: Armor 14 while worn (CR2 p.33). Non-proficient wearers spend 2 actions to Defend (CR2 p.32).
