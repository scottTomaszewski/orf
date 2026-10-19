---
id: nimble.items.armor.rusty-mail
type: armor
system: nimble
name: Rusty Mail
category: mail
slots: 1
strength_requirement: 0
effects:
  - {target: armor.base, base: "6 + min(dex, 2)", transfer: equipped, source: armor}
  - {target: defend.cost, add: 1, when: "not proficient(mail)", transfer: equipped, source: unproficient-armor}
---
Mail armor: Armor 6 + min(dex, 2) while worn (CR2 p.33). Non-proficient wearers spend 2 actions to Defend (CR2 p.32).
