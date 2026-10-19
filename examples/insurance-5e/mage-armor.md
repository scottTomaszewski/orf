---
id: srd5e.spells.mage-armor
type: spell
system: srd5e
name: Mage Armor
level: 1
effects:
  - {target: ac.base, base: "13 + dex.mod", when: "not equipped(armor)", source: mage-armor, duration: 8 hours}
---
The target's base AC becomes 13 + its Dexterity modifier while it wears no armor, for 8 hours (SRD 5.1).
