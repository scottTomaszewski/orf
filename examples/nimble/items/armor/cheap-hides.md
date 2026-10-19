---
id: nimble.items.armor.cheap-hides
type: armor
system: nimble
name: Cheap Hides
category: leather
slots: 1
strength_requirement: 0
effects:
  - {target: armor.base, base: "3 + dex", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(leather)", transfer: equipped, source: unproficient-armor}
---
Leather armor: Armor 3 + dex while worn (CR2 p.33). Non-proficient wearers spend 2 actions to Defend (CR2 p.32).
