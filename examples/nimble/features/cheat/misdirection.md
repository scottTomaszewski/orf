---
id: nimble.features.cheat.misdirection
type: feature
system: nimble
name: Misdirection
class: nimble.classes.cheat
tags: [cheat, underhanded]
effects:
  - {target: armor.bonus, add: "max(int, 0)", source: misdirection}
---
While you can see an attacker, add {{ int | your Intelligence }} to your Armor (H2 p.16).
