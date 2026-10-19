---
id: nimble.items.armor.chain-shirt
type: armor
system: nimble
name: Chain Shirt
category: mail
slots: 1
strength_requirement: 2
requires: {str: 2}
effects:
  - {target: armor.base, base: "9 + min(dex, 2)", when: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "equipped and not proficient(mail)", source: unproficient-armor}
---
Mail armor: Armor 9 + min(dex, 2) while worn (CR2 p.33). Non-proficient wearers spend 2 actions to Defend (CR2 p.32).
