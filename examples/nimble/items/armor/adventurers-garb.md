---
id: nimble.items.armor.adventurers-garb
type: armor
system: nimble
name: Adventurer's Garb
category: cloth
slots: 1
strength_requirement: 0
effects:
  - {target: armor.base, base: "2 + dex", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(cloth)", transfer: equipped, source: unproficient-armor}
---
Cloth armor: Armor 2 + dex while worn (CR2 p.33). Non-proficient wearers spend 2 actions to Defend (CR2 p.32).
