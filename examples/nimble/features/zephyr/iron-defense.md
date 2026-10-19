---
id: nimble.features.zephyr.iron-defense
type: feature
system: nimble
name: Iron Defense
class: nimble.classes.zephyr
tags: [zephyr]
effects:
  - {target: armor.base, base: "dex + str", when: "not equipped(armor)", source: iron-defense}
  - {target: armor.base, mul: 2, when: "not equipped(armor) and level(zephyr) >= 13", source: iron-defense}
---
While unarmored, your Armor is {{ dex + str | DEX + STR }}; at level 13 it is doubled (H2 p.68-69).
